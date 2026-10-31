<script setup>
// Tata letak halaman akun (masuk, lupa/buat password, penyiapan).
// HP: kepala bergradien navy dengan logo besar + lembar formulir membulat seperti aplikasi.
// Desktop: panel identitas di kiri, kartu formulir di kanan.
import { computed } from 'vue'
import LogoSibos from '@/components/LogoSibos.vue'
import Ikon from '@/components/Ikon.vue'
import { useTema } from '@/stores/tema'
import { modePratinjau } from '@/services/firebase'

const tema = useTema()
const urutan = ['sistem', 'terang', 'gelap']
const ikonTema = computed(() => ({ terang: 'Sun', gelap: 'Moon', sistem: 'Monitor' })[tema.pilihan] || 'Monitor')
const labelTema = computed(() => ({ terang: 'Terang', gelap: 'Gelap', sistem: 'Ikuti sistem' })[tema.pilihan])
const gantiTema = () => { tema.pilihan = urutan[(urutan.indexOf(tema.pilihan) + 1) % urutan.length] }

const fitur = [
  { ikon: 'FileSignature', teks: 'Dokumen SPJ standar SIPLah', warna: 'bg-white/10 text-blue-100' },
  { ikon: 'ArrowRightLeft', teks: 'Panduan input ARKAS & SIMAKDA', warna: 'bg-white/10 text-blue-100' },
  { ikon: 'ReceiptText', teks: 'Pajak, BKU & laporan otomatis', warna: 'bg-white/10 text-blue-100' },
  { ikon: 'CloudUpload', teks: 'Arsip & cadangan di Google Drive', warna: 'bg-white/10 text-blue-100' },
]
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-navy lg:grid lg:grid-cols-[1.05fr_1fr] lg:bg-slate-50 dark:bg-[#0F1E4D] lg:dark:bg-[#0E131D]">
    <!-- Kepala (HP) / panel identitas (desktop) -->
    <section class="relative overflow-hidden bg-gradient-to-br from-navy via-[#1B3FA0] to-biru px-6 pb-14 pt-[max(1.25rem,env(safe-area-inset-top))] text-white lg:flex lg:flex-col lg:bg-none lg:bg-navy lg:p-12 dark:from-[#0F1E4D] dark:via-[#132B6B] dark:to-[#1A3E9E] lg:dark:bg-[#0F1E4D]">
      <!-- hiasan batang tumbuh -->
      <div class="pointer-events-none absolute -right-4 bottom-0 flex items-end gap-2.5 opacity-[0.16] lg:gap-4 lg:opacity-[0.12]" aria-hidden="true">
        <div class="h-16 w-7 rounded-t-full bg-white lg:h-40 lg:w-14 lg:rounded-full" /><div class="h-28 w-7 rounded-t-full bg-white lg:h-64 lg:w-14 lg:rounded-full" />
        <div class="h-40 w-7 rounded-t-full bg-white lg:h-96 lg:w-14 lg:rounded-full" /><div class="h-52 w-7 rounded-t-full bg-white lg:h-[34rem] lg:w-14 lg:rounded-full" />
      </div>
      <span class="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />

      <div class="relative flex items-center justify-between">
        <span class="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-50 ring-1 ring-white/20 backdrop-blur lg:hidden">NPSN 40307324</span>
        <button type="button" :title="`Tema: ${labelTema}`" :aria-label="`Ganti tema (sekarang ${labelTema})`" @click="gantiTema"
                class="ml-auto grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25 lg:hidden">
          <Ikon :nama="ikonTema" :ukuran="18" />
        </button>
        <div class="hidden items-center gap-3 lg:flex">
          <LogoSibos :ukuran="52" transparan />
          <div>
            <div class="text-2xl font-extrabold tracking-wider">SIBOS</div>
            <div class="text-sm text-blue-200">Sistem Informasi Bantuan Operasional Sekolah</div>
          </div>
        </div>
      </div>

      <!-- Identitas di HP -->
      <div class="relative mt-5 flex flex-col items-center text-center lg:hidden">
        <span class="rounded-[1.6rem] bg-white p-2.5 shadow-2xl shadow-black/30 ring-4 ring-white/20"><LogoSibos :ukuran="68" /></span>
        <h1 class="mt-4 text-[1.9rem] font-extrabold tracking-[0.18em]">SIBOS</h1>
        <p class="mt-1 text-sm text-blue-100">Sistem Informasi Bantuan Operasional Sekolah</p>
        <p class="mt-0.5 text-xs font-semibold text-blue-200/90">UPT SPF SMP Negeri 19 Makassar</p>
      </div>

      <div class="relative mt-auto hidden max-w-md lg:block">
        <h2 class="text-3xl font-extrabold leading-tight">Input sekali, dokumen SPJ, pajak, BKU, dan laporan BOSP keluar sendiri.</h2>
        <ul class="mt-8 space-y-3">
          <li v-for="f in fitur" :key="f.teks" class="flex items-center gap-3 text-blue-50">
            <span :class="['grid h-10 w-10 place-items-center rounded-xl', f.warna]"><Ikon :nama="f.ikon" :ukuran="19" /></span>
            {{ f.teks }}
          </li>
        </ul>
        <p class="mt-10 text-sm text-blue-200/80">UPT SPF SMP Negeri 19 Makassar · NPSN 40307324</p>
      </div>
    </section>

    <!-- Lembar formulir -->
    <section class="relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[2rem] bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] dark:bg-[#121a29] lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-10 lg:shadow-none lg:dark:bg-transparent">
      <div class="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 lg:hidden" aria-hidden="true" />
      <div class="hidden justify-end lg:flex">
        <button type="button" :title="`Tema: ${labelTema}`" @click="gantiTema"
                class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Ikon :nama="ikonTema" :ukuran="16" class="text-biru" /> {{ labelTema }}
        </button>
      </div>
      <div class="mx-auto flex w-full max-w-sm flex-1 flex-col lg:justify-center lg:py-10">
        <div class="lg:rounded-3xl lg:border lg:border-slate-200 lg:bg-white lg:p-8 lg:shadow-xl lg:shadow-slate-200/60 lg:dark:border-slate-700/60 lg:dark:bg-[#161D2B] lg:dark:shadow-none">
          <div v-if="modePratinjau" class="mb-6 flex gap-2.5 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            <Ikon nama="Construction" :ukuran="18" class="mt-0.5" />
            <span><b>Mode Pratinjau.</b> Firebase belum disambungkan; isi username apa saja untuk melihat tampilan.</span>
          </div>
          <slot />
        </div>
        <p class="mt-auto flex items-center justify-center gap-1.5 pt-8 text-xs text-slate-400 lg:mt-6">
          <Ikon nama="ShieldCheck" :ukuran="14" class="text-emerald-500" /> Data tersimpan aman · SIBOS {{ new Date().getFullYear() }}
        </p>
      </div>
    </section>
  </div>
</template>
