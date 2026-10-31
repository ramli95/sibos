<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'
import TataLetakAkun from './TataLetakAkun.vue'

const auth = useAuth()
const notif = useNotifikasi()
const router = useRouter()
const baru = ref('')
const ulang = ref('')
const memuat = ref(false)
const galat = ref('')

const syarat = computed(() => [
  { ok: baru.value.length >= 8, teks: 'Minimal 8 karakter' },
  { ok: /[A-Za-z]/.test(baru.value) && /\d/.test(baru.value), teks: 'Berisi huruf dan angka' },
  { ok: baru.value && baru.value === ulang.value, teks: 'Kedua isian sama' },
])
const sah = computed(() => syarat.value.every((s) => s.ok))

async function simpan() {
  galat.value = ''
  memuat.value = true
  try {
    await auth.buatPassword(baru.value)
    notif.kabari('Password baru tersimpan.')
    router.replace('/dasbor')
  } catch (e) {
    galat.value = e.code === 'auth/requires-recent-login' ? 'Demi keamanan, silakan keluar lalu masuk kembali sebelum mengganti password.' : 'Password gagal disimpan.'
  } finally { memuat.value = false }
}
</script>

<template>
  <TataLetakAkun>
    <span class="grid h-12 w-12 place-items-center rounded-2xl bg-tosca/15 text-teal-600"><Ikon nama="ShieldCheck" :ukuran="24" /></span>
    <h1 class="mt-4 text-2xl font-extrabold">{{ auth.pengguna?.wajib_ganti_password ? 'Buat password Anda' : 'Ganti password' }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      <template v-if="auth.pengguna?.wajib_ganti_password">Ini login pertama Anda. Buat password sendiri yang hanya Anda ketahui.</template>
      <template v-else>Masukkan password baru untuk akun <b>@{{ auth.pengguna?.username }}</b>.</template>
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="simpan">
      <div><label class="label" for="b">Password baru</label><input id="b" v-model="baru" type="password" class="masukan" autocomplete="new-password" /></div>
      <div><label class="label" for="ul">Ulangi password baru</label><input id="ul" v-model="ulang" type="password" class="masukan" autocomplete="new-password" /></div>
      <ul class="space-y-1.5 text-sm">
        <li v-for="s in syarat" :key="s.teks" :class="['flex items-center gap-2', s.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400']">
          <Ikon :nama="s.ok ? 'CircleCheck' : 'Info'" :ukuran="16" /> {{ s.teks }}
        </li>
      </ul>
      <p v-if="galat" class="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{{ galat }}</p>
      <button class="tombol-utama w-full py-3" :disabled="!sah || memuat"><Ikon nama="KeyRound" :ukuran="18" /> Simpan password</button>
      <RouterLink v-if="!auth.pengguna?.wajib_ganti_password" to="/dasbor" class="block text-center text-sm font-semibold text-slate-500 hover:text-biru">Batal</RouterLink>
    </form>
  </TataLetakAkun>
</template>
