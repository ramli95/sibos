// Data contoh Mode Pratinjau untuk menu Kepegawaian & Gaji (tidak pernah disimpan ke Firestore).
export const pegawai = [
  { id: 'c1', nama: 'Ramli', gelar: 'S.Pd., M.Pd., Gr.', nip: '199511152020121007', npwp: '00.000.000.0-805.000', jenis_kelamin: 'L', status_kepegawaian: 'PNS', golongan: 'III/b', pangkat: 'Penata Muda Tingkat I', jabatan: 'Guru BK', terima_tpg: true, status_kawin: 'Kawin', anak: 1, jiwa: 3, tmt_kgb_terakhir: '2024-12-01', aktif: true },
  { id: 'c2', nama: 'Contoh Guru Senior', gelar: 'S.Pd.', nip: '197009111998022004', jenis_kelamin: 'P', status_kepegawaian: 'PNS', golongan: 'IV/c', pangkat: 'Pembina Utama Muda', jabatan: 'Guru Mata Pelajaran', terima_tpg: true, status_kawin: 'Belum Kawin', anak: 0, jiwa: 1, tmt_kgb_terakhir: '2025-01-01', aktif: true },
  { id: 'c3', nama: 'Contoh Guru PPPK', gelar: 'S.Pd.', nip: '199202292023211006', jenis_kelamin: 'L', status_kepegawaian: 'PPPK', golongan: 'IX', jabatan: 'Guru Matematika', terima_tpg: false, status_kawin: 'Kawin', anak: 0, jiwa: 2, tmt_kgb_terakhir: '2024-11-20', aktif: true },
  { id: 'c4', nama: 'Contoh Tendik PPPK', nip: '199908232025212012', jenis_kelamin: 'P', status_kepegawaian: 'PPPK', golongan: 'V', jabatan: 'Pengelola Keuangan', terima_tpg: false, status_kawin: 'Belum Kawin', anak: 0, jiwa: 1, tmt_kgb_terakhir: '', aktif: true },
  { id: 'c5', nama: 'Contoh Tenaga Honorer', gelar: 'A.Md.', nip: '', nik: '7371145301800004', jenis_kelamin: 'P', status_kepegawaian: 'Honorer', jabatan: 'Operator Sekolah', aktif: true },
]

export const dasar = {
  c1: { mkg: 4, tmt_tugas: '2020-12-01', diperbarui: new Date() },
  c2: { mkg: 28, tj_fungsional: 389000, diperbarui: new Date() },
  c3: { mkg: 2, diperbarui: new Date() },
}

export const bulan = {
  '2026-10': { periode: '2026-10', resmi: { c2: { nip: '197009111998022004', nama: 'Contoh Guru Senior', gaji_pokok: 5513600, bersih: 5475000 } }, berkas: { nama: 'Contoh daftar gaji.pdf' } },
}
export const kgb = []
export const skpg = []
export let urut = 20
