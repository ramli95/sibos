<script setup>
// Tombol "Pasang SIBOS" (PWA). Di iPhone tidak ada dialog otomatis, jadi ditampilkan petunjuk.
import { ref, onMounted } from 'vue'
import Ikon from './Ikon.vue'

const tunda = ref(null)
const iPhone = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone
const petunjukIos = ref(false)

onMounted(() => {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); tunda.value = e })
  addEventListener('appinstalled', () => (tunda.value = null))
})

async function pasang() {
  if (tunda.value) { tunda.value.prompt(); await tunda.value.userChoice; tunda.value = null }
  else if (iPhone) petunjukIos.value = !petunjukIos.value
}
</script>

<template>
  <div v-if="tunda || iPhone" class="relative">
    <button type="button" @click="pasang" class="hidden items-center gap-2 rounded-xl bg-tosca/10 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-tosca/20 sm:flex dark:text-teal-300">
      <Ikon nama="Smartphone" :ukuran="16" /> Pasang SIBOS
    </button>
    <button type="button" @click="pasang" aria-label="Pasang SIBOS" class="grid h-10 w-10 place-items-center rounded-xl text-teal-600 hover:bg-slate-100 sm:hidden dark:hover:bg-slate-800">
      <Ikon nama="Download" :ukuran="20" />
    </button>
    <div v-if="petunjukIos" class="kartu absolute right-0 z-40 mt-2 w-64 p-3 text-sm">
      Ketuk ikon <b>Bagikan</b> di Safari, lalu pilih <b>Tambah ke Layar Utama</b>.
    </div>
  </div>
</template>
