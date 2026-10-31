<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_PAJAK } from '@/config/pajak'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import TabTerutang from './TabTerutang.vue'
import TabBukuPajak from './TabBukuPajak.vue'
import TabPenerima from './TabPenerima.vue'
import TabAturan from './TabAturan.vue'

const route = useRoute()
const router = useRouter()
const kas = useKas()
const belanja = useBelanja()
const aktif = computed(() => route.params.tab || 'terutang')
onMounted(() => kas.muat())
const tahunPilihan = computed(() => { const t = new Date().getFullYear(); return [t - 1, t, t + 1] })
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-kuning"><Ikon nama="ReceiptText" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Pajak</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">Tahun Anggaran {{ belanja.tahun }}</h1>
        <p class="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="TriangleAlert" :ukuran="13" :class="kas.totalTerutang ? 'text-amber-500' : 'text-emerald-500'" /> Belum disetor <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(kas.totalTerutang) }}</b></span>
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="Landmark" :ukuran="13" class="text-[#22A08D]" /> {{ kas.setoran.length }} setoran</span>
        </p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <label class="sr-only" for="tahun-pajak">Tahun anggaran</label>
        <select id="tahun-pajak" class="masukan flex-1 py-2 sm:w-auto sm:flex-none" :value="belanja.tahun" @change="kas.muat({ tahun: Number($event.target.value) })">
          <option v-for="t in tahunPilihan" :key="t" :value="t">TA {{ t }}</option>
        </select>
        <button class="tombol-garis" :disabled="kas.memuat" aria-label="Muat ulang" @click="kas.segarkan()"><Ikon nama="RefreshCw" :ukuran="17" :class="['text-biru', kas.memuat && 'animate-spin']" /></button>
      </div>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian pajak">
      <button v-for="t in TAB_PAJAK" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/pajak/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <div v-if="kas.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ kas.galat }}</div>
    <TabBukuPajak v-else-if="aktif === 'buku'" />
    <TabPenerima v-else-if="aktif === 'penerima'" />
    <TabAturan v-else-if="aktif === 'aturan'" />
    <TabTerutang v-else />
  </div>
</template>
