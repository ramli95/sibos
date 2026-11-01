// Papan Informasi Dana BOSP (Fase 7): ringkasan penerimaan, rencana & realisasi per komponen untuk
// poster papan pengumuman, tampilan Komite, dan halaman publik tanpa login.
// Dasar: prinsip transparan pengelolaan Dana BOSP (Permendikdasmen 8/2026 Pasal 2 huruf e) dan tugas
// kepala satuan pendidikan melayani pengaduan masyarakat (Pasal 64 ayat 2 huruf i).
// Modul murni (tanpa DOM/Firestore).
import { KOMPONEN_ARKAS } from '@/config/kodeArkas'
import { itemLunas, penerimaanDana } from './laporan'

const jumlah = (arr, f = (x) => x) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)

// Pilihan periode poster: [kunci, judul, dari, sampai]
export const PERIODE_INFO = [
  { kunci: 'tahap1', judul: 'Tahap I', ket: 'Januari – Juni', dari: 0, sampai: 5, ikon: 'Flag' },
  { kunci: 'tahap2', judul: 'Tahap II', ket: 'Juli – Desember', dari: 6, sampai: 11, ikon: 'Target' },
  { kunci: 'tahun', judul: 'Setahun', ket: 'Januari – Desember', dari: 0, sampai: 11, ikon: 'CalendarRange' },
]

/** Rencana bulanan satu uraian (12 angka) */
function bulanUraian(u) {
  if (u.bulan) return u.bulan.map((v) => Number(v) || 0)
  const r = Array(12).fill(0); r[0] = u.tahap1 || 0; r[6] = u.tahap2 || 0
  return r
}

/**
 * Ringkasan papan informasi.
 * Hasil: { periode, pagu, terima, saldoAwal, danaTersedia, realisasi, sisa, persen, komponen[], kategori{} }
 * - terima    : penerimaan Dana BOSP pada bulan-bulan periode
 * - saldoAwal : sisa tahun lalu (ikut bila periode mencakup Januari)
 * - realisasi : belanja Lunas pada periode
 * - komponen  : 12 komponen Juknis, rencana periode & realisasi periode
 */
export function ringkasInformasi({ uraian = [], belanja = [], kas = [], periode = 'tahap1' }) {
  const p = PERIODE_INFO.find((x) => x.kunci === periode) || PERIODE_INFO[0]
  const dalam = (m) => m >= p.dari && m <= p.sampai
  const { terima, saldoAwal } = penerimaanDana(kas)
  const terimaP = jumlah(terima.filter((_, i) => dalam(i)))
  const saldo = p.dari === 0 ? saldoAwal : 0
  // Untuk Tahap II, sisa Tahap I ikut menjadi dana tersedia
  const item = itemLunas(belanja)
  const realSebelum = jumlah(item.filter((i) => i.bulan < p.dari), (i) => i.jumlah)
  const terimaSebelum = jumlah(terima.filter((_, i) => i < p.dari))
  const sisaSebelum = p.dari > 0 ? saldoAwal + terimaSebelum - realSebelum : 0

  const peta = new Map(Object.entries(KOMPONEN_ARKAS).map(([kode, k]) => [kode, { kode, ...k, anggaran: 0, setahun: 0, realisasi: 0 }]))
  uraian.forEach((u) => {
    const kode = u.komponen || String(u.kode_kegiatan || '').split('.')[1] || '-'
    if (!peta.has(kode)) peta.set(kode, { kode, huruf: '-', nama: `Komponen ${kode}`, warna: '#64748b', anggaran: 0, setahun: 0, realisasi: 0 })
    const g = peta.get(kode)
    g.setahun += u.jumlah || 0
    g.anggaran += jumlah(bulanUraian(u).filter((_, i) => dalam(i)))
  })
  const kategori = { operasional: 0, alat_mesin: 0, aset_lain: 0 }
  item.filter((i) => dalam(i.bulan)).forEach((i) => {
    const kode = String(i.kode_kegiatan || '').split('.')[1] || '-'
    if (!peta.has(kode)) peta.set(kode, { kode, huruf: '-', nama: `Komponen ${kode}`, warna: '#64748b', anggaran: 0, setahun: 0, realisasi: 0 })
    peta.get(kode).realisasi += i.jumlah || 0
    kategori[i.kategori] = (kategori[i.kategori] || 0) + (i.jumlah || 0)
  })
  const komponen = [...peta.values()]
    .map((g) => ({ ...g, persen: g.anggaran ? (g.realisasi / g.anggaran) * 100 : 0 }))
    .sort((a, b) => a.kode.localeCompare(b.kode))
  const realisasi = jumlah(komponen, (g) => g.realisasi)
  const danaTersedia = saldo + terimaP + sisaSebelum
  return {
    periode: p, pagu: jumlah(uraian, (u) => u.jumlah), anggaranPeriode: jumlah(komponen, (g) => g.anggaran),
    terima: terimaP, saldoAwal: saldo, sisaSebelum, danaTersedia, realisasi, sisa: danaTersedia - realisasi,
    persen: danaTersedia ? (realisasi / danaTersedia) * 100 : 0, komponen, kategori,
  }
}

/** Belanja Lunas terbaru dalam periode (untuk Komite) */
export function belanjaTerbaru(belanja = [], periode = 'tahap1', n = 8) {
  const p = PERIODE_INFO.find((x) => x.kunci === periode) || PERIODE_INFO[0]
  return belanja
    .filter((b) => b.status === 'lunas' && b.tgl_lunas)
    .filter((b) => { const m = Number(String(b.tgl_lunas).slice(5, 7)) - 1; return m >= p.dari && m <= p.sampai })
    .sort((a, b) => String(b.tgl_lunas).localeCompare(String(a.tgl_lunas)))
    .slice(0, n)
    .map((b) => ({ id: b.id, tanggal: b.tgl_lunas, pekerjaan: b.nama_pekerjaan, nilai: b.total || 0, siplah: b.cara === 'siplah', honor: b.jenis === 'honor' }))
}

/**
 * Data yang diterbitkan ke halaman publik (tanpa login). Hanya angka ringkasan — tanpa nama penerima,
 * rekening, NIP, atau rincian transaksi.
 */
export function dataPublik({ r, tahun, profil, kepsek, kontak = '' }) {
  return {
    tahun: Number(tahun), periode: r.periode.kunci, judul_periode: `${r.periode.judul} (${r.periode.ket})`,
    sekolah: { nama: profil?.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR', npsn: profil?.npsn || '', alamat: profil?.alamat || '' },
    pagu: r.pagu, anggaran_periode: r.anggaranPeriode, terima: r.terima, saldo_awal: r.saldoAwal, sisa_sebelum: r.sisaSebelum,
    dana_tersedia: r.danaTersedia, realisasi: r.realisasi, sisa: r.sisa,
    komponen: r.komponen.filter((g) => g.anggaran || g.realisasi).map((g) => ({ kode: g.kode, huruf: g.huruf, nama: g.nama, warna: g.warna, anggaran: g.anggaran, realisasi: g.realisasi })),
    kategori: r.kategori, kepala_sekolah: kepsek ? kepsek.nama + (kepsek.gelar ? ', ' + kepsek.gelar : '') : '', kontak,
  }
}
