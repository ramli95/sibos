<script setup>
// Isian angka/rupiah dengan pemisah ribuan titik (1.000.000) dan desimal koma (0,5).
// v-model tetap berupa Number (atau '' bila kosong), jadi bisa langsung menggantikan <input type="number">.
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  desimal: { type: Number, default: 2 }, // jumlah angka di belakang koma yang diizinkan
})
const emit = defineEmits(['update:modelValue'])

const fmt = (n) => (n === '' || n == null || Number.isNaN(Number(n)) ? '' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: props.desimal }))
const teks = ref(fmt(props.modelValue))
watch(() => props.modelValue, (v) => { if (urai(teks.value) !== (v === '' || v == null ? '' : Number(v))) teks.value = fmt(v) })

/** "1.250.000,5" → 1250000.5 ; "" → '' */
function urai(s) {
  const bersih = String(s ?? '').replace(/[^\d,-]/g, '').replace(',', '.')
  if (bersih === '' || bersih === '-') return ''
  const n = Number(bersih)
  return Number.isNaN(n) ? '' : n
}

function ketik(e) {
  const el = e.target
  const mentah = el.value
  // Simpan posisi kursor relatif terhadap jumlah digit di kirinya
  const digitKiri = mentah.slice(0, el.selectionStart ?? mentah.length).replace(/[^\d,]/g, '').length
  const koma = mentah.includes(',')
  const [bulat, pecah = ''] = mentah.replace(/[^\d,-]/g, '').split(',')
  const nBulat = bulat === '' || bulat === '-' ? bulat : Number(bulat).toLocaleString('id-ID')
  const baru = koma && props.desimal > 0 ? `${nBulat},${pecah.slice(0, props.desimal)}` : nBulat
  teks.value = baru
  el.value = baru
  // Kembalikan kursor
  let i = 0, d = 0
  while (i < baru.length && d < digitKiri) { if (/[\d,]/.test(baru[i])) d++; i++ }
  try { el.setSelectionRange(i, i) } catch { /* sebagian peramban tidak mendukung */ }
  emit('update:modelValue', urai(baru))
}
</script>

<template>
  <input type="text" inputmode="decimal" autocomplete="off" :value="teks" class="angka" @input="ketik" @blur="teks = fmt(urai(teks))" />
</template>
