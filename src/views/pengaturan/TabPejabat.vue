<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatPejabat, simpanPejabat, hapusPejabat, pejabatPada, tumpangTindih, namaPejabat } from '@/services/pejabat'
import { muatPegawai } from '@/services/master'
import { PEJABAT_AWAL, JABATAN } from '@/config/sekolahAwal'
import { formatNip, hanyaAngka, periksaNip } from '@/utils/validasi'
import { tanggalPanjang } from '@/utils/format'
import { kecilkanGambar } from '@/utils/gambar'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const notif = useNotifikasi()
const daftar = ref([])
const pegawai = ref([])
const memuat = ref(true)
const hariIni = new Date().toISOString().slice(0, 10)
const tanggalCek = ref(hariIni)
const form = ref(null) // data yang sedang diubah
const menyimpan = ref(false)

async function muat() {
  memuat.value = true
  try {
    if (modePratinjau) { daftar.value = PEJABAT_AWAL.map((p, i) => ({ id: 'c' + i, ...p })); return }
    ;[daftar.value, pegawai.value] = await Promise.all([muatPejabat(), muatPegawai({ denganRahasia: false }).catch(() => [])])
  } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
}
onMounted(muat)

const perJabatan = computed(() => Object.entries(JABATAN).map(([kunci, j]) => ({
  kunci, ...j,
  periode: daftar.value.filter((p) => p.jabatan === kunci).sort((a, b) => String(b.mulai || '').localeCompare(String(a.mulai || ''))),
  aktif: pejabatPada(daftar.value, kunci, tanggalCek.value),
})))

const periode = (p) => `${p.mulai ? tanggalPanjang(p.mulai) : 'Awal'} – ${p.sampai ? tanggalPanjang(p.sampai) : 'sekarang'}`

function buka(jabatan, p = null) {
  form.value = reactive(p ? { ...p } : { jabatan, nama: '', gelar: '', pangkat: '', nip: '', alamat: '', telepon: '', mulai: '', sampai: '', tanda_tangan: null, id_pegawai: null })
}

function pilihPegawai(id) {
  const p = pegawai.value.find((x) => x.id === id)
  if (!p) return
  Object.assign(form.value, {
    id_pegawai: p.id, nama: [p.gelar_depan, p.nama].filter(Boolean).join(' '), gelar: p.gelar || '',
    pangkat: [p.pangkat, p.golongan].filter(Boolean).join(', '), nip: p.nip || '', telepon: p.no_wa ? '+' + p.no_wa : form.value.telepon,
  })
}

const bentrok = computed(() => (form.value ? tumpangTindih(daftar.value, form.value) : []))
const galatNip = computed(() => (form.value?.nip ? periksaNip(form.value.nip).galat[0] : ''))
const galatTanggal = computed(() => (form.value?.mulai && form.value?.sampai && form.value.sampai < form.value.mulai ? 'Tanggal selesai sebelum tanggal mulai.' : ''))

async function unggahTtd(e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return
  try { form.value.tanda_tangan = await kecilkanGambar(f, { maks: 500, batasKb: 150 }) } catch (err) { notif.kabari(err.message, 'galat') }
}

async function simpan() {
  const f = form.value
  if (!f.nama.trim() || galatTanggal.value || galatNip.value) return
  if (modePratinjau) { notif.kabari('Mode Pratinjau: tidak disimpan.', 'info'); form.value = null; return }
  menyimpan.value = true
  try {
    await simpanPejabat(f.id || null, { ...f, nama: f.nama.trim(), nip: hanyaAngka(f.nip) }, JABATAN[f.jabatan].label)
    notif.kabari('Pejabat tersimpan.')
    form.value = null
    await muat()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

async function hapus() {
  if (!confirm(`Hapus periode ${namaPejabat(form.value)}? Dokumen pada periode itu akan kehilangan penanda tangan.`)) return
  try { await hapusPejabat(form.value, JABATAN[form.value.jabatan].label); form.value = null; await muat(); notif.kabari('Periode dihapus.') } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Cek pejabat pada tanggal -->
    <section class="flex flex-wrap items-center gap-3 rounded-2xl bg-biru/5 p-4 dark:bg-blue-950/30">
      <span class="grid h-10 w-10 place-items-center rounded-xl bg-biru text-white"><Ikon nama="CalendarDays" :ukuran="20" /></span>
      <p class="min-w-0 flex-1 text-sm">Dokumen otomatis memakai pejabat yang menjabat pada <b>tanggal dokumen</b>. Coba tanggal lain untuk melihat siapa penanda tangannya:</p>
      <input v-model="tanggalCek" type="date" class="masukan w-auto" />
    </section>

    <div v-if="memuat" class="kartu p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
    <div v-else class="grid gap-4 xl:grid-cols-2">
      <article v-for="j in perJabatan" :key="j.kunci" class="kartu overflow-hidden">
        <header class="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <span :class="['grid h-11 w-11 place-items-center rounded-xl ikon-chip']"><Ikon :nama="j.ikon" :ukuran="21" /></span>
          <div class="min-w-0 flex-1">
            <h3 class="font-bold">{{ j.label }}</h3>
            <p class="truncate text-xs" :class="j.aktif ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'">
              {{ j.aktif ? `${tanggalCek === hariIni ? 'Saat ini' : tanggalPanjang(tanggalCek)}: ${namaPejabat(j.aktif)}` : 'Belum ada pejabat pada tanggal ini' }}
            </p>
          </div>
          <button class="tombol-garis px-3 py-2" @click="buka(j.kunci)"><Ikon nama="Plus" :ukuran="16" /> Periode</button>
        </header>
        <ol class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="p in j.periode" :key="p.id" class="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="buka(j.kunci, p)">
            <span :class="['h-2.5 w-2.5 shrink-0 rounded-full', j.aktif?.id === p.id ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/50' : 'bg-slate-300 dark:bg-slate-600']" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ namaPejabat(p) }}</p>
              <p class="truncate text-xs text-slate-500"><span v-if="p.nip" class="kode">NIP {{ formatNip(p.nip) }} · </span>{{ periode(p) }}</p>
            </div>
            <img v-if="p.tanda_tangan" :src="p.tanda_tangan" alt="Tanda tangan" class="h-8 w-16 object-contain opacity-80 dark:invert" />
            <Ikon nama="Pencil" :ukuran="15" class="text-slate-400" />
          </li>
          <li v-if="!j.periode.length" class="px-4 py-5 text-center text-sm text-slate-500">Belum ada data. Klik <b>Periode</b> untuk menambah.</li>
        </ol>
      </article>
    </div>

    <!-- Formulir -->
    <Laci v-if="form" :judul="form.id ? 'Ubah periode pejabat' : 'Tambah periode pejabat'" :subjudul="JABATAN[form.jabatan].label" :ikon="JABATAN[form.jabatan].ikon" :warna="JABATAN[form.jabatan].warna" lebar="max-w-xl" @tutup="form = null">
      <div class="space-y-4 p-5">
        <div>
          <label class="label" for="jbt">Jabatan</label>
          <select id="jbt" v-model="form.jabatan" class="masukan"><option v-for="(j, k) in JABATAN" :key="k" :value="k">{{ j.label }}</option></select>
        </div>
        <div v-if="pegawai.length">
          <label class="label" for="pp">Ambil dari data pegawai <span class="font-normal text-slate-400">(opsional)</span></label>
          <select id="pp" class="masukan" :value="form.id_pegawai || ''" @change="pilihPegawai($event.target.value)">
            <option value="">— Ketik manual —</option>
            <option v-for="p in pegawai" :key="p.id" :value="p.id">{{ p.nama }}{{ p.gelar ? ', ' + p.gelar : '' }}</option>
          </select>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="label" for="nm">Nama (tanpa gelar belakang) <span class="text-merah">*</span></label><input id="nm" v-model="form.nama" class="masukan" /></div>
          <div><label class="label" for="gl">Gelar</label><input id="gl" v-model="form.gelar" class="masukan" placeholder="S.Pd., M.Pd." /></div>
          <div><label class="label" for="pk">Pangkat/golongan</label><input id="pk" v-model="form.pangkat" class="masukan" placeholder="Pembina Tk. I/IV.b" /></div>
          <div>
            <label class="label" for="nip">NIP</label><input id="nip" v-model="form.nip" class="masukan kode" inputmode="numeric" placeholder="Kosongkan bila tidak ada" />
            <p v-if="galatNip" class="mt-1 text-xs text-rose-600">{{ galatNip }}</p>
          </div>
          <div><label class="label" for="tl">Telepon</label><input id="tl" v-model="form.telepon" class="masukan kode" /></div>
          <div><label class="label" for="al">Alamat</label><input id="al" v-model="form.alamat" class="masukan" /></div>
          <div><label class="label" for="ml">Mulai menjabat</label><input id="ml" v-model="form.mulai" type="date" class="masukan" /></div>
          <div><label class="label" for="sp">Sampai <span class="font-normal text-slate-400">(kosong = masih)</span></label><input id="sp" v-model="form.sampai" type="date" class="masukan" /></div>
        </div>
        <p v-if="galatTanggal" class="text-xs text-rose-600">{{ galatTanggal }}</p>
        <div v-if="bentrok.length" class="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <Ikon nama="TriangleAlert" :ukuran="17" class="mt-0.5" />
          <span>Periode ini bertumpang tindih dengan: <b>{{ bentrok.map((b) => `${namaPejabat(b)} (${periode(b)})`).join('; ') }}</b>. Tutup periode lama dengan mengisi tanggal "Sampai".</span>
        </div>

        <div class="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600">
          <p class="label">Gambar tanda tangan <span class="font-normal text-slate-400">(opsional, PNG latar transparan)</span></p>
          <div class="flex flex-wrap items-center gap-3">
            <div class="grid h-20 w-44 place-items-center rounded-lg bg-white ring-1 ring-slate-200">
              <img v-if="form.tanda_tangan" :src="form.tanda_tangan" alt="Tanda tangan" class="max-h-16 max-w-40 object-contain" />
              <span v-else class="text-xs text-slate-400">Belum ada</span>
            </div>
            <label class="tombol-garis cursor-pointer"><Ikon nama="Upload" :ukuran="16" /> Pilih gambar<input type="file" accept="image/*" class="sr-only" @change="unggahTtd" /></label>
            <button v-if="form.tanda_tangan" class="tombol text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="form.tanda_tangan = null"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
          </div>
          <p class="mt-2 text-xs text-slate-500">Saat mencetak, Bapak memilih tanda tangan basah atau gambar.</p>
        </div>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="!form.nama.trim() || !!galatTanggal || !!galatNip || menyimpan" @click="simpan">
          <Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan
        </button>
        <button class="tombol-garis" @click="form = null">Batal</button>
        <button v-if="form.id" class="tombol ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="hapus"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
      </template>
    </Laci>
  </div>
</template>
