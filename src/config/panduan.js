// Panduan Input — tur interaktif per menu (Fase 5; tur Kepegawaian & Gaji ditambahkan di Fase 6; Fase 7: papan informasi, serah terima, WhatsApp, keuangan, cetak massal, laporan Pemda lainnya).
// Setiap langkah menyorot elemen (pilih: satu atau beberapa selector CSS; yang pertama terlihat dipakai).
// Bila elemen tidak ditemukan, langkah ditampilkan di tengah layar. rute = halaman tempat tur berjalan.

const MENU = ['nav[aria-label="Menu utama"]', 'nav[aria-label="Navigasi utama"]']
const JUDUL = '[data-tur="judul-halaman"]'
const BANTUAN = '[data-tur="tombol-panduan"]'
const TAB = '[role="tablist"]'
const TAHUN = 'select[id^="tahun-"]'

export const TUR = {
  dasbor: {
    judul: 'Mengenal SIBOS', ikon: 'LayoutDashboard', warna: '#1A62E8', rute: '/dasbor', kelompok: 'Mulai',
    ket: 'Menu, dasbor, tahun anggaran, dan tombol bantuan.',
    langkah: [
      { judul: 'Selamat datang di SIBOS', isi: 'Tur singkat ini menunjukkan bagian penting aplikasi. Tekan Lanjut, atau Esc untuk berhenti kapan saja.' },
      { pilih: MENU, judul: 'Menu utama', isi: 'Semua menu dikelompokkan sesuai alur kerja: RKAS → Belanja & Dokumen → Pajak → Buku Kas → Laporan → Barang & Aset. Di HP, menu lain ada di tombol "Lainnya".' },
      { pilih: [JUDUL], judul: 'Judul halaman', isi: 'Menunjukkan halaman yang sedang dibuka beserta ikonnya.' },
      { pilih: ['.kartu'], judul: 'Ringkasan dana', isi: 'Dasbor menampilkan pagu, realisasi, saldo, pajak belum disetor, dan pengingat tenggat. Kartu bisa diketuk untuk membuka menu terkait.' },
      { pilih: ['[data-tur="dasbor-pengingat"]'], judul: 'Perlu perhatian', isi: 'Pajak lewat jatuh tempo, tenggat laporan, buku belum ditutup, transaksi belum masuk ARKAS/SIMAKDA, pagu uraian terlampaui, SPJ belum lengkap, dan rencana bulan ini. Yang mendesak juga dikirim ke lonceng sekali sehari.' },
      { pilih: [BANTUAN], judul: 'Butuh bantuan?', isi: 'Tekan tombol tanda tanya ini di halaman mana pun untuk memutar tur menu tersebut. Daftar lengkap ada di Pengaturan → Panduan Input.' },
    ],
  },
  rkas: {
    judul: 'Impor & membaca RKAS', ikon: 'ClipboardList', warna: '#E3A414', rute: '/rkas/versi', kelompok: 'Perencanaan',
    ket: 'Impor PDF ARKAS, pilih versi berlaku, lihat proporsi Juknis.',
    langkah: [
      { pilih: [TAHUN], judul: 'Pilih tahun anggaran', isi: 'RKAS disimpan per tahun. Tahun aktif dipilih otomatis.' },
      { pilih: [TAB], judul: 'Bagian RKAS', isi: 'Ringkasan & Proporsi, Kertas Kerja, Per Bulan, Per Tahap, Pergeseran, dan Versi & Impor.' },
      { pilih: ['main .kartu:nth-of-type(3)', 'main section'], judul: 'Impor dari ARKAS', isi: 'Unggah PDF "Kertas Kerja per Tahap" lalu "Rincian Kertas Kerja Perbulan" dari ARKAS. SIBOS membaca uraian, volume, harga, dan rencana bulanan.' },
      { judul: 'Versi berlaku', isi: 'Simpan Murni, Pergeseran, dan Perubahan sebagai versi terpisah. Tandai satu versi sebagai "berlaku" — versi ini dipakai Belanja dan Laporan.' },
    ],
  },
  belanja: {
    judul: 'Mencatat belanja & SPJ', ikon: 'ShoppingCart', warna: '#22A08D', rute: '/belanja/daftar', kelompok: 'Pelaksanaan',
    ket: 'Belanja Non-SIPLah/SIPLah, tanggal bertahap, paket dokumen SPJ.',
    langkah: [
      { pilih: [TAB], judul: 'Bagian belanja', isi: 'Daftar Belanja, Honor & Transpor, serta Arsip & Kelengkapan.' },
      { pilih: ['#bulan-belanja'], judul: 'Saring per bulan', isi: 'Bawaannya 3 bulan terakhir. Pilih bulan untuk melihat transaksi tertentu.' },
      { pilih: ['a[href*="belanja/baru"]', 'button.tombol-utama'], judul: 'Belanja baru', isi: 'Isi penyedia, pilih item dari uraian RKAS atau Standar Harga, lalu isi tanggal bertahap: pesanan → BAST → invoice → lunas. Status berubah otomatis.' },
      { judul: 'Nomor & dokumen otomatis', isi: 'Saat disimpan, nomor Surat Pesanan, SHP, BAST, kwitansi, dan invoice diberikan otomatis lalu tercatat di Agenda Surat. Cetak paket SPJ F4 sekali klik.' },
      { judul: 'Lengkapi arsip', isi: 'Unggah foto BAST/kegiatan dan paket SPJ bertanda tangan. Kelengkapan ini menaikkan skor Kesiapan SPJ di menu Laporan.' },
    ],
  },
  honor: {
    judul: 'Honor & transpor', ikon: 'Wallet', warna: '#7C5CFA', rute: '/belanja/honor', kelompok: 'Pelaksanaan',
    ket: 'Daftar penerima, PPh 21 otomatis, syarat honor Juknis.',
    langkah: [
      { pilih: [TAB], judul: 'Tab Honor & Transpor', isi: 'Berisi semua pembayaran kepada orang: honor bulanan, narasumber, transpor, upah, uang saku.' },
      { judul: 'Pilih jenis & uraian RKAS', isi: 'Jenis menentukan dokumen yang dibuat (daftar penerimaan, daftar hadir, tanda terima transpor) dan perlakuan PPh 21.' },
      { judul: 'Penerima', isi: 'Pilih dari Data Pegawai atau daftar orang luar. PPh 21 dihitung per penerima menurut status (PNS, PPPK, Honorer, bukan pegawai). Syarat honor Pasal 43 diperiksa otomatis.' },
    ],
  },
  pajak: {
    judul: 'Menyetor pajak', ikon: 'ReceiptText', warna: '#E3A414', rute: '/pajak/terutang', kelompok: 'Pelaksanaan',
    ket: 'Pajak terutang, kode billing, NTPN, Buku Pembantu Pajak.',
    langkah: [
      { pilih: [TAB], judul: 'Bagian pajak', isi: 'Pajak Terutang, Buku Pembantu Pajak, Rekap per Penerima (bahan bukti potong), dan Aturan Tarif.' },
      { pilih: ['[aria-label="Status"]'], judul: 'Pajak terutang', isi: 'Pajak muncul otomatis dari belanja yang Lunas, lengkap dengan jatuh tempo (PPh tanggal 15, PPN akhir bulan berikutnya).' },
      { judul: 'Catat setoran', isi: 'Centang beberapa pajak, lalu isi kode billing, NTPN, dan BNU setor. Pajak berpindah ke status disetor dan Buku Pembantu Pajak terisi.' },
    ],
  },
  bukukas: {
    judul: 'Buku Kas & tutup buku', ikon: 'BookOpenText', warna: '#22A08D', rute: '/buku-kas/bku', kelompok: 'Penatausahaan',
    ket: 'BKU otomatis, BNU ARKAS, penerimaan dana, rekening koran.',
    langkah: [
      { pilih: [TAB], judul: 'Buku kas', isi: 'BKU, Buku Bank, Kas Tunai, Tutup Buku, Rekening Koran, Uji Paralel, dan Migrasi.' },
      { judul: 'BKU tersusun otomatis', isi: 'Belanja Lunas, pajak dipungut, dan setoran pajak masuk sendiri. Anda cukup mencatat penerimaan dana BOSP, bunga, pajak bunga, dan tarik/setor tunai.' },
      { judul: 'BNU sama dengan ARKAS', isi: 'Isi nomor BNU setiap baris agar urutannya sama dengan ARKAS dan SIMAKDA.' },
      { judul: 'Tutup buku bulanan', isi: 'Di tab Tutup Buku: periksa checklist, isi saldo ARKAS & SIMAKDA untuk dicocokkan, lalu tutup. Laporan Pemda bulanan disusun dari buku yang sudah ditutup.' },
    ],
  },
  laporan: {
    judul: 'Laporan ARKAS & Pemda', ikon: 'FileBarChart', warna: '#1A62E8', rute: '/laporan/realisasi', kelompok: 'Pelaporan',
    ket: 'Realisasi SNP/komponen, laporan bulanan Pemda, tahap & tahunan.',
    langkah: [
      { pilih: ['[data-tur="laporan-tab"]'], judul: 'Lima bagian laporan', isi: 'Realisasi SNP & Komponen, Laporan Pemda Bulanan, Tahap & Tahunan, Kesiapan SPJ, dan Ekspor SIMAKDA.' },
      { pilih: ['[data-tur="realisasi-pilihan"]'], judul: 'Periode', isi: 'Pilih bulanan, tahap/semester, atau tahunan. Semua laporan bisa dicetak F4 dan diunduh Excel.' },
      { pilih: ['[data-tur="realisasi-proporsi"]'], judul: 'Proporsi Juknis', isi: 'Buku minimal 10%, pemeliharaan sarpras maksimal 20%, honor maksimal 20% — dihitung dari realisasi, bukan rencana.' },
      { pilih: ['[data-tur="realisasi-tabel"]'], judul: 'Tabel realisasi', isi: 'Ganti susunan: per SNP, komponen Juknis, kegiatan, atau rekening belanja. Kolom menampilkan anggaran, realisasi lalu, periode ini, dan sisa.' },
    ],
  },
  pemda: {
    judul: 'Laporan Pemda bulanan', ikon: 'Landmark', warna: '#E3A414', rute: '/laporan/pemda', kelompok: 'Pelaporan',
    ket: 'LRPB, SPTJM, rekap pembelian BMD — tenggat tanggal 5.',
    langkah: [
      { pilih: ['[data-tur="pemda-bulan"]'], judul: 'Pilih bulan', isi: 'Lencana menunjukkan tenggat (tanggal 5 bulan berikutnya) dan apakah buku bulan itu sudah ditutup.' },
      { pilih: ['[data-tur="pemda-dokumen"]'], judul: 'Tiga dokumen', isi: 'Laporan Realisasi Penerimaan & Belanja, SPTJM Kepala Sekolah, dan Rekapitulasi Pembelian Barang Milik Daerah — sesuai Permendagri 3/2023.' },
      { judul: 'Cocokkan sisa dana', isi: 'Di bawah tabel, sisa dana laporan dibandingkan dengan saldo BKU. Selisih biasanya pajak belum disetor atau bunga/biaya bank.' },
    ],
  },
  kesiapan: {
    judul: 'Skor kesiapan SPJ', ikon: 'Gauge', warna: '#10b981', rute: '/laporan/kesiapan', kelompok: 'Pelaporan',
    ket: 'Dokumen 50%, pajak 25%, foto & arsip 25%.',
    langkah: [
      { pilih: ['[data-tur="kesiapan-skor"]'], judul: 'Skor keseluruhan', isi: 'Hijau ≥ 90 berarti siap diperiksa. Skor hanya penanda — tidak pernah menghalangi simpan atau cetak.' },
      { pilih: ['[data-tur="kesiapan-bulan"]'], judul: 'Per bulan', isi: 'Ketuk bulan untuk menyaring transaksinya.' },
      { pilih: ['[data-tur="kesiapan-daftar"]'], judul: 'Yang perlu dilengkapi', isi: 'Transaksi terendah ada di atas, lengkap dengan daftar kekurangan. Ketuk untuk membuka transaksinya.' },
    ],
  },
  barang: {
    judul: 'Barang & Aset', ikon: 'Boxes', warna: '#22A08D', rute: '/barang/klasifikasi', kelompok: 'Barang',
    ket: 'Kelompokkan barang belanja, KIB, KIR, BAST, label QR.',
    langkah: [
      { pilih: ['[data-tur="aset-tab"]'], judul: 'Bagian Barang & Aset', isi: 'Barang dari Belanja → KIB & Inventaris → Ruangan & KIR → BAST Pengurus Barang → Persediaan.' },
      { pilih: ['[data-tur="klasifikasi-saring"]'], judul: 'Kelompok barang', isi: 'Barang belanja Lunas ditebak otomatis: KIB (belanja modal 5.2), ekstrakomptabel (barang tahan lama dari 5.1), persediaan (habis pakai), atau bukan barang.' },
      { pilih: ['[data-tur="klasifikasi-daftar"]'], judul: 'Catat ke inventaris', isi: 'Ubah kelompok bila tebakan keliru, lalu tekan Catat. Kode barang diusulkan dari Referensi Barang Modal ARKAS, nomor register urut otomatis.' },
      { judul: 'Selanjutnya', isi: 'Tempatkan barang di ruangan (KIR), buat BAST dari Bendahara ke Pengurus Barang, lalu cetak label QR untuk ditempel pada barang.' },
    ],
  },
  persediaan: {
    judul: 'Buku persediaan', ikon: 'Warehouse', warna: '#E3A414', rute: '/barang/persediaan', kelompok: 'Barang',
    ket: 'Barang keluar, stok opname semester, laporan persediaan.',
    langkah: [
      { pilih: ['[data-tur="persediaan-aksi"]'], judul: 'Catat mutasi', isi: 'Barang keluar (bon) dicatat bila sempat. Stok opname dilakukan akhir Juni dan Desember. Saldo awal dipakai saat mulai memakai SIBOS.' },
      { pilih: ['[data-tur="persediaan-daftar"]'], judul: 'Kartu persediaan', isi: 'Ketuk barang untuk melihat dan mencetak kartunya: masuk, keluar, sisa, dan nilai harga rata-rata.' },
    ],
  },
  pengaturan: {
    judul: 'Pengaturan awal', ikon: 'Settings', warna: '#64748b', rute: '/pengaturan/profil', kelompok: 'Mulai', peran: ['bendahara'],
    ket: 'Profil, kop, pejabat per periode, pengguna, cetak, Drive.',
    langkah: [
      { pilih: [TAB], judul: 'Bagian pengaturan', isi: 'Profil Sekolah, Tahun Anggaran, Kop & Logo, Pejabat per Periode, Pengguna & Peran, Pengaturan Cetak, Notifikasi, serta Drive & Cadangan.' },
      { judul: 'Pejabat per periode', isi: 'Isi Kepala Sekolah, Bendahara, Ketua Komite, dan Pengurus Barang beserta masa tugasnya. Dokumen otomatis memakai pejabat yang menjabat pada tanggal dokumen.' },
      { judul: 'Cetak F4', isi: 'Atur margin, ukuran huruf, dan kode sampul. Semua dokumen memakai kertas F4 dan Times New Roman.' },
    ],
  },
  gaji: {
    judul: 'Daftar Gaji PNS & PPPK', ikon: 'Wallet', warna: '#E3A414', rute: '/gaji/daftar', kelompok: 'Kepegawaian', peran: ['bendahara'],
    ket: 'Dasar gaji, hitungan per bulan, pembanding daftar resmi, cetak & Excel.',
    langkah: [
      { pilih: ['[data-tur="gaji-tab"]'], judul: 'Bagian Kepegawaian & Gaji', isi: 'Daftar Gaji, Dasar Gaji Pegawai, SKPG, KGB, Impor Daftar Resmi, dan Tabel Gaji Pokok. Semua data gaji hanya bisa dibuka Bendahara.' },
      { judul: 'Mulai dari Dasar Gaji', isi: 'Isi MKG tiap pegawai (atau impor sheet dB-SKPG). Gaji pokok diambil dari tabel PP 5/2024 / Perpres 11/2024; tunjangan keluarga dari status kawin & anak di Data Pegawai.' },
      { pilih: ['[data-tur="gaji-periode"]'], judul: 'Pilih bulan', isi: 'Daftar Gaji dihitung langsung dari Dasar Gaji. Tekan "Simpan bulan ini" agar angkanya tidak berubah lagi bila dasar gaji diubah kemudian.' },
      { pilih: ['[data-tur="gaji-cetak"]'], judul: 'Cetak & Excel', isi: 'Cetak F4 mendatar dengan tanda tangan Kepala Sekolah & Bendahara Gaji, atau unduh Excel.' },
      { judul: 'Bandingkan dengan daftar resmi', isi: 'Impor PDF Daftar Gaji dari aplikasi gaji di tab Impor. Pegawai yang angkanya berbeda ditandai kuning; klik barisnya untuk melihat komponen yang selisih.' },
    ],
  },
  skpg: {
    judul: 'Membuat SKPG', ikon: 'FileSignature', warna: '#22A08D', rute: '/gaji/skpg', kelompok: 'Kepegawaian', peran: ['bendahara'],
    ket: 'Surat Keterangan Perincian Gaji untuk PNS, PPPK, dan Honorer.',
    langkah: [
      { pilih: ['[data-tur="skpg-form"]'], judul: 'Isi permintaan', isi: 'Pilih pegawai, bulan gaji, dan keperluan (bank, mutasi, administrasi, pensiun). Angka diambil dari Daftar Gaji resmi bila sudah diimpor; Honorer dari honor bulanan BOSP.' },
      { judul: 'Nomor otomatis', isi: 'Saat diterbitkan, nomor surat diambil dari penghitung surat sekolah dan tercatat di Agenda Surat. Ditandatangani Kepala Sekolah & Bendahara Gaji.' },
      { pilih: ['[data-tur="skpg-riwayat"]'], judul: 'Cetak ulang', isi: 'SKPG yang sudah diterbitkan tersimpan di sini dan bisa dicetak ulang kapan saja.' },
    ],
  },
  kgb: {
    judul: 'KGB & pengingat H-30', ikon: 'TrendingUp', warna: '#1A62E8', rute: '/gaji/kgb', kelompok: 'Kepegawaian', peran: ['bendahara'],
    ket: 'Jatuh tempo, surat pengantar usulan, catat SK terbit.',
    langkah: [
      { pilih: ['.kartu'], judul: 'Status KGB', isi: 'Jatuh tempo = TMT KGB terakhir + 2 tahun. Kuning = ≤ 30 hari, merah = sudah lewat. Ketuk kartu untuk menyaring.' },
      { pilih: ['[data-tur="kgb-alat"]'], judul: 'Surat pengantar', isi: 'Centang pegawai lalu buat surat pengantar usulan KGB ke Dinas Pendidikan, lengkap dengan lampiran daftar nama, gaji pokok lama & baru.' },
      { judul: 'Catat SK terbit', isi: 'Setelah Surat Pemberitahuan KGB terbit, tekan "Catat SK": TMT KGB terakhir dan gaji pokok di Dasar Gaji diperbarui otomatis.' },
      { judul: 'Pengingat otomatis', isi: 'Apps Script v7 memeriksa setiap pagi pukul 07.00 dan mengirim notifikasi ke Bendahara bila ada KGB ≤ 30 hari.' },
    ],
  },
  // ---------- Fase 7 ----------
  informasi: {
    judul: 'Papan Informasi BOS', ikon: 'Megaphone', warna: '#E3A414', rute: '/informasi/poster', kelompok: 'Transparansi',
    ket: 'Poster F4 per tahap, ringkasan Komite, dan tautan publik ber-QR.',
    langkah: [
      { pilih: [TAB], judul: 'Tiga bagian', isi: 'Ringkasan Komite (dibaca Komite yang login), Poster F4 untuk papan pengumuman, dan Tautan Publik untuk orang tua tanpa login.' },
      { pilih: ['[data-tur="info-periode"]'], judul: 'Pilih periode', isi: 'Tahap I (Januari–Juni), Tahap II (Juli–Desember), atau setahun. Penerimaan dari Buku Kas, realisasi dari belanja Lunas.' },
      { pilih: ['[data-tur="poster-atur"]'], judul: 'Cetak poster', isi: 'Isi teks informasi & pengaduan, lalu pratinjau dan cetak di kertas F4. QR ke halaman publik ikut tercetak bila sudah diterbitkan.' },
      { judul: 'Tautan publik', isi: 'Di tab Tautan Publik tekan Terbitkan setiap selesai tahap. Yang tampil hanya angka ringkasan — tanpa nama penerima atau rekening.' },
    ],
  },
  serahterima: {
    judul: 'Serah terima bendahara', ikon: 'Repeat', warna: '#E3A414', rute: '/serah-terima/berita-acara', kelompok: 'Transparansi', peran: ['bendahara', 'kepala_sekolah'],
    ket: 'Berita acara keadaan keuangan, lalu pindahkan akun Admin.',
    langkah: [
      { pilih: ['.kartu'], judul: 'Keadaan per tanggal', isi: 'Saldo bank & tunai menurut BKU, pajak belum disetor, transaksi belum lunas, dan SPJ belum lengkap dihitung otomatis per tanggal serah terima.' },
      { pilih: ['[data-tur="ba-pihak"]'], judul: 'Para pihak', isi: 'Pihak Pertama terisi dari Pejabat per Periode. Pilih bendahara baru dan dua saksi dari daftar pegawai.' },
      { pilih: ['[data-tur="ba-arsip"]'], judul: 'Arsip yang diserahkan', isi: 'Centang, ubah, atau tambah arsip beserta jumlahnya. Simpan, lalu cetak F4 untuk ditandatangani.' },
      { pilih: [TAB], judul: 'Langkah 2: akun Admin', isi: 'Setelah BA ditandatangani, buka tab Pindahkan Akun Admin agar bendahara baru menjadi Admin SIBOS.' },
    ],
  },
  whatsapp: {
    judul: 'Pesan WhatsApp', ikon: 'MessageCircle', warna: '#22A08D', rute: '/whatsapp/kirim', kelompok: 'Transparansi', peran: ['bendahara'],
    ket: 'Pesan siap kirim lewat wa.me: SPJ, transfer, rekanan, KGB.',
    langkah: [
      { pilih: ['[data-tur="wa-jenis"]'], judul: 'Jenis pesan', isi: 'Kelengkapan SPJ, konfirmasi transfer (rekening disamarkan 4 digit), pesan ke rekanan, dan pengingat KGB.' },
      { pilih: ['[data-tur="wa-daftar"]'], judul: 'Kirim satu per satu', isi: 'Tekan Pesan untuk melihat/mengubah isi, atau Kirim untuk langsung membuka WhatsApp. Nomor diambil dari Data Pegawai & Rekanan.' },
      { judul: 'Kirim ke semua', isi: 'Membuka antrean: setiap ketukan membuka satu percakapan. Kirim di WhatsApp, kembali ke SIBOS, lalu lanjut ke tujuan berikutnya.' },
      { pilih: [TAB], judul: 'Template & riwayat', isi: 'Ubah kalimat di tab Template; semua pesan yang dibuka tercatat di tab Riwayat.' },
    ],
  },
  keuangan: {
    judul: 'Keuangan bendahara', ikon: 'PiggyBank', warna: '#22A08D', rute: '/keuangan/bulanan', kelompok: 'Transparansi', peran: ['bendahara', 'kepala_sekolah'],
    ket: 'Dasbor uang bulanan, catatan kas sekolah, catatan pribadi.',
    langkah: [
      { pilih: ['[data-tur="bulanan-pilih"]'], judul: 'Pilih bulan', isi: 'Titik hijau = buku bulan itu sudah ditutup. Kartu menampilkan saldo awal, penerimaan, belanja, dan saldo akhir.' },
      { pilih: [TAB], judul: 'Catatan lain', isi: 'Catatan Kas Sekolah untuk uang di luar Dana BOSP; Catatan Pribadi untuk talangan pribadi — hanya akun Anda yang bisa membukanya.' },
    ],
  },
  massal: {
    judul: 'Cetak massal Paket SPJ', ikon: 'Files', warna: '#1A62E8', rute: '/belanja/massal', kelompok: 'Belanja',
    ket: 'Gabungkan paket SPJ banyak transaksi menjadi satu PDF.',
    langkah: [
      { pilih: ['[data-tur="massal-saring"]'], judul: 'Saring & pilih', isi: 'Pilih bulan dan jenis transaksi, lalu centang transaksi atau tekan Pilih semua.' },
      { judul: 'Satu berkas', isi: 'Gabungkan & cetak membuka satu pratinjau berisi semua dokumen (urut tanggal lunas lalu BNU). Unduh PDF untuk diarsipkan per bulan.' },
    ],
  },
  rekonsiliasi: {
    judul: 'Rekonsiliasi ARKAS–SIMAKDA', ikon: 'GitCompareArrows', warna: '#1A62E8', rute: '/laporan/rekonsiliasi', kelompok: 'Laporan', peran: ['bendahara', 'kepala_sekolah', 'tim_bos'],
    ket: 'Cocokkan saldo bulanan & tandai transaksi yang sudah diinput.',
    langkah: [
      { pilih: ['[data-tur="rekon-bulan"]'], judul: 'Status per bulan', isi: 'Titik hijau = saldo SIBOS sama dengan ARKAS, SIMAKDA & rekening koran dan semua transaksi sudah diinput. Kuning = masih ada selisih atau belum diinput.' },
      { pilih: ['[data-tur="rekon-saldo"]'], judul: 'Bandingkan saldo', isi: 'Isi saldo akhir bulan yang tampil di ARKAS dan SIMAKDA, lalu Simpan. Rekening koran diambil otomatis dari Buku Kas.' },
      { pilih: ['[data-tur="rekon-input"]'], judul: 'Tandai sudah diinput', isi: 'Setelah menyalin transaksi ke ARKAS/SIMAKDA, ketuk kotak centang per transaksi atau tombol "Semua". Transaksi yang belum ditandai muncul di Dasbor → Perlu perhatian.' },
    ],
  },
  laporanlain: {
    judul: 'Laporan Pemda lainnya', ikon: 'Files', warna: '#1A62E8', rute: '/laporan/pemda-lain', kelompok: 'Laporan',
    ket: 'BKU per nota, Buku Simpanan Bank, SPJ Belanja, STS, SPTJM Pemda.',
    langkah: [
      { pilih: ['[data-tur="pemdalain-dokumen"]'], judul: 'Dokumen bulanan', isi: 'BKU per nota (dengan terbilang), Buku Simpanan Bank, dan SPJ Belanja BOS untuk bulan terpilih — cetak F4 atau Excel.' },
      { pilih: ['[data-tur="pemdalain-sts"]'], judul: 'STS', isi: 'Surat Tanda Setoran ke Kas Daerah. Tombol "Isi jasa giro" mengambil bunga bank bulan ini dari Buku Kas.' },
      { pilih: ['[data-tur="pemdalain-sptjm"]'], judul: 'SPTJM Pemda', isi: 'Pernyataan tanggung jawab per semester atau setahun, lengkap dengan rincian penerimaan, belanja per jenis, dan sisa dana.' },
    ],
  },
}

/** Tur yang cocok untuk rute saat ini: segmen awal yang sama paling banyak */
export function turUntukRute(path) {
  const seg = path.split('/').filter(Boolean)
  let terbaik = null, skor = 0
  Object.entries(TUR).forEach(([k, t]) => {
    const r = t.rute.split('/').filter(Boolean)
    let n = 0
    while (n < r.length && r[n] === seg[n]) n++
    if (n > skor) { skor = n; terbaik = k }
  })
  return terbaik
}

// Alur kerja bulanan Bendahara (ditampilkan di halaman Panduan)
export const ALUR_BULANAN = [
  { ikon: 'ClipboardList', judul: 'Pastikan RKAS berlaku', isi: 'Impor versi terbaru dari ARKAS setiap ada pergeseran/perubahan.', ke: '/rkas/versi' },
  { ikon: 'Landmark', judul: 'Catat penerimaan dana', isi: 'Penerimaan tahap I/II, bunga, dan pajak bunga di Buku Kas.', ke: '/buku-kas/bku' },
  { ikon: 'ShoppingCart', judul: 'Catat belanja & cetak SPJ', isi: 'Isi tanggal bertahap sampai Lunas, cetak paket SPJ F4.', ke: '/belanja/daftar' },
  { ikon: 'ReceiptText', judul: 'Setor pajak', isi: 'PPh paling lambat tanggal 15, PPN akhir bulan berikutnya.', ke: '/pajak/terutang' },
  { ikon: 'FileSearch', judul: 'Cocokkan rekening koran', isi: 'Impor PDF Bank Sulselbar dan tindak lanjuti mutasi yang belum cocok.', ke: '/buku-kas/koran' },
  { ikon: 'CalendarCheck', judul: 'Tutup buku', isi: 'Isi saldo ARKAS & SIMAKDA, cocokkan, lalu tutup bulan.', ke: '/buku-kas/tutup' },
  { ikon: 'FileBarChart', judul: 'Laporan Pemda (tgl 5)', isi: 'Cetak LRPB, SPTJM, dan rekap pembelian BMD.', ke: '/laporan/pemda' },
  { ikon: 'Gauge', judul: 'Periksa kesiapan SPJ', isi: 'Lengkapi transaksi berwarna merah/kuning.', ke: '/laporan/kesiapan' },
  { ikon: 'Wallet', judul: 'Daftar Gaji & KGB', isi: 'Impor Daftar Gaji resmi, periksa selisih, simpan bulan ini; tindak lanjuti KGB ≤ 30 hari.', ke: '/gaji/daftar' },
  { ikon: 'Boxes', judul: 'Catat barang', isi: 'Kelompokkan barang belanja, catat ke KIB, buat BAST ke Pengurus Barang.', ke: '/barang/klasifikasi' },
]
