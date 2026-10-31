// Aturan pajak SIBOS (Fase 4).
// Tarif TIDAK ditulis mati di kode: nilai di bawah hanya data awal. Bendahara (Admin) mengubahnya di
// Pajak → Aturan Tarif, tersimpan di referensi/aturan_pajak. Kode akun (KAP) & jenis setoran (KJS)
// dipakai saat membuat kode billing — periksa kembali di e-Billing DJP bila ada perubahan.

export const CARA_PAJAK = {
  pungut: { label: 'Dipungut', ket: 'Dipungut Bendahara dari pembayaran ke penyedia', ikon: 'HandCoins' },
  potong: { label: 'Dipotong', ket: 'Dipotong dari penghasilan penerima', ikon: 'Scissors' },
  mitra: { label: 'Dipungut mitra SIPLah', ket: 'Dipungut & disetor marketplace SIPLah (tidak lewat BKU sekolah)', ikon: 'ShoppingBag' },
  luar: { label: 'Disetor di luar rekening BOSP', ket: 'Ditanggung/disetor sekolah dari luar rekening BOSP (tidak lewat BKU)', ikon: 'Wallet' },
}

// Warna lencana per jenis pajak (warna ciri ARKAS secukupnya)
export const WARNA_PAJAK = {
  PPN: 'bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300',
  'PPh 21': 'bg-[#22A08D]/12 text-[#167A6C] dark:bg-[#22A08D]/20 dark:text-[#5FD3C0]',
  'PPh 22': 'bg-[#E3A414]/15 text-[#946400] dark:bg-[#E3A414]/20 dark:text-[#F2C14E]',
  'PPh 23': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'PPh 4(2)': 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  'PPh Final UMKM': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

// Status PTKP → kategori TER (PP 58/2023 Pasal 2)
export const PTKP = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']
export const KATEGORI_TER = { 'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A', 'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B', 'K/3': 'C' }

// Kategori penerima PPh 21 (PMK 168/2023; PP 80/2010 untuk PNS)
export const KATEGORI_PPH21 = {
  pns_final: { label: 'PNS — honorarium APBN/APBD (final)', dasar: 'PP 80/2010; PMK 262/PMK.03/2010', ket: 'Golongan I–II 0%, III 5%, IV 15% dari bruto, bersifat final. Hanya PNS.' },
  pegawai_tetap: { label: 'Pegawai tetap pemberi kerja (mis. PPPK sekolah)', dasar: 'PP 58/2023; PMK 168/2023 Pasal 12', ket: 'TER bulanan sesuai status PTKP atas seluruh penghasilan bruto bulan itu (gaji + honor). Bila gaji tidak diisi, TER dihitung atas honor saja — konfirmasi ke KPP.' },
  tidak_tetap_bulanan: { label: 'Pegawai tidak tetap/honorer dibayar bulanan', dasar: 'PMK 168/2023 Pasal 12 ayat (2)', ket: 'TER bulanan sesuai status PTKP atas bruto sebulan (mis. honor PTT bulanan).' },
  tidak_tetap_harian: { label: 'Pegawai tidak tetap dibayar harian/per kegiatan/borongan', dasar: 'PMK 168/2023 Pasal 12 ayat (2)', ket: 'Bruto sehari ≤ Rp450.000: 0%; s.d. Rp2.500.000: 0,5%; di atasnya 50% × bruto × tarif Pasal 17.' },
  bukan_pegawai: { label: 'Bukan pegawai (narasumber, juri, pelatih, tenaga ahli, jasa orang pribadi)', dasar: 'PMK 168/2023 Pasal 12 ayat (3)', ket: '50% × bruto × tarif Pasal 17 (5% untuk lapisan pertama → 2,5%).' },
  peserta_kegiatan: { label: 'Peserta kegiatan (uang saku, uang rapat, hadiah lomba)', dasar: 'PMK 168/2023 Pasal 1 angka 14, Pasal 12 ayat (6)', ket: '100% bruto × tarif Pasal 17 (5% lapisan pertama).' },
  bukan_objek: { label: 'Bukan objek PPh 21 (penggantian biaya transport/perjalanan)', dasar: 'UU PPh Pasal 4 & 6; PMK 168/2023', ket: 'Penggantian biaya riil/at cost atau sesuai SBU dengan bukti pertanggungjawaban. Bila berupa uang saku, pilih peserta kegiatan.' },
}

// Tarif Pasal 17 ayat (1) huruf a UU PPh (UU HPP) — lapisan PKP setahun
export const PASAL_17 = [
  { sampai: 60_000_000, tarif: 5 },
  { sampai: 250_000_000, tarif: 15 },
  { sampai: 500_000_000, tarif: 25 },
  { sampai: 5_000_000_000, tarif: 30 },
  { sampai: Infinity, tarif: 35 },
]

// TER bulanan (Lampiran PP 58/2023) — [batas atas bruto bulanan, tarif %]; di atas baris terakhir: hitung manual
export const TER_BULANAN = {
  A: [[5_400_000, 0], [5_650_000, 0.25], [5_950_000, 0.5], [6_300_000, 0.75], [6_750_000, 1], [7_500_000, 1.25], [8_550_000, 1.5], [9_650_000, 1.75], [10_050_000, 2], [10_350_000, 2.25], [10_700_000, 2.5], [11_050_000, 3], [11_600_000, 3.5], [12_500_000, 4], [13_750_000, 5], [15_100_000, 6]],
  B: [[6_200_000, 0], [6_500_000, 0.25], [6_850_000, 0.5], [7_300_000, 0.75], [9_200_000, 1], [10_750_000, 1.5], [11_250_000, 2], [11_600_000, 2.5], [12_600_000, 3], [13_600_000, 4], [14_950_000, 5], [16_400_000, 6]],
  C: [[6_600_000, 0], [6_950_000, 0.25], [7_350_000, 0.5], [7_800_000, 0.75], [8_850_000, 1], [9_800_000, 1.25], [10_950_000, 1.5], [11_200_000, 1.75], [12_050_000, 2], [12_950_000, 3], [14_150_000, 4], [15_550_000, 5]],
}

export const ATURAN_PAJAK_AWAL = {
  versi: 2,
  batas: {
    ppn_instansi: 2_000_000, // PPN tidak dipungut instansi pemerintah bila pembayaran ≤ batas (belum termasuk PPN) & tidak dipecah — PMK 59/2022 Pasal 18
    ter_harian_nol: 450_000, // bruto sehari ≤ batas: 0%
    ter_harian_atas: 2_500_000, // bruto sehari ≤ batas: 0,5%; di atasnya 50% × Pasal 17
    tarif_ter_harian: 0.5,
    faktor_tanpa_npwp_21: 120, // PPh 21 tanpa NPWP/NIK valid: 120% (UU PPh Pasal 21 ayat 5a)
    ptkp_tahun: 54_000_000, // pembanding rekap per penerima setahun (PTKP TK/0)
  },
  tarif: [
    // ---------------- PPN ----------------
    { kunci: 'ppn', jenis: 'PPN', judul: 'PPN dipungut bendahara (penyerahan oleh PKP)', tarif: 11, tarif_tanpa_npwp: 11, cara: 'pungut', kap: '411211', kjs: '900', aktif: true,
      kata_kunci: 'listrik, pdam, telepon, bbm, pertamina, tiket pesawat',
      dasar: 'UU PPN Pasal 7 jo. UU HPP; PMK 131/2024 (12% × DPP nilai lain 11/12); PMK 59/2022 Pasal 18',
      ket: 'Efektif 11% dari harga jual (non-mewah). Tidak dipungut bila pembayaran ≤ Rp2 juta & tidak dipecah, atau item memuat kata kunci (ditagih & disetor langsung penyedia). Makanan restoran/katering bukan objek PPN (pajak daerah).' },
    { kunci: 'ppn_siplah', jenis: 'PPN', judul: 'PPN pengadaan melalui SIPLah', tarif: 11, tarif_tanpa_npwp: 11, cara: 'mitra', kap: '411211', kjs: '900', aktif: true,
      dasar: 'PMK 58/2022 (pihak lain/PMSE)', ket: 'Dipungut & disetor mitra SIPLah; dicatat sebagai informasi, tidak lewat BKU.' },
    // ---------------- PPh 22 ----------------
    { kunci: 'pph22', jenis: 'PPh 22', judul: 'PPh 22 pembelian barang oleh bendahara', tarif: 1.5, tarif_tanpa_npwp: 3, cara: 'pungut', kap: '411122', kjs: '910', aktif: false,
      dasar: 'PMK 34/2017 jo. PMK 41/PMK.010/2022', ket: 'NONAKTIF: pembelian barang dengan Dana BOS dikecualikan dari pemungutan PPh 22. Aktifkan hanya untuk sumber dana lain.' },
    { kunci: 'pph22_siplah', jenis: 'PPh 22', judul: 'PPh 22 pengadaan melalui SIPLah', tarif: 0.5, tarif_tanpa_npwp: 0.5, cara: 'mitra', kap: '411122', kjs: '910', aktif: true,
      dasar: 'PMK 58/2022', ket: 'Bila dipungut mitra SIPLah; informasi saja.' },
    // ---------------- PPh 23 ----------------
    { kunci: 'pph23_jasa', jenis: 'PPh 23', judul: 'PPh 23 jasa teknik, manajemen, konsultan & jasa lain (penyedia badan)', tarif: 2, tarif_tanpa_npwp: 4, cara: 'potong', kap: '411124', kjs: '104', aktif: true,
      dasar: 'UU PPh Pasal 23 ayat (1) huruf c angka 2; PMK 141/PMK.03/2015', ket: 'Perawatan/perbaikan, kebersihan, katering/jasa boga, percetakan, desain, dekorasi, EO, pelatih badan, dll. Penyedia orang pribadi → PPh 21 bukan pegawai.' },
    { kunci: 'pph23_sewa', jenis: 'PPh 23', judul: 'PPh 23 sewa harta selain tanah/bangunan', tarif: 2, tarif_tanpa_npwp: 4, cara: 'potong', kap: '411124', kjs: '100', aktif: true,
      kata_kunci: 'sewa',
      dasar: 'UU PPh Pasal 23 ayat (1) huruf c angka 1', ket: 'Sewa kendaraan, tenda, kursi, sound system, kostum/baju adat, alat — dari badan maupun orang pribadi.' },
    // ---------------- PPh 4(2) ----------------
    { kunci: 'pph42_sewa', jenis: 'PPh 4(2)', judul: 'PPh 4(2) sewa tanah/bangunan (final)', tarif: 10, tarif_tanpa_npwp: 10, cara: 'potong', kap: '411128', kjs: '403', aktif: true,
      kata_kunci: 'sewa gedung, sewa ruang, sewa aula, sewa bangunan, sewa tanah, sewa lahan, sewa tempat, sewa rumah',
      dasar: 'PP 34/2017', ket: 'Item yang namanya memuat kata kunci.' },
    { kunci: 'pph42_konstruksi', jenis: 'PPh 4(2)', judul: 'PPh 4(2) jasa konstruksi (final)', tarif: 1.75, tarif_tanpa_npwp: 4, cara: 'potong', kap: '411128', kjs: '409', aktif: true,
      kata_kunci: 'rehab, renovasi, konstruksi, pembangunan, pengecoran, pemasangan keramik, pemasangan kanopi, pengecatan gedung',
      dasar: 'PP 9/2022', ket: 'Kualifikasi kecil/perseorangan bersertifikat 1,75%; menengah/besar 2,65%; tanpa sertifikat (kolom "tanpa NPWP" dipakai) 4%. Ubah tarif sesuai sertifikat penyedia.' },
    // ---------------- PPh Final UMKM ----------------
    { kunci: 'pph_final_umkm', jenis: 'PPh Final UMKM', judul: 'PPh final 0,5% penyedia ber-Surat Keterangan PP 55/2022', tarif: 0.5, tarif_tanpa_npwp: 0.5, cara: 'potong', kap: '411128', kjs: '420', aktif: true,
      dasar: 'PP 55/2022; PMK 164/2023 Pasal 8', ket: 'Menggantikan PPh 21 (jasa orang pribadi), 22 dan 23 bila penyedia menyerahkan salinan Suket PP 55/2022 yang masih berlaku.' },
    // ---------------- PPh 21 ----------------
    { kunci: 'pph21_pns_gol12', jenis: 'PPh 21', judul: 'PPh 21 final PNS golongan I–II', tarif: 0, tarif_tanpa_npwp: 0, cara: 'potong', kap: '411121', kjs: '402', aktif: true, dasar: 'PP 80/2010 Pasal 4', ket: 'Honorarium/imbalan lain dari APBN/APBD.' },
    { kunci: 'pph21_pns_gol3', jenis: 'PPh 21', judul: 'PPh 21 final PNS golongan III', tarif: 5, tarif_tanpa_npwp: 5, cara: 'potong', kap: '411121', kjs: '402', aktif: true, dasar: 'PP 80/2010 Pasal 4', ket: 'Honorarium/imbalan lain dari APBN/APBD.' },
    { kunci: 'pph21_pns_gol4', jenis: 'PPh 21', judul: 'PPh 21 final PNS golongan IV', tarif: 15, tarif_tanpa_npwp: 15, cara: 'potong', kap: '411121', kjs: '402', aktif: true, dasar: 'PP 80/2010 Pasal 4', ket: 'Honorarium/imbalan lain dari APBN/APBD.' },
    { kunci: 'pph21_ter', jenis: 'PPh 21', judul: 'PPh 21 TER bulanan (pegawai tetap & tidak tetap bulanan)', tarif: null, tarif_tanpa_npwp: null, cara: 'potong', kap: '411121', kjs: '100', aktif: true, dasar: 'PP 58/2023; PMK 168/2023', ket: 'Tabel TER kategori A/B/C sesuai status PTKP (lihat tabel di bawah).' },
    { kunci: 'pph21_harian', jenis: 'PPh 21', judul: 'PPh 21 pegawai tidak tetap harian/per kegiatan', tarif: 0.5, tarif_tanpa_npwp: 0.5, cara: 'potong', kap: '411121', kjs: '100', aktif: true, dasar: 'PMK 168/2023 Pasal 12 ayat (2)', ket: 'Lihat batas TER harian di atas.' },
    { kunci: 'pph21_bukan_pegawai', jenis: 'PPh 21', judul: 'PPh 21 bukan pegawai (50% × Pasal 17)', tarif: 50, tarif_tanpa_npwp: 50, cara: 'potong', kap: '411121', kjs: '100', aktif: true, dasar: 'PMK 168/2023 Pasal 12 ayat (3)', ket: 'Kolom tarif = persentase bruto sebagai dasar (50%), lalu dikalikan tarif Pasal 17.' },
    { kunci: 'pph21_peserta', jenis: 'PPh 21', judul: 'PPh 21 peserta kegiatan (100% × Pasal 17)', tarif: 100, tarif_tanpa_npwp: 100, cara: 'potong', kap: '411121', kjs: '100', aktif: true, dasar: 'PMK 168/2023 Pasal 12 ayat (6)', ket: 'Kolom tarif = persentase bruto sebagai dasar (100%), lalu dikalikan tarif Pasal 17.' },
  ],
  // Firestore tidak menerima larik bersarang → simpan sebagai objek { batas, tarif }
  ter_bulanan: Object.fromEntries(Object.entries(TER_BULANAN).map(([k, v]) => [k, v.map(([batas, tarif]) => ({ batas, tarif }))])),
  pasal17: PASAL_17.map((x) => ({ ...x, sampai: Number.isFinite(x.sampai) ? x.sampai : null })),
}

// Jenis usaha penyedia (menentukan perlakuan konsumsi)
export const JENIS_USAHA = {
  umum: 'Toko/penyedia umum',
  katering: 'Katering/jasa boga (diantar ke lokasi) — PPh 23/21',
  rumah_makan: 'Rumah makan/restoran/warung — pajak daerah (PBJT), tanpa PPN/PPh 23',
}

// Batas waktu (PMK 81/2024): setor PPh potong/pungut paling lambat tanggal 15 bulan berikutnya;
// PPN yang dipungut pemungut: akhir bulan berikutnya & sebelum SPT Masa PPN disampaikan.
export const JATUH_TEMPO = { pph_setor: 15, pph_lapor: 20 }

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
