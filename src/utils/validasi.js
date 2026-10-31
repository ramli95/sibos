// Validasi & normalisasi data kepegawaian dan rekanan

export const STATUS_KEPEGAWAIAN = ['PNS', 'PPPK', 'Honorer', 'PTT']

// Golongan PNS → pangkat
export const PANGKAT_PNS = {
  'I/a': 'Juru Muda', 'I/b': 'Juru Muda Tingkat I', 'I/c': 'Juru', 'I/d': 'Juru Tingkat I',
  'II/a': 'Pengatur Muda', 'II/b': 'Pengatur Muda Tingkat I', 'II/c': 'Pengatur', 'II/d': 'Pengatur Tingkat I',
  'III/a': 'Penata Muda', 'III/b': 'Penata Muda Tingkat I', 'III/c': 'Penata', 'III/d': 'Penata Tingkat I',
  'IV/a': 'Pembina', 'IV/b': 'Pembina Tingkat I', 'IV/c': 'Pembina Utama Muda', 'IV/d': 'Pembina Utama Madya', 'IV/e': 'Pembina Utama',
}
export const GOLONGAN_PPPK = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII']

export const hanyaAngka = (v) => String(v ?? '').replace(/\D/g, '')

const tanggalSah = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

/**
 * Memeriksa NIP 18 digit: [8] tanggal lahir · [6] TMT CPNS/PPPK (tahun+bulan) · [1] jenis kelamin · [3] urut.
 * Mengembalikan { sah, galat[], tanggal_lahir, jenis_kelamin, tmt }
 */
export function periksaNip(nipMasukan, { tanggalLahir, jenisKelamin } = {}) {
  const nip = hanyaAngka(nipMasukan)
  const galat = []
  if (!nip) return { sah: true, kosong: true, galat }
  if (nip.length !== 18) return { sah: false, galat: [`NIP harus 18 digit (sekarang ${nip.length}).`] }
  const y = +nip.slice(0, 4), m = +nip.slice(4, 6), d = +nip.slice(6, 8)
  const ty = +nip.slice(8, 12), tm = +nip.slice(12, 14)
  const jk = nip[14]
  if (!tanggalSah(y, m, d) || y < 1940) galat.push(`Digit 1–8 bukan tanggal lahir yang sah (${nip.slice(6, 8)}-${nip.slice(4, 6)}-${nip.slice(0, 4)}).`)
  // NIP PPPK memakai kode "21" pada digit 13–14 (mis. 2023 21 1 001); NIP PNS berisi bulan TMT
  const pppk = tm === 21
  if (!pppk && (tm < 1 || tm > 12)) galat.push(`Digit 13–14 "${nip.slice(12, 14)}" bukan bulan TMT (01–12) dan bukan kode PPPK (21).`)
  if (ty < y + 17 || ty > new Date().getFullYear() + 1) galat.push(`Digit 9–12 tahun TMT ${ty} tidak wajar.`)
  if (jk !== '1' && jk !== '2') galat.push(`Digit ke-15 harus 1 (laki-laki) atau 2 (perempuan), bukan ${jk}.`)
  const tl = `${nip.slice(0, 4)}-${nip.slice(4, 6)}-${nip.slice(6, 8)}`
  const jkHuruf = jk === '1' ? 'L' : jk === '2' ? 'P' : ''
  if (tanggalLahir && tanggalLahir !== tl) galat.push(`Tanggal lahir (${tanggalLahir}) berbeda dengan NIP (${tl}).`)
  if (jenisKelamin && jkHuruf && jenisKelamin !== jkHuruf) galat.push(`Jenis kelamin (${jenisKelamin}) berbeda dengan digit NIP (${jkHuruf}).`)
  return { sah: galat.length === 0, galat, tanggal_lahir: tl, jenis_kelamin: jkHuruf, pppk, tmt: pppk ? `${nip.slice(8, 12)} (PPPK)` : `${nip.slice(8, 12)}-${nip.slice(12, 14)}` }
}

/** Memisahkan "Drs. Nama Lengkap, S.Pd., M.Pd." → { gelar_depan, nama, gelar } */
export function pisahGelar(teks) {
  let nama = String(teks ?? '').trim(), gelar_depan = '', gelar = ''
  const m = nama.match(/^((?:(?:Drs|Dra|Dr|Ir|Prof)\.?\s+)+)/i)
  if (m) { gelar_depan = m[1].trim(); nama = nama.slice(m[1].length).trim() }
  const k = nama.indexOf(',')
  if (k > 0) { gelar = nama.slice(k + 1).trim(); nama = nama.slice(0, k).trim() }
  return { gelar_depan, nama, gelar }
}

/** 19951115 202012 1 007 */
export const formatNip = (nip = '') => {
  const n = hanyaAngka(nip)
  return n.length === 18 ? `${n.slice(0, 8)} ${n.slice(8, 14)} ${n.slice(14, 15)} ${n.slice(15)}` : nip || ''
}

/** NPWP 15 digit → 00.000.000.0-000.000; 16 digit (NIK/NPWP baru) dibiarkan */
export function formatNpwp(v) {
  const n = hanyaAngka(v)
  if (n.length === 15) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}.${n.slice(8, 9)}-${n.slice(9, 12)}.${n.slice(12)}`
  return n || ''
}

export function periksaNpwp(v) {
  const n = hanyaAngka(v)
  if (!n) return null
  return n.length === 15 || n.length === 16 ? null : `NPWP harus 15 atau 16 digit (sekarang ${n.length}).`
}

export function periksaNik(v) {
  const n = hanyaAngka(v)
  if (!n) return null
  return n.length === 16 ? null : `NIK harus 16 digit (sekarang ${n.length}).`
}

/** Nomor WA → 628xxxx */
export function normalWa(v) {
  let n = hanyaAngka(v)
  if (!n) return ''
  if (n.startsWith('0')) n = '62' + n.slice(1)
  else if (n.startsWith('8')) n = '62' + n
  return n
}
export const formatWa = (n) => (n ? '+' + n.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, '$1 $2-$3-$4') : '')

const BULAN = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7,
  agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, nov: 11, nopember: 11, november: 11, des: 12, desember: 12, dec: 12 }
const dua = (n) => String(n).padStart(2, '0')

/** Berbagai bentuk tanggal → 'yyyy-mm-dd' (atau '' bila tidak dikenali) */
export function normalTanggal(v) {
  if (v === null || v === undefined || v === '') return ''
  if (v instanceof Date && !isNaN(v)) return `${v.getUTCFullYear()}-${dua(v.getUTCMonth() + 1)}-${dua(v.getUTCDate())}`
  if (typeof v === 'number' && v > 1000 && v < 80000) { // nomor seri Excel
    const t = new Date(Date.UTC(1899, 11, 30) + v * 86400000)
    return normalTanggal(t)
  }
  const s = String(v).trim().toLowerCase()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m && tanggalSah(+m[1], +m[2], +m[3])) return `${m[1]}-${dua(m[2])}-${dua(m[3])}`
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (m && tanggalSah(+m[3], +m[2], +m[1])) return `${m[3]}-${dua(m[2])}-${dua(m[1])}`
  m = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/)
  if (m && BULAN[m[2]] && tanggalSah(+m[3], BULAN[m[2]], +m[1])) return `${m[3]}-${dua(BULAN[m[2]])}-${dua(m[1])}`
  return ''
}

export function normalJk(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (['l', 'lk', 'laki-laki', 'laki laki', 'pria', '1', 'male'].includes(s)) return 'L'
  if (['p', 'pr', 'perempuan', 'wanita', '2', 'female'].includes(s)) return 'P'
  return ''
}

export function normalStatus(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return ''
  if (s.includes('pppk') || s.includes('p3k')) return 'PPPK'
  if (s.includes('ptt') || s.includes('tenaga') || s.includes('tendik non')) return 'PTT'
  if (s.includes('honor') || s.includes('gtt') || s.includes('non asn') || s.includes('non-asn') || s.includes('kontrak')) return 'Honorer'
  if (s.includes('pns') || s.includes('cpns') || s === 'asn') return 'PNS'
  return ''
}

export function normalBool(v) {
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  return ['ya', 'y', 'yes', '1', 'true', 'v', '✓', '√', 'pkp', 'terima', 'sudah'].includes(s)
}

export function normalGolongan(v) {
  const s = String(v ?? '').trim().replace(/\s+/g, '').toUpperCase()
  const m = s.match(/^(IV|III|II|I)[/.-]?([A-E])$/)
  if (m) return `${m[1]}/${m[2].toLowerCase()}`
  if (GOLONGAN_PPPK.includes(s)) return s
  return String(v ?? '').trim()
}

export function normalBentukUsaha(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return ''
  if (/(badan|cv|pt|ud|koperasi|firma|yayasan)/.test(s)) return 'badan'
  return 'orang_pribadi'
}
