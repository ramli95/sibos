<script setup>
// Papan Informasi Dana BOSP (Fase 7): poster papan pengumuman (F4), ringkasan untuk Komite,
// dan tautan publik tanpa login (khusus Bendahara yang menerbitkan).
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_INFORMASI } from '@/config/menu'
import { PERIODE_INFO } from '@/utils/informasi'
import { useAuth } from '@/stores/auth'
import { useKas } from '@/stores/kas'
import { useRkas } from '@/stores/rkas'
import Ikon from '@/components/Ikon.vue'
import PilihTahun from '@/components/PilihTahun.vue'
import PitaArsip from '@/components/PitaArsip.vue'
import TabPoster from './TabPoster.vue'
import TabKomite from './TabKomite.vue'
import TabPublik from './TabPublik.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const kas = useKas()
const rkas = useRkas()
const tab = computed(() => TAB_INFORMASI.filter((t) => !t.peran || auth.punyaPeran(...t.peran)))
const aktif = computed(() => (tab.value.some((t) => t.kunci === route.params.tab) ? route.params.tab : 'komite'))
const memuat = computed(() => kas.memuat || rkas.memuat)

// Periode bawaan: Tahap I sampai Juni, Tahap II sesudahnya
const periode = ref(new Date().getMonth() < 6 ? 'tahap1' : 'tahap2')

async function muat(tahun) {
  await kas.muat(tahun ? { tahun } : {})
  if (rkas.tahun !== kas.tahun) await rkas.gantiTahun(kas.tahun)
  else await rkas.muat()
}
const segarkan = async () => { await Promise.all([kas.segarkan(), rkas.muat({ segar: true })]) }
onMounted(() => muat())
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5" data-tur="info-kepala">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-kuning"><Ikon nama="Megaphone" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#B7820A] dark:text-amber-300">Transparansi Dana BOSP</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">Papan Informasi TA {{ kas.tahun }}</h1>
        <p class="text-xs text-slate-500">Prinsip transparan — Permendikdasmen 8/2026 Pasal 2 huruf e</p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <PilihTahun id="tahun-informasi" :model-value="kas.tahun" @update:model-value="muat($event)" />
        <button class="tombol-garis" :disabled="memuat" aria-label="Muat ulang" @click="segarkan"><Ikon nama="RefreshCw" :ukuran="17" :class="['text-biru', memuat && 'animate-spin']" /></button>
      </div>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian papan informasi">
      <button v-for="t in tab" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/informasi/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <!-- Periode -->
    <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Periode" data-tur="info-periode">
      <button v-for="p in PERIODE_INFO" :key="p.kunci" role="radio" :aria-checked="periode === p.kunci" @click="periode = p.kunci"
              :class="['flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition', periode === p.kunci ? 'border-[#22A08D] bg-[#22A08D]/10 text-[#167A6B] dark:text-teal-300' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300']">
        <Ikon :nama="p.ikon" :ukuran="16" /> {{ p.judul }} <span class="hidden font-normal text-slate-500 sm:inline">· {{ p.ket }}</span>
      </button>
    </div>

    <PitaArsip :tahun="kas.tahun" />
    <div v-if="kas.galat || rkas.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ kas.galat || rkas.galat }}</div>
    <TabPoster v-else-if="aktif === 'poster'" :periode="periode" />
    <TabPublik v-else-if="aktif === 'publik'" :periode="periode" />
    <TabKomite v-else :periode="periode" />
  </div>
</template>
