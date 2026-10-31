<script setup>
// Kolom tanda tangan sejajar. kolom: [{ tanggal, atas, jabatan, nama, nip, pangkat, ttd, meterai }]
// Disusun per baris agar ruang tanda tangan dan nama selalu sejajar walau jabatan berbeda panjang.
import { computed } from 'vue'
import { formatNip } from '@/utils/validasi'
const props = defineProps({ kolom: { type: Array, required: true }, gambar: Boolean })
const ada = (f) => props.kolom.some((k) => k[f])
const lebar = computed(() => 100 / props.kolom.length + '%')
const kosong = (k) => !k.nama && !k.atas && !k.jabatan
</script>

<template>
  <table class="ttd-kolom ttd">
    <tr v-if="ada('tanggal')"><td v-for="(k, i) in kolom" :key="i" :style="{ width: lebar }">{{ k.tanggal || '' }}</td></tr>
    <tr v-if="ada('atas')"><td v-for="(k, i) in kolom" :key="i" class="tebal">{{ k.atas || '' }}</td></tr>
    <tr v-if="ada('jabatan')"><td v-for="(k, i) in kolom" :key="i" style="vertical-align: top">{{ k.jabatan || '' }}</td></tr>
    <tr>
      <td v-for="(k, i) in kolom" :key="i"><div class="ruang">
        <span v-if="k.meterai" class="meterai" style="position: absolute; left: 0.2cm; top: 0.25cm">Meterai<br />Rp 10.000</span>
        <img v-if="gambar && k.ttd" :src="k.ttd" alt="" />
      </div></td>
    </tr>
    <tr><td v-for="(k, i) in kolom" :key="i" style="vertical-align: top"><span v-if="!kosong(k)" class="nama">{{ k.nama || '……………………………' }}</span></td></tr>
    <tr v-if="ada('pangkat')"><td v-for="(k, i) in kolom" :key="i">{{ k.pangkat || '' }}</td></tr>
    <tr v-if="ada('nip')"><td v-for="(k, i) in kolom" :key="i">{{ k.nip ? 'NIP ' + formatNip(k.nip) : '' }}</td></tr>
  </table>
</template>
