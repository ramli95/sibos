<script setup>
// Menu Laporan (Fase 5; Fase 7: Pemda lainnya, rekap/matriks/SK Tim BOS): realisasi SNP/komponen, buku subrincian objek, rekap SIPLah, laporan Pemda bulanan, tahap & tahunan, kesiapan SPJ, ekspor SIMAKDA.
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_LAPORAN } from '@/config/laporan'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import PilihTahun from '@/components/PilihTahun.vue'
import PitaArsip from '@/components/PitaArsip.vue'
import TabRealisasi from './TabRealisasi.vue'
import TabPemda from './TabPemda.vue'
import TabTahunan from './TabTahunan.vue'
import TabKesiapan from './TabKesiapan.vue'
import TabSimakda from './TabSimakda.vue'
import TabObjek from './TabObjek.vue'
import TabSiplah from './TabSiplah.vue'
import TabPemdaLain from './TabPemdaLain.vue'
import TabRekapLain from './TabRekapLain.vue'

const route = useRoute()
const router = useRouter()
const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const aktif = computed(() => route.params.tab || 'realisasi')
const memuat = computed(() => kas.memuat || rkas.memuat || belanja.memuat)

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
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5" data-tur="laporan-kepala">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip"><Ikon nama="FileBarChart" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Laporan</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">Tahun Anggaran {{ kas.tahun }}</h1>
        <p class="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="ClipboardList" :ukuran="13" class="text-[#E3A414]" /> RKAS {{ rkas.versiBerlaku?.nama || 'belum diimpor' }}</span>
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="ShoppingCart" :ukuran="13" class="text-[#22A08D]" /> Realisasi <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(belanja.totalRealisasi) }}</b></span>
        </p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <PilihTahun id="tahun-laporan" :model-value="kas.tahun" @update:model-value="muat($event)" />
        <button class="tombol-garis" :disabled="memuat" aria-label="Muat ulang" @click="segarkan"><Ikon nama="RefreshCw" :ukuran="17" :class="['text-biru', memuat && 'animate-spin']" /></button>
      </div>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian laporan" data-tur="laporan-tab">
      <button v-for="t in TAB_LAPORAN" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/laporan/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <PitaArsip :tahun="kas.tahun" />

    <div v-if="kas.galat || rkas.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ kas.galat || rkas.galat }}</div>
    <TabPemda v-else-if="aktif === 'pemda'" />
    <TabTahunan v-else-if="aktif === 'tahunan'" />
    <TabKesiapan v-else-if="aktif === 'kesiapan'" />
    <TabSimakda v-else-if="aktif === 'simakda'" />
    <TabObjek v-else-if="aktif === 'objek'" />
    <TabSiplah v-else-if="aktif === 'siplah'" />
    <TabPemdaLain v-else-if="aktif === 'pemda-lain'" />
    <TabRekapLain v-else-if="aktif === 'rekap-lain'" />
    <TabRealisasi v-else />
  </div>
</template>
