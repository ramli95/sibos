<script setup>
import { useTema } from '@/stores/tema'
import PesanSingkat from '@/components/PesanSingkat.vue'
import PembaruanAplikasi from '@/components/PembaruanAplikasi.vue'

useTema()
</script>

<template>
  <RouterView />
  <PesanSingkat />
  <PembaruanAplikasi />
</template>
