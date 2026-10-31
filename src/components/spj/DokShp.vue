<script setup>
// Surat Hasil Pemeriksaan Barang/Jasa (Gambar 5 bagian 5)
import { computed } from 'vue'
import { tanggalPanjang, tanggalKata } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object })
const tgl = computed(() => props.b.tgl_terima)
const pemeriksa = computed(() => props.k.pemeriksaPada(tgl.value))
</script>

<template>
  <div class="rapat-dok">
  <KopSurat :profil="profil" />
  <div class="judul">Surat Hasil Pemeriksaan</div>
  <div class="nomor">Nomor: {{ b.nomor?.shp || '……………' }}</div>
  <p class="paragraf">Pada hari ini {{ tanggalKata(tgl) }}, sesuai dengan:</p>
  <table class="isian">
    <tr><td class="lb">Nomor Surat Pemesanan</td><td class="tt">:</td><td>{{ b.nomor?.surat_pesanan || '-' }}</td></tr>
    <tr><td class="lb">Tanggal</td><td class="tt">:</td><td>{{ tanggalPanjang(b.tgl_pesanan) }}</td></tr>
    <tr><td class="lb">Nama Pekerjaan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Tahun</td><td class="tt">:</td><td>{{ b.tahun }}</td></tr>
  </table>
  <p class="paragraf" style="margin-bottom: 0">Yang bertanda tangan di bawah ini:</p>
  <table class="isian" style="margin-left: 0.6cm">
    <tr><td class="lb">Nama</td><td class="tt">:</td><td>{{ pemeriksa.nama }}</td></tr>
    <tr><td class="lb">Jabatan</td><td class="tt">:</td><td>{{ pemeriksa.jabatan }}</td></tr>
    <tr><td class="lb">Nama Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.nama }}</td></tr>
    <tr><td class="lb">Alamat Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.alamat }}</td></tr>
    <tr><td class="lb">No. Telepon</td><td class="tt">:</td><td>{{ k.sekolah.telepon }}</td></tr>
  </table>
  <p class="paragraf">Telah melakukan pemeriksaan terhadap hasil pekerjaan sesuai surat pemesanan dimaksud dengan rincian berikut:</p>
  <table class="tabel">
    <thead><tr><th style="width: 0.8cm">No</th><th>Nama Barang/Jasa</th><th style="width: 2.4cm">Jumlah</th><th style="width: 3cm">Spesifikasi</th><th style="width: 2.6cm">Kondisi</th></tr></thead>
    <tbody><tr v-for="(i, n) in b.item" :key="i.id"><td class="tengah">{{ n + 1 }}</td><td>{{ i.nama }}</td><td class="tengah">{{ i.volume }} {{ i.satuan }}</td><td class="tengah">Sesuai</td><td class="tengah">Baik</td></tr></tbody>
  </table>
  <p class="paragraf">Demikian Surat Pemeriksaan Hasil Pekerjaan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana seharusnya.</p>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[
    { atas: 'PIHAK KEDUA', ...k.pelaksana(tgl) },
    { atas: 'PEMERIKSA BARANG', jabatan: pemeriksa.jabatan, nama: pemeriksa.nama, nip: pemeriksa.nip },
    { atas: 'PIHAK PERTAMA', jabatan: k.penyedia.jabatan, nama: k.penyedia.nama },
  ]" />
  </div>
</template>
