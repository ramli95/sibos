<script setup>
// Serah Terima Bendahara (Fase 7): Berita Acara keadaan keuangan + pemindahan akun Admin SIBOS.
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_SERAH } from '@/config/menu'
import Ikon from '@/components/Ikon.vue'
import TabBeritaAcara from './TabBeritaAcara.vue'
import TabAkun from './TabAkun.vue'

const route = useRoute()
const router = useRouter()
const aktif = computed(() => (TAB_SERAH.some((t) => t.kunci === route.params.tab) ? route.params.tab : 'berita-acara'))
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-kuning"><Ikon nama="Repeat" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#B7820A] dark:text-amber-300">Paket serah terima</p>
        <h1 class="text-lg font-extrabold sm:text-xl">Serah Terima Bendahara Dana BOSP</h1>
        <p class="text-xs text-slate-500">1) Cetak & tanda tangani Berita Acara · 2) Pindahkan akun Admin SIBOS ke bendahara baru</p>
      </div>
    </div>
    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian serah terima">
      <button v-for="(t, i) in TAB_SERAH" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/serah-terima/${t.kunci}`)">
        <span :class="['grid h-5 w-5 place-items-center rounded-full text-[11px]', aktif === t.kunci ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800']">{{ i + 1 }}</span>
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>
    <TabAkun v-if="aktif === 'akun'" />
    <TabBeritaAcara v-else />
  </div>
</template>
