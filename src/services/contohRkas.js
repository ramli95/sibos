// Data contoh untuk Mode Pratinjau (tanpa Firebase). Diambil sebagian dari pola RKAS 2026 Perubahan.
import { rapikanUraian, ringkasVersi } from './rkas'

// [kegiatan, rekening, uraian, volume, satuan, harga, tahap1 (porsi 0..1)]
const BARIS = [
  ['03.01.01', '5.1.02.01.01.0052', 'Konsumsi Makan dan Minum-Makan', 375, 'orang / kali', 30000, 1],
  ['03.01.01', '5.1.02.01.01.0052', 'Konsumsi Makan dan Minum-Snack/Kudapan', 450, 'orang / kali', 15000, 1],
  ['03.01.01', '5.1.02.04.01.0003', 'Transportasi-Dalam Daerah', 375, 'orang / hari', 50000, 1],
  ['03.03.06', '5.1.02.01.01.0012', 'Perlengkapan Pramuka', 1, 'paket', 860000, 1],
  ['03.03.06', '5.1.02.01.01.0012', 'Jasa Sewa Transportasi Mini Bus', 12, 'orang', 200000, 0.5],
  ['03.03.07', '5.1.02.01.01.0012', 'Jasa Sewa Mobil (Mini Bus)', 46, 'unit', 200000, 0.35],
  ['03.03.07', '5.1.02.01.01.0052', 'Konsumsi Makan dan Minum-Makan', 479, 'orang / kali', 25000, 0.4],
  ['03.03.19', '5.1.02.01.01.0012', 'Pendaftaran Lomba', 6, 'kegiatan', 150000, 0.2],
  ['03.05.02', '5.1.02.01.01.0012', 'Tandu Lipat', 2, 'buah', 1500000, 0],
  ['03.05.02', '5.2.02.05.01.0004', 'Lemari Etalase-Dimensi 150 x 50 x 200 cm, Bahan Aluminium Kaca', 2, 'buah', 4000000, 0],
  ['04.06.01', '5.1.02.01.01.0052', 'Konsumsi Makan dan Minum-Makan', 205, 'orang / kali', 30000, 0.33],
  ['04.06.01', '5.1.02.02.01.0003', 'Honorarium Narasumber-Pejabat Eselon II / S2 / yang disetarakan', 3, 'orang / jam', 700000, 0.33],
  ['04.06.02', '5.1.02.01.01.0012', 'Biaya Registrasi dan Transpor Kegiatan Pelatihan MGMP/KKG/Kombel', 35, 'orang / kegiatan', 150000, 0.28],
  ['05.02.03', '5.1.02.01.01.0012', 'Mahir Matematika 1/VII SMP/MTs', 100, 'buku', 90000, 1],
  ['05.02.03', '5.2.05.01.01.0002', 'Interactive English SMP/MTs Kelas 3/IX', 100, 'buku', 125000, 1],
  ['05.02.03', '5.2.05.01.01.0006', 'Matematika SMP Kelas 1 DL', 32, 'buku', 134000, 1],
  ['05.02.04', '5.1.02.01.01.0012', 'SPLASH Pend. Pancasila 1/VII SMP/MTs', 128, 'eksemplar', 84000, 1],
  ['05.08.01', '5.1.02.01.01.0001', 'Semen PC-Ukuran 40 kg', 24, 'zak', 70000, 1],
  ['05.08.01', '5.1.02.01.01.0012', 'Pengerjaan Partisi Ruangan', 1, 'paket', 11500000, 1],
  ['05.08.01', '5.1.02.02.01.0016', 'Tenaga Tukang-7 Jam/hari', 36, 'orang / hari', 175000, 0.3],
  ['05.08.02', '5.2.02.05.02.0001', 'Meja Siswa-Rangka Besi', 64, 'buah', 450000, 1],
  ['05.08.02', '5.2.02.05.02.0001', 'Kursi Siswa-Rangka Besi', 64, 'buah', 300000, 0],
  ['05.08.02', '5.2.02.05.02.0004', 'AC Split-Kap. 1,5 PK', 5, 'unit', 4500000, 0],
  ['05.08.03', '5.1.02.03.02.0121', 'Pemeliharaan Alat Pendingin-AC Split', 34, 'unit / tahun', 135000, 0.5],
  ['05.08.03', '5.1.02.01.01.0012', 'Service AC', 1, 'unit', 850000, 1],
  ['05.09.01', '5.2.02.10.01.0001', 'Komputer PC AIO', 5, 'unit', 12100000, 0.4],
  ['05.09.04', '5.2.02.06.01.0004', 'Printer Epson L3251', 3, 'unit', 3600000, 0],
  ['06.05.06', '5.1.02.01.01.0052', 'Konsumsi Makan dan Minum-Makan', 540, 'orang / kali', 30000, 0.3],
  ['06.05.08', '5.1.02.01.01.0012', 'Kertas HVS F4 75Gsm', 220, 'rim', 73000, 0.5],
  ['06.05.08', '5.1.02.01.01.0029', 'Tinta Printer-Tinta Printer Epson', 93, 'buah', 123000, 0.48],
  ['06.05.08', '5.1.02.01.01.0024', 'Spidol Whiteboard-Isi 12 Pcs', 48, 'dus', 110000, 0.17],
  ['06.05.09', '5.1.02.01.01.0030', 'Alat Pel-Panjang Gagang 120 Cm', 80, 'buah', 50000, 0],
  ['06.07.01', '5.1.02.02.01.0061', 'Tagihan Listrik-Golongan Tarif P-1 / TR, 6.600 Va S.D 200 Kva', 54246, 'kwh', 900, 0.447],
  ['06.07.05', '5.1.02.02.01.0063', 'Langganan Internet-Bandwith 200 Mbps, Dedicated Domestik', 12, 'bulan', 2077920, 0.5],
  ['06.07.09', '5.1.02.01.01.0012', 'Langganan Surat Kabar FAJAR MAKASSAR', 12, '/bulan', 120000, 0.5],
  ['07.05.01', '5.1.02.01.01.0012', 'Biaya Admin Transfer Antar Bank', 51, '/bulan', 2900, 0.647],
  ['07.05.01', '5.1.02.01.01.0027', 'Materai-10000', 100, 'lembar', 12000, 0.5],
  ['07.12.03', '5.1.02.02.01.0013', 'Tenaga Administrasi Perpustakaan', 12, 'orang / bulan', 1200000, 0.5],
  ['07.12.04', '5.1.02.02.01.0013', 'Tenaga Keamanan', 12, 'orang / bulan', 1500000, 0.5],
  ['07.12.04', '5.1.02.02.01.0013', 'Tenaga Kebersihan', 12, 'orang / bulan', 1100000, 0.5],
  ['08.04.01', '5.1.02.02.01.0003', 'Honorarium Panitia-Anggota', 40, 'orang / kegiatan', 200000, 1],
]

function sebar(jumlah, porsi1, i) {
  const t1 = Math.round(jumlah * porsi1)
  const b = Array(12).fill(0)
  const isi = (dari, sampai, nilai) => {
    const bulan = []
    for (let m = dari; m < sampai; m++) if ((m + i) % (porsi1 === 1 || porsi1 === 0 ? 2 : 1) === 0 || nilai < 500000) bulan.push(m)
    const pakai = bulan.length ? bulan : [dari]
    let sisa = nilai
    pakai.forEach((m, k) => { const n = k === pakai.length - 1 ? sisa : Math.round(nilai / pakai.length); b[m] += n; sisa -= n })
  }
  if (t1) isi(0, 6, t1)
  if (jumlah - t1) isi(6, 12, jumlah - t1)
  return b
}

const URAIAN = BARIS.map(([kode_kegiatan, kode_rekening, uraian, volume, satuan, harga, p], i) =>
  rapikanUraian({ id: 'c' + i, no: i + 1, kode_kegiatan, kode_rekening, uraian, volume, satuan, harga, bulan: sebar(volume * harga, p, i) }))

const TOTAL = URAIAN.reduce((s, u) => s + u.jumlah, 0)

export function versiContoh(tahun = 2026) {
  const r = ringkasVersi(URAIAN)
  return [
    { id: 'contoh-murni', tahun: Number(tahun), nama: 'Murni (Desember 2025)', jenis: 'murni', tanggal_dokumen: '31 Desember 2025', tanggal_dokumen_iso: '2025-12-31', berlaku: false, pagu: TOTAL, ...r },
    { id: 'contoh-perubahan', tahun: Number(tahun), nama: 'Perubahan (Juli 2026)', jenis: 'perubahan', tanggal_dokumen: '14 Juli 2026', tanggal_dokumen_iso: '2026-07-14', berlaku: true, pagu: TOTAL, ...r },
  ]
}

export function uraianContoh(id) {
  if (id === 'contoh-murni') return URAIAN.map((u, i) => ({ ...u, ...(i % 7 === 3 ? { volume: u.volume + 2, jumlah: u.jumlah + 2 * u.harga } : {}), ...(i % 11 === 5 ? { volume: Math.max(0, u.volume - 2), jumlah: u.jumlah - 2 * u.harga } : {}) }))
  return URAIAN.map((u) => ({ ...u }))
}

export function hargaContoh() {
  return [
    ['Konsumsi', 'Konsumsi Makan dan Minum-Makan (rapat)', 'orang / kali', 30000, '5.1.02.01.01.0052', 'konsumsi'],
    ['Konsumsi', 'Konsumsi Makan dan Minum-Makan (lomba/ekskul)', 'orang / kali', 25000, '5.1.02.01.01.0052', 'konsumsi'],
    ['Konsumsi', 'Konsumsi Makan dan Minum-Snack/Kudapan', 'orang / kali', 15000, '5.1.02.01.01.0052', 'konsumsi'],
    ['Transpor', 'Transportasi-Dalam Daerah', 'orang / hari', 50000, '5.1.02.04.01.0003', 'transpor'],
    ['Honor', 'Honorarium Narasumber-Pejabat Eselon II / S2', 'orang / jam', 700000, '5.1.02.02.01.0003', 'honor'],
    ['Jasa', 'Tenaga Tukang-7 Jam/hari', 'orang / hari', 175000, '5.1.02.02.01.0016', 'jasa'],
    ['Bahan Bangunan', 'Semen PC-Ukuran 40 kg', 'zak', 70000, '5.1.02.01.01.0001', 'barang'],
    ['ATK', 'Kertas HVS F4 75Gsm', 'rim', 73000, '5.1.02.01.01.0012', 'barang'],
    ['Administrasi', 'Biaya Admin Transfer Antar Bank', 'kali', 2900, '5.1.02.01.01.0012', 'administrasi'],
    ['Peralatan & Mesin', 'Komputer PC AIO', 'unit', 12100000, '5.2.02.10.01.0001', 'barang'],
    ['Buku', 'Interactive English SMP/MTs Kelas 3/IX', 'buku', 125000, '5.2.05.01.01.0002', 'barang'],
  ].map(([kelompok, nama_item, satuan, harga, kode_rekening, jenis], i) => ({
    id: 'h' + i, kode_item: `SH-${String(i + 1).padStart(4, '0')}`, kelompok, nama_item, spesifikasi: '', satuan, harga, jenis, kode_rekening,
    kategori: kode_rekening.startsWith('5.2.02') ? 'alat_mesin' : kode_rekening.startsWith('5.2.05') ? 'aset_lain' : 'operasional',
    pajak_bawaan: jenis === 'konsumsi' || jenis === 'jasa' ? 'PPh 23' : jenis === 'honor' ? 'PPh 21' : jenis === 'barang' ? 'PPN' : '', tahun: 2026, aktif: true, sumber: 'RKAS 2026 Perubahan',
    riwayat: [{ tahun: 2026, harga, tanggal: '2026-07-14' }],
  }))
}
