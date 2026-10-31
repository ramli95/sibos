<script setup>
import { useRoute } from 'vue-router'
import Ikon from '@/components/Ikon.vue'
const route = useRoute()
</script>

<template>
  <div class="kartu flex flex-col items-center px-6 py-16 text-center">
    <span class="grid h-16 w-16 place-items-center rounded-2xl ikon-chip">
      <Ikon :nama="route.meta.ikon || 'Construction'" :ukuran="30" />
    </span>
    <h2 class="mt-5 text-xl font-bold">{{ route.meta.judul }}</h2>
    <p class="mt-2 max-w-md text-slate-500 dark:text-slate-400">Halaman ini sedang dibangun sebagai bagian dari Fase 1 — Fondasi.</p>
    <span class="lencana mt-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Ikon nama="Construction" :ukuran="13" /> Dalam pengerjaan</span>
  </div>
</template>
