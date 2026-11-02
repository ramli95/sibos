<script setup>
// Kartu statistik ringkas: ikon di kiri atas, angka besar, label di bawahnya.
// Warna dibatasi pada "nada": primer & gelap (biru/navy) untuk data biasa,
// sukses / peringatan / bahaya hanya bila angkanya bermakna status.
import Ikon from './Ikon.vue'

const props = defineProps({
  judul: String,
  nilai: [Number, String],
  ikon: String,
  nada: { type: String, default: 'primer' },
  sub: String,
  persen: Number, // 0–100, menampilkan bilah kemajuan
  aktif: Boolean,
  memuat: Boolean,
  bisaKlik: { type: Boolean, default: true },
  ringkas: Boolean, // nilai panjang (rupiah): huruf lebih kecil, satu baris
})
const emit = defineEmits(['klik'])

const NADA = {
  primer: 'from-biru to-blue-700 shadow-biru/20 dark:from-blue-600 dark:to-blue-800',
  gelap: 'from-navy to-navy-tua shadow-navy/25 dark:from-[#1F3C8F] dark:to-[#15296A]',
  sukses: 'from-emerald-600 to-emerald-700 shadow-emerald-600/20',
  peringatan: 'from-amber-500 to-orange-600 shadow-amber-500/20',
  bahaya: 'from-rose-600 to-rose-700 shadow-rose-600/20',
  // Warna ciri ARKAS untuk variasi kartu data biasa
  tosca: 'from-[#22A08D] to-[#167A6C] shadow-[#22A08D]/25',
  kuning: 'from-[#E3A414] to-[#B97F0A] shadow-[#E3A414]/25',
}
</script>

<template>
  <component :is="props.bisaKlik ? 'button' : 'div'" :type="props.bisaKlik ? 'button' : null" @click="props.bisaKlik && emit('klik')"
             :class="['group relative isolate flex min-h-[124px] w-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-md transition duration-200 sm:min-h-[132px] sm:p-5',
                      NADA[props.nada] || NADA.primer,
                      props.bisaKlik && 'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none active:scale-[0.98]',
                      props.aktif ? 'ring-[3px] ring-white/90 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#0E131D]' : '']">
    <span class="pointer-events-none absolute -right-6 -top-8 -z-10 h-24 w-24 rounded-full bg-white/10 transition group-hover:scale-110" aria-hidden="true" />

    <div class="flex items-start justify-between gap-2">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 ring-1 ring-white/25">
        <Ikon :nama="props.ikon" :ukuran="19" />
      </span>
      <Ikon v-if="props.aktif" nama="Filter" :ukuran="15" class="text-white/80" />
    </div>
    <p :class="['angka mt-3 truncate font-extrabold leading-none tracking-tight', String(props.nilai ?? '').length > 13 ? 'text-base sm:text-xl' : props.ringkas ? 'whitespace-nowrap text-xl sm:text-2xl' : 'text-[1.75rem] sm:text-3xl']" :title="String(props.nilai ?? '')">
      <span v-if="props.memuat" class="inline-block h-7 w-12 animate-pulse rounded-lg bg-white/25 align-middle" />
      <template v-else>{{ props.nilai }}</template>
    </p>
    <p class="mt-1.5 text-[13px] font-semibold leading-tight text-white/95 sm:text-sm">{{ props.judul }}</p>
    <p v-if="props.sub" class="mt-0.5 truncate text-[11px] text-white/75 sm:text-xs">{{ props.sub }}</p>
    <div v-if="props.persen != null" class="mt-2 h-1 overflow-hidden rounded-full bg-white/25">
      <div class="h-full rounded-full bg-white/90 transition-all duration-500" :style="{ width: Math.min(100, Math.max(0, props.persen)) + '%' }" />
    </div>
  </component>
</template>
