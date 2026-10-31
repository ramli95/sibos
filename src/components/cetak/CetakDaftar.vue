<script setup>
// Pratinjau cetak/unduh untuk daftar (pegawai, rekanan, log, referensi): kop + tabel + tanda tangan opsional.
import { ref, computed, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { PEJABAT_AWAL } from '@/config/sekolahAwal'
import { tanggalPanjang } from '@/utils/format'
import JendelaCetak from './JendelaCetak.vue'
import DokumenTabel from './DokumenTabel.vue'

const props = defineProps({
  judul: { type: String, required: true },
  subjudul: String,
  kolom: { type: Array, required: true },
  baris: { type: Array, required: true },
  orientasi: { type: String, default: 'landscape' },
  tandaTangan: { type: Boolean, default: true },
  excel: Boolean,
})
const emit = defineEmits(['tutup', 'excel'])
const profil = ref(null)
const pejabat = ref([])
const pakaiTtd = ref(props.tandaTangan)

onMounted(async () => {
  profil.value = await muatProfilSekolah()
  pejabat.value = modePratinjau ? PEJABAT_AWAL : await muatPejabat().catch(() => [])
})
const hariIni = new Date().toISOString().slice(0, 10)
const ttd = computed(() => pakaiTtd.value ? {
  kiri: { label: 'Kepala Sekolah', pejabat: pejabatPada(pejabat.value, 'kepala_sekolah', hariIni) },
  kanan: { label: 'Bendahara BOSP', pejabat: pejabatPada(pejabat.value, 'bendahara_bosp', hariIni) },
} : null)
</script>

<template>
  <JendelaCetak :judul="props.judul" :orientasi="props.orientasi" :excel="props.excel" @tutup="emit('tutup')" @excel="emit('excel')">
    <template #alat>
      <button type="button" @click="pakaiTtd = !pakaiTtd"
              :class="['rounded-xl px-3 py-2 text-sm font-semibold', pakaiTtd ? 'bg-white text-arang' : 'bg-white/10 text-white/80 hover:text-white']">
        {{ pakaiTtd ? '✓ ' : '' }}Tanda tangan
      </button>
    </template>
    <DokumenTabel v-if="profil" :profil="profil" :judul="props.judul" :subjudul="props.subjudul || `Keadaan ${tanggalPanjang(new Date())}`"
                  :kolom="props.kolom" :baris="props.baris" :ttd="ttd" />
  </JendelaCetak>
</template>
