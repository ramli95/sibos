<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_RKAS } from '@/config/menu'
import { useRkas } from '@/stores/rkas'
import { useAuth } from '@/stores/auth'
import { JENIS_VERSI } from '@/services/rkas'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import PilihTahun from '@/components/PilihTahun.vue'
import PitaArsip from '@/components/PitaArsip.vue'
import TabRingkasan from './TabRingkasan.vue'
import TabKertasKerja from './TabKertasKerja.vue'
import TabPerBulan from './TabPerBulan.vue'
import TabPerTahap from './TabPerTahap.vue'
import TabPergeseran from './TabPergeseran.vue'
import TabVersi from './TabVersi.vue'
import TabGrafik from './TabGrafik.vue'

const route = useRoute()
const router = useRouter()
const rkas = useRkas()
const auth = useAuth()
const aktif = computed(() => route.params.tab || 'ringkasan')
const komponen = { ringkasan: TabRingkasan, 'kertas-kerja': TabKertasKerja, 'per-bulan': TabPerBulan, 'per-tahap': TabPerTahap, pergeseran: TabPergeseran, grafik: TabGrafik, versi: TabVersi }
const tab = computed(() => TAB_RKAS.find((t) => t.kunci === aktif.value) || TAB_RKAS[0])
onMounted(() => rkas.muat())
// Draf hanya dipakai di halaman RKAS: saat keluar, kembali ke versi berlaku agar belanja & laporan tidak memakai draf
onBeforeUnmount(() => { if (rkas.versi?.draf && rkas.versiBerlaku) rkas.pilihVersi(rkas.versiBerlaku.id) })

const v = computed(() => rkas.versi)
const cocokPagu = computed(() => v.value && v.value.pagu && v.value.total === v.value.pagu)
</script>

<template>
  <div class="space-y-5">
    <!-- Bilah versi -->
    <div class="kartu relative overflow-hidden p-4 sm:p-5">
            <div class="relative flex flex-wrap items-center gap-3">
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip">
          <Ikon nama="ClipboardList" :ukuran="24" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Rencana Kegiatan dan Anggaran Sekolah</p>
          <h1 class="truncate text-lg font-extrabold sm:text-xl">
            RKAS {{ rkas.tahun }}<template v-if="v"> · {{ v.nama }}</template>
          </h1>
          <p v-if="v" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span class="flex items-center gap-1"><Ikon nama="Sigma" :ukuran="13" class="text-biru" /> <b class="angka text-slate-700 dark:text-slate-200">{{ rupiah(v.total) }}</b></span>
            <span v-if="v.pagu" :class="['flex items-center gap-1 font-semibold', cocokPagu ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600']">
              <Ikon :nama="cocokPagu ? 'CircleCheck' : 'TriangleAlert'" :ukuran="13" /> {{ cocokPagu ? 'Sama dengan pagu ARKAS' : `Pagu ${rupiah(v.pagu)}` }}
            </span>
            <span class="flex items-center gap-1"><Ikon nama="ListChecks" :ukuran="13" class="text-biru" /> {{ v.jumlah_uraian }} uraian</span>
            <span v-if="v.tanggal_dokumen" class="flex items-center gap-1"><Ikon nama="CalendarDays" :ukuran="13" class="text-biru" /> {{ v.tanggal_dokumen }}</span>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <PilihTahun id="tahun-rkas" :model-value="rkas.tahun" @update:model-value="rkas.gantiTahun($event)" />
        </div>
      </div>
      <div v-if="rkas.daftarVersi.length" class="relative mt-4 flex gap-2 overflow-x-auto pb-1">
        <button v-for="x in rkas.daftarVersi" :key="x.id" type="button" @click="rkas.pilihVersi(x.id)"
                :class="['flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition',
                         x.id === rkas.idVersi ? 'border-transparent bg-biru text-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900']">
          <Ikon :nama="JENIS_VERSI[x.jenis]?.ikon || 'FileText'" :ukuran="16" />
          <span class="font-semibold">{{ x.nama }}</span>
          <span v-if="x.draf" :class="['lencana', x.id === rkas.idVersi ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300']"><Ikon nama="FilePen" :ukuran="12" /> Draf</span>
          <span v-if="x.berlaku" :class="['lencana', x.id === rkas.idVersi ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300']"><Ikon nama="BadgeCheck" :ukuran="12" /> Berlaku</span>
        </button>
      </div>
    </div>

    <!-- Tab -->
    <div class="kartu flex gap-1 overflow-x-auto p-1.5" role="tablist" aria-label="Bagian RKAS">
      <button v-for="t in TAB_RKAS" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                       aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/rkas/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <PitaArsip :tahun="rkas.tahun" />

    <div v-if="rkas.memuat && !rkas.daftarVersi.length" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat RKAS…</div>
    <div v-else-if="rkas.galat" class="kartu flex items-center gap-3 p-5 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ rkas.galat }}</div>
    <div v-else-if="!rkas.daftarVersi.length && aktif !== 'versi'" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-16 w-16 place-items-center rounded-3xl ikon-chip"><Ikon nama="FileUp" :ukuran="28" /></span>
      <p class="text-lg font-bold">RKAS {{ rkas.tahun }} belum ada</p>
      <p class="max-w-md text-sm text-slate-500">Impor Kertas Kerja RKAS per Tahap (PDF dari ARKAS). Rincian per Bulan bisa ditambahkan untuk mengisi rencana bulanan.</p>
      <button v-if="auth.isAdmin" class="tombol-utama" @click="router.replace('/rkas/versi')"><Ikon nama="FileUp" :ukuran="17" /> Impor dari ARKAS</button>
    </div>
    <component v-else :is="komponen[aktif] || TabRingkasan" :key="tab.kunci" />
  </div>
</template>
