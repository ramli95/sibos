// Perhitungan belanja: kaitan ke uraian RKAS, status, urutan tanggal, perkiraan pajak, PPh 21 honor,
// pengelompokan kode rekening (kwitansi besar) dan kelengkapan dokumen.
import { DOKUMEN_WAJIB, DOKUMEN_SIPLAH, JENIS_HONOR } from '@/config/belanja'
import { kategoriRekening } from './arkas'
import { hitungPajak, pph21Penerima } from './pajak'

/** Salinan data biasa (aman untuk objek reaktif Vue) */
export const salin = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))

const jumlah = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)
const rapi = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/* ---------------- Kaitan item ↔ uraian RKAS ----------------
   Id uraian RKAS berubah setiap impor versi baru, jadi item dikaitkan dengan
   kode kegiatan + kode rekening + teks uraian (lalu harga bila teks sama). */
export const kunciUraian = (x) => `${x.kode_kegiatan}|${x.kode_rekening}|${rapi(x.uraian_rkas ?? x.uraian)}`

export function cariUraian(item, daftar) {
  if (!item?.kode_kegiatan || !item?.kode_rekening) return null
  const k = kunciUraian(item)
  const sama = daftar.filter((u) => kunciUraian(u) === k)
  if (sama.length) return sama.find((u) => u.harga === item.harga_rkas) || sama[0]
  return null
}

/** Usulan uraian RKAS untuk item Standar Harga: rekening sama, nama paling mirip */
export function usulanUraian(nama, kodeRekening, daftar) {
  const kata = String(nama || '').toLowerCase().split(/[^a-z0-9]+/).filter((k) => k.length > 2)
  const skor = (u) => {
    const t = u.uraian.toLowerCase()
    return kata.reduce((s, k) => s + (t.includes(k) ? 2 : 0), 0) + (kodeRekening && u.kode_rekening === kodeRekening ? 3 : 0)
  }
  return daftar.map((u) => ({ u, s: skor(u) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.u)
}

/* ---------------- Item & total ---------------- */

/** Nama item jasa selalu diawali kata "Jasa" */
export function rapikanNamaItem(nama, jenis) {
  const n = String(nama || '').trim()
  if (jenis === 'jasa' && n && !/^jasa\b/i.test(n)) return `Jasa ${n.charAt(0).toLowerCase() + n.slice(1)}`
  return n
}

export function rapikanItem(it) {
  const volume = Number(it.volume) || 0
  const harga = Math.round(Number(it.harga) || 0)
  return {
    id: it.id || Math.random().toString(36).slice(2, 9),
    id_harga: it.id_harga || null,
    nama: rapikanNamaItem(it.nama, it.jenis),
    spesifikasi: String(it.spesifikasi || '').trim(),
    jenis: it.jenis || 'barang',
    volume, satuan: String(it.satuan || '').trim(), harga, jumlah: Math.round(volume * harga),
    harga_penawaran: Math.round(Number(it.harga_penawaran) || harga),
    harga_ssh: Math.round(Number(it.harga_ssh) || 0),
    kode_kegiatan: it.kode_kegiatan || '', kode_rekening: it.kode_rekening || '',
    uraian_rkas: it.uraian_rkas || '', harga_rkas: Math.round(Number(it.harga_rkas) || 0),
    kategori: it.kategori || kategoriRekening(it.kode_rekening || ''),
  }
}

export const totalItem = (item = []) => jumlah(item, (i) => i.jumlah)

/** Kategori transaksi: dari item terbanyak nilainya */
export function kategoriBelanja(item = []) {
  const per = {}
  item.forEach((i) => { per[i.kategori] = (per[i.kategori] || 0) + i.jumlah })
  return Object.entries(per).sort((a, b) => b[1] - a[1])[0]?.[0] || 'operasional'
}

/** Kelompok per kode kegiatan + rekening (dasar kwitansi besar & BNU) */
export function kelompokRekening(item = []) {
  const peta = new Map()
  item.forEach((i) => {
    const k = `${i.kode_kegiatan} ${i.kode_rekening}`.trim()
    if (!peta.has(k)) peta.set(k, { kunci: k, kode_kegiatan: i.kode_kegiatan, kode_rekening: i.kode_rekening, kategori: i.kategori, jumlah: 0, item: [] })
    const g = peta.get(k)
    g.jumlah += i.jumlah
    g.item.push(i)
  })
  return [...peta.values()]
}

/* ---------------- Status & tanggal ---------------- */

export const URUTAN_TANGGAL = [
  ['tgl_pesanan', 'Tanggal pesanan'], ['tgl_terima', 'Tanggal pemeriksaan & serah terima (BAST)'], ['tgl_proforma', 'Tanggal proforma'],
  ['tgl_invoice', 'Tanggal invoice'], ['tgl_lunas', 'Tanggal lunas bayar'], ['tgl_kwitansi', 'Tanggal kwitansi'],
]

/** Urutan dikunci: pesanan ≤ BAST ≤ proforma ≤ invoice ≤ lunas ≤ kwitansi. Hasil: daftar pesan galat */
export function periksaUrutanTanggal(b) {
  const galat = []
  let sebelum = null
  URUTAN_TANGGAL.forEach(([k, label]) => {
    const v = b[k]
    if (!v) return
    if (sebelum && v < sebelum.v) galat.push(`${label} tidak boleh sebelum ${sebelum.label.toLowerCase()}.`)
    sebelum = { v, label }
  })
  return galat
}

/** Status otomatis dari tanggal yang terisi */
export function statusBelanja(b) {
  if (b.jenis === 'honor') return b.tgl_lunas ? 'lunas' : b.tgl_kegiatan ? 'dipesan' : 'draf'
  if (b.tgl_lunas) return 'lunas'
  if (b.tgl_terima) return 'diterima'
  if (b.tgl_pesanan) return 'dipesan'
  return 'draf'
}

/** Tanggal realisasi (bulan masuk RKAS): lunas → kwitansi → terima → pesanan */
export const tanggalRealisasi = (b) => b.tgl_lunas || b.tgl_kwitansi || (b.jenis === 'honor' ? b.tgl_kegiatan : b.tgl_terima) || b.tgl_pesanan || ''

/* ---------------- Pajak (dari tabel aturan — lihat utils/pajak.js) ---------------- */

/** Pajak per transaksi menurut aturan aktif (Pajak → Aturan Tarif) */
export const perkiraanPajak = (b) => hitungPajak(b)

/** Tarif PPh 21 seorang penerima (bruto dipakai untuk batas PTKP) */
export const tarifPph21 = (p, jenis, bruto = Math.round((Number(p.besaran) || 0) * (Number(p.volume) || 0))) => pph21Penerima(p, jenis, bruto).tarif

export function rapikanPenerima(p, jenis) {
  const besaran = Math.round(Number(p.besaran) || 0)
  const volume = Number(p.volume) || 0
  const bruto = Math.round(besaran * volume)
  const otomatis = pph21Penerima({ ...p, sumber: p.sumber || 'pegawai' }, jenis, bruto)
  // Tarif manual hanya bila ditandai (pph21_manual); data lama tanpa tanda dihitung ulang menurut aturan
  const manual = !!p.pph21_manual && !(p.tarif_pph21 === '' || p.tarif_pph21 == null)
  const tarif = manual ? Number(p.tarif_pph21) || 0 : otomatis.tarif
  const pph21 = manual ? Math.round(bruto * tarif / 100) : otomatis.nilai
  return {
    sumber: p.sumber || 'pegawai', id: p.id || null, nama: String(p.nama || '').trim(), nip: p.nip || '', golongan: p.golongan || '',
    jabatan: p.jabatan || '', status_kepegawaian: p.status_kepegawaian || '', npwp: p.npwp || '', instansi: p.instansi || '',
    besaran, volume, satuan: p.satuan || '', hari: Number(p.hari) || 1, bruto,
    kategori_pph21: p.kategori_pph21 || '', kategori_pph21_hasil: otomatis.kategori, ptkp: p.ptkp || '', gaji_bruto: Math.round(Number(p.gaji_bruto) || 0),
    tarif_pph21: manual ? tarif : '', pph21_manual: manual, tarif_efektif: tarif, alasan_pph21: manual ? 'Diisi manual' : otomatis.alasan, pph21, diterima: bruto - pph21,
  }
}

/** Syarat honor bulanan Pasal 43 Juknis BOSP (komponen pembayaran honor) */
export function syaratHonor(p) {
  if (!p || p.sumber === 'luar') return []
  const guru = /guru/i.test(p.jabatan || '')
  const asn = ['PNS', 'PPPK'].includes(String(p.status_kepegawaian || '').toUpperCase())
  const daftar = [{ syarat: 'Bukan ASN', ok: !asn }]
  if (guru) {
    daftar.push({ syarat: 'Tercatat di Dapodik', ok: !!p.status_dapodik && !/tidak|belum/i.test(String(p.status_dapodik)) })
    daftar.push({ syarat: 'Memiliki NUPTK', ok: !!p.nuptk })
    daftar.push({ syarat: 'Belum menerima TPG', ok: !p.terima_tpg })
  } else {
    daftar.push({ syarat: 'Ada SK/surat penugasan Kepala Sekolah', ok: !!p.sk_penugasan })
  }
  return daftar
}

/** Uraian RKAS komponen pembayaran honor (komponen 12 / rekening ...0013) */
export const uraianHonorBulanan = (u) => !!u && (u.komponen === '12' || String(u.kode_rekening || '').endsWith('.0013'))

/* ---------------- Dokumen & kelengkapan ---------------- */

/** Daftar dokumen yang dibuat untuk satu transaksi (sesuai pilihan) */
export function dokumenTransaksi(b) {
  if (b.jenis === 'honor') {
    const d = { ...Object.fromEntries((JENIS_HONOR[b.jenis_honor]?.dokumen || []).map((k) => [k, true])), ...(b.dokumen || {}) }
    return ['sampul', 'kwitansi_besar', ...Object.keys(d).filter((k) => d[k] && !['sampul', 'kwitansi_besar'].includes(k))]
  }
  if (b.cara === 'siplah') return ['sampul', 'kwitansi_besar', ...['foto', 'daftar_hadir', 'penerima_konsumsi', 'notulen'].filter((k) => b.dokumen?.[k])]
  const pilih = Object.keys(b.dokumen || {}).filter((k) => b.dokumen[k])
  return [...new Set([...DOKUMEN_WAJIB, ...pilih])]
}

/** Daftar periksa kelengkapan. foto = jumlah foto, arsip = { kunci: [berkas] } */
export function kelengkapan(b, { foto = b.jumlah_foto || 0 } = {}) {
  const dok = dokumenTransaksi(b)
  const arsip = b.arsip || {}
  const ada = (k) => (arsip[k] || []).length > 0
  const c = []
  const bnuKosong = kelompokRekening(b.item || []).filter((g) => !b.bnu?.[g.kunci]).length
  c.push({ kunci: 'item', judul: b.jenis === 'honor' ? 'Penerima & besaran' : 'Item & uraian RKAS', ok: (b.item || []).length > 0 && (b.item || []).every((i) => i.kode_rekening) })
  if (b.jenis !== 'honor') c.push({ kunci: 'penyedia', judul: 'Penyedia/rekanan', ok: !!b.rekanan?.nama_usaha })
  c.push({ kunci: 'tanggal', judul: 'Tanggal lengkap & berurutan', ok: !!b.tgl_lunas && !periksaUrutanTanggal(b).length })
  c.push({ kunci: 'bnu', judul: 'Nomor Buku Kas (BNU ARKAS)', ok: (b.item || []).length > 0 && bnuKosong === 0 })
  if (b.cara === 'siplah') {
    const kurang = DOKUMEN_SIPLAH.filter((d) => !(b.siplah?.berkas?.[d.kunci])).length
    c.push({ kunci: 'siplah', judul: 'PDF dokumen mitra SIPLah', ok: kurang === 0, ket: kurang ? `${kurang} belum diunggah` : '' })
  }
  if (dok.includes('foto')) c.push({ kunci: 'foto', judul: 'Foto dokumentasi', ok: foto > 0, ket: foto ? `${foto} foto` : '' })
  c.push({ kunci: 'paket_ttd', judul: 'Paket SPJ bertanda tangan diunggah', ok: ada('paket_ttd') })
  if (b.jenis !== 'honor' && b.cara !== 'siplah' && !dok.includes('kwitansi_kecil')) c.push({ kunci: 'nota_asli', judul: 'Nota/kuitansi asli toko diunggah', ok: ada('nota_asli') })
  return c
}

export const persenLengkap = (c) => (c.length ? Math.round((c.filter((x) => x.ok).length / c.length) * 100) : 0)

/** Singkatan rekanan untuk nomor invoice: "Toko Sejuk Jaya" → "TSJ" */
export function singkatan(nama) {
  const k = String(nama || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  return (k.length > 1 ? k.map((x) => x[0]).join('') : (k[0] || 'REK').slice(0, 4)).toUpperCase().slice(0, 6)
}

/** Isi pola nomor */
export function isiPola(pola, { urut, tanggal, rekanan }) {
  const d = tanggal ? new Date(tanggal + 'T00:00:00') : new Date()
  const bulan = d.getMonth() + 1
  const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  return String(pola)
    .replaceAll('{urut3}', String(urut).padStart(3, '0'))
    .replaceAll('{urut}', String(urut))
    .replaceAll('{romawi}', R[bulan - 1])
    .replaceAll('{bulan}', String(bulan).padStart(2, '0'))
    .replaceAll('{tahun}', String(d.getFullYear()))
    .replaceAll('{rekanan}', singkatan(rekanan))
}
