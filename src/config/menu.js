// Susunan menu SIBOS. Setiap menu & submenu berikon (Lucide) dan berwarna aksen.
// `fase` > 1 berarti menu disiapkan, tetapi baru aktif pada fase tersebut.
// `peran` kosong = semua peran boleh melihat.
export const MENU = [
  { judul: 'Dasbor', ikon: 'LayoutDashboard', ke: '/dasbor', warna: '', fase: 1 },
  {
    judul: 'RKAS', ikon: 'ClipboardList', warna: '', fase: 2,
    anak: [
      { judul: 'Ringkasan & Proporsi', ikon: 'ChartPie', ke: '/rkas/ringkasan', fase: 2 },
      { judul: 'Kertas Kerja', ikon: 'ListTree', ke: '/rkas/kertas-kerja', fase: 2 },
      { judul: 'Per Bulan', ikon: 'CalendarDays', ke: '/rkas/per-bulan', fase: 2 },
      { judul: 'Per Tahap', ikon: 'Layers', ke: '/rkas/per-tahap', fase: 2 },
      { judul: 'Pergeseran', ikon: 'ArrowRightLeft', ke: '/rkas/pergeseran', fase: 2 },
      { judul: 'Versi & Impor', ikon: 'GitCompareArrows', ke: '/rkas/versi', fase: 2 },
    ],
  },
  { judul: 'Belanja & Dokumen', ikon: 'ShoppingCart', warna: '', fase: 3 },
  { judul: 'Pajak', ikon: 'ReceiptText', warna: '', fase: 4 },
  { judul: 'Buku Kas', ikon: 'BookOpenText', warna: '', fase: 4 },
  { judul: 'Laporan', ikon: 'FileBarChart', warna: '', fase: 5 },
  { judul: 'Panduan Input', ikon: 'ArrowRightLeft', warna: '', fase: 5 },
  { judul: 'Barang & Aset', ikon: 'Boxes', warna: '', fase: 5 },
  {
    judul: 'Kepegawaian', ikon: 'IdCard', warna: '', fase: 1, peran: ['bendahara', 'tim_bos', 'kepala_sekolah'],
    anak: [
      { judul: 'Data Pegawai', ikon: 'Users', ke: '/pegawai', fase: 1 },
      { judul: 'Daftar Gaji', ikon: 'Wallet', fase: 6 },
      { judul: 'SKPG', ikon: 'FileSignature', fase: 6 },
      { judul: 'KGB', ikon: 'TrendingUp', fase: 6 },
    ],
  },
  {
    judul: 'Master Data', ikon: 'Database', warna: '', fase: 1,
    anak: [
      { judul: 'Rekanan', ikon: 'Store', ke: '/rekanan', fase: 1 },
      { judul: 'Referensi Juknis', ikon: 'BookMarked', ke: '/referensi', fase: 1 },
      { judul: 'Standar Harga', ikon: 'Tags', ke: '/standar-harga', fase: 2 },
    ],
  },
  { judul: 'Agenda Surat', ikon: 'Mailbox', warna: '', fase: 3 },
  { judul: 'Impor Data', ikon: 'FileUp', ke: '/impor', warna: '', fase: 1, peran: ['bendahara'] },
  { judul: 'Log Aktivitas', ikon: 'History', ke: '/log', warna: '', fase: 1, peran: ['bendahara', 'kepala_sekolah'] },
  { judul: 'Pengaturan', ikon: 'Settings', ke: '/pengaturan', warna: '', fase: 1, peran: ['bendahara'] },
]

// Tab halaman Pengaturan
export const TAB_PENGATURAN = [
  { kunci: 'profil', judul: 'Profil Sekolah', ikon: 'School', warna: '' },
  { kunci: 'kop', judul: 'Kop & Logo', ikon: 'Image', warna: '' },
  { kunci: 'pejabat', judul: 'Pejabat per Periode', ikon: 'UserCheck', warna: '' },
  { kunci: 'pengguna', judul: 'Pengguna & Peran', ikon: 'UsersRound', warna: '' },
  { kunci: 'cetak', judul: 'Pengaturan Cetak', ikon: 'Printer', warna: '' },
  { kunci: 'notifikasi', judul: 'Notifikasi', ikon: 'BellRing', warna: '' },
  { kunci: 'drive', judul: 'Drive & Cadangan', ikon: 'HardDrive', warna: '' },
]

// Tab halaman RKAS (rute /rkas/:tab)
export const TAB_RKAS = [
  { kunci: 'ringkasan', judul: 'Ringkasan & Proporsi', ikon: 'ChartPie', warna: '' },
  { kunci: 'kertas-kerja', judul: 'Kertas Kerja', ikon: 'ListTree', warna: '' },
  { kunci: 'per-bulan', judul: 'Per Bulan', ikon: 'CalendarDays', warna: '' },
  { kunci: 'per-tahap', judul: 'Per Tahap', ikon: 'Layers', warna: '' },
  { kunci: 'pergeseran', judul: 'Pergeseran', ikon: 'ArrowRightLeft', warna: '' },
  { kunci: 'versi', judul: 'Versi & Impor', ikon: 'GitCompareArrows', warna: '' },
]
