<script setup>
import { ref } from 'vue'
import { onClickOutside } from '@/utils/klikLuar'
import { useNotifikasi } from '@/stores/notifikasi'
import { formatWaktuRelatif } from '@/utils/format'
import Ikon from './Ikon.vue'

const notif = useNotifikasi()
const buka = ref(false)
const wadah = ref(null)
onClickOutside(wadah, () => (buka.value = false))

const warna = { info: 'bg-blue-100 text-biru dark:bg-blue-900/50 dark:text-blue-300', peringatan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', galat: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', sukses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
</script>

<template>
  <div ref="wadah" class="relative">
    <button type="button" @click="buka = !buka" :aria-expanded="buka" aria-label="Notifikasi"
            class="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
      <Ikon :nama="notif.belumDibaca ? 'BellRing' : 'Bell'" :ukuran="20" />
      <span v-if="notif.belumDibaca" class="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-merah px-1 text-[10px] font-bold text-white">
        {{ notif.belumDibaca }}
      </span>
    </button>

    <div v-if="buka" class="kartu absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <span class="flex items-center gap-2 text-sm font-bold"><Ikon nama="Bell" :ukuran="16" class="text-biru" /> Notifikasi</span>
        <button class="text-xs font-semibold text-biru hover:underline" @click="notif.tandaiSemua()">Tandai semua dibaca</button>
      </div>
      <ul class="max-h-80 overflow-y-auto">
        <li v-for="n in notif.daftar.slice(0, 8)" :key="n.id" :class="['flex cursor-pointer gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40', !n.dibaca && 'bg-blue-50/60 dark:bg-blue-950/30']" @click="notif.tandai(n)">
          <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl', warna[n.jenis] || warna.info]"><Ikon :nama="n.ikon || 'Bell'" :ukuran="17" /></span>
          <div class="min-w-0">
            <p class="font-semibold">{{ n.judul }}</p>
            <p class="text-slate-500 dark:text-slate-400">{{ n.isi }}</p>
            <p class="mt-0.5 text-xs text-slate-400">{{ formatWaktuRelatif(n.waktu) }}</p>
          </div>
        </li>
        <li v-if="!notif.daftar.length" class="px-4 py-6 text-center text-sm text-slate-500">Belum ada notifikasi.</li>
      </ul>
      <RouterLink to="/notifikasi" @click="buka = false" class="block border-t border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-biru hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
        Lihat semua
      </RouterLink>
    </div>
  </div>
</template>
