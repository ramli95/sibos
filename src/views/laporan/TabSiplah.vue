<script setup>
// Rekap transaksi belanja melalui SIPLah: per mitra marketplace dan daftar transaksi (No. SP/BAST/Invoice mitra, BNU).
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { rekapSiplah, akhirBulanIso } from '@/utils/laporan'
import { PERIODE_BUKU } from '@/config/laporan'
import { STATUS, KATEGORI_LABEL } from '@/config/belanja'
import { rupiah, rupiahRingkas, tanggalPendek } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const kas = useKas()
const belanja = useBelanja()
const notif = useNotifikasi()
const router = useRouter()

const periode = ref('tahun')
const hanyaLunas = ref(false)
const mitra = ref('')
const per = computed(() => PERIODE_BUKU.find((p) => p[0] === periode.value) || PERIODE_BUKU[0])
const rekap = computed(() => rekapSiplah(belanja.daftar, { dari: per.value[2], sampai: per.value[3], hanyaLunas: hanyaLunas.value }))
const baris = computed(() => rekap.value.baris.filter((r) => !mitra.value || r.mitra === mitra.value))
const totalSemua = computed(() => belanja.daftar.filter((b) => b.jenis !== 'honor' && b.status === 'lunas' && b.tgl_lunas).reduce((s, b) => s + (b.total || 0), 0))
const WARNA = ['#2563eb', '#f97316', '#0d9488', '#7c3aed', '#E3A414', '#db2777', '#64748b']

const statistik = computed(() => {
  const r = rekap.value
  const lunas = r.baris.filter((x) => x.status === 'lunas')
  const nLunas = lunas.reduce((s, x) => s + x.nilai, 0)
  return [
    { judul: 'Belanja SIPLah', nilai: rupiahRingkas(r.total), sub: `${r.baris.length} transaksi`, ikon: 'ShoppingBag', nada: 'gelap', ringkas: true },
    { judul: 'Sudah lunas', nilai: rupiahRingkas(nLunas), sub: `${lunas.length} transaksi`, ikon: 'BadgeCheck', nada: 'sukses', ringkas: true },
    { judul: 'Mitra dipakai', nilai: r.perMitra.length, sub: r.perMitra[0] ? `Terbesar: ${r.perMitra[0].mitra}` : '—', ikon: 'Store', nada: 'primer' },
    { judul: 'Porsi SIPLah', nilai: totalSemua.value ? `${Math.round((nLunas / totalSemua.value) * 100)}%` : '0%', sub: 'dari belanja barang/jasa lunas', ikon: 'ChartPie', nada: 'primer', persen: totalSemua.value ? Math.round((nLunas / totalSemua.value) * 100) : 0 },
  ]
})

const cetak = ref(false)
const judulCetak = computed(() => `Rekapitulasi Belanja melalui SIPLah${mitra.value ? ` — ${mitra.value}` : ''}`)
const subCetak = computed(() => `Periode ${per.value[1]} Tahun Anggaran ${kas.tahun}`)
const kolomCetak = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2.1cm', rata: 'tengah' },
  { judul: 'Mitra SIPLah', nilai: (r) => r.mitra, lebar: '2.6cm' },
  { judul: 'Penyedia', nilai: (r) => r.penyedia, lebar: '3.6cm' },
  { judul: 'Pekerjaan', nilai: (r) => r.pekerjaan },
  { judul: 'No. SP / BAST / Invoice', nilai: (r) => [r.nomor_sp, r.nomor_bast, r.nomor_invoice].filter(Boolean).join(' / '), lebar: '4.2cm' },
  { judul: 'BNU', nilai: (r) => r.bnu, lebar: '1.9cm', rata: 'tengah' },
  { judul: 'Status', nilai: (r) => STATUS[r.status]?.label || '', lebar: '1.7cm', rata: 'tengah' },
  { judul: 'Pajak', nilai: (r) => r.pajak, lebar: '2.4cm', uang: true, jumlah: true },
  { judul: 'Nilai (Rp)', nilai: (r) => r.nilai, lebar: '2.8cm', uang: true, jumlah: true },
]
const ringkasCetak = computed(() => rekap.value.perMitra.filter((m) => !mitra.value || m.mitra === mitra.value).map((m) => [`${m.mitra} (${m.transaksi} transaksi)`, m.nilai]))
async function excel() {
  try {
    await eksporExcel({
      judul: `${judulCetak.value} — ${subCetak.value}`,
      kolom: [
        { judul: 'Tanggal', lebar: 12, nilai: (r) => tanggalPendek(r.tanggal) }, { kunci: 'mitra', judul: 'Mitra SIPLah', lebar: 18 }, { kunci: 'penyedia', judul: 'Penyedia', lebar: 28 },
        { kunci: 'npwp', judul: 'NPWP', lebar: 22 }, { kunci: 'pekerjaan', judul: 'Pekerjaan', lebar: 40 }, { kunci: 'nomor_sp', judul: 'No. SP/PO', lebar: 20 },
        { kunci: 'nomor_bast', judul: 'No. BAST', lebar: 20 }, { kunci: 'nomor_invoice', judul: 'No. Invoice', lebar: 20 }, { kunci: 'bnu', judul: 'BNU', lebar: 12 },
        { judul: 'Kategori', lebar: 14, nilai: (r) => KATEGORI_LABEL[r.kategori] || '' }, { judul: 'Status', lebar: 10, nilai: (r) => STATUS[r.status]?.label || '' },
        { kunci: 'pajak', judul: 'Pajak', lebar: 14, jenis: 'uang' }, { kunci: 'nilai', judul: 'Nilai', lebar: 16, jenis: 'uang' },
      ],
      baris: baris.value, namaBerkas: `Rekap SIPLah ${per.value[1]} ${kas.tahun}`,
    })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="belanja.memuat" />

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <Ikon nama="CalendarRange" :ukuran="18" class="text-[#22A08D]" />
      <label class="sr-only" for="periode-siplah">Periode</label>
      <select id="periode-siplah" v-model="periode" class="masukan w-auto py-2">
        <optgroup label="Periode"><option v-for="x in PERIODE_BUKU.slice(0, 7)" :key="x[0]" :value="x[0]">{{ x[1] }}</option></optgroup>
        <optgroup label="Bulan"><option v-for="x in PERIODE_BUKU.slice(7)" :key="x[0]" :value="x[0]">{{ x[1] }}</option></optgroup>
      </select>
      <button type="button" :class="['flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold', hanyaLunas ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300']" @click="hanyaLunas = !hanyaLunas">
        <Ikon nama="BadgeCheck" :ukuran="13" /> Hanya lunas
      </button>
      <button class="tombol-garis ml-auto" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> Cetak / Unduh</button>
    </div>

    <!-- Per mitra -->
    <div class="kartu p-4">
      <h2 class="mb-3 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="Store" :ukuran="16" /></span> Per mitra SIPLah <span class="text-xs font-normal text-slate-500">— klik untuk menyaring</span></h2>
      <p v-if="!rekap.perMitra.length" class="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800/50">Belum ada belanja SIPLah pada periode ini.</p>
      <div v-else class="space-y-2">
        <button v-for="(m, i) in rekap.perMitra" :key="m.mitra" type="button" @click="mitra = mitra === m.mitra ? '' : m.mitra"
                :class="['block w-full rounded-xl p-2 text-left transition', mitra === m.mitra ? 'bg-blue-50 ring-1 ring-biru dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50']">
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="flex min-w-0 items-center gap-2"><span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: WARNA[i % WARNA.length] }" /><b class="truncate">{{ m.mitra }}</b><span class="text-xs text-slate-500">{{ m.transaksi }} transaksi</span></span>
            <b class="angka shrink-0">{{ rupiah(m.nilai) }}</b>
          </div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: (rekap.total ? (m.nilai / rekap.total) * 100 : 0) + '%', background: WARNA[i % WARNA.length] }" /></div>
        </button>
      </div>
    </div>

    <!-- Daftar transaksi -->
    <div class="kartu overflow-hidden">
      <div class="flex items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="ListChecks" :ukuran="16" /></span> Transaksi</h2>
        <span v-if="mitra" class="lencana bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300">{{ mitra }} <button aria-label="Hapus saringan mitra" @click="mitra = ''"><Ikon nama="X" :ukuran="12" /></button></span>
        <span class="ml-auto text-xs text-slate-500">{{ baris.length }} transaksi · <b class="angka">{{ rupiah(baris.reduce((s, r) => s + r.nilai, 0)) }}</b></span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60"><tr><th class="p-2 text-left">Tanggal</th><th class="p-2 text-left">Mitra / Penyedia</th><th class="p-2 text-left">Pekerjaan</th><th class="p-2 text-left">No. SP · BAST · Invoice</th><th class="p-2 text-left">BNU</th><th class="p-2">Status</th><th class="p-2 text-right">Nilai</th></tr></thead>
          <tbody>
            <tr v-for="r in baris" :key="r.id" class="cursor-pointer border-t border-slate-100 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50" @click="router.push(`/belanja/lihat/${r.id}`)">
              <td class="whitespace-nowrap p-2">{{ tanggalPendek(r.tanggal) || '—' }}</td>
              <td class="p-2"><b class="block">{{ r.mitra }}</b><span class="text-xs text-slate-500">{{ r.penyedia || '—' }}</span></td>
              <td class="p-2"><span class="line-clamp-2">{{ r.pekerjaan }}</span></td>
              <td class="kode p-2 text-xs">{{ [r.nomor_sp, r.nomor_bast, r.nomor_invoice].filter(Boolean).join(' · ') || '—' }}</td>
              <td class="kode whitespace-nowrap p-2 text-xs">{{ r.bnu || '—' }}</td>
              <td class="p-2 text-center"><span :class="['lencana', STATUS[r.status]?.lencana]"><Ikon :nama="STATUS[r.status]?.ikon || 'FilePen'" :ukuran="11" /> {{ STATUS[r.status]?.label }}</span></td>
              <td class="angka p-2 text-right font-semibold">{{ rupiah(r.nilai, { tanpaRp: true }) }}</td>
            </tr>
            <tr v-if="!baris.length"><td colspan="7" class="p-6 text-center text-slate-500"><Ikon nama="SearchX" :ukuran="18" class="mr-1 inline" /> Tidak ada transaksi SIPLah.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <CetakBuku v-if="cetak" :judul="judulCetak" :subjudul="subCetak" :kolom="kolomCetak" :baris="baris" :ringkasan="ringkasCetak" :tanggal="akhirBulanIso(kas.tahun, per[3])" kecil excel
               @excel="excel" @tutup="cetak = false" />
  </div>
</template>
