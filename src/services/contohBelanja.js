// Data contoh Fase 3 untuk Mode Pratinjau (tanpa Firebase): service AC, konsumsi rapat, honor narasumber.
// Disimpan di memori selama halaman terbuka, jadi tambah/ubah/hapus bisa dicoba.
import { POLA_NOMOR_AWAL, JENIS_NOMOR } from '@/config/belanja'
import { rapikanBelanja } from './belanja'
import { kelengkapan, persenLengkap } from '@/utils/belanja'

export const pola = { ...POLA_NOMOR_AWAL }
export const penghitung = { surat: 14, kwitansi: 6, invoice: 3 }

export const PEGAWAI = [
  { id: 'p1', nama: 'Ramli', gelar: 'S.Pd., M.Pd., Gr.', nip: '199511152020121007', status_kepegawaian: 'PNS', golongan: 'III/b', pangkat: 'Penata Muda Tingkat I', jabatan: 'Guru BK', terima_tpg: true, aktif: true },
  { id: 'p2', nama: 'Soba', gelar: 'S.Pd.', nip: '197505052005011003', status_kepegawaian: 'PNS', golongan: 'IV/a', pangkat: 'Pembina', jabatan: 'Wakasek Sarana Prasarana', terima_tpg: true, aktif: true },
  { id: 'p3', nama: 'Contoh Guru Honorer', gelar: 'S.Pd.', nip: '', nuptk: '1234567890123456', status_kepegawaian: 'Honorer', status_dapodik: 'Terdaftar', jabatan: 'Guru Seni Budaya', terima_tpg: false, aktif: true },
  { id: 'p4', nama: 'Contoh Operator', gelar: 'S.Kom.', nip: '', status_kepegawaian: 'Honorer', jabatan: 'Operator Sekolah', sk_penugasan: '800/12/SMPN19/VII/2026', aktif: true },
  { id: 'p5', nama: 'Contoh Pengurus Barang', gelar: 'S.E.', nip: '198702142019022001', status_kepegawaian: 'PNS', golongan: 'III/a', pangkat: 'Penata Muda', jabatan: 'Pengurus Barang', aktif: true },
]

export const REKANAN = [
  { id: 'r1', nama_usaha: 'Toko Sejuk Jaya Teknik', pemilik: 'Haerul', jabatan_pemilik: 'Pemilik', alamat: 'Jl. Tamangapa Raya No. 12, Manggala, Makassar', telepon: '0411-490123', no_wa: '6281355500111', npwp: '45.123.456.7-805.000', status_pkp: false, bentuk_usaha: 'orang_pribadi', bank: 'BRI', no_rekening: '012301000123456', atas_nama_rekening: 'Haerul', aktif: true },
  { id: 'r2', nama_usaha: 'CV Contoh Mandiri', pemilik: 'Direktur Contoh', jabatan_pemilik: 'Direktur', alamat: 'Jl. Urip Sumoharjo No. 5, Makassar', npwp: '02.345.678.9-805.000', status_pkp: true, bentuk_usaha: 'badan', bank: 'Bank Sulselbar', no_rekening: '1001234567', aktif: true },
  { id: 'r3', nama_usaha: 'Dapur Bosara Catering', pemilik: 'Nurhayati', alamat: 'Jl. Antang Raya No. 8, Makassar', npwp: '', status_pkp: false, bentuk_usaha: 'orang_pribadi', aktif: true },
]

export const orangLuar = [
  { id: 'o1', nama: 'Dr. Contoh Narasumber, M.Pd.', nip: '197001011995031001', golongan: 'IV/b', jabatan: 'Widyaiswara', instansi: 'BBGP Sulawesi Selatan', status_kepegawaian: 'PNS', npwp: '', no_wa: '' },
]

const r = (id) => { const x = REKANAN.find((y) => y.id === id); return { ...x } }

const AWAL = [
  {
    id: 'contoh-ac', tahun: 2026, jenis: 'pengadaan', cara: 'non_siplah', nama_pekerjaan: 'Service AC Ruang Kelas dan Kantor',
    uraian_pembayaran: 'Pembayaran jasa service AC split ruang kelas dan ruang kantor UPT SPF SMP Negeri 19 Makassar',
    id_rekanan: 'r1', rekanan: r('r1'), pelaksana: 'kepala_sekolah',
    pemeriksa: { id: 'p5', nama: 'Contoh Pengurus Barang', gelar: 'S.E.', nip: '198702142019022001', jabatan: 'Pengurus Barang' },
    item: [
      { id: 'i1', nama: 'Jasa service AC split 1–1,5 PK (cuci & cek tekanan)', spesifikasi: 'Cuci indoor/outdoor, cek freon, ganti selang buang bila perlu', jenis: 'jasa', volume: 10, satuan: 'unit', harga: 135000, harga_ssh: 150000, kode_kegiatan: '05.08.03', kode_rekening: '5.1.02.03.02.0121', uraian_rkas: 'Pemeliharaan Alat Pendingin-AC Split', harga_rkas: 135000 },
      { id: 'i2', nama: 'Jasa service AC ruang kepala sekolah (isi freon R32)', spesifikasi: 'Paket isi freon R32 + pengecekan kompresor', jenis: 'jasa', volume: 1, satuan: 'paket', harga: 850000, kode_kegiatan: '05.08.03', kode_rekening: '5.1.02.01.01.0012', uraian_rkas: 'Service AC', harga_rkas: 850000 },
    ],
    tgl_pesanan: '2026-10-05', tgl_terima: '2026-10-08', tgl_proforma: '2026-10-08', tgl_invoice: '2026-10-09', tgl_lunas: '2026-10-12', tgl_kwitansi: '2026-10-12',
    waktu_serah: '3 (tiga) hari kerja sejak surat pesanan', lokasi_serah: 'UPT SPF SMP Negeri 19 Makassar',
    persyaratan: ['Identitas penyedia (KTP pemilik)', 'NPWP', 'Berpengalaman servis AC'],
    dokumen: { perencanaan: true, kwitansi_kecil: true, proforma: true, invoice: true, foto: true, negosiasi: true },
    nomor: {
      negosiasi: '421/9/UPT.SPF.SMPN.19/X/2026', surat_pesanan: '421/10/UPT.SPF.SMPN.19/X/2026', shp: '421/11/UPT.SPF.SMPN.19/X/2026', bast: '421/12/UPT.SPF.SMPN.19/X/2026',
      proforma: 'PI/TSJT/003/2026', invoice: 'INV/TSJT/003/2026', kwitansi_kecil: 'Kwt/006/SMPN19/10/2026',
    },
    nomor_urut: { negosiasi: 9, surat_pesanan: 10, shp: 11, bast: 12, proforma: 3, invoice: 3, kwitansi_kecil: 6 },
    bnu: { '05.08.03 5.1.02.03.02.0121': 'BNU 214', '05.08.03 5.1.02.01.01.0012': 'BNU 215' },
    lampiran: { baris_hadir: 20, baris_konsumsi: 50, foto_per_halaman: 4 },
    arsip: {}, jumlah_foto: 0,
  },
  {
    id: 'contoh-konsumsi', tahun: 2026, jenis: 'pengadaan', cara: 'non_siplah', nama_pekerjaan: 'Konsumsi Rapat Evaluasi Tengah Semester',
    uraian_pembayaran: 'Pembayaran konsumsi rapat evaluasi tengah semester ganjil',
    id_rekanan: 'r3', rekanan: r('r3'), pelaksana: 'kepala_sekolah',
    pemeriksa: { id: 'p2', nama: 'Soba', gelar: 'S.Pd.', nip: '197505052005011003', jabatan: 'Wakasek Sarana Prasarana' },
    item: [{ id: 'k1', nama: 'Konsumsi Makan dan Minum-Makan (rapat)', jenis: 'konsumsi', volume: 50, satuan: 'orang / kali', harga: 30000, kode_kegiatan: '06.05.06', kode_rekening: '5.1.02.01.01.0052', uraian_rkas: 'Konsumsi Makan dan Minum-Makan', harga_rkas: 30000 }],
    tgl_pesanan: '2026-10-20', tgl_terima: '2026-10-22',
    dokumen: { kwitansi_kecil: true, invoice: true, foto: true, daftar_hadir: true, penerima_konsumsi: true },
    nomor: {}, bnu: {}, lampiran: { baris_hadir: 50, baris_konsumsi: 50, foto_per_halaman: 4, peserta_pegawai: true }, arsip: {}, jumlah_foto: 0,
  },
  {
    id: 'contoh-honor', tahun: 2026, jenis: 'honor', jenis_honor: 'narasumber', nama_pekerjaan: 'Honor Narasumber Workshop Kurikulum',
    uraian_pembayaran: 'Pembayaran honor narasumber workshop penguatan kurikulum', tgl_kegiatan: '2026-09-17', tgl_lunas: '2026-09-17', tempat: 'Aula UPT SPF SMP Negeri 19 Makassar',
    uraian_honor: { kode_kegiatan: '04.06.01', kode_rekening: '5.1.02.02.01.0003', uraian_rkas: 'Honorarium Narasumber-Pejabat Eselon II / S2 / yang disetarakan', harga_rkas: 700000, kategori: 'operasional' },
    penerima: [{ sumber: 'luar', id: 'o1', nama: 'Dr. Contoh Narasumber, M.Pd.', nip: '197001011995031001', golongan: 'IV/b', jabatan: 'Widyaiswara', instansi: 'BBGP Sulawesi Selatan', status_kepegawaian: 'PNS', besaran: 700000, volume: 3, satuan: 'jam' }],
    dokumen: { penerimaan_honor: true, daftar_hadir: true, foto: true },
    bnu: { '04.06.01 5.1.02.02.01.0003': 'BNU 188' }, lampiran: { baris_hadir: 30, foto_per_halaman: 4, peserta_pegawai: true }, arsip: {}, jumlah_foto: 0,
  },
]

export const daftar = AWAL.map((b) => ({ ...rapikanBelanja(b), id: b.id }))
export const foto = {}

export const agenda = [
  { id: 'a-manual-1', tahun: 2026, jenis: 'surat_tugas', nomor: '421/8/UPT.SPF.SMPN.19/X/2026', urut: 8, tanggal: '2026-10-02', perihal: 'Surat tugas pendampingan lomba', tujuan: 'Guru pendamping', id_belanja: null, sumber: 'manual' },
]
export function agendaDariBelanja(b) {
  for (let i = agenda.length - 1; i >= 0; i--) if (agenda[i].id_belanja === b.id) agenda.splice(i, 1)
  Object.keys(JENIS_NOMOR).forEach((j) => {
    if (!b.nomor?.[j]) return
    const tgl = { surat_pesanan: b.tgl_pesanan, negosiasi: b.tgl_pesanan, shp: b.tgl_terima, bast: b.tgl_terima, kwitansi_kecil: b.tgl_kwitansi || b.tgl_lunas, invoice: b.tgl_invoice, proforma: b.tgl_proforma }[j]
    agenda.push({ id: `${b.id}_${j}`, tahun: b.tahun, jenis: j, nomor: b.nomor[j], urut: b.nomor_urut?.[j] || null, tanggal: tgl || '', perihal: `${JENIS_NOMOR[j].judul} — ${b.nama_pekerjaan}`, tujuan: b.rekanan?.nama_usaha || '', id_belanja: b.id, sumber: b.nomor_manual?.[j] ? 'manual' : 'otomatis' })
  })
}
daftar.forEach(agendaDariBelanja)

/** Foto contoh digambar di kanvas (Mode Pratinjau) */
function gambarContoh(judul, sub, warna) {
  const c = document.createElement('canvas')
  c.width = 800; c.height = 560
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 800, 560); g.addColorStop(0, warna); g.addColorStop(1, '#0f172a')
  x.fillStyle = g; x.fillRect(0, 0, 800, 560)
  x.fillStyle = 'rgba(255,255,255,.92)'; x.fillRect(170, 150, 460, 150)
  x.fillStyle = '#cbd5e1'; for (let i = 0; i < 8; i++) x.fillRect(200, 250 + (i % 2) * 6, 400, 3)
  x.fillStyle = '#22c55e'; x.beginPath(); x.arc(600, 180, 8, 0, 7); x.fill()
  x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText(judul, 400, 400)
  x.font = '22px sans-serif'; x.fillText(sub, 400, 440)
  return c.toDataURL('image/jpeg', 0.7)
}
export function siapkanFotoContoh() {
  if (foto['contoh-ac'] || typeof document === 'undefined') return
  foto['contoh-ac'] = [
    { id: 'fa1', data: gambarContoh('Sebelum service', 'AC Ruang Kelas VII.A', '#1d4ed8'), keterangan: 'Kondisi AC sebelum dibersihkan', urutan: 0, kelompok: 'bast' },
    { id: 'fa2', data: gambarContoh('Proses pencucian', 'Unit indoor & outdoor', '#0f766e'), keterangan: 'Pencucian unit indoor dan outdoor', urutan: 1, kelompok: 'bast' },
    { id: 'fa3', data: gambarContoh('Pengisian freon', 'Ruang Kepala Sekolah', '#7c3aed'), keterangan: 'Pengisian freon R32 ruang kepala sekolah', urutan: 2, kelompok: 'bast' },
    { id: 'fa4', data: gambarContoh('Serah terima', 'Penyedia & pemeriksa barang', '#b45309'), keterangan: 'Serah terima hasil pekerjaan', urutan: 3, kelompok: 'bast' },
  ]
  const b = daftar.find((x) => x.id === 'contoh-ac'); if (b) { b.jumlah_foto = 4; b.arsip = { paket_ttd: [{ nama: 'Paket SPJ Service AC (ttd).pdf', tautan: '#', id: 'x', waktu: '2026-10-13' }] }; b.persen_lengkap = persenLengkap(kelengkapan(b)) }
}
