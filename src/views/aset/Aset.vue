<script setup>
// Menu Barang & Aset (Fase 5): barang dari belanja, KIB & Buku Inventaris, ruangan & KIR, BAST ke Pengurus Barang,
// Buku Persediaan, dan Referensi Barang Modal ARKAS.
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_ASET } from '@/config/aset'
import { useAset } from '@/stores/aset'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import PilihTahun from '@/components/PilihTahun.vue'
import PitaArsip from '@/components/PitaArsip.vue'
import TabKlasifikasi from './TabKlasifikasi.vue'
import TabInventaris from './TabInventaris.vue'
import TabRuang from './TabRuang.vue'
import TabBast from './TabBast.vue'
import TabPersediaan from './TabPersediaan.vue'
import TabRefBarang from './TabRefBarang.vue'

const route = useRoute()
const router = useRouter()
const aset = useAset()
const aktif = computed(() => route.params.tab || 'klasifikasi')
onMounted(() => aset.muat())
const nilaiAset = computed(() => aset.aktif.reduce((s, a) => s + (a.nilai || 0), 0))
const belumDicatat = computed(() => aset.barang.filter((x) => (x.kelas === 'kib' || x.kelas === 'ekstra') && x.tercatat < x.volume).length)
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5" data-tur="aset-kepala">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="Boxes" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Barang & Aset</p>
        <h1 class="truncate text-lg font-extrabold sm:text-xl">Tahun Anggaran {{ aset.tahun }}</h1>
        <p class="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="Boxes" :ukuran="13" class="text-biru" /> {{ aset.aktif.length }} catatan · <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(nilaiAset) }}</b></span>
          <span class="flex items-center gap-1 whitespace-nowrap"><Ikon nama="TriangleAlert" :ukuran="13" :class="belumDicatat ? 'text-amber-500' : 'text-emerald-500'" /> {{ belumDicatat }} barang belanja belum dicatat</span>
        </p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <PilihTahun id="tahun-aset" :model-value="aset.tahun" @update:model-value="aset.muat({ tahun: $event })" />
        <button class="tombol-garis" :disabled="aset.memuat" aria-label="Muat ulang" @click="aset.segarkan()"><Ikon nama="RefreshCw" :ukuran="17" :class="['text-biru', aset.memuat && 'animate-spin']" /></button>
      </div>
    </div>

    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian barang dan aset" data-tur="aset-tab">
      <button v-for="t in TAB_ASET" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-[#22A08D] text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/barang/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <PitaArsip :tahun="aset.tahun" />

    <div v-if="aset.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ aset.galat }}</div>
    <TabInventaris v-else-if="aktif === 'inventaris'" />
    <TabRuang v-else-if="aktif === 'ruang'" />
    <TabBast v-else-if="aktif === 'bast'" />
    <TabPersediaan v-else-if="aktif === 'persediaan'" />
    <TabRefBarang v-else-if="aktif === 'referensi'" />
    <TabKlasifikasi v-else />
  </div>
</template>
