<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { JENIS_REFERENSI } from '@/config/referensiAwal'
import { muatReferensi, simpanReferensi, pasangSemuaAwal } from '@/services/referensi'
import { modePratinjau } from '@/services/firebase'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { eksporExcel, bacaBerkas } from '@/utils/excel'
import { normalJudul } from '@/config/impor'
import { normalBool } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'

const auth = useAuth()
const notif = useNotifikasi()
const aktif = ref('snp')
const data = ref({ butir: [], tersimpan: true })
const memuat = ref(true)
const ubah = ref(false)
const salinan = ref([])
const cari = ref('')
const menyimpan = ref(false)
const status = ref({})

const def = computed(() => JENIS_REFERENSI.find((j) => j.kunci === aktif.value))
const adaBelum = computed(() => Object.values(status.value).some((s) => s === false))

async function muat(segar = false) {
  memuat.value = true
  ubah.value = false
  try { data.value = await muatReferensi(aktif.value, { segar }); status.value[aktif.value] = data.value.tersimpan }
  catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
}
watch(aktif, () => muat())
onMounted(async () => {
  await muat()
  // periksa status semua tabel untuk penanda "belum dipasang"
  for (const j of JENIS_REFERENSI) muatReferensi(j.kunci).then((r) => (status.value[j.kunci] = r.tersimpan)).catch(() => {})
})

const tampil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  const daftar = ubah.value ? salinan.value : data.value.butir
  return daftar.map((b, i) => ({ b, i })).filter(({ b }) => !q || Object.values(b).some((v) => String(v).toLowerCase().includes(q)))
})

function mulaiUbah() { salinan.value = data.value.butir.map((b) => ({ ...b })); ubah.value = true }
function tambahBaris() { salinan.value.push(Object.fromEntries(def.value.kolom.map((k) => [k.k, k.bool ? true : '']))); cari.value = '' }

async function simpan() {
  if (modePratinjau) { data.value = { butir: salinan.value, tersimpan: true }; ubah.value = false; return notif.kabari('Mode Pratinjau: tidak disimpan.', 'info') }
  const butir = salinan.value.filter((b) => String(b.kode ?? '').trim() || String(b.nama ?? '').trim())
  const kode = butir.map((b) => String(b.kode).trim())
  const ganda = kode.find((k, i) => k && kode.indexOf(k) !== i)
  if (ganda) return notif.kabari(`Kode "${ganda}" dipakai lebih dari sekali.`, 'galat')
  menyimpan.value = true
  try {
    await simpanReferensi(aktif.value, butir, `Memperbarui referensi ${def.value.singkat} (${butir.length} butir)`)
    await muat(true)
    notif.kabari('Referensi tersimpan.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

async function pasangAwal() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau.', 'info')
  try { const n = await pasangSemuaAwal(); notif.kabari(`${n} tabel referensi terpasang.`); JENIS_REFERENSI.forEach((j) => (status.value[j.kunci] = true)); await muat(true) }
  catch (e) { notif.kabari(e.message, 'galat') }
}

function ekspor() {
  eksporExcel({
    judul: `Referensi ${def.value.singkat}`, namaBerkas: `Referensi ${def.value.singkat} SIBOS`, landscape: false, baris: data.value.butir,
    kolom: def.value.kolom.map((k) => ({ kunci: k.k, judul: k.j, lebar: k.k === 'nama' ? 50 : 18 })),
  }).catch((e) => notif.kabari(e.message, 'galat'))
}

// Impor Excel: baris judul dicari otomatis, kolom dicocokkan lewat judul (Kode, Nama, …)
async function impor(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  try {
    const [lembar] = await bacaBerkas(file)
    const kunci = def.value.kolom.map((k) => ({ k: k.k, cocok: [normalJudul(k.j), normalJudul(k.k)] }))
    const idxJudul = lembar.baris.slice(0, 15).findIndex((b) => b.some((v) => kunci.some((k) => k.cocok.includes(normalJudul(v)))))
    if (idxJudul < 0) throw new Error(`Tidak menemukan baris judul. Gunakan judul kolom: ${def.value.kolom.map((k) => k.j).join(', ')}.`)
    const peta = lembar.baris[idxJudul].map((v) => kunci.find((k) => k.cocok.includes(normalJudul(v)))?.k || '')
    const baru = lembar.baris.slice(idxJudul + 1).map((b) => {
      const o = {}
      peta.forEach((k, i) => { if (k) o[k] = def.value.kolom.find((x) => x.k === k).bool ? normalBool(b[i]) : String(b[i] ?? '').trim() })
      return o
    }).filter((o) => o.kode || o.nama)
    // gabung dengan data lama berdasarkan kode
    const lama = (ubah.value ? salinan.value : data.value.butir).map((b) => ({ ...b }))
    let tambah = 0, perbarui = 0
    baru.forEach((o) => {
      const j = lama.findIndex((b) => o.kode && String(b.kode) === String(o.kode))
      if (j >= 0) { Object.assign(lama[j], o); perbarui++ } else { lama.push(o); tambah++ }
    })
    salinan.value = lama
    ubah.value = true
    notif.kabari(`${tambah} baru, ${perbarui} diperbarui. Periksa lalu klik Simpan.`, 'info')
  } catch (err) { notif.kabari(err.message, 'galat') }
}
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
    <!-- Daftar tabel -->
    <nav class="kartu flex gap-1 overflow-x-auto p-2 lg:h-fit lg:flex-col lg:overflow-visible" aria-label="Tabel referensi">
      <button v-for="j in JENIS_REFERENSI" :key="j.kunci" @click="aktif = j.kunci"
              :class="['flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition',
                       aktif === j.kunci ? 'bg-biru/10 text-biru dark:bg-biru/20 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800']">
        <span :class="['grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white', j.warna]"><Ikon :nama="j.ikon" :ukuran="16" /></span>
        <span class="flex-1">{{ j.singkat }}</span>
        <span v-if="status[j.kunci] === false" class="hidden h-2 w-2 rounded-full bg-kuning lg:block" title="Belum dipasang" />
      </button>
    </nav>

    <div class="min-w-0 space-y-4">
      <div v-if="adaBelum && auth.isAdmin" class="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:from-amber-950/40 dark:to-orange-950/30">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-kuning text-arang"><Ikon nama="Sparkles" :ukuran="20" /></span>
        <p class="min-w-0 flex-1 text-sm"><b>Data awal referensi belum dipasang.</b> Pasang sekali untuk menyimpan isi bawaan (SNP, komponen Pasal 42, kategori, akun SIMAKDA, pajak, satuan, sumber dana) ke database.</p>
        <button class="tombol bg-kuning text-arang hover:brightness-95" @click="pasangAwal"><Ikon nama="Download" :ukuran="17" /> Pasang data awal</button>
      </div>

      <section class="kartu overflow-hidden">
        <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <span :class="['grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow', def.warna]"><Ikon :nama="def.ikon" :ukuran="21" /></span>
          <div class="min-w-0 flex-1">
            <h2 class="font-bold">{{ def.judul }}</h2>
            <p class="text-xs text-slate-500">{{ def.ket }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <template v-if="!ubah">
              <button class="tombol-garis" @click="ekspor"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /> Ekspor</button>
              <template v-if="auth.isAdmin">
                <label class="tombol-garis cursor-pointer"><Ikon nama="FileUp" :ukuran="16" class="text-tosca" /> Impor<input type="file" accept=".xlsx,.csv" class="sr-only" @change="impor" /></label>
                <button class="tombol-utama" @click="mulaiUbah"><Ikon nama="Pencil" :ukuran="16" /> Ubah</button>
              </template>
            </template>
            <template v-else>
              <button class="tombol-garis" @click="tambahBaris"><Ikon nama="Plus" :ukuran="16" /> Baris</button>
              <button class="tombol-garis" @click="ubah = false">Batal</button>
              <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="16" :class="menyimpan && 'animate-spin'" /> Simpan</button>
            </template>
          </div>
        </header>

        <div class="flex items-center gap-2 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          <Ikon nama="Search" :ukuran="16" class="text-slate-400" />
          <input v-model="cari" class="w-full bg-transparent py-1 text-sm outline-none" placeholder="Cari…" />
          <span v-if="!data.tersimpan" class="lencana shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Data awal · belum tersimpan</span>
        </div>

        <div v-if="memuat" class="p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
        <div v-else-if="!tampil.length && !ubah" class="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500">
          <Ikon :nama="def.ikon" :ukuran="28" class="text-slate-300" />
          Belum ada isi. {{ auth.isAdmin ? 'Gunakan Impor (Excel dengan judul kolom ' + def.kolom.map((k) => k.j).join(', ') + ') atau Ubah → Baris.' : '' }}
        </div>
        <div v-else class="max-h-[65vh] overflow-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
              <tr><th v-for="k in def.kolom" :key="k.k" :class="['px-4 py-2.5', k.lebar]">{{ k.j }}</th><th v-if="ubah" class="w-12"></th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="{ b, i } in tampil" :key="i" class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td v-for="k in def.kolom" :key="k.k" :class="['px-4 py-2', ubah && 'py-1.5']">
                  <template v-if="ubah">
                    <input v-if="k.bool" v-model="b[k.k]" type="checkbox" class="h-4 w-4 accent-tosca" />
                    <input v-else v-model="b[k.k]" :class="['masukan py-1.5', k.k === 'kode' && 'kode']" />
                  </template>
                  <template v-else>
                    <span v-if="k.bool" :class="['lencana', b[k.k] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800']">{{ b[k.k] ? 'Aktif' : 'Nonaktif' }}</span>
                    <span v-else-if="k.k === 'batas' && b.batas" :class="['lencana', b.jenis_batas === 'min' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300']">{{ b.batas }}</span>
                    <span v-else :class="['kode', 'nama'].includes(k.k) ? (k.k === 'kode' ? 'kode font-semibold text-biru dark:text-blue-300' : '') : 'kode text-xs'">{{ b[k.k] || (k.k === 'kode_simakda' ? '—' : '') }}</span>
                  </template>
                </td>
                <td v-if="ubah" class="px-2"><button class="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Hapus baris" @click="salinan.splice(i, 1)"><Ikon nama="Trash2" :ukuran="15" /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">{{ (ubah ? salinan : data.butir).length }} butir</p>
      </section>
    </div>
  </div>
</template>
