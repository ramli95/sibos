<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { jalankanPenyiapanAwal } from '@/services/sistem'
import { PEMILIK_AWAL, SEKOLAH_AWAL } from '@/config/sekolahAwal'
import Ikon from '@/components/Ikon.vue'
import TataLetakAkun from './TataLetakAkun.vue'

const auth = useAuth()
const notif = useNotifikasi()
const router = useRouter()
const f = reactive({ username: PEMILIK_AWAL.username, nama: PEMILIK_AWAL.nama, gelar: PEMILIK_AWAL.gelar, nip: PEMILIK_AWAL.nip })
const memuat = ref(false)
const galat = ref('')

const akanDibuat = [
  { ikon: 'ShieldCheck', teks: 'Akun Bendahara (Admin) pertama', warna: 'ikon-chip' },
  { ikon: 'School', teks: `Profil sekolah ${SEKOLAH_AWAL.nama_arkas}`, warna: 'ikon-chip' },
  { ikon: 'UserCheck', teks: 'Pejabat per periode (KS lama & baru, Bendahara)', warna: 'ikon-chip' },
  { ikon: 'HardDrive', teks: 'Folder Google Drive SIBOS', warna: 'ikon-chip' },
  { ikon: 'History', teks: 'Catatan pertama di log aktivitas', warna: 'ikon-chip' },
]

async function siapkan() {
  galat.value = ''
  memuat.value = true
  try {
    await jalankanPenyiapanAwal(f)
    await auth.muatUlangProfil()
    notif.kabari('SIBOS siap dipakai. Selamat datang!')
    router.replace('/dasbor')
  } catch (e) {
    galat.value = e.code === 'permission-denied'
      ? 'Ditolak oleh aturan Firestore. Pastikan aturan (Rules) SIBOS sudah dipasang dan penyiapan belum pernah dijalankan.'
      : e.message
  } finally { memuat.value = false }
}
</script>

<template>
  <TataLetakAkun>
    <span class="grid h-12 w-12 place-items-center rounded-2xl ikon-chip"><Ikon nama="Sparkles" :ukuran="24" /></span>
    <h1 class="mt-4 text-2xl font-extrabold">Penyiapan Awal SIBOS</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Masuk sebagai <b>{{ auth.akunFirebase?.email }}</b>. Langkah ini hanya dijalankan sekali dan akan membuat:
    </p>
    <ul class="mt-4 space-y-2">
      <li v-for="a in akanDibuat" :key="a.teks" class="flex items-center gap-3 text-sm">
        <span :class="['grid h-8 w-8 shrink-0 place-items-center rounded-lg', a.warna]"><Ikon :nama="a.ikon" :ukuran="16" /></span>{{ a.teks }}
      </li>
    </ul>

    <form class="mt-6 space-y-3" @submit.prevent="siapkan">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="u">Username</label><input id="u" v-model="f.username" class="masukan" required /></div>
        <div><label class="label" for="n">Nama</label><input id="n" v-model="f.nama" class="masukan" required /></div>
        <div><label class="label" for="g">Gelar</label><input id="g" v-model="f.gelar" class="masukan" /></div>
        <div><label class="label" for="nip">NIP</label><input id="nip" v-model="f.nip" class="masukan kode" inputmode="numeric" maxlength="18" /></div>
      </div>
      <p v-if="galat" class="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{{ galat }}</p>
      <button class="tombol-utama w-full py-3" :disabled="memuat">
        <Ikon :nama="memuat ? 'RefreshCw' : 'CircleCheck'" :ukuran="18" :class="memuat && 'animate-spin'" /> {{ memuat ? 'Menyiapkan…' : 'Siapkan SIBOS' }}
      </button>
    </form>
  </TataLetakAkun>
</template>
