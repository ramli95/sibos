<script setup>
// Laporan Pemda bulanan (Permendagri 3/2023): Laporan Realisasi Penerimaan & Belanja, SPTJM Kepala Sekolah,
// dan Rekapitulasi Pembelian Barang Milik Daerah — disampaikan paling lambat tanggal 5 bulan berikutnya.
import { ref, computed, onMounted } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useAset } from '@/stores/aset'
import { useNotifikasi } from '@/stores/notifikasi'
import { laporanPemda, akhirBulanIso, daftarTenggat } from '@/utils/laporan'
import { ringkasanBulan } from '@/utils/bku'
import { rekapPembelianBmd } from '@/utils/aset'
import { KELAS_BARANG } from '@/config/aset'
import { rupiah, rupiahRingkas, persen, tanggalPendek, tanggalPanjang, NAMA_BULAN } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokSptjm from '@/components/cetak/DokSptjm.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const aset = useAset()
const notif = useNotifikasi()
onMounted(() => aset.muat({ tahun: kas.tahun }))

const sekarang = new Date()
const bulan = ref(sekarang.getFullYear() === kas.tahun ? Math.max(0, sekarang.getMonth() - (sekarang.getDate() <= 10 ? 1 : 0)) : 11)
const pagu = computed(() => rkas.versiBerlaku?.pagu || rkas.uraian.reduce((s, u) => s + u.jumlah, 0))
const lap = computed(() => laporanPemda({ uraian: rkas.uraian, belanja: belanja.daftar, kas: kas.kas, pagu: pagu.value, bulan: bulan.value, nama: rkas.nama }))
const rb = computed(() => ringkasanBulan(kas.baris, bulan.value, kas.tahun))
const tglAkhir = computed(() => akhirBulanIso(kas.tahun, bulan.value))
const periode = computed(() => `${NAMA_BULAN[bulan.value]} ${kas.tahun}`)
const tenggat = computed(() => daftarTenggat(kas.tahun).find((t) => t.kunci === `bulan-${bulan.value}`))
const tutup = computed(() => kas.tutupBulan(`${kas.tahun}-${String(bulan.value + 1).padStart(2, '0')}`))
const bmd = computed(() => rekapPembelianBmd(aset.barang, bulan.value))

const statistik = computed(() => [
  { judul: 'Saldo awal bulan', nilai: rupiahRingkas(rb.value.saldo_awal), sub: rupiah(rb.value.saldo_awal), ikon: 'PiggyBank', nada: 'gelap', ringkas: true },
  { judul: 'Penerimaan bulan ini', nilai: rupiahRingkas(rb.value.penerimaan_dana), sub: rupiah(rb.value.penerimaan_dana), ikon: 'ArrowDownLeft', nada: 'primer', ringkas: true },
  { judul: 'Belanja bulan ini', nilai: rupiahRingkas(lap.value.totalBelanja.kini), sub: rupiah(lap.value.totalBelanja.kini), ikon: 'ShoppingCart', nada: 'primer', ringkas: true },
  { judul: 'Saldo akhir (bank + tunai)', nilai: rupiahRingkas(rb.value.saldo_akhir), sub: `Bank ${rupiah(rb.value.saldo_bank)}`, ikon: 'Landmark', nada: 'primer', ringkas: true },
])

// Baris laporan (judul bagian + pendapatan + belanja)
const barisLap = computed(() => [
  { tingkat: 0, kode: '', nama: 'PENDAPATAN', bagian: true },
  ...lap.value.pendapatan,
  { tingkat: 0, kode: '', nama: 'Jumlah Pendapatan', jumlah: true, ...lap.value.totalPendapatan, sisa: lap.value.totalPendapatan.anggaran - lap.value.totalPendapatan.sd },
  { tingkat: 0, kode: '', nama: 'BELANJA', bagian: true },
  ...lap.value.belanja,
  { tingkat: 0, kode: '', nama: 'Jumlah Belanja', jumlah: true, ...lap.value.totalBelanja, sisa: lap.value.totalBelanja.anggaran - lap.value.totalBelanja.sd },
].map((r, i) => ({ ...r, id: i })))
const angka = (r, k) => (r.bagian ? '' : r[k])
const kolomLap = [
  { judul: 'Kode Rekening', nilai: (r) => r.kode, lebar: '3.2cm', kode: true },
  { judul: 'Uraian', nilai: (r) => (r.tingkat === 2 ? '   ' : '') + r.nama },
  { judul: 'Anggaran', nilai: (r) => angka(r, 'anggaran'), lebar: '2.9cm', uang: true },
  { judul: 'Realisasi s.d. Bulan Lalu', nilai: (r) => angka(r, 'lalu'), lebar: '2.9cm', uang: true },
  { judul: 'Realisasi Bulan Ini', nilai: (r) => angka(r, 'kini'), lebar: '2.9cm', uang: true },
  { judul: 'Realisasi s.d. Bulan Ini', nilai: (r) => angka(r, 'sd'), lebar: '2.9cm', uang: true },
  { judul: 'Sisa Anggaran', nilai: (r) => angka(r, 'sisa'), lebar: '2.9cm', uang: true },
  { judul: '%', nilai: (r) => (r.bagian || !r.anggaran ? '' : (r.sd / r.anggaran * 100).toFixed(2)), lebar: '1.3cm', rata: 'kanan' },
]
const warnaLap = (r) => (r.bagian ? '#e5e7eb' : r.jumlah ? '#f3f4f6' : r.tingkat === 1 ? '#f8fafc' : null)
const ringkasLap = computed(() => [
  ['Saldo awal bulan (BKU)', rb.value.saldo_awal], ['Penerimaan bulan ini', rb.value.masuk], ['Pengeluaran bulan ini', rb.value.keluar],
  ['Saldo akhir bulan', rb.value.saldo_akhir], ['— di rekening bank', rb.value.saldo_bank], ['— kas tunai', rb.value.saldo_tunai],
])
const rincianSptjm = computed(() => [
  ['Saldo awal bulan', rb.value.saldo_awal], ['Penerimaan', rb.value.masuk], ['Belanja & pengeluaran', rb.value.keluar], ['Saldo akhir bulan', rb.value.saldo_akhir],
])

const kolomBmd = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tgl_lunas), lebar: '2cm', rata: 'tengah' },
  { judul: 'Nama Barang', nilai: (r) => r.nama },
  { judul: 'Spesifikasi', nilai: (r) => r.spesifikasi, lebar: '4cm' },
  { judul: 'Jumlah', nilai: (r) => `${r.volume} ${r.satuan}`, lebar: '2cm', rata: 'tengah' },
  { judul: 'Harga Satuan', nilai: (r) => r.harga, lebar: '2.6cm', uang: true },
  { judul: 'Total', nilai: (r) => r.jumlah, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Kode Rekening', nilai: (r) => r.kode_rekening, lebar: '3cm', kode: true },
  { judul: 'Jenis BMD', nilai: (r) => KELAS_BARANG[r.kelas]?.singkat, lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Penyedia', nilai: (r) => r.penyedia, lebar: '3.5cm' },
]

const cetak = ref('')
async function excel(jenis) {
  try {
    if (jenis === 'bmd') {
      await eksporExcel({ judul: `Rekapitulasi Pembelian Barang Milik Daerah ${periode.value}`, namaBerkas: `Rekap Pembelian BMD ${periode.value}`, baris: bmd.value,
        kolom: kolomBmd.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : k.judul === 'Nama Barang' ? 40 : 18, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) })
    } else {
      await eksporExcel({ judul: `Laporan Realisasi Penerimaan dan Belanja Dana BOSP ${periode.value}`, namaBerkas: `Laporan Realisasi Penerimaan dan Belanja ${periode.value}`, baris: barisLap.value,
        warnaBaris: (r) => (r.bagian ? 'E5E7EB' : r.jumlah ? 'F3F4F6' : r.tingkat === 1 ? 'F8FAFC' : null),
        kolom: kolomLap.map((k) => ({ judul: k.judul, lebar: k.uang ? 17 : k.judul === 'Uraian' ? 55 : 16, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) })
    }
  } catch (e) { notif.kabari(e.message, 'galat') }
}

const dokumen = computed(() => [
  { kunci: 'lrpb', judul: 'Laporan Realisasi Penerimaan & Belanja', ket: 'Anggaran, realisasi s.d. bulan lalu, bulan ini, s.d. bulan ini, dan sisa per rekening (Pasal 33).', ikon: 'FileBarChart', warna: 'ikon-chip', excel: true },
  { kunci: 'sptjm', judul: 'SPTJM Kepala Sekolah', ket: 'Surat pernyataan tanggung jawab mutlak, lampiran laporan bulanan (Pasal 34 ayat 3).', ikon: 'Stamp', warna: 'ikon-chip-kuning', excel: false },
  { kunci: 'bmd', judul: 'Rekap Pembelian Barang Milik Daerah', ket: `${bmd.value.length} barang bulan ini (KIB, ekstrakomptabel, persediaan) dari Barang & Aset.`, ikon: 'Boxes', warna: 'ikon-chip-tosca', excel: true },
])
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-3" data-tur="pemda-bulan">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="CalendarDays" :ukuran="19" /></span>
      <select v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan laporan"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }} {{ kas.tahun }}</option></select>
      <span v-if="tenggat" :class="['lencana', tenggat.sisa < 0 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : tenggat.sisa <= 5 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300']">
        <Ikon nama="CalendarClock" :ukuran="13" /> Tenggat {{ tanggalPanjang(tenggat.tanggal) }}{{ tenggat.sisa >= 0 ? ` · ${tenggat.sisa} hari lagi` : '' }}
      </span>
      <span :class="['lencana', tutup ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300']">
        <Ikon :nama="tutup ? 'CalendarCheck' : 'TriangleAlert'" :ukuran="13" /> {{ tutup ? 'Buku bulan ini sudah ditutup' : 'Buku bulan ini belum ditutup' }}
      </span>
    </div>

    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" ringkas />

    <!-- Tiga dokumen -->
    <div class="grid gap-3 md:grid-cols-3" data-tur="pemda-dokumen">
      <div v-for="d in dokumen" :key="d.kunci" class="kartu flex flex-col p-4">
        <div class="flex items-start gap-3">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', d.warna]"><Ikon :nama="d.ikon" :ukuran="21" /></span>
          <div class="min-w-0 flex-1"><h3 class="font-bold leading-tight">{{ d.judul }}</h3><p class="mt-1 text-xs text-slate-500">{{ d.ket }}</p></div>
        </div>
        <div class="mt-auto flex gap-2 pt-3">
          <button class="tombol-garis flex-1" @click="cetak = d.kunci"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button>
          <button v-if="d.excel" class="tombol-garis" :aria-label="`Excel ${d.judul}`" @click="excel(d.kunci)"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /></button>
        </div>
      </div>
    </div>

    <div v-if="!tutup" class="kartu flex items-start gap-3 p-4 text-sm text-amber-800 dark:text-amber-200">
      <Ikon nama="Info" class="mt-0.5 shrink-0 text-amber-500" />
      <span>Permendagri 3/2023 Pasal 32: laporan bulanan disusun dari BKU dan buku pembantu yang <b>sudah ditutup</b> dan ditandatangani Bendahara & Penanggung Jawab. Tutup buku di menu Buku Kas → Tutup Buku. Laporan tetap bisa dicetak sebagai draf.</span>
    </div>

    <!-- Pratinjau tabel -->
    <section class="kartu overflow-hidden">
      <div class="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Table2" :ukuran="19" /></span>
        <div class="flex-1"><h2 class="font-bold">Laporan Realisasi Penerimaan & Belanja</h2><p class="text-xs text-slate-500">Bulan {{ periode }} · RKAS {{ rkas.versiBerlaku?.nama || '-' }}</p></div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Kode</th><th class="px-3 py-2.5 text-left">Uraian</th><th class="px-3 py-2.5 text-right">Anggaran</th>
            <th class="px-3 py-2.5 text-right">s.d. Bulan Lalu</th><th class="px-3 py-2.5 text-right">Bulan Ini</th><th class="px-3 py-2.5 text-right">s.d. Bulan Ini</th><th class="px-3 py-2.5 text-right">Sisa</th><th class="px-3 py-2.5 text-right">%</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="r in barisLap" :key="r.id" :class="r.bagian ? 'bg-slate-100 font-bold dark:bg-slate-800' : r.jumlah ? 'bg-slate-50 font-bold dark:bg-slate-800/50' : r.tingkat === 1 ? 'font-semibold' : ''">
              <td class="kode whitespace-nowrap px-3 py-2 text-xs">{{ r.kode }}</td>
              <td :class="['px-3 py-2', r.tingkat === 2 && 'pl-7']">{{ r.nama }}</td>
              <template v-if="!r.bagian">
                <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(r.anggaran, { tanpaRp: true }) }}</td>
                <td class="angka whitespace-nowrap px-3 py-2 text-right text-slate-500">{{ rupiah(r.lalu, { tanpaRp: true }) }}</td>
                <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(r.kini, { tanpaRp: true }) }}</td>
                <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(r.sd, { tanpaRp: true }) }}</td>
                <td :class="['angka whitespace-nowrap px-3 py-2 text-right', r.sisa < 0 && 'text-rose-600']">{{ rupiah(r.sisa, { tanpaRp: true }) }}</td>
                <td class="angka whitespace-nowrap px-3 py-2 text-right text-xs">{{ r.anggaran ? persen(r.sd / r.anggaran * 100, 1) : '' }}</td>
              </template>
              <td v-else colspan="6" />
            </tr>
          </tbody>
        </table>
      </div>
      <div class="grid gap-2 border-t border-slate-100 p-4 text-sm sm:grid-cols-3 dark:border-slate-800">
        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">Sisa dana (pendapatan − belanja s.d. bulan ini)</p><p class="angka text-lg font-extrabold">{{ rupiah(lap.sisaDana) }}</p></div>
        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">Saldo akhir menurut BKU</p><p class="angka text-lg font-extrabold">{{ rupiah(rb.saldo_akhir) }}</p></div>
        <div :class="['rounded-xl p-3', lap.sisaDana === rb.saldo_akhir ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200']">
          <p class="text-xs">Selisih</p><p class="angka text-lg font-extrabold">{{ rupiah(lap.sisaDana - rb.saldo_akhir) }}</p>
          <p v-if="lap.sisaDana !== rb.saldo_akhir" class="text-xs">Biasanya pajak belum disetor, bunga/biaya bank, atau penerimaan yang belum dicatat.</p>
        </div>
      </div>
    </section>

    <CetakBuku v-if="cetak === 'lrpb'" judul="Laporan Realisasi Penerimaan dan Belanja Dana BOSP Reguler" :subjudul="`Bulan ${periode}`" :kolom="kolomLap" :baris="barisLap" :tanggal="tglAkhir" excel :warna-baris="warnaLap"
               :identitas="[['Nama Satuan Pendidikan', 'UPT SPF SMP Negeri 19 Makassar'], ['NPSN', '40307324'], ['Sumber Dana', 'Dana BOSP Reguler'], ['Tahun Anggaran', String(kas.tahun)]]"
               :ringkasan="ringkasLap" :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui, Kepala Sekolah selaku Penanggung Jawab' }" @excel="excel('lrpb')" @tutup="cetak = ''" />
    <CetakSurat v-if="cetak === 'sptjm'" :judul="`SPTJM ${periode}`" @tutup="cetak = ''">
      <template #default="{ profil, pejabat }">
        <DokSptjm :profil="profil" :kepsek="pejabat('kepala_sekolah', tglAkhir)" :periode="periode" :tanggal="tglAkhir" :rincian="rincianSptjm" :sisa="rb.saldo_akhir" />
      </template>
    </CetakSurat>
    <CetakBuku v-if="cetak === 'bmd'" judul="Rekapitulasi Pembelian Barang Milik Daerah" :subjudul="`Dana BOSP Reguler — Bulan ${periode}`" :kolom="kolomBmd" :baris="bmd" :tanggal="tglAkhir" excel kecil
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Kepala Sekolah' }" :ttd-kanan="{ jabatan: 'pengurus_barang', label: 'Pengurus Barang' }"
               :ringkasan="Object.entries(KELAS_BARANG).filter(([k]) => k !== 'abaikan').map(([k, v]) => [v.label, bmd.filter((x) => x.kelas === k).reduce((s, x) => s + x.jumlah, 0)])"
               @excel="excel('bmd')" @tutup="cetak = ''" />
  </div>
</template>
