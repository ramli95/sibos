<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
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
import WaTransaksi from '@/components/WaTransaksi.vue'
import CetakDaftar from '@/components/cetak/CetakDaftar.vue'

const props = defineProps({ jenis: { type: String, default: 'pengadaan' } })
const belanja = useBelanja()
const waB = ref(null)
const router = useRouter()
const auth = useAuth()
const notif = useNotifikasi()
const honor = computed(() => props.jenis === 'honor')

const cari = ref('')
const bulan = ref('')
const saring = ref('semua')
// Tampilan daftar: kartu atau baris (diingat per perangkat)
const KUNCI_TAMPIL = 'sibos.tampilanBelanja'
const tampilan = ref((() => { try { return localStorage.getItem(KUNCI_TAMPIL) || 'kartu' } catch { return 'kartu' } })())
function gantiTampilan(t) { tampilan.value = t; try { localStorage.setItem(KUNCI_TAMPIL, t) } catch { /* abaikan */ } }

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
        <div class="flex gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Tampilan daftar">
          <button v-for="[k, ik, j] in [['kartu', 'LayoutGrid', 'Kartu'], ['baris', 'Rows3', 'Baris']]" :key="k" type="button" :title="j" :aria-pressed="tampilan === k"
                  :class="['grid h-8 w-9 place-items-center rounded-lg', tampilan === k ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']" @click="gantiTampilan(k)"><Ikon :nama="ik" :ukuran="16" /></button>
        </div>
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
    <div v-else-if="tampilan === 'kartu'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KartuBelanja v-for="b in hasil" :key="b.id" :b="b" @wa="waB = $event" />
    </div>
    <div v-else class="kartu overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60">
          <tr><th class="p-2.5 text-left">Tanggal</th><th class="p-2.5 text-left">{{ honor ? 'Kegiatan' : 'Pekerjaan' }}</th><th class="p-2.5 text-left">{{ honor ? 'Jenis' : 'Penyedia' }}</th><th class="p-2.5 text-left">BNU</th><th class="p-2.5">Status</th><th class="p-2.5">Lengkap</th><th class="p-2.5 text-right">Jumlah</th></tr>
        </thead>
        <tbody>
          <tr v-for="b in hasil" :key="b.id" class="cursor-pointer border-t border-slate-100 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50" @click="router.push(`/belanja/lihat/${b.id}`)">
            <td class="whitespace-nowrap p-2.5 text-slate-500">{{ tanggalPendek(tanggalRealisasi(b)) || '—' }}</td>
            <td class="p-2.5"><span class="line-clamp-1 font-semibold">{{ b.nama_pekerjaan || 'Tanpa nama' }}</span>
              <span v-if="b.cara === 'siplah'" class="lencana mt-0.5 bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300"><Ikon nama="ShoppingBag" :ukuran="11" /> SIPLah{{ b.mitra_siplah ? ` · ${b.mitra_siplah}` : '' }}</span></td>
            <td class="p-2.5"><span class="line-clamp-1">{{ honor ? `${JENIS_HONOR[b.jenis_honor]?.label || 'Honor'} · ${(b.penerima || []).length} org` : b.rekanan?.nama_usaha || '—' }}</span></td>
            <td class="kode whitespace-nowrap p-2.5 text-xs">{{ Object.values(b.bnu || {}).filter(Boolean).join(', ') || '—' }}</td>
            <td class="p-2.5 text-center"><span :class="['lencana', (STATUS[b.status] || STATUS.draf).lencana]"><Ikon :nama="(STATUS[b.status] || STATUS.draf).ikon" :ukuran="11" /> {{ (STATUS[b.status] || STATUS.draf).label }}</span></td>
            <td class="p-2.5"><div class="flex items-center gap-1.5"><div class="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div :class="['h-full rounded-full', (b.persen_lengkap || 0) === 100 ? 'bg-emerald-500' : (b.persen_lengkap || 0) >= 60 ? 'bg-biru' : 'bg-amber-500']" :style="{ width: Math.max(b.persen_lengkap || 0, 4) + '%' }" /></div><span class="text-[11px] text-slate-500">{{ b.persen_lengkap || 0 }}%</span></div></td>
            <td class="angka whitespace-nowrap p-2.5 text-right font-bold">{{ rupiah(b.total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <CetakDaftar v-if="cetakTerbuka" :judul="honor ? 'Daftar Honor dan Transpor' : 'Daftar Belanja'" :subjudul="`Tahun Anggaran ${belanja.tahun}`" :kolom="kolomCetak" :baris="hasil" excel
                 @tutup="cetakTerbuka = false" @excel="ekspor" />
    <WaTransaksi v-if="waB" :b="waB" @ubah="waB = $event" @tutup="waB = null" />
  </div>
</template>
