// Ekspor & impor kembali (round-trip) seluruh data SIBOS lewat Excel.
// Setiap koleksi menjadi satu lembar (kolom _id = kunci dokumen). Daftar di dalam dokumen
// (item belanja, penerima honor, uraian RKAS, butir referensi, baris tabel gaji, dll.) menjadi lembar anak
// "<koleksi>~<kolom>" dengan kolom _id (dokumen induk) dan _urut.
//   hapus: false   → dokumen yang hilang dari berkas tidak boleh dihapus (aturan Firestore / alasan keamanan)
//   hanyaTambah    → hanya baris baru yang ditambahkan (catatan yang tidak boleh diubah)
//   sub            → subkoleksi yang ikut (rkas/{versi}/bagian/{snp})
//   rahasia        → pegawai/{id}/rahasia/data digabung ke kolom "rahasia.*"
export const KOLEKSI_DATA = [
  {
    kelompok: 'Master & Pengaturan', ikon: 'Database', daftar: [
      { id: 'pegawai', judul: 'Data Pegawai (termasuk data rahasia)', ikon: 'Users', rahasia: true, label: (d) => d.nama },
      { id: 'rekanan', judul: 'Rekanan', ikon: 'Store', label: (d) => d.nama_usaha },
      { id: 'orang_luar', judul: 'Penerima luar (narasumber, juri)', ikon: 'UserRound', label: (d) => d.nama },
      { id: 'pejabat', judul: 'Pejabat per Periode', ikon: 'UserCheck', label: (d) => `${d.jabatan}: ${d.nama}` },
      { id: 'standar_harga', judul: 'Standar Harga', ikon: 'Tags', label: (d) => d.nama },
      { id: 'referensi', judul: 'Referensi Juknis & Aturan Pajak', ikon: 'BookMarked', hapus: false },
      { id: 'sekolah', judul: 'Profil, cetak, penomoran, aturan & tabel gaji', ikon: 'School', hapus: false, ket: 'Logo/tanda tangan bergambar tidak ikut (terlalu panjang untuk sel Excel) dan tetap seperti semula.' },
    ],
  },
  {
    kelompok: 'Perencanaan', ikon: 'ClipboardList', daftar: [
      { id: 'rkas', judul: 'RKAS: versi & uraian per SNP', ikon: 'ClipboardList', sub: ['bagian'], hapus: false, label: (d) => d.nama },
      { id: 'rkas_pergeseran', judul: 'Catatan pergeseran RKAS', ikon: 'ArrowRightLeft', hapus: false, hanyaTambah: true },
    ],
  },
  {
    kelompok: 'Belanja, Pajak & Kas', ikon: 'ShoppingCart', daftar: [
      { id: 'belanja', judul: 'Belanja & honor (tanpa foto)', ikon: 'ShoppingCart', label: (d) => d.nama_pekerjaan, ket: 'Foto dokumentasi tidak ikut diekspor dan tidak terhapus.' },
      { id: 'agenda_surat', judul: 'Agenda Surat', ikon: 'Mailbox', label: (d) => `${d.nomor} — ${d.perihal || ''}` },
      { id: 'penomoran', judul: 'Penghitung nomor surat/kwitansi', ikon: 'Hash', hapus: false },
      { id: 'setoran_pajak', judul: 'Setoran pajak', ikon: 'ReceiptText', label: (d) => d.ntpn || d.kode_billing },
      { id: 'kas', judul: 'Buku kas manual (penerimaan, bunga, tarik/setor)', ikon: 'BookOpenText', label: (d) => d.uraian },
      { id: 'tutup_buku', judul: 'Tutup buku bulanan', ikon: 'CalendarCheck', hapus: false },
      { id: 'rekening_koran', judul: 'Rekening koran', ikon: 'FileSearch' },
    ],
  },
  {
    kelompok: 'Barang & Aset', ikon: 'Boxes', daftar: [
      { id: 'aset', judul: 'KIB & Inventaris', ikon: 'Boxes', label: (d) => d.nama },
      { id: 'aset_ruang', judul: 'Ruangan', ikon: 'DoorOpen', label: (d) => d.nama },
      { id: 'persediaan', judul: 'Mutasi persediaan', ikon: 'Warehouse' },
      { id: 'barang_kelas', judul: 'Kelas barang hasil belanja', ikon: 'PackageSearch' },
      { id: 'bast_barang', judul: 'BAST Pengurus Barang', ikon: 'PackageCheck', label: (d) => d.nomor },
    ],
  },
  {
    kelompok: 'Kepegawaian & Gaji', ikon: 'Banknote', daftar: [
      { id: 'gaji_dasar', judul: 'Dasar gaji pegawai', ikon: 'Calculator' },
      { id: 'gaji', judul: 'Daftar gaji per bulan (resmi & tersimpan)', ikon: 'Wallet' },
      { id: 'kgb', judul: 'KGB (usulan & SK)', ikon: 'TrendingUp', label: (d) => d.nomor || d.nama },
      { id: 'skpg', judul: 'SKPG diterbitkan', ikon: 'FileSignature', label: (d) => `${d.nomor} — ${d.nama}` },
    ],
  },
  {
    kelompok: 'Informasi, Serah Terima & Catatan', ikon: 'Megaphone', daftar: [
      { id: 'publik', judul: 'Papan informasi publik (terbitan)', ikon: 'Globe', hapus: false },
      { id: 'ba_serah_terima', judul: 'Berita Acara serah terima bendahara', ikon: 'Repeat', label: (d) => `${d.tanggal} — ${d.pihak2?.nama || ''}` },
      { id: 'template_wa', judul: 'Template pesan WhatsApp', ikon: 'MessageSquareText' },
      { id: 'pesan_wa', judul: 'Riwayat pesan WhatsApp', ikon: 'MessageCircle', label: (d) => `${d.nama} — ${d.waktu}` },
      { id: 'catatan_kas_sekolah', judul: 'Catatan kas sekolah (di luar BOSP)', ikon: 'NotebookPen', label: (d) => d.uraian },
      { id: 'rekonsiliasi', judul: 'Rekonsiliasi ARKAS–SIMAKDA per bulan', ikon: 'GitCompareArrows', label: (d) => d.bulan },
    ],
  },
]

export const DEF_KOLEKSI = Object.fromEntries(KOLEKSI_DATA.flatMap((k) => k.daftar).map((d) => [d.id, d]))

// Kolom sistem: tidak dibandingkan & selalu diisi ulang saat impor
export const KOLOM_SISTEM = ['diperbarui', 'diperbarui_oleh']
export const VERSI_FORMAT = 1
