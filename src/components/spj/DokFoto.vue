<script setup>
// Lampiran foto: 2, 4 atau 6 foto per halaman, dengan keterangan
import { computed } from 'vue'
import { tanggalPanjang } from '@/utils/format'
const props = defineProps({ b: Object, k: Object, foto: { type: Array, default: () => [] }, perHalaman: { type: Number, default: 4 }, ke: { type: Number, default: 1 }, dari: { type: Number, default: 1 } })
const baris = computed(() => { const r = []; for (let i = 0; i < props.foto.length; i += 2) r.push(props.foto.slice(i, i + 2)); return r })
const tinggi = computed(() => ({ 2: '10.5cm', 4: '7.6cm', 6: '5.6cm' }[props.perHalaman] || '7.6cm'))
const honor = computed(() => props.b.jenis === 'honor' || (props.b.item || []).some((i) => i.jenis === 'konsumsi'))
</script>

<template>
  <div class="judul polos">{{ honor ? 'Dokumentasi Kegiatan' : 'Lampiran Foto Berita Acara Serah Terima' }}</div>
  <div class="sub tebal">{{ b.nama_pekerjaan }}</div>
  <div class="nomor kecil">
    <template v-if="b.nomor?.bast">BAST Nomor {{ b.nomor.bast }} · </template>{{ tanggalPanjang(b.tgl_terima || b.tgl_kegiatan || b.tgl_lunas) }}<template v-if="dari > 1"> · Halaman {{ ke }} dari {{ dari }}</template>
  </div>
  <table class="foto-grid">
    <tr v-for="(r, i) in baris" :key="i">
      <td v-for="f in r" :key="f.id"><img :src="f.data" :style="{ height: tinggi }" alt="" /><div class="ket">{{ f.keterangan }}</div></td>
      <td v-if="r.length === 1" style="border: none" />
    </tr>
  </table>
</template>
