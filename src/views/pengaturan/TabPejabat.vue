<script setup>
import { PEJABAT_AWAL, JABATAN, formatNip } from '@/config/sekolahAwal'
import { tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const periode = (p) => `${p.mulai ? tanggalPanjang(p.mulai) : 'Awal'} – ${p.sampai ? tanggalPanjang(p.sampai) : 'sekarang'}`
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
      <Ikon nama="Info" :ukuran="20" class="text-biru" />
      <p>Setiap dokumen otomatis memakai pejabat yang menjabat pada <b>tanggal dokumen</b>. Contoh: dokumen bertanggal 25 Juni 2026 ditandatangani Muhammad Kasim; mulai 30 Juni 2026 oleh Muhammad Warham.</p>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <article v-for="(p, i) in PEJABAT_AWAL" :key="i" class="kartu flex gap-4 p-5">
        <span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow', JABATAN[p.jabatan].warna]">
          <Ikon :nama="JABATAN[p.jabatan].ikon" :ukuran="22" />
        </span>
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">{{ JABATAN[p.jabatan].label }}</p>
          <p class="mt-0.5 font-bold">{{ p.nama }}, {{ p.gelar }}</p>
          <p v-if="p.pangkat" class="text-sm text-slate-500">{{ p.pangkat }}</p>
          <p class="kode mt-1 text-sm text-slate-600 dark:text-slate-300">NIP {{ formatNip(p.nip) }}</p>
          <span :class="['lencana mt-2', p.sampai ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300']">
            <Ikon nama="CalendarDays" :ukuran="12" /> {{ periode(p) }}
          </span>
        </div>
      </article>
      <div class="kartu flex flex-col items-center justify-center gap-2 border-dashed p-5 text-center text-sm text-slate-500">
        <Ikon nama="Plus" :ukuran="22" class="text-biru" />
        Ketua Komite dan Pengurus Barang ditambahkan setelah data pegawai diimpor.
      </div>
    </div>
  </div>
</template>
