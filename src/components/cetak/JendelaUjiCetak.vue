<script setup>
// Lembar uji cetak: kop, huruf, margin, tabel, penggaris 10 cm, dan tanda tangan.
import { ref, computed, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { PEJABAT_AWAL } from '@/config/sekolahAwal'
import JendelaCetak from './JendelaCetak.vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'

const props = defineProps({ profil: Object })
const emit = defineEmits(['tutup'])
const dataProfil = ref(props.profil || null)
const pejabat = ref([])
const ttdGambar = ref(false)

onMounted(async () => {
  if (!dataProfil.value) dataProfil.value = await muatProfilSekolah()
  pejabat.value = modePratinjau ? PEJABAT_AWAL : await muatPejabat().catch(() => [])
})
const hariIni = new Date().toISOString().slice(0, 10)
const ks = computed(() => pejabatPada(pejabat.value, 'kepala_sekolah', hariIni))
const bend = computed(() => pejabatPada(pejabat.value, 'bendahara_bosp', hariIni))
const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()]
</script>

<template>
  <JendelaCetak judul="Uji Cetak F4" nama-berkas="Uji Cetak F4 SIBOS" @tutup="emit('tutup')">
    <template #alat>
      <div class="flex gap-1 rounded-xl bg-white/10 p-1">
        <button v-for="[v, l] in [[false, 'TTD basah'], [true, 'TTD gambar']]" :key="l" @click="ttdGambar = v"
                :class="['rounded-lg px-2.5 py-1.5 text-sm font-semibold', ttdGambar === v ? 'bg-white text-arang' : 'text-white/75 hover:text-white']">{{ l }}</button>
      </div>
    </template>
    <template #default="{ cetak, orientasi }">
      <div v-if="dataProfil">
        <KopSurat :profil="dataProfil" />
        <div style="margin-top: 0.6cm; text-align: center">
          <div style="font-weight: bold; text-decoration: underline">SURAT KETERANGAN UJI CETAK</div>
          <div>Nomor: 421/000/UPT.SPF.SMPN.19/{{ romawi }}/{{ new Date().getFullYear() }}</div>
        </div>
        <p style="margin-top: 0.5cm; text-align: justify; text-indent: 1.25cm">
          Lembar ini dicetak oleh SIBOS untuk memeriksa ukuran kertas F4 (215 × 330 mm), jenis huruf Times New Roman
          {{ cetak.ukuran_huruf }} pt, serta margin {{ orientasi === 'portrait' ? 'tegak' : 'mendatar' }}: atas {{ cetak[orientasi].atas }} cm,
          bawah {{ cetak[orientasi].bawah }} cm, kiri {{ cetak[orientasi].kiri }} cm, dan kanan {{ cetak[orientasi].kanan }} cm. Bila semua ukuran
          sesuai, dokumen SPJ dan laporan SIBOS akan tercetak dengan tata letak yang sama.
        </p>
        <table style="margin-top: 0.4cm; width: 100%; border-collapse: collapse; font-size: 0.92em">
          <thead><tr><th class="sel" style="width: 1cm">No</th><th class="sel">Uraian</th><th class="sel" style="width: 2cm">Volume</th><th class="sel" style="width: 3.2cm">Jumlah (Rp)</th></tr></thead>
          <tbody>
            <tr><td class="sel" style="text-align: center">1</td><td class="sel">Contoh baris tabel dengan garis tepi tipis</td><td class="sel" style="text-align: center">1 Paket</td><td class="sel" style="text-align: right">2.510.000</td></tr>
            <tr><td class="sel" style="text-align: center">2</td><td class="sel">Angka rata kanan dengan pemisah ribuan titik</td><td class="sel" style="text-align: center">3 Buah</td><td class="sel" style="text-align: right">150.000</td></tr>
            <tr><td class="sel" colspan="3"><b>Jumlah</b></td><td class="sel" style="text-align: right"><b>2.660.000</b></td></tr>
          </tbody>
        </table>
        <div style="margin-top: 0.5cm">
          <div style="font-size: 0.85em">Penggaris uji — garis di bawah ini harus tepat <b>10 cm</b>:</div>
          <div style="position: relative; margin-top: 4px; height: 0.5cm; width: 10cm; border: 2px solid #000; border-top: 0">
            <span v-for="i in 9" :key="i" :style="{ position: 'absolute', bottom: 0, left: i + 'cm', height: '0.25cm', borderLeft: '1px solid #000' }" />
          </div>
        </div>
        <BlokTandaTangan :kiri="{ label: 'Kepala Sekolah', pejabat: ks }" :kanan="{ label: 'Bendahara BOSP', pejabat: bend }" :gambar="ttdGambar" />
      </div>
    </template>
  </JendelaCetak>
</template>

<style scoped>
.sel { border: 1px solid #000; padding: 2px 5px; }
</style>
