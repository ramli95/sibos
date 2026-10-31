<script setup>
// Jendela pratinjau Paket SPJ: semua dokumen satu transaksi dalam satu berkas F4 berurutan
// (tegak & mendatar bercampur), Times New Roman. Cetak langsung, unduh satu PDF, atau Excel.
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { muatCetak, CETAK_AWAL, buatPdfPaket } from '@/services/cetak'
import { useNotifikasi } from '@/stores/notifikasi'
import { konteks } from '@/utils/dokumenSpj'
import { eksporExcel } from '@/utils/excel'
import { rupiah } from '@/utils/format'
import { susunPaket, pilihanPaket } from './paket'
import Ikon from '@/components/Ikon.vue'
import Halaman from './Halaman.vue'
import './gaya-spj.css'

const props = defineProps({
  b: { type: Object, required: true },
  bahan: { type: Object, required: true }, // { profil, pejabat, pegawai }
  foto: { type: Array, default: () => [] },
  semua: { type: Array, default: () => [] },
  namaKeg: { type: Function, default: () => '' },
  namaRek: { type: Function, default: () => '' },
  hanya: { type: Array, default: null }, // kunci dokumen tertentu (cetak satu dokumen)
})
const emit = defineEmits(['tutup'])
const notif = useNotifikasi()

const cetak = ref(structuredClone(CETAK_AWAL))
const pilihan = computed(() => pilihanPaket(props.b, props.foto))
const pilih = ref(new Set(props.hanya || pilihan.value.map((p) => p.kunci)))
const menuDok = ref(false)
const sibuk = ref('')
const wadah = ref(null)

const k = computed(() => konteks(props.b, { ...props.bahan, cetak: cetak.value }))
const halaman = computed(() => susunPaket(props.b, {
  k: k.value, profil: props.bahan.profil, foto: props.foto, semua: props.semua, pegawai: props.bahan.pegawai,
  namaKeg: props.namaKeg, namaRek: props.namaRek, pilih: pilih.value,
}))
const judul = computed(() => (props.hanya?.length === 1 ? pilihan.value.find((p) => p.kunci === props.hanya[0])?.judul || 'Dokumen' : 'Paket SPJ'))
const namaBerkas = computed(() => `${judul.value} - ${props.b.nama_pekerjaan}`.replace(/[\\/:*?"<>|]/g, '-').slice(0, 120))
const jumlahTegak = computed(() => halaman.value.filter((h) => !h.mendatar).length)

function alih(kunci) { const s = new Set(pilih.value); s.has(kunci) ? s.delete(kunci) : s.add(kunci); pilih.value = s }

let gayaHalaman = null
const esc = (e) => { if (e.key === 'Escape') emit('tutup') }
onMounted(async () => {
  cetak.value = await muatCetak().catch(() => structuredClone(CETAK_AWAL))
  document.body.style.overflow = 'hidden'
  addEventListener('keydown', esc)
})
onBeforeUnmount(() => { gayaHalaman?.remove(); document.body.style.overflow = ''; document.body.classList.remove('sedang-cetak-paket'); removeEventListener('keydown', esc) })

const m = (o) => `${cetak.value[o].atas}cm ${cetak.value[o].kanan}cm ${cetak.value[o].bawah}cm ${cetak.value[o].kiri}cm`
const gayaWadah = computed(() => ({ '--mp': m('portrait'), '--ml': m('landscape'), '--ukuran': `${cetak.value.ukuran_huruf}pt`, '--spasi': cetak.value.spasi }))

function cetakSekarang() {
  gayaHalaman?.remove()
  gayaHalaman = document.createElement('style')
  gayaHalaman.textContent = `@page { size: 215mm 330mm; margin: ${m('portrait')}; } @page mendatar { size: 330mm 215mm; margin: ${m('landscape')}; }`
  document.head.appendChild(gayaHalaman)
  document.body.classList.add('sedang-cetak-paket')
  const selesai = () => { document.body.classList.remove('sedang-cetak-paket'); removeEventListener('afterprint', selesai) }
  addEventListener('afterprint', selesai)
  window.print()
}

async function unduhPdf() {
  sibuk.value = 'pdf'
  try {
    await nextTick()
    const el = [...wadah.value.querySelectorAll('.halaman')].map((s) => ({ el: s.querySelector('.isi-halaman'), orientasi: s.dataset.arah }))
    await buatPdfPaket(el, cetak.value, { namaBerkas: namaBerkas.value })
  } catch (e) { notif.kabari('PDF gagal dibuat: ' + e.message, 'galat') } finally { sibuk.value = '' }
}

async function excel() {
  const b = props.b
  const honor = b.jenis === 'honor'
  const kolom = honor
    ? [{ kunci: 'nama', judul: 'Nama', lebar: 30 }, { kunci: 'nip', judul: 'NIP', lebar: 20 }, { kunci: 'golongan', judul: 'Gol', lebar: 8 }, { kunci: 'jabatan', judul: 'Jabatan', lebar: 22 },
        { kunci: 'besaran', judul: 'Besaran', lebar: 14, jenis: 'uang' }, { kunci: 'volume', judul: 'Volume', lebar: 8, jenis: 'angka' }, { kunci: 'bruto', judul: 'Jumlah', lebar: 14, jenis: 'uang' },
        { kunci: 'pph21', judul: 'PPh 21', lebar: 12, jenis: 'uang' }, { kunci: 'diterima', judul: 'Diterima', lebar: 14, jenis: 'uang' }]
    : [{ kunci: 'nama', judul: 'Uraian Barang/Jasa', lebar: 36 }, { kunci: 'spesifikasi', judul: 'Spesifikasi', lebar: 26 }, { kunci: 'volume', judul: 'Volume', lebar: 8, jenis: 'angka' },
        { kunci: 'satuan', judul: 'Satuan', lebar: 10 }, { kunci: 'harga', judul: 'Harga Satuan', lebar: 14, jenis: 'uang' }, { kunci: 'jumlah', judul: 'Jumlah', lebar: 14, jenis: 'uang' },
        { kunci: 'kode_kegiatan', judul: 'Kode Kegiatan', lebar: 12 }, { kunci: 'kode_rekening', judul: 'Kode Rekening', lebar: 20 }, { judul: 'BNU', lebar: 12, nilai: (i) => b.bnu?.[`${i.kode_kegiatan} ${i.kode_rekening}`] || '' }]
  try { await eksporExcel({ judul: `${b.nama_pekerjaan} (${rupiah(b.total)})`, kolom, baris: honor ? b.penerima : b.item, namaBerkas: namaBerkas.value }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <Teleport to="body">
    <div class="jendela-paket fixed inset-0 z-[60] flex flex-col bg-slate-900/55 backdrop-blur-[1.5px]" role="dialog" aria-modal="true" :aria-label="`Pratinjau ${judul}`">
      <header class="bilah flex flex-wrap items-center gap-2 bg-[#2B2B2B] px-4 py-3 text-white shadow-lg sm:gap-3 sm:px-6">
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-base font-bold sm:text-lg">Pratinjau: {{ judul }}</h2>
          <p class="truncate text-xs text-white/70 sm:text-sm">Kertas F4 215 × 330 mm · {{ halaman.length }} dokumen ({{ jumlahTegak }} tegak, {{ halaman.length - jumlahTegak }} mendatar) · Times New Roman</p>
        </div>
        <div v-if="!props.hanya" class="relative">
          <button class="tombol bg-white/10 px-3 text-white hover:bg-white/20" @click="menuDok = !menuDok"><Ikon nama="ListChecks" :ukuran="17" /> <span class="hidden sm:inline">Dokumen</span> {{ pilih.size }}/{{ pilihan.length }}</button>
          <div v-if="menuDok" class="absolute right-0 top-12 z-10 w-72 rounded-2xl bg-white p-2 text-slate-800 shadow-2xl">
            <label v-for="p in pilihan" :key="p.kunci" class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-100">
              <input type="checkbox" :checked="pilih.has(p.kunci)" class="h-4 w-4 accent-biru" @change="alih(p.kunci)" /><Ikon :nama="p.ikon" :ukuran="15" class="text-biru" /> {{ p.judul }}
            </label>
          </div>
        </div>
        <button class="tombol bg-emerald-600 px-3 text-white hover:bg-emerald-700" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" /> <span class="hidden sm:inline">Excel</span></button>
        <button class="tombol bg-biru px-3 text-white hover:bg-blue-700" :disabled="!!sibuk || !halaman.length" @click="unduhPdf">
          <Ikon :nama="sibuk === 'pdf' ? 'RefreshCw' : 'FileDown'" :ukuran="17" :class="sibuk === 'pdf' && 'animate-spin'" /> <span class="hidden sm:inline">{{ sibuk === 'pdf' ? 'Membuat PDF…' : 'Unduh PDF' }}</span>
        </button>
        <button class="tombol rounded-2xl bg-biru px-5 py-3 text-base text-white shadow-lg shadow-biru/30 hover:bg-blue-700" :disabled="!halaman.length" @click="cetakSekarang"><Ikon nama="Printer" :ukuran="20" /> Cetak</button>
        <button class="grid h-10 w-10 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="24" /></button>
      </header>

      <div class="area gulir-halus flex-1 overflow-auto p-4 sm:p-8" @click="menuDok = false">
        <div ref="wadah" class="paket" :style="gayaWadah">
          <Halaman v-for="(h, i) in halaman" :key="(h.id || h.kunci) + i" :mendatar="h.mendatar" :judul="h.judul">
            <component :is="h.komponen" v-bind="h.props" />
          </Halaman>
          <p v-if="!halaman.length" class="py-20 text-center text-white/70">Tidak ada dokumen dipilih.</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.jendela-paket .halaman { background: #fff; color: #000; margin: 0 auto 1.5rem; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5); width: 215mm; min-height: 330mm; padding: var(--mp); box-sizing: border-box; font-family: 'Times New Roman', Times, serif; font-size: var(--ukuran); line-height: var(--spasi); }
.jendela-paket .halaman.mendatar { width: 330mm; min-height: 215mm; padding: var(--ml); }
@media print {
  body.sedang-cetak-paket > *:not(.jendela-paket) { display: none !important; }
  body.sedang-cetak-paket { background: #fff !important; }
  .jendela-paket { position: static !important; background: #fff !important; backdrop-filter: none !important; display: block !important; }
  .jendela-paket .bilah { display: none !important; }
  .jendela-paket .area { overflow: visible !important; padding: 0 !important; }
  .jendela-paket .halaman { box-shadow: none !important; padding: 0 !important; width: auto !important; min-height: 0 !important; margin: 0 !important; break-after: page; page-break-after: always; }
  .jendela-paket .halaman:last-child { break-after: auto; page-break-after: auto; }
  .jendela-paket .halaman.mendatar { page: mendatar; }
}
</style>
