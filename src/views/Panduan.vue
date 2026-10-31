<script setup>
// Panduan Input: daftar tur interaktif per menu dan alur kerja bulanan Bendahara.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { TUR, ALUR_BULANAN } from '@/config/panduan'
import { usePanduan } from '@/stores/panduan'
import { useAuth } from '@/stores/auth'
import Ikon from '@/components/Ikon.vue'

const router = useRouter()
const p = usePanduan()
const auth = useAuth()
const kelompok = computed(() => {
  const g = new Map()
  Object.entries(TUR).forEach(([k, t]) => {
    if (t.peran && !auth.punyaPeran(...t.peran)) return
    if (!g.has(t.kelompok)) g.set(t.kelompok, [])
    g.get(t.kelompok).push({ kunci: k, ...t })
  })
  return [...g.entries()]
})
const jumlah = computed(() => kelompok.value.reduce((s, [, d]) => s + d.length, 0))
const selesai = computed(() => kelompok.value.reduce((s, [, d]) => s + d.filter((t) => p.sudah(t.kunci)).length, 0))
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-4 p-5" data-tur="panduan-kepala">
      <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#F5B21B] to-[#E3A414] text-white shadow-lg shadow-amber-500/25"><Ikon nama="Compass" :ukuran="28" /></span>
      <div class="min-w-0 flex-1">
        <h1 class="text-xl font-extrabold">Panduan Input</h1>
        <p class="text-sm text-slate-500">Tur interaktif menyorot tombol dan isian langkah demi langkah. Tekan <Ikon nama="CircleHelp" :ukuran="14" class="inline text-biru" /> di bilah atas untuk memutar tur halaman yang sedang dibuka.</p>
      </div>
      <div class="text-right">
        <p class="angka text-2xl font-extrabold">{{ selesai }}/{{ jumlah }}</p>
        <p class="text-xs text-slate-500">tur sudah dilihat</p>
        <button v-if="selesai" class="mt-1 text-xs font-semibold text-biru underline" @click="p.ulangSemua()">Tawarkan lagi</button>
      </div>
    </div>

    <section v-for="[nama, daftar] in kelompok" :key="nama" class="space-y-2">
      <h2 class="px-1 text-xs font-bold uppercase tracking-wider text-slate-500">{{ nama }}</h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="t in daftar" :key="t.kunci" class="kartu flex flex-col p-4">
          <div class="flex items-start gap-3">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" :style="{ background: t.warna }"><Ikon :nama="t.ikon" :ukuran="21" /></span>
            <div class="min-w-0 flex-1">
              <p class="font-bold leading-tight">{{ t.judul }}</p>
              <p class="mt-0.5 text-xs text-slate-500">{{ t.ket }}</p>
            </div>
            <Ikon v-if="p.sudah(t.kunci)" nama="BadgeCheck" :ukuran="18" class="shrink-0 text-emerald-500" />
          </div>
          <ol class="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li v-for="(l, i) in t.langkah" :key="i" class="flex gap-2"><span class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold dark:bg-slate-800">{{ i + 1 }}</span>{{ l.judul }}</li>
          </ol>
          <div class="mt-auto pt-3"><button class="tombol-utama w-full" @click="p.mulai(t.kunci)"><Ikon nama="Play" :ukuran="16" /> Mulai tur</button></div>
        </div>
      </div>
    </section>

    <section class="kartu p-5">
      <div class="mb-4 flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="Route" :ukuran="19" /></span>
        <div><h2 class="font-bold">Alur kerja bulanan Bendahara</h2><p class="text-xs text-slate-500">Urutan yang disarankan setiap bulan. Ketuk langkah untuk membuka menunya.</p></div>
      </div>
      <ol class="relative space-y-1 border-l-2 border-dashed border-slate-200 pl-5 dark:border-slate-700">
        <li v-for="(a, i) in ALUR_BULANAN" :key="a.judul">
          <button class="group flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="router.push(a.ke)">
            <span class="-ml-[2.15rem] grid h-8 w-8 shrink-0 place-items-center rounded-full bg-biru text-xs font-bold text-white ring-4 ring-white dark:ring-[#161D2B]">{{ i + 1 }}</span>
            <Ikon :nama="a.ikon" :ukuran="18" class="mt-1.5 shrink-0 text-[#22A08D]" />
            <span class="min-w-0 flex-1"><span class="block font-semibold">{{ a.judul }}</span><span class="block text-xs text-slate-500">{{ a.isi }}</span></span>
            <Ikon nama="ChevronRight" :ukuran="17" class="mt-1.5 shrink-0 text-slate-300 group-hover:text-biru" />
          </button>
        </li>
      </ol>
    </section>
  </div>
</template>
