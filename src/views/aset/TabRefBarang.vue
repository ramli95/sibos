<script setup>
// Referensi Barang Modal ARKAS 2025 (±1.700 barang berharga & berekening): cari kode barang untuk KIB.
import { ref, computed, onMounted } from 'vue'
import { muatRefBarangModal } from '@/services/aset'
import { cariRefBarang, golongan } from '@/utils/aset'
import { GOLONGAN_KIB } from '@/config/aset'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const ref_ = ref([])
const galat = ref('')
const cari = ref('')
const gol = ref('')
onMounted(async () => { try { ref_.value = await muatRefBarangModal() } catch (e) { galat.value = e.message } })
const hasil = computed(() => cariRefBarang(gol.value ? ref_.value.filter((x) => golongan(x.kode_barang, x.kode_rekening) === gol.value) : ref_.value, cari.value, 150))
const disalin = ref('')
async function salin(x) { try { await navigator.clipboard.writeText(x.kode_barang); disalin.value = x.kode_barang + x.spesifikasi } catch { /* abaikan */ } }
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="BookMarked" :ukuran="19" /></span>
      <div class="relative min-w-[12rem] flex-1">
        <Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" type="search" class="masukan py-2 pl-9" placeholder="Cari: laptop, meja siswa, 5.2.02.10…" aria-label="Cari referensi barang modal" />
      </div>
      <select v-model="gol" class="masukan w-auto py-2" aria-label="Golongan"><option value="">Semua golongan</option><option v-for="(v, k) in GOLONGAN_KIB" :key="k" :value="k">{{ v.judul }}</option></select>
    </div>
    <p class="text-xs text-slate-500">Sumber: Referensi Barang Modal – Manajemen Aplikasi RKAS (ARKAS) 2025. {{ ref_.length.toLocaleString('id-ID') }} barang berharga & berkode rekening. Menampilkan maks. 150 hasil.</p>
    <div v-if="galat" class="kartu p-4 text-sm text-rose-600">{{ galat }}</div>
    <section class="kartu divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
      <div v-for="x in hasil" :key="x.kode_barang + x.spesifikasi" class="flex items-start gap-3 p-3">
        <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ikon-chip-tosca text-xs font-bold">{{ golongan(x.kode_barang, x.kode_rekening) }}</span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold">{{ x.nama }}</p>
          <p v-if="x.spesifikasi" class="line-clamp-2 text-xs text-slate-500">{{ x.spesifikasi }}</p>
          <p class="kode text-xs text-slate-400">{{ x.kode_barang }} · rek. {{ x.kode_rekening }}</p>
        </div>
        <div class="shrink-0 text-right">
          <p class="angka text-sm font-bold">{{ rupiah(x.harga) }}</p><p class="text-xs text-slate-500">/{{ x.satuan }}</p>
          <button class="mt-1 text-xs font-semibold text-biru" @click="salin(x)"><Ikon :nama="disalin === x.kode_barang + x.spesifikasi ? 'Check' : 'Copy'" :ukuran="12" class="inline" /> Kode</button>
        </div>
      </div>
      <p v-if="ref_.length && !hasil.length" class="p-8 text-center text-sm text-slate-500">Tidak ditemukan.</p>
      <p v-if="!ref_.length && !galat" class="p-8 text-center text-sm text-slate-500">Memuat referensi…</p>
    </section>
  </div>
</template>
