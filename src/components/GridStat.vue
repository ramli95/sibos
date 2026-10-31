<script setup>
// Kumpulan kartu statistik.
// HP: 2 kolom × 2 baris per halaman, digeser ke samping dengan titik penanda (hemat ruang).
// Tablet/desktop: grid biasa.
import { ref, computed } from 'vue'
import KartuStat from './KartuStat.vue'

const props = defineProps({
  daftar: { type: Array, default: () => [] },
  memuat: Boolean,
  ringkas: Boolean,
  bisaKlik: { type: Boolean, default: true },
  aktif: { type: Function, default: () => false },
  kolom: { type: String, default: 'sm:grid-cols-2 xl:grid-cols-4' },
})
const emit = defineEmits(['klik'])

// Kartu bernada "primer" diberi warna ciri ARKAS bergiliran (biru → tosca → kuning) agar bervariasi
// tanpa terlalu ramai; nada status (sukses/peringatan/bahaya) dan "gelap" tidak diubah.
const GILIR = ['primer', 'tosca', 'kuning']
const kartu = computed(() => {
  let n = 0
  return props.daftar.map((k) => ((k.nada || 'primer') === 'primer' ? { ...k, nada: GILIR[n++ % GILIR.length] } : k))
})
const halaman = computed(() => {
  const h = []
  for (let i = 0; i < kartu.value.length; i += 4) h.push(kartu.value.slice(i, i + 4))
  return h
})
const gulir = ref(null)
const ke = ref(0)
const geser = () => { const el = gulir.value; if (el) ke.value = Math.round(el.scrollLeft / el.clientWidth) }
const lompat = (i) => gulir.value?.scrollTo({ left: i * gulir.value.clientWidth, behavior: 'smooth' })
</script>

<template>
  <div>
    <div ref="gulir" @scroll.passive="geser"
         :class="['tanpa-penggulir flex snap-x snap-mandatory gap-3 overflow-x-auto sm:grid sm:gap-4 sm:overflow-visible', props.kolom]">
      <div v-for="(hal, i) in halaman" :key="i" class="grid w-full shrink-0 snap-start grid-cols-2 gap-3 sm:contents">
        <KartuStat v-for="k in hal" :key="k.judul" v-bind="k" :memuat="props.memuat" :ringkas="k.ringkas ?? props.ringkas"
                   :bisa-klik="k.bisaKlik ?? props.bisaKlik" :aktif="props.aktif(k)" @klik="emit('klik', k)" />
      </div>
    </div>
    <div v-if="halaman.length > 1" class="mt-2.5 flex justify-center gap-1.5 sm:hidden">
      <button v-for="(h, i) in halaman" :key="i" type="button" :aria-label="`Halaman kartu ${i + 1}`" @click="lompat(i)"
              :class="['h-2 rounded-full transition-all', ke === i ? 'w-5 bg-biru' : 'w-2 bg-slate-300 dark:bg-slate-600']" />
    </div>
  </div>
</template>
