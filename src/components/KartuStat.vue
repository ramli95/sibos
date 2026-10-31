<script setup>
// Kartu statistik bergradien: ikon kaca, angka besar, keterangan, dan bilah persentase opsional.
import Ikon from './Ikon.vue'

const props = defineProps({
  judul: String,
  nilai: [Number, String],
  ikon: String,
  warna: { type: String, default: 'from-blue-500 to-indigo-600' },
  bayangan: { type: String, default: 'shadow-blue-500/25' },
  sub: String,
  persen: Number, // 0–100, menampilkan bilah kemajuan
  aktif: Boolean,
  memuat: Boolean,
  bisaKlik: { type: Boolean, default: true },
})
const emit = defineEmits(['klik'])
</script>

<template>
  <component :is="props.bisaKlik ? 'button' : 'div'" :type="props.bisaKlik ? 'button' : null" @click="props.bisaKlik && emit('klik')"
             :class="['group relative isolate flex min-h-[136px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-left text-white shadow-lg transition duration-200',
                      props.warna, props.bayangan,
                      props.bisaKlik && 'hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none',
                      props.aktif ? 'ring-[3px] ring-white/90 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#0E131D]' : '']">
    <!-- hiasan -->
    <span class="pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full bg-white/15 transition group-hover:scale-110" />
    <span class="pointer-events-none absolute -bottom-12 right-10 -z-10 h-28 w-28 rounded-full bg-white/10" />
    <span class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,.22),transparent_55%)]" />

    <div class="flex items-start justify-between gap-3">
      <p class="text-[13px] font-semibold uppercase tracking-wide text-white/90">{{ props.judul }}</p>
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
        <Ikon :nama="props.ikon" :ukuran="21" />
      </span>
    </div>
    <p class="angka mt-auto text-[2.4rem] font-extrabold leading-none tracking-tight drop-shadow-sm">
      <span v-if="props.memuat" class="inline-block h-9 w-14 animate-pulse rounded-lg bg-white/25 align-middle" />
      <template v-else>{{ props.nilai }}</template>
    </p>
    <p v-if="props.sub" class="mt-1.5 text-xs font-medium text-white/80">{{ props.sub }}</p>
    <div v-if="props.persen != null" class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25">
      <div class="h-full rounded-full bg-white/90 transition-all duration-500" :style="{ width: Math.min(100, Math.max(0, props.persen)) + '%' }" />
    </div>
  </component>
</template>
