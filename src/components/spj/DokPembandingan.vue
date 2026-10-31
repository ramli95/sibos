<script setup>
// Dokumen Hasil Pembandingan (Gambar 3)
import { computed } from 'vue'
import { rupiah, tanggalPanjang } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object })
const tgl = computed(() => props.b.tgl_pesanan)
const kolom = computed(() => [
  { nama: props.k.penyedia.usaha, produk: props.b.item.map((i) => i.nama).join('; '), harga: props.b.total, spek: props.b.item.map((i) => i.spesifikasi).filter(Boolean).join('; ') || '-', kirim: props.b.waktu_serah || '-', alamat: props.k.penyedia.alamat, pilih: true },
  ...(props.b.pembanding || []).filter((p) => p.nama).map((p) => ({ nama: p.nama, produk: props.b.item.map((i) => i.nama).join('; '), harga: p.harga, spek: p.keterangan || 'Sesuai kebutuhan', kirim: '-', alamat: p.alamat || '-' })),
])
const BARIS = [['Nama Calon Penyedia', 'nama'], ['Nama Produk', 'produk'], ['Gambar Produk', null], ['Harga', 'harga'], ['Spesifikasi', 'spek'], ['Estimasi Pengiriman', 'kirim'], ['Alamat Calon Penyedia', 'alamat']]
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">Dokumen Hasil Pembandingan</div>
  <div class="nomor">&nbsp;</div>
  <table class="isian">
    <tr><td class="lb">Nama Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.nama }}</td></tr>
    <tr><td class="lb">Nama Pekerjaan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Hasil Pembandingan</td><td class="tt">:</td><td>Ditetapkan <b>{{ k.penyedia.usaha }}</b> sebagai penyedia</td></tr>
  </table>
  <table class="tabel">
    <thead><tr><th style="width: 4cm"></th><th v-for="(x, i) in kolom" :key="i">Produk {{ ['I', 'II', 'III', 'IV'][i] || i + 1 }}<template v-if="x.pilih"> (terpilih)</template></th></tr></thead>
    <tbody>
      <tr v-for="[l, f] in BARIS" :key="l"><td>{{ l }}</td><td v-for="(x, i) in kolom" :key="i" :class="f === 'harga' && 'kanan'">{{ f === 'harga' ? rupiah(x.harga) : f ? x[f] : '(terlampir)' }}</td></tr>
    </tbody>
  </table>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{}, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Pelaksana,', ...k.pelaksana(tgl) }]" />
</template>
