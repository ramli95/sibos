<script setup>
// Laporan Tahap I & tahunan (Permendikdasmen 8/2026 Pasal 56–60): realisasi minimal 50% dana tahap I
// (tenggat 31 Juli), dan laporan keseluruhan (tenggat 31 Januari): realisasi setahun, sisa dana, hasil pengadaan.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { TENGGAT, DENDA_TERLAMBAT } from '@/config/laporan'
import { ringkasTahap, rekapRealisasi, hasilPengadaan, daftarTenggat } from '@/utils/laporan'
import { saldoSampai } from '@/utils/bku'
import { rupiah, rupiahRingkas, persen, tanggalPendek, tanggalPanjang } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const notif = useNotifikasi()

const t = computed(() => ringkasTahap({ belanja: belanja.daftar, kas: kas.kas, tahun: kas.tahun }))
const tenggat = computed(() => daftarTenggat(kas.tahun).filter((x) => x.jenis !== 'bulanan'))
const akhir = computed(() => `${kas.tahun}-12-31`)
const komponen = computed(() => rekapRealisasi({ uraian: rkas.uraian, belanja: belanja.daftar, susunan: 'komponen', dari: 0, sampai: 11, nama: rkas.nama }))
const pengadaan = computed(() => hasilPengadaan(belanja.daftar))

// Sisa dana dari baris BKU
const jumlahJenis = (jenis) => kas.baris.filter((r) => r.jenis === jenis).reduce((s, r) => s + r.bank + r.tunai, 0)
const sisa = computed(() => {
  const belanjaT = -jumlahJenis('belanja')
  const pajakNeto = jumlahJenis('terima_pajak') + jumlahJenis('setor_pajak')
  return {
    saldoAwal: jumlahJenis('saldo_awal'), terima: jumlahJenis('terima_dana'), bunga: jumlahJenis('bunga'), pengembalian: jumlahJenis('pengembalian'),
    belanja: belanjaT, pajakBunga: -jumlahJenis('pajak_bunga'), biaya: -jumlahJenis('biaya_bank') - jumlahJenis('lainnya_keluar'), pajakNeto,
    bank: saldoSampai(kas.baris, akhir.value, 'bank'), tunai: saldoSampai(kas.baris, akhir.value, 'tunai'),
  }
})
const barisSisa = computed(() => [
  { id: 1, uraian: 'Sisa dana tahun anggaran sebelumnya (saldo awal)', nilai: sisa.value.saldoAwal },
  { id: 2, uraian: `Penerimaan Dana BOSP Reguler Tahap I`, nilai: t.value.terimaI },
  { id: 3, uraian: `Penerimaan Dana BOSP Reguler Tahap II`, nilai: t.value.terimaII },
  { id: 4, uraian: 'Jasa giro / bunga bank', nilai: sisa.value.bunga },
  { id: 5, uraian: 'Pengembalian / koreksi masuk', nilai: sisa.value.pengembalian },
  { id: 6, uraian: 'Realisasi belanja (Lunas)', nilai: -sisa.value.belanja },
  { id: 7, uraian: 'Pajak bunga bank', nilai: -sisa.value.pajakBunga },
  { id: 8, uraian: 'Biaya bank & pengeluaran lain', nilai: -sisa.value.biaya },
  { id: 9, uraian: 'Pajak dipungut/dipotong yang belum disetor', nilai: sisa.value.pajakNeto },
])
const saldoAkhir = computed(() => sisa.value.bank + sisa.value.tunai)

const sisaHari = (x) => (x.sisa < 0 ? 'Lewat' : `${x.sisa} hari lagi`)
const lebar = (p) => Math.max(0, Math.min(100, p))

const kolomKomponen = [
  { judul: 'Kode', nilai: (r) => r.kode, lebar: '1.4cm', rata: 'tengah' },
  { judul: 'Komponen Penggunaan Dana', nilai: (r) => r.nama },
  { judul: 'Anggaran', nilai: (r) => r.anggaran, lebar: '3cm', uang: true, jumlah: true },
  { judul: 'Realisasi', nilai: (r) => r.sd, lebar: '3cm', uang: true, jumlah: true },
  { judul: 'Sisa', nilai: (r) => r.sisa, lebar: '3cm', uang: true, jumlah: true },
  { judul: '%', nilai: (r) => r.persen.toFixed(2), lebar: '1.4cm', rata: 'kanan' },
]
const kolomSisa = [{ judul: 'Uraian', nilai: (r) => r.uraian }, { judul: 'Jumlah (Rp)', nilai: (r) => r.nilai, lebar: '4cm', uang: true, jumlah: true }]
const kolomPengadaan = [
  { judul: 'Tanggal Lunas', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2cm', rata: 'tengah' },
  { judul: 'Nama Pekerjaan', nilai: (r) => r.nama_pekerjaan },
  { judul: 'Penyedia', nilai: (r) => r.penyedia, lebar: '4cm' },
  { judul: 'Cara', nilai: (r) => r.cara, lebar: '2.6cm' },
  { judul: 'No. Surat Pesanan', nilai: (r) => r.nomor_sp, lebar: '4cm' },
  { judul: 'Tgl. BAST', nilai: (r) => tanggalPendek(r.tgl_bast), lebar: '2cm', rata: 'tengah' },
  { judul: 'Nilai', nilai: (r) => r.nilai, lebar: '2.8cm', uang: true, jumlah: true },
]
const cetak = ref('')
async function excel(jenis) {
  const map = {
    komponen: ['Laporan Realisasi Penggunaan Dana BOSP per Komponen', komponen.value.baris, kolomKomponen],
    sisa: ['Laporan Sisa Dana BOSP', barisSisa.value, kolomSisa],
    pengadaan: ['Laporan Hasil Pengadaan Barang dan Jasa', pengadaan.value, kolomPengadaan],
  }
  const [judul, baris, kolom] = map[jenis]
  try {
    await eksporExcel({ judul: `${judul} ${kas.tahun}`, namaBerkas: `${judul} ${kas.tahun}`, baris,
      kolom: kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 17 : /Nama|Uraian|Komponen/.test(k.judul) ? 55 : 16, nilai: k.judul === '%' ? (r) => Number(r.persen.toFixed(2)) : k.nilai, jenis: k.uang ? 'uang' : 'teks' })) })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
const dokumen = [
  { kunci: 'komponen', judul: 'Realisasi penggunaan dana setahun', ket: 'Per komponen Pasal 42 (huruf a–l): anggaran, realisasi, sisa.', ikon: 'ChartPie', warna: 'ikon-chip', dasar: 'Pasal 57 huruf a' },
  { kunci: 'sisa', judul: 'Laporan sisa dana', ket: 'Saldo awal, penerimaan, belanja, dan sisa di bank & tunai per 31 Desember.', ikon: 'PiggyBank', warna: 'ikon-chip-kuning', dasar: 'Pasal 57 huruf b' },
  { kunci: 'pengadaan', judul: 'Hasil penyelesaian pengadaan', ket: 'Daftar pekerjaan pengadaan barang/jasa yang telah selesai dan dibayar.', ikon: 'PackageCheck', warna: 'ikon-chip-tosca', dasar: 'Pasal 57 huruf c' },
]
</script>

<template>
  <div class="space-y-5">
    <!-- Tenggat -->
    <div class="grid gap-3 md:grid-cols-2" data-tur="tahunan-tenggat">
      <div v-for="x in tenggat" :key="x.kunci" class="kartu flex items-start gap-3 p-4 sm:items-center sm:gap-4">
        <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white sm:h-14 sm:w-14', x.sisa < 0 ? 'bg-slate-400' : x.sisa <= 14 ? 'bg-gradient-to-br from-rose-500 to-rose-600' : 'bg-gradient-to-br from-biru to-blue-700']">
          <Ikon nama="CalendarClock" :ukuran="26" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-bold">{{ x.judul }} <span :class="['lencana ml-1 align-middle sm:hidden', x.sisa < 0 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : x.sisa <= 14 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300']">{{ sisaHari(x) }}</span></p>
          <p class="text-sm text-slate-500">Paling lambat {{ tanggalPanjang(x.tanggal) }} melalui ARKAS</p>
          <p class="text-xs text-slate-400">{{ x.kunci === 'tahap1' ? TENGGAT.tahap1.dasar : TENGGAT.tahunan.dasar }} · terlambat dipotong {{ (x.kunci === 'tahap1' ? DENDA_TERLAMBAT.tahap1 : DENDA_TERLAMBAT.tahunan).map((d) => `${d.persen}% (${d.ket})`).join(', ') }}</p>
        </div>
        <span :class="['lencana hidden shrink-0 sm:inline-flex', x.sisa < 0 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : x.sisa <= 14 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300']">{{ sisaHari(x) }}</span>
      </div>
    </div>

    <!-- Syarat 50% tahap I -->
    <section class="kartu p-5" data-tur="tahunan-tahap">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="Target" :ukuran="19" /></span>
        <div class="min-w-0 flex-1"><h2 class="font-bold">Realisasi Tahap I (syarat penyaluran Tahap II)</h2><p class="text-xs text-slate-500">Pasal 58 ayat (2): minimal {{ TENGGAT.minimal_tahap1 }}% dana tahap I (ditambah sisa tahun lalu) telah digunakan</p></div>
        <span :class="['lencana', t.persenI >= TENGGAT.minimal_tahap1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300']">
          <Ikon :nama="t.persenI >= TENGGAT.minimal_tahap1 ? 'BadgeCheck' : 'CircleAlert'" :ukuran="13" /> {{ t.persenI >= TENGGAT.minimal_tahap1 ? 'Memenuhi' : 'Belum memenuhi' }}
        </span>
      </div>
      <div class="relative h-6 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div class="h-full rounded-full bg-gradient-to-r from-[#E3A414] to-[#22A08D]" :style="{ width: lebar(t.persenI) + '%' }" />
        <div class="absolute inset-y-0 border-l-2 border-dashed border-rose-500" :style="{ left: TENGGAT.minimal_tahap1 + '%' }" title="Batas 50%" />
        <span class="angka absolute inset-0 grid place-items-center text-xs font-bold">{{ persen(t.persenI, 1) }}</span>
      </div>
      <div class="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">Sisa tahun lalu</p><p class="angka font-bold">{{ rupiah(t.saldoAwal) }}</p></div>
        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">Diterima tahap I</p><p class="angka font-bold">{{ rupiah(t.terimaI) }}</p></div>
        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">Realisasi Jan–Jun</p><p class="angka font-bold">{{ rupiah(t.realI) }}</p></div>
        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><p class="text-xs text-slate-500">Realisasi setahun</p><p class="angka font-bold">{{ rupiah(t.realI + t.realII) }} <span class="text-xs font-normal text-slate-500">({{ persen(t.persenSetahun, 1) }})</span></p></div>
      </div>
    </section>

    <!-- Dokumen laporan tahunan -->
    <div class="grid gap-3 md:grid-cols-3" data-tur="tahunan-dokumen">
      <div v-for="d in dokumen" :key="d.kunci" class="kartu flex flex-col p-4">
        <div class="flex items-start gap-3">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', d.warna]"><Ikon :nama="d.ikon" :ukuran="21" /></span>
          <div class="min-w-0 flex-1"><h3 class="font-bold leading-tight">{{ d.judul }}</h3><p class="mt-1 text-xs text-slate-500">{{ d.ket }}</p><p class="mt-1 text-[11px] font-semibold text-biru dark:text-blue-300">{{ d.dasar }}</p></div>
        </div>
        <div class="mt-auto flex gap-2 pt-3">
          <button class="tombol-garis flex-1" @click="cetak = d.kunci"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button>
          <button class="tombol-garis" :aria-label="`Excel ${d.judul}`" @click="excel(d.kunci)"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /></button>
        </div>
      </div>
    </div>

    <!-- Sisa dana -->
    <section class="kartu p-5">
      <div class="mb-3 flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="Scale" :ukuran="19" /></span>
        <div class="flex-1"><h2 class="font-bold">Sisa dana per 31 Desember {{ kas.tahun }}</h2><p class="text-xs text-slate-500">Dari Buku Kas Umum; menjadi SiLPA setelah direviu APIP (Permendagri 3/2023 Pasal 36).</p></div>
      </div>
      <ul class="divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <li v-for="r in barisSisa" :key="r.id" class="flex items-center justify-between gap-3 py-2"><span>{{ r.uraian }}</span><b :class="['angka', r.nilai < 0 && 'text-rose-600']">{{ rupiah(r.nilai) }}</b></li>
        <li class="flex items-center justify-between gap-3 py-2.5 font-extrabold"><span>Sisa dana (bank {{ rupiahRingkas(sisa.bank) }} + tunai {{ rupiahRingkas(sisa.tunai) }})</span><span class="angka">{{ rupiah(saldoAkhir) }}</span></li>
      </ul>
    </section>

    <CetakBuku v-if="cetak === 'komponen'" judul="Laporan Realisasi Penggunaan Dana BOSP Reguler" :subjudul="`Tahun Anggaran ${kas.tahun}`" :kolom="kolomKomponen" :baris="komponen.baris" :tanggal="akhir" orientasi="portrait" excel
               :identitas="[['Nama Satuan Pendidikan', 'UPT SPF SMP Negeri 19 Makassar'], ['NPSN', '40307324'], ['Dasar', 'Permendikdasmen No. 8 Tahun 2026 Pasal 57 huruf a']]"
               :ringkasan="[['Total anggaran', komponen.total.anggaran], ['Total realisasi', komponen.total.sd], ['Sisa anggaran', komponen.total.sisa]]" @excel="excel('komponen')" @tutup="cetak = ''" />
    <CetakBuku v-if="cetak === 'sisa'" judul="Laporan Sisa Dana BOSP Reguler" :subjudul="`Per 31 Desember ${kas.tahun}`" :kolom="kolomSisa" :baris="barisSisa" :tanggal="akhir" orientasi="portrait" excel
               :identitas="[['Nama Satuan Pendidikan', 'UPT SPF SMP Negeri 19 Makassar'], ['NPSN', '40307324'], ['Dasar', 'Permendikdasmen No. 8 Tahun 2026 Pasal 57 huruf b']]"
               :ringkasan="[['Saldo rekening bank', sisa.bank], ['Kas tunai', sisa.tunai], ['Sisa dana', saldoAkhir]]" @excel="excel('sisa')" @tutup="cetak = ''" />
    <CetakBuku v-if="cetak === 'pengadaan'" judul="Laporan Hasil Penyelesaian Pengadaan Barang/Jasa" :subjudul="`Tahun Anggaran ${kas.tahun}`" :kolom="kolomPengadaan" :baris="pengadaan" :tanggal="akhir" excel kecil
               :identitas="[['Nama Satuan Pendidikan', 'UPT SPF SMP Negeri 19 Makassar'], ['Dasar', 'Permendikdasmen No. 8 Tahun 2026 Pasal 57 huruf c']]"
               :ringkasan="[['Jumlah pekerjaan', `${pengadaan.length} pekerjaan`], ['Melalui SIPLah', `${pengadaan.filter((p) => p.cara.startsWith('SIPLah')).length} pekerjaan`]]" @excel="excel('pengadaan')" @tutup="cetak = ''" />
  </div>
</template>
