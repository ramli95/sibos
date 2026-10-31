<script setup>
// Dokumen daftar/tabel siap cetak: kop, judul, tabel bergaris, dan (opsional) tanda tangan.
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'

defineProps({
  profil: { type: Object, required: true },
  judul: { type: String, required: true },
  subjudul: String,
  kolom: { type: Array, required: true }, // { judul, nilai(b), lebar, rata }
  baris: { type: Array, required: true },
  ttd: Object, // { kiri, kanan, gambar }
})
</script>

<template>
  <div class="dok">
    <KopSurat :profil="profil" />
    <div class="judul">{{ judul }}</div>
    <div v-if="subjudul" class="sub">{{ subjudul }}</div>
    <table class="tabel">
      <thead>
        <tr><th style="width: 0.9cm">No</th><th v-for="k in kolom" :key="k.judul" :style="{ width: k.lebar }">{{ k.judul }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="(b, i) in baris" :key="i">
          <td class="tengah">{{ i + 1 }}</td>
          <td v-for="k in kolom" :key="k.judul" :class="k.rata">{{ k.nilai(b) }}</td>
        </tr>
        <tr v-if="!baris.length"><td :colspan="kolom.length + 1" class="tengah">Tidak ada data.</td></tr>
      </tbody>
    </table>
    <BlokTandaTangan v-if="ttd" v-bind="ttd" />
  </div>
</template>

<style scoped>
.dok { color: #000; }
.judul { margin-top: 0.5cm; text-align: center; font-weight: bold; font-size: 1.1em; text-transform: uppercase; }
.sub { text-align: center; margin-bottom: 0.35cm; }
.tabel { width: 100%; border-collapse: collapse; font-size: 0.85em; margin-top: 0.2cm; }
.tabel th, .tabel td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
.tabel th { background: #f1f1f1; text-align: center; font-weight: bold; }
.tabel thead { display: table-header-group; }
.tabel tr { page-break-inside: avoid; break-inside: avoid; }
.tengah { text-align: center; }
.kanan { text-align: right; }
@media print { .tabel th { background: #f1f1f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
