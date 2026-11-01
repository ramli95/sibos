// Berita Acara Serah Terima Bendahara Dana BOSP (Fase 7): keadaan keuangan per tanggal serah terima.
// Modul murni: saldo bank & tunai menurut BKU, pajak dipungut/dipotong yang belum disetor, transaksi
// belum lunas dan belum lengkap, serta daftar arsip yang diserahkan.
import { saldoSampai } from './bku'
import { kelengkapan, persenLengkap, tanggalRealisasi } from './belanja'
import { penerimaanDana } from './laporan'
import { luarBku } from './pajak'

const jumlah = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)

// Arsip bawaan yang diserahkan (bisa diubah, dicentang, diberi jumlah/keterangan)
export const ARSIP_BAWAAN = [
  { nama: 'Buku Kas Umum, Buku Pembantu Bank, Kas Tunai, dan Pajak (tercetak & ditandatangani)', jumlah: '1 bundel' },
  { nama: 'Dokumen RKAS (Murni, Pergeseran, Perubahan) yang telah disahkan', jumlah: '1 bundel' },
  { nama: 'Bukti pertanggungjawaban (SPJ): kwitansi, nota, faktur, BAST, foto kegiatan', jumlah: 'per bulan' },
  { nama: 'Rekening koran / buku tabungan rekening Dana BOSP', jumlah: '' },
  { nama: 'Bukti setor pajak (BPN/NTPN) dan bukti potong', jumlah: '' },
  { nama: 'Laporan Pemda bulanan, SPTJM, dan Rekap Pembelian BMD', jumlah: '' },
  { nama: 'Laporan realisasi ARKAS (Tahap I / tahunan) dan bukti unggah', jumlah: '' },
  { nama: 'Kartu Inventaris Barang (KIB) dan BAST Pengurus Barang', jumlah: '' },
  { nama: 'Akses aplikasi: ARKAS, SIMAKDA, SIPLah, dan SIBOS (akun Admin dipindahkan)', jumlah: '' },
  { nama: 'Stempel bendahara, kartu ATM/token perbankan (bila ada)', jumlah: '' },
]

/**
 * Keadaan per tanggal (iso). opsi: { baris (BKU), kewajiban (pajak), belanja, kas, uraian, pagu }
 * Hasil: { saldoBank, saldoTunai, saldo, terima, saldoAwal, realisasi, pagu, pajak[], totalPajak,
 *          belumLunas[], totalBelumLunas, belumLengkap[] }
 */
export function keadaanSerahTerima({ tanggal, baris = [], kewajiban = [], belanja = [], kas = [], uraian = [], pagu = 0 }) {
  const saldoBank = saldoSampai(baris, tanggal, 'bank')
  const saldoTunai = saldoSampai(baris, tanggal, 'tunai')
  const { saldoAwal } = penerimaanDana(kas)
  const terima = jumlah(kas.filter((k) => k.jenis === 'terima_dana' && k.tanggal <= tanggal), (k) => k.nilai)
  const realisasi = jumlah(belanja.filter((b) => b.status === 'lunas' && b.tgl_lunas && b.tgl_lunas <= tanggal).flatMap((b) => b.item || []), (i) => i.jumlah)

  // Pajak sudah dipungut/dipotong (tanggal lunas ≤ tanggal) tetapi belum disetor per tanggal itu
  const pajak = kewajiban
    .filter((p) => !luarBku(p) && p.tgl_pungut && p.tgl_pungut <= tanggal && (p.status === 'terutang' || (p.tgl_setor && p.tgl_setor > tanggal)))
    .map((p) => ({ id: p.id, tanggal: p.tgl_pungut, jenis: p.jenis, uraian: p.uraian, pihak: p.pihak, nilai: p.nilai, bnu: p.bnu }))

  // Transaksi sudah berjalan (dipesan/diterima) per tanggal tetapi belum lunas per tanggal itu
  const belumLunas = belanja
    .filter((b) => { const t = tanggalRealisasi(b) || b.tgl_pesanan || ''; return t && t <= tanggal && (b.status !== 'lunas' || (b.tgl_lunas && b.tgl_lunas > tanggal)) })
    .map((b) => ({ id: b.id, tanggal: b.tgl_pesanan || tanggalRealisasi(b), uraian: b.nama_pekerjaan, pihak: b.jenis === 'honor' ? `${(b.penerima || []).length} penerima` : b.rekanan?.nama_usaha || '', status: b.status === 'lunas' ? 'dibayar setelah tanggal ini' : b.status, nilai: b.total || 0 }))
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))

  // Transaksi lunas yang kelengkapan SPJ-nya belum 100%
  const belumLengkap = belanja
    .filter((b) => b.status === 'lunas' && b.tgl_lunas && b.tgl_lunas <= tanggal)
    .map((b) => { const c = kelengkapan(b); return { id: b.id, tanggal: b.tgl_lunas, uraian: b.nama_pekerjaan, nilai: b.total || 0, persen: b.persen_lengkap ?? persenLengkap(c), kurang: c.filter((x) => !x.ok).map((x) => x.judul) } })
    .filter((x) => x.persen < 100)
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))

  return {
    saldoBank, saldoTunai, saldo: saldoBank + saldoTunai, terima, saldoAwal, realisasi, pagu: pagu || jumlah(uraian, (u) => u.jumlah),
    pajak, totalPajak: jumlah(pajak, (p) => p.nilai), belumLunas, totalBelumLunas: jumlah(belumLunas, (b) => b.nilai), belumLengkap,
  }
}

/** Nama lengkap orang (pegawai/pejabat) dengan gelar */
export const namaGelar = (p) => (p ? [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? `, ${p.gelar}` : '') : '')
