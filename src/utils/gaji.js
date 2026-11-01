// Perhitungan gaji ASN, KGB, dan penghasilan Honorer (Fase 6).
import { ATURAN_GAJI_AWAL, tunjanganBawaan, tarifPphTpg, KOMPONEN_PENGHASILAN, KOMPONEN_POTONGAN } from '@/config/gaji'
import { gajiPokokTabel, mkgBerikut } from '@/config/tabelGaji'
import { tanggalRealisasi } from './belanja'

const bulat = (n) => Math.round(Number(n) || 0)
export const asn = (p) => ['PNS', 'PPPK'].includes(p?.status_kepegawaian)

/**
 * Dasar gaji lengkap seorang pegawai: data tersimpan di gaji_dasar/{id} ditambah bawaan dari Data Pegawai.
 * Field yang kosong di gaji_dasar diisi otomatis (golongan & MKG → tabel, status keluarga → tunjangan).
 */
export function dasarGaji(p, d = {}) {
  const kawin = /^kawin$/i.test(String(p.status_kawin || ''))
  const anak = Math.max(0, Number(p.anak) || 0)
  const mkg = d.mkg ?? ''
  const tabel = asn(p) && mkg !== '' ? gajiPokokTabel(p.status_kepegawaian, p.golongan, mkg) : null
  const ada = (k) => d[k] !== undefined && d[k] !== null && d[k] !== ''
  return {
    id_pegawai: p.id,
    status: p.status_kepegawaian,
    golongan: p.golongan || '',
    mkg,
    mkg_bulan: d.mkg_bulan ?? 0,
    gaji_pokok: ada('gaji_pokok') ? Number(d.gaji_pokok) : tabel?.gaji_pokok ?? 0,
    gaji_pokok_tabel: tabel?.gaji_pokok ?? null,
    tunj_pasangan: ada('tunj_pasangan') ? !!d.tunj_pasangan : kawin,
    anak_tunjangan: ada('anak_tunjangan') ? Number(d.anak_tunjangan) : Math.min(anak, ATURAN_GAJI_AWAL.anak_maks),
    jiwa_beras: ada('jiwa_beras') ? Number(d.jiwa_beras) : Number(p.jiwa) || 1 + (kawin ? 1 : 0) + Math.min(anak, 2),
    tj_fungsional: ada('tj_fungsional') ? Number(d.tj_fungsional) : (asn(p) ? tunjanganBawaan(p) : 0),
    tj_pph: Number(d.tj_pph) || 0,
    taperum: Number(d.taperum) || 0,
    potongan_lain: Number(d.potongan_lain) || 0,
    ket_potongan_lain: d.ket_potongan_lain || '',
    tj_kinerja: Number(d.tj_kinerja) || 0,
    tarif_pph_tpg: ada('tarif_pph_tpg') ? Number(d.tarif_pph_tpg) : tarifPphTpg(p),
    terima_tpg: !!p.terima_tpg,
    tmt_tugas: d.tmt_tugas || '',
    tersimpan: !!d.diperbarui,
  }
}

/** Komponen gaji satu bulan dari dasar gaji (dibulatkan per komponen ke rupiah) */
export function hitungGaji(g, aturan = ATURAN_GAJI_AWAL) {
  const a = { ...ATURAN_GAJI_AWAL, ...aturan }
  const gp = bulat(g.gaji_pokok)
  const tj_istri = g.tunj_pasangan ? bulat(gp * a.istri / 100) : 0
  const tj_anak = bulat(gp * a.anak / 100 * Math.min(Number(g.anak_tunjangan) || 0, a.anak_maks))
  const tk = tj_istri + tj_anak
  const tj_fungsional = bulat(g.tj_fungsional)
  const tj_beras = bulat((Number(g.jiwa_beras) || 0) * a.kg_per_jiwa * a.harga_beras)
  const tj_pph = bulat(g.tj_pph)
  const dasarBpjs = gp + tk + tj_fungsional
  const bpjs = bulat(dasarBpjs * a.bpjs / 100)
  const jkk = bulat(gp * a.jkk / 100)
  const jkm = bulat(gp * a.jkm / 100)
  const pns = g.status === 'PNS'
  const pot = {
    pot_pph: tj_pph,
    pot_bpjs: bpjs,
    pot_iwp1: bulat(dasarBpjs * a.iwp1 / 100),
    pot_iwp8: bulat((gp + tk) * (pns ? a.iwp8 : a.jht_pppk) / 100),
    pot_taperum: bulat(g.taperum),
    pot_jkk: jkk,
    pot_jkm: jkm,
    pot_lain: bulat(g.potongan_lain),
  }
  const potongan = Object.values(pot).reduce((s, x) => s + x, 0)
  const kotorAwal = gp + tk + tj_fungsional + tj_beras + tj_pph + bpjs + jkk + jkm
  const bersihAwal = kotorAwal - potongan
  const pembulatan = a.bulat > 1 ? Math.ceil(bersihAwal / a.bulat) * a.bulat - bersihAwal : 0
  const kotor = kotorAwal + pembulatan
  const tpg = g.terima_tpg ? bulat(gp - gp * (Number(g.tarif_pph_tpg) || 0) / 100) : 0
  return {
    gaji_pokok: gp, tj_istri, tj_anak, tj_fungsional, tj_beras, tj_pph, bpjs, jkk, jkm, pembulatan, kotor,
    ...pot, potongan, bersih: kotor - potongan,
    label_iwp8: pns ? 'Iuran Wajib 8%' : 'Jam. Hari Tua/JHT',
    tj_kinerja: bulat(g.tj_kinerja), tj_profesi: tpg, seluruhnya: kotor - potongan + bulat(g.tj_kinerja) + tpg,
  }
}

/** Jumlah per komponen untuk banyak baris */
export function jumlahKomponen(daftar) {
  const kunci = [...KOMPONEN_PENGHASILAN, ...KOMPONEN_POTONGAN].map((k) => k.kunci).concat(['kotor', 'potongan', 'bersih'])
  return Object.fromEntries(kunci.map((k) => [k, daftar.reduce((s, x) => s + (Number(x[k]) || 0), 0)]))
}

/* ---------------- Perbandingan dengan Daftar Gaji resmi ---------------- */

/** Selisih komponen hitungan SIBOS vs resmi (hanya komponen yang ada di data resmi) */
export function selisih(hitung, resmi) {
  if (!resmi) return []
  return Object.keys(resmi).filter((k) => typeof resmi[k] === 'number' && k in hitung && Math.abs((hitung[k] || 0) - resmi[k]) > 1)
    .map((k) => ({ kunci: k, hitung: hitung[k] || 0, resmi: resmi[k], beda: (hitung[k] || 0) - resmi[k] }))
}

/** Angka yang dipakai SKPG: resmi bila ada (komponen yang ada saja), sisanya hitungan SIBOS */
export function angkaSkpg(hitung, resmi) {
  if (!resmi) return { ...hitung, sumber: 'hitung' }
  const x = { ...hitung }
  Object.keys(resmi).forEach((k) => { if (typeof resmi[k] === 'number' && k in x) x[k] = resmi[k] })
  x.seluruhnya = x.bersih + (x.tj_kinerja || 0) + (x.tj_profesi || 0)
  return { ...x, sumber: 'resmi' }
}

/* ---------------- KGB ---------------- */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function tambahTahun(t, n) {
  if (!t) return ''
  const d = new Date(t + 'T00:00:00')
  d.setFullYear(d.getFullYear() + n)
  return iso(d)
}
export function selisihHari(dari, ke) {
  if (!dari || !ke) return null
  return Math.round((new Date(ke + 'T00:00:00') - new Date(dari + 'T00:00:00')) / 864e5)
}
export const hariIni = () => iso(new Date())

/** Rincian KGB seorang ASN: jatuh tempo (TMT terakhir + 2 tahun), sisa hari, gaji pokok baru menurut tabel */
export function infoKgb(p, g, hari = hariIni()) {
  const jatuh = tambahTahun(p.tmt_kgb_terakhir, 2)
  const sisa = jatuh ? selisihHari(hari, jatuh) : null
  const mkgBaru = g?.mkg !== '' && g?.mkg != null ? Number(g.mkg) + 2 : null
  const tabelBaru = mkgBaru != null ? (mkgBerikut(p.status_kepegawaian, p.golongan, Number(g.mkg) + 1) || null) : null
  return { jatuh_tempo: jatuh, sisa, mkg_baru: tabelBaru?.mkg ?? mkgBaru, gaji_pokok_baru: tabelBaru?.gaji_pokok ?? null, gaji_pokok_lama: g?.gaji_pokok || 0 }
}

/* ---------------- Honorer (dari menu Honor & Transpor) ---------------- */

/**
 * Penghasilan honor bulanan seorang pegawai pada bulan tertentu ('yyyy-mm'),
 * dari transaksi honor (bukan transpor kegiatan) yang tanggal realisasinya pada bulan itu.
 */
export function honorBulanan(daftarBelanja, idPegawai, periode) {
  let bruto = 0, pph = 0
  const transaksi = []
  daftarBelanja.filter((b) => b.jenis === 'honor' && String(tanggalRealisasi(b)).slice(0, 7) === periode).forEach((b) => {
    const p = (b.penerima || []).filter((x) => x.sumber !== 'luar' && x.id === idPegawai)
    if (!p.length) return
    // Honor bulanan: jenis "Honor" dengan satuan bulan, atau dibebankan ke rekening honor bulanan (…0013)
    const bulanan = (b.item || []).some((i) => String(i.kode_rekening || '').endsWith('.0013'))
      || ((b.jenis_honor || 'honor') === 'honor' && p.some((x) => /bulan|bln|ob/i.test(x.satuan || '')))
    if (!bulanan) return
    p.forEach((x) => { bruto += Number(x.bruto) || 0; pph += Number(x.pph21) || 0 })
    transaksi.push(b.nama_pekerjaan)
  })
  return { bruto, pph, bersih: bruto - pph, transaksi }
}
