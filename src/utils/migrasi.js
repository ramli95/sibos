// Migrasi transaksi dari workbook "Jurnal Dana BOS" (Google Sheets → unduh .xlsx).
// Sumber utama: lembar buku kas (🏆 SIMAKDA / X ARKAS: Lunas Bayar, Kegiatan, Pemasukan, Pengeluaran, PPN/PPh ✓).
// Pelengkap: 📈 TAX (nilai pajak & siapa yang menyetor), 🧮 dB_Trima & 🧮 dB_Honor (rincian penerima honor/transpor).
// Kolom dikenali dari judulnya dan bisa diubah di layar. Hasil: belanja Lunas + pajak + setoran + baris kas penerimaan.
import { uangKeAngka } from './koran'
import { rapikanItem, kelompokRekening, kategoriBelanja } from './belanja'
import { idPajak, ptkpDari } from './pajak'
import { kategoriRekening } from './arkas'

export const BIDANG_TRANSAKSI = [
  { kunci: 'tanggal', judul: 'Tanggal lunas/BKU', wajib: true, sinonim: ['lunas bayar', 'tanggal lunas', 'tgl lunas', 'tanggal bayar', 'tgl bayar', 'tanggal bku', 'tanggal', 'tgl'] },
  { kunci: 'tgl_nota', judul: 'Tanggal transaksi/nota', sinonim: ['tanggal transaksi', 'tanggal nota', 'tgl nota', 'tanggal pesanan'] },
  { kunci: 'bnu', judul: 'No. Bukti (BNU)', sinonim: ['no. bukti', 'no bukti', 'nomor bukti', 'bku', 'bnu', 'no bku', 'nomor buku kas', 'no. bku'] },
  { kunci: 'kode', judul: 'Kode rekening', sinonim: ['no. kode', 'no kode', 'kode rek.', 'kode rek', 'kode rekening', 'kd rek', 'rekening', 'kode'] },
  { kunci: 'kode_kegiatan', judul: 'Kode kegiatan', sinonim: ['kode kegiatan', 'kd kegiatan', 'kode keg'] },
  { kunci: 'uraian', judul: 'Uraian/kegiatan', wajib: true, sinonim: ['kegiatan', 'pembayaran', 'uraian pembayaran', 'uraian', 'nama pesanan', 'keterangan pembayaran'] },
  { kunci: 'penerima', judul: 'Penerima/rekanan', sinonim: ['penerima', 'kepada', 'rekanan', 'nama toko', 'toko', 'penyedia'] },
  { kunci: 'pemasukan', judul: 'Pemasukan (Rp)', sinonim: ['pemasukan', 'penerimaan', 'debet', 'masuk'] },
  { kunci: 'nilai', judul: 'Pengeluaran (Rp)', wajib: true, sinonim: ['pengeluaran', 'jumlah', 'nilai', 'nominal', 'banyaknya uang', 'jumlah uang', 'total', 'terbilang', 'kredit'] },
  { kunci: 'snp', judul: 'SNP', sinonim: ['pengembangan snp', 'snp', 'standar'] },
  { kunci: 'ppn', judul: 'PPN (nilai atau ✓)', sinonim: ['ppn', 'ppn 11%'] },
  { kunci: 'pph21', judul: 'PPh 21 (nilai atau ✓)', sinonim: ['pph 21', 'pph21', 'pot. pph 21', 'pot pph 21'] },
  { kunci: 'pph23', judul: 'PPh 23 (nilai atau ✓)', sinonim: ['pph 23', 'pph23'] },
  { kunci: 'ket', judul: 'Keterangan', sinonim: ['ket', 'keterangan', 'catatan'] },
]

export const BIDANG_PAJAK = [
  { kunci: 'tanggal', judul: 'Tanggal', wajib: true, sinonim: ['tanggal', 'tgl', 'lunas bayar'] },
  { kunci: 'uraian', judul: 'Kegiatan', wajib: true, sinonim: ['kegiatan/operasional/peruntukkan', 'kegiatan', 'uraian', 'peruntukkan'] },
  { kunci: 'jenis', judul: 'Jenis (jasa/konsumsi/honor)', sinonim: ['keyword', 'jenis'] },
  { kunci: 'cek', judul: 'Sudah disetor (✓)', sinonim: ['cek up', 'cek', 'disetor', 'status'] },
  { kunci: 'dasar', judul: 'Harga/biaya', sinonim: ['harga/biaya', 'harga', 'biaya', 'dpp'] },
  { kunci: 'ppn', judul: 'PPN (Rp)', sinonim: ['ppn 11%', 'ppn'], nilai: true },
  { kunci: 'pph21', judul: 'PPh 21 (Rp)', sinonim: ['pph 21 5%/6%', 'pph 21', 'pph21'], nilai: true },
  { kunci: 'pph23', judul: 'PPh 23 (Rp)', sinonim: ['pph 23', 'pph23'], nilai: true },
  { kunci: 'ket', judul: 'Keterangan (siapa menyetor)', sinonim: ['keterangan', 'ket'] },
]

export const BIDANG_PENERIMA = [
  { kunci: 'kode_transaksi', judul: 'Kode transaksi', sinonim: ['kode transaksi', 'kode trx', 'kode'] },
  { kunci: 'tanggal', judul: 'Tanggal lunas', wajib: true, sinonim: ['lunas bayar', 'tanggal lunas', 'tanggal bayar', 'tanggal'] },
  { kunci: 'kegiatan', judul: 'Kegiatan', sinonim: ['kegiatan', 'uraian'] },
  { kunci: 'jenis', judul: 'Jenis (honor/transpor)', sinonim: ['jenis', 'periode'] },
  { kunci: 'nama', judul: 'Nama penerima', wajib: true, sinonim: ['nama penerima', 'nama'] },
  { kunci: 'nip', judul: 'NIP', sinonim: ['nip'] },
  { kunci: 'golongan', judul: 'Golongan', sinonim: ['gol', 'golongan', 'gol.'] },
  { kunci: 'status', judul: 'Status', sinonim: ['status', 'status kepegawaian'] },
  { kunci: 'jabatan', judul: 'Jabatan', sinonim: ['jabatan'] },
  { kunci: 'harga', judul: 'Besaran per satuan', sinonim: ['jumlah', 'satuan', 'tarif', 'honor'] },
  { kunci: 'volume', judul: 'Volume', sinonim: ['volume (jam)', 'volume', 'vol', 'qty'] },
  { kunci: 'bruto', judul: 'Jumlah bruto (total)', sinonim: ['besaran', 'bruto', 'total', 'jumlah bruto'] },
  { kunci: 'pph21', judul: 'PPh 21', sinonim: ['pot. pph 21', 'pph 21', 'pph21', 'pot pph 21'] },
]

const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s ]+/g, ' ').replace(/[^a-z0-9.()% /]/g, '').trim()

/** Cari baris judul (skor terbanyak) di 15 baris pertama → { baris, peta: { kunci: indeksKolom } } */
export function kenaliKolom(baris, bidang) {
  let terbaik = { skor: 0, baris: 0, peta: {} }
  baris.slice(0, 15).forEach((r, i) => {
    const sel = r.map(norm)
    const peta = {}
    const dipakai = new Set()
    bidang.forEach((b) => {
      let k = -1
      for (const s of b.sinonim) { k = sel.findIndex((x, j) => !dipakai.has(j) && x === s); if (k >= 0) break }
      if (k < 0) for (const s of b.sinonim) { if (s.length < 4) continue; k = sel.findIndex((x, j) => !dipakai.has(j) && x.includes(s)); if (k >= 0) break }
      if (k >= 0) { peta[b.kunci] = k; dipakai.add(k) }
    })
    const skor = Object.keys(peta).length
    if (skor > terbaik.skor) terbaik = { skor, baris: i, peta }
  })
  // Kolom nilai pajak yang judulnya di atas kolom tarif (mis. "PPh 21 5%/6%" berisi 0,05 lalu nilai di kolom sebelahnya)
  bidang.filter((b) => b.nilai && terbaik.peta[b.kunci] != null).forEach((b) => {
    const k = terbaik.peta[b.kunci]
    const contoh = baris.slice(terbaik.baris + 1, terbaik.baris + 40).map((r) => r[k]).filter((v) => typeof v === 'number')
    const sebelah = baris.slice(terbaik.baris + 1, terbaik.baris + 40).map((r) => r[k + 1]).filter((v) => typeof v === 'number')
    if (contoh.length && Math.max(...contoh) <= 1 && sebelah.some((v) => v > 1)) terbaik.peta[b.kunci] = k + 1
  })
  return terbaik
}

export function keIsoTanggal(v) {
  if (v == null || v === '') return ''
  if (v instanceof Date && !isNaN(v)) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return keIsoTanggal(d) }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (m) { const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` }
  const BLN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember']
  m = s.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})/)
  if (m) { const b = BLN.findIndex((x) => x.startsWith(m[2].slice(0, 3))); if (b >= 0) return `${m[3]}-${String(b + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}` }
  return ''
}
export function keAngka(v) {
  if (v == null || v === '' || typeof v === 'boolean') return 0
  if (typeof v === 'number') return Math.round(v)
  const s = String(v).replace(/rp/i, '').replace(/\s/g, '')
  if (!/\d/.test(s)) return 0
  return /[.,]\d{3}/.test(s) || /[.,]\d{1,2}$/.test(s) ? uangKeAngka(s) : Math.round(Number(s.replace(/[^\d-]/g, '')) || 0)
}
const centang = (v) => v === true || /^(true|ya|y|✓|v|x|1)$/i.test(String(v ?? '').trim())
export function pecahKode(kode, kodeKeg) {
  const t = `${kodeKeg || ''} ${kode || ''}`
  const keg = t.match(/\b\d{2}\.\d{2}\.\d{2}\b/)?.[0] || ''
  const rek = t.match(/\b5\.\d(?:\.\d{1,2}){3,4}\.\d{3,4}\b/)?.[0] || t.match(/\b5(?:\.\d+){3,}\b/)?.[0] || ''
  return { kode_kegiatan: keg, kode_rekening: rek, kode_asli: String(kode || '').trim() }
}

/** Baris lembar → objek per bidang (melewati baris kosong/jumlah). isiKebawah: kolom sel gabung diisi dari baris di atasnya */
export function ambilBaris(lembar, peta, barisJudul, bidang, { isiKebawah = [] } = {}) {
  const hasil = []
  const terakhir = {}
  lembar.baris.slice(barisJudul + 1).forEach((r, i) => {
    const o = { _baris: barisJudul + i + 2 }
    bidang.forEach((b) => { if (peta[b.kunci] != null && peta[b.kunci] !== '') o[b.kunci] = r[Number(peta[b.kunci])] })
    isiKebawah.forEach((k) => { if (o[k] === '' || o[k] == null) o[k] = terakhir[k]; else terakhir[k] = o[k] })
    const isi = bidang.filter((b) => b.wajib).every((b) => o[b.kunci] !== '' && o[b.kunci] != null)
    if (isi && !/^jumlah|^total/i.test(String(o.uraian || o.nama || ''))) hasil.push(o)
  })
  return hasil
}

/* ---------------- Kemiripan teks ---------------- */
const KATA_UMUM = new Set(['biaya', 'bayar', 'pembayaran', 'pembelian', 'untuk', 'dan', 'dalam', 'tahun', 'bulan', 'sekolah', 'jasa', 'kegiatan', 'yang', 'dari', 'pada', 'upt', 'spf', 'smp', 'negeri', 'makassar', '2025', '2026'])
const token = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !KATA_UMUM.has(w)))
export function mirip(a, b) {
  const x = token(a), y = token(b)
  if (!x.size || !y.size) return 0
  let sama = 0
  x.forEach((w) => { if (y.has(w)) sama++ })
  return (2 * sama) / (x.size + y.size)
}
const selisihHari = (a, b) => Math.abs((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000)

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const JENIS_PENERIMAAN = (u) => (/bunga|jasa giro/i.test(u) ? 'bunga' : /saldo awal|sisa/i.test(u) ? 'saldo_awal' : /kembali|koreksi|retur/i.test(u) ? 'pengembalian' : 'terima_dana')

/** Kelompokkan rincian penerima per transaksi (angka depan kode "3.2" → transaksi 3), per lembar */
function kelompokPenerima(sumber, tahun) {
  const grup = []
  sumber.forEach(({ nama: lembar, baris }) => {
    const peta = new Map()
    baris.forEach((p) => {
      const tgl = keIsoTanggal(p.tanggal)
      if (!tgl.startsWith(String(tahun))) return
      const no = String(p.kode_transaksi ?? '').split('.')[0].trim()
      const k = no ? `${lembar}#${no}` : `${lembar}#${tgl}|${norm(p.kegiatan)}`
      if (!peta.has(k)) peta.set(k, { kunci: k, lembar, tanggal: tgl, kegiatan: String(p.kegiatan || ''), jenis: String(p.jenis || ''), orang: [], dipakai: false })
      const g = peta.get(k)
      if (!g.kegiatan && p.kegiatan) g.kegiatan = String(p.kegiatan)
      if (!g.jenis && p.jenis) g.jenis = String(p.jenis)
      const harga = keAngka(p.harga)
      const volume = Number(String(p.volume ?? '').replace(',', '.')) || 1
      const bruto = keAngka(p.bruto) || Math.round(harga * volume)
      const pph21 = keAngka(p.pph21)
      const st = String(p.status || '').toUpperCase()
      const gol = String(p.golongan || '').trim()
      const pppk = /^(V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII)$/i.test(gol)
      g.orang.push({
        sumber: 'pegawai', nama: String(p.nama).trim(), nip: String(p.nip || '').replace(/\D/g, ''), golongan: gol, jabatan: String(p.jabatan || '').trim(),
        status_kepegawaian: /PPPK|P3K/.test(st) || pppk ? 'PPPK' : /PNS|ASN/.test(st) || /^(I|II|III|IV)[./]?[a-e]?$/i.test(gol) ? 'PNS' : 'Honorer',
        besaran: harga || bruto, volume: harga ? volume : 1, satuan: '', bruto, tarif_pph21: bruto ? Math.round((pph21 / bruto) * 10000) / 100 : 0, pph21_manual: true,
        alasan_pph21: 'Migrasi Jurnal Dana BOS', pph21, diterima: bruto - pph21,
      })
    })
    grup.push(...peta.values())
  })
  return grup
}

/**
 * Susun paket migrasi.
 * transaksi: baris BIDANG_TRANSAKSI; pajak: baris BIDANG_PAJAK; penerima: [{ nama: lembar, baris }] BIDANG_PENERIMA
 * penerimaan: baris kas tambahan manual; ada: belanja yang sudah ada (non-migrasi) untuk deteksi ganda
 */
export function susunMigrasi({ transaksi, pajak = [], penerima = [], penerimaan = [], tahun, ada = [], opsi = {} }) {
  const { setorSama = true } = opsi
  const laporan = { lewat: [], ganda: [], tanpaBnu: 0, tanpaRekening: 0, honorCocok: 0, honorLepas: [], pajakCocok: 0, pajakLepas: [], penerimaan: 0 }
  const bnuAda = new Set(ada.filter((b) => b.sumber !== 'migrasi').flatMap((b) => Object.values(b.bnu || {}).map((x) => String(x).trim().toLowerCase())).filter(Boolean))
  const grupList = kelompokPenerima(penerima, tahun)
  const pajakList = pajak.map((p) => ({ ...p, tgl: keIsoTanggal(p.tanggal), dipakai: false })).filter((p) => p.tgl.startsWith(String(tahun)))

  const belanja = []
  const setoran = []
  const kas = []
  const idPakai = new Set()
  transaksi.forEach((t, i) => {
    const tgl = keIsoTanggal(t.tanggal)
    const masuk = keAngka(t.pemasukan)
    const nilai = keAngka(t.nilai)
    const uraian = String(t.uraian || '').replace(/\s+/g, ' ').trim()
    if (!tgl || !tgl.startsWith(String(tahun))) { if (nilai || masuk) laporan.lewat.push({ baris: t._baris, alasan: tgl ? `tahun ${tgl.slice(0, 4)}` : 'tanggal kosong' }); return }
    if (masuk && !nilai) {
      kas.push({ id: `mig-${tahun}-kas-${t._baris}`, tahun: Number(tahun), sumber: 'migrasi', sumber_data: 'migrasi', tanggal: tgl, jenis: JENIS_PENERIMAAN(uraian), bnu: String(t.bnu ?? '').trim(), uraian, nilai: masuk })
      laporan.penerimaan += masuk
      return
    }
    if (!nilai) return
    const bnu = String(t.bnu ?? '').trim()
    const bnuTampil = bnu && /^\d+$/.test(bnu) ? `BNU ${bnu}` : bnu
    if (bnu && (bnuAda.has(bnu.toLowerCase()) || bnuAda.has(bnuTampil.toLowerCase()))) { laporan.ganda.push({ baris: t._baris, bnu: bnuTampil, uraian }); return }
    if (!bnu) laporan.tanpaBnu++
    const kode = pecahKode(t.kode, t.kode_kegiatan)
    if (!kode.kode_rekening) laporan.tanpaRekening++
    let id = `mig-${tahun}-${slug(bnu) || 'r' + t._baris}`
    while (idPakai.has(id)) id += '-x'
    idPakai.add(id)

    // Rincian penerima: jumlah bruto sama, tanggal ±7 hari, uraian paling mirip
    const cocok = grupList.filter((g) => !g.dipakai && g.orang.reduce((s, o) => s + o.bruto, 0) === nilai && selisihHari(g.tanggal, tgl) <= 7)
      .sort((a, b) => mirip(b.kegiatan, uraian) - mirip(a.kegiatan, uraian) || selisihHari(a.tanggal, tgl) - selisihHari(b.tanggal, tgl))[0] || null
    if (cocok) { cocok.dipakai = true; laporan.honorCocok++ }
    // Baris pajak (📈 TAX): uraian mirip & tanggal ±10 hari
    const pj = pajakList.filter((p) => !p.dipakai && selisihHari(p.tgl, tgl) <= 10 && mirip(p.uraian, uraian) >= 0.6)
      .sort((a, b) => mirip(b.uraian, uraian) - mirip(a.uraian, uraian))[0] || null
    if (pj) { pj.dipakai = true; laporan.pajakCocok++ }

    const ketPajak = String(pj?.ket || '')
    const siplah = /siplah/i.test(`${ketPajak} ${uraian} ${t.ket || ''}`) || (centang(t.ppn) && !pj)
    const caraPajak = /siplah/i.test(ketPajak) ? 'mitra' : /rekanan/i.test(ketPajak) ? null : pj ? 'luar' : null
    const transpor = cocok && /transpor|transport/i.test(`${cocok.jenis} ${cocok.kegiatan} ${uraian}`)
    const jenisItem = cocok ? 'honor' : /konsumsi|makan|snack/i.test(`${pj?.jenis || ''} ${uraian}`) ? 'konsumsi' : /jasa|sewa|service|servis|pemeliharaan|perbaikan|honor/i.test(`${pj?.jenis || ''} ${uraian}`) ? 'jasa' : 'barang'
    const item = [rapikanItem({ id: 'm1', nama: uraian.slice(0, 160) || 'Transaksi migrasi', jenis: jenisItem, volume: 1, satuan: 'paket', harga: nilai,
      kode_kegiatan: kode.kode_kegiatan, kode_rekening: kode.kode_rekening || kode.kode_asli || '-', uraian_rkas: '', kategori: kode.kode_rekening ? kategoriRekening(kode.kode_rekening) : 'operasional' })]
    const kunciGrup = kelompokRekening(item)[0].kunci

    const pajakB = []
    const tambah = (kunci, jenis, v, cara) => { if (v > 0) pajakB.push({ kunci, jenis, cara, dasar: keAngka(pj?.dasar) || null, tarif: null, nilai: v, ket: `Migrasi Jurnal Dana BOS${ketPajak ? ` — ${ketPajak}` : ''}` }) }
    if (pj) {
      tambah('ppn', 'PPN', keAngka(pj.ppn), caraPajak || 'pungut')
      tambah('pph21', 'PPh 21', keAngka(pj.pph21), caraPajak === 'mitra' ? 'luar' : caraPajak || 'potong')
      tambah('pph23', 'PPh 23', keAngka(pj.pph23), caraPajak || 'potong')
    } else {
      // nilai pajak langsung di lembar transaksi (bila berupa angka, bukan centang)
      ;[['ppn', 'PPN', 'pungut'], ['pph21', 'PPh 21', 'potong'], ['pph23', 'PPh 23', 'potong']].forEach(([k, j, c]) => { const v = keAngka(t[k]); if (v > 1) tambah(k, j, v, siplah && k !== 'pph21' ? 'mitra' : c) })
    }
    if (cocok && !pajakB.some((p) => p.jenis === 'PPh 21')) { const v = cocok.orang.reduce((s, o) => s + o.pph21, 0); if (v) tambah('pph21', 'PPh 21', v, 'potong') }

    const b = {
      id, tahun: Number(tahun), sumber: 'migrasi', baris_sumber: t._baris, jenis: cocok ? 'honor' : 'pengadaan', cara: siplah && !cocok ? 'siplah' : 'non_siplah',
      ...(cocok ? { jenis_honor: transpor ? 'transpor' : /honor bulanan|ptt|pegawai tidak tetap/i.test(`${cocok.kegiatan} ${uraian}`) ? 'honor' : /narasumber|pemateri/i.test(uraian) ? 'narasumber' : 'insentif',
        penerima: cocok.orang.map((o) => ({ ...o, ptkp: ptkpDari(o) })), tgl_kegiatan: keIsoTanggal(t.tgl_nota) || tgl,
        uraian_honor: { kode_kegiatan: kode.kode_kegiatan, kode_rekening: item[0].kode_rekening, uraian_rkas: uraian, harga_rkas: 0, kategori: item[0].kategori } } : {}),
      nama_pekerjaan: uraian.slice(0, 140), uraian_pembayaran: uraian, id_rekanan: null,
      rekanan: !cocok && t.penerima ? { nama_usaha: String(t.penerima).trim(), status_pkp: pajakB.some((p) => p.jenis === 'PPN'), npwp: '' } : null,
      item, total: nilai, kategori: kategoriBelanja(item), status: 'lunas',
      tgl_pesanan: keIsoTanggal(t.tgl_nota) || tgl, tgl_terima: keIsoTanggal(t.tgl_nota) || tgl, tgl_lunas: tgl, tgl_kwitansi: tgl,
      bnu: bnuTampil ? { [kunciGrup]: bnuTampil } : {}, kode_asli: kode.kode_asli, snp_asli: String(t.snp || '').trim(), keterangan: String(t.ket || '').trim(),
      tanda_pajak: { ppn: centang(t.ppn), pph21: centang(t.pph21), pph23: centang(t.pph23) },
      pajak: pajakB, pajak_manual: true, dokumen: {}, nomor: {}, arsip: {}, jumlah_foto: 0, persen_lengkap: 0,
    }
    belanja.push(b)
    // Setoran: pajak yang lewat rekening (dipungut dari rekanan) & yang disetor sekolah dari luar rekening BOSP
    const lewatBank = pajakB.filter((p) => p.cara === 'pungut' || p.cara === 'potong')
    const luar = pajakB.filter((p) => p.cara === 'luar')
    const sudah = !pj || centang(pj.cek)
    if (setorSama && sudah) {
      ;[[lewatBank, 'bank'], [luar, 'luar']].forEach(([arr, dari]) => {
        if (!arr.length) return
        setoran.push({ id: `${id}-setor${dari === 'luar' ? '-luar' : ''}`, tahun: Number(tahun), sumber: 'migrasi', tanggal: tgl, masa: tgl.slice(0, 7), kode_billing: '', ntpn: '', bnu: '', dari,
          jenis: arr.map((p) => p.jenis).join(', '), total: arr.reduce((s, p) => s + p.nilai, 0), butir: arr.map((p) => ({ id_pajak: idPajak(id, p), id_belanja: id, jenis: p.jenis, nilai: p.nilai, no_bupot: '' })) })
      })
    }
  })
  grupList.filter((g) => !g.dipakai).forEach((g) => laporan.honorLepas.push({ tanggal: g.tanggal, kegiatan: g.kegiatan, total: g.orang.reduce((s, o) => s + o.bruto, 0), orang: g.orang.length, lembar: g.lembar }))
  pajakList.filter((p) => !p.dipakai).forEach((p) => laporan.pajakLepas.push({ tanggal: p.tgl, uraian: p.uraian, nilai: keAngka(p.ppn) + keAngka(p.pph21) + keAngka(p.pph23) }))

  penerimaan.filter((p) => keIsoTanggal(p.tanggal) && keAngka(p.nilai)).forEach((p, i) => kas.push({
    id: `mig-${tahun}-kasm-${i + 1}`, tahun: Number(tahun), sumber: 'migrasi', sumber_data: 'migrasi', tanggal: keIsoTanggal(p.tanggal), jenis: p.jenis || 'terima_dana', bnu: String(p.bnu || '').trim(), uraian: String(p.uraian || '').trim(), nilai: keAngka(p.nilai),
  }))
  return { belanja, kas, setoran, laporan }
}

/** Angka ringkasan di baris atas lembar "X ARKAS"/"SIMAKDA" (diterima, belanja, sisa) */
export function angkaRingkasan(lembar) {
  for (const r of lembar.baris.slice(0, 5)) {
    const angka = r.filter((v) => typeof v === 'number' || /rp|\d[.,]\d{3}/i.test(String(v ?? ''))).map(keAngka).filter((n) => n > 1000)
    if (angka.length >= 3) return { diterima: angka.at(-3), belanja: angka.at(-2), sisa: angka.at(-1) }
  }
  return null
}
