<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'
import Ikon from '@/components/Ikon.vue'
import TataLetakAkun from './TataLetakAkun.vue'

const auth = useAuth()
const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const lihat = ref(false)
const memuat = ref(false)
const galat = ref('')

async function masuk() {
  galat.value = ''
  memuat.value = true
  try {
    await auth.masuk(username.value, password.value)
    if (auth.perluPenyiapan) return router.replace('/penyiapan-awal')
    router.replace(auth.pengguna.wajib_ganti_password ? '/buat-password' : route.query.lanjut || '/dasbor')
  } catch (e) {
    galat.value = e.message || 'Gagal masuk.'
  } finally {
    memuat.value = false
  }
}
</script>

<template>
  <TataLetakAkun>
    <p class="text-sm font-semibold text-biru dark:text-blue-300">Selamat datang kembali</p>
    <h1 class="mt-1 text-[1.65rem] font-extrabold leading-tight">Masuk ke akun Anda</h1>
    <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Gunakan username dan password yang diberikan Bendahara.</p>
    <p v-if="route.query.alasan === 'tidak-aktif'" class="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <Ikon nama="Timer" :ukuran="17" class="mt-0.5 shrink-0" /> Anda keluar otomatis karena 30 menit tidak aktif. Silakan masuk kembali.</p>

    <form class="mt-7 space-y-4" @submit.prevent="masuk">
      <div>
        <label class="label" for="username">Username atau email</label>
        <div class="group relative">
          <span class="pointer-events-none absolute left-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-blue-50 text-biru transition group-focus-within:bg-biru group-focus-within:text-white dark:bg-blue-950/50 dark:text-blue-300">
            <Ikon nama="User" :ukuran="17" />
          </span>
          <input id="username" v-model="username" class="masukan h-12 rounded-2xl pl-12 text-base sm:text-sm" autocomplete="username" autocapitalize="none" spellcheck="false" required placeholder="mis. ramli" />
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between">
          <label class="label" for="password">Password</label>
          <RouterLink to="/lupa-password" class="mb-1.5 text-xs font-semibold text-biru hover:underline dark:text-blue-300">Lupa password?</RouterLink>
        </div>
        <div class="group relative">
          <span class="pointer-events-none absolute left-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-biru/10 text-biru transition group-focus-within:bg-biru group-focus-within:text-white dark:bg-blue-400/15 dark:text-blue-300">
            <Ikon nama="Lock" :ukuran="17" />
          </span>
          <input id="password" v-model="password" :type="lihat ? 'text' : 'password'" class="masukan h-12 rounded-2xl pl-12 pr-12 text-base sm:text-sm" autocomplete="current-password" required placeholder="••••••••" />
          <button type="button" class="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  :aria-label="lihat ? 'Sembunyikan password' : 'Tampilkan password'" @click="lihat = !lihat">
            <Ikon :nama="lihat ? 'EyeOff' : 'Eye'" :ukuran="18" />
          </button>
        </div>
      </div>

      <p v-if="galat" class="flex items-center gap-2 rounded-2xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        <Ikon nama="TriangleAlert" :ukuran="16" /> {{ galat }}
      </p>

      <button type="submit" :disabled="memuat"
              class="tombol mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-biru to-blue-700 text-base text-white shadow-lg shadow-biru/30 transition hover:brightness-110 active:scale-[0.99]">
        <Ikon :nama="memuat ? 'RefreshCw' : 'LogOut'" :ukuran="19" :class="memuat ? 'animate-spin' : 'rotate-180'" />
        {{ memuat ? 'Memeriksa…' : 'Masuk' }}
      </button>
    </form>
  </TataLetakAkun>
</template>
