<script setup>
// WhatsApp (Fase 7): pesan siap kirim lewat wa.me (gratis) — kelengkapan SPJ, konfirmasi transfer,
// pesan ke rekanan, pengingat KGB; template bisa diubah; riwayat pesan.
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_WA } from '@/config/menu'
import Ikon from '@/components/Ikon.vue'
import TabKirim from './TabKirim.vue'
import TabTemplate from './TabTemplate.vue'
import TabRiwayat from './TabRiwayat.vue'

const route = useRoute()
const router = useRouter()
const aktif = computed(() => (TAB_WA.some((t) => t.kunci === route.params.tab) ? route.params.tab : 'kirim'))
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="MessageCircle" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Pesan siap kirim</p>
        <h1 class="text-lg font-extrabold sm:text-xl">WhatsApp</h1>
        <p class="text-xs text-slate-500">Gratis lewat wa.me — SIBOS menyiapkan pesan, Bapak menekan Kirim di WhatsApp.</p>
      </div>
    </div>
    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian WhatsApp">
      <button v-for="t in TAB_WA" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/whatsapp/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>
    <TabTemplate v-if="aktif === 'template'" />
    <TabRiwayat v-else-if="aktif === 'riwayat'" />
    <TabKirim v-else />
  </div>
</template>
