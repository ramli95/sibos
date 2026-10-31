<script setup>
// Dokumen Hasil Negosiasi (Gambar 4)
import { computed } from 'vue'
import { rupiah, tanggalPanjang } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object })
const tgl = computed(() => props.b.tgl_pesanan)
const r = (n) => rupiah(n, { tanpaRp: true })
const penawaran = computed(() => props.b.item.reduce((s, i) => s + Math.round(i.volume * (i.harga_penawaran || i.harga)), 0))
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">Dokumen Hasil Negosiasi</div>
  <div class="nomor">Nomor: {{ b.nomor?.negosiasi || '……………' }}</div>
  <table class="isian">
    <tr><td class="lb">Nama Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.nama }}</td></tr>
    <tr><td class="lb">Alamat Satuan Pendidikan</td><td class="tt">:</td><td>{{ k.sekolah.alamat }}</td></tr>
    <tr><td class="lb">Nama Calon Penyedia</td><td class="tt">:</td><td>{{ k.penyedia.usaha }}</td></tr>
    <tr><td class="lb">Alamat Calon Penyedia</td><td class="tt">:</td><td>{{ k.penyedia.alamat }}</td></tr>
    <tr><td class="lb">Tanggal Terima Barang/Jasa</td><td class="tt">:</td><td>{{ b.tgl_terima ? tanggalPanjang(b.tgl_terima) : b.waktu_serah || '-' }}</td></tr>
    <tr><td class="lb">Hasil Negosiasi</td><td class="tt">:</td><td>Disepakati dengan rincian berikut</td></tr>
  </table>
  <table class="tabel">
    <thead><tr><th style="width: 0.8cm">No</th><th>Nama Produk</th><th style="width: 1.8cm">Jumlah (QTY)</th><th style="width: 3cm">Harga Penawaran (Rp)</th><th style="width: 3cm">Harga Negosiasi (Rp)</th><th style="width: 3cm">Keterangan</th></tr></thead>
    <tbody>
      <tr v-for="(i, n) in b.item" :key="i.id"><td class="tengah">{{ n + 1 }}</td><td>{{ i.nama }}</td><td class="tengah">{{ i.volume }} {{ i.satuan }}</td><td class="kanan">{{ r(i.harga_penawaran || i.harga) }}</td><td class="kanan">{{ r(i.harga) }}</td><td>{{ (i.harga_penawaran || i.harga) > i.harga ? 'Turun ' + r((i.harga_penawaran || i.harga) - i.harga) : 'Sesuai penawaran' }}</td></tr>
      <tr><td></td><td>Biaya Pengiriman</td><td class="tengah">-</td><td class="kanan">0</td><td class="kanan">0</td><td>Ditanggung penyedia</td></tr>
      <tr class="tebal"><td colspan="3" class="kanan">Jumlah</td><td class="kanan">{{ r(penawaran) }}</td><td class="kanan">{{ r(b.total) }}</td><td>Pembayaran setelah serah terima</td></tr>
    </tbody>
  </table>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{ atas: 'Calon Penyedia,', jabatan: k.penyedia.usaha, nama: k.penyedia.nama }, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Pelaksana,', ...k.pelaksana(tgl) }]" />
  <p class="kecil" style="margin-top: 0.3cm">Catatan: kolom keterangan diisi sesuai hasil negosiasi, meliputi jumlah termin pembayaran dan hal lain sesuai kesepakatan para pihak.</p>
</template>
