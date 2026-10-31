<script setup>
// Memberi tahu bila versi SIBOS baru tersedia (PWA) dan bila koneksi terputus.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import Ikon from './Ikon.vue'

const adaPembaruan = ref(false)
const luring = ref(!navigator.onLine)
let perbarui = () => {}

const setOnline = () => (luring.value = false)
const setOffline = () => (luring.value = true)

onMounted(() => {
  perbarui = registerSW({ onNeedRefresh: () => (adaPembaruan.value = true) })
  addEventListener('online', setOnline)
  addEventListener('offline', setOffline)
})
onBeforeUnmount(() => { removeEventListener('online', setOnline); removeEventListener('offline', setOffline) })
</script>

<template>
  <div v-if="luring" class="tanpa-cetak fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-arang px-4 py-2 text-sm font-medium text-white shadow-lg">
    <Ikon nama="WifiOff" :ukuran="16" /> Sedang luring — perubahan disinkronkan saat online
  </div>
  <div v-if="adaPembaruan" class="tanpa-cetak fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-xl">
    <Ikon nama="RefreshCw" :ukuran="18" class="text-kuning" />
    <span>Versi SIBOS terbaru tersedia.</span>
    <button class="rounded-lg bg-white/15 px-3 py-1.5 font-semibold hover:bg-white/25" @click="perbarui(true)">Muat ulang</button>
  </div>
</template>
