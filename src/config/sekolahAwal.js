// Data awal sekolah (dari dokumen serah terima). Dipakai untuk mengisi koleksi `sekolah` pertama kali.
export const SEKOLAH_AWAL = {
  npsn: '40307324',
  nama_arkas: 'UPT SPF SMP NEGERI 19 MAKASSAR',
  nama_pemda: 'UPT SATUAN PENDIDIKAN FORMAL SMP NEGERI 19 MAKASSAR',
  kode_sekolah_pemda: '1.01.0.00.0.00.01.0047',
  npwp: '00.297.289.1-805.000',
  id_subunit: '',
  alamat: 'Jl. Tamangapa Raya III No. 35, Bangkala, Kec. Manggala, Kota Makassar, 90235',
  telepon: '(0411) 492912',
  email: 'smpn.19@gmail.com',
  status: 'Negeri',
  batas_honor_persen: 20,
  kop_baris: ['DINAS PENDIDIKAN PEMERINTAH KOTA MAKASSAR','UNIT PELAKSANA TEKNIS SATUAN PENDIDIKAN FORMAL', 'SMP NEGERI 19 MAKASSAR'],
}

export const PEJABAT_AWAL = [
  { jabatan: 'kepala_sekolah', nama: 'Muhammad Kasim', gelar: 'S.Pd., M.Pd.', nip: '197203191999031002', mulai: null, sampai: '2026-06-29' },
  { jabatan: 'kepala_sekolah', nama: 'Muhammad Warham', gelar: 'S.Ag., M.Pd.I.', pangkat: 'Pembina Tk. I/IV.b', nip: '197406182004111002', mulai: '2026-06-30', sampai: null },
  { jabatan: 'bendahara_bosp', nama: 'Ramli', gelar: 'S.Pd., M.Pd., Gr.', nip: '199511152020121007', mulai: null, sampai: null },
  { jabatan: 'bendahara_gaji', nama: 'Ramli', gelar: 'S.Pd., M.Pd., Gr.', nip: '199511152020121007', mulai: null, sampai: null },
]

// Pejabat untuk Mode Pratinjau (tidak pernah disimpan ke Firestore)
export const PEJABAT_CONTOH = [
  ...PEJABAT_AWAL,
  { jabatan: 'pengurus_barang', nama: 'Contoh Pengurus Barang', gelar: 'S.E.', nip: '198702142019022001', pangkat: 'Penata Muda/III.a', mulai: null, sampai: null },
]

export const JABATAN = {
  kepala_sekolah: { label: 'Kepala Sekolah', ikon: 'Stamp', warna: 'from-violet-500 to-fuchsia-500' },
  bendahara_bosp: { label: 'Bendahara BOSP', ikon: 'PiggyBank', warna: 'from-blue-500 to-indigo-600' },
  bendahara_gaji: { label: 'Bendahara Gaji', ikon: 'Banknote', warna: 'from-emerald-400 to-teal-600' },
  ketua_komite: { label: 'Ketua Komite', ikon: 'Handshake', warna: 'from-amber-400 to-orange-500' },
  pengurus_barang: { label: 'Pengurus Barang', ikon: 'PackageCheck', warna: 'from-rose-400 to-red-500' },
}

/** NIP 19740618 200411 1 002 */
export const formatNip = (nip = '') => (nip.length === 18 ? `${nip.slice(0, 8)} ${nip.slice(8, 14)} ${nip.slice(14, 15)} ${nip.slice(15)}` : nip)

// Pemilik sistem pertama (Bendahara/Admin). Hanya email ini yang boleh menjalankan Penyiapan Awal,
// dan hanya sekali. Peralihan ke bendahara berikutnya lewat menu Serah Terima Bendahara.
export const PEMILIK_AWAL = {
  email: 'ramli51@guru.sma.belajar.id',
  username: 'ramli',
  nama: 'Ramli',
  gelar: 'S.Pd., M.Pd., Gr.',
  nip: '199511152020121007',
}

// Folder induk SIBOS di Google Drive (bisa diganti di Pengaturan → Drive & Cadangan)
export const ID_FOLDER_DRIVE_AWAL = '12G033COl3Cny9yenJOvxgQ16ilwaeM7p'

// Kop surat dinas mengikuti tata naskah Pemerintah Kota Makassar:
// PEMERINTAH KOTA MAKASSAR / NAMA UNIT (tebal) / alamat lengkap / telepon / laman & pos-el
export const HURUF_KOP = ['Times New Roman', 'Bookman Old Style', 'Arial']
export const GARIS_KOP = [
  { nilai: 'tunggal', label: 'Garis bawah' },
  { nilai: 'ganda', label: 'Garis ganda' },
  { nilai: 'tidak', label: 'Tanpa garis' },
]
export function kopBawaan(p = {}) {
  return {
    huruf: 'Times New Roman',
    garis: 'tunggal',
    tebal_garis: 0.5, // pt
    baris: [
      { teks: 'PEMERINTAH KOTA MAKASSAR', ukuran: 14, tebal: false },
      { teks: 'UPT SPF SMP NEGERI 19 MAKASSAR', ukuran: 16, tebal: true },
      { teks: 'Jalan Tamangapa Raya III Nomor 35, Bangkala, Manggala, Kota Makassar, Sulawesi Selatan, Kode Pos 90235,', ukuran: 7.5, tebal: false },
      { teks: `Telpon ${p.telepon || '(0411) 492912'}`, ukuran: 11, tebal: false },
      { teks: `Pos-el ${p.email || 'smpn.19@gmail.com'}`, ukuran: 10, tebal: false },
    ],
  }
}
