<script setup>
import { ref } from 'vue'
import { useAuth } from '@/stores/auth'
import Ikon from '@/components/Ikon.vue'
import TataLetakAkun from './TataLetakAkun.vue'

const auth = useAuth()
const username = ref('')
const hasil = ref('')
const memuat = ref(false)

async function kirim() {
  memuat.value = true
  try { hasil.value = await auth.lupaPassword(username.value) } catch { hasil.value = 'galat' } finally { memuat.value = false }
}
</script>

<template>
  <TataLetakAkun>
    <RouterLink to="/masuk" class="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-biru">
      <Ikon nama="ArrowLeft" :ukuran="16" /> Kembali ke Masuk
    </RouterLink>
    <span class="grid h-12 w-12 place-items-center rounded-2xl ikon-chip"><Ikon nama="KeyRound" :ukuran="24" /></span>
    <h1 class="mt-4 text-2xl font-extrabold">Lupa password</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Bila akun Anda memiliki email, tautan untuk membuat password baru akan dikirim ke email tersebut.</p>

    <form v-if="!hasil" class="mt-6 space-y-4" @submit.prevent="kirim">
      <div>
        <label class="label" for="u">Username</label>
        <input id="u" v-model="username" class="masukan" autocapitalize="none" required />
      </div>
      <button class="tombol-utama w-full py-3" :disabled="memuat"><Ikon nama="Mail" :ukuran="18" /> Kirim tautan</button>
    </form>

    <div v-else-if="hasil === 'terkirim'" class="mt-6 flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
      <Ikon nama="CircleCheck" :ukuran="20" /> <span>Tautan sudah dikirim. Periksa kotak masuk (dan folder spam) email Anda.</span>
    </div>
    <div v-else class="mt-6 flex gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
      <Ikon nama="Info" :ukuran="20" />
      <span>Akun ini belum memiliki email. Silakan hubungi <b>Bendahara (Admin)</b> untuk mendapatkan password sementara.</span>
    </div>
  </TataLetakAkun>
</template>
