<script setup>
// Lembar uji cetak: kop surat, ukuran huruf, margin, penggaris 10 cm, dan blok tanda tangan.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { modePratinjau } from '@/services/firebase'
import { muatCetak, muatProfilSekolah, pasangHalamanCetak } from '@/services/cetak'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { PEJABAT_AWAL } from '@/config/sekolahAwal'
import { formatNip } from '@/utils/validasi'
import { tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import KopSurat from '@/components/cetak/KopSurat.vue'

const router = useRouter()
const profil = ref(null)
const cetak = ref(null)
const pejabat = ref([])
const orientasi = ref('portrait')
const ttd = ref('basah')
let lepas = () => {}

onMounted(async () => {
  ;[profil.value, cetak.value] = await Promise.all([muatProfilSekolah(), muatCetak()])
  pejabat.value = modePratinjau ? PEJABAT_AWAL : await muatPejabat().catch(() => [])
  orientasi.value = cetak.value.orientasi_bawaan
  ttd.value = cetak.value.tanda_tangan
})
watch([cetak, orientasi], () => { if (cetak.value) { lepas(); lepas = pasangHalamanCetak(cetak.value, orientasi.value) } })
onBeforeUnmount(() => lepas())

const cetakSekarang = () => window.print()
const hariIni = new Date().toISOString().slice(0, 10)
const ks = computed(() => pejabatPada(pejabat.value, 'kepala_sekolah', hariIni))
const bend = computed(() => pejabatPada(pejabat.value, 'bendahara_bosp', hariIni))
const m = computed(() => cetak.value?.[orientasi.value])
const lembar = computed(() => ({
  width: orientasi.value === 'landscape' ? '330mm' : '215mm',
  minHeight: orientasi.value === 'landscape' ? '215mm' : '330mm',
  padding: m.value ? `${m.value.atas}cm ${m.value.kanan}cm ${m.value.bawah}cm ${m.value.kiri}cm` : '2cm',
  fontSize: `${cetak.value?.ukuran_huruf || 12}pt`,
  lineHeight: cetak.value?.spasi || 1.15,
}))
</script>

<template>
  <div class="min-h-dvh bg-slate-200 dark:bg-slate-900 print:bg-white">
    <!-- Bilah alat (tidak ikut tercetak) -->
    <div class="tanpa-cetak sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-navy px-4 py-3 text-white shadow">
      <button class="tombol px-3 py-2 text-white hover:bg-white/10" @click="router.back()"><Ikon nama="ArrowLeft" :ukuran="17" /> Kembali</button>
      <h1 class="flex-1 font-bold">Uji cetak F4</h1>
      <div class="flex gap-1 rounded-xl bg-white/10 p-1">
        <button v-for="[v, l] in [['portrait', 'Tegak'], ['landscape', 'Mendatar']]" :key="v" @click="orientasi = v"
                :class="['rounded-lg px-3 py-1.5 text-sm font-semibold', orientasi === v ? 'bg-white text-navy' : 'text-blue-100']">{{ l }}</button>
      </div>
      <div class="flex gap-1 rounded-xl bg-white/10 p-1">
        <button v-for="[v, l] in [['basah', 'TTD basah'], ['gambar', 'TTD gambar']]" :key="v" @click="ttd = v"
                :class="['rounded-lg px-3 py-1.5 text-sm font-semibold', ttd === v ? 'bg-white text-navy' : 'text-blue-100']">{{ l }}</button>
      </div>
      <button class="tombol bg-kuning text-arang hover:brightness-95" @click="cetakSekarang"><Ikon nama="Printer" :ukuran="17" /> Cetak</button>
    </div>
    <p class="tanpa-cetak mx-auto max-w-3xl px-4 pt-4 text-center text-sm text-slate-600 dark:text-slate-300">
      Di dialog cetak pilih kertas <b>F4/Folio 215 × 330 mm</b>, skala <b>100%</b>, dan matikan <b>Header dan footer</b>. Setelah tercetak, ukur garis 10 cm dengan penggaris.
    </p>

    <div v-if="!profil" class="p-10 text-center text-sm text-slate-500">Memuat…</div>
    <div v-else class="overflow-x-auto p-4 print:overflow-visible print:p-0">
      <article class="lembar mx-auto bg-white text-black shadow-xl" :style="lembar">
        <KopSurat :profil="profil" />

        <div class="mt-[0.6cm] text-center">
          <div class="font-bold underline">SURAT KETERANGAN UJI CETAK</div>
          <div>Nomor: 421/000/UPT.SPF.SMPN.19/{{ ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()] }}/{{ new Date().getFullYear() }}</div>
        </div>

        <p class="mt-[0.5cm] text-justify indent-[1.25cm]">
          Lembar ini dicetak oleh SIBOS untuk memeriksa ukuran kertas F4 (215 × 330 mm), jenis huruf Times New Roman
          {{ cetak.ukuran_huruf }} pt, serta margin {{ orientasi === 'portrait' ? 'tegak' : 'mendatar' }}: atas {{ m.atas }} cm,
          bawah {{ m.bawah }} cm, kiri {{ m.kiri }} cm, dan kanan {{ m.kanan }} cm. Bila semua ukuran sesuai, dokumen SPJ dan laporan
          SIBOS akan tercetak dengan tata letak yang sama.
        </p>

        <table class="mt-[0.4cm] w-full border-collapse text-[0.92em]">
          <thead><tr><th class="sel w-[1cm]">No</th><th class="sel">Uraian</th><th class="sel w-[2cm]">Volume</th><th class="sel w-[3.2cm]">Jumlah (Rp)</th></tr></thead>
          <tbody>
            <tr><td class="sel text-center">1</td><td class="sel">Contoh baris tabel dengan garis tepi tipis</td><td class="sel text-center">1 Paket</td><td class="sel text-right">2.510.000</td></tr>
            <tr><td class="sel text-center">2</td><td class="sel">Angka rata kanan dengan pemisah ribuan titik</td><td class="sel text-center">3 Buah</td><td class="sel text-right">150.000</td></tr>
            <tr><td class="sel" colspan="3"><b>Jumlah</b></td><td class="sel text-right"><b>2.660.000</b></td></tr>
          </tbody>
        </table>

        <div class="mt-[0.5cm]">
          <div class="text-[0.85em]">Penggaris uji — garis di bawah ini harus tepat <b>10 cm</b>:</div>
          <div class="relative mt-1 h-[0.5cm] w-[10cm] border-x-2 border-b-2 border-black">
            <span v-for="i in 9" :key="i" class="absolute bottom-0 h-[0.25cm] border-l border-black" :style="{ left: i + 'cm' }" />
          </div>
        </div>

        <!-- Tanda tangan -->
        <table class="mt-[1cm] w-full">
          <tr>
            <td class="w-1/2 align-top">
              <div>Mengetahui,</div>
              <div>Kepala Sekolah</div>
              <div class="relative h-[2.2cm]"><img v-if="ttd === 'gambar' && ks?.tanda_tangan" :src="ks.tanda_tangan" alt="" class="absolute left-0 top-1 h-[2cm] object-contain" /></div>
              <div class="font-bold underline">{{ ks ? ks.nama + (ks.gelar ? ', ' + ks.gelar : '') : '(belum diatur)' }}</div>
              <div v-if="ks?.pangkat">{{ ks.pangkat }}</div>
              <div v-if="ks?.nip">NIP {{ formatNip(ks.nip) }}</div>
            </td>
            <td class="w-1/2 align-top">
              <div>Makassar, {{ tanggalPanjang(new Date()) }}</div>
              <div>Bendahara BOSP</div>
              <div class="relative h-[2.2cm]"><img v-if="ttd === 'gambar' && bend?.tanda_tangan" :src="bend.tanda_tangan" alt="" class="absolute left-0 top-1 h-[2cm] object-contain" /></div>
              <div class="font-bold underline">{{ bend ? bend.nama + (bend.gelar ? ', ' + bend.gelar : '') : '(belum diatur)' }}</div>
              <div v-if="bend?.pangkat">{{ bend.pangkat }}</div>
              <div v-if="bend?.nip">NIP {{ formatNip(bend.nip) }}</div>
            </td>
          </tr>
        </table>
      </article>
    </div>
  </div>
</template>

<style scoped>
.lembar { font-family: 'Times New Roman', Times, serif; box-sizing: border-box; }
.sel { border: 1px solid #000; padding: 2px 5px; }
@media print {
  .lembar { box-shadow: none !important; padding: 0 !important; width: auto !important; min-height: 0 !important; }
}
</style>
