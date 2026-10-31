<script setup>
// Dokumen buku (BKU, Buku Bank, Kas Tunai, Buku Pembantu Pajak, rekap): kop, judul, identitas,
// tabel bergaris dengan baris jumlah, dan tanda tangan Kepala Sekolah & Bendahara (ruang stempel).
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { rupiah } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  judul: { type: String, required: true },
  subjudul: String,
  identitas: { type: Array, default: () => [] }, // [[label, nilai]]
  kolom: { type: Array, required: true },        // { judul, nilai(r), lebar, rata, uang, jumlah }
  baris: { type: Array, required: true },
  nomor: { type: Boolean, default: true },
  ringkasan: { type: Array, default: () => [] }, // [[label, nilai]] di bawah tabel
  ttd: Object,
  tanggal: { type: [String, Date], default: () => new Date() },
  kecil: Boolean,
  warnaBaris: { type: Function, default: null },
})
const tampil = (k, r) => { const v = k.nilai(r); return k.uang ? (v ? rupiah(v, { tanpaRp: true }) : v === 0 ? '-' : '') : v }
const total = computed(() => props.kolom.map((k) => (k.jumlah ? props.baris.reduce((s, r) => s + (Number(k.nilai(r)) || 0), 0) : null)))
const adaTotal = computed(() => total.value.some((t) => t != null))
// Ringkasan panjang dibagi dua kolom agar tanda tangan tetap muat di halaman yang sama
const bagianRingkasan = computed(() => { const r = props.ringkasan; if (r.length <= 5) return [r]; const t = Math.ceil(r.length / 2); return [r.slice(0, t), r.slice(t)] })
const awalTotal = computed(() => total.value.findIndex((t) => t != null))
</script>

<template>
  <div class="dok-buku" :class="{ kecil: props.kecil }">
    <KopSurat :profil="props.profil" />
    <div class="judul">{{ props.judul }}</div>
    <div v-if="props.subjudul" class="sub">{{ props.subjudul }}</div>
    <table v-if="props.identitas.length" class="identitas">
      <tr v-for="[l, v] in props.identitas" :key="l"><td class="l">{{ l }}</td><td class="t">:</td><td>{{ v }}</td></tr>
    </table>
    <table class="tabel">
      <thead>
        <tr><th v-if="props.nomor" style="width: 0.8cm">No</th><th v-for="k in props.kolom" :key="k.judul" :style="{ width: k.lebar }">{{ k.judul }}</th></tr>
        <tr class="angka-kolom"><th v-if="props.nomor">1</th><th v-for="(k, i) in props.kolom" :key="k.judul">{{ i + (props.nomor ? 2 : 1) }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in props.baris" :key="r.id || i" :style="props.warnaBaris ? { background: props.warnaBaris(r) || 'transparent' } : null">
          <td v-if="props.nomor" class="tengah">{{ i + 1 }}</td>
          <td v-for="k in props.kolom" :key="k.judul" :class="[k.uang ? 'kanan' : k.rata, k.kode && 'kd']">{{ tampil(k, r) }}</td>
        </tr>
        <tr v-if="!props.baris.length"><td :colspan="props.kolom.length + (props.nomor ? 1 : 0)" class="tengah">Tidak ada transaksi.</td></tr>
      </tbody>
      <tfoot v-if="adaTotal && props.baris.length">
        <tr>
          <td :colspan="awalTotal + (props.nomor ? 1 : 0)" class="tengah tebal">JUMLAH</td>
          <td v-for="(t, i) in total.slice(awalTotal)" :key="i" class="kanan tebal">{{ t != null ? rupiah(t, { tanpaRp: true }) : '' }}</td>
        </tr>
      </tfoot>
    </table>
    <div v-if="props.ringkasan.length" class="ringkasan-wadah">
      <table v-for="(bag, i) in bagianRingkasan" :key="i" class="ringkasan">
        <tr v-for="[l, v] in bag" :key="l"><td>{{ l }}</td><td class="kanan">{{ typeof v === 'number' ? rupiah(v) : v }}</td></tr>
      </table>
    </div>
    <slot />
    <BlokTandaTangan v-if="props.ttd" v-bind="props.ttd" :tanggal="props.tanggal" />
  </div>
</template>

<style scoped>
.dok-buku { color: #000; }
.judul { margin-top: 0.45cm; text-align: center; font-weight: bold; font-size: 1.1em; text-transform: uppercase; }
.sub { text-align: center; margin-bottom: 0.25cm; }
.identitas { margin: 0.15cm 0 0.2cm; border-collapse: collapse; font-size: 0.92em; }
.identitas td { padding: 0 4px 0 0; vertical-align: top; }
.identitas .l { width: 4.2cm; } .identitas .t { width: 0.3cm; }
.tabel { width: 100%; border-collapse: collapse; font-size: 0.82em; }
.kecil .tabel { font-size: 0.74em; }
.tabel th, .tabel td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
.tabel th { background: #f1f1f1; text-align: center; font-weight: bold; }
.tabel .angka-kolom th { font-weight: normal; font-style: italic; font-size: 0.9em; padding: 0 2px; }
.tabel thead { display: table-header-group; }
.tabel tfoot { display: table-row-group; }
.tabel tr { page-break-inside: avoid; break-inside: avoid; }
.tengah { text-align: center; } .kanan { text-align: right; white-space: nowrap; } .tebal { font-weight: bold; }
.kd { white-space: nowrap; }
.ringkasan-wadah { display: flex; gap: 1.2cm; margin-top: 0.3cm; page-break-inside: avoid; break-inside: avoid; }
.ringkasan { border-collapse: collapse; min-width: 9.5cm; font-size: 0.92em; align-self: flex-start; }
.ringkasan td { padding: 1px 6px; border-bottom: 1px dotted #777; }
@media print { .tabel th { background: #f1f1f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .tabel tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
