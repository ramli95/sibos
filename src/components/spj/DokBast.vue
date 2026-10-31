<script setup>
// Berita Acara Serah Terima (Gambar 6)
import { computed } from 'vue'
import { tanggalPanjang, tanggalKata } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object })
const tgl = computed(() => props.b.tgl_terima)
const pihak2 = computed(() => props.k.pelaksana(tgl.value))
const pemeriksa = computed(() => props.k.pemeriksaPada(tgl.value))
</script>

<template>
  <div class="rapat-dok">
  <KopSurat :profil="profil" />
  <div class="judul">Berita Acara Serah Terima</div>
  <div class="nomor">Nomor: {{ b.nomor?.bast || '……………' }}</div>
  <p class="paragraf">Pada hari ini {{ tanggalKata(tgl) }}, sesuai dengan:</p>
  <table class="isian">
    <tr><td class="lb">Nomor Surat Pemesanan</td><td class="tt">:</td><td>{{ b.nomor?.surat_pesanan || '-' }}</td></tr>
    <tr><td class="lb">Tanggal</td><td class="tt">:</td><td>{{ tanggalPanjang(b.tgl_pesanan) }}</td></tr>
    <tr><td class="lb">Nama Pekerjaan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Tahun</td><td class="tt">:</td><td>{{ b.tahun }}</td></tr>
  </table>
  <p class="paragraf" style="margin-bottom: 0">Yang bertanda tangan di bawah ini:</p>
  <table class="isian">
    <tr><td style="width: 0.6cm">1.</td><td class="lb">Nama</td><td class="tt">:</td><td>{{ k.penyedia.nama }}</td></tr>
    <tr><td></td><td class="lb">Jabatan</td><td class="tt">:</td><td>{{ b.rekanan?.jabatan_pemilik || 'Pemilik' }}</td></tr>
    <tr><td></td><td class="lb">Nama Penyedia</td><td class="tt">:</td><td>{{ k.penyedia.usaha }}</td></tr>
    <tr><td></td><td class="lb">Alamat Penyedia</td><td class="tt">:</td><td>{{ k.penyedia.alamat }}</td></tr>
    <tr><td></td><td class="lb">No. Telepon</td><td class="tt">:</td><td>{{ k.penyedia.telepon || '-' }}</td></tr>
    <tr><td></td><td colspan="3">Sebagai pihak yang menyerahkan, selanjutnya disebut <b>PIHAK PERTAMA</b></td></tr>
    <tr><td style="padding-top: 0.15cm">2.</td><td class="lb" style="padding-top: 0.15cm">Nama</td><td class="tt">:</td><td style="padding-top: 0.15cm">{{ pihak2.nama }}</td></tr>
    <tr><td></td><td class="lb">Jabatan</td><td class="tt">:</td><td>{{ pihak2.jabatan }}</td></tr>
    <tr><td></td><td class="lb">Nama Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.nama }}</td></tr>
    <tr><td></td><td class="lb">Alamat Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.alamat }}</td></tr>
    <tr><td></td><td class="lb">No. Telepon</td><td class="tt">:</td><td>{{ k.sekolah.telepon }}</td></tr>
    <tr><td></td><td colspan="3">Sebagai pihak yang menerima, selanjutnya disebut <b>PIHAK KEDUA</b></td></tr>
  </table>
  <p class="paragraf">PIHAK PERTAMA menyerahkan hasil pekerjaan {{ b.nama_pekerjaan }} kepada PIHAK KEDUA, dan PIHAK KEDUA telah menerima hasil pekerjaan tersebut dalam jumlah yang lengkap dan kondisi yang baik sesuai dengan rincian berikut:</p>
  <table class="tabel">
    <thead><tr><th style="width: 0.8cm">No</th><th>Nama Barang/Jasa</th><th style="width: 2.6cm">Jumlah Diserahkan</th><th style="width: 2.6cm">Jumlah Diterima</th><th style="width: 2.4cm">Kondisi</th></tr></thead>
    <tbody><tr v-for="(i, n) in b.item" :key="i.id"><td class="tengah">{{ n + 1 }}</td><td>{{ i.nama }}</td><td class="tengah">{{ i.volume }} {{ i.satuan }}</td><td class="tengah">{{ i.volume }} {{ i.satuan }}</td><td class="tengah">Baik</td></tr></tbody>
  </table>
  <p class="paragraf">Berita Acara Serah Terima ini berfungsi sebagai bukti serah terima hasil pekerjaan kepada PIHAK KEDUA, untuk selanjutnya dicatat pada buku penerimaan barang Satuan Pendidikan.</p>
  <p class="paragraf">Demikian Berita Acara Serah Terima ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana seharusnya.</p>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[
    { atas: 'PIHAK KEDUA', ...pihak2 },
    { atas: 'PEMERIKSA BARANG', jabatan: pemeriksa.jabatan, nama: pemeriksa.nama, nip: pemeriksa.nip },
    { atas: 'PIHAK PERTAMA', jabatan: k.penyedia.jabatan, nama: k.penyedia.nama },
  ]" />
  </div>
</template>
