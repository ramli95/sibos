<script setup>
// Ringkasan untuk Komite Sekolah: dana tersedia, digunakan, sisa; capaian per komponen; proporsi Juknis;
// belanja terbaru. Hanya angka ringkasan — tanpa data pribadi penerima.
import { computed } from 'vue'
import { pakaiInformasi } from './pakaiInformasi'
import { belanjaTerbaru } from '@/utils/informasi'
import { proporsiJuknis } from '@/utils/rkasPohon'
import { rupiah, rupiahRingkas, persen, tanggalPendek } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'

const props = defineProps({ periode: { type: String, required: true } })
const { kas, belanja, rkas, r, kepsek } = pakaiInformasi(() => props.periode)

const statistik = computed(() => [
  { judul: 'Dana tersedia', nilai: rupiahRingkas(r.value.danaTersedia), sub: rupiah(r.value.danaTersedia), ikon: 'PiggyBank', nada: 'gelap' },
  { judul: 'Dana digunakan', nilai: rupiahRingkas(r.value.realisasi), sub: `${persen(r.value.persen, 1)} dari dana tersedia`, ikon: 'ShoppingCart', nada: 'primer', persen: r.value.persen },
  { judul: 'Sisa dana', nilai: rupiahRingkas(r.value.sisa), sub: rupiah(r.value.sisa), ikon: 'Landmark', nada: 'primer' },
  { judul: 'Pagu RKAS setahun', nilai: rupiahRingkas(r.value.pagu), sub: rkas.versiBerlaku?.nama || 'RKAS belum diimpor', ikon: 'ClipboardList', nada: 'primer' },
])
const komponen = computed(() => r.value.komponen.filter((g) => g.anggaran || g.realisasi))
const proporsi = computed(() => proporsiJuknis(rkas.uraian, rkas.versiBerlaku?.pagu || r.value.pagu))
const terbaru = computed(() => belanjaTerbaru(belanja.daftar, props.periode))
const lebar = (p) => `${Math.max(0, Math.min(100, p))}%`
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" ringkas />

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <!-- Per komponen -->
      <section class="kartu p-4 sm:p-5" data-tur="komite-komponen">
        <div class="mb-3 flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Grid3x3" :ukuran="19" /></span>
          <div><h2 class="font-bold">Capaian per komponen</h2><p class="text-xs text-slate-500">Rencana {{ r.periode.judul }} vs realisasi (lunas)</p></div>
        </div>
        <p v-if="!komponen.length" class="py-6 text-center text-sm text-slate-500">Belum ada data RKAS untuk periode ini.</p>
        <ul class="space-y-3">
          <li v-for="g in komponen" :key="g.kode">
            <div class="flex items-center gap-2 text-sm">
              <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold uppercase text-white" :style="{ background: g.warna }">{{ g.huruf }}</span>
              <span class="min-w-0 flex-1 truncate font-semibold">{{ g.nama }}</span>
              <span class="angka text-xs text-slate-500">{{ g.anggaran ? persen(g.persen, 0) : '—' }}</span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: lebar(g.persen), background: g.warna }" /></div>
            <p class="mt-1 text-xs text-slate-500"><span class="angka">{{ rupiah(g.realisasi) }}</span> dari <span class="angka">{{ rupiah(g.anggaran) }}</span></p>
          </li>
        </ul>
      </section>

      <div class="space-y-5">
        <!-- Proporsi Juknis -->
        <section class="kartu p-4 sm:p-5">
          <div class="mb-3 flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="Scale" :ukuran="19" /></span>
            <div><h2 class="font-bold">Proporsi Juknis</h2><p class="text-xs text-slate-500">Dari RKAS setahun · Pasal 42</p></div>
          </div>
          <div v-for="p in proporsi" :key="p.kunci" :class="['mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm', p.aman ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200']">
            <Ikon :nama="p.ikon" :ukuran="16" /> <span class="flex-1">{{ p.judul }}</span>
            <b class="angka">{{ persen(p.persen) }}</b><span class="text-xs opacity-75">{{ p.jenis === 'min' ? '≥' : '≤' }}{{ p.batas }}%</span>
          </div>
        </section>

        <!-- Belanja terbaru -->
        <section class="kartu p-4 sm:p-5" data-tur="komite-belanja">
          <div class="mb-3 flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="ShoppingBag" :ukuran="19" /></span>
            <div><h2 class="font-bold">Belanja terbaru</h2><p class="text-xs text-slate-500">{{ r.periode.judul }} · sudah lunas</p></div>
          </div>
          <p v-if="!terbaru.length" class="py-4 text-center text-sm text-slate-500">Belum ada belanja lunas.</p>
          <ul class="divide-y divide-slate-100 dark:divide-slate-800">
            <li v-for="b in terbaru" :key="b.id" class="flex items-center gap-3 py-2.5">
              <Ikon :nama="b.honor ? 'HandCoins' : b.siplah ? 'ShoppingBag' : 'ShoppingCart'" :ukuran="16" :class="b.honor ? 'text-rose-500' : b.siplah ? 'text-[#22A08D]' : 'text-biru'" />
              <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">{{ b.pekerjaan }}</p><p class="text-xs text-slate-500">{{ tanggalPendek(b.tanggal) }}</p></div>
              <span class="angka text-sm font-bold">{{ rupiahRingkas(b.nilai) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <p class="flex items-start gap-2 text-xs text-slate-500"><Ikon nama="Info" :ukuran="14" class="mt-0.5 shrink-0" />
      Penanggung jawab: Kepala Sekolah {{ kepsek ? kepsek.nama + (kepsek.gelar ? ', ' + kepsek.gelar : '') : '' }} — pertanyaan dan masukan Komite disampaikan kepada Kepala Sekolah atau Bendahara.</p>
  </div>
</template>
