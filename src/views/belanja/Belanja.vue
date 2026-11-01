<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_BELANJA } from '@/config/menu'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import PilihTahun from '@/components/PilihTahun.vue'
import PitaArsip from '@/components/PitaArsip.vue'
import TabDaftar from './TabDaftar.vue'
import TabArsip from './TabArsip.vue'
import TabMassal from './TabMassal.vue'

const route = useRoute()
const router = useRouter()
const belanja = useBelanja()
const auth = useAuth()
const aktif = computed(() => route.params.tab || 'daftar')
onMounted(() => belanja.muat())
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="ShoppingCart" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Belanja &amp; Dokumen SPJ</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">Tahun Anggaran {{ belanja.tahun }}</h1>
        <p class="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <span class="flex items-center gap-1"><Ikon nama="BadgeCheck" :ukuran="13" class="text-emerald-500" /> Realisasi <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(belanja.totalRealisasi) }}</b></span>
          <span class="flex items-center gap-1"><Ikon nama="ListChecks" :ukuran="13" class="text-biru" /> {{ belanja.daftar.length }} transaksi</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <PilihTahun id="tahun-belanja" :model-value="belanja.tahun" @update:model-value="belanja.muat({ tahun: $event })" />
        <template v-if="auth.isAdmin">
          <RouterLink to="/belanja/honor/baru" class="tombol-garis"><Ikon nama="Wallet" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Honor/Transpor</span><span class="sm:hidden">Honor</span></RouterLink>
          <RouterLink to="/belanja/baru" class="tombol-utama"><Ikon nama="CirclePlus" :ukuran="17" /> Belanja Baru</RouterLink>
        </template>
      </div>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian belanja">
      <button v-for="t in TAB_BELANJA" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                       aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/belanja/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <PitaArsip :tahun="belanja.tahun" />

    <div v-if="belanja.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ belanja.galat }}</div>
    <TabArsip v-else-if="aktif === 'arsip'" />
    <TabMassal v-else-if="aktif === 'massal'" />
    <TabDaftar v-else :key="aktif" :jenis="aktif === 'honor' ? 'honor' : 'pengadaan'" />
  </div>
</template>
