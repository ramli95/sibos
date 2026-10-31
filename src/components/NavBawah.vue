<script setup>
// Navigasi bawah untuk HP: menu yang paling sering dipakai + "Lainnya" membuka menu lengkap.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'
import Ikon from './Ikon.vue'

const emit = defineEmits(['lainnya'])
const route = useRoute()
const auth = useAuth()
const daftar = computed(() => [
  { judul: 'Dasbor', ikon: 'LayoutDashboard', ke: '/dasbor', awal: '/dasbor' },
  { judul: 'RKAS', ikon: 'ClipboardList', ke: '/rkas/ringkasan', awal: '/rkas' },
  { judul: 'Harga', ikon: 'Tags', ke: '/standar-harga', awal: '/standar-harga' },
  auth.punyaPeran('bendahara', 'tim_bos', 'kepala_sekolah')
    ? { judul: 'Pegawai', ikon: 'Users', ke: '/pegawai', awal: '/pegawai' }
    : { judul: 'Rekanan', ikon: 'Store', ke: '/rekanan', awal: '/rekanan' },
])
const aktif = (m) => route.path.startsWith(m.awal)
</script>

<template>
  <nav class="tanpa-cetak fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-[#161D2B]/95" aria-label="Navigasi utama">
    <div class="mx-auto grid max-w-lg grid-cols-5">
      <RouterLink v-for="m in daftar" :key="m.ke" :to="m.ke" :aria-current="aktif(m) ? 'page' : null"
                  :class="['flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition', aktif(m) ? 'text-biru dark:text-blue-300' : 'text-slate-500 dark:text-slate-400']">
        <span :class="['grid h-8 w-14 place-items-center rounded-full transition', aktif(m) ? 'bg-biru/10 dark:bg-blue-400/15' : '']"><Ikon :nama="m.ikon" :ukuran="21" /></span>
        {{ m.judul }}
      </RouterLink>
      <button type="button" class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400" @click="emit('lainnya')">
        <span class="grid h-8 w-14 place-items-center rounded-full"><Ikon nama="Ellipsis" :ukuran="21" /></span>
        Lainnya
      </button>
    </div>
  </nav>
</template>
