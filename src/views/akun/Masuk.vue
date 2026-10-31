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
    <h1 class="text-2xl font-extrabold">Masuk ke SIBOS</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Gunakan username dan password yang diberikan Bendahara.</p>

    <form class="mt-8 space-y-4" @submit.prevent="masuk">
      <div>
        <label class="label" for="username">Username atau email</label>
        <div class="relative">
          <Ikon nama="User" :ukuran="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="username" v-model="username" class="masukan pl-10" autocomplete="username" autocapitalize="none" required placeholder="mis. ramli" />
        </div>
      </div>
      <div>
        <label class="label" for="password">Password</label>
        <div class="relative">
          <Ikon nama="Lock" :ukuran="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="password" v-model="password" :type="lihat ? 'text' : 'password'" class="masukan px-10" autocomplete="current-password" required />
          <button type="button" class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:text-slate-600"
                  :aria-label="lihat ? 'Sembunyikan password' : 'Tampilkan password'" @click="lihat = !lihat">
            <Ikon :nama="lihat ? 'EyeOff' : 'Eye'" :ukuran="18" />
          </button>
        </div>
      </div>

      <p v-if="galat" class="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        <Ikon nama="TriangleAlert" :ukuran="16" /> {{ galat }}
      </p>

      <button type="submit" class="tombol-utama w-full py-3" :disabled="memuat">
        <Ikon :nama="memuat ? 'RefreshCw' : 'LogOut'" :ukuran="18" :class="memuat ? 'animate-spin' : 'rotate-180'" />
        {{ memuat ? 'Memeriksa…' : 'Masuk' }}
      </button>
      <RouterLink to="/lupa-password" class="flex items-center justify-center gap-1.5 text-sm font-semibold text-biru hover:underline">
        <Ikon nama="KeyRound" :ukuran="15" /> Lupa password?
      </RouterLink>
    </form>
  </TataLetakAkun>
</template>
