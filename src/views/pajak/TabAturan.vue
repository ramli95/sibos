<script setup>
// Aturan Tarif: tabel tarif & batas pajak yang bisa diubah Bendahara (bukan konstanta di kode).
import { ref, computed, watch } from 'vue'
import { useKas } from '@/stores/kas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanAturanPajak } from '@/services/kas'
import { salinAturan } from '@/utils/pajak'
import { ATURAN_PAJAK_AWAL, CARA_PAJAK, WARNA_PAJAK } from '@/config/pajak'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const kas = useKas()
const auth = useAuth()
const notif = useNotifikasi()
const a = ref(salinAturan(kas.aturan))
watch(() => kas.aturan, (v) => { a.value = salinAturan(v) })
const berubah = computed(() => JSON.stringify(a.value) !== JSON.stringify(kas.aturan))
const menyimpan = ref(false)

const BATAS = [
  ['non_pkp', 'Batas PPN & PPh 22 (Non-SIPLah)', 'Dipungut bila nilai transaksi lebih dari batas ini'],
  ['ptkp_bulan', 'PTKP bulanan honorer', 'Honor bulanan ≤ batas tidak dipotong PPh 21'],
  ['ptkp_hari', 'PTKP harian', 'Honor kegiatan per orang per hari ≤ batas tidak dipotong'],
  ['ptkp_tahun', 'PTKP setahun (rekap)', 'Pembanding rekap per penerima'],
]
function ringkas() {
  const lama = kas.aturan
  const ubah = a.value.tarif.filter((t) => { const l = lama.tarif.find((x) => x.kunci === t.kunci); return !l || l.tarif !== t.tarif || l.tarif_tanpa_npwp !== t.tarif_tanpa_npwp || l.aktif !== t.aktif || l.kata_kunci !== t.kata_kunci })
  const b = BATAS.filter(([k]) => lama.batas[k] !== a.value.batas[k]).map(([, l]) => l)
  return [...ubah.map((t) => `${t.judul} ${t.tarif}%`), ...b].join('; ')
}
async function simpan() {
  menyimpan.value = true
  try {
    const r = ringkas()
    await simpanAturanPajak(a.value, r)
    await kas.muat({ segar: true })
    notif.kabari('Aturan tarif tersimpan. Berlaku untuk perhitungan berikutnya; transaksi lama dapat diperiksa di Pajak Terutang → Perlu diperiksa.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
function bawaan() { if (confirm('Kembalikan semua tarif ke nilai bawaan?')) a.value = { ...salinAturan(ATURAN_PAJAK_AWAL), versi: a.value.versi } }
</script>

<template>
  <div class="space-y-5">
    <section class="kartu space-y-4 p-4 sm:p-5">
      <div>
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="Scale" :ukuran="17" /></span> Batas nilai</h2>
        <p class="mt-1 text-sm text-slate-500">Versi aturan {{ a.versi || 1 }}. Perubahan tercatat di Log Aktivitas.</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div v-for="[k, l, ket] in BATAS" :key="k">
          <label class="label" :for="`batas-${k}`">{{ l }}</label>
          <input :id="`batas-${k}`" v-model.number="a.batas[k]" type="number" class="masukan angka" :disabled="!auth.isAdmin" />
          <p class="mt-1 text-xs text-slate-500">{{ ket }} · {{ rupiah(a.batas[k]) }}</p>
        </div>
      </div>
    </section>

    <section class="kartu p-4 sm:p-5">
      <h2 class="mb-3 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Percent" :ukuran="17" /></span> Tabel tarif</h2>
      <div class="grid gap-3 lg:grid-cols-2">
        <div v-for="t in a.tarif" :key="t.kunci" :class="['space-y-2 rounded-xl border p-3', t.aktif === false ? 'border-dashed border-slate-300 opacity-60 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700']">
          <div class="flex items-start gap-2">
            <span :class="['lencana shrink-0', WARNA_PAJAK[t.jenis]]">{{ t.jenis }}</span>
            <div class="min-w-0 flex-1"><p class="text-sm font-semibold">{{ t.judul }}</p><p class="text-xs text-slate-500">{{ CARA_PAJAK[t.cara]?.label }} · KAP {{ t.kap }}-{{ t.kjs }}</p></div>
            <label class="flex shrink-0 items-center gap-1.5 text-xs"><input v-model="t.aktif" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" :disabled="!auth.isAdmin" /> Aktif</label>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label class="text-[11px] text-slate-500">Tarif %<input v-model.number="t.tarif" type="number" step="any" class="masukan angka py-1.5" :disabled="!auth.isAdmin" /></label>
            <label class="text-[11px] text-slate-500">Tanpa NPWP %<input v-model.number="t.tarif_tanpa_npwp" type="number" step="any" class="masukan angka py-1.5" :disabled="!auth.isAdmin" /></label>
            <label class="text-[11px] text-slate-500">KAP<input v-model="t.kap" class="masukan kode py-1.5" :disabled="!auth.isAdmin" /></label>
            <label class="text-[11px] text-slate-500">KJS<input v-model="t.kjs" class="masukan kode py-1.5" :disabled="!auth.isAdmin" /></label>
          </div>
          <label v-if="t.kata_kunci !== undefined" class="block text-[11px] text-slate-500">Kata kunci nama item<input v-model="t.kata_kunci" class="masukan py-1.5" :disabled="!auth.isAdmin" /></label>
          <p class="text-xs text-slate-500">{{ t.ket }}</p>
        </div>
      </div>
    </section>

    <div v-if="auth.isAdmin" class="sticky bottom-20 z-10 lg:bottom-4">
      <div class="kartu flex flex-wrap items-center gap-2 p-3 shadow-lg">
        <p class="min-w-0 flex-1 text-sm text-slate-500">{{ berubah ? 'Ada perubahan belum disimpan.' : 'Tarif sesuai yang tersimpan.' }}</p>
        <button class="tombol-garis" @click="bawaan"><Ikon nama="Undo2" :ukuran="16" class="text-biru" /> Bawaan</button>
        <button class="tombol-utama" :disabled="!berubah || menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan aturan</button>
      </div>
    </div>
  </div>
</template>
