<script setup>
import LogoSibos from '@/components/LogoSibos.vue'
import PilihTema from '@/components/PilihTema.vue'
import Ikon from '@/components/Ikon.vue'
import { modePratinjau } from '@/services/firebase'

const fitur = [
  { ikon: 'FileSignature', teks: 'Dokumen SPJ standar SIPLah', warna: 'bg-kuning/20 text-kuning' },
  { ikon: 'ArrowRightLeft', teks: 'Panduan input ARKAS & SIMAKDA', warna: 'bg-merah/20 text-rose-300' },
  { ikon: 'ReceiptText', teks: 'Pajak, BKU & laporan otomatis', warna: 'bg-tosca/20 text-teal-300' },
  { ikon: 'CloudUpload', teks: 'Arsip & cadangan di Google Drive', warna: 'bg-langit/20 text-blue-300' },
]
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
    <!-- Panel identitas -->
    <section class="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col dark:bg-[#0F1E4D]">
      <div class="pointer-events-none absolute -right-6 bottom-0 flex items-end gap-4 opacity-[0.12]" aria-hidden="true">
        <div class="h-40 w-14 rounded-full bg-kuning" /><div class="h-64 w-14 rounded-full bg-merah" />
        <div class="h-96 w-14 rounded-full bg-tosca" /><div class="h-[34rem] w-14 rounded-full bg-langit" />
      </div>
      <div class="flex items-center gap-3">
        <LogoSibos :ukuran="52" transparan />
        <div>
          <div class="text-2xl font-extrabold tracking-wider">SIBOS</div>
          <div class="text-sm text-blue-200">Sistem Informasi Bantuan Operasional Sekolah</div>
        </div>
      </div>
      <div class="relative mt-auto max-w-md">
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

    <!-- Formulir -->
    <section class="flex flex-col px-5 py-8 sm:px-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5 lg:invisible">
          <LogoSibos :ukuran="38" />
          <div class="leading-tight"><div class="font-extrabold tracking-wider">SIBOS</div><div class="text-xs text-slate-500">SMP Negeri 19 Makassar</div></div>
        </div>
        <div class="w-56"><PilihTema /></div>
      </div>
      <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div v-if="modePratinjau" class="mb-6 flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <Ikon nama="Construction" :ukuran="18" class="mt-0.5" />
          <span><b>Mode Pratinjau.</b> Firebase belum disambungkan; isi username apa saja untuk melihat tampilan.</span>
        </div>
        <slot />
      </div>
    </section>
  </div>
</template>
