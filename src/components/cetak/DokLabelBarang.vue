<script setup>
// Lembar label barang inventaris (3 kolom, F4): pemilik, unit, kode barang + register, nama, tahun, kode QR
// yang membuka halaman Rincian Barang di SIBOS.
import { ref, watchEffect } from 'vue'
import QRCode from 'qrcode'
import { PEMILIK_LABEL } from '@/config/aset'

const props = defineProps({
  label: { type: Array, required: true }, // [{ id, kode_barang, register, nama, tahun, ruang }]
  unit: { type: String, default: 'UPT SPF SMP NEGERI 19 MAKASSAR' },
})
const qr = ref({})
const alamat = (id) => `${location.origin}${import.meta.env.BASE_URL}#/barang/aset/${id}`
watchEffect(async () => {
  const hasil = {}
  for (const l of props.label) {
    if (!hasil[l.id]) hasil[l.id] = await QRCode.toDataURL(alamat(l.id), { margin: 0, width: 220, errorCorrectionLevel: 'M' })
  }
  qr.value = hasil
})
</script>

<template>
  <div class="label-grid">
    <div v-for="(l, i) in props.label" :key="i" class="label">
      <div class="atas">{{ PEMILIK_LABEL }}<br /><b>{{ props.unit }}</b></div>
      <div class="badan">
        <img v-if="qr[l.id]" :src="qr[l.id]" alt="" class="qr" />
        <div class="teks">
          <div class="kode">{{ l.kode_barang || '—' }}</div>
          <div class="reg">Reg. {{ l.register }} · {{ l.tahun }}</div>
          <div class="nama">{{ l.nama }}</div>
          <div v-if="l.ruang" class="ruang">{{ l.ruang }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25cm; color: #000; }
.label { border: 1px solid #000; border-radius: 4px; padding: 0.12cm 0.15cm; page-break-inside: avoid; break-inside: avoid; font-size: 7.5pt; line-height: 1.15; }
.atas { text-align: center; border-bottom: 1px solid #000; padding-bottom: 0.08cm; margin-bottom: 0.08cm; font-size: 6.5pt; }
.badan { display: flex; gap: 0.15cm; align-items: center; }
.qr { width: 1.7cm; height: 1.7cm; flex-shrink: 0; }
.teks { min-width: 0; }
.kode { font-family: 'Courier New', monospace; font-size: 6.5pt; word-break: break-all; }
.reg { font-weight: bold; }
.nama { font-weight: bold; font-size: 8pt; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ruang { font-style: italic; font-size: 6.5pt; }
</style>
