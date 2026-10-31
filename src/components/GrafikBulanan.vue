<script setup>
// Grafik batang rencana vs realisasi per bulan (Januari–Desember), dengan petunjuk saat disentuh/diarahkan.
import { ref, computed } from 'vue'
import { rupiah, rupiahRingkas } from '@/utils/format'

const props = defineProps({
  rencana: { type: Array, default: () => Array(12).fill(0) },
  realisasi: { type: Array, default: null }, // null = belum ada data realisasi
  tinggi: { type: Number, default: 260 },
})
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const L = 720, KIRI = 58, KANAN = 8, ATAS = 14, BAWAH = 28
const lebarPlot = L - KIRI - KANAN
const tinggiPlot = computed(() => props.tinggi - ATAS - BAWAH)
const maks = computed(() => {
  const m = Math.max(1, ...props.rencana, ...(props.realisasi || []))
  const p = 10 ** Math.floor(Math.log10(m))
  return Math.ceil(m / p / 2) * 2 * p
})
const garis = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: ATAS + tinggiPlot.value * (1 - f), nilai: maks.value * f })))
const slot = lebarPlot / 12
const dua = computed(() => !!props.realisasi)
const lebarBatang = computed(() => Math.min(dua.value ? 16 : 26, slot / (dua.value ? 2.6 : 1.6)))
const y = (v) => ATAS + tinggiPlot.value * (1 - v / maks.value)
// batang dengan ujung atas membulat 4px, dasar rata di sumbu
function jalur(x, v, w) {
  const top = y(v), dasar = ATAS + tinggiPlot.value
  if (v <= 0) return ''
  const r = Math.min(4, w / 2, dasar - top)
  return `M${x},${dasar}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${dasar}Z`
}
const aktif = ref(-1)
const tip = computed(() => aktif.value < 0 ? null : {
  bulan: NAMA[aktif.value], rencana: props.rencana[aktif.value] || 0, realisasi: props.realisasi?.[aktif.value] ?? null,
  kiri: ((KIRI + slot * aktif.value + slot / 2) / L) * 100,
})
</script>

<template>
  <div class="relative">
    <svg :viewBox="`0 0 ${L} ${props.tinggi}`" class="h-auto w-full" role="img" aria-label="Grafik rencana dan realisasi per bulan" @mouseleave="aktif = -1">
      <g>
        <template v-for="g in garis" :key="g.y">
          <line :x1="KIRI" :x2="L - KANAN" :y1="g.y" :y2="g.y" stroke="var(--viz-grid)" stroke-width="1" />
          <text :x="KIRI - 8" :y="g.y + 4" text-anchor="end" font-size="11" fill="var(--viz-teks)" class="angka">{{ rupiahRingkas(g.nilai).replace('Rp ', '') }}</text>
        </template>
      </g>
      <g v-for="(v, i) in props.rencana" :key="i">
        <rect :x="KIRI + slot * i" :y="ATAS" :width="slot" :height="tinggiPlot" :fill="aktif === i ? 'var(--viz-grid)' : 'transparent'" opacity="0.5"
              @mouseenter="aktif = i" @touchstart.passive="aktif = i" />
        <path :d="jalur(KIRI + slot * i + slot / 2 - (dua ? lebarBatang + 1 : lebarBatang / 2), v, lebarBatang)" fill="var(--viz-rencana)" pointer-events="none" />
        <path v-if="dua" :d="jalur(KIRI + slot * i + slot / 2 + 1, props.realisasi[i] || 0, lebarBatang)" fill="var(--viz-realisasi)" pointer-events="none" />
        <text :x="KIRI + slot * i + slot / 2" :y="props.tinggi - 9" text-anchor="middle" font-size="11.5" fill="var(--viz-teks)" pointer-events="none">{{ BLN[i] }}</text>
      </g>
      <line :x1="KIRI" :x2="L - KANAN" :y1="ATAS + tinggiPlot" :y2="ATAS + tinggiPlot" stroke="var(--viz-teks)" stroke-width="1" />
    </svg>
    <div v-if="tip" class="pointer-events-none absolute top-1 z-10 min-w-[11rem] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95"
         :style="{ left: Math.min(85, Math.max(15, tip.kiri)) + '%' }">
      <p class="mb-1 font-bold">{{ tip.bulan }}</p>
      <p class="flex items-center justify-between gap-3"><span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-sm" style="background: var(--viz-rencana)" /> Rencana</span><b class="angka">{{ rupiah(tip.rencana) }}</b></p>
      <p v-if="tip.realisasi != null" class="flex items-center justify-between gap-3"><span class="flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-sm" style="background: var(--viz-realisasi)" /> Realisasi</span><b class="angka">{{ rupiah(tip.realisasi) }}</b></p>
    </div>
  </div>
</template>
