<script setup>
// Jendela pratinjau cetak & unduh (gaya SIMKA): bilah gelap di atas, lembar F4 di tengah.
// Isi dokumen diberikan lewat slot; slot menerima { cetak } (pengaturan margin & huruf).
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { muatCetak, pasangHalamanCetak, CETAK_AWAL, buatPdf, simpanPdfKeDrive } from '@/services/cetak'
import { useAuth } from '@/stores/auth'
import { NAMA_BULAN } from '@/utils/format'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '../Ikon.vue'

const props = defineProps({
  judul: { type: String, required: true },
  namaBerkas: String,
  orientasi: { type: String, default: '' }, // kosong = ikut pengaturan
  gantiOrientasi: { type: Boolean, default: true },
  excel: Boolean,
  // Fase 8: folder Drive untuk "Simpan ke Drive"; kosong = SIBOS/<tahun>/<bulan>/Laporan
  jalurDrive: { type: Array, default: null },
})
const emit = defineEmits(['tutup', 'excel', 'update:orientasi'])
const notif = useNotifikasi()
const auth = useAuth()

const cetak = ref(structuredClone(CETAK_AWAL))
const arah = ref(props.orientasi || 'portrait')
const isi = ref(null)
const sibuk = ref('')
let lepas = () => {}

onMounted(async () => {
  cetak.value = await muatCetak().catch(() => structuredClone(CETAK_AWAL))
  if (!props.orientasi) arah.value = cetak.value.orientasi_bawaan
  document.body.style.overflow = 'hidden'
  addEventListener('keydown', esc)
})
onBeforeUnmount(() => { lepas(); document.body.style.overflow = ''; document.body.classList.remove('sedang-cetak'); removeEventListener('keydown', esc) })
watch(() => props.orientasi, (v) => { if (v) arah.value = v })
watch(arah, (v) => emit('update:orientasi', v))
const esc = (e) => { if (e.key === 'Escape') emit('tutup') }

const m = computed(() => cetak.value[arah.value])
const infoKertas = computed(() => {
  const x = m.value
  const sama = x.atas === x.bawah && x.atas === x.kiri && x.atas === x.kanan
  return `Kertas F4 215 × 330 mm ${arah.value === 'portrait' ? 'tegak' : 'mendatar'}, margin ${sama ? x.atas + ' cm' : `kiri ${x.kiri} cm, lainnya ${x.atas} cm`}`
})
const gayaLembar = computed(() => ({
  width: arah.value === 'landscape' ? '330mm' : '215mm',
  minHeight: arah.value === 'landscape' ? '215mm' : '330mm',
  padding: `${m.value.atas}cm ${m.value.kanan}cm ${m.value.bawah}cm ${m.value.kiri}cm`,
  fontSize: `${cetak.value.ukuran_huruf}pt`,
  lineHeight: cetak.value.spasi,
}))

function cetakSekarang() {
  lepas = pasangHalamanCetak(cetak.value, arah.value)
  document.body.classList.add('sedang-cetak')
  const selesai = () => { document.body.classList.remove('sedang-cetak'); removeEventListener('afterprint', selesai) }
  addEventListener('afterprint', selesai)
  window.print()
}

async function simpanDrive() {
  sibuk.value = 'drive'
  try {
    const kini = new Date()
    const jalur = props.jalurDrive || [String(kini.getFullYear()), `${String(kini.getMonth() + 1).padStart(2, '0')} ${NAMA_BULAN[kini.getMonth()]}`, 'Laporan']
    const blob = await buatPdf(isi.value, { orientasi: arah.value, margin: m.value, namaBerkas: props.namaBerkas || props.judul, kembalikan: true })
    const h = await simpanPdfKeDrive(blob, props.namaBerkas || props.judul, jalur)
    notif.kabari(`Tersimpan di Drive: ${jalur.join(' / ')} / ${h.nama}`)
  } catch (e) { notif.kabari('Gagal menyimpan ke Drive: ' + e.message, 'galat') } finally { sibuk.value = '' }
}

async function unduhPdf() {
  sibuk.value = 'pdf'
  try {
    await buatPdf(isi.value, { orientasi: arah.value, margin: m.value, namaBerkas: props.namaBerkas || props.judul })
  } catch (e) { notif.kabari('PDF gagal dibuat: ' + e.message, 'galat') } finally { sibuk.value = '' }
}
</script>

<template>
  <Teleport to="body">
    <div class="jendela-cetak fixed inset-0 z-[60] flex flex-col bg-slate-900/55 backdrop-blur-[1.5px]" role="dialog" aria-modal="true" :aria-label="`Pratinjau ${props.judul}`">
      <!-- Bilah atas -->
      <header class="bilah flex flex-wrap items-center gap-3 bg-[#2B2B2B] px-4 py-3 text-white shadow-lg sm:px-6">
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-base font-bold sm:text-lg">Pratinjau: {{ props.judul }}</h2>
          <p class="truncate text-xs text-white/70 sm:text-sm">{{ infoKertas }}</p>
        </div>
        <slot name="alat" />
        <div v-if="props.gantiOrientasi" class="flex h-10 items-center gap-1 rounded-xl bg-white/10 p-1">
          <button v-for="[v, l] in [['portrait', 'Tegak'], ['landscape', 'Mendatar']]" :key="v" @click="arah = v" :title="l"
                  :class="['flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold', arah === v ? 'bg-white text-arang' : 'text-white/75 hover:text-white']">
            <span :class="['rounded-[3px] border-2 border-current', v === 'portrait' ? 'h-4 w-3' : 'h-3 w-4']" /><span class="hidden md:inline">{{ l }}</span>
          </button>
        </div>
        <button v-if="props.excel" class="tb-bilah bg-emerald-600 text-white hover:bg-emerald-700" @click="emit('excel')"><Ikon nama="FileSpreadsheet" :ukuran="17" /> <span class="hidden sm:inline">Excel</span></button>
        <button v-if="auth.isAdmin" class="tb-bilah bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20" :disabled="!!sibuk" title="Simpan PDF ke Google Drive sekolah" @click="simpanDrive">
          <Ikon :nama="sibuk === 'drive' ? 'RefreshCw' : 'CloudUpload'" :ukuran="17" :class="sibuk === 'drive' && 'animate-spin'" /> <span class="hidden lg:inline">Simpan ke Drive</span>
        </button>
        <button class="tb-bilah bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20" :disabled="!!sibuk" @click="unduhPdf">
          <Ikon :nama="sibuk === 'pdf' ? 'RefreshCw' : 'FileDown'" :ukuran="17" :class="sibuk === 'pdf' && 'animate-spin'" /> <span class="hidden sm:inline">Unduh PDF</span>
        </button>
        <button class="tb-bilah min-w-[6.5rem] bg-biru text-white shadow-lg shadow-biru/30 hover:bg-blue-700" @click="cetakSekarang"><Ikon nama="Printer" :ukuran="17" /> Cetak</button>
        <button class="tb-bilah w-10 justify-center px-0 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="22" /></button>
      </header>

      <!-- Lembar -->
      <div class="area gulir-halus flex-1 overflow-auto p-4 sm:p-8">
        <article class="lembar mx-auto bg-white text-black shadow-2xl" :style="gayaLembar">
          <div ref="isi" class="isi-dokumen"><slot :cetak="cetak" :orientasi="arah" /></div>
        </article>
      </div>
    </div>
  </Teleport>
</template>

<style>
.jendela-cetak .lembar { font-family: 'Times New Roman', Times, serif; box-sizing: border-box; }
/* Semua tombol di bilah atas sama tinggi (40 px), sudut & huruf seragam — termasuk tombol pilihan dari slot #alat */
.jendela-cetak .bilah > button, .jendela-cetak .tb-bilah { display: inline-flex; height: 2.5rem; align-items: center; gap: 0.375rem; border-radius: 0.75rem; padding: 0 0.875rem; font-size: 0.875rem; font-weight: 600; white-space: nowrap; transition: background-color .15s; }
.jendela-cetak .tb-bilah:disabled { opacity: .6; }
@media print {
  body.sedang-cetak > *:not(.jendela-cetak) { display: none !important; }
  body.sedang-cetak { background: #fff !important; }
  .jendela-cetak { position: static !important; background: #fff !important; backdrop-filter: none !important; display: block !important; }
  .jendela-cetak .bilah { display: none !important; }
  .jendela-cetak .area { overflow: visible !important; padding: 0 !important; }
  .jendela-cetak .lembar { box-shadow: none !important; padding: 0 !important; width: auto !important; min-height: 0 !important; margin: 0 !important; }
}
</style>
