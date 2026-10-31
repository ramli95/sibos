<script setup>
// Notulen / laporan singkat kegiatan
import { computed } from 'vue'
import { tanggalPanjang, NAMA_HARI, dariIso } from '@/utils/format'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object })
const tgl = computed(() => props.b.tgl_kegiatan || props.b.tgl_terima || props.b.tgl_pesanan)
const hari = computed(() => { const d = dariIso(tgl.value); return d ? NAMA_HARI[d.getDay()] : '' })
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">Notulen / Laporan Singkat</div>
  <div class="nomor">&nbsp;</div>
  <table class="isian">
    <tr><td class="lb">Kegiatan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Hari/Tanggal</td><td class="tt">:</td><td>{{ hari }}, {{ tanggalPanjang(tgl) }}</td></tr>
    <tr><td class="lb">Tempat</td><td class="tt">:</td><td>{{ b.tempat || k.sekolah.nama }}</td></tr>
  </table>
  <div class="kotak" style="min-height: 12cm; white-space: pre-line; margin-top: 0.3cm">{{ b.notulen || '' }}</div>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{ atas: 'Mengetahui,', ...k.ks(tgl) }, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Notulis,', jabatan: '', nama: '' }]" />
</template>
