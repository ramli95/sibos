<script setup>
// Rincian satu barang inventaris — halaman yang dibuka dari kode QR pada label barang.
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAset } from '@/stores/aset'
import { KELAS_BARANG, GOLONGAN_KIB, KONDISI } from '@/config/aset'
import { formatRegister } from '@/utils/aset'
import { rupiah, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const route = useRoute()
const router = useRouter()
const aset = useAset()
onMounted(() => aset.muat())
const a = computed(() => aset.aset.find((x) => x.id === route.params.id) || null)
const bast = computed(() => aset.bast.find((b) => b.id === a.value?.id_bast) || null)
const baris = computed(() => a.value ? [
  ['Kode barang', a.value.kode_barang || '(ekstrakomptabel)'], ['Nomor register', formatRegister(a.value) || '—'],
  ['Golongan', a.value.jenis === 'kib' ? GOLONGAN_KIB[a.value.golongan || 'B']?.judul : KELAS_BARANG.ekstra.label],
  ['Merk / tipe', a.value.merk || '—'], ['Spesifikasi', a.value.spesifikasi || '—'], ['Bahan', a.value.bahan || '—'],
  ['Jumlah', `${a.value.jumlah} ${a.value.satuan || ''}`], ['Harga satuan', rupiah(a.value.harga_satuan)], ['Nilai perolehan', rupiah(a.value.nilai)],
  ['Tanggal perolehan', tanggalPanjang(a.value.tgl_perolehan)], ['Asal usul', a.value.asal || '—'], ['Ruangan', aset.namaRuang(a.value.id_ruang) || 'Belum ditempatkan'],
  ['Dari belanja', a.value.nama_pekerjaan || '—'], ['Penyedia', a.value.penyedia || '—'], ['Keterangan', a.value.keterangan || '—'],
] : [])
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <button class="tombol-garis" @click="router.push('/barang/inventaris')"><Ikon nama="ArrowLeft" :ukuran="16" /> Inventaris</button>
    <div v-if="aset.memuat && !a" class="kartu p-8 text-center text-sm text-slate-500">Memuat…</div>
    <div v-else-if="!a" class="kartu p-8 text-center text-sm text-slate-500">Barang tidak ditemukan atau sudah dihapus dari inventaris.</div>
    <template v-else>
      <div class="kartu flex items-center gap-4 p-5">
        <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white" :style="{ background: KELAS_BARANG[a.jenis]?.warna }"><Ikon :nama="KELAS_BARANG[a.jenis]?.ikon || 'Boxes'" :ukuran="26" /></span>
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-extrabold">{{ a.nama }}</h1>
          <p class="kode text-sm text-slate-500">{{ a.kode_barang || 'Ekstrakomptabel' }} · Reg. {{ formatRegister(a) }}</p>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <span :class="['lencana', KONDISI[a.kondisi]?.lencana]">{{ KONDISI[a.kondisi]?.label }}</span>
            <span v-if="a.status === 'dihapus'" class="lencana bg-slate-200 text-slate-700">Dihapus</span>
            <span v-if="bast" class="lencana bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"><Ikon nama="PackageCheck" :ukuran="12" /> Diserahkan {{ tanggalPanjang(bast.tanggal) }}</span>
          </div>
        </div>
      </div>
      <dl class="kartu divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="[l, v] in baris" :key="l" class="grid grid-cols-[9rem_1fr] gap-3 px-5 py-2.5 text-sm"><dt class="text-slate-500">{{ l }}</dt><dd class="font-medium">{{ v }}</dd></div>
      </dl>
      <p v-if="bast" class="kartu p-4 text-sm"><Ikon nama="FileSignature" :ukuran="15" class="inline text-[#22A08D]" /> BAST {{ bast.nomor }} kepada Pengurus Barang.</p>
    </template>
  </div>
</template>
