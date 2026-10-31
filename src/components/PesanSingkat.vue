<script setup>
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from './Ikon.vue'

const notif = useNotifikasi()
const gaya = {
  sukses: { ikon: 'CircleCheck', kelas: 'border-hijau/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  galat: { ikon: 'TriangleAlert', kelas: 'border-merah/30 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200' },
  info: { ikon: 'Info', kelas: 'border-biru/30 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
}
</script>

<template>
  <div class="tanpa-cetak pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
    <TransitionGroup enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-for="t in notif.toast" :key="t.id" :class="['pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg', gaya[t.jenis]?.kelas]">
        <Ikon :nama="gaya[t.jenis]?.ikon || 'Info'" />
        {{ t.pesan }}
      </div>
    </TransitionGroup>
  </div>
</template>
