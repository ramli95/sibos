<script setup>
// Dokumen Perencanaan PBJ (Lampiran Permendikbudristek 18/2022, Gambar 2)
import { computed } from 'vue'
import { rupiah, tanggalPanjang } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object, namaRek: { type: Function, default: () => '' } })
const tgl = computed(() => props.b.tgl_pesanan)
const kategori = computed(() => {
  const j = new Set((props.b.item || []).map((i) => i.jenis))
  return j.has('jasa') && j.size === 1 ? 'Jasa Lainnya' : j.has('konsumsi') ? 'Makanan dan Minuman' : props.b.kategori === 'alat_mesin' ? 'Peralatan dan Mesin' : props.b.kategori === 'aset_lain' ? 'Aset Tetap Lainnya/Buku' : 'Barang/Bahan Habis Pakai'
})
const kelompok = computed(() => {
  const m = new Map()
  ;(props.b.item || []).forEach((i) => m.set(`${i.kode_kegiatan} ${i.kode_rekening}`, (m.get(`${i.kode_kegiatan} ${i.kode_rekening}`) || 0) + i.jumlah))
  return [...m]
})
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">Dokumen Perencanaan</div>
  <div class="nomor">Pengadaan Barang/Jasa Satuan Pendidikan</div>
  <table class="isian">
    <tr><td class="lb">Nama Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.nama }}</td></tr>
    <tr><td class="lb">Alamat Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.alamat }}</td></tr>
    <tr><td class="lb">Nama Pekerjaan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Kategori Barang/Jasa</td><td class="tt">:</td><td>{{ kategori }}</td></tr>
  </table>
  <table class="tabel">
    <thead><tr><th style="width: 0.9cm">No.</th><th style="width: 5.2cm">Jenis</th><th>Keterangan</th></tr></thead>
    <tbody>
      <tr><td class="tengah">1</td><td>Jumlah barang/jasa</td><td><div v-for="i in b.item" :key="i.id">{{ i.nama }}: {{ i.volume }} {{ i.satuan }}</div></td></tr>
      <tr><td class="tengah">2</td><td>Spesifikasi/ruang lingkup barang/jasa</td><td><div v-for="i in b.item" :key="i.id">{{ i.nama }}{{ i.spesifikasi ? ' — ' + i.spesifikasi : '' }}</div></td></tr>
      <tr><td class="tengah">3</td><td>Waktu serah terima</td><td>{{ b.waktu_serah || (b.tgl_terima ? tanggalPanjang(b.tgl_terima) : '-') }}</td></tr>
      <tr><td class="tengah">4</td><td>Lokasi serah terima</td><td>{{ b.lokasi_serah || k.sekolah.nama }}</td></tr>
      <tr><td class="tengah">5</td><td>Alokasi anggaran</td><td>
        <div v-for="[kode, j] in kelompok" :key="kode">{{ kode }} ({{ namaRek(kode.split(' ')[1]) }}): {{ rupiah(j) }}</div>
        <div>Sumber dana BOSP Reguler Tahun {{ b.tahun }}</div></td></tr>
      <tr><td class="tengah">6</td><td>Persyaratan Penyedia</td><td>
        {{ b.rekanan?.bentuk_usaha === 'badan' ? 'Badan Usaha' : 'Perorangan' }}<br />Memenuhi syarat sebagai berikut:
        <div v-for="(s, i) in (b.persyaratan?.length ? b.persyaratan : ['Identitas penyedia', 'NPWP'])" :key="i">{{ String.fromCharCode(97 + i) }}. {{ s }};</div>
      </td></tr>
    </tbody>
  </table>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{}, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Pelaksana,', ...k.pelaksana(tgl) }]" />
</template>
