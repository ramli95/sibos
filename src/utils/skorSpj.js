// Skor kesiapan SPJ (0–100) per transaksi, per bulan dan per tahun.
// Bobot: dokumen & data 50%, pajak 25%, foto & arsip 25% (config/laporan.js → BOBOT_SKOR).
// Skor hanya penanda — tidak pernah memblokir penyimpanan, cetak, atau tutup buku.
import { BOBOT_SKOR, nadaSkor } from '@/config/laporan'
import { kelengkapan, dokumenTransaksi } from './belanja'
import { JENIS_NOMOR } from '@/config/belanja'

const ASPEK_ARSIP = ['foto', 'paket_ttd', 'nota_asli']

/**
 * b: belanja; pajakBelanja: kewajiban pajak transaksi ini (dari daftarKewajiban), berisi status 'disetor'/'terutang'.
 * Hasil: { nilai, nada, aspek: { dokumen, pajak, arsip } (masing-masing { nilai 0–1, butir:[{judul, ok, ket}] }), kurang:[teks] }
 */
export function skorTransaksi(b, pajakBelanja = []) {
  const cek = kelengkapan(b)
  const dok = cek.filter((c) => !ASPEK_ARSIP.includes(c.kunci))
  // Nomor dokumen wajib (Non-SIPLah, bukan honor)
  if (b.jenis !== 'honor' && b.cara !== 'siplah') {
    const perlu = dokumenTransaksi(b).filter((j) => JENIS_NOMOR[j] && ['surat_pesanan', 'shp', 'bast'].includes(j))
    const kosong = perlu.filter((j) => !String(b.nomor?.[j] || '').trim())
    if (perlu.length) dok.push({ kunci: 'nomor', judul: 'Nomor SP, SHP & BAST', ok: !kosong.length, ket: kosong.length ? `${kosong.map((j) => JENIS_NOMOR[j].singkat).join(', ')} belum bernomor` : '' })
  }
  if (b.jenis === 'honor') {
    const tanpaTtd = (b.penerima || []).filter((p) => !p.nama).length
    dok.push({ kunci: 'penerima', judul: 'Daftar penerima lengkap', ok: (b.penerima || []).length > 0 && !tanpaTtd })
  }
  const arsip = cek.filter((c) => ASPEK_ARSIP.includes(c.kunci))

  // Pajak: setiap kewajiban sudah disetor (atau dipungut mitra SIPLah)
  const pjk = pajakBelanja.filter((p) => p.nilai > 0)
  const butirPajak = pjk.length
    ? pjk.map((p) => ({ judul: `${p.jenis} Rp ${p.nilai.toLocaleString('id-ID')}`, ok: p.status === 'disetor', ket: p.status === 'disetor' ? (p.cara === 'mitra' ? 'Dipungut mitra' : p.ntpn ? `NTPN ${p.ntpn}` : 'Disetor') : 'Belum disetor' }))
    : [{ judul: b.status === 'lunas' ? 'Tidak ada pajak' : 'Pajak dihitung saat lunas', ok: b.status === 'lunas' || !(b.pajak || []).some((p) => p.nilai), ket: '' }]

  const rasio = (arr) => (arr.length ? arr.filter((x) => x.ok).length / arr.length : 1)
  const aspek = {
    dokumen: { nilai: rasio(dok), butir: dok },
    pajak: { nilai: rasio(butirPajak), butir: butirPajak },
    arsip: { nilai: rasio(arsip), butir: arsip },
  }
  const nilai = Math.round(aspek.dokumen.nilai * BOBOT_SKOR.dokumen + aspek.pajak.nilai * BOBOT_SKOR.pajak + aspek.arsip.nilai * BOBOT_SKOR.arsip)
  const kurang = [...dok, ...butirPajak, ...arsip].filter((x) => !x.ok).map((x) => x.ket ? `${x.judul} (${x.ket})` : x.judul)
  return { nilai, nada: nadaSkor(nilai), aspek, kurang }
}

/** Skor semua transaksi: Map id → skor */
export function skorSemua(belanja, kewajiban = []) {
  const perBelanja = new Map()
  kewajiban.forEach((p) => { if (!perBelanja.has(p.id_belanja)) perBelanja.set(p.id_belanja, []); perBelanja.get(p.id_belanja).push(p) })
  const hasil = new Map()
  belanja.forEach((b) => hasil.set(b.id, skorTransaksi(b, perBelanja.get(b.id) || [])))
  return hasil
}

/** Rata-rata skor (berbobot nilai rupiah agar transaksi besar lebih berpengaruh) */
export function rataSkor(daftar, skor) {
  if (!daftar.length) return { nilai: 0, nada: 'merah', jumlah: 0, siap: 0, aspek: { dokumen: 0, pajak: 0, arsip: 0 } }
  const bobot = (b) => Math.max(1, Math.sqrt(b.total || 0))
  let t = 0, n = 0
  const asp = { dokumen: 0, pajak: 0, arsip: 0 }
  daftar.forEach((b) => {
    const s = skor.get(b.id)
    if (!s) return
    const w = bobot(b)
    t += s.nilai * w; n += w
    Object.keys(asp).forEach((k) => (asp[k] += s.aspek[k].nilai * w))
  })
  const nilai = n ? Math.round(t / n) : 0
  return {
    nilai, nada: nadaSkor(nilai), jumlah: daftar.length,
    siap: daftar.filter((b) => (skor.get(b.id)?.nilai || 0) >= 90).length,
    aspek: Object.fromEntries(Object.entries(asp).map(([k, v]) => [k, n ? Math.round((v / n) * 100) : 0])),
  }
}
