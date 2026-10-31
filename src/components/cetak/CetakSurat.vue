<script setup>
// Jendela pratinjau untuk surat/berita acara/lembar bebas (SPTJM, BAST barang, label QR):
// memuat profil sekolah & pejabat, lalu memberikannya ke slot { profil, pejabat(jabatan, tanggal) }.
import { ref, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { PEJABAT_CONTOH } from '@/config/sekolahAwal'
import JendelaCetak from './JendelaCetak.vue'

const props = defineProps({
  judul: { type: String, required: true },
  namaBerkas: String,
  orientasi: { type: String, default: 'portrait' },
  gantiOrientasi: { type: Boolean, default: false },
  excel: Boolean,
})
const emit = defineEmits(['tutup', 'excel'])
const profil = ref(null)
const daftar = ref([])
onMounted(async () => {
  profil.value = await muatProfilSekolah()
  daftar.value = modePratinjau ? PEJABAT_CONTOH : await muatPejabat().catch(() => [])
})
const pejabat = (jabatan, tanggal) => pejabatPada(daftar.value, jabatan, tanggal)
</script>

<template>
  <JendelaCetak :judul="props.judul" :nama-berkas="props.namaBerkas || props.judul" :orientasi="props.orientasi" :ganti-orientasi="props.gantiOrientasi" :excel="props.excel" @tutup="emit('tutup')" @excel="emit('excel')">
    <template #alat><slot name="alat" /></template>
    <slot v-if="profil" :profil="profil" :pejabat="pejabat" />
  </JendelaCetak>
</template>
