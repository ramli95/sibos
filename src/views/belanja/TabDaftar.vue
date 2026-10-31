<script setup>
import { ref, computed } from 'vue'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { STATUS, KATEGORI_LABEL, JENIS_HONOR } from '@/config/belanja'
import { rupiah, rupiahRingkas, tanggalPendek, NAMA_BULAN, dariIso } from '@/utils/format'
import { tanggalRealisasi } from '@/utils/belanja'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import KartuBelanja from './KartuBelanja.vue'
import CetakDaftar from '@/components/cetak/CetakDaftar.vue'

const props = defineProps({ jenis: { type: String, default: 'pengadaan' } })
const belanja = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()
const honor = computed(() => props.jenis === 'honor')

const cari = ref('')
const bulan = ref('')
const saring = ref('semua')

const sumber = computed(() => belanja.daftar.filter((b) => (honor.value ? b.jenis === 'honor' : b.jenis !== 'honor')))
const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return sumber.value
    .filter((b) => saring.value === 'semua' || (saring.value === 'belum_lengkap' ? (b.persen_lengkap || 0) < 100 : saring.value === 'siplah' ? b.cara === 'siplah' : b.status === saring.value))
    .filter((b) => bulan.value === '' || dariIso(tanggalRealisasi(b))?.getMonth() === Number(bulan.value))
    .filter((b) => !q || [b.nama_pekerjaan, b.rekanan?.nama_usaha, ...(b.penerima || []).map((p) => p.nama), ...Object.values(b.nomor || {}), ...Object.values(b.bnu || {})].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => String(tanggalRealisasi(b)).localeCompare(String(tanggalRealisasi(a))))
})

const statistik = computed(() => {
  const d = sumber.value
  const jml = (arr) => arr.reduce((s, b) => s + (b.total || 0), 0)
  const lunas = d.filter((b) => b.status === 'lunas')
  const belum = d.filter((b) => b.status !== 'lunas')
  const kurang = d.filter((b) => (b.persen_lengkap || 0) < 100)
  const pr = (x) => (d.length ? Math.round((x / d.length) * 100) : 0)
  return [
    { judul: honor.value ? 'Honor & transpor' : 'Semua belanja', nilai: rupiahRingkas(jml(d)), ikon: honor.value ? 'Wallet' : 'ShoppingCart', nada: 'gelap', s: 'semua', sub: `${d.length} transaksi`, ringkas: true },
    { judul: 'Lunas', nilai: rupiahRingkas(jml(lunas)), ikon: 'BadgeCheck', nada: 'sukses', s: 'lunas', sub: `${lunas.length} transaksi`, persen: pr(lunas.length), ringkas: true },
    { judul: 'Belum lunas', nilai: belum.length, ikon: 'Clock', nada: belum.length ? 'peringatan' : 'primer', s: honor.value ? 'dipesan' : 'diterima', sub: rupiah(jml(belum)) },
    { judul: 'Belum lengkap', nilai: kurang.length, ikon: 'ListChecks', nada: kurang.length ? 'peringatan' : 'sukses', s: 'belum_lengkap', sub: 'Arsip/foto/BNU kurang', persen: pr(d.length - kurang.length) },
  ]
})

const chip = computed(() => [
  ['semua', 'Semua', 'Layers'],
  ...Object.entries(STATUS).filter(([k]) => !honor.value || ['draf', 'dipesan', 'lunas'].includes(k)).map(([k, v]) => [k, v.label, v.ikon]),
  ...(honor.value ? [] : [['siplah', 'SIPLah', 'ShoppingBag']]),
  ['belum_lengkap', 'Belum lengkap', 'ListChecks'],
])

const cetakTerbuka = ref(false)
const kolomCetak = computed(() => [
  { judul: 'Tanggal', nilai: (b) => tanggalPendek(tanggalRealisasi(b)), lebar: '2.2cm' },
  { judul: honor.value ? 'Kegiatan' : 'Pekerjaan', nilai: (b) => b.nama_pekerjaan },
  { judul: honor.value ? 'Jenis' : 'Penyedia', nilai: (b) => (honor.value ? JENIS_HONOR[b.jenis_honor]?.label : b.rekanan?.nama_usaha) || '', lebar: '4.5cm' },
  { judul: 'Kategori', nilai: (b) => KATEGORI_LABEL[b.kategori] || '', lebar: '2.8cm' },
  { judul: 'BNU', nilai: (b) => Object.values(b.bnu || {}).filter(Boolean).join(', '), lebar: '2.6cm' },
  { judul: 'Status', nilai: (b) => STATUS[b.status]?.label || '', lebar: '1.9cm' },
  { judul: 'Jumlah (Rp)', nilai: (b) => rupiah(b.total, { tanpaRp: true }), lebar: '3cm', rata: 'kanan' },
])
async function ekspor() {
  const kolom = [
    { judul: 'Tanggal', lebar: 12, nilai: (b) => tanggalPendek(tanggalRealisasi(b)) },
    { kunci: 'nama_pekerjaan', judul: honor.value ? 'Kegiatan' : 'Pekerjaan', lebar: 40 },
    { judul: honor.value ? 'Jenis' : 'Penyedia', lebar: 28, nilai: (b) => (honor.value ? JENIS_HONOR[b.jenis_honor]?.label : b.rekanan?.nama_usaha) || '' },
    { judul: 'Cara', lebar: 12, nilai: (b) => (b.jenis === 'honor' ? '-' : b.cara === 'siplah' ? 'SIPLah' : 'Non-SIPLah') },
    { judul: 'Kategori', lebar: 16, nilai: (b) => KATEGORI_LABEL[b.kategori] || '' },
    { judul: 'Kode Rekening', lebar: 30, nilai: (b) => [...new Set((b.item || []).map((i) => `${i.kode_kegiatan} ${i.kode_rekening}`))].join('; ') },
    { judul: 'BNU', lebar: 14, nilai: (b) => Object.values(b.bnu || {}).filter(Boolean).join(', ') },
    { judul: 'Status', lebar: 10, nilai: (b) => STATUS[b.status]?.label || '' },
    { kunci: 'total', judul: 'Jumlah', lebar: 16, jenis: 'uang' },
    { judul: 'Kelengkapan (%)', lebar: 12, nilai: (b) => b.persen_lengkap || 0 },
  ]
  try { await eksporExcel({ judul: honor.value ? 'Daftar Honor & Transpor' : 'Daftar Belanja', kolom, baris: hasil.value, namaBerkas: `${honor.value ? 'Honor & Transpor' : 'Daftar Belanja'} ${belanja.tahun}` }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="belanja.memuat" :aktif="(s) => saring === s.s && s.s !== 'semua'" @klik="(s) => (saring = s.s)" />

    <div class="kartu space-y-3 p-3">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-[13rem] flex-1">
          <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="cari" class="masukan pl-9" :placeholder="honor ? 'Cari kegiatan, nama penerima, BNU…' : 'Cari pekerjaan, penyedia, nomor, BNU…'" />
        </div>
        <label class="sr-only" for="bulan-belanja">Bulan</label>
        <select id="bulan-belanja" v-model="bulan" class="masukan w-auto py-2.5">
          <option value="">Semua bulan</option>
          <option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option>
        </select>
        <button class="tombol-garis" @click="cetakTerbuka = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Cetak / Unduh</span></button>
      </div>
      <div class="tanpa-penggulir flex gap-1.5 overflow-x-auto">
        <button v-for="[k, l, ik] in chip" :key="k" type="button" @click="saring = k"
                :class="['flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                         saring === k ? 'border-biru bg-biru text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300']">
          <Ikon :nama="ik" :ukuran="13" /> {{ l }}
        </button>
      </div>
    </div>

    <div v-if="belanja.memuat && !belanja.daftar.length" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
    <div v-else-if="!hasil.length" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl ikon-chip"><Ikon :nama="honor ? 'Wallet' : 'ShoppingCart'" :ukuran="26" /></span>
      <p class="font-semibold">{{ sumber.length ? 'Tidak ada yang cocok.' : honor ? 'Belum ada honor/transpor.' : 'Belum ada belanja.' }}</p>
      <RouterLink v-if="!sumber.length && auth.isAdmin" :to="honor ? '/belanja/honor/baru' : '/belanja/baru'" class="tombol-utama"><Ikon nama="CirclePlus" :ukuran="17" /> {{ honor ? 'Catat honor/transpor' : 'Catat belanja pertama' }}</RouterLink>
    </div>
    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KartuBelanja v-for="b in hasil" :key="b.id" :b="b" />
    </div>

    <CetakDaftar v-if="cetakTerbuka" :judul="honor ? 'Daftar Honor dan Transpor' : 'Daftar Belanja'" :subjudul="`Tahun Anggaran ${belanja.tahun}`" :kolom="kolomCetak" :baris="hasil" excel
                 @tutup="cetakTerbuka = false" @excel="ekspor" />
  </div>
</template>
