// Data awal tabel referensi. Disimpan ke Firestore referensi/{jenis} saat Bendahara menekan
// "Pasang data awal"; setelah itu semuanya bisa diubah dan diimpor ulang dari Excel.
// Sumber: Permendikdasmen No. 8 Tahun 2026 (Juknis BOSP) Pasal 41–46.

export const JENIS_REFERENSI = [
  {
    kunci: 'snp', judul: '8 Standar Nasional Pendidikan', singkat: 'SNP', ikon: 'BadgeCheck', warna: 'from-blue-500 to-indigo-600',
    ket: 'Urutan kode mengikuti kode program pada ARKAS.',
    kolom: [{ k: 'kode', j: 'Kode', lebar: 'w-20' }, { k: 'nama', j: 'Standar' }],
    awal: [
      ['01', 'Pengembangan Standar Kompetensi Lulusan'], ['02', 'Pengembangan Standar Isi'], ['03', 'Pengembangan Standar Proses'],
      ['04', 'Pengembangan Standar Pendidik dan Tenaga Kependidikan'], ['05', 'Pengembangan Standar Sarana dan Prasarana'],
      ['06', 'Pengembangan Standar Pengelolaan'], ['07', 'Pengembangan Standar Pembiayaan'], ['08', 'Pengembangan Standar Penilaian Pendidikan'],
    ].map(([kode, nama]) => ({ kode, nama })),
  },
  {
    kunci: 'komponen', judul: '12 Komponen BOS Reguler (Pasal 42)', singkat: 'Komponen', ikon: 'ListChecks', warna: 'from-teal-400 to-emerald-600',
    ket: 'Batas proporsi dihitung dari keseluruhan alokasi BOS Reguler yang diterima. Batas honor 20% untuk sekolah negeri.',
    kolom: [{ k: 'kode', j: 'Huruf', lebar: 'w-16' }, { k: 'nama', j: 'Komponen' }, { k: 'batas', j: 'Batas', lebar: 'w-44' }],
    awal: [
      ['a', 'Penerimaan Murid baru'],
      ['b', 'Pengembangan perpustakaan', 'Minimal 10% untuk penyediaan buku (wajib)', 'min', 10],
      ['c', 'Pelaksanaan kegiatan pembelajaran dan ekstrakurikuler'],
      ['d', 'Pelaksanaan kegiatan asesmen dan evaluasi pembelajaran'],
      ['e', 'Pelaksanaan administrasi kegiatan sekolah'],
      ['f', 'Pengembangan profesi guru dan tenaga kependidikan'],
      ['g', 'Pembiayaan langganan daya dan jasa'],
      ['h', 'Pemeliharaan sarana dan prasarana sekolah', 'Maksimal 20%', 'maks', 20],
      ['i', 'Penyediaan alat multimedia pembelajaran'],
      ['j', 'Penyelenggaraan kegiatan peningkatan kompetensi keahlian'],
      ['k', 'Penyelenggaraan kegiatan dalam mendukung keterserapan lulusan'],
      ['l', 'Pembayaran honor', 'Maksimal 20% (negeri)', 'maks', 20],
    ].map(([kode, nama, batas = '', jenis_batas = '', persen = '']) => ({ kode, nama, batas, jenis_batas, persen })),
  },
  {
    kunci: 'kategori', judul: '3 Kategori Anggaran', singkat: 'Kategori', ikon: 'Boxes', warna: 'from-amber-400 to-orange-500',
    ket: 'Label kategori pada setiap transaksi dan item belanja.',
    kolom: [{ k: 'kode', j: 'Kode', lebar: 'w-28' }, { k: 'nama', j: 'Kategori' }, { k: 'akun_simakda', j: 'Akun SIMAKDA', lebar: 'w-28' }],
    awal: [
      { kode: 'operasional', nama: 'Operasional (Belanja Barang dan Jasa)', akun_simakda: '5.1.02' },
      { kode: 'alat_mesin', nama: 'Modal Alat dan Mesin', akun_simakda: '5.2.02' },
      { kode: 'aset_lain', nama: 'Modal Aset Tetap Lainnya', akun_simakda: '5.2.05' },
    ],
  },
  {
    kunci: 'akun_simakda', judul: 'Akun SIMAKDA', singkat: 'Akun SIMAKDA', ikon: 'Landmark', warna: 'from-violet-500 to-fuchsia-500',
    ket: 'Tiga akun belanja Pemda untuk input SIMAKDA. Periksa kode lengkapnya di SIMAKDA dan sesuaikan bila perlu.',
    kolom: [{ k: 'kode', j: 'Kode', lebar: 'w-32' }, { k: 'nama', j: 'Akun' }],
    awal: [
      { kode: '5.1.02', nama: 'Belanja Barang dan Jasa' },
      { kode: '5.2.02', nama: 'Belanja Modal Peralatan dan Mesin' },
      { kode: '5.2.05', nama: 'Belanja Modal Aset Tetap Lainnya' },
    ],
  },
  {
    kunci: 'kegiatan_arkas', judul: 'Kode Kegiatan ARKAS', singkat: 'Kegiatan ARKAS', ikon: 'ClipboardList', warna: 'from-sky-400 to-blue-600',
    ket: 'Diisi dengan impor Excel dari ARKAS. Akan terisi otomatis juga saat RKAS diimpor (Fase 2).',
    kolom: [{ k: 'kode', j: 'Kode', lebar: 'w-40' }, { k: 'nama', j: 'Kegiatan' }, { k: 'snp', j: 'SNP', lebar: 'w-16' }, { k: 'komponen', j: 'Komp.', lebar: 'w-16' }],
    awal: [],
  },
  {
    kunci: 'rekening_arkas', judul: 'Rekening Belanja ARKAS', singkat: 'Rekening ARKAS', ikon: 'BookOpenText', warna: 'from-rose-400 to-red-500',
    ket: 'Diisi dengan impor Excel dari ARKAS (kode rekening & nama). Kategori menentukan akun SIMAKDA.',
    kolom: [{ k: 'kode', j: 'Kode Rekening', lebar: 'w-44' }, { k: 'nama', j: 'Nama Rekening' }, { k: 'kategori', j: 'Kategori', lebar: 'w-28' }],
    awal: [],
  },
  {
    kunci: 'pajak', judul: 'Jenis & Kode Pajak', singkat: 'Kode Pajak', ikon: 'ReceiptText', warna: 'from-emerald-400 to-teal-600',
    ket: 'KAP-KJS untuk kode billing. Kolom kode SIMAKDA diisi sesuai SIMAKDA Pemkot Makassar. Tarif dan aturan rinci diatur pada Fase 4.',
    kolom: [{ k: 'kode', j: 'Jenis', lebar: 'w-24' }, { k: 'nama', j: 'Nama' }, { k: 'kap_kjs', j: 'KAP-KJS', lebar: 'w-28' }, { k: 'kode_simakda', j: 'Kode SIMAKDA', lebar: 'w-32' }],
    awal: [
      { kode: 'PPN', nama: 'Pajak Pertambahan Nilai Dalam Negeri', kap_kjs: '411211-100', kode_simakda: '' },
      { kode: 'PPh21', nama: 'PPh Pasal 21', kap_kjs: '411121-100', kode_simakda: '' },
      { kode: 'PPh22', nama: 'PPh Pasal 22', kap_kjs: '411122-100', kode_simakda: '' },
      { kode: 'PPh23', nama: 'PPh Pasal 23', kap_kjs: '411124-100', kode_simakda: '' },
      { kode: 'PPh4(2)', nama: 'PPh Pasal 4 ayat (2)', kap_kjs: '', kode_simakda: '' },
      { kode: 'Daerah', nama: 'Pajak Daerah (Pajak Barang dan Jasa Tertentu)', kap_kjs: '', kode_simakda: '' },
    ],
  },
  {
    kunci: 'satuan', judul: 'Satuan', singkat: 'Satuan', ikon: 'Tags', warna: 'from-cyan-400 to-sky-600',
    ket: 'Satuan volume untuk RKAS, Standar Harga, dan dokumen belanja.',
    kolom: [{ k: 'kode', j: 'Satuan', lebar: 'w-28' }, { k: 'nama', j: 'Keterangan' }],
    awal: [
      ['Paket', 'Paket'], ['Buah', 'Buah'], ['Unit', 'Unit'], ['Set', 'Set'], ['Lembar', 'Lembar'], ['Rim', 'Rim'], ['Box', 'Box/kotak'], ['Dus', 'Dus'],
      ['Pak', 'Pak'], ['Pcs', 'Pieces'], ['Lusin', 'Lusin'], ['Botol', 'Botol'], ['Liter', 'Liter'], ['Kg', 'Kilogram'], ['Meter', 'Meter'], ['Roll', 'Roll'],
      ['Eksemplar', 'Eksemplar buku'], ['Orang', 'Orang'], ['OK', 'Orang Kegiatan'], ['OH', 'Orang Hari'], ['OJ', 'Orang Jam'], ['OB', 'Orang Bulan'],
      ['Bulan', 'Bulan'], ['Kali', 'Kali'], ['Kegiatan', 'Kegiatan'], ['Tahun', 'Tahun'],
    ].map(([kode, nama]) => ({ kode, nama })),
  },
  {
    kunci: 'sumber_dana', judul: 'Sumber Dana', singkat: 'Sumber Dana', ikon: 'PiggyBank', warna: 'from-lime-400 to-green-600',
    ket: 'Hanya sumber dana berstatus aktif yang muncul saat input. Juknis 2026 mengenal BOS Reguler, Kinerja, dan Afirmasi.',
    kolom: [{ k: 'kode', j: 'Kode', lebar: 'w-32' }, { k: 'nama', j: 'Sumber Dana' }, { k: 'aktif', j: 'Aktif', lebar: 'w-20', bool: true }],
    awal: [
      { kode: 'BOSP-REG', nama: 'BOSP Reguler', aktif: true },
      { kode: 'BOSP-KIN', nama: 'BOSP Kinerja', aktif: false },
      { kode: 'BOSP-AFR', nama: 'BOSP Afirmasi', aktif: false },
      { kode: 'BOSDA', nama: 'BOS Daerah', aktif: false },
      { kode: 'LAIN', nama: 'Lainnya', aktif: false },
    ],
  },
]
