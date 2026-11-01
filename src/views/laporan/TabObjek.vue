<script setup>
// Buku Subrincian Objek (format ARKAS): per objek belanja 5.1.02 / 5.2.02 / 5.2.05, dan rincian per kode rekening rinci.
// Realisasi = transaksi Lunas per tanggal lunas, dikelompokkan per kegiatan+rekening (sama dengan BNU/BKU).
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { OBJEK_BELANJA, bukuObjek, ringkasRekening, akhirBulanIso } from '@/utils/laporan'
import { PERIODE_BUKU } from '@/config/laporan'
import { KATEGORI } from '@/utils/arkas'
import { muatProfilSekolah } from '@/services/cetak'
import { rupiah, rupiahRingkas, tanggalPendek, tanggalPanjang, persen } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const notif = useNotifikasi()
const router = useRouter()
const profil = ref(null)
onMounted(async () => { profil.value = await muatProfilSekolah().catch(() => null) })

const mode = ref('operasional') // operasional | alat_mesin | aset_lain | rekening
const rekening = ref('')
const sekarang = new Date()
const periode = ref(sekarang.getFullYear() === kas.tahun ? `tw${Math.floor(sekarang.getMonth() / 3) + 1}` : 'tahun')
const per = computed(() => PERIODE_BUKU.find((p) => p[0] === periode.value) || PERIODE_BUKU[0])
const dari = computed(() => per.value[2])
const sampai = computed(() => per.value[3])
const tglAwal = computed(() => `${kas.tahun}-${String(dari.value + 1).padStart(2, '0')}-01`)
const tglAkhir = computed(() => akhirBulanIso(kas.tahun, sampai.value))
const teksPeriode = computed(() => `${tanggalPanjang(tglAwal.value).replace(/^(\d) /, '0$1 ')} s.d. ${tanggalPanjang(tglAkhir.value)}`.toUpperCase())

const daftarRek = computed(() => ringkasRekening({ uraian: rkas.uraian, belanja: belanja.daftar, sampai: sampai.value, nama: rkas.nama }))
const objek = computed(() => OBJEK_BELANJA.find((o) => o.kunci === mode.value))
const pilihRek = computed(() => daftarRek.value.find((r) => r.kode === rekening.value))
const buku = computed(() => (mode.value === 'rekening'
  ? (rekening.value ? bukuObjek({ uraian: rkas.uraian, belanja: belanja.daftar, rekening: rekening.value, dari: dari.value, sampai: sampai.value }) : null)
  : bukuObjek({ uraian: rkas.uraian, belanja: belanja.daftar, kategori: mode.value, dari: dari.value, sampai: sampai.value })))
const kodeNama = computed(() => (mode.value === 'rekening' ? (pilihRek.value ? `${pilihRek.value.kode} ${pilihRek.value.nama.toUpperCase()}` : '') : `${objek.value.kode} ${objek.value.nama}`))

const statistik = computed(() => {
  const b = buku.value
  if (!b) return []
  const pakai = b.saldoLalu + b.total
  return [
    { judul: 'Anggaran', nilai: rupiahRingkas(b.anggaran), sub: rupiah(b.anggaran), ikon: 'Wallet', nada: 'gelap', ringkas: true },
    { judul: 'Saldo lalu', nilai: rupiahRingkas(b.saldoLalu), sub: 'Realisasi sebelum periode', ikon: 'History', nada: 'primer', ringkas: true },
    { judul: 'Realisasi periode', nilai: rupiahRingkas(b.total), sub: `${b.baris.length} transaksi`, ikon: 'ShoppingCart', nada: 'primer', ringkas: true },
    { judul: 'Sisa anggaran', nilai: rupiahRingkas(b.sisa), sub: `Terpakai ${persen(b.anggaran ? (pakai / b.anggaran) * 100 : 0)}`, ikon: 'PiggyBank', nada: b.sisa < 0 ? 'bahaya' : 'sukses', ringkas: true, persen: b.anggaran ? Math.min(100, Math.round((pakai / b.anggaran) * 100)) : 0 },
  ]
})

// Rincian per rekening: daftar ringkas yang bisa diklik
const cariRek = ref('')
const rekTampil = computed(() => { const q = cariRek.value.trim().toLowerCase(); return daftarRek.value.filter((r) => !q || `${r.kode} ${r.nama}`.toLowerCase().includes(q)) })

/* -------- Cetak & Excel -------- */
const cetak = ref(false)
const barisCetak = computed(() => (buku.value ? [{ id: 'lalu', tanggal: '', bnu: '', uraian: 'Saldo Lalu', realisasi: buku.value.saldoLalu, sisa: buku.value.anggaran - buku.value.saldoLalu }, ...buku.value.baris] : []))
const kolomCetak = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2.3cm', rata: 'tengah' },
  { judul: 'No. Bukti (BPU)', nilai: (r) => r.bnu, lebar: '2.6cm', rata: 'tengah' },
  { judul: 'Uraian', nilai: (r) => r.uraian },
  { judul: 'Realisasi', nilai: (r) => r.realisasi, lebar: '3.1cm', uang: true, jumlah: true },
  { judul: 'Sisa Anggaran', nilai: (r) => r.sisa, lebar: '3.1cm', uang: true },
]
const p = (k, awal) => String(profil.value?.[k] || awal).toUpperCase()
const identitas = computed(() => [
  ['Tahun Anggaran', String(kas.tahun)],
  ['Nama Sekolah', profil.value?.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR'],
  ['Kelurahan', p('kelurahan', 'Bangkala')], ['Kecamatan', p('kecamatan', 'Manggala')],
  ['Kota', p('kota', 'Kota Makassar')], ['Provinsi', p('provinsi', 'Sulawesi Selatan')],
  ['Kode dan Nama Rek.', kodeNama.value], ['Anggaran', rupiah(buku.value?.anggaran || 0)],
])
const judulBerkas = computed(() => `Buku Subrincian Objek ${mode.value === 'rekening' ? rekening.value : objek.value.kode} ${per.value[1]} ${kas.tahun}`)
async function excel() {
  try {
    await eksporExcel({
      judul: `BUKU SUBRINCIAN OBJEK — ${kodeNama.value} — PERIODE ${teksPeriode.value}`,
      kolom: [
        { judul: 'Tanggal', lebar: 12, nilai: (r) => tanggalPendek(r.tanggal) }, { kunci: 'bnu', judul: 'No. Bukti (BPU)', lebar: 14 },
        { kunci: 'uraian', judul: 'Uraian', lebar: 50 }, { kunci: 'kode_kegiatan', judul: 'Kode Kegiatan', lebar: 14 }, { kunci: 'kode_rekening', judul: 'Kode Rekening', lebar: 20 },
        { kunci: 'realisasi', judul: 'Realisasi', lebar: 16, jenis: 'uang' }, { kunci: 'sisa', judul: 'Sisa Anggaran', lebar: 16, jenis: 'uang' },
      ],
      baris: barisCetak.value, namaBerkas: judulBerkas.value,
    })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
async function excelRekening() {
  try {
    await eksporExcel({
      judul: `Rincian Anggaran & Realisasi per Rekening s.d. ${tanggalPanjang(tglAkhir.value)}`,
      kolom: [
        { kunci: 'kode', judul: 'Kode Rekening', lebar: 20 }, { kunci: 'nama', judul: 'Nama Rekening', lebar: 45 }, { judul: 'Objek', lebar: 14, nilai: (r) => KATEGORI[r.kategori]?.nama || '' },
        { kunci: 'anggaran', judul: 'Anggaran', lebar: 16, jenis: 'uang' }, { kunci: 'realisasi', judul: 'Realisasi', lebar: 16, jenis: 'uang' }, { kunci: 'sisa', judul: 'Sisa', lebar: 16, jenis: 'uang' },
        { judul: 'Persen', lebar: 9, nilai: (r) => Math.round(r.persen * 1000) / 10 }, { kunci: 'transaksi', judul: 'Transaksi', lebar: 10 },
      ],
      baris: daftarRek.value, namaBerkas: `Rincian per Rekening ${kas.tahun}`,
    })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
const MODE = [...OBJEK_BELANJA.map((o) => ({ kunci: o.kunci, judul: KATEGORI[o.kunci].nama, kode: o.kode, ikon: o.ikon, warna: o.warna })), { kunci: 'rekening', judul: 'Per rekening rinci', kode: '5.x.xx.xx.xx.xxxx', ikon: 'Hash', warna: '#7c3aed' }]
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <button v-for="m in MODE" :key="m.kunci" type="button" @click="mode = m.kunci"
              :class="['kartu flex items-center gap-3 p-3 text-left transition', mode === m.kunci ? 'ring-2' : 'opacity-80 hover:opacity-100']" :style="mode === m.kunci ? { '--tw-ring-color': m.warna } : null">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" :style="{ background: m.warna }"><Ikon :nama="m.ikon" :ukuran="19" /></span>
        <span class="min-w-0"><b class="block truncate text-sm">{{ m.judul }}</b><span class="kode block truncate text-[11px] text-slate-500">{{ m.kode }}</span></span>
      </button>
    </div>

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <Ikon nama="CalendarRange" :ukuran="18" class="text-[#22A08D]" />
      <label class="sr-only" for="periode-objek">Periode</label>
      <select id="periode-objek" v-model="periode" class="masukan w-auto py-2">
        <optgroup label="Periode"><option v-for="x in PERIODE_BUKU.slice(0, 7)" :key="x[0]" :value="x[0]">{{ x[1] }}</option></optgroup>
        <optgroup label="Bulan"><option v-for="x in PERIODE_BUKU.slice(7)" :key="x[0]" :value="x[0]">{{ x[1] }}</option></optgroup>
      </select>
      <span class="text-xs text-slate-500">{{ teksPeriode }}</span>
      <div class="ml-auto flex gap-2">
        <button v-if="mode === 'rekening'" class="tombol-garis" @click="excelRekening"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> <span class="hidden sm:inline">Excel semua rekening</span></button>
        <button class="tombol-garis" :disabled="!buku" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> Cetak / Unduh</button>
      </div>
    </div>

    <!-- Pilih rekening rinci -->
    <div v-if="mode === 'rekening'" class="kartu overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Ikon nama="Hash" :ukuran="16" /></span> Rekening rinci</h2>
        <div class="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
          <Ikon nama="Search" :ukuran="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="cariRek" class="masukan py-2 pl-9" placeholder="Cari kode/nama rekening…" />
        </div>
      </div>
      <div class="max-h-80 overflow-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead class="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr><th class="p-2 text-left">Rekening</th><th class="p-2 text-right">Anggaran</th><th class="p-2 text-right">Realisasi s.d. periode</th><th class="p-2 text-right">Sisa</th><th class="w-40 p-2">Terpakai</th></tr></thead>
          <tbody>
            <tr v-for="r in rekTampil" :key="r.kode" :class="['cursor-pointer border-t border-slate-100 dark:border-slate-800', rekening === r.kode ? 'bg-violet-50 dark:bg-violet-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50']" @click="rekening = r.kode">
              <td class="p-2"><span class="kode block text-[11px] text-slate-500">{{ r.kode }}</span><span class="line-clamp-1">{{ r.nama || '—' }}</span></td>
              <td class="angka p-2 text-right">{{ rupiah(r.anggaran, { tanpaRp: true }) }}</td>
              <td class="angka p-2 text-right">{{ rupiah(r.realisasi, { tanpaRp: true }) }}</td>
              <td :class="['angka p-2 text-right', r.sisa < 0 && 'font-bold text-rose-600']">{{ rupiah(r.sisa, { tanpaRp: true }) }}</td>
              <td class="p-2"><div class="flex items-center gap-2"><div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full" :style="{ width: Math.min(100, r.persen * 100) + '%', background: r.persen > 1 ? '#e11d48' : KATEGORI[r.kategori]?.titik }" /></div><span class="w-10 text-right text-[11px] text-slate-500">{{ Math.round(r.persen * 100) }}%</span></div></td>
            </tr>
            <tr v-if="!rekTampil.length"><td colspan="5" class="p-6 text-center text-slate-500">Tidak ada rekening.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <template v-if="buku">
      <GridStat :daftar="statistik" :memuat="belanja.memuat" />
      <div class="kartu overflow-hidden">
        <div class="border-b border-slate-100 p-4 dark:border-slate-800">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Kode dan nama rekening</p>
          <p class="kode font-bold">{{ kodeNama }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60">
              <tr><th class="p-2 text-left">Tanggal</th><th class="p-2 text-left">No. Bukti</th><th class="p-2 text-left">Uraian</th><th class="p-2 text-right">Realisasi</th><th class="p-2 text-right">Sisa Anggaran</th></tr>
            </thead>
            <tbody>
              <tr class="bg-amber-50/60 dark:bg-amber-950/20"><td class="p-2" colspan="3"><Ikon nama="History" :ukuran="14" class="mr-1 inline text-amber-600" /> <b>Saldo Lalu</b></td><td class="angka p-2 text-right">{{ rupiah(buku.saldoLalu, { tanpaRp: true }) }}</td><td class="angka p-2 text-right">{{ rupiah(buku.anggaran - buku.saldoLalu, { tanpaRp: true }) }}</td></tr>
              <tr v-for="r in buku.baris" :key="r.id" class="cursor-pointer border-t border-slate-100 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50" @click="router.push(`/belanja/lihat/${r.id_belanja}`)">
                <td class="whitespace-nowrap p-2">{{ tanggalPendek(r.tanggal) }}</td>
                <td class="kode whitespace-nowrap p-2">{{ r.bnu || '—' }}</td>
                <td class="p-2"><span class="line-clamp-2">{{ r.uraian }}</span><span class="kode text-[11px] text-slate-500">{{ r.kode_kegiatan }} · {{ r.kode_rekening }}</span><span v-if="r.siplah" class="lencana ml-1 bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300"><Ikon nama="ShoppingBag" :ukuran="11" /> SIPLah</span></td>
                <td class="angka p-2 text-right">{{ rupiah(r.realisasi, { tanpaRp: true }) }}</td>
                <td :class="['angka p-2 text-right', r.sisa < 0 && 'font-bold text-rose-600']">{{ rupiah(r.sisa, { tanpaRp: true }) }}</td>
              </tr>
              <tr v-if="!buku.baris.length"><td colspan="5" class="p-6 text-center text-slate-500"><Ikon nama="SearchX" :ukuran="18" class="mr-1 inline" /> Tidak ada transaksi Lunas pada periode ini.</td></tr>
            </tbody>
            <tfoot class="bg-slate-50 font-bold dark:bg-slate-800/60"><tr><td class="p-2" colspan="3">Jumlah (termasuk saldo lalu)</td><td class="angka p-2 text-right">{{ rupiah(buku.saldoLalu + buku.total, { tanpaRp: true }) }}</td><td :class="['angka p-2 text-right', buku.sisa < 0 && 'text-rose-600']">{{ rupiah(buku.sisa, { tanpaRp: true }) }}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </template>
    <div v-else class="kartu flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500">
      <span class="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Ikon nama="MousePointerClick" :ukuran="22" /></span>
      Pilih satu rekening di atas untuk melihat buku rinciannya.
    </div>

    <CetakBuku v-if="cetak && buku" judul="BUKU SUBRINCIAN OBJEK" :nama-berkas="judulBerkas" :subjudul="`PERIODE : ${teksPeriode}`" :identitas="identitas" :kolom="kolomCetak" :baris="barisCetak"
               :tanggal="tglAkhir" orientasi="portrait" :nomor="false" excel
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui:\nKepala Sekolah' }" :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Bendahara Dana BOS\n\u00a0' }"
               @excel="excel" @tutup="cetak = false" />
  </div>
</template>
