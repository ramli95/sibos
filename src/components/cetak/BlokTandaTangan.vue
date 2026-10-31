<script setup>
// Blok tanda tangan dua kolom: kiri (Mengetahui, Kepala Sekolah) dan kanan (tempat, tanggal, Bendahara).
import { formatNip } from '@/utils/validasi'
import { tanggalPanjang } from '@/utils/format'
defineProps({
  kiri: Object, kanan: Object, // { label, pejabat }
  tanggal: { type: [String, Date], default: () => new Date() },
  tempat: { type: String, default: 'Makassar' },
  gambar: Boolean,
})
const nama = (p) => (p ? p.nama + (p.gelar ? ', ' + p.gelar : '') : '……………………………')
</script>

<template>
  <table class="ttd">
    <tr>
      <td v-for="(s, i) in [kiri, kanan]" :key="i">
        <template v-if="s">
          <div :class="i === 0 && 'tak-terlihat'">{{ tempat }}, {{ tanggalPanjang(tanggal) }}</div>
          <div>{{ s.label }}</div>
          <div class="ruang"><img v-if="gambar && s.pejabat?.tanda_tangan" :src="s.pejabat.tanda_tangan" alt="" /></div>
          <div class="nama">{{ nama(s.pejabat) }}</div>
          <div v-if="s.pejabat?.pangkat">{{ s.pejabat.pangkat }}</div>
          <div v-if="s.pejabat?.nip">NIP {{ formatNip(s.pejabat.nip) }}</div>
        </template>
      </td>
    </tr>
  </table>
</template>

<style scoped>
.ttd { width: 100%; margin-top: 0.8cm; border-collapse: collapse; page-break-inside: avoid; break-inside: avoid; }
.ttd td { width: 50%; vertical-align: top; padding-left: 0.5cm; }
.tak-terlihat { visibility: hidden; }
.ruang { height: 2.1cm; position: relative; }
.ruang img { position: absolute; left: 0; top: 0.1cm; height: 1.9cm; object-fit: contain; }
.nama { font-weight: bold; text-decoration: underline; }
</style>
