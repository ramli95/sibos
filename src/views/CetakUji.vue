<script setup>
// Halaman uji cetak (dibuka dari Dasbor / Pengaturan) — memakai jendela pratinjau cetak.
import { useRouter } from 'vue-router'
import JendelaUjiCetak from '@/components/cetak/JendelaUjiCetak.vue'
const router = useRouter()
const tutup = () => (history.length > 1 ? router.back() : router.replace('/pengaturan/cetak'))
</script>

<template>
  <div class="min-h-dvh bg-slate-900"><JendelaUjiCetak @tutup="tutup" /></div>
</template>
