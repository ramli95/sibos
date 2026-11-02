// Laporan format SIMAKDA (Pemkot Makassar) untuk periode bebas [dari, sampai] (ISO yyyy-mm-dd):
// Buku Kas Umum, Buku Pembantu Tunai, Buku Simpanan Bank, Buku Pembantu Pajak, LPJ Bendahara Pengeluaran
// (SPJ Belanja BOS), Buku Subrincian Objek, Laporan Realisasi Penerimaan & Belanja, SPTJM, Rekap Pembelian BMD.
// Sumber data sama dengan BKU SIBOS (kas.baris, kewajiban & setoran pajak, belanja Lunas, uraian RKAS).
import { NAMA_BULAN, dariIso } from './format'

/* ---------------- Akun ---------------- */
// Akun belanja SIMAKDA per kelompok rekening (dengan jenjang induk untuk LPJ)
export const AKUN_SIMAKDA = [
  { awalan: '5.1.02', kode: '5.1.02.89.001.00001', nama: 'Belanja Barang dan Jasa BOSP-BOS Reguler', jenis: 'barang', induk: [['5.1', 'BELANJA OPERASI'], ['5.1.02', 'Belanja Barang dan Jasa'], ['5.1.02.89', 'Belanja Barang dan Jasa BOSP'], ['5.1.02.89.001', 'Belanja Barang dan Jasa BOSP-BOS']] },
  { awalan: '5.2.02', kode: '5.2.02.89.001.00001', nama: 'Belanja Modal Peralatan dan Mesin BOSP-BOS Reguler', jenis: 'modal', induk: [['5.2', 'BELANJA MODAL'], ['5.2.02', 'Belanja Modal Peralatan dan Mesin'], ['5.2.02.89', 'Belanja Modal Peralatan dan Mesin BOSP'], ['5.2.02.89.001', 'Belanja Modal Peralatan dan Mesin BOSP-BOS']] },
  { awalan: '5.2.03', kode: '5.2.03.89.001.00001', nama: 'Belanja Modal Gedung dan Bangunan BOSP-BOS Reguler', jenis: 'modal', induk: [['5.2', 'BELANJA MODAL'], ['5.2.03', 'Belanja Modal Gedung dan Bangunan'], ['5.2.03.89', 'Belanja Modal Gedung dan Bangunan BOSP'], ['5.2.03.89.001', 'Belanja Modal Gedung dan Bangunan BOSP-BOS']] },
  { awalan: '5.2.05', kode: '5.2.05.89.001.00001', nama: 'Belanja Modal Aset Tetap Lainnya BOSP-BOS Reguler', jenis: 'modal', induk: [['5.2', 'BELANJA MODAL'], ['5.2.05', 'Belanja Modal Aset Tetap Lainnya'], ['5.2.05.89', 'Belanja Modal Aset Tetap Lainnya BOSP'], ['5.2.05.89.001', 'Belanja Modal Aset Tetap Lainnya BOSP-BOS']] },
]
export const akunDari = (kodeRek) => AKUN_SIMAKDA.find((a) => String(kodeRek || '').startsWith(a.awalan)) || AKUN_SIMAKDA[0]

// Kode akun pajak SIMAKDA (bisa ditimpa dari Referensi → Kode Pajak, kolom Kode SIMAKDA)
export const KODE_PAJAK_SIMAKDA = { PPN: '2110402', 'PPh 21': '2110321', 'PPh 21 PNS': '2110306', 'PPh 23': '2110314', 'PPh 22': '', 'PPh 4(2)': '' }
const NAMA_PAJAK = { PPN: 'PPn', 'PPh 21': 'PPh Pasal 21', 'PPh 22': 'PPh Pasal 22', 'PPh 23': 'PPh Pasal 23', 'PPh 4(2)': 'PPh Pasal 4 ayat (2)' }

const pns = (b) => b?.jenis === 'honor' && (b.penerima || []).length > 0 && b.penerima.every((x) => x.status_kepegawaian === 'PNS')
const tarifTeks = (p) => (p.tarif === '' || p.tarif == null ? '' : p.jenis === 'PPN' ? ` (${String(p.tarif).replace('.', ',')} %)` : ` (${String(p.tarif).replace('.', ',')}%)`)
/** { kode, label } — "PPn (11 %)", "PPh Pasal 23 (2%)", "PPH Pasal 21 (5%) - PNS" */
export function akunPajak(p, b, kodePajak = KODE_PAJAK_SIMAKDA) {
  const jadiPns = p.jenis === 'PPh 21' && pns(b)
  const kode = (jadiPns ? kodePajak['PPh 21 PNS'] : kodePajak[p.jenis]) || ''
  const label = jadiPns ? `PPH Pasal 21${tarifTeks(p)} - PNS` : `${NAMA_PAJAK[p.jenis] || p.jenis}${tarifTeks(p)}`
  return { kode, label }
}

/* ---------------- Periode ---------------- */
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** Pilihan periode → { dari, sampai, judul, semester } */
export function periodeSimakda({ mode, tahun, bulan = 0, semester = 1, dari, sampai }) {
  if (mode === 'bulan') return { dari: iso(new Date(tahun, bulan, 1)), sampai: iso(new Date(tahun, bulan + 1, 0)), judul: `Bulan ${NAMA_BULAN[bulan]} ${tahun}` }
  if (mode === 'semester') return { dari: iso(new Date(tahun, semester === 1 ? 0 : 6, 1)), sampai: iso(new Date(tahun, semester === 1 ? 6 : 12, 0)), judul: `Semester ${semester === 1 ? 'I' : 'II'} ${tahun}`, semester }
  if (mode === 'tahun') return { dari: `${tahun}-01-01`, sampai: `${tahun}-12-31`, judul: `Tahun ${tahun}` }
  const a = dari || `${tahun}-01-01`, z = sampai || iso(new Date())
  return { dari: a <= z ? a : z, sampai: a <= z ? z : a, judul: '' }
}
/** "01 JANUARI 2026 S.D. 02 NOVEMBER 2026" */
export function teksPeriode(dari, sampai, besar = true) {
  const f = (s) => { const d = dariIso(s); return d ? `${String(d.getDate()).padStart(2, '0')} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}` : '' }
  const t = `${f(dari)} S.D. ${f(sampai)}`
  return besar ? t.toUpperCase() : t
}
/** Semester untuk kalimat laporan: "semester I", "semester II", atau "periode …" */
export function teksSemester(dari, sampai) {
  const a = dariIso(dari), z = dariIso(sampai)
  if (!a || !z) return ''
  if (z.getMonth() <= 5) return 'semester I'
  if (a.getMonth() >= 6) return 'semester II'
  return `periode ${teksPeriode(dari, sampai, false)}`
}
export const tanggalDmy = (s) => { const d = dariIso(s); return d ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` : '' }

/* ---------------- Bantu ---------------- */
const efek = (r) => (r.bank || 0) + (r.tunai || 0)
const jml = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)
const LABEL_KAS = {
  terima_dana: 'Pendapatan dana bos', bunga: 'Pendapatan jasa giro', pengembalian: 'Pengembalian belanja', pajak_bunga: 'Pajak jasa giro',
  biaya_bank: 'Biaya administrasi bank', lainnya_keluar: 'Pengeluaran lain-lain', tarik_tunai: 'Pergeseran uang bank ke tunai', setor_tunai: 'Pergeseran uang tunai ke bank',
}
const URUT_GRUP = { masuk: 0, belanja: 1, setor: 2, keluar: 3 }
const viaRekening = (p) => p.cara !== 'mitra' && p.cara !== 'luar'

/**
 * Susunan "nota" seperti BKU SIMAKDA untuk satu tahun: [{ kunci, tanggal, bnu, judul, jenis, baris:[{ label, masuk, keluar, bank, tunai, pajak }] }]
 * Belanja + penerimaan pajaknya satu nomor; setoran pajak per (setoran × belanja) satu nomor; kas lain satu nomor.
 */
export function notaSimakda({ baris = [], belanja = [], kewajiban = [], setoran = [], kodePajak }) {
  const bel = new Map(belanja.map((b) => [b.id, b]))
  const kw = new Map(kewajiban.map((p) => [p.id, p]))
  const st = new Map(setoran.map((s) => [s.id, s]))
  const grup = []
  const peta = new Map()
  const ambil = (kunci, isi) => { if (!peta.has(kunci)) { const g = { kunci, baris: [], ...isi }; peta.set(kunci, g); grup.push(g) } return peta.get(kunci) }

  baris.forEach((r) => {
    if (r.jenis === 'saldo_awal' || r.jenis === 'setor_pajak') return
    if (r.jenis === 'belanja') {
      const b = bel.get(r.ref?.id)
      const g = ambil(`b|${r.ref?.id}`, { tanggal: r.tanggal, bnu: r.bnu, judul: b?.uraian_pembayaran || b?.nama_pekerjaan || r.uraian, jenis: 'belanja', id_belanja: r.ref?.id })
      if (!g.bnu && r.bnu) g.bnu = r.bnu
      const akun = akunDari(r.kode_rekening)
      let l = g.baris.find((x) => x.akun === akun.kode)
      if (!l) { l = { akun: akun.kode, akunObj: akun, label: akun.nama, masuk: 0, keluar: 0, bank: 0, tunai: 0, item: [] }; g.baris.push(l) }
      l.keluar += -efek(r); l.bank += r.bank; l.tunai += r.tunai
      if (akun.jenis === 'modal') (b?.item || []).filter((i) => i.kode_rekening === r.kode_rekening && i.kode_kegiatan === r.kode_kegiatan).forEach((i) => { if (!l.item.includes(i.nama)) l.item.push(i.nama) })
      return
    }
    if (r.jenis === 'terima_pajak') {
      const p = kw.get(String(r.id).slice(3))
      const b = bel.get(r.ref?.id_belanja)
      const g = ambil(`b|${r.ref?.id_belanja}`, { tanggal: r.tanggal, bnu: '', judul: b?.uraian_pembayaran || b?.nama_pekerjaan || r.uraian, jenis: 'belanja', id_belanja: r.ref?.id_belanja })
      const a = akunPajak(p || { jenis: r.pajak }, b, kodePajak)
      g.baris.push({ label: `Terima ${a.label}`, kodePajak: a.kode, labelPajak: a.label, pajak: 'terima', jenisPajak: p?.jenis || r.pajak, masuk: efek(r), keluar: 0, bank: r.bank, tunai: r.tunai })
      return
    }
    const masuk = efek(r) > 0
    ambil(`k|${r.id}`, { tanggal: r.tanggal, bnu: r.bnu, judul: r.uraian, jenis: masuk ? 'masuk' : 'keluar', jenisKas: r.jenis })
      .baris.push({ label: LABEL_KAS[r.jenis] || r.uraian, masuk: Math.max(0, efek(r)), keluar: Math.max(0, -efek(r)), bank: r.bank, tunai: r.tunai, pindah: r.jenis === 'tarik_tunai' || r.jenis === 'setor_tunai' })
  })

  // Setoran pajak per belanja
  kewajiban.filter((p) => viaRekening(p) && p.id_setoran).forEach((p) => {
    const s = st.get(p.id_setoran)
    if (!s || s.dari === 'luar') return
    const b = bel.get(p.id_belanja)
    const g = ambil(`s|${s.id}|${p.id_belanja}`, { tanggal: s.tanggal, bnu: s.bnu_jenis?.[p.jenis] || s.bnu || '', judul: `Setor Pajak ${b?.uraian_pembayaran || b?.nama_pekerjaan || p.uraian}`, jenis: 'setor', ntpn: s.ntpn || '' })
    const a = akunPajak(p, b, kodePajak)
    const tunai = s.dari === 'tunai'
    g.baris.push({ label: `Setor ${a.label}`, kodePajak: a.kode, labelPajak: a.label, pajak: 'setor', jenisPajak: p.jenis, masuk: 0, keluar: p.nilai, bank: tunai ? 0 : -p.nilai, tunai: tunai ? -p.nilai : 0 })
  })

  grup.forEach((g) => g.baris.forEach((l) => { if (l.item?.length) l.label = `${l.label} / ${l.item.join(', ')}` }))
  return grup.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || URUT_GRUP[a.jenis] - URUT_GRUP[b.jenis] || String(a.bnu).localeCompare(String(b.bnu), 'id', { numeric: true }))
}

/** Saldo awal tahun (baris saldo_awal) per kolom */
const saldoAwalTahun = (baris, kolom) => jml(baris.filter((r) => r.jenis === 'saldo_awal'), (r) => (kolom === 'bku' ? efek(r) : r[kolom]))

/* ---------------- 1. Buku Kas Umum ---------------- */
export function bkuSimakda(data, dari, sampai) {
  const nota = notaSimakda(data)
  const awalTahun = saldoAwalTahun(data.baris, 'bku')
  const sebelum = nota.filter((g) => g.tanggal < dari)
  const dalam = nota.filter((g) => g.tanggal >= dari && g.tanggal <= sampai)
  const masukSblm = jml(sebelum.flatMap((g) => g.baris), (l) => (l.pindah ? 0 : l.masuk))
  const keluarSblm = jml(sebelum.flatMap((g) => g.baris), (l) => (l.pindah ? 0 : l.keluar))
  const awal = awalTahun + masukSblm - keluarSblm
  let saldo = awal
  const nomor = new Map(nota.map((g, i) => [g.kunci, i + 1]))
  const isi = dalam.filter((g) => g.baris.some((l) => !l.pindah)).map((g) => ({
    ...g, nomor: nomor.get(g.kunci),
    baris: g.baris.filter((l) => !l.pindah).map((l) => { saldo += l.masuk - l.keluar; return { ...l, saldo } }),
  }))
  const masuk = jml(isi.flatMap((g) => g.baris), (l) => l.masuk)
  const keluar = jml(isi.flatMap((g) => g.baris), (l) => l.keluar)
  const sisa = awal + masuk - keluar
  // Rincian kas pada tanggal akhir
  const sampaiBaris = data.baris.filter((r) => r.tanggal <= sampai)
  const tunai = jml(sampaiBaris, (r) => r.tunai)
  const pajak = jml(sampaiBaris.filter((r) => r.jenis === 'terima_pajak' || r.jenis === 'setor_pajak'), efek)
  return {
    awal, awalTahun, isi, masuk, keluar, sisa,
    sebelum: { masuk: masukSblm, keluar: keluarSblm }, sd: { masuk: masukSblm + masuk, keluar: keluarSblm + keluar },
    kas: { tunai, pajak, bank: sisa - tunai - pajak },
  }
}

/* ---------------- 2–3. Buku Pembantu Tunai / Buku Simpanan Bank ---------------- */
// Tanpa baris pajak (pajak dicatat di Buku Pembantu Pajak); belanja per transaksi × akun.
export function bukuPembantu(data, dari, sampai, kolom) {
  const nota = notaSimakda(data)
  const awalTahun = saldoAwalTahun(data.baris, kolom)
  const baris = []
  nota.forEach((g) => g.baris.forEach((l) => {
    if (l.pajak) return
    const v = l[kolom]
    if (!v) return
    baris.push({ tanggal: g.tanggal, bnu: g.bnu, uraian: g.judul, masuk: Math.max(0, v), keluar: Math.max(0, -v) })
  }))
  const awal = awalTahun + jml(baris.filter((r) => r.tanggal < dari), (r) => r.masuk - r.keluar)
  let saldo = awal
  const isi = baris.filter((r) => r.tanggal >= dari && r.tanggal <= sampai).map((r) => { saldo += r.masuk - r.keluar; return { ...r, saldo } })
  return { awal, isi, masuk: jml(isi, (r) => r.masuk), keluar: jml(isi, (r) => r.keluar), akhir: saldo }
}

/* ---------------- 4. Buku Pembantu Pajak ---------------- */
export function bukuPajakSimakda(data, dari, sampai) {
  const nota = notaSimakda(data).filter((g) => g.baris.some((l) => l.pajak))
  const entri = nota.map((g) => ({
    tanggal: g.tanggal, bnu: g.bnu, judul: g.jenis === 'setor' ? `${g.judul}${g.ntpn ? `, NTPN: ${g.ntpn}` : ''}` : `Terima Pajak ${g.judul}`,
    baris: g.baris.filter((l) => l.pajak).map((l) => ({ label: `${l.pajak === 'terima' ? 'Terima' : 'Setor'} pajak${l.kodePajak ? ` - ${l.kodePajak}` : ''} - ${l.labelPajak}`, masuk: l.masuk, keluar: l.keluar, jenis: l.jenisPajak })),
  }))
  const awal = jml(entri.filter((e) => e.tanggal < dari).flatMap((e) => e.baris), (l) => l.masuk - l.keluar)
  let saldo = awal
  const isi = entri.filter((e) => e.tanggal >= dari && e.tanggal <= sampai).map((e) => ({ ...e, baris: e.baris.map((l) => { saldo += l.masuk - l.keluar; return { ...l, saldo } }) }))
  const semua = isi.flatMap((e) => e.baris)
  return { awal, isi, masuk: jml(semua, (l) => l.masuk), keluar: jml(semua, (l) => l.keluar), akhir: saldo }
}

/* ---------------- Anggaran & realisasi per akun ---------------- */
export function paguAkun(uraian = []) {
  const p = Object.fromEntries(AKUN_SIMAKDA.map((a) => [a.kode, 0]))
  uraian.forEach((u) => { p[akunDari(u.kode_rekening).kode] += Number(u.jumlah) || 0 })
  return p
}
/** Realisasi belanja per akun: { lalu, kini, sd } (lalu = sebelum dari) */
function realisasiAkun(nota, dari, sampai) {
  const r = Object.fromEntries(AKUN_SIMAKDA.map((a) => [a.kode, { lalu: 0, kini: 0, sd: 0 }]))
  nota.filter((g) => g.jenis === 'belanja' && g.tanggal <= sampai).forEach((g) => g.baris.filter((l) => l.akun).forEach((l) => {
    const x = r[l.akun]
    if (g.tanggal < dari) x.lalu += l.keluar; else x.kini += l.keluar
    x.sd += l.keluar
  }))
  return r
}

/* ---------------- 5. LPJ Bendahara Pengeluaran (SPJ Belanja BOS) ---------------- */
export function spjBelanjaSimakda(data, dari, sampai, { kodeKegiatan = '1.01.02.2.02.0042' } = {}) {
  const nota = notaSimakda(data)
  const pagu = paguAkun(data.uraian)
  const real = realisasiAkun(nota, dari, sampai)
  const akun = AKUN_SIMAKDA.filter((a) => pagu[a.kode] || real[a.kode].sd)
  const b = (kode, nama, daftar, tebal = true) => {
    const anggaran = jml(daftar, (a) => pagu[a.kode])
    const lalu = jml(daftar, (a) => real[a.kode].lalu), kini = jml(daftar, (a) => real[a.kode].kini)
    return { kode, nama, anggaran, lalu, kini, sd: lalu + kini, sisa: anggaran - lalu - kini, tebal }
  }
  const k = kodeKegiatan.split('.')
  const baris = [
    b('0.00.00.0.00.00.5', 'BELANJA DAERAH', akun),
    b(k.slice(0, 3).join('.'), 'PROGRAM PENGELOLAAN PENDIDIKAN', akun),
    b(k.slice(0, 5).join('.'), 'Pengelolaan Pendidikan Sekolah Menengah Pertama', akun),
    b(kodeKegiatan, 'Pengelolaan Dana BOS Sekolah Menengah Pertama', akun),
  ]
  const sudah = new Set()
  akun.forEach((a) => {
    a.induk.forEach(([kd, nm]) => {
      if (sudah.has(kd)) return
      sudah.add(kd)
      baris.push(b(`${kodeKegiatan}.${kd}`, nm, akun.filter((x) => x.awalan.startsWith(kd) || x.induk.some(([c]) => c === kd))))
    })
    baris.push(b(`${kodeKegiatan}.${a.kode}`, a.nama, [a], false))
  })
  const total = b('', 'Jumlah', akun)

  // Penerimaan & pengeluaran kas (lalu / kini / s.d.)
  const awalTahun = saldoAwalTahun(data.baris, 'bku')
  const t3 = (f) => {
    const lalu = jml(nota.filter((g) => g.tanggal < dari).flatMap((g) => g.baris.map((l) => ({ ...l, g }))), f)
    const kini = jml(nota.filter((g) => g.tanggal >= dari && g.tanggal <= sampai).flatMap((g) => g.baris.map((l) => ({ ...l, g }))), f)
    return { lalu, kini, sd: lalu + kini }
  }
  const pajakT = (arah, jenis) => t3((l) => (l.pajak === arah && (jenis === 'lain' ? !['PPN', 'PPh 21', 'PPh 22', 'PPh 23'].includes(l.jenisPajak) : l.jenisPajak === jenis) ? (arah === 'terima' ? l.masuk : l.keluar) : 0))
  const kasJenis = (jenis, arah) => t3((l) => (jenis.includes(l.g.jenisKas) ? (arah === 'masuk' ? l.masuk : l.keluar) : 0))
  const nol = { lalu: 0, kini: 0, sd: 0 }
  const tambah = (...xs) => ({ lalu: jml(xs, (x) => x.lalu), kini: jml(xs, (x) => x.kini), sd: jml(xs, (x) => x.sd) })
  const terimaPajak = [['a. PPN', pajakT('terima', 'PPN')], ['b. PPh - 21', pajakT('terima', 'PPh 21')], ['c. PPh - 22', pajakT('terima', 'PPh 22')], ['d. PPh - 23', pajakT('terima', 'PPh 23')]]
  const lainPajakT = pajakT('terima', 'lain')
  if (lainPajakT.sd) terimaPajak.push(['e. PPh Final 4 (2)', lainPajakT])
  const setorPajak = [['a. PPN', pajakT('setor', 'PPN')], ['b. PPh - 21', pajakT('setor', 'PPh 21')], ['c. PPh - 22', pajakT('setor', 'PPh 22')], ['d. PPh - 23', pajakT('setor', 'PPh 23')]]
  const lainPajakS = pajakT('setor', 'lain')
  if (lainPajakS.sd) setorPajak.push(['e. PPh Final 4 (2)', lainPajakS])
  const dana = kasJenis(['terima_dana'], 'masuk')
  const lainMasuk = kasJenis(['bunga', 'pengembalian'], 'masuk')
  const saldoLalu = { lalu: awalTahun, kini: 0, sd: awalTahun }
  const jumlahTerima = tambah(dana, ...terimaPajak.map((x) => x[1]), lainMasuk, saldoLalu)
  const spj = { lalu: total.lalu, kini: total.kini, sd: total.sd }
  const lainKeluar = kasJenis(['pajak_bunga', 'biaya_bank', 'lainnya_keluar'], 'keluar')
  const jumlahKeluar = tambah(spj, ...setorPajak.map((x) => x[1]), lainKeluar)
  const saldoKas = { lalu: jumlahTerima.lalu - jumlahKeluar.lalu, kini: jumlahTerima.kini - jumlahKeluar.kini, sd: jumlahTerima.sd - jumlahKeluar.sd }
  const kas = [
    { judul: 'Penerimaan', kepala: true },
    { judul: '- Pendapatan Dana Bos', ...dana }, { judul: '- Potongan Pajak', ...nol }, ...terimaPajak.map(([j, v]) => ({ judul: j, sub: true, ...v })),
    { judul: '- Lain-lain', ...lainMasuk }, { judul: '- Saldo Kas Tahun Lalu', ...saldoLalu },
    { judul: 'Jumlah Penerimaan', jumlah: true, ...jumlahTerima },
    { judul: 'Pengeluaran', kepala: true },
    { judul: '- SPJ/Realisasi Belanja', ...spj }, { judul: '- Penyetoran Pajak', ...nol }, ...setorPajak.map(([j, v]) => ({ judul: j, sub: true, ...v })),
    { judul: '- Lain-lain', ...lainKeluar },
    { judul: 'Jumlah Pengeluaraan', jumlah: true, ...jumlahKeluar },
    { judul: 'Saldo Kas', jumlah: true, ...saldoKas },
  ]
  return { baris, total, kas }
}

/* ---------------- 6. Buku Subrincian Objek ---------------- */
export function bukuObjekSimakda(data, dari, sampai, kodeAkun) {
  const nota = notaSimakda(data)
  const akun = AKUN_SIMAKDA.find((a) => a.kode === kodeAkun) || AKUN_SIMAKDA[0]
  const anggaran = paguAkun(data.uraian)[akun.kode]
  const baris = []
  nota.filter((g) => g.jenis === 'belanja').forEach((g) => g.baris.filter((l) => l.akun === akun.kode && l.keluar).forEach((l) => baris.push({ tanggal: g.tanggal, bnu: g.bnu, uraian: g.judul, realisasi: l.keluar })))
  let sisa = anggaran - jml(baris.filter((r) => r.tanggal < dari), (r) => r.realisasi)
  const awal = sisa
  const isi = baris.filter((r) => r.tanggal >= dari && r.tanggal <= sampai).map((r) => { sisa -= r.realisasi; return { ...r, sisa } })
  return { akun, anggaran, awal, isi, realisasi: jml(isi, (r) => r.realisasi), akhir: sisa }
}

/* ---------------- 7. Laporan Realisasi Penerimaan & Belanja ---------------- */
export function lrpbSimakda(data, dari, sampai) {
  const nota = notaSimakda(data)
  const pagu = paguAkun(data.uraian)
  const real = realisasiAkun(nota, dari, sampai)
  const totalPagu = jml(AKUN_SIMAKDA, (a) => pagu[a.kode])
  const danaLalu = jml(nota.filter((g) => g.jenisKas === 'terima_dana' && g.tanggal < dari).flatMap((g) => g.baris), (l) => l.masuk)
  const danaKini = jml(nota.filter((g) => g.jenisKas === 'terima_dana' && g.tanggal >= dari && g.tanggal <= sampai).flatMap((g) => g.baris), (l) => l.masuk)
  const r = (anggaran, lalu, kini) => ({ anggaran, lalu, kini, sd: lalu + kini, selisih: anggaran - lalu - kini })
  const nol = r(0, 0, 0)
  const empat = (nilai) => [['::Belanja BOSP Reguler', nilai], ['::Belanja BOSP Kinerja', nol], ['::Belanja Pendapatan Lainnya', nol], ['::Belanja Silpa', nol]]
  const akunR = (kode) => r(pagu[kode], real[kode].lalu, real[kode].kini)
  const modal = AKUN_SIMAKDA.filter((a) => a.jenis === 'modal' && (pagu[a.kode] || real[a.kode].sd))
  const terima = [['::BOSP Reguler', r(totalPagu, danaLalu, danaKini)], ['::BOSP Kinerja', nol], ['::Pendapatan Lainnya', nol]]
  const keluar = [
    { judul: 'a. Belanja Pegawai', baris: empat(nol) },
    { judul: 'b. Belanja Barang Dan Jasa', baris: empat(akunR('5.1.02.89.001.00001')) },
    { judul: 'c. Belanja Modal', baris: [] },
    ...modal.map((a, i) => ({ judul: `${i + 1}) ${a.induk[1][1].replace(/\b(dan)\b/g, 'Dan')}`, sub: true, baris: empat(akunR(a.kode)) })),
  ]
  const jumlah = (arr) => ({ anggaran: jml(arr, (x) => x.anggaran), lalu: jml(arr, (x) => x.lalu), kini: jml(arr, (x) => x.kini), sd: jml(arr, (x) => x.sd), selisih: jml(arr, (x) => x.selisih) })
  return { terima, jumlahTerima: jumlah(terima.map((x) => x[1])), keluar, jumlahKeluar: jumlah(keluar.flatMap((k) => k.baris.map((x) => x[1]))) }
}

/* ---------------- 8. SPTJM ---------------- */
export function sptjmSimakda(data, dari, sampai) {
  const nota = notaSimakda(data)
  const b = bkuSimakda(data, dari, sampai)
  const dalam = nota.filter((g) => g.tanggal >= dari && g.tanggal <= sampai)
  const dana = dalam.filter((g) => g.jenisKas === 'terima_dana')
  const tahapII = (g) => /tahap\s*(2|ii)\b/i.test(g.judul) || (!/tahap\s*(1|i)\b/i.test(g.judul) && (dariIso(g.tanggal)?.getMonth() ?? 0) >= 6)
  const tahap1 = jml(dana.filter((g) => !tahapII(g)).flatMap((g) => g.baris), (l) => l.masuk)
  const tahap2 = jml(dana.filter(tahapII).flatMap((g) => g.baris), (l) => l.masuk)
  const lain = jml(dalam.filter((g) => ['bunga', 'pengembalian'].includes(g.jenisKas)).flatMap((g) => g.baris), (l) => l.masuk)
  const belanjaL = dalam.filter((g) => g.jenis === 'belanja').flatMap((g) => g.baris).filter((l) => l.akun)
  const barang = jml(belanjaL.filter((l) => l.akunObj.jenis === 'barang'), (l) => l.keluar)
  const modal = jml(belanjaL.filter((l) => l.akunObj.jenis === 'modal'), (l) => l.keluar)
  const terima = tahap1 + tahap2 + lain
  const sisa = b.awal + terima - barang - modal
  return { awal: b.awal, tahap1, tahap2, lain, terima, pegawai: 0, barang, modal, belanja: barang + modal, sisa, tunai: b.kas.tunai, bank: sisa - b.kas.tunai }
}

/* ---------------- 9. Rekapitulasi Pembelian BMD ---------------- */
export function bmdSimakda(belanja = [], dari, sampai) {
  const grup = AKUN_SIMAKDA.filter((a) => a.jenis === 'modal').map((a) => ({ akun: a, item: [] }))
  belanja.filter((b) => b.status === 'lunas' && b.tgl_lunas >= dari && b.tgl_lunas <= sampai)
    .sort((a, b) => String(a.tgl_lunas).localeCompare(String(b.tgl_lunas)))
    .forEach((b) => (b.item || []).forEach((i) => {
      const g = grup.find((x) => String(i.kode_rekening || '').startsWith(x.akun.awalan))
      if (!g) return
      const jumlah = Number(i.jumlah) || (Number(i.volume) || 0) * (Number(i.harga) || 0)
      g.item.push({ nama: i.nama, volume: Number(i.volume) || 0, satuan: i.satuan || '', harga: Number(i.harga) || 0, jumlah })
    }))
  const isi = grup.filter((g) => g.item.length).map((g) => ({ ...g, total: jml(g.item, (i) => i.jumlah) }))
  return { isi, total: jml(isi, (g) => g.total) }
}
