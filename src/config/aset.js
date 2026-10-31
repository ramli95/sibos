// Konstanta Fase 5 — Barang & Aset.
// Kodefikasi barang mengikuti Referensi Barang Modal ARKAS 2025 (kode 1.3.xx.xx.xx.xxxx.xxxxx).
// Golongan KIB menurut Permendagri 47/2021 (penatausahaan BMD): A tanah, B peralatan & mesin,
// C gedung & bangunan, D jalan/irigasi/jaringan, E aset tetap lainnya, F konstruksi dalam pengerjaan.

export const TAB_ASET = [
  { kunci: 'klasifikasi', judul: 'Barang dari Belanja', ikon: 'PackageSearch' },
  { kunci: 'inventaris', judul: 'KIB & Inventaris', ikon: 'Boxes' },
  { kunci: 'ruang', judul: 'Ruangan & KIR', ikon: 'DoorOpen' },
  { kunci: 'bast', judul: 'BAST Pengurus Barang', ikon: 'PackageCheck' },
  { kunci: 'persediaan', judul: 'Persediaan', ikon: 'Warehouse' },
  { kunci: 'referensi', judul: 'Referensi Barang Modal', ikon: 'BookMarked' },
]

// Kelas barang hasil belanja
export const KELAS_BARANG = {
  kib: { label: 'Aset tetap (KIB)', singkat: 'KIB', ikon: 'Boxes', ket: 'Belanja modal 5.2 — dicatat di KIB & Buku Inventaris', lencana: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', warna: '#1A62E8' },
  ekstra: { label: 'Ekstrakomptabel', singkat: 'Ekstra', ikon: 'Armchair', ket: 'Barang tahan lama dari belanja 5.1 — dicatat di Buku Inventaris, tidak masuk neraca', lencana: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300', warna: '#22A08D' },
  persediaan: { label: 'Persediaan', singkat: 'Persediaan', ikon: 'Package', ket: 'Barang habis pakai (ATK, bahan, obat, kebersihan) — Buku Persediaan', lencana: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', warna: '#E3A414' },
  abaikan: { label: 'Bukan barang', singkat: 'Lewati', ikon: 'Ban', ket: 'Jasa, honor, konsumsi, perjalanan, pemeliharaan', lencana: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', warna: '#94a3b8' },
}

export const GOLONGAN_KIB = {
  A: { judul: 'KIB A — Tanah', awalan: '1.3.01', rekening: '5.2.01' },
  B: { judul: 'KIB B — Peralatan dan Mesin', awalan: '1.3.02', rekening: '5.2.02' },
  C: { judul: 'KIB C — Gedung dan Bangunan', awalan: '1.3.03', rekening: '5.2.03' },
  D: { judul: 'KIB D — Jalan, Irigasi dan Jaringan', awalan: '1.3.04', rekening: '5.2.04' },
  E: { judul: 'KIB E — Aset Tetap Lainnya', awalan: '1.3.05', rekening: '5.2.05' },
  F: { judul: 'KIB F — Konstruksi Dalam Pengerjaan', awalan: '1.3.06', rekening: '5.2.06' },
}

export const KONDISI = {
  B: { label: 'Baik', lencana: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  KB: { label: 'Kurang Baik', lencana: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  RB: { label: 'Rusak Berat', lencana: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
}

// Jenis ruangan (ikon) — daftar ruangan sekolah diisi sendiri di tab Ruangan & KIR
export const JENIS_RUANG = {
  pimpinan: { label: 'Pimpinan/Kantor', ikon: 'Stamp' },
  kelas: { label: 'Ruang kelas', ikon: 'School' },
  lab: { label: 'Laboratorium', ikon: 'Cpu' },
  perpustakaan: { label: 'Perpustakaan', ikon: 'Library' },
  penunjang: { label: 'Penunjang (UKS, BK, ibadah)', ikon: 'HeartHandshake' },
  gudang: { label: 'Gudang', ikon: 'Warehouse' },
  lainnya: { label: 'Lainnya', ikon: 'DoorOpen' },
}
export const RUANG_AWAL = [
  { kode: 'R-01', nama: 'Ruang Kepala Sekolah', jenis: 'pimpinan' },
  { kode: 'R-02', nama: 'Ruang Guru', jenis: 'pimpinan' },
  { kode: 'R-03', nama: 'Ruang Tata Usaha', jenis: 'pimpinan' },
  { kode: 'R-04', nama: 'Perpustakaan', jenis: 'perpustakaan' },
  { kode: 'R-05', nama: 'Laboratorium IPA', jenis: 'lab' },
  { kode: 'R-06', nama: 'Laboratorium Komputer', jenis: 'lab' },
  { kode: 'R-07', nama: 'Ruang UKS', jenis: 'penunjang' },
  { kode: 'R-08', nama: 'Ruang BK', jenis: 'penunjang' },
  { kode: 'R-09', nama: 'Gudang', jenis: 'gudang' },
]

// Jenis mutasi persediaan yang dicatat manual
export const JENIS_PERSEDIAAN = {
  awal: { label: 'Saldo awal persediaan', ikon: 'PiggyBank' },
  keluar: { label: 'Pengeluaran barang (bon)', ikon: 'PackageMinus' },
  opname: { label: 'Stok opname', ikon: 'ClipboardCheck' },
}

// Nama pemilik pada label barang
export const PEMILIK_LABEL = 'PEMERINTAH KOTA MAKASSAR'

// Nama barang yang lazim tahan lama (disarankan ekstrakomptabel bila dibeli dari belanja 5.1)
export const POLA_TAHAN_LAMA = /\b(kursi|meja|lemari|rak|kipas|dispenser|papan (tulis|data|informasi)|whiteboard|speaker|pengeras|sound|stabili[sz]er|mikrofon|\bmic\b|proyektor|layar|kamera|timbangan|tensimeter|tandu|mesin|\bbor\b|tangga|matras|piala|trofi|jam dinding|filing|brankas|router|\bups\b|printer|scanner|monitor|televisi|\btv\b|kulkas|gerobak|troli|tenda|bendera|tiang|loker|sofa|karpet|gorden|vacuum|blender|kompor|tabung gas|alat musik|gitar|keyboard musik|drum|rebana)\b/i
// Nama yang jelas bukan barang persediaan (konsumsi)
export const POLA_KONSUMSI = /\b(makan|minum|snack|kudapan|konsumsi|nasi|kue|air mineral|catering|katering|prasmanan)\b/i
// Nama yang jelas barang habis pakai (tetap persediaan walau nilainya besar)
export const POLA_HABIS_PAKAI = /\b(bahan|atk|alat tulis|kertas|tinta|toner|obat|sabun|pembersih|cairan|tisu|tissue|spidol|map|amplop|baterai|lakban|isolasi|cat|semen|pasir|paku)\b/i
// Batas harga satuan barang 5.1 yang disarankan ekstrakomptabel
export const BATAS_EKSTRA = 500_000
