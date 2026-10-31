<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_KAS } from '@/config/pajak'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import PilihTahun from '@/components/PilihTahun.vue'
import PitaArsip from '@/components/PitaArsip.vue'
import TabBuku from './TabBuku.vue'
import TabTutup from './TabTutup.vue'
import TabKoran from './TabKoran.vue'
import TabParalel from './TabParalel.vue'
import TabMigrasi from './TabMigrasi.vue'

const route = useRoute()
const router = useRouter()
const kas = useKas()
const belanja = useBelanja()
const auth = useAuth()
const aktif = computed(() => route.params.tab || 'bku')
const tab = computed(() => TAB_KAS.filter((t) => t.kunci !== 'migrasi' || auth.isAdmin))
onMounted(() => kas.muat())
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="BookOpenText" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Buku Kas</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">Tahun Anggaran {{ belanja.tahun }}</h1>
        <p class="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="Landmark" :ukuran="13" class="text-biru" /> Bank <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(kas.saldoBank) }}</b></span>
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="Banknote" :ukuran="13" class="text-[#22A08D]" /> Tunai <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(kas.saldoTunai) }}</b></span>
        </p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <PilihTahun id="tahun-kas" :model-value="belanja.tahun" @update:model-value="kas.muat({ tahun: $event })" />
        <button class="tombol-garis" :disabled="kas.memuat" aria-label="Muat ulang" @click="kas.segarkan()"><Ikon nama="RefreshCw" :ukuran="17" :class="['text-biru', kas.memuat && 'animate-spin']" /></button>
      </div>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian buku kas">
      <button v-for="t in tab" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/buku-kas/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <PitaArsip :tahun="belanja.tahun" />

    <div v-if="kas.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ kas.galat }}</div>
    <TabTutup v-else-if="aktif === 'tutup'" />
    <TabKoran v-else-if="aktif === 'koran'" />
    <TabParalel v-else-if="aktif === 'paralel'" />
    <TabMigrasi v-else-if="aktif === 'migrasi' && auth.isAdmin" />
    <TabBuku v-else :key="aktif" :buku="['bank', 'tunai'].includes(aktif) ? aktif : 'bku'" />
  </div>
</template>
