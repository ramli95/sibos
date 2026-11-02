// Pesan WhatsApp (Fase 7): tombol wa.me dengan pesan siap kirim — gratis, Bendahara tinggal menekan Kirim.
// Template bisa diubah (template_wa/{jenis}); isian {kunci} diganti data transaksi/pegawai/rekanan.

export const JENIS_WA = {
  kelengkapan: { judul: 'Kelengkapan SPJ', ikon: 'ListChecks', warna: 'ikon-chip-peringatan', ket: 'Transaksi lunas yang dokumen SPJ-nya belum lengkap.' },
  transfer: { judul: 'Konfirmasi Transfer', ikon: 'ArrowUpRight', warna: 'ikon-chip-sukses', ket: 'Pembayaran lewat bank: rekening disamarkan 4 digit terakhir.' },
  rekanan: { judul: 'Pesan ke Rekanan', ikon: 'Store', warna: 'ikon-chip-tosca', ket: 'Permintaan nota, faktur, penawaran, atau konfirmasi pesanan.' },
  kgb: { judul: 'Pengingat KGB', ikon: 'TrendingUp', warna: 'ikon-chip', ket: 'Pegawai ASN dengan KGB jatuh tempo ≤ 30 hari.' },
}

// Jenis tambahan yang dipakai dari layar transaksi (Fase 8)
export const JENIS_WA_TRANSAKSI = {
  progres: { judul: 'Progres Transaksi', ikon: 'Activity', warna: 'ikon-chip-kuning', ket: 'Kabar perkembangan: dipesan, diterima, dibayar, dokumen.' },
  nota: { judul: 'Minta Nota/Dokumen', ikon: 'ReceiptText', warna: 'ikon-chip-tosca', ket: 'Meminta nota asli, faktur, atau dokumen dari rekanan.' },
  bebas: { judul: 'Pesan Bebas', ikon: 'MessageSquareText', warna: 'ikon-chip', ket: 'Pesan singkat dengan identitas transaksi.' },
}
// Kas Lain & Iuran: tagihan, setoran, utang piutang (di luar Dana BOSP)
export const JENIS_WA_KAS = {
  tagih: { judul: 'Tagihan Belum Lunas', ikon: 'BellRing', warna: 'ikon-chip-peringatan', ket: 'Pengingat iuran/potongan yang belum dibayar atau baru sebagian.' },
  setoran: { judul: 'Setoran Diterima', ikon: 'Receipt', warna: 'ikon-chip-kuning', ket: 'Konfirmasi setoran sebagian beserta sisa tagihan.' },
  lunas: { judul: 'Konfirmasi Lunas', ikon: 'CheckCheck', warna: 'ikon-chip-sukses', ket: 'Ucapan terima kasih, tagihan sudah lunas.' },
  utang: { judul: 'Utang Piutang', ikon: 'HandCoins', warna: 'ikon-chip-tosca', ket: 'Pengingat atau konfirmasi pembayaran pinjaman.' },
}
export const SEMUA_JENIS_WA = { ...JENIS_WA, ...JENIS_WA_TRANSAKSI, ...JENIS_WA_KAS }

export const TEMPLATE_AWAL = {
  kelengkapan: 'Assalamu\'alaikum, Yth. {nama}.\n\nMohon bantuan melengkapi dokumen SPJ Dana BOSP untuk kegiatan *{pekerjaan}* (lunas {tanggal}, {nominal}).\n\nYang masih kurang:\n{kekurangan}\n\nTerima kasih atas kerja samanya.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  transfer: 'Yth. {nama},\n\nPembayaran *{pekerjaan}* sebesar *{nominal}* telah ditransfer pada {tanggal} ke rekening {bank} {rekening} a.n. {atas_nama}.\n\nMohon konfirmasi bila dana sudah diterima. Terima kasih.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  rekanan: 'Yth. {nama} ({usaha}),\n\n{pesan}\n\nTerima kasih.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  progres: 'Yth. {nama},\n\nBerikut perkembangan *{pekerjaan}* ({nominal}):\n{progres}\n\n{pesan}\n\nTerima kasih.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  nota: 'Yth. {nama} ({usaha}),\n\nUntuk pesanan *{pekerjaan}* sebesar {nominal}, mohon kami dikirimi:\n{kekurangan}\n\nTerima kasih atas kerja samanya.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  bebas: 'Yth. {nama},\n\nTerkait *{pekerjaan}* ({nominal}):\n{pesan}\n\nTerima kasih.\n{bendahara}\nBendahara Dana BOSP {sekolah}',
  tagih: 'Yth. {nama},\n\nMengingatkan dengan hormat, tagihan berikut belum lunas:\n{rincian}\n\nTotal yang belum dibayar: *{sisa}*.\n{pesan}\n\nTerima kasih atas perhatiannya.\n{bendahara}\n{sekolah}',
  setoran: 'Yth. {nama},\n\nSetoran *{pos}* {periode} sebesar *{nominal}* telah kami terima pada {tanggal} (kwitansi {kwitansi}).\nSisa yang belum dibayar: *{sisa}*.\n\nTerima kasih.\n{bendahara}\n{sekolah}',
  lunas: 'Yth. {nama},\n\nTerima kasih, pembayaran *{pos}* {periode} sebesar *{nominal}* telah kami terima ({tanggal}, kwitansi {kwitansi}) dan dinyatakan *LUNAS*.\n\n{bendahara}\n{sekolah}',
  utang: 'Yth. {nama},\n\n{judul}: {uraian} tanggal {tanggal} sebesar {nominal}.\nSudah dibayar: {dibayar}\nSisa: *{sisa}*{tempo}\n{pesan}\n\nTerima kasih.\n{bendahara}\n{sekolah}',
  kgb: 'Yth. {nama},\n\nKenaikan Gaji Berkala (KGB) Bapak/Ibu jatuh tempo pada *{tmt}*. Untuk pengusulan ke Dinas Pendidikan, mohon menyerahkan:\n1. Fotokopi SK pangkat terakhir\n2. Fotokopi SK KGB terakhir\n3. Fotokopi SKP/penilaian kinerja terakhir\n\nTerima kasih.\n{bendahara}\nBendahara Gaji {sekolah}',
}

// Isian yang tersedia per jenis (ditampilkan di editor template)
export const ISIAN_WA = {
  kelengkapan: ['nama', 'pekerjaan', 'tanggal', 'nominal', 'kekurangan', 'bendahara', 'sekolah'],
  transfer: ['nama', 'pekerjaan', 'nominal', 'tanggal', 'bank', 'rekening', 'atas_nama', 'bendahara', 'sekolah'],
  rekanan: ['nama', 'usaha', 'pesan', 'bendahara', 'sekolah'],
  kgb: ['nama', 'tmt', 'gaji_baru', 'bendahara', 'sekolah'],
  tagih: ['nama', 'rincian', 'sisa', 'pesan', 'bendahara', 'sekolah'],
  setoran: ['nama', 'pos', 'periode', 'nominal', 'tanggal', 'kwitansi', 'sisa', 'bendahara', 'sekolah'],
  lunas: ['nama', 'pos', 'periode', 'nominal', 'tanggal', 'kwitansi', 'bendahara', 'sekolah'],
  utang: ['nama', 'judul', 'uraian', 'tanggal', 'nominal', 'dibayar', 'sisa', 'tempo', 'pesan', 'bendahara', 'sekolah'],
  progres: ['nama', 'pekerjaan', 'nominal', 'progres', 'pesan', 'bendahara', 'sekolah'],
  nota: ['nama', 'usaha', 'pekerjaan', 'nominal', 'kekurangan', 'bendahara', 'sekolah'],
  bebas: ['nama', 'pekerjaan', 'nominal', 'pesan', 'bendahara', 'sekolah'],
}

/** Ganti {kunci} dengan nilai; kunci tak dikenal dibiarkan */
export const isiTemplate = (teks, data) => String(teks || '')
  .replace(/\{(\w+)\}/g, (m, k) => (k in data ? String(data[k] ?? '') : m))
  .replace(/\n{3,}/g, '\n\n') // isian kosong tidak meninggalkan baris kosong berlebih

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
