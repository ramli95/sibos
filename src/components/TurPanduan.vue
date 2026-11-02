<script setup>
// Tur interaktif: menyorot elemen halaman satu per satu dengan kartu penjelasan.
// Juga menawarkan tur sekali saat pengguna pertama kali membuka menu yang punya tur.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePanduan } from '@/stores/panduan'
import { useAuth } from '@/stores/auth'
import { TUR, turUntukRute } from '@/config/panduan'
import Ikon from './Ikon.vue'

const route = useRoute()
const router = useRouter()
const p = usePanduan()
const auth = useAuth()

const kotak = ref(null) // { top, left, width, height } elemen yang disorot
const lebarLayar = ref(innerWidth)
const tinggiLayar = ref(innerHeight)
const step = computed(() => p.tur?.langkah[p.langkah] || null)
const terakhir = computed(() => p.tur && p.langkah === p.tur.langkah.length - 1)

function terlihat(el) { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
function cariElemen(s) {
  for (const sel of [].concat(s?.pilih || [])) {
    let daftar = []
    try { daftar = [...document.querySelectorAll(sel)] } catch { daftar = [] }
    const el = daftar.find(terlihat)
    if (el) return el
  }
  return null
}
let el = null
function ukur() {
  lebarLayar.value = innerWidth; tinggiLayar.value = innerHeight
  if (!el || !document.contains(el)) { kotak.value = null; return }
  const r = el.getBoundingClientRect()
  const pad = 6
  kotak.value = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: Math.min(r.height + pad * 2, innerHeight * 0.7) }
}
async function tampilkan() {
  if (!step.value) { el = null; kotak.value = null; return }
  await nextTick()
  // tunggu sebentar agar halaman yang baru dibuka sempat dirender
  let coba = 0
  el = cariElemen(step.value)
  while (!el && step.value?.pilih && coba < 8) { await new Promise((r) => setTimeout(r, 150)); el = cariElemen(step.value); coba++ }
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(ukur, 320) }
  ukur()
}
watch(() => [p.aktif, p.langkah], tampilkan)

// Tur dimulai dari halaman lain → buka rutenya dulu
watch(() => p.aktif, async (k) => {
  if (!k) return
  const t = TUR[k]
  if (turUntukRute(route.path) !== k && t.rute) { await router.push(t.rute); tampilkan() }
})

let bingkai = 0
const ulangUkur = () => { cancelAnimationFrame(bingkai); bingkai = requestAnimationFrame(ukur) }
const tombol = (e) => {
  if (!p.aktif) return
  if (e.key === 'Escape') p.selesai()
  else if (e.key === 'ArrowRight') p.lanjut()
  else if (e.key === 'ArrowLeft') p.kembali()
}
onMounted(() => { addEventListener('resize', ulangUkur); addEventListener('scroll', ulangUkur, true); addEventListener('keydown', tombol) })
onBeforeUnmount(() => { removeEventListener('resize', ulangUkur); removeEventListener('scroll', ulangUkur, true); removeEventListener('keydown', tombol) })

// Posisi kartu: di bawah/atas elemen; di HP selalu menempel di bawah layar
const hp = computed(() => lebarLayar.value < 640)
const gayaKartu = computed(() => {
  if (hp.value || !kotak.value) return null
  const k = kotak.value, L = 360
  const left = Math.max(12, Math.min(k.left, lebarLayar.value - L - 12))
  const bawah = k.top + k.height + 12
  if (bawah + 220 < tinggiLayar.value) return { top: `${bawah}px`, left: `${left}px`, width: `${L}px` }
  return { top: `${Math.max(12, k.top - 12)}px`, left: `${left}px`, width: `${L}px`, transform: 'translateY(-100%)' }
})

// Tawaran tur pertama kali
const tawaran = ref(null)
watch(() => route.path, (path) => {
  tawaran.value = null
  if (p.aktif) return
  const k = turUntukRute(path)
  if (!k || !p.bolehTawar(k)) return
  const t = TUR[k]
  if (t.peran && !auth.punyaPeran(...t.peran)) return
  setTimeout(() => { if (!p.aktif && turUntukRute(route.path) === k) tawaran.value = k }, 900)
}, { immediate: true })
function terimaTawaran() { const k = tawaran.value; tawaran.value = null; p.mulai(k) }
function ingatkanLagi() { p.ingatkanLagi(tawaran.value); tawaran.value = null }   // tawarkan lagi besok
function janganLagi() { p.tandai(tawaran.value); tawaran.value = null }             // tur menu ini tidak ditawarkan lagi
function matikanSemua() { p.aturTawaran(false); tawaran.value = null }              // semua tawaran mati (aktifkan lagi di Panduan)
</script>

<template>
  <Teleport to="body">
    <!-- Tur berjalan -->
    <div v-if="p.aktif && step" class="tanpa-cetak fixed inset-0 z-[70]" role="dialog" aria-modal="true" :aria-label="`Panduan: ${p.tur.judul}`">
      <div v-if="!kotak" class="absolute inset-0 bg-slate-900/55" @click="p.selesai()" />
      <div v-else class="pointer-events-none absolute rounded-xl ring-4 ring-[#F5B21B] transition-all duration-200"
           :style="{ top: kotak.top + 'px', left: kotak.left + 'px', width: kotak.width + 'px', height: kotak.height + 'px', boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)' }" />
      <div :class="['absolute rounded-2xl bg-white p-4 shadow-2xl dark:bg-[#1B2436]', hp || !kotak ? 'inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[380px] sm:-translate-x-1/2 sm:-translate-y-1/2' : '']" :style="gayaKartu">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" :style="{ background: p.tur.warna }"><Ikon :nama="p.tur.ikon" :ukuran="19" /></span>
          <div class="min-w-0 flex-1">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ p.tur.judul }} · {{ p.langkah + 1 }}/{{ p.tur.langkah.length }}</p>
            <h3 class="font-bold">{{ step.judul }}</h3>
          </div>
          <button class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup panduan" @click="p.selesai()"><Ikon nama="X" :ukuran="17" /></button>
        </div>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ step.isi }}</p>
        <div class="mt-3 flex items-center gap-2">
          <div class="flex flex-1 gap-1">
            <span v-for="(x, i) in p.tur.langkah" :key="i" :class="['h-1.5 rounded-full transition-all', i === p.langkah ? 'w-5 bg-biru' : 'w-1.5 bg-slate-300 dark:bg-slate-600']" />
          </div>
          <button v-if="p.langkah > 0" class="tombol-garis px-3 py-2 text-sm" @click="p.kembali()"><Ikon nama="ChevronLeft" :ukuran="16" /></button>
          <button class="tombol-utama px-4 py-2 text-sm" @click="p.lanjut()">{{ terakhir ? 'Selesai' : 'Lanjut' }} <Ikon :nama="terakhir ? 'Check' : 'ChevronRight'" :ukuran="16" /></button>
        </div>
      </div>
    </div>

    <!-- Tawaran tur -->
    <Transition enter-from-class="translate-y-4 opacity-0" leave-to-class="translate-y-4 opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-if="tawaran && !p.aktif" class="tanpa-cetak fixed bottom-24 right-4 z-[65] w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl lg:bottom-6 dark:border-slate-700 dark:bg-[#1B2436]">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" :style="{ background: TUR[tawaran].warna }"><Ikon nama="Compass" :ukuran="19" /></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold">Panduan: {{ TUR[tawaran].judul }}</p>
            <p class="text-xs text-slate-500">{{ TUR[tawaran].langkah.length }} langkah singkat untuk menu ini.</p>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button class="tombol-garis px-2 py-1.5 text-xs" @click="ingatkanLagi"><Ikon nama="Clock" :ukuran="14" class="text-[#B7820A]" /> Ingatkan lagi</button>
          <button class="tombol-utama px-2 py-1.5 text-xs" @click="terimaTawaran"><Ikon nama="Play" :ukuran="14" /> Ikuti tur</button>
        </div>
        <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
          <button class="font-semibold text-slate-500 hover:underline" @click="janganLagi">Jangan tampilkan lagi</button>
          <button class="font-semibold text-rose-600 hover:underline" @click="matikanSemua">Matikan semua tawaran</button>
        </div>
        <p class="mt-1.5 text-[11px] text-slate-400">Bisa diaktifkan kembali di Pengaturan → Panduan Input, atau tekan <b>?</b> di atas kapan saja.</p>
      </div>
    </Transition>
  </Teleport>
</template>
