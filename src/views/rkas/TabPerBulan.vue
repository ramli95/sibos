<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { bangunPohon, ringkasan } from '@/utils/rkasPohon'
import { rupiah, rupiahRingkas, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import CetakRkas from './CetakRkas.vue'
import { eksporRkas } from './eksporRkas'

const rkas = useRkas()
const router = useRouter()
const notif = useNotifikasi()
const kini = new Date()
const bulan = ref(kini.getFullYear() === rkas.tahun ? kini.getMonth() + 1 : 1)
const r = computed(() => ringkasan(rkas.uraian))
const maks = computed(() => Math.max(1, ...r.value.bulan))
const pohon = computed(() => bangunPohon(rkas.uraian, rkas.nama, { saring: (u) => (u.bulan?.[bulan.value - 1] || 0) > 0 }))
const kegiatan = computed(() => pohon.value.flatMap((s) => s.anak.flatMap((c) => c.anak.map((g) => ({ ...g, snp: s, uraian: g.anak.flatMap((x) => x.uraian) })))))
const totalBulan = computed(() => r.value.bulan[bulan.value - 1])
const jumlahItem = computed(() => kegiatan.value.reduce((s, g) => s + g.uraian.length, 0))
const cetak = ref(null)
async function ekspor(b = bulan.value) { try { await eksporRkas(rkas, { bulan: b }) } catch (e) { notif.kabari(e.message, 'galat') } }
const WARNA = ['from-sky-400 to-blue-600', 'from-violet-400 to-purple-600', 'from-pink-400 to-rose-600', 'from-amber-400 to-orange-600', 'from-lime-400 to-green-600', 'from-teal-400 to-cyan-600']
</script>

<template>
  <div class="space-y-4">
    <div v-if="!r.adaBulanan" class="kartu flex flex-col items-center gap-3 p-8 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow"><Ikon nama="CalendarRange" :ukuran="26" /></span>
      <p class="font-bold">Rencana per bulan belum ada untuk versi ini</p>
      <p class="max-w-lg text-sm text-slate-500">Kertas Kerja per Tahap dari ARKAS hanya memuat Tahap I dan II. Impor <b>Rincian Kertas Kerja Perbulan</b> (PDF dari ARKAS) untuk mengisi rencana setiap bulan.</p>
      <button class="tombol-utama" @click="router.replace('/rkas/versi')"><Ikon nama="FileUp" :ukuran="17" /> Impor rincian per bulan</button>
    </div>

    <template v-else>
      <!-- Pilihan bulan: kartu kecil dengan batang mini -->
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        <button v-for="(v, i) in r.bulan" :key="i" type="button" @click="bulan = i + 1" :aria-pressed="bulan === i + 1"
                :class="['relative overflow-hidden rounded-2xl border p-3 text-left transition',
                         bulan === i + 1 ? 'border-transparent bg-gradient-to-br text-white shadow-lg ' + WARNA[i % 6] : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow dark:border-slate-700 dark:bg-[#161D2B]']">
          <p class="text-xs font-bold uppercase tracking-wide">{{ NAMA_BULAN[i].slice(0, 3) }}</p>
          <p class="angka mt-1 text-sm font-extrabold">{{ rupiahRingkas(v).replace('Rp ', '') }}</p>
          <div :class="['mt-2 h-1.5 rounded-full', bulan === i + 1 ? 'bg-white/30' : 'bg-slate-100 dark:bg-slate-800']">
            <div :class="['h-full rounded-full', bulan === i + 1 ? 'bg-white' : 'bg-teal-500']" :style="{ width: (v / maks) * 100 + '%' }" />
          </div>
          <span :class="['absolute right-2 top-2 text-[10px] font-semibold', bulan === i + 1 ? 'text-white/80' : 'text-slate-400']">T{{ i < 6 ? 'I' : 'II' }}</span>
        </button>
      </div>

      <div class="kartu flex flex-wrap items-center gap-3 p-4">
        <span class="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow" :class="WARNA[(bulan - 1) % 6]"><Ikon nama="CalendarDays" :ukuran="20" /></span>
        <div class="min-w-0 flex-1">
          <p class="font-bold">{{ NAMA_BULAN[bulan - 1] }} {{ rkas.tahun }}</p>
          <p class="text-xs text-slate-500">{{ kegiatan.length }} kegiatan · {{ jumlahItem }} uraian · Tahap {{ bulan <= 6 ? 'I' : 'II' }}</p>
        </div>
        <p class="angka text-xl font-extrabold">{{ rupiah(totalBulan) }}</p>
        <div class="flex w-full flex-wrap gap-2 sm:w-auto">
          <button class="tombol-garis" @click="cetak = { mode: 'bulan', bulan }"><Ikon nama="Printer" :ukuran="17" class="text-merah" /> Cetak bulan ini</button>
          <button class="tombol-garis" @click="cetak = { mode: 'rekap' }"><Ikon nama="Table2" :ukuran="17" class="text-ungu" /> Rekap 12 bulan</button>
          <button class="tombol-garis" @click="ekspor()"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> Excel</button>
        </div>
      </div>

      <div v-if="!kegiatan.length" class="kartu p-8 text-center text-sm text-slate-500"><Ikon nama="Info" class="inline" /> Tidak ada rencana belanja pada bulan ini.</div>
      <div v-for="g in kegiatan" :key="g.kode" class="kartu overflow-hidden">
        <div class="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
          <Ikon nama="FolderTree" :ukuran="17" class="mt-0.5 text-amber-500" />
          <p class="min-w-0 flex-1 text-sm font-semibold leading-snug"><span class="kode mr-1.5 text-xs text-slate-500">{{ g.kode }}</span>{{ g.nama }}</p>
          <p class="angka text-sm font-bold">{{ rupiah(g.bulan[bulan - 1]) }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-sm">
            <tbody>
              <tr v-for="u in g.uraian" :key="u.id" class="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td class="px-4 py-2">{{ u.uraian }}<span class="kode ml-2 text-[11px] text-slate-400">{{ u.kode_rekening }}</span></td>
                <td class="angka w-24 px-2 py-2 text-right">{{ (u.bulan[bulan - 1] / (u.harga || 1)).toLocaleString('id-ID', { maximumFractionDigits: 2 }) }}</td>
                <td class="w-32 px-2 py-2 text-slate-600 dark:text-slate-300">{{ u.satuan }}</td>
                <td class="angka w-28 px-2 py-2 text-right">{{ rupiah(u.harga, { tanpaRp: true }) }}</td>
                <td class="angka w-32 px-4 py-2 text-right font-semibold">{{ rupiah(u.bulan[bulan - 1], { tanpaRp: true }) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <CetakRkas v-if="cetak" v-bind="cetak" @tutup="cetak = null" @excel="ekspor(cetak.mode === 'bulan' ? cetak.bulan : 0)" />
  </div>
</template>
