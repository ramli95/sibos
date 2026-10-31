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
import { useNotifikasi } from '@/stores/notifikasi'
import { dengarkanPushDepan } from '@/services/push'

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
const menuAkun = ref(false)
const wadahAkun = ref(null)
onClickOutside(wadahAkun, () => (menuAkun.value = false))

const inisial = computed(() => (auth.pengguna?.nama || '?').split(',')[0].split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0]).join('').toUpperCase())

async function keluar() {
  await auth.keluar()
  router.replace('/masuk')
}
</script>

<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
    <!-- Sidebar desktop -->
    <aside class="tanpa-cetak sticky top-0 hidden h-dvh lg:block"><MenuSamping /></aside>

    <!-- Laci menu ponsel -->
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-if="laciTerbuka" class="tanpa-cetak fixed inset-0 z-40 bg-slate-900/50 lg:hidden" @click="laciTerbuka = false" />
    </Transition>
    <aside :class="['tanpa-cetak fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transition-transform lg:hidden', laciTerbuka ? 'translate-x-0' : '-translate-x-full']">
      <MenuSamping @pilih="laciTerbuka = false" />
    </aside>

    <div class="flex min-w-0 flex-col">
      <header class="tanpa-cetak sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-[#161D2B]/85">
        <button class="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Buka menu" @click="laciTerbuka = true">
          <Ikon nama="Menu" :ukuran="22" />
        </button>
        <div class="flex min-w-0 flex-1 items-center gap-2.5">
          <span class="hidden h-9 w-9 place-items-center rounded-xl bg-biru/10 text-biru sm:grid dark:bg-biru/20 dark:text-blue-300">
            <Ikon :nama="route.meta.ikon || 'LayoutDashboard'" :ukuran="18" />
          </span>
          <h1 class="truncate text-base font-bold sm:text-lg">{{ route.meta.judul }}</h1>
          <span v-if="modePratinjau" class="lencana hidden bg-amber-100 text-amber-800 md:inline-flex dark:bg-amber-900/40 dark:text-amber-300">
            <Ikon nama="Construction" :ukuran="13" /> Mode Pratinjau
          </span>
        </div>

        <TombolPasang />
        <LoncengNotifikasi />

        <div ref="wadahAkun" class="relative">
          <button type="button" @click="menuAkun = !menuAkun" :aria-expanded="menuAkun" class="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-biru to-tosca text-sm font-bold text-white">{{ inisial }}</span>
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
              <Ikon nama="KeyRound" :ukuran="16" class="text-kuning" /> Ganti password
            </RouterLink>
            <RouterLink v-if="auth.punyaPeran('kepala_sekolah') && !auth.isAdmin" to="/serah-terima" @click="menuAkun = false" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              <Ikon nama="Repeat" :ukuran="16" class="text-ungu" /> Serah terima bendahara
            </RouterLink>
            <button @click="keluar" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
              <Ikon nama="LogOut" :ukuran="16" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
