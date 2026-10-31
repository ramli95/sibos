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
      { judul: 'Pergeseran', ikon: 'ArrowRightLeft', ke: '/rkas/pergeseran', fase: 2 },
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
  { judul: 'Laporan', ikon: 'FileBarChart', warna: 'text-biru-muda', fase: 5 },
  { judul: 'Panduan Input', ikon: 'ArrowRightLeft', warna: 'text-kuning', fase: 5 },
  { judul: 'Barang & Aset', ikon: 'Boxes', warna: 'text-[#5FD3C0]', fase: 5 },
  {
    judul: 'Kepegawaian', ikon: 'IdCard', warna: 'text-biru-muda', fase: 1, peran: ['bendahara', 'tim_bos', 'kepala_sekolah'],
    anak: [
      { judul: 'Data Pegawai', ikon: 'Users', ke: '/pegawai', fase: 1 },
      { judul: 'Daftar Gaji', ikon: 'Wallet', fase: 6 },
      { judul: 'SKPG', ikon: 'FileSignature', fase: 6 },
      { judul: 'KGB', ikon: 'TrendingUp', fase: 6 },
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
  { judul: 'Impor Data', ikon: 'FileUp', ke: '/impor', warna: 'text-biru-muda', fase: 1, peran: ['bendahara'] },
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

// Tab halaman Belanja (rute /belanja/:tab)
export const TAB_BELANJA = [
  { kunci: 'daftar', judul: 'Daftar Belanja', ikon: 'ListChecks' },
  { kunci: 'honor', judul: 'Honor & Transpor', ikon: 'Wallet' },
  { kunci: 'arsip', judul: 'Arsip & Kelengkapan', ikon: 'Archive' },
]

// Tab halaman Agenda Surat (rute /agenda-surat/:tab)
export const TAB_AGENDA = [
  { kunci: 'daftar', judul: 'Buku Agenda', ikon: 'Mailbox' },
  { kunci: 'pola', judul: 'Pola Penomoran', ikon: 'Hash' },
]
