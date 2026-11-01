// Susunan menu SIBOS. Setiap menu & submenu berikon (Lucide) dan berwarna aksen.
// `fase` > 1 berarti menu disiapkan, tetapi baru aktif pada fase tersebut.
// `peran` kosong = semua peran boleh melihat.
export const MENU = [
  { judul: 'Dasbor', ikon: 'LayoutDashboard', ke: '/dasbor', warna: 'text-biru-muda', fase: 1 },
  {
    judul: 'RKAS', ikon: 'ClipboardList', warna: 'text-kuning', fase: 2,
    anak: [
      { judul: 'Ringkasan & Proporsi', ikon: 'ChartPie', ke: '/rkas/ringkasan', fase: 2 },
      { judul: 'Kertas Kerja', ikon: 'ListTree', ke: '/rkas/kertas-kerja', fase: 2 },
      { judul: 'Per Bulan', ikon: 'CalendarDays', ke: '/rkas/per-bulan', fase: 2 },
      { judul: 'Per Tahap', ikon: 'Layers', ke: '/rkas/per-tahap', fase: 2 },
      { judul: 'Pergeseran & Perubahan', ikon: 'ArrowRightLeft', ke: '/rkas/pergeseran', fase: 2 },
      { judul: 'Grafik', ikon: 'ChartColumn', ke: '/rkas/grafik', fase: 2 },
      { judul: 'Versi & Impor', ikon: 'GitCompareArrows', ke: '/rkas/versi', fase: 2 },
    ],
  },
  {
    judul: 'Belanja & Dokumen', ikon: 'ShoppingCart', warna: 'text-[#5FD3C0]', fase: 3,
    anak: [
      { judul: 'Daftar Belanja', ikon: 'ListChecks', ke: '/belanja/daftar', fase: 3 },
      { judul: 'Belanja Baru', ikon: 'CirclePlus', ke: '/belanja/baru', fase: 3, peran: ['bendahara'] },
      { judul: 'Honor & Transpor', ikon: 'Wallet', ke: '/belanja/honor', fase: 3 },
      { judul: 'Arsip & Kelengkapan', ikon: 'Archive', ke: '/belanja/arsip', fase: 3 },
      { judul: 'Cetak Massal SPJ', ikon: 'Files', ke: '/belanja/massal', fase: 7 },
    ],
  },
  {
    judul: 'Pajak', ikon: 'ReceiptText', warna: 'text-kuning', fase: 4,
    anak: [
      { judul: 'Pajak Terutang', ikon: 'ReceiptText', ke: '/pajak/terutang', fase: 4 },
      { judul: 'Buku Pembantu Pajak', ikon: 'BookOpenText', ke: '/pajak/buku', fase: 4 },
      { judul: 'Rekap per Penerima', ikon: 'UsersRound', ke: '/pajak/penerima', fase: 4 },
      { judul: 'Aturan Tarif', ikon: 'Percent', ke: '/pajak/aturan', fase: 4 },
    ],
  },
  {
    judul: 'Buku Kas', ikon: 'BookOpenText', warna: 'text-[#5FD3C0]', fase: 4,
    anak: [
      { judul: 'Buku Kas Umum', ikon: 'BookOpenText', ke: '/buku-kas/bku', fase: 4 },
      { judul: 'Buku Bank', ikon: 'Landmark', ke: '/buku-kas/bank', fase: 4 },
      { judul: 'Kas Tunai', ikon: 'Banknote', ke: '/buku-kas/tunai', fase: 4 },
      { judul: 'Tutup Buku', ikon: 'CalendarCheck', ke: '/buku-kas/tutup', fase: 4 },
      { judul: 'Rekening Koran', ikon: 'FileSearch', ke: '/buku-kas/koran', fase: 4 },
      { judul: 'Uji Paralel', ikon: 'GitCompareArrows', ke: '/buku-kas/paralel', fase: 4 },
      { judul: 'Migrasi 2026', ikon: 'DatabaseZap', ke: '/buku-kas/migrasi', fase: 4, peran: ['bendahara'] },
    ],
  },
  {
    judul: 'Laporan', ikon: 'FileBarChart', warna: 'text-biru-muda', fase: 5,
    anak: [
      { judul: 'Realisasi SNP & Komponen', ikon: 'ChartPie', ke: '/laporan/realisasi', fase: 5 },
      { judul: 'Laporan Pemda Bulanan', ikon: 'Landmark', ke: '/laporan/pemda', fase: 5 },
      { judul: 'Tahap & Tahunan', ikon: 'CalendarRange', ke: '/laporan/tahunan', fase: 5 },
      { judul: 'Buku Subrincian Objek', ikon: 'BookCopy', ke: '/laporan/objek', fase: 5 },
      { judul: 'Rekap SIPLah', ikon: 'ShoppingBag', ke: '/laporan/siplah', fase: 5 },
      { judul: 'Laporan Pemda Lainnya', ikon: 'Files', ke: '/laporan/pemda-lain', fase: 7 },
      { judul: 'Rekap, Matriks & SK', ikon: 'Sheet', ke: '/laporan/rekap-lain', fase: 7 },
      { judul: 'Kesiapan SPJ', ikon: 'Gauge', ke: '/laporan/kesiapan', fase: 5 },
      { judul: 'Ekspor SIMAKDA', ikon: 'FileSpreadsheet', ke: '/laporan/simakda', fase: 5 },
    ],
  },
  {
    judul: 'Papan Informasi', ikon: 'Megaphone', warna: 'text-kuning', fase: 7,
    anak: [
      { judul: 'Ringkasan Komite', ikon: 'Handshake', ke: '/informasi/komite', fase: 7 },
      { judul: 'Poster F4', ikon: 'Presentation', ke: '/informasi/poster', fase: 7 },
      { judul: 'Tautan Publik', ikon: 'Globe', ke: '/informasi/publik', fase: 7, peran: ['bendahara'] },
    ],
  },
  {
    judul: 'Keuangan Bendahara', ikon: 'PiggyBank', warna: 'text-[#5FD3C0]', fase: 7, peran: ['bendahara', 'kepala_sekolah'],
    anak: [
      { judul: 'Dasbor Bulanan', ikon: 'ChartColumn', ke: '/keuangan/bulanan', fase: 7 },
      { judul: 'Catatan Kas Sekolah', ikon: 'NotebookPen', ke: '/keuangan/kas-sekolah', fase: 7 },
      { judul: 'Catatan Pribadi', ikon: 'LockKeyhole', ke: '/keuangan/pribadi', fase: 7, peran: ['bendahara'] },
    ],
  },
  {
    judul: 'Barang & Aset', ikon: 'Boxes', warna: 'text-[#5FD3C0]', fase: 5, peran: ['bendahara', 'pengurus_barang', 'kepala_sekolah', 'tim_bos'],
    anak: [
      { judul: 'Barang dari Belanja', ikon: 'PackageSearch', ke: '/barang/klasifikasi', fase: 5 },
      { judul: 'KIB & Inventaris', ikon: 'Boxes', ke: '/barang/inventaris', fase: 5 },
      { judul: 'Ruangan & KIR', ikon: 'DoorOpen', ke: '/barang/ruang', fase: 5 },
      { judul: 'BAST Pengurus Barang', ikon: 'PackageCheck', ke: '/barang/bast', fase: 5 },
      { judul: 'Persediaan', ikon: 'Warehouse', ke: '/barang/persediaan', fase: 5 },
    ],
  },
  {
    judul: 'Kepegawaian', ikon: 'IdCard', warna: 'text-biru-muda', fase: 1, peran: ['bendahara', 'tim_bos', 'kepala_sekolah'],
    anak: [
      { judul: 'Data Pegawai', ikon: 'Users', ke: '/pegawai', fase: 1 },
      { judul: 'Daftar Gaji', ikon: 'Wallet', ke: '/gaji/daftar', fase: 6, peran: ['bendahara'] },
      { judul: 'Dasar Gaji', ikon: 'Calculator', ke: '/gaji/dasar', fase: 6, peran: ['bendahara'] },
      { judul: 'SKPG', ikon: 'FileSignature', ke: '/gaji/skpg', fase: 6, peran: ['bendahara'] },
      { judul: 'KGB', ikon: 'TrendingUp', ke: '/gaji/kgb', fase: 6, peran: ['bendahara'] },
    ],
  },
  {
    judul: 'Master Data', ikon: 'Database', warna: 'text-kuning', fase: 1,
    anak: [
      { judul: 'Rekanan', ikon: 'Store', ke: '/rekanan', fase: 1 },
      { judul: 'Referensi Juknis', ikon: 'BookMarked', ke: '/referensi', fase: 1 },
      { judul: 'Standar Harga', ikon: 'Tags', ke: '/standar-harga', fase: 2 },
    ],
  },
  { judul: 'Agenda Surat', ikon: 'Mailbox', ke: '/agenda-surat/daftar', warna: 'text-[#5FD3C0]', fase: 3 },
  { judul: 'WhatsApp', ikon: 'MessageCircle', ke: '/whatsapp/kirim', warna: 'text-[#5FD3C0]', fase: 7, peran: ['bendahara'] },
  { judul: 'Serah Terima', ikon: 'Repeat', ke: '/serah-terima/berita-acara', warna: 'text-kuning', fase: 7, peran: ['bendahara', 'kepala_sekolah'] },
  { judul: 'Ekspor & Impor', ikon: 'ArrowDownUp', ke: '/data', warna: 'text-biru-muda', fase: 1, peran: ['bendahara'] },
  { judul: 'Log Aktivitas', ikon: 'History', ke: '/log', warna: 'text-kuning', fase: 1, peran: ['bendahara', 'kepala_sekolah'] },
  { judul: 'Pengaturan', ikon: 'Settings', ke: '/pengaturan', warna: 'text-biru-muda', fase: 1, peran: ['bendahara'] },
]

// Tab halaman Pengaturan
export const TAB_PENGATURAN = [
  { kunci: 'profil', judul: 'Profil Sekolah', ikon: 'School', warna: '' },
  { kunci: 'tahun', judul: 'Tahun Anggaran', ikon: 'CalendarRange', warna: '' },
  { kunci: 'kop', judul: 'Kop & Logo', ikon: 'Image', warna: '' },
  { kunci: 'pejabat', judul: 'Pejabat per Periode', ikon: 'UserCheck', warna: '' },
  { kunci: 'pengguna', judul: 'Pengguna & Peran', ikon: 'UsersRound', warna: '' },
  { kunci: 'cetak', judul: 'Pengaturan Cetak', ikon: 'Printer', warna: '' },
  { kunci: 'drive', judul: 'Drive, Cadangan & Notifikasi', ikon: 'HardDrive', warna: '' },
  { kunci: 'panduan', judul: 'Panduan Input', ikon: 'Compass', warna: '' },
]

// Tab halaman RKAS (rute /rkas/:tab)
export const TAB_RKAS = [
  { kunci: 'ringkasan', judul: 'Ringkasan & Proporsi', ikon: 'ChartPie', warna: '' },
  { kunci: 'kertas-kerja', judul: 'Kertas Kerja', ikon: 'ListTree', warna: '' },
  { kunci: 'per-bulan', judul: 'Per Bulan', ikon: 'CalendarDays', warna: '' },
  { kunci: 'per-tahap', judul: 'Per Tahap', ikon: 'Layers', warna: '' },
  { kunci: 'pergeseran', judul: 'Pergeseran & Perubahan', ikon: 'ArrowRightLeft', warna: '' },
  { kunci: 'grafik', judul: 'Grafik', ikon: 'ChartColumn', warna: '' },
  { kunci: 'versi', judul: 'Versi & Impor', ikon: 'GitCompareArrows', warna: '' },
]

// Tab halaman Belanja (rute /belanja/:tab)
export const TAB_BELANJA = [
  { kunci: 'daftar', judul: 'Daftar Belanja', ikon: 'ListChecks' },
  { kunci: 'honor', judul: 'Honor & Transpor', ikon: 'Wallet' },
  { kunci: 'arsip', judul: 'Arsip & Kelengkapan', ikon: 'Archive' },
  { kunci: 'massal', judul: 'Cetak Massal SPJ', ikon: 'Files' },
]

// Tab halaman Agenda Surat (rute /agenda-surat/:tab)
export const TAB_AGENDA = [
  { kunci: 'daftar', judul: 'Buku Agenda', ikon: 'Mailbox' },
  { kunci: 'pola', judul: 'Pola Penomoran', ikon: 'Hash' },
]

// Tab Papan Informasi (rute /informasi/:tab) — Fase 7
export const TAB_INFORMASI = [
  { kunci: 'komite', judul: 'Ringkasan Komite', ikon: 'Handshake' },
  { kunci: 'poster', judul: 'Poster F4', ikon: 'Presentation' },
  { kunci: 'publik', judul: 'Tautan Publik', ikon: 'Globe', peran: ['bendahara'] },
]

// Tab Serah Terima Bendahara (rute /serah-terima/:tab) — Fase 7
export const TAB_SERAH = [
  { kunci: 'berita-acara', judul: 'Berita Acara', ikon: 'FileSignature' },
  { kunci: 'akun', judul: 'Pindahkan Akun Admin', ikon: 'UserCog' },
]

// Tab WhatsApp (rute /whatsapp/:tab) — Fase 7
export const TAB_WA = [
  { kunci: 'kirim', judul: 'Kirim Pesan', ikon: 'Send' },
  { kunci: 'template', judul: 'Template', ikon: 'MessageSquareText' },
  { kunci: 'riwayat', judul: 'Riwayat', ikon: 'History' },
]

// Tab Keuangan Bendahara (rute /keuangan/:tab) — Fase 7
export const TAB_KEUANGAN = [
  { kunci: 'bulanan', judul: 'Dasbor Bulanan', ikon: 'ChartColumn' },
  { kunci: 'kas-sekolah', judul: 'Catatan Kas Sekolah', ikon: 'NotebookPen' },
  { kunci: 'pribadi', judul: 'Catatan Pribadi', ikon: 'LockKeyhole', peran: ['bendahara'] },
]
