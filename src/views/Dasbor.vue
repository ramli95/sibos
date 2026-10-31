<script setup>
import { computed } from 'vue'
import { useAuth } from '@/stores/auth'
import { modePratinjau } from '@/services/firebase'
import { sapaan, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const auth = useAuth()
const namaDepan = computed(() => (auth.pengguna?.nama || '').split(',')[0])

// Daftar persiapan Fase 1 — status diperbarui otomatis saat tiap bagian tersambung
const persiapan = computed(() => [
  { ikon: 'Database', judul: 'Firebase tersambung', ket: 'Login & database Firestore Jakarta', selesai: !modePratinjau, warna: 'from-orange-400 to-rose-500', ke: null },
  { ikon: 'HardDrive', judul: 'Penghubung Google Drive', ket: 'Apps Script + folder SIBOS', selesai: false, warna: 'from-emerald-400 to-teal-500', ke: '/pengaturan/drive' },
  { ikon: 'School', judul: 'Profil sekolah & kop', ket: 'Identitas, logo Pemkot & Tut Wuri', selesai: false, warna: 'from-blue-500 to-indigo-600', ke: '/pengaturan/profil' },
  { ikon: 'UserCheck', judul: 'Pejabat per periode', ket: 'KS, Bendahara, Komite, Pengurus Barang', selesai: false, warna: 'from-violet-500 to-fuchsia-500', ke: '/pengaturan/pejabat' },
  { ikon: 'Users', judul: 'Impor data pegawai', ket: 'Dari sheet dB-SKPG', selesai: false, warna: 'from-sky-400 to-blue-600', ke: '/impor' },
  { ikon: 'Store', judul: 'Impor data rekanan', ket: 'Dari sheet db_Rekanan', selesai: false, warna: 'from-amber-400 to-orange-500', ke: '/impor' },
  { ikon: 'CloudUpload', judul: 'Cadangan pertama', ket: 'Muncul di Drive: SIBOS/Cadangan', selesai: false, warna: 'from-teal-400 to-cyan-600', ke: '/pengaturan/drive' },
])
const jumlahSelesai = computed(() => persiapan.value.filter((p) => p.selesai).length)
const persen = computed(() => Math.round((jumlahSelesai.value / persiapan.value.length) * 100))
</script>

<template>
  <div class="space-y-6">
    <!-- Sapaan -->
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#1F4BB8] to-biru p-6 text-white shadow-lg sm:p-8">
      <div class="pointer-events-none absolute -right-4 bottom-0 flex items-end gap-3 opacity-25" aria-hidden="true">
        <div class="h-12 w-6 rounded-full bg-kuning" /><div class="h-20 w-6 rounded-full bg-merah" />
        <div class="h-28 w-6 rounded-full bg-tosca" /><div class="h-36 w-6 rounded-full bg-langit" />
      </div>
      <p class="flex items-center gap-2 text-sm text-blue-100"><Ikon nama="CalendarDays" :ukuran="16" /> {{ tanggalPanjang(new Date()) }}</p>
      <h2 class="mt-2 text-2xl font-extrabold sm:text-3xl">{{ sapaan() }}, {{ namaDepan }}</h2>
      <p class="mt-1 max-w-xl text-blue-100">SIBOS sedang memasuki <b>Fase 1 — Fondasi</b>. Selesaikan daftar persiapan di bawah agar sistem siap dipakai.</p>
    </section>

    <!-- Persiapan Fase 1 -->
    <section class="kartu p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="flex items-center gap-2 text-lg font-bold"><Ikon nama="Sparkles" :ukuran="20" class="text-kuning" /> Persiapan Fase 1</h3>
        <span class="lencana bg-biru/10 text-biru dark:bg-biru/20 dark:text-blue-300">{{ jumlahSelesai }} dari {{ persiapan.length }} selesai</span>
      </div>
      <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" :aria-valuenow="persen" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-gradient-to-r from-kuning via-merah to-tosca transition-all" :style="{ width: Math.max(persen, 3) + '%' }" />
      </div>
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <component :is="p.ke ? 'RouterLink' : 'div'" v-for="p in persiapan" :key="p.judul" :to="p.ke"
                   class="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition hover:border-biru/40 hover:shadow-md dark:border-slate-700">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', p.warna]"><Ikon :nama="p.ikon" :ukuran="20" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ p.judul }}</p>
            <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ p.ket }}</p>
          </div>
          <Ikon :nama="p.selesai ? 'CircleCheck' : 'ChevronRight'" :ukuran="20" :class="p.selesai ? 'text-emerald-500' : 'text-slate-300 group-hover:text-biru'" />
        </component>
      </div>
    </section>
  </div>
</template>
