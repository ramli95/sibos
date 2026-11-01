// Pesan WhatsApp (Fase 7): tombol wa.me dengan pesan siap kirim — gratis, Bendahara tinggal menekan Kirim.
// Template bisa diubah (template_wa/{jenis}); isian {kunci} diganti data transaksi/pegawai/rekanan.

export const JENIS_WA = {
  kelengkapan: { judul: 'Kelengkapan SPJ', ikon: 'ListChecks', warna: 'ikon-chip-peringatan', ket: 'Transaksi lunas yang dokumen SPJ-nya belum lengkap.' },
  transfer: { judul: 'Konfirmasi Transfer', ikon: 'ArrowUpRight', warna: 'ikon-chip-sukses', ket: 'Pembayaran lewat bank: rekening disamarkan 4 digit terakhir.' },
  rekanan: { judul: 'Pesan ke Rekanan', ikon: 'Store', warna: 'ikon-chip-tosca', ket: 'Permintaan nota, faktur, penawaran, atau konfirmasi pesanan.' },
  kgb: { judul: 'Pengingat KGB', ikon: 'TrendingUp', warna: 'ikon-chip', ket: 'Pegawai ASN dengan KGB jatuh tempo ≤ 30 hari.' },
}

export const TEMPLATE_AWAL = {
  kelengkapan: 'Assalamu\'alaikum, Yth. {nama}.\n\nMohon bantuan melengkapi dokumen SPJ Dana BOSP untuk kegiatan *{pekerjaan}* (lunas {tanggal}, {nominal}).\n\nYang masih kurang:\n{kekurangan}\n\nTerima kasih atas kerja samanya.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  transfer: 'Yth. {nama},\n\nPembayaran *{pekerjaan}* sebesar *{nominal}* telah ditransfer pada {tanggal} ke rekening {bank} {rekening} a.n. {atas_nama}.\n\nMohon konfirmasi bila dana sudah diterima. Terima kasih.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  rekanan: 'Yth. {nama} ({usaha}),\n\n{pesan}\n\nTerima kasih.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  kgb: 'Yth. {nama},\n\nKenaikan Gaji Berkala (KGB) Bapak/Ibu jatuh tempo pada *{tmt}*. Untuk pengusulan ke Dinas Pendidikan, mohon menyerahkan:\n1. Fotokopi SK pangkat terakhir\n2. Fotokopi SK KGB terakhir\n3. Fotokopi SKP/penilaian kinerja terakhir\n\nTerima kasih.\n{bendahara}\nBendahara Gaji {sekolah}',
}

// Isian yang tersedia per jenis (ditampilkan di editor template)
export const ISIAN_WA = {
  kelengkapan: ['nama', 'pekerjaan', 'tanggal', 'nominal', 'kekurangan', 'bendahara', 'sekolah'],
  transfer: ['nama', 'pekerjaan', 'nominal', 'tanggal', 'bank', 'rekening', 'atas_nama', 'bendahara', 'sekolah'],
  rekanan: ['nama', 'usaha', 'pesan', 'bendahara', 'sekolah'],
  kgb: ['nama', 'tmt', 'gaji_baru', 'bendahara', 'sekolah'],
}

/** Ganti {kunci} dengan nilai; kunci tak dikenal dibiarkan */
export const isiTemplate = (teks, data) => String(teks || '').replace(/\{(\w+)\}/g, (m, k) => (data[k] != null && data[k] !== '' ? String(data[k]) : m))

/** Rekening disamarkan: ••••1234 */
export function samarRekening(no) {
  const d = String(no || '').replace(/\D/g, '')
  return d ? `••••${d.slice(-4)}` : '(rekening)'
}

/** Nomor WA rapi (628…) atau '' */
export function nomorWa(v) {
  let n = String(v || '').replace(/\D/g, '')
  if (!n) return ''
  if (n.startsWith('0')) n = '62' + n.slice(1)
  else if (n.startsWith('8')) n = '62' + n
  return n.length >= 10 ? n : ''
}

/** Tautan wa.me; tanpa nomor → pengguna memilih kontak sendiri di WhatsApp */
export const tautanWa = (no, teks) => `https://wa.me/${nomorWa(no)}?text=${encodeURIComponent(teks)}`
