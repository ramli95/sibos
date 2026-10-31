// Data contoh Fase 5 (Mode Pratinjau): ruangan, laptop dari belanja SIPLah Maret, persediaan kertas.
import { RUANG_AWAL } from '@/config/aset'

export const ruang = RUANG_AWAL.map((r, i) => ({ id: `ruang-${i + 1}`, penanggung_jawab: i === 5 ? 'Contoh Operator, S.Kom.' : '', nip_penanggung_jawab: '', keterangan: '', ...r }))

export const aset = [
  {
    id: 'aset-laptop', tahun: 2026, jenis: 'kib', golongan: 'B', kode_barang: '1.3.02.10.01.0002.00020', nama: 'Laptop', merk: 'Contoh Merk 14"', spesifikasi: 'Core i5, RAM 8 GB, SSD 256 GB',
    bahan: 'Plastik/Logam', ukuran: '14 inci', jumlah: 8, satuan: 'unit', harga_satuan: 8_000_000, nilai: 64_000_000, register_awal: 1, register_akhir: 8, tgl_perolehan: '2026-03-10',
    kode_rekening: '5.2.02.10.01.0002', kode_kegiatan: '05.07.01', id_belanja: 'contoh-s1-laptop', id_item: 'contoh-s1-laptop-0', nama_pekerjaan: 'Pengadaan laptop untuk asesmen', penyedia: 'CV Contoh Mandiri',
    asal: 'Dana BOSP', kondisi: 'B', id_ruang: 'ruang-6', keterangan: 'Untuk asesmen berbasis komputer', id_bast: 'bast-1', status: 'aktif',
  },
]

export const bast = [
  {
    id: 'bast-1', tahun: 2026, nomor: '421/18/UPT.SPF.SMPN.19/III/2026', nomor_urut: 18, tanggal: '2026-03-12', id_aset: ['aset-laptop'],
    butir: [{ id_aset: 'aset-laptop', nama: 'Laptop', merk: 'Contoh Merk 14"', kode_barang: '1.3.02.10.01.0002.00020', register: '0001 s.d. 0008', jumlah: 8, satuan: 'unit', nilai: 64_000_000, kondisi: 'B' }],
    catatan: 'Barang hasil pengadaan SIPLah dalam keadaan baik dan lengkap.',
  },
]

export const persediaan = [
  { id: 'ps-keluar-1', tahun: 2026, jenis: 'keluar', tanggal: '2026-03-02', penerima: 'Tata Usaha', keperluan: 'Administrasi semester genap', butir: [{ kunci: 'kertas hvs f4 80 gram|rim', nama: 'Kertas HVS F4 80 gram', satuan: 'rim', jumlah: 20 }] },
  { id: 'ps-opname-1', tahun: 2026, jenis: 'opname', tanggal: '2026-06-30', keterangan: 'Semester I', butir: [{ kunci: 'kertas hvs f4 80 gram|rim', nama: 'Kertas HVS F4 80 gram', satuan: 'rim', sisa_fisik: 12 }] },
]

export const kelas = { 2026: {} }
