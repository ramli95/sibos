<script setup>
// Keluar otomatis setelah 30 menit tidak aktif (Fase 7). Peringatan muncul 1 menit sebelumnya.
// Waktu aktivitas terakhir disimpan di localStorage agar beberapa tab SIBOS berbagi hitungan yang sama.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import Ikon from './Ikon.vue'

const BATAS = 30 * 60 * 1000
const PERINGATAN = 60 * 1000
const KUNCI = 'sibos_aktif_terakhir'
const auth = useAuth()
const router = useRouter()
const sisa = ref(0)
const tampil = ref(false)

const baca = () => { try { return Number(localStorage.getItem(KUNCI)) || Date.now() } catch { return Date.now() } }
const tulis = (t) => { try { localStorage.setItem(KUNCI, String(t)) } catch { /* penyimpanan diblokir: abaikan */ } }
let terakhirTulis = 0
function aktif() {
  if (tampil.value) return // saat peringatan tampil, hanya tombol "Tetap masuk" yang memperpanjang
  const t = Date.now()
  if (t - terakhirTulis > 5000) { tulis(t); terakhirTulis = t } // hemat tulis
}
async function keluar() {
  tampil.value = false
  await auth.keluar()
  router.replace({ path: '/masuk', query: { alasan: 'tidak-aktif' } })
}
function periksa() {
  if (!auth.pengguna) return
  const diam = Date.now() - baca()
  if (diam >= BATAS) { keluar(); return }
  tampil.value = diam >= BATAS - PERINGATAN
  sisa.value = Math.ceil((BATAS - diam) / 1000)
}
const PERISTIWA = ['pointerdown', 'keydown', 'wheel', 'touchstart']
let jam
onMounted(() => {
  // Sesi yang dipulihkan setelah lama ditinggal (aplikasi dibuka lagi) langsung diperiksa; login baru menulis waktu di auth.masuk
  periksa()
  PERISTIWA.forEach((e) => addEventListener(e, aktif, { passive: true }))
  document.addEventListener('visibilitychange', periksa)
  jam = setInterval(periksa, 1000)
})
onBeforeUnmount(() => {
  PERISTIWA.forEach((e) => removeEventListener(e, aktif))
  document.removeEventListener('visibilitychange', periksa)
  clearInterval(jam)
})
function tetap() { tulis(Date.now()); terakhirTulis = Date.now(); tampil.value = false }
</script>

<template>
  <Teleport to="body">
    <div v-if="tampil" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/45 p-4" role="alertdialog" aria-modal="true" aria-labelledby="judul-diam">
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl ikon-chip-peringatan"><Ikon nama="Timer" :ukuran="28" /></span>
        <h2 id="judul-diam" class="mt-3 text-lg font-extrabold">Masih di sana?</h2>
        <p class="mt-1 text-sm text-slate-500">Demi keamanan data, SIBOS keluar otomatis setelah 30 menit tidak aktif.</p>
        <p class="angka mt-3 text-4xl font-extrabold text-[#B7820A]">{{ sisa }}<span class="text-base font-semibold"> detik</span></p>
        <div class="mt-5 flex justify-center gap-2">
          <button class="tombol-garis" @click="keluar"><Ikon nama="LogOut" :ukuran="17" class="text-rose-500" /> Keluar</button>
          <button class="tombol-utama" @click="tetap"><Ikon nama="CircleCheck" :ukuran="17" /> Tetap masuk</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
