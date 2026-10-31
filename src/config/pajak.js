// Aturan pajak SIBOS (Fase 4).
// Tarif TIDAK ditulis mati di kode: nilai di bawah hanya data awal. Bendahara (Admin) mengubahnya di
// Pajak → Aturan Tarif, tersimpan di referensi/aturan_pajak. Kode akun (KAP) & jenis setoran (KJS)
// dipakai saat membuat kode billing — periksa kembali di e-Billing DJP bila ada perubahan.

export const CARA_PAJAK = {
  pungut: { label: 'Dipungut', ket: 'Dipungut Bendahara dari pembayaran ke penyedia', ikon: 'HandCoins' },
  potong: { label: 'Dipotong', ket: 'Dipotong dari penghasilan penerima', ikon: 'Scissors' },
  mitra: { label: 'Dipungut mitra SIPLah', ket: 'Terima-setor oleh marketplace SIPLah (tidak lewat BKU sekolah)', ikon: 'ShoppingBag' },
}

// Warna lencana per jenis pajak (warna ciri ARKAS secukupnya)
export const WARNA_PAJAK = {
  PPN: 'bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300',
  'PPh 21': 'bg-[#22A08D]/12 text-[#167A6C] dark:bg-[#22A08D]/20 dark:text-[#5FD3C0]',
  'PPh 22': 'bg-[#E3A414]/15 text-[#946400] dark:bg-[#E3A414]/20 dark:text-[#F2C14E]',
  'PPh 23': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'PPh 4(2)': 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
}

export const ATURAN_PAJAK_AWAL = {
  versi: 1,
  batas: {
    non_pkp: 2_000_000,     // PPN & PPh 22 dipungut bila nilai transaksi > batas ini
    ptkp_bulan: 4_500_000,  // honorer bulanan: tidak dipotong bila honor sebulan ≤ batas (PTKP TK/0 Rp 54 jt ÷ 12)
    ptkp_hari: 450_000,     // honor harian/per kegiatan: tidak dipotong bila ≤ batas per orang per hari
    ptkp_tahun: 54_000_000, // pembanding rekap per penerima setahun
  },
  tarif: [
    { kunci: 'ppn', jenis: 'PPN', judul: 'PPN penyerahan oleh PKP (Non-SIPLah)', tarif: 11, tarif_tanpa_npwp: 11, cara: 'pungut', kap: '411211', kjs: '900', aktif: true,
      ket: 'Tarif efektif 11% (12% × DPP nilai lain 11/12). Harga dianggap sudah termasuk PPN: DPP = harga × 100/111.' },
    { kunci: 'pph22', jenis: 'PPh 22', judul: 'PPh 22 pembelian barang (Non-SIPLah)', tarif: 1.5, tarif_tanpa_npwp: 3, cara: 'pungut', kap: '411122', kjs: '910', aktif: true,
      kata_kunci: 'buku, listrik, pdam, telepon, internet, benda pos, bahan bakar', ket: 'Dipungut bila nilai barang > batas. Barang yang namanya memuat kata kunci (pisahkan dengan koma) dikecualikan: buku pelajaran, tagihan listrik/PDAM/telepon/internet, benda pos, BBM.' },
    { kunci: 'ppn_siplah', jenis: 'PPN', judul: 'PPN via SIPLah', tarif: 11, tarif_tanpa_npwp: 11, cara: 'mitra', kap: '411211', kjs: '900', aktif: true, ket: 'Dipungut & disetor mitra SIPLah; dicatat sebagai terima-setor.' },
    { kunci: 'pph22_siplah', jenis: 'PPh 22', judul: 'PPh 22 via SIPLah', tarif: 0.5, tarif_tanpa_npwp: 0.5, cara: 'mitra', kap: '411122', kjs: '910', aktif: true, ket: 'Dipungut mitra SIPLah.' },
    { kunci: 'pph23', jenis: 'PPh 23', judul: 'PPh 23 jasa oleh badan usaha', tarif: 2, tarif_tanpa_npwp: 4, cara: 'potong', kap: '411124', kjs: '104', aktif: true, ket: 'Jasa (service, pemeliharaan, katering badan, dll.) oleh CV/PT.' },
    { kunci: 'pph21_bukan_pegawai', jenis: 'PPh 21', judul: 'PPh 21 bukan pegawai (narasumber, jasa orang pribadi)', tarif: 2.5, tarif_tanpa_npwp: 3, cara: 'potong', kap: '411121', kjs: '100', aktif: true, ket: '50% × tarif Pasal 17 lapis pertama (5%).' },
    { kunci: 'pph21_asn_gol3', jenis: 'PPh 21', judul: 'PPh 21 final ASN golongan III / PPPK IX–XII', tarif: 5, tarif_tanpa_npwp: 5, cara: 'potong', kap: '411121', kjs: '402', aktif: true, ket: 'Honor ASN dari APBN/APBD (PP 80/2010).' },
    { kunci: 'pph21_asn_gol4', jenis: 'PPh 21', judul: 'PPh 21 final ASN golongan IV / PPPK XIII–XVII', tarif: 15, tarif_tanpa_npwp: 15, cara: 'potong', kap: '411121', kjs: '402', aktif: true, ket: 'Honor ASN dari APBN/APBD (PP 80/2010).' },
    { kunci: 'pph21_asn_gol12', jenis: 'PPh 21', judul: 'PPh 21 final ASN golongan I–II / PPPK I–VIII', tarif: 0, tarif_tanpa_npwp: 0, cara: 'potong', kap: '411121', kjs: '402', aktif: true, ket: 'Tarif 0%.' },
    { kunci: 'pph21_honorer', jenis: 'PPh 21', judul: 'PPh 21 honorer di atas PTKP', tarif: 2.5, tarif_tanpa_npwp: 3, cara: 'potong', kap: '411121', kjs: '100', aktif: true, ket: 'Hanya bila honor sebulan > batas PTKP bulanan, atau honor kegiatan per hari > batas PTKP harian.' },
    { kunci: 'pph42_sewa', jenis: 'PPh 4(2)', judul: 'PPh 4(2) sewa tanah/bangunan', tarif: 10, tarif_tanpa_npwp: 10, cara: 'potong', kap: '411128', kjs: '403', aktif: true,
      kata_kunci: 'sewa gedung, sewa ruang, sewa aula, sewa bangunan, sewa tanah, sewa tempat', ket: 'Item yang namanya memuat kata kunci.' },
    { kunci: 'pph42_konstruksi', jenis: 'PPh 4(2)', judul: 'PPh 4(2) jasa konstruksi (kualifikasi kecil)', tarif: 1.75, tarif_tanpa_npwp: 1.75, cara: 'potong', kap: '411128', kjs: '409', aktif: true,
      kata_kunci: 'rehab, renovasi, konstruksi, pembangunan, pengecoran, pemasangan keramik', ket: 'Jasa konstruksi oleh badan bersertifikat kualifikasi kecil (PP 9/2022).' },
  ],
}

// Jenis baris Buku Kas yang dicatat manual (belanja & pajak muncul otomatis dari transaksi)
export const JENIS_KAS = {
  saldo_awal: { label: 'Saldo awal (sisa tahun lalu)', ikon: 'PiggyBank', arah: 'masuk', sumber: 'bank' },
  terima_dana: { label: 'Penerimaan dana BOSP', ikon: 'Landmark', arah: 'masuk', sumber: 'bank' },
  bunga: { label: 'Jasa giro / bunga bank', ikon: 'Percent', arah: 'masuk', sumber: 'bank' },
  pajak_bunga: { label: 'Pajak bunga bank', ikon: 'ReceiptText', arah: 'keluar', sumber: 'bank' },
  biaya_bank: { label: 'Biaya administrasi bank', ikon: 'Building2', arah: 'keluar', sumber: 'bank' },
  tarik_tunai: { label: 'Tarik tunai (bank → kas tunai)', ikon: 'ArrowDownUp', arah: 'pindah', sumber: 'bank' },
  setor_tunai: { label: 'Setor tunai (kas tunai → bank)', ikon: 'ArrowDownUp', arah: 'pindah', sumber: 'tunai' },
  pengembalian: { label: 'Pengembalian/koreksi masuk', ikon: 'Undo2', arah: 'masuk', sumber: 'bank' },
  lainnya_keluar: { label: 'Pengeluaran lain / koreksi keluar', ikon: 'Minus', arah: 'keluar', sumber: 'bank' },
}

// Jenis baris BKU (untuk warna & filter)
export const JENIS_BKU = {
  ...Object.fromEntries(Object.entries(JENIS_KAS).map(([k, v]) => [k, { label: v.label, ikon: v.ikon }])),
  belanja: { label: 'Belanja', ikon: 'ShoppingCart' },
  terima_pajak: { label: 'Penerimaan pajak (pungut/potong)', ikon: 'ReceiptText' },
  setor_pajak: { label: 'Setor pajak', ikon: 'Landmark' },
}

export const TAB_PAJAK = [
  { kunci: 'terutang', judul: 'Pajak Terutang', ikon: 'ReceiptText' },
  { kunci: 'buku', judul: 'Buku Pembantu Pajak', ikon: 'BookOpenText' },
  { kunci: 'penerima', judul: 'Rekap per Penerima', ikon: 'UsersRound' },
  { kunci: 'aturan', judul: 'Aturan Tarif', ikon: 'Percent' },
]

export const TAB_KAS = [
  { kunci: 'bku', judul: 'Buku Kas Umum', ikon: 'BookOpenText' },
  { kunci: 'bank', judul: 'Buku Bank', ikon: 'Landmark' },
  { kunci: 'tunai', judul: 'Kas Tunai', ikon: 'Banknote' },
  { kunci: 'tutup', judul: 'Tutup Buku', ikon: 'CalendarCheck' },
  { kunci: 'koran', judul: 'Rekening Koran', ikon: 'FileSearch' },
  { kunci: 'paralel', judul: 'Uji Paralel', ikon: 'GitCompareArrows' },
  { kunci: 'migrasi', judul: 'Migrasi 2026', ikon: 'DatabaseZap' },
]

export const TARGET_SEMESTER_1 = 145_951_380
