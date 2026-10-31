<script setup>
// Daftar hadir peserta: nama dari data pegawai/penerima atau baris kosong; tanda tangan zig-zag kiri-kanan
import { computed } from 'vue'
import { tanggalPanjang, NAMA_HARI, dariIso } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object, peserta: { type: Array, default: () => [] }, baris: { type: Number, default: 30 } })
const tgl = computed(() => props.b.tgl_kegiatan || props.b.tgl_terima || props.b.tgl_pesanan)
const hari = computed(() => { const d = dariIso(tgl.value); return d ? NAMA_HARI[d.getDay()] : '' })
const isi = computed(() => { const n = Math.max(props.baris || 0, props.peserta.length); return Array.from({ length: n }, (_, i) => props.peserta[i] || null) })
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">Daftar Hadir Peserta</div>
  <div class="nomor">&nbsp;</div>
  <table class="isian">
    <tr><td class="lb">Kegiatan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Hari/Tanggal</td><td class="tt">:</td><td>{{ hari }}, {{ tanggalPanjang(tgl) }}</td></tr>
    <tr><td class="lb">Tempat</td><td class="tt">:</td><td>{{ b.tempat || k.sekolah.nama }}</td></tr>
  </table>
  <table class="tabel zig">
    <thead><tr><th style="width: 0.9cm">No</th><th>Nama</th><th style="width: 4.5cm">Jabatan/Unsur</th><th style="width: 5cm">Tanda Tangan</th></tr></thead>
    <tbody>
      <tr v-for="(p, i) in isi" :key="i">
        <td class="tengah">{{ i + 1 }}</td><td>{{ p?.nama || '' }}</td><td>{{ p?.jabatan || p?.instansi || '' }}</td>
        <td class="ttd-sel"><span :class="i % 2 ? 'ttd-kanan' : 'ttd-kiri'">{{ i + 1 }}.</span></td>
      </tr>
    </tbody>
  </table>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{}, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Mengetahui,', ...k.ks(tgl) }]" />
</template>
