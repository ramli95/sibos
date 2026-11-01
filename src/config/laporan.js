// Konstanta Fase 5 — Laporan ARKAS/Pemda & skor kesiapan SPJ.
// Dasar: Permendagri 3/2023 Pasal 32–34 (laporan realisasi penerimaan & belanja bulanan, SPTJM,
// rekapitulasi pembelian barang milik daerah, paling lambat tanggal 5 bulan berikutnya) dan
// Permendikdasmen 8/2026 Pasal 56–60 (laporan tahap I 31 Juli, minimal 50%; laporan tahunan 31 Januari:
// realisasi, sisa dana, hasil pengadaan barang/jasa; pengurangan 2–4% bila terlambat).

export const TAB_LAPORAN = [
  { kunci: 'realisasi', judul: 'Realisasi SNP & Komponen', ikon: 'ChartPie' },
  { kunci: 'pemda', judul: 'Laporan Pemda Bulanan', ikon: 'Landmark' },
  { kunci: 'tahunan', judul: 'Tahap & Tahunan', ikon: 'CalendarRange' },
  { kunci: 'objek', judul: 'Buku Subrincian Objek', ikon: 'BookCopy' },
  { kunci: 'siplah', judul: 'Rekap SIPLah', ikon: 'ShoppingBag' },
  { kunci: 'kesiapan', judul: 'Kesiapan SPJ', ikon: 'Gauge' },
  { kunci: 'simakda', judul: 'Ekspor SIMAKDA', ikon: 'FileSpreadsheet' },
]

// Pengelompokan tabel realisasi
export const SUSUNAN_REALISASI = [
  { kunci: 'snp', judul: 'Per SNP', ikon: 'Layers' },
  { kunci: 'komponen', judul: 'Per Komponen Juknis', ikon: 'Grid3x3' },
  { kunci: 'kegiatan', judul: 'Per Kegiatan', ikon: 'ListTree' },
  { kunci: 'rekening', judul: 'Per Rekening Belanja', ikon: 'Hash' },
]

// Periode laporan
export const PERIODE = [
  { kunci: 'bulan', judul: 'Bulanan' },
  { kunci: 'tahap', judul: 'Tahap / Semester' },
  { kunci: 'tahun', judul: 'Tahunan' },
]

// Kode rekening pendapatan Dana BOSP (sama dengan Kertas Kerja RKAS SIBOS)
export const REKENING_PENDAPATAN = { kode: '4.3.1.01', nama: 'Dana BOSP Reguler' }

// Kelompok belanja untuk laporan Pemda (kode jenis belanja SIPD)
export const KELOMPOK_BELANJA = [
  { kode: '5.1.02', nama: 'Belanja Barang dan Jasa' },
  { kode: '5.2.02', nama: 'Belanja Modal Peralatan dan Mesin' },
  { kode: '5.2.03', nama: 'Belanja Modal Gedung dan Bangunan' },
  { kode: '5.2.05', nama: 'Belanja Modal Aset Tetap Lainnya' },
]

// Tenggat laporan (bulan 0-based)
export const TENGGAT = {
  bulanan: 5, // tanggal 5 bulan berikutnya (Permendagri 3/2023 Pasal 32 ayat 4 & Pasal 34 ayat 3)
  tahap1: { bulan: 6, tanggal: 31, judul: 'Laporan realisasi Tahap I', dasar: 'Juknis 2026 Pasal 56 ayat (2) huruf a' },
  tahunan: { bulan: 0, tanggal: 31, judul: 'Laporan realisasi keseluruhan', dasar: 'Juknis 2026 Pasal 56 ayat (2) huruf b' },
  minimal_tahap1: 50, // persen penggunaan dana tahap I sebagai syarat penyaluran tahap II (Pasal 58 ayat 2)
}

// Pengurangan penyaluran bila laporan terlambat (Pasal 59)
export const DENDA_TERLAMBAT = {
  tahunan: [{ sampai: '02-31', persen: 2, ket: 'Februari' }, { sampai: '03-31', persen: 3, ket: 'Maret' }, { sampai: '06-25', persen: 4, ket: '1 April – 25 Juni' }],
  tahap1: [{ sampai: '08-31', persen: 2, ket: 'Agustus' }, { sampai: '09-30', persen: 3, ket: 'September' }, { sampai: '10-25', persen: 4, ket: '1 – 25 Oktober' }],
}

// Skor kesiapan SPJ: bobot per aspek (jumlah 100)
export const BOBOT_SKOR = { dokumen: 50, pajak: 25, arsip: 25 }
export const ASPEK_SKOR = {
  dokumen: { judul: 'Dokumen & data', ikon: 'FileCheck', warna: '#1A62E8' },
  pajak: { judul: 'Pajak', ikon: 'ReceiptText', warna: '#E3A414' },
  arsip: { judul: 'Foto & arsip', ikon: 'Camera', warna: '#22A08D' },
}
// Ambang warna skor
export const AMBANG_SKOR = { hijau: 90, kuning: 60 }
export const NADA_SKOR = {
  hijau: { label: 'Siap', lencana: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', batang: 'bg-emerald-500', teks: 'text-emerald-600 dark:text-emerald-400', ikon: 'BadgeCheck' },
  kuning: { label: 'Hampir', lencana: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', batang: 'bg-amber-500', teks: 'text-amber-600 dark:text-amber-400', ikon: 'TriangleAlert' },
  merah: { label: 'Belum siap', lencana: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', batang: 'bg-rose-500', teks: 'text-rose-600 dark:text-rose-400', ikon: 'CircleAlert' },
}
export const nadaSkor = (n) => (n >= AMBANG_SKOR.hijau ? 'hijau' : n >= AMBANG_SKOR.kuning ? 'kuning' : 'merah')

// Pilihan periode untuk Buku Subrincian Objek & Rekap SIPLah: [kunci, judul, dari, sampai]
export const PERIODE_BUKU = [
  ['tahun', 'Setahun', 0, 11], ['tahap1', 'Tahap I (Jan–Jun)', 0, 5], ['tahap2', 'Tahap II (Jul–Des)', 6, 11],
  ['tw1', 'Triwulan I', 0, 2], ['tw2', 'Triwulan II', 3, 5], ['tw3', 'Triwulan III', 6, 8], ['tw4', 'Triwulan IV', 9, 11],
  ...['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((b, i) => [`b${i}`, b, i, i]),
]
