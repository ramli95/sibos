<script setup>
// Kas Lain & Iuran (di luar Dana BOSP): Arisan, Dana Sosial, Zakat Profesi, Potongan Sertifikasi, Komite, dll.
// Tagihan per orang, setoran + kwitansi, daftar setoran per orang, buku kas per pos, utang piutang, laporan.
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_KAS_LAIN } from '@/config/menu'
import { useNotifikasi } from '@/stores/notifikasi'
import { pakaiKasLain } from './pakaiKasLain'
import Ikon from '@/components/Ikon.vue'
import TabRingkasan from './TabRingkasan.vue'
import TabTagihan from './TabTagihan.vue'
import TabPerOrang from './TabPerOrang.vue'
import TabPos from './TabPos.vue'
import TabUtang from './TabUtang.vue'
import TabLaporan from './TabLaporan.vue'

const route = useRoute()
const router = useRouter()
const notif = useNotifikasi()
const kl = pakaiKasLain()
const aktif = computed(() => (TAB_KAS_LAIN.some((t) => t.kunci === route.params.tab) ? route.params.tab : 'ringkasan'))
const KOMPONEN = { ringkasan: TabRingkasan, tagihan: TabTagihan, 'per-orang': TabPerOrang, pos: TabPos, utang: TabUtang, laporan: TabLaporan }
onMounted(() => kl.muat().catch((e) => notif.kabari(e.code === 'permission-denied' ? 'Ditolak: perbarui Firestore Rules (Kas Lain) terlebih dahulu.' : e.message, 'galat')))
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-kuning"><Ikon nama="Vault" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#9A6B00] dark:text-amber-300">Kas lain & iuran · di luar Dana BOSP</p>
        <h1 class="text-lg font-extrabold sm:text-xl">{{ TAB_KAS_LAIN.find((t) => t.kunci === aktif)?.judul }}</h1>
      </div>
      <button class="tombol-garis" :disabled="kl.memuat.value" aria-label="Muat ulang" @click="kl.muat({ segar: true })">
        <Ikon nama="RefreshCw" :ukuran="16" :class="['text-biru', kl.memuat.value && 'animate-spin']" /> <span class="hidden sm:inline">Muat ulang</span>
      </button>
    </div>
    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian kas lain">
      <button v-for="t in TAB_KAS_LAIN" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci" :data-tur="`kaslain-tab-${t.kunci}`"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/kas-lain/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>
    <div v-if="kl.memuat.value && !kl.pos.value.length" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
    <component :is="KOMPONEN[aktif]" v-else />
  </div>
</template>
