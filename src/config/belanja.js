// Konstanta Fase 3 — Belanja & Dokumen SPJ.
// Dasar: Permendikbudristek 18/2022 (bukti PBJ satuan pendidikan) dan Permendikdasmen 8/2026 (Juknis BOSP).

// Cara pengadaan
export const CARA = {
  non_siplah: { label: 'Non-SIPLah', ikon: 'Store', ket: 'Toko/penyedia langsung — SIBOS membuat paket dokumen lengkap' },
  siplah: { label: 'SIPLah', ikon: 'ShoppingBag', ket: 'Dokumen dari mitra SIPLah diunggah sebagai PDF' },
}

export const MITRA_SIPLAH = ['Blibli', 'Telkom (PaDi UMKM)', 'Toko Ladang', 'Tokopedia', 'Eduqu', 'Mbizmarket', 'SIPLah Lainnya']

// Enam dokumen yang biasa diunduh dari mitra SIPLah
export const DOKUMEN_SIPLAH = [
  { kunci: 'sp', judul: 'Surat Pesanan / PO', ikon: 'FileSignature' },
  { kunci: 'bast', judul: 'Berita Acara Serah Terima', ikon: 'PackageCheck' },
  { kunci: 'invoice', judul: 'Invoice / Tagihan', ikon: 'ReceiptText' },
  { kunci: 'kwitansi', judul: 'Kuitansi / Bukti Bayar', ikon: 'Banknote' },
  { kunci: 'faktur_pajak', judul: 'Faktur Pajak', ikon: 'Percent' },
  { kunci: 'bukti_pajak', judul: 'Bukti Potong / Setor Pajak', ikon: 'Landmark' },
]

// Status transaksi — ditentukan otomatis dari tanggal yang sudah terisi
export const STATUS = {
  draf: { label: 'Draf', ikon: 'FilePen', chip: 'ikon-chip', lencana: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  dipesan: { label: 'Dipesan', ikon: 'FileSignature', chip: 'ikon-chip', lencana: 'bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300' },
  diterima: { label: 'Diterima', ikon: 'PackageCheck', chip: 'ikon-chip-peringatan', lencana: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  lunas: { label: 'Lunas', ikon: 'BadgeCheck', chip: 'ikon-chip-sukses', lencana: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

// Jenis transaksi honor/transpor (daftar penerima orang)
export const JENIS_HONOR = {
  honor: { label: 'Honor', ikon: 'Wallet', ket: 'Honor bulanan guru/tendik non-ASN, honor panitia', dokumen: ['penerimaan_honor', 'daftar_hadir'] },
  narasumber: { label: 'Narasumber', ikon: 'Briefcase', ket: 'Honor narasumber/pembahas/moderator', dokumen: ['penerimaan_honor', 'daftar_hadir', 'foto'] },
  transpor: { label: 'Transpor', ikon: 'Bus', ket: 'Uang transpor peserta/pendamping', dokumen: ['tanda_terima_transpor', 'daftar_hadir'] },
  insentif: { label: 'Insentif/Lainnya', ikon: 'HeartHandshake', ket: 'Pembayaran lain kepada perorangan', dokumen: ['penerimaan_honor'] },
  upah: { label: 'Upah harian', ikon: 'Hammer', ket: 'Upah tukang/tenaga harian/borongan (TER harian)', dokumen: ['penerimaan_honor', 'daftar_hadir'] },
  uang_saku: { label: 'Uang saku/hadiah', ikon: 'Sparkles', ket: 'Uang saku, uang rapat, hadiah lomba peserta (PPh 21 peserta kegiatan)', dokumen: ['penerimaan_honor', 'daftar_hadir'] },
}

// Semua dokumen yang dapat dibuat SIBOS. urutan = urutan di Paket SPJ.
// wajib = selalu dibuat untuk belanja Non-SIPLah; pilih = dicentang manual per transaksi.
export const DOKUMEN = {
  sampul: { judul: 'Sampul Kwitansi (format sekolah)', ikon: 'BookMarked', urutan: 0, grup: 1 },
  kwitansi_besar: { judul: 'Kwitansi Besar (3 tanda tangan)', ikon: 'BookOpenText', urutan: 1, grup: 1 },
  kwitansi_kecil: { judul: 'Kwitansi Kecil', ikon: 'Banknote', urutan: 2, grup: 2 },
  perencanaan: { judul: 'Dokumen Perencanaan', ikon: 'ClipboardList', urutan: 3, grup: 3 },
  pembandingan: { judul: 'Dokumen Hasil Pembandingan', ikon: 'Scale', urutan: 4, grup: 3 },
  negosiasi: { judul: 'Dokumen Hasil Negosiasi', ikon: 'Handshake', urutan: 5, grup: 3 },
  surat_pesanan: { judul: 'Surat Pesanan', ikon: 'FileSignature', urutan: 6, grup: 3 },
  proforma: { judul: 'Proforma Invoice', ikon: 'FileText', urutan: 7, grup: 4 },
  invoice: { judul: 'Invoice', ikon: 'ReceiptText', urutan: 8, grup: 4 },
  shp: { judul: 'Surat Hasil Pemeriksaan', ikon: 'ListChecks', urutan: 9, grup: 5 },
  bast: { judul: 'Berita Acara Serah Terima', ikon: 'PackageCheck', urutan: 10, grup: 5 },
  foto: { judul: 'Lampiran Foto', ikon: 'Image', urutan: 11, grup: 6 },
  notulen: { judul: 'Notulen / Laporan Singkat', ikon: 'ScrollText', urutan: 12, grup: 6 },
  penerimaan_honor: { judul: 'Daftar Penerimaan Honor', ikon: 'Wallet', urutan: 13, grup: 7, mendatar: true },
  tanda_terima_transpor: { judul: 'Tanda Terima Transpor', ikon: 'Bus', urutan: 14, grup: 7, mendatar: true },
  daftar_hadir: { judul: 'Daftar Hadir Peserta', ikon: 'Users', urutan: 15, grup: 7 },
  penerima_konsumsi: { judul: 'Daftar Penerima Konsumsi', ikon: 'UtensilsCrossed', urutan: 16, grup: 7 },
}

export const GRUP_PAKET = {
  1: 'Sampul & Kwitansi Besar', 2: 'Kwitansi Kecil', 3: 'Pemesanan', 4: 'Faktur & Invoice', 5: 'Pemeriksaan & Serah Terima', 6: 'Lampiran Foto', 7: 'Daftar Penerimaan & Hadir',
}

// Dokumen wajib belanja Non-SIPLah (bukti PBJ Pasal 25 Permendikbudristek 18/2022)
export const DOKUMEN_WAJIB = ['sampul', 'kwitansi_besar', 'surat_pesanan', 'shp', 'bast']
// Dokumen pilihan (centang manual per transaksi), bawaan tercentang
export const DOKUMEN_PILIHAN = [
  { kunci: 'perencanaan', bawaan: true, ket: 'Boleh dikecualikan untuk belanja ≤ Rp 1 juta (Pasal 12 ayat 3)' },
  { kunci: 'pembandingan', bawaan: false, ket: 'Wajib > Rp 50 juta (min. 2 calon penyedia)' },
  { kunci: 'negosiasi', bawaan: false, ket: 'Pembandingan ATAU negosiasi untuk ≤ Rp 50 juta' },
  { kunci: 'kwitansi_kecil', bawaan: true, ket: 'Bila toko tidak menyiapkan nota/kuitansi sendiri' },
  { kunci: 'proforma', bawaan: true, ket: 'Tagihan sementara sebelum pembayaran' },
  { kunci: 'invoice', bawaan: true, ket: 'Tagihan akhir dari penyedia' },
  { kunci: 'foto', bawaan: true, ket: 'Dokumentasi BAST/kegiatan' },
]

// Lampiran kegiatan (konsumsi rapat/lomba): ditawarkan otomatis bila ada item konsumsi
export const LAMPIRAN_KONSUMSI = ['daftar_hadir', 'penerima_konsumsi', 'foto']

// Pola nomor bawaan (bisa diubah di Agenda Surat → Pola Penomoran).
// Penanda: {urut} {urut3} {romawi} {bulan} {tahun} {rekanan}
export const POLA_NOMOR_AWAL = {
  surat: '421/{urut}/UPT.SPF.SMPN.19/{romawi}/{tahun}',
  kwitansi: 'Kwt/{urut3}/SMPN19/{bulan}/{tahun}',
  invoice: 'INV/{rekanan}/{urut3}/{tahun}',
  proforma: 'PI/{rekanan}/{urut3}/{tahun}',
}
export const PENANDA_NOMOR = [
  ['{urut}', 'Nomor urut (1, 2, 3, …)'], ['{urut3}', 'Nomor urut 3 digit (001)'], ['{romawi}', 'Bulan Romawi (X)'],
  ['{bulan}', 'Bulan 2 digit (10)'], ['{tahun}', 'Tahun (2026)'], ['{rekanan}', 'Singkatan rekanan (TSJ)'],
]
// Jenis nomor & penghitungnya (penghitung per tahun)
export const JENIS_NOMOR = {
  surat_pesanan: { judul: 'Surat Pesanan', pola: 'surat', hitung: 'surat', singkat: 'SP' },
  shp: { judul: 'Surat Hasil Pemeriksaan', pola: 'surat', hitung: 'surat', singkat: 'SHP' },
  bast: { judul: 'Berita Acara Serah Terima', pola: 'surat', hitung: 'surat', singkat: 'BAST' },
  negosiasi: { judul: 'Dokumen Hasil Negosiasi', pola: 'surat', hitung: 'surat', singkat: 'BAN' },
  kwitansi_kecil: { judul: 'Kwitansi', pola: 'kwitansi', hitung: 'kwitansi', singkat: 'Kwt' },
  invoice: { judul: 'Invoice', pola: 'invoice', hitung: 'invoice', singkat: 'INV' },
  proforma: { judul: 'Proforma Invoice', pola: 'proforma', hitung: 'invoice', singkat: 'PI' },
}

// Jenis surat di Agenda Surat (termasuk surat manual)
export const JENIS_AGENDA = {
  surat_pesanan: 'Surat Pesanan', shp: 'Surat Hasil Pemeriksaan', bast: 'Berita Acara Serah Terima', negosiasi: 'BA Negosiasi',
  kwitansi_kecil: 'Kwitansi', invoice: 'Invoice', proforma: 'Proforma Invoice', surat_tugas: 'Surat Tugas', undangan: 'Undangan', lainnya: 'Surat Lainnya',
}

// Kelengkapan arsip yang diunggah (dokumen bertanda tangan/nota asli)
export const ARSIP = [
  { kunci: 'paket_ttd', judul: 'Paket SPJ bertanda tangan', ikon: 'FileCheck' },
  { kunci: 'nota_asli', judul: 'Nota/kuitansi asli toko', ikon: 'ReceiptText' },
  { kunci: 'faktur_pajak', judul: 'Faktur pajak / bukti setor', ikon: 'Percent' },
  { kunci: 'lainnya', judul: 'Dokumen lainnya', ikon: 'FileStack' },
]

// Kategori anggaran (sama dengan RKAS)
export const KATEGORI_LABEL = { operasional: 'Operasional', alat_mesin: 'Alat & Mesin', aset_lain: 'Aset Tetap Lainnya' }

// Batas & aturan
export const BATAS = {
  non_pkp: 2_000_000, // peringatan penyedia non-PKP di atas nilai ini
  perencanaan: 1_000_000, // perencanaan boleh dikecualikan ≤ nilai ini
  kwitansi: 10_000_000, // > nilai ini bukti pembayaran berupa kuitansi
  spk: 50_000_000, // > nilai ini surat pesanan berbentuk SPK & wajib pembandingan
}
