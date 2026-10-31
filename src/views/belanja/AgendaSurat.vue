<script setup>
// Agenda Surat: semua nomor yang terpakai (otomatis dari belanja + surat manual) dan pola penomoran.
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_AGENDA } from '@/config/menu'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatAgenda, muatPolaNomor, simpanPolaNomor, muatPenghitung, tambahSuratManual, ubahAgendaManual, hapusAgendaManual } from '@/services/belanja'
import { JENIS_AGENDA, POLA_NOMOR_AWAL, PENANDA_NOMOR } from '@/config/belanja'
import { isiPola } from '@/utils/belanja'
import { tanggalPendek, NAMA_BULAN, keIso, dariIso } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import Laci from '@/components/Laci.vue'
import CetakDaftar from '@/components/cetak/CetakDaftar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const notif = useNotifikasi()
const aktif = computed(() => route.params.tab || 'daftar')

const tahun = ref(new Date().getFullYear() >= 2026 ? new Date().getFullYear() : 2026)
const daftar = ref([])
const pola = ref({ ...POLA_NOMOR_AWAL })
const penghitung = ref({})
const memuat = ref(true)
async function muat() {
  memuat.value = true
  try {
    const [a, p, h] = await Promise.all([muatAgenda(tahun.value), muatPolaNomor(), muatPenghitung(tahun.value)])
    daftar.value = a
    pola.value = p
    penghitung.value = h
    Object.assign(polaUbah, p)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
}
onMounted(muat)
watch(tahun, muat)

/* ---------- Buku agenda ---------- */
const cari = ref('')
const jenis = ref('')
const bulan = ref('')
const urutkan = (a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')) || (b.urut || 0) - (a.urut || 0)
const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return daftar.value
    .filter((a) => (!jenis.value || a.jenis === jenis.value) && (bulan.value === '' || dariIso(a.tanggal)?.getMonth() === Number(bulan.value)))
    .filter((a) => !q || [a.nomor, a.perihal, a.tujuan].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort(urutkan)
})
const jenisAda = computed(() => [...new Set(daftar.value.map((a) => a.jenis))])
const statistik = computed(() => {
  const d = daftar.value
  const surat = d.filter((a) => ['surat_pesanan', 'shp', 'bast', 'negosiasi', 'surat_tugas', 'undangan', 'lainnya'].includes(a.jenis))
  return [
    { judul: 'Nomor terpakai', nilai: d.length, ikon: 'Mailbox', nada: 'gelap', sub: `Tahun ${tahun.value}`, bisaKlik: false },
    { judul: 'Surat keluar', nilai: surat.length, ikon: 'FileSignature', nada: 'primer', sub: `Urut terakhir ${penghitung.value.surat || 0}`, bisaKlik: false },
    { judul: 'Kwitansi', nilai: d.filter((a) => a.jenis === 'kwitansi_kecil').length, ikon: 'Banknote', nada: 'primer', sub: `Urut terakhir ${penghitung.value.kwitansi || 0}`, bisaKlik: false },
    { judul: 'Diketik manual', nilai: d.filter((a) => a.sumber === 'manual').length, ikon: 'Pencil', nada: 'primer', sub: 'Surat manual & nomor diubah', bisaKlik: false },
  ]
})

const formSurat = ref(null)
function suratBaru() { formSurat.value = { jenis: 'surat_tugas', tanggal: keIso(), perihal: '', tujuan: '', nomor: '' } }
const menyimpan = ref(false)
async function simpanSurat() {
  const f = formSurat.value
  if (!f.perihal.trim() || !f.tanggal) { notif.kabari('Isi tanggal dan perihal surat.', 'galat'); return }
  menyimpan.value = true
  try {
    if (f.id) { await ubahAgendaManual(f, { perihal: f.perihal, tujuan: f.tujuan, tanggal: f.tanggal, jenis: f.jenis }); notif.kabari('Agenda diperbarui.') }
    else { const n = await tambahSuratManual(f, pola.value); notif.kabari(`Nomor surat: ${n}`) }
    formSurat.value = null
    await muat()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapusSurat() {
  if (!confirm(`Hapus agenda ${formSurat.value.nomor}? Nomornya tidak dipakai ulang.`)) return
  try { await hapusAgendaManual(formSurat.value); formSurat.value = null; await muat() } catch (e) { notif.kabari(e.message, 'galat') }
}
function buka(a) {
  if (a.id_belanja) router.push(`/belanja/lihat/${a.id_belanja}`)
  else if (auth.isAdmin) formSurat.value = { ...a }
}

const cetakTerbuka = ref(false)
const kolomCetak = [
  { judul: 'Tanggal', nilai: (a) => tanggalPendek(a.tanggal), lebar: '2.2cm' },
  { judul: 'Nomor', nilai: (a) => a.nomor, lebar: '6cm' },
  { judul: 'Jenis', nilai: (a) => JENIS_AGENDA[a.jenis] || a.jenis, lebar: '3.6cm' },
  { judul: 'Perihal', nilai: (a) => a.perihal },
  { judul: 'Tujuan', nilai: (a) => a.tujuan, lebar: '4.5cm' },
]
async function ekspor() {
  try {
    await eksporExcel({ judul: `Agenda Surat ${tahun.value}`, namaBerkas: `Agenda Surat ${tahun.value}`, baris: hasil.value, kolom: [
      { judul: 'Tanggal', lebar: 12, nilai: (a) => tanggalPendek(a.tanggal) }, { kunci: 'nomor', judul: 'Nomor', lebar: 34 }, { judul: 'Jenis', lebar: 22, nilai: (a) => JENIS_AGENDA[a.jenis] || a.jenis },
      { kunci: 'perihal', judul: 'Perihal', lebar: 50 }, { kunci: 'tujuan', judul: 'Tujuan', lebar: 28 }, { judul: 'Sumber', lebar: 12, nilai: (a) => (a.sumber === 'manual' ? 'Manual' : 'Otomatis') },
    ] })
  } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Pola penomoran ---------- */
const polaUbah = reactive({ ...POLA_NOMOR_AWAL })
const JUDUL_POLA = { surat: ['Surat (SP, SHP, BAST, BA Negosiasi, surat manual)', 'FileSignature'], kwitansi: ['Kwitansi kecil', 'Banknote'], invoice: ['Invoice (bila penyedia tidak punya nomor)', 'ReceiptText'], proforma: ['Proforma invoice', 'FileText'] }
const contoh = (p) => isiPola(p, { urut: 12, tanggal: keIso(), rekanan: 'Toko Sejuk Jaya' })
async function simpanPola() {
  try { await simpanPolaNomor({ ...polaUbah }); pola.value = { ...polaUbah }; notif.kabari('Pola penomoran tersimpan. Berlaku untuk nomor berikutnya.') } catch (e) { notif.kabari(e.message, 'galat') }
}
const tahunPilihan = computed(() => { const t = new Date().getFullYear(); return [t - 1, t, t + 1] })
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip"><Ikon nama="Mailbox" :ukuran="24" /></span>
      <div class="min-w-[12rem] flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Agenda Surat</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">Buku agenda &amp; penomoran {{ tahun }}</h1>
        <p class="text-xs text-slate-500">Nomor dari belanja tercatat otomatis; surat lain bisa mengambil nomor di sini.</p>
      </div>
      <div class="flex w-full gap-2 sm:w-auto">
        <select v-model.number="tahun" class="masukan w-auto py-2" aria-label="Tahun"><option v-for="t in tahunPilihan" :key="t" :value="t">{{ t }}</option></select>
        <button v-if="auth.isAdmin" class="tombol-utama flex-1 sm:flex-none" @click="suratBaru"><Ikon nama="CirclePlus" :ukuran="17" /> Ambil nomor</button>
      </div>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian agenda surat">
      <button v-for="t in TAB_AGENDA" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/agenda-surat/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <template v-if="aktif === 'daftar'">
      <GridStat :daftar="statistik" :memuat="memuat" :bisa-klik="false" />
      <div class="kartu flex flex-wrap items-center gap-2 p-3">
        <div class="relative min-w-[13rem] flex-1"><Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari nomor, perihal, tujuan…" /></div>
        <select v-model="jenis" class="masukan w-auto py-2.5" aria-label="Jenis surat"><option value="">Semua jenis</option><option v-for="j in jenisAda" :key="j" :value="j">{{ JENIS_AGENDA[j] || j }}</option></select>
        <select v-model="bulan" class="masukan w-auto py-2.5" aria-label="Bulan"><option value="">Semua bulan</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
        <button class="tombol-garis" @click="cetakTerbuka = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Cetak / Unduh</span></button>
      </div>
      <div v-if="memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat agenda…</div>
      <div v-else-if="!hasil.length" class="kartu flex flex-col items-center gap-3 p-10 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl ikon-chip"><Ikon nama="Mailbox" :ukuran="26" /></span>
        <p class="font-semibold">{{ daftar.length ? 'Tidak ada yang cocok.' : 'Belum ada nomor terpakai tahun ini.' }}</p>
      </div>
      <div v-else class="kartu divide-y divide-slate-100 dark:divide-slate-800">
        <button v-for="a in hasil" :key="a.id" type="button" class="flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="buka(a)">
          <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', a.sumber === 'manual' ? 'ikon-chip-peringatan' : 'ikon-chip']"><Ikon :nama="a.id_belanja ? 'ShoppingCart' : 'FileText'" :ukuran="18" /></span>
          <div class="min-w-0 flex-1">
            <p class="kode truncate text-sm font-bold">{{ a.nomor }}</p>
            <p class="line-clamp-2 text-sm">{{ a.perihal }}</p>
            <p class="truncate text-xs text-slate-500">{{ tanggalPendek(a.tanggal) }} · {{ JENIS_AGENDA[a.jenis] || a.jenis }}<template v-if="a.tujuan"> · {{ a.tujuan }}</template></p>
          </div>
          <span :class="['lencana shrink-0', a.sumber === 'manual' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300']">{{ a.sumber === 'manual' ? 'Manual' : 'Otomatis' }}</span>
        </button>
      </div>
    </template>

    <section v-else class="kartu space-y-5 p-4 sm:p-5">
      <div>
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="Hash" :ukuran="17" /></span> Pola penomoran</h2>
        <p class="mt-1 text-sm text-slate-500">Nomor urut berlanjut per tahun dan tidak pernah dipakai ulang. Nomor di setiap transaksi tetap bisa diketik manual.</p>
      </div>
      <div v-for="(info, k) in JUDUL_POLA" :key="k" class="space-y-1.5">
        <label class="label flex items-center gap-2" :for="`pola-${k}`"><Ikon :nama="info[1]" :ukuran="16" class="text-biru" /> {{ info[0] }}</label>
        <input :id="`pola-${k}`" v-model="polaUbah[k]" class="masukan kode" :disabled="!auth.isAdmin" />
        <p class="text-xs text-slate-500">Contoh: <b class="kode text-slate-700 dark:text-slate-200">{{ contoh(polaUbah[k]) }}</b>
          <template v-if="k !== 'proforma'"> · urut terakhir {{ tahun }}: <b>{{ penghitung[k] || 0 }}</b></template></p>
      </div>
      <div class="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
        <p class="mb-1.5 font-semibold">Penanda yang bisa dipakai</p>
        <div class="grid gap-1 sm:grid-cols-2"><p v-for="[t, k] in PENANDA_NOMOR" :key="t" class="text-xs"><span class="kode font-bold text-biru">{{ t }}</span> {{ k }}</p></div>
        <p class="mt-2 text-xs text-slate-500">Nomor Buku Kas pada kwitansi besar memakai BNU dari ARKAS (diisi di setiap transaksi).</p>
      </div>
      <div v-if="auth.isAdmin" class="flex flex-wrap gap-2">
        <button class="tombol-utama" @click="simpanPola"><Ikon nama="Save" :ukuran="17" /> Simpan pola</button>
        <button class="tombol-garis" @click="Object.assign(polaUbah, POLA_NOMOR_AWAL)"><Ikon nama="Undo2" :ukuran="17" class="text-biru" /> Kembalikan bawaan</button>
      </div>
    </section>

    <Laci v-if="formSurat" :judul="formSurat.id ? 'Ubah agenda surat' : 'Ambil nomor surat'" :subjudul="formSurat.nomor || 'Nomor urut berikutnya diambil otomatis'" ikon="Mailbox" @tutup="formSurat = null">
      <div class="space-y-4 p-5">
        <div><label class="label" for="sj">Jenis</label>
          <select id="sj" v-model="formSurat.jenis" class="masukan"><option v-for="j in ['surat_tugas', 'undangan', 'lainnya']" :key="j" :value="j">{{ JENIS_AGENDA[j] }}</option></select></div>
        <div><label class="label" for="st">Tanggal surat</label><input id="st" v-model="formSurat.tanggal" type="date" class="masukan" /></div>
        <div><label class="label" for="sp">Perihal <span class="text-merah">*</span></label><input id="sp" v-model="formSurat.perihal" class="masukan" /></div>
        <div><label class="label" for="stj">Tujuan</label><input id="stj" v-model="formSurat.tujuan" class="masukan" /></div>
        <div v-if="!formSurat.id"><label class="label" for="sn">Nomor manual (opsional)</label><input id="sn" v-model="formSurat.nomor" class="masukan kode" :placeholder="contoh(pola.surat)" />
          <p class="mt-1 text-xs text-slate-500">Kosongkan agar nomor urut berikutnya diambil otomatis.</p></div>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpanSurat"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> {{ formSurat.id ? 'Simpan' : 'Ambil nomor' }}</button>
        <button class="tombol-garis" @click="formSurat = null">Batal</button>
        <button v-if="formSurat.id" class="tombol ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="hapusSurat"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
      </template>
    </Laci>
    <CetakDaftar v-if="cetakTerbuka" :judul="`Agenda Surat Tahun ${tahun}`" :kolom="kolomCetak" :baris="hasil" excel @tutup="cetakTerbuka = false" @excel="ekspor" />
  </div>
</template>
