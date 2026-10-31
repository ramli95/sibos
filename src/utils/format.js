// Format standar SIBOS
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const NAMA_BULAN = BULAN

const keTanggal = (t) => (t?.toDate ? t.toDate() : t instanceof Date ? t : t ? new Date(t) : null)

/** Rp 2.510.000 */
export function rupiah(n, { tanpaRp = false } = {}) {
  const s = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))
  return tanpaRp ? s : `Rp ${s}`
}

/** 31 Oktober 2026 (dokumen) */
export function tanggalPanjang(t) {
  const d = keTanggal(t)
  return d ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : ''
}

/** 31/10/2026 (tabel) */
export function tanggalPendek(t) {
  const d = keTanggal(t)
  if (!d) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

/** Filter bawaan: mundur 90 hari dari hari ini */
export function rentangBawaan(hari = 90) {
  const sampai = new Date()
  const dari = new Date()
  dari.setDate(dari.getDate() - hari)
  return { dari, sampai }
}

export function formatWaktuRelatif(t) {
  const d = keTanggal(t)
  if (!d) return ''
  const detik = Math.round((Date.now() - d.getTime()) / 1000)
  if (detik < 60) return 'baru saja'
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  if (detik < 172800) return 'kemarin'
  return tanggalPendek(d)
}

/** Ucapan sesuai jam WITA */
export function sapaan() {
  const jam = Number(new Intl.DateTimeFormat('id-ID', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Makassar' }).format(new Date()))
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 18) return 'Selamat sore'
  return 'Selamat malam'
}
