<script setup>
import { ref, computed } from 'vue'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { bangunPohon, ringkasan } from '@/utils/rkasPohon'
import { KATEGORI } from '@/utils/arkas'
import { rupiah, rupiahRingkas, persen } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import CetakRkas from './CetakRkas.vue'
import { eksporRkas } from './eksporRkas'

const rkas = useRkas()
const notif = useNotifikasi()
const tahap = ref(new Date().getMonth() < 6 ? 1 : 2)
const r = computed(() => ringkasan(rkas.uraian))
const nilai = (x) => (tahap.value === 1 ? x.tahap1 : x.tahap2)
const pohon = computed(() => bangunPohon(rkas.uraian, rkas.nama, { saring: (u) => nilai(u) > 0 }))
const kegiatan = computed(() => pohon.value.flatMap((s) => s.anak.flatMap((c) => c.anak.map((g) => ({ ...g, uraian: g.anak.flatMap((x) => x.uraian) })))))
const perKategori = computed(() => Object.keys(KATEGORI).map((k) => ({ k, ...KATEGORI[k], nilai: rkas.uraian.filter((u) => u.kategori === k).reduce((s, u) => s + nilai(u), 0) })))
const total = computed(() => (tahap.value === 1 ? r.value.tahap1 : r.value.tahap2))
const cetak = ref(null)
async function ekspor() { try { await eksporRkas(rkas, { tahap: tahap.value }) } catch (e) { notif.kabari(e.message, 'galat') } }
const TAHAP = [
  { n: 1, judul: 'Tahap I', periode: 'Januari – Juni', ikon: 'Flag', warna: 'from-biru to-blue-700', bayangan: 'shadow-biru/20' },
  { n: 2, judul: 'Tahap II', periode: 'Juli – Desember', ikon: 'Target', warna: 'from-navy to-navy-tua', bayangan: 'shadow-navy/25' },
]
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <button v-for="t in TAHAP" :key="t.n" type="button" @click="tahap = t.n" :aria-pressed="tahap === t.n"
              :class="['relative isolate overflow-hidden rounded-2xl bg-gradient-to-br p-4 sm:p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5', t.warna, t.bayangan, tahap === t.n ? 'ring-[3px] ring-white/90 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#0E131D]' : 'opacity-80']">
        <span class="pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full bg-white/15" />
        <div class="flex items-center justify-between">
          <p class="text-sm font-bold uppercase tracking-wide">{{ t.judul }} <span class="font-medium normal-case text-white/80">· {{ t.periode }}</span></p>
          <span class="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30"><Ikon :nama="t.ikon" :ukuran="19" /></span>
        </div>
        <p class="angka mt-3 text-2xl font-extrabold sm:text-3xl">{{ rupiah(t.n === 1 ? r.tahap1 : r.tahap2) }}</p>
        <p class="mt-1 text-xs text-white/85">{{ persen(((t.n === 1 ? r.tahap1 : r.tahap2) / (r.jumlah || 1)) * 100) }} dari total RKAS</p>
        <div class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25"><div class="h-full rounded-full bg-white/90" :style="{ width: ((t.n === 1 ? r.tahap1 : r.tahap2) / (r.jumlah || 1)) * 100 + '%' }" /></div>
      </button>
    </div>

    <div class="kartu flex flex-wrap items-center gap-3 p-4">
      <div class="flex flex-1 flex-wrap gap-2">
        <span v-for="c in perKategori" :key="c.k" class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
          <span :class="['grid h-7 w-7 place-items-center rounded-lg ikon-chip']"><Ikon :nama="c.ikon" :ukuran="14" /></span>
          <span class="text-slate-600 dark:text-slate-300">{{ c.nama }}</span><b class="angka">{{ rupiahRingkas(c.nilai) }}</b>
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tombol-garis" @click="cetak = { mode: 'tahap', tahap }"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> Cetak Tahap {{ tahap === 1 ? 'I' : 'II' }}</button>
        <button class="tombol-garis" @click="cetak = { mode: 'tahap' }"><Ikon nama="Layers" :ukuran="17" class="text-biru" /> Tahap I & II</button>
        <button class="tombol-garis" @click="ekspor"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> Excel</button>
      </div>
    </div>

    <div class="kartu overflow-x-auto">
      <table class="w-full min-w-[640px] text-sm">
        <thead>
          <tr class="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
            <th class="px-4 py-2.5">Kode</th><th class="px-2 py-2.5">Kegiatan</th><th class="px-2 py-2.5 text-right">Uraian</th>
            <th class="px-2 py-2.5 text-right">Tahap {{ tahap === 1 ? 'I' : 'II' }}</th><th class="w-40 px-4 py-2.5">Porsi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in kegiatan" :key="g.kode" class="border-t border-slate-100 dark:border-slate-800">
            <td class="kode px-4 py-2 text-xs text-slate-500">{{ g.kode }}</td>
            <td class="px-2 py-2">{{ g.nama }}</td>
            <td class="angka px-2 py-2 text-right text-slate-500">{{ g.uraian.length }}</td>
            <td class="angka px-2 py-2 text-right font-semibold">{{ rupiah(nilai(g)) }}</td>
            <td class="px-4 py-2"><div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" style="background: var(--viz-rencana)" :style="{ width: (nilai(g) / (total || 1)) * 100 + '%' }" /></div></td>
          </tr>
          <tr class="border-t-2 border-slate-300 font-bold dark:border-slate-600"><td colspan="3" class="px-4 py-2.5">Jumlah Tahap {{ tahap === 1 ? 'I' : 'II' }}</td><td class="angka px-2 text-right">{{ rupiah(total) }}</td><td /></tr>
        </tbody>
      </table>
    </div>

    <CetakRkas v-if="cetak" v-bind="cetak" @tutup="cetak = null" @excel="ekspor" />
  </div>
</template>
