<script setup>
// Menu Kepegawaian & Gaji (Fase 6): Daftar Gaji, Dasar Gaji Pegawai, SKPG, KGB, Impor Daftar Resmi, Tabel Gaji Pokok.
// Data gaji hanya untuk Bendahara.
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_GAJI } from '@/config/gaji'
import { useGaji } from '@/stores/gaji'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import TabDaftar from './TabDaftar.vue'
import TabDasar from './TabDasar.vue'
import TabSkpg from './TabSkpg.vue'
import TabKgb from './TabKgb.vue'
import TabImpor from './TabImpor.vue'
import TabTabel from './TabTabel.vue'

const route = useRoute()
const router = useRouter()
const gaji = useGaji()
const aktif = computed(() => route.params.tab || 'daftar')
onMounted(() => gaji.muat())
const totalBersih = computed(() => gaji.baris.reduce((s, b) => s + (b.bersih || 0), 0))
const belumLengkap = computed(() => gaji.baris.filter((b) => !b.lengkap && !gaji.terkunci).length)
const jumlahTab = (k) => (k === 'kgb' ? gaji.kgbH30.length : k === 'dasar' ? belumLengkap.value : 0)
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5" data-tur="gaji-kepala">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-kuning"><Ikon nama="Banknote" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Kepegawaian & Gaji</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">{{ gaji.pegawaiAsn.length }} ASN · {{ gaji.honorer.length }} Honorer</h1>
        <p class="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="Wallet" :ukuran="13" class="text-[#22A08D]" /> Gaji bersih bulan ini <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(totalBersih) }}</b></span>
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="BellRing" :ukuran="13" :class="gaji.kgbH30.length ? 'text-amber-500' : 'text-emerald-500'" /> {{ gaji.kgbH30.length }} KGB ≤ 30 hari</span>
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="Lock" :ukuran="13" class="text-biru" /> Hanya Bendahara</span>
        </p>
      </div>
      <button class="tombol-garis" :disabled="gaji.memuat" aria-label="Muat ulang" @click="gaji.segarkan()"><Ikon nama="RefreshCw" :ukuran="17" :class="['text-biru', gaji.memuat && 'animate-spin']" /></button>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian gaji" data-tur="gaji-tab">
      <button v-for="t in TAB_GAJI" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-[#E3A414] text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/gaji/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
        <span v-if="jumlahTab(t.kunci)" :class="['grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold', aktif === t.kunci ? 'bg-white text-[#B07F0B]' : 'bg-amber-500 text-white']">{{ jumlahTab(t.kunci) }}</span>
      </button>
    </div>

    <div v-if="gaji.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ gaji.galat }}</div>
    <div v-else-if="gaji.memuat && !gaji.pegawai.length" class="kartu flex items-center gap-3 p-8 text-sm text-slate-500"><Ikon nama="RefreshCw" class="animate-spin text-biru" /> Memuat data pegawai & gaji…</div>
    <template v-else>
      <TabDasar v-if="aktif === 'dasar'" />
      <TabSkpg v-else-if="aktif === 'skpg'" />
      <TabKgb v-else-if="aktif === 'kgb'" />
      <TabImpor v-else-if="aktif === 'impor'" />
      <TabTabel v-else-if="aktif === 'tabel'" />
      <TabDaftar v-else />
    </template>
  </div>
</template>
