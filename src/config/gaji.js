// Konstanta Fase 6 — Kepegawaian & Gaji.
// Rumus mengikuti sheet "SKPG" / "dB-SKPG" pada Jurnal Dana BOS yang selama ini dipakai Bendahara Gaji:
//   tunj. istri/suami 10% GP · tunj. anak 2% GP per anak (maks. 2) · beras = jiwa × 10 kg × harga/kg
//   BPJS 4% × (GP + tunj. keluarga + tunj. fungsional/umum) — ditambahkan ke penghasilan sekaligus dipotong
//   JKK 0,24% GP · JKM 0,72% GP — ditambahkan & dipotong
//   IWP 1% × (GP + TK + TF) · PNS: IWP 8% × (GP + TK) · PPPK: JHT 3,25% × (GP + TK)
//   Pembulatan: gaji bersih dibulatkan ke atas ke ratusan rupiah.

export const TAB_GAJI = [
  { kunci: 'daftar', judul: 'Daftar Gaji', ikon: 'Wallet' },
  { kunci: 'dasar', judul: 'Dasar Gaji Pegawai', ikon: 'Calculator' },
  { kunci: 'skpg', judul: 'SKPG', ikon: 'FileSignature' },
  { kunci: 'kgb', judul: 'KGB', ikon: 'TrendingUp' },
  { kunci: 'impor', judul: 'Impor Daftar Resmi', ikon: 'FileUp' },
  { kunci: 'tabel', judul: 'Tabel Gaji Pokok', ikon: 'Table2' },
]

export const ATURAN_GAJI_AWAL = {
  harga_beras: 7242,     // Rp per kg (sheet SKPG); 10 kg per jiwa per bulan
  kg_per_jiwa: 10,
  istri: 10, anak: 2, anak_maks: 2,
  bpjs: 4, iwp1: 1, iwp8: 8, jht_pppk: 3.25, jkk: 0.24, jkm: 0.72,
  bulat: 100,            // gaji bersih dibulatkan ke atas ke kelipatan ini
}

// Tunjangan jabatan fungsional/umum bawaan (dari kolom "Tun. Fungsional" dB-SKPG; bisa diubah per pegawai)
export function tunjanganBawaan(p) {
  const gol = String(p.golongan || '')
  const kepsek = /kepala sekolah/i.test(p.jabatan || '')
  const guru = /guru|kepala sekolah/i.test(p.jabatan || '')
  if (kepsek) return 560000
  if (!guru) return 185000
  if (/^IV\//.test(gol) || ['XIII', 'XIV', 'XV', 'XVI', 'XVII'].includes(gol)) return 389000
  return 327000
}

// PPh 21 atas tunjangan profesi (PP 80/2010, final atas penghasilan dari APBN/APBD): gol III 5%, gol IV 15%.
// PPPK memakai 5% (sama dengan sheet SKPG); bisa diubah per pegawai di Dasar Gaji.
export function tarifPphTpg(p) {
  if (p.status_kepegawaian === 'PNS' && /^IV\//.test(p.golongan || '')) return 15
  if (p.status_kepegawaian === 'PNS' && /^(I|II)\//.test(p.golongan || '')) return 0
  return 5
}

// Komponen penghasilan & potongan — urutan sama dengan SKPG
export const KOMPONEN_PENGHASILAN = [
  { kunci: 'gaji_pokok', judul: 'Gaji Pokok', singkat: 'Gapok' },
  { kunci: 'tj_istri', judul: 'Tunj. Istri/Suami', singkat: 'Tj Istri' },
  { kunci: 'tj_anak', judul: 'Tunj. Anak', singkat: 'Tj Anak' },
  { kunci: 'tj_fungsional', judul: 'Tunj. Jabatan Fungsional/Umum', singkat: 'Tj Fung' },
  { kunci: 'tj_beras', judul: 'Tunj. Beras', singkat: 'Beras' },
  { kunci: 'tj_pph', judul: 'Tunj. Khusus Pajak', singkat: 'Tj PPh' },
  { kunci: 'bpjs', judul: 'BPJS 4%', singkat: 'BPJS 4%' },
  { kunci: 'jkk', judul: 'JKK 0,24%', singkat: 'JKK' },
  { kunci: 'jkm', judul: 'JKM 0,72%', singkat: 'JKM' },
  { kunci: 'pembulatan', judul: 'Pembulatan', singkat: 'Bulat' },
]
export const KOMPONEN_POTONGAN = [
  { kunci: 'pot_pph', judul: 'Pajak Penghasilan (PPh 21)', singkat: 'PPh' },
  { kunci: 'pot_bpjs', judul: 'BPJS', singkat: 'BPJS' },
  { kunci: 'pot_iwp1', judul: 'Iuran Wajib 1%', singkat: 'IWP 1%' },
  { kunci: 'pot_iwp8', judul: 'Iuran Wajib 8% / JHT', singkat: 'IWP 8%/JHT' },
  { kunci: 'pot_taperum', judul: 'Taperum', singkat: 'Taperum' },
  { kunci: 'pot_jkk', judul: 'JKK', singkat: 'JKK' },
  { kunci: 'pot_jkm', judul: 'JKM', singkat: 'JKM' },
  { kunci: 'pot_lain', judul: 'Potongan lain', singkat: 'Lain' },
]
export const KOMPONEN_SEMUA = [...KOMPONEN_PENGHASILAN, { kunci: 'kotor', judul: 'Jumlah Kotor', singkat: 'Kotor' }, ...KOMPONEN_POTONGAN,
  { kunci: 'potongan', judul: 'Jumlah Potongan', singkat: 'Potongan' }, { kunci: 'bersih', judul: 'Gaji Bersih', singkat: 'Bersih' }]

// Keperluan SKPG (pilihan saat mencetak)
export const KEPERLUAN_SKPG = [
  { kunci: 'bank', judul: 'Pinjaman/kredit bank', ikon: 'Landmark' },
  { kunci: 'mutasi', judul: 'Pindah tugas/mutasi', ikon: 'ArrowRightLeft' },
  { kunci: 'administrasi', judul: 'Administrasi pegawai', ikon: 'FileText' },
  { kunci: 'pensiun', judul: 'Pensiun/Taspen', ikon: 'Award' },
]

// Status KGB berdasarkan sisa hari menuju jatuh tempo
export function statusKgb(sisaHari) {
  if (sisaHari == null) return { kunci: 'kosong', label: 'TMT KGB belum diisi', lencana: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', ikon: 'CircleHelp' }
  if (sisaHari < 0) return { kunci: 'lewat', label: `Lewat ${-sisaHari} hari`, lencana: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', ikon: 'CircleAlert' }
  if (sisaHari <= 30) return { kunci: 'h30', label: sisaHari === 0 ? 'Hari ini' : `H-${sisaHari}`, lencana: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', ikon: 'BellRing' }
  if (sisaHari <= 90) return { kunci: 'dekat', label: `${Math.ceil(sisaHari / 30)} bln lagi`, lencana: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', ikon: 'CalendarClock' }
  return { kunci: 'aman', label: `${Math.round(sisaHari / 30)} bln lagi`, lencana: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', ikon: 'CircleCheck' }
}
