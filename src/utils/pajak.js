// Asisten Pajak: menentukan pajak per transaksi dari tabel aturan (referensi/aturan_pajak).
// Aturan aktif disimpan di modul ini (pasangAturan) agar perhitungan belanja di mana pun memakai tarif terbaru.
import { ATURAN_PAJAK_AWAL } from '@/config/pajak'

let aktif = ATURAN_PAJAK_AWAL
export const salinAturan = (a) => JSON.parse(JSON.stringify(a))

/** Gabungkan aturan tersimpan dengan bawaan (baris baru di bawaan tetap muncul) */
export function rapikanAturan(a) {
  const awal = salinAturan(ATURAN_PAJAK_AWAL)
  if (!a) return awal
  const tarif = awal.tarif.map((t) => ({ ...t, ...((a.tarif || []).find((x) => x.kunci === t.kunci) || {}) }))
  ;(a.tarif || []).forEach((x) => { if (!tarif.some((t) => t.kunci === x.kunci)) tarif.push(x) })
  return { ...awal, ...a, batas: { ...awal.batas, ...(a.batas || {}) }, tarif }
}
export function pasangAturan(a) { aktif = rapikanAturan(a) }
export const aturan = () => aktif
export const baris = (kunci, A = aktif) => A.tarif.find((t) => t.kunci === kunci && t.aktif !== false) || null

const kataKunci = (t) => String(t?.kata_kunci || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)
const cocok = (nama, t) => { const n = String(nama || '').toLowerCase(); return kataKunci(t).some((k) => n.includes(k)) }
const jumlah = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)
const dppDari = (nilai, pkp, tarifPpn) => (pkp ? Math.round((nilai * 100) / (100 + tarifPpn)) : nilai)

function butir(t, dasar, npwp, ket) {
  const tarif = npwp ? Number(t.tarif) : Number(t.tarif_tanpa_npwp ?? t.tarif)
  return { kunci: t.kunci, jenis: t.jenis, cara: t.cara, dasar: Math.round(dasar), tarif, nilai: Math.round((dasar * tarif) / 100), kap: t.kap || '', kjs: t.kjs || '', ket }
}

/* ---------------- PPh 21 penerima honor ---------------- */

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII']
function golonganAsn(st, gol) {
  if (st === 'PPPK') { const n = ROMAWI.indexOf(gol) + 1; return n >= 13 ? 4 : n >= 9 ? 3 : n >= 1 ? (n >= 5 ? 2 : 1) : 3 }
  return gol.startsWith('IV') ? 4 : gol.startsWith('III') ? 3 : /^(I|II)\b/.test(gol) ? 1 : 3
}

/**
 * Tarif PPh 21 seorang penerima + alasannya.
 * - Transpor: 0%.
 * - ASN (PNS/PPPK): tarif final per golongan.
 * - Honorer pegawai sekolah: tidak dipotong bila honor ≤ PTKP bulanan (honor bulanan) atau ≤ PTKP harian (kegiatan).
 * - Narasumber/bukan pegawai lain: 50% × 5% (tanpa NPWP lebih tinggi), kecuali ≤ PTKP harian untuk non-narasumber.
 */
export function pph21Penerima(p, jenisHonor, bruto, A = aktif) {
  if (jenisHonor === 'transpor') return { tarif: 0, alasan: 'Uang transpor tidak dipotong PPh 21' }
  const st = String(p.status_kepegawaian || '').toUpperCase()
  const gol = String(p.golongan || '').toUpperCase().trim()
  if (st === 'PNS' || st === 'PPPK') {
    const g = golonganAsn(st, gol)
    const t = baris(g === 4 ? 'pph21_asn_gol4' : g === 3 ? 'pph21_asn_gol3' : 'pph21_asn_gol12', A)
    return { tarif: t ? Number(t.tarif) : 0, alasan: `ASN golongan ${gol || '-'}: tarif final` }
  }
  const npwp = !!p.npwp
  const hari = Math.max(1, Number(p.hari) || 1)
  if (p.sumber !== 'luar') {
    const t = baris('pph21_honorer', A)
    if (jenisHonor === 'honor') {
      if (bruto <= A.batas.ptkp_bulan) return { tarif: 0, alasan: `Honorer, honor sebulan ≤ PTKP bulanan (Rp ${A.batas.ptkp_bulan.toLocaleString('id-ID')})` }
    } else if (bruto / hari <= A.batas.ptkp_hari) return { tarif: 0, alasan: `Honor per hari ≤ PTKP harian (Rp ${A.batas.ptkp_hari.toLocaleString('id-ID')})` }
    return { tarif: t ? Number(npwp ? t.tarif : t.tarif_tanpa_npwp) : 0, alasan: 'Honorer di atas PTKP' }
  }
  if (jenisHonor !== 'narasumber' && bruto / hari <= A.batas.ptkp_hari) return { tarif: 0, alasan: `Bukan pegawai, per hari ≤ PTKP harian` }
  const t = baris('pph21_bukan_pegawai', A)
  return { tarif: t ? Number(npwp ? t.tarif : t.tarif_tanpa_npwp) : 0, alasan: `Bukan pegawai${npwp ? '' : ' tanpa NPWP'}` }
}

/* ---------------- Pajak per transaksi ---------------- */

/**
 * Hasil: [{ kunci, jenis, cara, dasar, tarif, nilai, kap, kjs, ket }]
 * Harga dari penyedia PKP dianggap sudah termasuk PPN.
 */
export function hitungPajak(b, A = aktif) {
  if (b.jenis === 'honor') {
    const nilai = jumlah(b.penerima || [], (p) => p.pph21)
    if (!nilai) return []
    const t = baris('pph21_bukan_pegawai', A) || {}
    return [{ kunci: 'pph21', jenis: 'PPh 21', cara: 'potong', dasar: jumlah(b.penerima || [], (p) => (p.pph21 ? p.bruto : 0)), tarif: null, nilai, kap: t.kap || '411121', kjs: '100', ket: 'Dipotong dari penerima honor' }]
  }
  const item = b.item || []
  const r = b.rekanan || {}
  const pkp = !!r.status_pkp
  const npwp = !!r.npwp
  const total = jumlah(item, (i) => i.jumlah)
  const tPpn = baris(b.cara === 'siplah' ? 'ppn_siplah' : 'ppn', A)
  const tarifPpn = tPpn ? Number(tPpn.tarif) : 11
  const hasil = []

  if (b.cara === 'siplah') {
    const dpp = dppDari(total, pkp, tarifPpn)
    if (pkp && tPpn) hasil.push({ ...butir(tPpn, dpp, true, 'Dipungut & disetor mitra SIPLah'), nilai: total - dpp })
    const t22 = baris('pph22_siplah', A)
    if (t22) hasil.push(butir(t22, dpp, true, 'Dipungut mitra SIPLah'))
    return hasil
  }

  if (pkp && tPpn && total > A.batas.non_pkp) {
    const dpp = dppDari(total, true, tarifPpn)
    hasil.push({ ...butir(tPpn, dpp, true, `PKP, nilai > Rp ${A.batas.non_pkp.toLocaleString('id-ID')}`), nilai: total - dpp })
  }
  const t22 = baris('pph22', A)
  const tSewa = baris('pph42_sewa', A)
  const tKons = baris('pph42_konstruksi', A)
  const sewa = item.filter((i) => tSewa && cocok(i.nama, tSewa))
  const kons = item.filter((i) => i.jenis === 'jasa' && tKons && cocok(i.nama, tKons) && !sewa.includes(i))
  const barang = item.filter((i) => i.jenis !== 'jasa' && !sewa.includes(i))
  const barangKena = barang.filter((i) => !cocok(i.nama, t22))
  const jasa = item.filter((i) => i.jenis === 'jasa' && !sewa.includes(i) && !kons.includes(i))

  const nBarang = jumlah(barangKena, (i) => i.jumlah)
  if (t22 && nBarang > A.batas.non_pkp) {
    const kecuali = barang.length - barangKena.length
    hasil.push(butir(t22, dppDari(nBarang, pkp, tarifPpn), npwp, `Pembelian barang > Rp ${A.batas.non_pkp.toLocaleString('id-ID')}${kecuali ? ` (${kecuali} item dikecualikan)` : ''}`))
  }
  const nSewa = jumlah(sewa, (i) => i.jumlah)
  if (nSewa > 0 && tSewa) hasil.push(butir(tSewa, dppDari(nSewa, pkp, tarifPpn), true, 'Sewa tanah/bangunan (final)'))
  const nKons = jumlah(kons, (i) => i.jumlah)
  if (nKons > 0 && tKons) hasil.push(butir(tKons, dppDari(nKons, pkp, tarifPpn), true, 'Jasa konstruksi (final)'))
  const nJasa = jumlah(jasa, (i) => i.jumlah)
  if (nJasa > 0) {
    const dpp = dppDari(nJasa, pkp, tarifPpn)
    if (r.bentuk_usaha === 'badan') { const t = baris('pph23', A); if (t) hasil.push(butir(t, dpp, npwp, 'Jasa oleh badan usaha')) }
    else { const t = baris('pph21_bukan_pegawai', A); if (t) hasil.push(butir(t, dpp, npwp, 'Jasa oleh orang pribadi')) }
  }
  return hasil.filter((h) => h.nilai > 0)
}

/** Catatan peringatan Asisten Pajak */
export function peringatanPajak(b, A = aktif) {
  const p = []
  if (b.jenis === 'honor') return p
  const r = b.rekanan || {}
  const total = jumlah(b.item || [], (i) => i.jumlah)
  if (b.cara !== 'siplah' && !r.status_pkp && total > A.batas.non_pkp) p.push(`Penyedia bukan PKP untuk belanja > Rp ${A.batas.non_pkp.toLocaleString('id-ID')} — sebaiknya penyedia PKP/SIPLah.`)
  if (!r.npwp && b.cara !== 'siplah' && total > A.batas.non_pkp) p.push('Penyedia belum ber-NPWP: tarif PPh 22/23 lebih tinggi.')
  return p
}

/* ---------------- Kewajiban (dari belanja.pajak) ---------------- */

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '')
/** Id kewajiban deterministik: tidak berubah bila belanja disimpan ulang */
export const idPajak = (idBelanja, p) => `${idBelanja}_${slug(p.kunci || p.jenis)}`

/** Daftar kewajiban pajak tahun berjalan dari belanja Lunas + data setoran */
export function daftarKewajiban(belanja, setoran) {
  const peta = new Map()
  setoran.forEach((s) => (s.butir || []).forEach((x) => peta.set(x.id_pajak, { ...x, setoran: s })))
  const hasil = []
  belanja.forEach((b) => {
    if (b.status !== 'lunas') return
    ;(b.pajak || []).forEach((p) => {
      if (!p.nilai) return
      const id = idPajak(b.id, p)
      const st = peta.get(id)
      const mitra = p.cara === 'mitra' || (b.cara === 'siplah' && !p.cara)
      hasil.push({
        id, id_belanja: b.id, jenis: p.jenis, kunci: p.kunci || slug(p.jenis), cara: mitra ? 'mitra' : p.cara || (/PPN|PPh 22/.test(p.jenis) ? 'pungut' : 'potong'),
        dasar: p.dasar || 0, tarif: p.tarif, nilai: p.nilai, kap: p.kap || '', kjs: p.kjs || '', ket: p.ket || '',
        tgl_pungut: b.tgl_lunas, bnu: Object.values(b.bnu || {})[0] || '', bnu_terima: p.bnu_terima || '',
        uraian: b.nama_pekerjaan, pihak: b.jenis === 'honor' ? `${(b.penerima || []).length} penerima` : b.rekanan?.nama_usaha || '',
        npwp: b.rekanan?.npwp || '', sumber: b.sumber || 'sibos',
        status: mitra ? 'disetor' : st ? 'disetor' : 'terutang',
        tgl_setor: mitra ? b.tgl_lunas : st?.setoran.tanggal || '', ntpn: st?.setoran.ntpn || '', kode_billing: st?.setoran.kode_billing || '',
        id_setoran: st?.setoran.id || null, bnu_setor: st?.setoran.bnu_jenis?.[p.jenis] || st?.setoran.bnu || '', no_bupot: st?.no_bupot || '',
      })
    })
  })
  return hasil.sort((a, b) => String(a.tgl_pungut).localeCompare(String(b.tgl_pungut)))
}
