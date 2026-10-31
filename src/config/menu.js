// Susunan menu SIBOS. Setiap menu & submenu berikon (Lucide) dan berwarna aksen.
// `fase` > 1 berarti menu disiapkan, tetapi baru aktif pada fase tersebut.
// `peran` kosong = semua peran boleh melihat.
export const MENU = [
  { judul: 'Dasbor', ikon: 'LayoutDashboard', ke: '/dasbor', warna: 'text-langit', fase: 1 },
  { judul: 'RKAS', ikon: 'ClipboardList', warna: 'text-kuning', fase: 2 },
  { judul: 'Belanja & Dokumen', ikon: 'ShoppingCart', warna: 'text-merah', fase: 3 },
  { judul: 'Pajak', ikon: 'ReceiptText', warna: 'text-tosca', fase: 4 },
  { judul: 'Buku Kas', ikon: 'BookOpenText', warna: 'text-langit', fase: 4 },
  { judul: 'Laporan', ikon: 'FileBarChart', warna: 'text-kuning', fase: 5 },
  { judul: 'Panduan Input', ikon: 'ArrowRightLeft', warna: 'text-merah', fase: 5 },
  { judul: 'Barang & Aset', ikon: 'Boxes', warna: 'text-tosca', fase: 5 },
  {
    judul: 'Kepegawaian', ikon: 'IdCard', warna: 'text-langit', fase: 1, peran: ['bendahara', 'tim_bos', 'kepala_sekolah'],
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
      { judul: 'Standar Harga', ikon: 'Tags', fase: 2 },
    ],
  },
  { judul: 'Agenda Surat', ikon: 'Mailbox', warna: 'text-merah', fase: 3 },
  { judul: 'Impor Data', ikon: 'FileUp', ke: '/impor', warna: 'text-tosca', fase: 1, peran: ['bendahara'] },
  { judul: 'Log Aktivitas', ikon: 'History', ke: '/log', warna: 'text-langit', fase: 1, peran: ['bendahara', 'kepala_sekolah'] },
  { judul: 'Pengaturan', ikon: 'Settings', ke: '/pengaturan', warna: 'text-kuning', fase: 1, peran: ['bendahara'] },
]

// Tab halaman Pengaturan
export const TAB_PENGATURAN = [
  { kunci: 'profil', judul: 'Profil Sekolah', ikon: 'School', warna: 'text-biru' },
  { kunci: 'kop', judul: 'Kop & Logo', ikon: 'Image', warna: 'text-merah' },
  { kunci: 'pejabat', judul: 'Pejabat per Periode', ikon: 'UserCheck', warna: 'text-tosca' },
  { kunci: 'pengguna', judul: 'Pengguna & Peran', ikon: 'UsersRound', warna: 'text-ungu' },
  { kunci: 'cetak', judul: 'Pengaturan Cetak', ikon: 'Printer', warna: 'text-kuning' },
  { kunci: 'notifikasi', judul: 'Notifikasi', ikon: 'BellRing', warna: 'text-ungu' },
  { kunci: 'drive', judul: 'Drive & Cadangan', ikon: 'HardDrive', warna: 'text-hijau' },
]
