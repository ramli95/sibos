// Perhitungan laporan Fase 5: realisasi per SNP/komponen/kegiatan/rekening, Laporan Realisasi
// Penerimaan & Belanja bulanan (Permendagri 3/2023), laporan tahap I & tahunan (Juknis 2026),
// hasil pengadaan, dan baris bantu salin SIMAKDA.
// Realisasi = belanja berstatus Lunas pada bulan tanggal lunas (sama dengan Buku Kas Umum).
// Modul murni (tanpa DOM/Firestore) agar mudah diuji.
import { KOMPONEN_ARKAS, NAMA_KODE_ARKAS } from '@/config/kodeArkas'
import { KELOMPOK_BELANJA } from '@/config/laporan'
import { NAMA_REKENING } from '@/services/rkas'
import { kelompokRekening, tanggalRealisasi } from './belanja'
import { dariIso } from './format'

const jumlah = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)
export const bulanBelanja = (b) => { const d = dariIso(b.tgl_lunas || tanggalRealisasi(b)); return d ? d.getMonth() : null }
const bulanIso = (iso) => { const d = dariIso(iso); return d ? d.getMonth() : null }

/** Rentang bulan [dari, sampai] (0–11) untuk periode */
export function rentang(periode, nilai) {
  if (periode === 'bulan') return [Number(nilai), Number(nilai)]
  if (periode === 'tahap') return Number(nilai) === 2 ? [6, 11] : [0, 5]
  return [0, 11]
}
export const akhirBulanIso = (tahun, bulan) => `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(new Date(tahun, bulan + 1, 0).getDate()).padStart(2, '0')}`

/** Nama untuk kunci kelompok */
export function namaKunci(susunan, kode, nama) {
  if (susunan === 'snp') return nama?.kegiatan?.(kode) || NAMA_KODE_ARKAS[kode] || `SNP ${kode}`
  if (susunan === 'komponen') { const k = KOMPONEN_ARKAS[kode]; return k ? `${k.huruf}. ${k.nama}` : `Komponen ${kode}` }
  if (susunan === 'kegiatan') return nama?.kegiatan?.(kode) || NAMA_KODE_ARKAS[kode] || ''
  return nama?.rekening?.(kode) || NAMA_REKENING[kode] || ''
}

/** Kunci kelompok dari kode kegiatan/rekening */
export function kunciDari(susunan, x) {
  const seg = String(x.kode_kegiatan || '').split('.')
  if (susunan === 'snp') return seg[0] || '-'
  if (susunan === 'komponen') return seg[1] || '-'
  if (susunan === 'kegiatan') return x.kode_kegiatan || '-'
  return x.kode_rekening || '-'
}

/** Item belanja Lunas beserta bulan realisasinya */
export function itemLunas(belanja) {
  const out = []
  belanja.forEach((b) => {
    if (b.status !== 'lunas') return
    const m = bulanBelanja(b)
    if (m == null) return
    ;(b.item || []).forEach((i) => out.push({ ...i, bulan: m, id_belanja: b.id }))
  })
  return out
}

/**
 * Rekap anggaran vs realisasi.
 * Hasil baris: { kode, nama, anggaran, rencana (s.d. akhir periode), lalu (sebelum periode), kini (dalam periode), sd, sisa, persen, warna }
 */
export function rekapRealisasi({ uraian = [], belanja = [], susunan = 'snp', dari = 0, sampai = 11, nama }) {
  const peta = new Map()
  const ambil = (kode) => {
    if (!peta.has(kode)) peta.set(kode, { kode, nama: namaKunci(susunan, kode, nama), anggaran: 0, rencana: 0, lalu: 0, kini: 0 })
    return peta.get(kode)
  }
  uraian.forEach((u) => {
    const g = ambil(kunciDari(susunan, u))
    g.anggaran += u.jumlah || 0
    g.rencana += u.bulan ? jumlah(u.bulan.slice(0, sampai + 1), (x) => x) : (sampai >= 5 ? (u.tahap1 || 0) : 0) + (sampai >= 11 ? (u.tahap2 || 0) : 0)
  })
  itemLunas(belanja).forEach((i) => {
    if (i.bulan > sampai) return
    const g = ambil(kunciDari(susunan, i))
    if (i.bulan < dari) g.lalu += i.jumlah || 0
    else g.kini += i.jumlah || 0
  })
  const baris = [...peta.values()].map((g) => {
    const sd = g.lalu + g.kini
    return {
      ...g, sd, sisa: g.anggaran - sd, persen: g.anggaran ? (sd / g.anggaran) * 100 : 0,
      warna: susunan === 'komponen' ? KOMPONEN_ARKAS[g.kode]?.warna : null,
    }
  }).sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true }))
  const total = ['anggaran', 'rencana', 'lalu', 'kini', 'sd', 'sisa'].reduce((o, k) => ({ ...o, [k]: jumlah(baris, (r) => r[k]) }), {})
  total.persen = total.anggaran ? (total.sd / total.anggaran) * 100 : 0
  return { baris, total }
}

/** Realisasi per bulan (12) dari belanja Lunas */
export function realisasiPerBulan(belanja) {
  const r = Array(12).fill(0)
  itemLunas(belanja).forEach((i) => { r[i.bulan] += i.jumlah || 0 })
  return r
}

/** Rencana per bulan (12) dari uraian RKAS */
export function rencanaPerBulan(uraian) {
  const r = Array(12).fill(0)
  uraian.forEach((u) => {
    if (u.bulan) u.bulan.forEach((v, i) => { r[i] += v || 0 })
    else { r[0] += u.tahap1 || 0; r[6] += u.tahap2 || 0 }
  })
  return r
}

/* ---------------- Penerimaan (dari baris kas manual) ---------------- */

/** Penerimaan dana per bulan: { terima[12], saldoAwal } dari kas manual */
export function penerimaanDana(kas = []) {
  const terima = Array(12).fill(0)
  let saldoAwal = 0
  kas.forEach((k) => {
    const m = bulanIso(k.tanggal)
    if (k.jenis === 'saldo_awal') saldoAwal += Number(k.nilai) || 0
    else if (k.jenis === 'terima_dana' && m != null) terima[m] += Number(k.nilai) || 0
  })
  return { terima, saldoAwal }
}

/* ---------------- Laporan Realisasi Penerimaan & Belanja (Permendagri 3/2023) ---------------- */

/**
 * Baris laporan bulanan untuk bulan (0–11): pendapatan (Dana BOSP & sisa tahun lalu) lalu belanja
 * per kelompok (5.1.02 / 5.2.02 / 5.2.05) dan per rekening.
 * Setiap baris: { tingkat, kode, nama, anggaran, lalu, kini, sd, sisa, persen }
 */
export function laporanPemda({ uraian = [], belanja = [], kas = [], pagu = 0, bulan = 0, nama }) {
  const { terima, saldoAwal } = penerimaanDana(kas)
  const lalu = (arr) => jumlah(arr.slice(0, bulan), (x) => x)
  const pendapatan = [
    { tingkat: 1, kode: '4.3.1.01', nama: 'Penerimaan Dana BOSP Reguler', anggaran: pagu, lalu: lalu(terima), kini: terima[bulan] || 0 },
  ]
  if (saldoAwal) pendapatan.push({ tingkat: 1, kode: '6.1.01', nama: 'Sisa dana tahun anggaran sebelumnya', anggaran: saldoAwal, lalu: saldoAwal, kini: 0 })

  const rek = rekapRealisasi({ uraian, belanja, susunan: 'rekening', dari: bulan, sampai: bulan, nama })
  const belanjaBaris = []
  KELOMPOK_BELANJA.forEach((k) => {
    const anak = rek.baris.filter((r) => r.kode.startsWith(k.kode))
    if (!anak.length) return
    belanjaBaris.push({ tingkat: 1, kode: k.kode, nama: k.nama, ...['anggaran', 'lalu', 'kini'].reduce((o, x) => ({ ...o, [x]: jumlah(anak, (r) => r[x]) }), {}) })
    anak.forEach((r) => belanjaBaris.push({ tingkat: 2, kode: r.kode, nama: r.nama, anggaran: r.anggaran, lalu: r.lalu, kini: r.kini }))
  })
  // Rekening di luar kelompok baku
  const lain = rek.baris.filter((r) => !KELOMPOK_BELANJA.some((k) => r.kode.startsWith(k.kode)))
  lain.forEach((r) => belanjaBaris.push({ tingkat: 2, kode: r.kode, nama: r.nama, anggaran: r.anggaran, lalu: r.lalu, kini: r.kini }))

  const lengkapi = (r) => { const sd = r.lalu + r.kini; return { ...r, sd, sisa: r.anggaran - sd, persen: r.anggaran ? (sd / r.anggaran) * 100 : 0 } }
  const p = pendapatan.map(lengkapi)
  const b = belanjaBaris.map(lengkapi)
  const totP = ['anggaran', 'lalu', 'kini', 'sd'].reduce((o, k) => ({ ...o, [k]: jumlah(p, (r) => r[k]) }), {})
  const totB = ['anggaran', 'lalu', 'kini', 'sd'].reduce((o, k) => ({ ...o, [k]: jumlah(b.filter((r) => r.tingkat === 1 || !KELOMPOK_BELANJA.some((x) => r.kode.startsWith(x.kode))), (r) => r[k]) }), {})
  return {
    pendapatan: p, belanja: b, totalPendapatan: totP, totalBelanja: totB,
    sisaDana: totP.sd - totB.sd,
  }
}

/* ---------------- Tahap I & tahunan (Juknis 2026) ---------------- */

/**
 * Ringkasan tahap: penerimaan tahap I (Januari–Juni), realisasi s.d. 30 Juni dan s.d. hari ini,
 * persentase terhadap penerimaan tahap I, syarat minimal 50%.
 */
export function ringkasTahap({ belanja = [], kas = [], tahun }) {
  const { terima, saldoAwal } = penerimaanDana(kas)
  const real = realisasiPerBulan(belanja)
  const terimaI = jumlah(terima.slice(0, 6), (x) => x)
  const terimaII = jumlah(terima.slice(6), (x) => x)
  const realI = jumlah(real.slice(0, 6), (x) => x)
  const realII = jumlah(real.slice(6), (x) => x)
  const dasar = terimaI + saldoAwal
  return {
    tahun, saldoAwal, terimaI, terimaII, realI, realII,
    persenI: dasar ? (realI / dasar) * 100 : 0,
    persenSetahun: (dasar + terimaII) ? ((realI + realII) / (dasar + terimaII)) * 100 : 0,
    terima, real,
  }
}

/** Hasil penyelesaian pengadaan barang/jasa: belanja Lunas selain honor */
export function hasilPengadaan(belanja = []) {
  return belanja
    .filter((b) => b.status === 'lunas' && b.jenis !== 'honor')
    .map((b) => ({
      id: b.id, tanggal: b.tgl_lunas, nama_pekerjaan: b.nama_pekerjaan, penyedia: b.rekanan?.nama_usaha || '', npwp: b.rekanan?.npwp || '',
      cara: b.cara === 'siplah' ? `SIPLah${b.siplah?.mitra ? ' – ' + b.siplah.mitra : ''}` : 'Non-SIPLah',
      nomor_sp: b.nomor?.surat_pesanan || b.siplah?.nomor_sp || '', tgl_pesanan: b.tgl_pesanan || '', tgl_bast: b.tgl_terima || '', nomor_bast: b.nomor?.bast || b.siplah?.nomor_bast || '',
      nilai: b.total || 0, kategori: b.kategori,
    }))
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))
}

/* ---------------- Bantu salin SIMAKDA ---------------- */

/**
 * Satu baris per BNU (kegiatan + rekening) dari belanja Lunas pada bulan tertentu (null = setahun),
 * beserta pajak transaksi (dicantumkan pada baris pertama transaksi agar tidak terhitung ganda).
 * Penerimaan dana ikut bila sertakanPenerimaan.
 */
export function barisSimakda({ belanja = [], kas = [], bulan = null, sertakanPenerimaan = true }) {
  const out = []
  const cocokBulan = (iso) => bulan == null || bulanIso(iso) === Number(bulan)
  if (sertakanPenerimaan) {
    kas.filter((k) => ['terima_dana', 'saldo_awal', 'bunga', 'pajak_bunga'].includes(k.jenis) && cocokBulan(k.tanggal)).forEach((k) => out.push({
      id: `k-${k.id}`, tanggal: k.tanggal, bnu: k.bnu || '', jenis: k.jenis === 'pajak_bunga' ? 'Pengeluaran' : 'Penerimaan', kode_kegiatan: '', kode_rekening: k.jenis === 'terima_dana' ? '4.3.1.01' : '',
      uraian: k.uraian, penyedia: '', npwp: '', nilai: Number(k.nilai) || 0, PPN: 0, 'PPh 21': 0, 'PPh 22': 0, 'PPh 23': 0, 'PPh 4(2)': 0, cara_bayar: k.sumber || 'bank', no_bukti: '',
    }))
  }
  belanja.forEach((b) => {
    if (b.status !== 'lunas' || !cocokBulan(b.tgl_lunas)) return
    const pajak = {}
    ;(b.pajak || []).forEach((p) => { if (p.nilai && p.cara !== 'luar') pajak[p.jenis] = (pajak[p.jenis] || 0) + p.nilai })
    kelompokRekening(b.item || []).forEach((g, i) => out.push({
      id: `${b.id}|${g.kunci}`, tanggal: b.tgl_lunas, bnu: b.bnu?.[g.kunci] || '', jenis: 'Belanja', kode_kegiatan: g.kode_kegiatan, kode_rekening: g.kode_rekening,
      uraian: b.uraian_pembayaran || b.nama_pekerjaan, penyedia: b.jenis === 'honor' ? `${(b.penerima || []).length} penerima` : b.rekanan?.nama_usaha || '', npwp: b.jenis === 'honor' ? '' : b.rekanan?.npwp || '',
      nilai: g.jumlah, PPN: i === 0 ? pajak.PPN || 0 : 0, 'PPh 21': i === 0 ? pajak['PPh 21'] || 0 : 0, 'PPh 22': i === 0 ? pajak['PPh 22'] || 0 : 0,
      'PPh 23': i === 0 ? pajak['PPh 23'] || 0 : 0, 'PPh 4(2)': i === 0 ? pajak['PPh 4(2)'] || 0 : 0,
      cara_bayar: b.cara_bayar || 'bank', no_bukti: b.nomor?.kwitansi_kecil || b.nomor?.invoice || '', id_belanja: b.id,
    }))
  })
  const n = (s) => { const m = String(s || '').match(/(\d+)\s*$/); return m ? Number(m[1]) : 1e9 }
  return out.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || n(a.bnu) - n(b.bnu))
}

/** Tenggat & status penyampaian laporan untuk tahun anggaran */
export function daftarTenggat(tahun, hariIni = new Date()) {
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const t = (s) => new Date(`${s}T23:59:59`)
  const sisaHari = (s) => Math.ceil((t(s) - hariIni) / 86400000)
  const daftar = []
  for (let m = 0; m < 12; m++) {
    const y = m === 11 ? tahun + 1 : tahun
    const tg = iso(y, m === 11 ? 1 : m + 2, 5)
    daftar.push({ kunci: `bulan-${m}`, judul: `Laporan Pemda bulan ${m + 1}`, bulan: m, tanggal: tg, sisa: sisaHari(tg), jenis: 'bulanan' })
  }
  daftar.push({ kunci: 'tahap1', judul: 'Laporan realisasi Tahap I (ARKAS)', tanggal: iso(tahun, 7, 31), sisa: sisaHari(iso(tahun, 7, 31)), jenis: 'tahap1' })
  daftar.push({ kunci: 'tahunan', judul: 'Laporan realisasi tahunan (ARKAS)', tanggal: iso(tahun + 1, 1, 31), sisa: sisaHari(iso(tahun + 1, 1, 31)), jenis: 'tahunan' })
  return daftar
}

/* ---------------- Buku Subrincian Objek & rincian per rekening ---------------- */

// Objek belanja seperti cetakan ARKAS (Buku Subrincian Objek)
export const OBJEK_BELANJA = [
  { kunci: 'operasional', kode: '5.1.02.88.88.8888', nama: 'BELANJA BARANG DAN JASA BOS', ikon: 'ShoppingBag', warna: '#2563eb' },
  { kunci: 'alat_mesin', kode: '5.2.02.88.88.8888', nama: 'BELANJA MODAL PERALATAN DAN MESIN BOS', ikon: 'Cpu', warna: '#f97316' },
  { kunci: 'aset_lain', kode: '5.2.05.88.88.8888', nama: 'BELANJA MODAL ASET TETAP LAINNYA BOS', ikon: 'Library', warna: '#0d9488' },
]
const katKode = (kode) => (/^5\.2\.02/.test(kode) ? 'alat_mesin' : /^5\.2/.test(kode) ? 'aset_lain' : 'operasional')

/**
 * Baris buku per objek (kategori) atau per kode rekening rinci.
 * saring: { kategori } atau { rekening }. Periode bulan [dari, sampai] (0–11).
 * Hasil: { anggaran, saldoLalu, baris: [{ tanggal, bnu, uraian, realisasi, sisa }], total, sisa }
 */
export function bukuObjek({ uraian = [], belanja = [], kategori = null, rekening = null, dari = 0, sampai = 11 }) {
  const cocok = (kode) => (rekening ? kode === rekening : katKode(kode || '') === kategori)
  const anggaran = jumlah(uraian.filter((u) => cocok(u.kode_rekening)), (u) => u.jumlah)
  const semua = []
  belanja.forEach((b) => {
    if (b.status !== 'lunas' || !b.tgl_lunas) return
    const m = bulanIso(b.tgl_lunas)
    kelompokRekening(b.item || []).filter((g) => cocok(g.kode_rekening)).forEach((g) => semua.push({
      id: `${b.id}|${g.kunci}`, id_belanja: b.id, bulan: m, tanggal: b.tgl_lunas, bnu: b.bnu?.[g.kunci] || '',
      uraian: b.uraian_pembayaran || b.nama_pekerjaan || '', kode_kegiatan: g.kode_kegiatan, kode_rekening: g.kode_rekening,
      realisasi: g.jumlah, siplah: b.cara === 'siplah',
    }))
  })
  const n = (s) => { const x = String(s || '').match(/(\d+)\s*$/); return x ? Number(x[1]) : 1e9 }
  semua.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || n(a.bnu) - n(b.bnu))
  const saldoLalu = jumlah(semua.filter((r) => r.bulan < dari), (r) => r.realisasi)
  let sisa = anggaran - saldoLalu
  const baris = semua.filter((r) => r.bulan >= dari && r.bulan <= sampai).map((r) => { sisa -= r.realisasi; return { ...r, sisa } })
  const total = jumlah(baris, (r) => r.realisasi)
  return { anggaran, saldoLalu, baris, total, sisa: anggaran - saldoLalu - total }
}

/** Ringkasan semua kode rekening rinci: anggaran, realisasi s.d. akhir periode, sisa */
export function ringkasRekening({ uraian = [], belanja = [], sampai = 11, nama }) {
  const peta = new Map()
  const ambil = (k) => { if (!peta.has(k)) peta.set(k, { kode: k, nama: nama?.rekening?.(k) || NAMA_REKENING[k] || '', kategori: katKode(k), anggaran: 0, realisasi: 0, transaksi: 0 }); return peta.get(k) }
  uraian.forEach((u) => { ambil(u.kode_rekening).anggaran += u.jumlah || 0 })
  itemLunas(belanja).filter((i) => i.bulan <= sampai).forEach((i) => { const r = ambil(i.kode_rekening || '-'); r.realisasi += i.jumlah || 0 })
  belanja.filter((b) => b.status === 'lunas' && (bulanIso(b.tgl_lunas) ?? 99) <= sampai).forEach((b) => new Set((b.item || []).map((i) => i.kode_rekening)).forEach((k) => { if (peta.has(k)) peta.get(k).transaksi++ }))
  return [...peta.values()].map((r) => ({ ...r, sisa: r.anggaran - r.realisasi, persen: r.anggaran ? r.realisasi / r.anggaran : 0 })).sort((a, b) => a.kode.localeCompare(b.kode))
}

/* ---------------- Rekap transaksi SIPLah ---------------- */

/** Transaksi SIPLah (semua status) dalam rentang bulan tanggal realisasi */
export function rekapSiplah(belanja = [], { dari = 0, sampai = 11, hanyaLunas = false } = {}) {
  const baris = belanja.filter((b) => b.jenis !== 'honor' && b.cara === 'siplah' && (!hanyaLunas || b.status === 'lunas')).map((b) => {
    const t = tanggalRealisasi(b)
    const pajak = jumlah((b.pajak || []).filter((p) => p.cara !== 'luar'), (p) => p.nilai)
    return {
      id: b.id, tanggal: t, bulan: bulanIso(t), mitra: b.mitra_siplah || 'Tanpa mitra', penyedia: b.rekanan?.nama_usaha || '', npwp: b.rekanan?.npwp || '',
      pekerjaan: b.nama_pekerjaan || '', nomor_sp: b.siplah?.nomor_sp || '', nomor_bast: b.siplah?.nomor_bast || '', nomor_invoice: b.siplah?.nomor_invoice || '',
      bnu: Object.values(b.bnu || {}).filter(Boolean).join(', '), status: b.status, kategori: b.kategori, nilai: b.total || 0, pajak,
    }
  }).filter((r) => r.bulan != null && r.bulan >= dari && r.bulan <= sampai)
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))
  const peta = new Map()
  baris.forEach((r) => { if (!peta.has(r.mitra)) peta.set(r.mitra, { mitra: r.mitra, transaksi: 0, nilai: 0, pajak: 0, lunas: 0 }); const m = peta.get(r.mitra); m.transaksi++; m.nilai += r.nilai; m.pajak += r.pajak; if (r.status === 'lunas') m.lunas += r.nilai })
  return { baris, perMitra: [...peta.values()].sort((a, b) => b.nilai - a.nilai), total: jumlah(baris, (r) => r.nilai), pajak: jumlah(baris, (r) => r.pajak) }
}
