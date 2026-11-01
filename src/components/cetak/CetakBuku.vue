<script setup>
// Jendela pratinjau untuk buku kas/pajak: F4 (bawaan mendatar), Times New Roman, kop, tanda tangan KS & Bendahara
// pada tanggal dokumen (pejabat yang menjabat pada tanggal itu).
import { ref, computed, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { PEJABAT_CONTOH } from '@/config/sekolahAwal'
import JendelaCetak from './JendelaCetak.vue'
import DokBuku from './DokBuku.vue'

const props = defineProps({
  judul: { type: String, required: true },
  namaBerkas: String,
  subjudul: String,
  identitas: { type: Array, default: () => [] },
  kolom: { type: Array, required: true },
  baris: { type: Array, required: true },
  ringkasan: { type: Array, default: () => [] },
  tanggal: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  orientasi: { type: String, default: 'landscape' },
  excel: Boolean,
  kecil: Boolean,
  nomor: { type: Boolean, default: true },
  warnaBaris: Function,
  // Penanda tangan: { jabatan, label } (pejabat per tanggal) atau { label, pejabat: { nama, gelar, nip } }
  ttdKiri: { type: Object, default: () => ({ jabatan: 'kepala_sekolah', label: 'Mengetahui, Kepala Sekolah' }) },
  ttdKanan: { type: Object, default: () => ({ jabatan: 'bendahara_bosp', label: 'Bendahara BOSP' }) },
  ttdTengah: { type: Object, default: null },
})
const emit = defineEmits(['tutup', 'excel'])
const profil = ref(null)
const pejabat = ref([])
const pakaiTtd = ref(true)
onMounted(async () => {
  profil.value = await muatProfilSekolah()
  pejabat.value = modePratinjau ? PEJABAT_CONTOH : await muatPejabat().catch(() => [])
})
const isi = (x) => (x ? { label: x.label, pejabat: x.pejabat || (x.jabatan ? pejabatPada(pejabat.value, x.jabatan, props.tanggal) : null) } : null)
const ttd = computed(() => (pakaiTtd.value ? { kiri: isi(props.ttdKiri), kanan: isi(props.ttdKanan), tengah: isi(props.ttdTengah) } : null))
</script>

<template>
  <JendelaCetak :judul="props.judul" :nama-berkas="props.namaBerkas || props.judul" :orientasi="props.orientasi" :excel="props.excel" @tutup="emit('tutup')" @excel="emit('excel')">
    <template #alat>
      <button type="button" @click="pakaiTtd = !pakaiTtd" :class="['rounded-xl px-3 py-2 text-sm font-semibold', pakaiTtd ? 'bg-white text-arang' : 'bg-white/10 text-white/80 hover:text-white']">
        {{ pakaiTtd ? '✓ ' : '' }}Tanda tangan
      </button>
      <slot name="alat" />
    </template>
    <DokBuku v-if="profil" :profil="profil" :judul="props.judul" :subjudul="props.subjudul" :identitas="props.identitas" :kolom="props.kolom" :baris="props.baris"
             :ringkasan="props.ringkasan" :ttd="ttd" :tanggal="props.tanggal" :kecil="props.kecil" :nomor="props.nomor" :warna-baris="props.warnaBaris"><slot /></DokBuku>
  </JendelaCetak>
</template>
