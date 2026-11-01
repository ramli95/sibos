<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_PENGATURAN } from '@/config/menu'
import Ikon from '@/components/Ikon.vue'
import TabProfil from './TabProfil.vue'
import TabPejabat from './TabPejabat.vue'
import TabPengguna from './TabPengguna.vue'
import TabDrive from './TabDrive.vue'
import TabTahun from './TabTahun.vue'
import TabKop from './TabKop.vue'
import TabCetak from './TabCetak.vue'
import TabNotifikasi from './TabNotifikasi.vue'
import { h } from 'vue'
import SegeraHadir from '@/views/SegeraHadir.vue'
import Panduan from '@/views/Panduan.vue'

const route = useRoute()
const router = useRouter()
// Notifikasi digabung ke tab Drive, Cadangan & Notifikasi (tautan lama tetap berfungsi)
const aktif = computed(() => (route.params.tab === 'notifikasi' ? 'drive' : route.params.tab || 'profil'))
// Satu tab: Drive & cadangan di atas, notifikasi di bawahnya
const TabDriveNotifikasi = { render: () => h('div', { class: 'space-y-5' }, [h(TabDrive), h('h2', { class: 'flex items-center gap-2 px-1 pt-2 text-lg font-bold' }, [h(Ikon, { nama: 'BellRing', ukuran: 19, class: 'text-biru' }), 'Notifikasi']), h(TabNotifikasi)]) }
const komponen = { profil: TabProfil, kop: TabKop, pejabat: TabPejabat, pengguna: TabPengguna, cetak: TabCetak, drive: TabDriveNotifikasi, tahun: TabTahun, panduan: Panduan }
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex gap-1 overflow-x-auto p-1.5" role="tablist" aria-label="Bagian pengaturan">
      <button v-for="t in TAB_PENGATURAN" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                       aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/pengaturan/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>
    <component :is="komponen[aktif] || SegeraHadir" />
  </div>
</template>
