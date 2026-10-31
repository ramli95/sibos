<script setup>
// Tabel rincian barang/jasa + jumlah + terbilang (surat pesanan, proforma, invoice)
import { computed } from 'vue'
import { rupiah, terbilang } from '@/utils/format'
const props = defineProps({ item: { type: Array, required: true }, pkp: Boolean, spesifikasi: { type: Boolean, default: true }, judulUraian: { type: String, default: 'Uraian Barang/Jasa' } })
const total = computed(() => props.item.reduce((s, i) => s + i.jumlah, 0))
const ppn = computed(() => (props.pkp ? total.value - Math.round(total.value / 1.11) : 0))
const r = (n) => rupiah(n, { tanpaRp: true })
</script>

<template>
  <table class="tabel">
    <thead>
      <tr><th style="width: 0.8cm">No</th><th>{{ judulUraian }}</th><th v-if="spesifikasi" style="width: 4.2cm">Spesifikasi</th><th style="width: 1.4cm">Jumlah</th><th style="width: 1.6cm">Satuan</th><th style="width: 2.5cm">Harga Satuan (Rp)</th><th style="width: 2.7cm">Total (Rp)</th></tr>
    </thead>
    <tbody>
      <tr v-for="(it, i) in item" :key="it.id || i">
        <td class="tengah">{{ i + 1 }}</td><td>{{ it.nama }}</td><td v-if="spesifikasi">{{ it.spesifikasi || '-' }}</td>
        <td class="tengah">{{ it.volume }}</td><td class="tengah">{{ it.satuan }}</td><td class="kanan">{{ r(it.harga) }}</td><td class="kanan">{{ r(it.jumlah) }}</td>
      </tr>
      <tr v-if="pkp"><td :colspan="spesifikasi ? 6 : 5" class="kanan">Dasar Pengenaan Pajak</td><td class="kanan">{{ r(total - ppn) }}</td></tr>
      <tr v-if="pkp"><td :colspan="spesifikasi ? 6 : 5" class="kanan">PPN (termasuk dalam harga)</td><td class="kanan">{{ r(ppn) }}</td></tr>
      <tr class="tebal"><td :colspan="spesifikasi ? 6 : 5" class="kanan">TOTAL</td><td class="kanan">{{ r(total) }}</td></tr>
    </tbody>
  </table>
  <p class="miring">Terbilang: <b>{{ terbilang(total) }}</b></p>
</template>
