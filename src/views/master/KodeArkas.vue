<script setup>
// Kode Referensi resmi ARKAS (berkas statis di public/referensi): Kode Kegiatan, Barang & Jasa, Barang Modal.
// Hanya-baca; bisa dicari, disaring, disalin kodenya, diunduh Excel. Kode kegiatan bisa disalin ke tabel
// referensi "Kode Kegiatan ARKAS" milik sekolah.
import { ref, computed, watch } from 'vue'
import { muatReferensi, simpanReferensi } from '@/services/referensi'
import { NAMA_REKENING } from '@/services/rkas'
import { modePratinjau } from '@/services/firebase'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { eksporExcel } from '@/utils/excel'
import { rupiah, angka } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const props = defineProps({ jenis: { type: String, required: true } })
const auth = useAuth()
const notif = useNotifikasi()

const NAMA_SNP = {
  '01': 'Standar Kompetensi Lulusan', '02': 'Standar Isi', '03': 'Standar Proses', '04': 'Standar PTK',
  '05': 'Standar Sarana & Prasarana', '06': 'Standar Pengelolaan', '07': 'Standar Pembiayaan', '08': 'Standar Penilaian',
}
const DEF = {
  'arkas-kegiatan': { judul: 'Kode Kegiatan ARKAS', berkas: 'kegiatan-arkas-2025.json', ikon: 'ClipboardList', chip: 'ikon-chip',
    ket: 'Kode kegiatan (SNP.Komponen.Kegiatan) dari Referensi Kode ARKAS 2025. Dua angka pertama = Standar (SNP), dua angka tengah = komponen BOSP.' },
  'arkas-barang-jasa': { judul: 'Barang & Jasa ARKAS', berkas: 'barang-jasa-arkas-2025.json', ikon: 'ShoppingBasket', chip: 'ikon-chip-tosca',
    ket: 'Daftar barang/jasa belanja operasional (5.1.02) beserta kode rekening, satuan, dan harga acuan ARKAS 2025.' },
  'arkas-barang-modal': { judul: 'Barang Modal ARKAS', berkas: 'barang-modal-arkas-2025.json', ikon: 'Package', chip: 'ikon-chip-kuning',
    ket: 'Daftar barang modal (5.2.x) beserta kode barang, kode rekening, satuan, dan harga acuan ARKAS 2025.' },
}
const def = computed(() => DEF[props.jenis])

const cache = {}
const butir = ref([])
const memuat = ref(false)
const cari = ref('')
const saring = ref('')
const batas = ref(60)

async function muat() {
  memuat.value = true; cari.value = ''; saring.value = ''; batas.value = 60
  try {
    if (!cache[props.jenis]) {
      const r = await fetch(`${import.meta.env.BASE_URL}referensi/${def.value.berkas}`)
      if (!r.ok) throw new Error('Berkas referensi ARKAS tidak dapat dimuat.')
      const j = await r.json()
      cache[props.jenis] = j.butir.map((b) => Object.fromEntries(j.kolom.map((k, i) => [k, b[i]])))
    }
    butir.value = cache[props.jenis]
  } catch (e) { notif.kabari(e.message, 'galat'); butir.value = [] } finally { memuat.value = false }
}
watch(() => props.jenis, muat, { immediate: true })
watch([cari, saring], () => (batas.value = 60))

const rekening = (b) => b.kode_rekening || ''
const pilihan = computed(() => {
  if (props.jenis === 'arkas-kegiatan') {
    const p = [...new Set(butir.value.map((b) => b.kode.slice(0, 2)))].sort()
    return p.map((k) => ({ nilai: k, label: `${k} · ${NAMA_SNP[k] || ''}` }))
  }
  const n = {}
  butir.value.forEach((b) => { const k = rekening(b); if (k) n[k] = (n[k] || 0) + 1 })
  return Object.keys(n).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
    .map((k) => ({ nilai: k, label: `${k}${NAMA_REKENING[k] ? ' · ' + NAMA_REKENING[k].replace(/^Belanja /, '') : ''} (${n[k]})` }))
})

const hasil = computed(() => {
  const kata = cari.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return butir.value.filter((b) => {
    if (saring.value && !(props.jenis === 'arkas-kegiatan' ? b.kode.startsWith(saring.value) : rekening(b) === saring.value)) return false
    if (!kata.length) return true
    const teks = Object.values(b).join(' ').toLowerCase()
    return kata.every((k) => teks.includes(k))
  })
})
const tampil = computed(() => hasil.value.slice(0, batas.value))

async function salin(teks) {
  try { await navigator.clipboard.writeText(teks); notif.kabari(`Kode ${teks} disalin.`) } catch { notif.kabari(teks, 'info') }
}

function ekspor() {
  const kolom = props.jenis === 'arkas-kegiatan'
    ? [{ kunci: 'kode', judul: 'Kode Kegiatan', lebar: 14 }, { kunci: 'program', judul: 'Program', lebar: 36 }, { kunci: 'sub_program', judul: 'Sub Program', lebar: 40 }, { kunci: 'uraian', judul: 'Uraian', lebar: 70 }]
    : [{ kunci: 'kode_barang', judul: 'Kode Barang', lebar: 26 }, { kunci: 'kode_rekening', judul: 'Kode Rekening', lebar: 20 }, { kunci: 'nama', judul: 'Nama Barang', lebar: 60 },
       ...(props.jenis === 'arkas-barang-modal' ? [{ kunci: 'spesifikasi', judul: 'Spesifikasi', lebar: 30 }] : []),
       { kunci: 'satuan', judul: 'Satuan', lebar: 12 }, { kunci: 'harga', judul: 'Harga', lebar: 16, uang: true }]
  eksporExcel({ judul: def.value.judul + ' 2025', namaBerkas: `${def.value.judul} 2025`, landscape: true, baris: hasil.value, kolom })
    .catch((e) => notif.kabari(e.message, 'galat'))
}

// Salin seluruh kode kegiatan resmi ke tabel referensi sekolah (kegiatan_arkas): yang sudah ada tidak ditimpa.
const menyalin = ref(false)
async function pasangKeTabel() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau: tidak disimpan.', 'info')
  menyalin.value = true
  try {
    const lama = await muatReferensi('kegiatan_arkas', { segar: true })
    const daftar = [...lama.butir]
    let n = 0
    for (const b of butir.value) {
      const ada = daftar.find((x) => x.kode === b.kode)
      if (ada) { if (!ada.nama) ada.nama = b.uraian; continue }
      const [snp, komponen] = b.kode.split('.')
      daftar.push({ kode: b.kode, nama: b.uraian, snp, komponen, tingkat: 3 }); n++
    }
    daftar.sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }))
    if (n) await simpanReferensi('kegiatan_arkas', daftar, `Menambah ${n} kode kegiatan dari Referensi Kode ARKAS 2025`)
    notif.kabari(n ? `${n} kode kegiatan ditambahkan ke tabel Kode Kegiatan ARKAS.` : 'Semua kode sudah ada di tabel.', n ? 'sukses' : 'info')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyalin.value = false }
}
</script>

<template>
  <section class="kartu overflow-hidden">
    <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', def.chip]"><Ikon :nama="def.ikon" :ukuran="21" /></span>
      <div class="min-w-0 flex-1">
        <h2 class="flex flex-wrap items-center gap-2 font-bold">{{ def.judul }} <span class="lencana bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300">Resmi · 2025</span></h2>
        <p class="text-xs text-slate-500">{{ def.ket }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tombol-garis" :disabled="!hasil.length" @click="ekspor"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-[#22A08D]" /> Unduh Excel</button>
        <button v-if="jenis === 'arkas-kegiatan' && auth.isAdmin" class="tombol-utama" :disabled="menyalin || !butir.length" @click="pasangKeTabel">
          <Ikon :nama="menyalin ? 'RefreshCw' : 'CopyPlus'" :ukuran="16" :class="menyalin && 'animate-spin'" /> Salin ke tabel sekolah
        </button>
      </div>
    </header>

    <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
      <div class="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 dark:bg-slate-800/60">
        <Ikon nama="Search" :ukuran="16" class="shrink-0 text-slate-400" />
        <input v-model="cari" class="w-full bg-transparent py-2 text-sm outline-none" :placeholder="jenis === 'arkas-kegiatan' ? 'Cari kode atau uraian kegiatan…' : 'Cari nama barang, kode, satuan…'" />
        <button v-if="cari" class="text-slate-400" aria-label="Hapus pencarian" @click="cari = ''"><Ikon nama="X" :ukuran="15" /></button>
      </div>
      <select v-model="saring" class="masukan w-full py-2 text-sm sm:w-72">
        <option value="">{{ jenis === 'arkas-kegiatan' ? 'Semua Standar (SNP)' : 'Semua kode rekening' }}</option>
        <option v-for="p in pilihan" :key="p.nilai" :value="p.nilai">{{ p.label }}</option>
      </select>
    </div>

    <div v-if="memuat" class="p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat referensi ARKAS…</div>
    <div v-else-if="!hasil.length" class="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500">
      <Ikon nama="SearchX" :ukuran="28" class="text-slate-300" /> Tidak ada yang cocok.
    </div>

    <!-- Kode kegiatan -->
    <ul v-else-if="jenis === 'arkas-kegiatan'" class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="b in tampil" :key="b.kode" class="flex items-start gap-3 px-4 py-3">
        <button class="kode shrink-0 rounded-lg bg-biru/10 px-2 py-1 text-xs font-bold text-biru hover:bg-biru/20 dark:text-blue-300" title="Salin kode" @click="salin(b.kode)">{{ b.kode }}</button>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-snug">{{ b.uraian }}</p>
          <p class="mt-0.5 text-xs text-slate-500">{{ b.sub_program }} · <span class="text-slate-400">{{ b.program }}</span></p>
        </div>
      </li>
    </ul>

    <!-- Barang & jasa / barang modal -->
    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="(b, i) in tampil" :key="b.kode_barang + i" class="flex items-start gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-snug">{{ b.nama }}<span v-if="b.spesifikasi" class="font-normal text-slate-500"> — {{ b.spesifikasi }}</span></p>
          <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <button class="kode rounded bg-slate-100 px-1.5 py-0.5 hover:bg-slate-200 dark:bg-slate-800" title="Salin kode rekening" @click="salin(b.kode_rekening)">{{ b.kode_rekening }}</button>
            <button class="kode text-slate-400 hover:text-biru" title="Salin kode barang" @click="salin(b.kode_barang)">{{ b.kode_barang }}</button>
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="angka text-sm font-bold text-[#167A6B] dark:text-teal-300">{{ rupiah(b.harga) }}</p>
          <p class="text-xs text-slate-500">per {{ b.satuan || '-' }}</p>
        </div>
      </li>
    </ul>

    <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
      <span>Menampilkan {{ angka(tampil.length) }} dari {{ angka(hasil.length) }} butir<template v-if="hasil.length !== butir.length"> (total {{ angka(butir.length) }})</template></span>
      <button v-if="tampil.length < hasil.length" class="tombol-garis px-3 py-1.5 text-xs" @click="batas += 100"><Ikon nama="ChevronsDown" :ukuran="14" /> Tampilkan lebih banyak</button>
    </footer>
  </section>
</template>
