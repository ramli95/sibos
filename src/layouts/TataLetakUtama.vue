<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { PERAN } from '@/config/peran'
import { modePratinjau } from '@/services/firebase'
import { onClickOutside } from '@/utils/klikLuar'
import Ikon from '@/components/Ikon.vue'
import MenuSamping from '@/components/MenuSamping.vue'
import LoncengNotifikasi from '@/components/LoncengNotifikasi.vue'
import TombolPasang from '@/components/TombolPasang.vue'
import NavBawah from '@/components/NavBawah.vue'
import { useNotifikasi } from '@/stores/notifikasi'
import { dengarkanPushDepan } from '@/services/push'
import { useTampilan } from '@/stores/tampilan'
import { usePanduan } from '@/stores/panduan'
import { turUntukRute } from '@/config/panduan'
import TurPanduan from '@/components/TurPanduan.vue'
import KeluarOtomatis from '@/components/KeluarOtomatis.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const notif = useNotifikasi()
onMounted(() => {
  if (auth.pengguna) notif.mulai(auth.pengguna.uid)
  dengarkanPushDepan((judul, isi) => notif.kabari(`${judul}: ${isi}`, 'info'))
})
onBeforeUnmount(() => notif.hentikan())
const laciTerbuka = ref(false)

// Sidebar desktop: 'tetap' atau 'otomatis' (ikon saja, melebar saat kursor di atasnya)
const tampilan = useTampilan()
const otomatis = computed(() => tampilan.sidebar === 'otomatis')
const melebar = ref(false)
let jeda
const sentuhSidebar = (masuk) => { clearTimeout(jeda); jeda = setTimeout(() => (melebar.value = masuk), masuk ? 120 : 280) }
const menuAkun = ref(false)
const wadahAkun = ref(null)
onClickOutside(wadahAkun, () => (menuAkun.value = false))

const inisial = computed(() => (auth.pengguna?.nama || '?').split(',')[0].split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0]).join('').toUpperCase())

// Tombol bantuan: putar tur halaman ini, atau buka daftar Panduan Input
const panduan = usePanduan()
const turHalaman = computed(() => turUntukRute(route.path))
function bantuan() { if (turHalaman.value && !route.path.endsWith('/panduan')) panduan.mulai(turHalaman.value); else router.push(auth.isAdmin ? '/pengaturan/panduan' : '/panduan') }

async function keluar() {
  await auth.keluar()
  router.replace('/masuk')
}
</script>

<template>
  <div :class="['min-h-dvh lg:grid', otomatis ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-[272px_minmax(0,1fr)]']">
    <!-- Sidebar desktop -->
    <aside class="tanpa-cetak sticky top-0 z-40 hidden h-dvh lg:block" @mouseenter="otomatis && sentuhSidebar(true)" @mouseleave="otomatis && sentuhSidebar(false)">
      <div :class="['h-dvh overflow-hidden transition-[width,box-shadow] duration-200 ease-out', otomatis ? (melebar ? 'absolute left-0 top-0 w-[272px] shadow-2xl shadow-black/40' : 'w-[76px]') : 'w-full']">
        <MenuSamping :ringkas="otomatis && !melebar" tombol-semat @pilih="melebar = false" />
      </div>
    </aside>

    <!-- Laci menu ponsel -->
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-if="laciTerbuka" class="tanpa-cetak fixed inset-0 z-40 bg-slate-900/50 lg:hidden" @click="laciTerbuka = false" />
    </Transition>
    <aside :class="['tanpa-cetak fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transition-transform lg:hidden', laciTerbuka ? 'translate-x-0' : '-translate-x-full']">
      <MenuSamping @pilih="laciTerbuka = false" />
    </aside>

    <div class="flex min-w-0 flex-col">
      <header class="tanpa-cetak sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-[#161D2B]/85">
        <button class="hidden h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 sm:grid lg:hidden dark:hover:bg-slate-800" aria-label="Buka menu" @click="laciTerbuka = true">
          <Ikon nama="Menu" :ukuran="22" />
        </button>
        <div class="flex min-w-0 flex-1 items-center gap-2.5">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-biru/10 text-biru dark:bg-biru/20 dark:text-blue-300">
            <Ikon :nama="route.meta.ikon || 'LayoutDashboard'" :ukuran="18" />
          </span>
          <h1 class="truncate text-base font-bold sm:text-lg" data-tur="judul-halaman">{{ route.meta.judul }}</h1>
          <span v-if="modePratinjau" class="lencana hidden bg-amber-100 text-amber-800 md:inline-flex dark:bg-amber-900/40 dark:text-amber-300">
            <Ikon nama="Construction" :ukuran="13" /> Mode Pratinjau
          </span>
        </div>

        <TombolPasang />
        <button type="button" class="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-biru dark:hover:bg-slate-800" data-tur="tombol-panduan"
                :title="turHalaman ? 'Putar panduan halaman ini' : 'Panduan Input'" aria-label="Panduan" @click="bantuan">
          <Ikon nama="CircleHelp" :ukuran="21" />
        </button>
        <LoncengNotifikasi />

        <div ref="wadahAkun" class="relative">
          <button type="button" @click="menuAkun = !menuAkun" :aria-expanded="menuAkun" class="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-biru text-sm font-bold text-white">{{ inisial }}</span>
            <Ikon nama="ChevronDown" :ukuran="16" class="hidden text-slate-400 sm:block" />
          </button>
          <div v-if="menuAkun" class="kartu absolute right-0 z-40 mt-2 w-72 p-2">
            <div class="px-3 py-2">
              <p class="font-semibold">{{ auth.pengguna?.nama }}</p>
              <p class="text-xs text-slate-500">@{{ auth.pengguna?.username }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="p in auth.peran" :key="p" :class="['lencana', PERAN[p]?.warna]">
                  <Ikon :nama="PERAN[p]?.ikon" :ukuran="12" /> {{ PERAN[p]?.singkat }}
                </span>
              </div>
            </div>
            <hr class="my-1 border-slate-200 dark:border-slate-700" />
            <RouterLink to="/buat-password" @click="menuAkun = false" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              <Ikon nama="KeyRound" :ukuran="16" class="text-biru" /> Ganti password
            </RouterLink>
            <RouterLink v-if="auth.punyaPeran('kepala_sekolah') && !auth.isAdmin" to="/serah-terima/berita-acara" @click="menuAkun = false" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              <Ikon nama="Repeat" :ukuran="16" class="text-biru" /> Serah terima bendahara
            </RouterLink>
            <button @click="keluar" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
              <Ikon nama="LogOut" :ukuran="16" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:py-8">
        <RouterView />
      </main>
      <NavBawah @lainnya="laciTerbuka = true" />
    </div>
    <TurPanduan />
    <KeluarOtomatis />
  </div>
</template>
