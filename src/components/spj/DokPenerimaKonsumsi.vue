<script setup>
// Daftar penerima konsumsi tanpa nama (diisi tangan), jumlah baris bebas, tanda tangan zig-zag
import { computed } from 'vue'
import { tanggalPanjang, NAMA_HARI, dariIso, rupiah } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object, baris: { type: Number, default: 50 } })
const tgl = computed(() => props.b.tgl_terima || props.b.tgl_kegiatan || props.b.tgl_pesanan)
const hari = computed(() => { const d = dariIso(tgl.value); return d ? NAMA_HARI[d.getDay()] : '' })
const konsumsi = computed(() => (props.b.item || []).filter((i) => i.jenis === 'konsumsi'))
const n = computed(() => props.baris || konsumsi.value.reduce((s, i) => s + i.volume, 0) || 30)
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">Daftar Penerima Konsumsi</div>
  <div class="nomor">&nbsp;</div>
  <table class="isian">
    <tr><td class="lb">Kegiatan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Hari/Tanggal</td><td class="tt">:</td><td>{{ hari }}, {{ tanggalPanjang(tgl) }}</td></tr>
    <tr><td class="lb">Jenis Konsumsi</td><td class="tt">:</td><td>{{ (konsumsi.length ? konsumsi : b.item).map((i) => `${i.nama} (${i.volume} ${i.satuan} × ${rupiah(i.harga)})`).join('; ') }}</td></tr>
    <tr><td class="lb">Jumlah Penerima</td><td class="tt">:</td><td>{{ n }} orang</td></tr>
  </table>
  <table class="tabel zig">
    <thead><tr><th style="width: 0.9cm">No</th><th>Nama</th><th style="width: 4cm">Unsur</th><th style="width: 5cm">Tanda Tangan</th></tr></thead>
    <tbody><tr v-for="i in n" :key="i"><td class="tengah">{{ i }}</td><td></td><td></td><td class="ttd-sel"><span :class="(i - 1) % 2 ? 'ttd-kanan' : 'ttd-kiri'">{{ i }}.</span></td></tr></tbody>
  </table>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{ atas: 'Mengetahui,', ...k.ks(tgl) }, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: '', ...k.bendahara(tgl) }]" />
</template>
