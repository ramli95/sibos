// Migrasi transaksi dari workbook "Jurnal Dana BOS" (Google Sheets → unduh .xlsx).
// Kolom dikenali dari judulnya (bisa diubah di layar), lalu setiap baris sampul menjadi belanja Lunas
// lengkap dengan BNU, pajak (dari kolom pajak atau rincian penerima) dan setoran pajaknya.
import { uangKeAngka } from './koran'
import { rapikanItem, kelompokRekening, kategoriBelanja } from './belanja'
import { idPajak } from './pajak'
import { kategoriRekening } from './arkas'

export const BIDANG_TRANSAKSI = [
  { kunci: 'tanggal', judul: 'Tanggal lunas', wajib: true, sinonim: ['lunas bayar', 'tanggal lunas', 'tgl lunas', 'tanggal bayar', 'tgl bayar', 'tanggal bku', 'tanggal', 'tgl'] },
  { kunci: 'tgl_nota', judul: 'Tanggal nota', sinonim: ['tanggal nota', 'tgl nota', 'tanggal pesanan'] },
  { kunci: 'bnu', judul: 'No. Bukti (BNU)', sinonim: ['bku', 'bnu', 'no bukti', 'no. bukti', 'nomor bukti', 'no bku', 'nomor buku kas', 'no. bku'] },
  { kunci: 'kode', judul: 'Kode rekening', sinonim: ['kode rek.', 'kode rek', 'kode rekening', 'kd rek', 'rekening', 'kode'] },
  { kunci: 'kode_kegiatan', judul: 'Kode kegiatan', sinonim: ['kode kegiatan', 'kd kegiatan', 'kode keg'] },
  { kunci: 'uraian', judul: 'Uraian', wajib: true, sinonim: ['pembayaran', 'uraian pembayaran', 'uraian', 'nama pesanan', 'keterangan pembayaran', 'kegiatan'] },
  { kunci: 'penerima', judul: 'Penerima/rekanan', sinonim: ['penerima', 'kepada', 'rekanan', 'nama toko', 'toko', 'penyedia'] },
  { kunci: 'nilai', judul: 'Nilai (Rp)', wajib: true, sinonim: ['jumlah', 'nilai', 'nominal', 'banyaknya uang', 'jumlah uang', 'pengeluaran', 'total', 'terbilang'] },
  { kunci: 'snp', judul: 'SNP', sinonim: ['pengembangan snp', 'snp', 'standar'] },
  { kunci: 'ppn', judul: 'PPN', sinonim: ['ppn'] },
  { kunci: 'pph21', judul: 'PPh 21', sinonim: ['pph 21', 'pph21', 'pot. pph 21', 'pot pph 21'] },
  { kunci: 'pph22', judul: 'PPh 22', sinonim: ['pph 22', 'pph22'] },
  { kunci: 'pph23', judul: 'PPh 23', sinonim: ['pph 23', 'pph23'] },
  { kunci: 'pph42', judul: 'PPh 4(2)', sinonim: ['pph 4(2)', 'pph 4 ayat 2', 'pph final', 'pph4(2)'] },
  { kunci: 'tgl_setor', judul: 'Tanggal setor pajak', sinonim: ['tanggal setor', 'tgl setor', 'setor pajak'] },
  { kunci: 'ntpn', judul: 'NTPN', sinonim: ['ntpn'] },
  { kunci: 'ket', judul: 'Keterangan', sinonim: ['ket', 'keterangan', 'catatan'] },
]

export const BIDANG_PENERIMA = [
  { kunci: 'kode_transaksi', judul: 'Kode transaksi', sinonim: ['kode transaksi', 'kode trx', 'kode'] },
  { kunci: 'tanggal', judul: 'Tanggal lunas', wajib: true, sinonim: ['lunas bayar', 'tanggal lunas', 'tanggal bayar', 'tanggal'] },
  { kunci: 'kegiatan', judul: 'Kegiatan', sinonim: ['kegiatan', 'transaksi', 'uraian'] },
  { kunci: 'jenis', judul: 'Jenis (honor/transpor)', sinonim: ['jenis', 'transaksi'] },
  { kunci: 'nama', judul: 'Nama penerima', wajib: true, sinonim: ['nama penerima', 'nama'] },
  { kunci: 'nip', judul: 'NIP', sinonim: ['nip'] },
  { kunci: 'golongan', judul: 'Golongan', sinonim: ['gol', 'golongan', 'gol.'] },
  { kunci: 'status', judul: 'Status', sinonim: ['status', 'status kepegawaian'] },
  { kunci: 'jabatan', judul: 'Jabatan', sinonim: ['jabatan'] },
  { kunci: 'besaran', judul: 'Besaran/jumlah', wajib: true, sinonim: ['besaran', 'jumlah', 'honor', 'tarif'] },
  { kunci: 'volume', judul: 'Volume', sinonim: ['volume (jam)', 'volume', 'vol', 'qty'] },
  { kunci: 'satuan', judul: 'Satuan', sinonim: ['satuan'] },
  { kunci: 'pph21', judul: 'PPh 21', sinonim: ['pot. pph 21', 'pph 21', 'pph21', 'pot pph 21'] },
]

const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s ]+/g, ' ').replace(/[^a-z0-9.() /]/g, '').trim()

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
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Math.round(v)
  const s = String(v).replace(/rp/i, '').replace(/\s/g, '')
  if (!/\d/.test(s)) return 0
  return /[.,]\d{3}/.test(s) || /[.,]\d{1,2}$/.test(s) ? uangKeAngka(s) : Math.round(Number(s.replace(/[^\d-]/g, '')) || 0)
}
export function pecahKode(kode, kodeKeg) {
  const t = `${kodeKeg || ''} ${kode || ''}`
  const keg = t.match(/\b\d{2}\.\d{2}\.\d{2}\b/)?.[0] || ''
  const rek = t.match(/\b5\.\d(?:\.\d{1,2}){3,4}\.\d{3,4}\b/)?.[0] || t.match(/\b5(?:\.\d+){3,}\b/)?.[0] || ''
  return { kode_kegiatan: keg, kode_rekening: rek, kode_asli: String(kode || '').trim() }
}

/** Baris lembar → objek per bidang (melewati baris kosong/jumlah) */
export function ambilBaris(lembar, peta, barisJudul, bidang) {
  const hasil = []
  lembar.baris.slice(barisJudul + 1).forEach((r, i) => {
    const o = { _baris: barisJudul + i + 2 }
    bidang.forEach((b) => { if (peta[b.kunci] != null && peta[b.kunci] !== '') o[b.kunci] = r[Number(peta[b.kunci])] })
    const isi = bidang.filter((b) => b.wajib).every((b) => o[b.kunci] !== '' && o[b.kunci] != null)
    if (isi && !/^jumlah|^total/i.test(String(o.uraian || o.nama || ''))) hasil.push(o)
  })
  return hasil
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const PAJAK_KOLOM = [['ppn', 'PPN', 'pungut'], ['pph21', 'PPh 21', 'potong'], ['pph22', 'PPh 22', 'pungut'], ['pph23', 'PPh 23', 'potong'], ['pph42', 'PPh 4(2)', 'potong']]

/**
 * Susun paket migrasi.
 * transaksi: baris hasil ambilBaris (BIDANG_TRANSAKSI); penerima: baris BIDANG_PENERIMA (gabungan beberapa lembar)
 * penerimaan: [{ tanggal, uraian, nilai, bnu }]; ada: belanja yang sudah ada (non-migrasi) untuk deteksi ganda
 */
export function susunMigrasi({ transaksi, penerima = [], penerimaan = [], tahun, ada = [], opsi = {} }) {
  const { setorSama = true, siplahMitra = true, kaliVolume = true } = opsi
  const laporan = { lewat: [], ganda: [], tanpaBnu: 0, tanpaRekening: 0, honorCocok: 0, honorLepas: [] }
  const bnuAda = new Set(ada.filter((b) => b.sumber !== 'migrasi').flatMap((b) => Object.values(b.bnu || {}).map((x) => String(x).trim().toLowerCase())).filter(Boolean))

  // Kelompok penerima per kode transaksi / tanggal+kegiatan
  const grupPenerima = new Map()
  penerima.forEach((p) => {
    const tgl = keIsoTanggal(p.tanggal)
    if (!tgl.startsWith(String(tahun))) return
    const k = p.kode_transaksi ? `kode:${String(p.kode_transaksi).trim()}` : `tk:${tgl}|${norm(p.kegiatan)}`
    if (!grupPenerima.has(k)) grupPenerima.set(k, { tanggal: tgl, kegiatan: String(p.kegiatan || ''), jenis: String(p.jenis || p.kegiatan || ''), orang: [], dipakai: false })
    const besaran = keAngka(p.besaran)
    const volume = Number(String(p.volume ?? '').replace(',', '.')) || 1
    const bruto = kaliVolume ? Math.round(besaran * volume) : besaran
    const pph21 = keAngka(p.pph21)
    const st = String(p.status || '').toUpperCase()
    grupPenerima.get(k).orang.push({ sumber: 'pegawai', nama: String(p.nama).trim(), nip: String(p.nip || '').replace(/\D/g, ''), golongan: String(p.golongan || '').trim(), jabatan: String(p.jabatan || '').trim(),
      status_kepegawaian: /PPPK|P3K/.test(st) ? 'PPPK' : /PNS|ASN/.test(st) ? 'PNS' : st ? 'Honorer' : String(p.golongan || '').trim() ? 'PNS' : 'Honorer',
      besaran: kaliVolume ? besaran : bruto, volume: kaliVolume ? volume : 1, satuan: String(p.satuan || ''), bruto, tarif_pph21: bruto ? Math.round((pph21 / bruto) * 10000) / 100 : 0, alasan_pph21: 'Migrasi Jurnal Dana BOS', pph21, diterima: bruto - pph21 })
  })
  const grupList = [...grupPenerima.values()]

  const belanja = []
  const setoran = []
  const idPakai = new Set()
  transaksi.forEach((t, i) => {
    const tgl = keIsoTanggal(t.tanggal)
    const nilai = keAngka(t.nilai)
    if (!tgl || !tgl.startsWith(String(tahun))) { laporan.lewat.push({ baris: t._baris, alasan: tgl ? `tahun ${tgl.slice(0, 4)}` : 'tanggal kosong' }); return }
    if (!nilai) { laporan.lewat.push({ baris: t._baris, alasan: 'nilai kosong' }); return }
    const bnu = String(t.bnu ?? '').trim()
    const bnuTampil = bnu && /^\d+$/.test(bnu) ? `BNU ${bnu}` : bnu
    if (bnu && (bnuAda.has(bnu.toLowerCase()) || bnuAda.has(bnuTampil.toLowerCase()))) { laporan.ganda.push({ baris: t._baris, bnu: bnuTampil, uraian: t.uraian }); return }
    if (!bnu) laporan.tanpaBnu++
    const kode = pecahKode(t.kode, t.kode_kegiatan)
    if (!kode.kode_rekening) laporan.tanpaRekening++
    let id = `mig-${tahun}-${slug(bnu) || 'b' + (i + 1)}`
    while (idPakai.has(id)) id += '-x'
    idPakai.add(id)
    const uraian = String(t.uraian || '').replace(/\s+/g, ' ').trim()
    const siplah = /siplah/i.test(`${uraian} ${t.ket || ''}`)
    // Cari rincian penerima: kode transaksi = nomor sampul, atau tanggal sama & total bruto = nilai
    const cocok = grupList.find((g) => !g.dipakai && g.tanggal === tgl && g.orang.reduce((s, o) => s + o.bruto, 0) === nilai)
    if (cocok) { cocok.dipakai = true; laporan.honorCocok++ }
    const transpor = cocok && /transpor|transport/i.test(`${cocok.jenis} ${uraian}`)
    const item = [rapikanItem({ id: 'm1', nama: uraian.slice(0, 160) || 'Transaksi migrasi', jenis: cocok ? 'honor' : 'barang', volume: 1, satuan: 'paket', harga: nilai,
      kode_kegiatan: kode.kode_kegiatan, kode_rekening: kode.kode_rekening || kode.kode_asli || '-', uraian_rkas: '', kategori: kode.kode_rekening ? kategoriRekening(kode.kode_rekening) : 'operasional' })]
    const kunciGrup = kelompokRekening(item)[0].kunci
    const pajak = []
    PAJAK_KOLOM.forEach(([k, jenis, cara]) => { const v = keAngka(t[k]); if (v) pajak.push({ kunci: k, jenis, cara: siplah && siplahMitra && k !== 'pph21' ? 'mitra' : cara, dasar: null, tarif: null, nilai: v, ket: 'Migrasi Jurnal Dana BOS' }) })
    if (cocok && !pajak.some((p) => p.jenis === 'PPh 21')) { const v = cocok.orang.reduce((s, o) => s + o.pph21, 0); if (v) pajak.push({ kunci: 'pph21', jenis: 'PPh 21', cara: 'potong', dasar: null, tarif: null, nilai: v, ket: 'Dipotong dari penerima (migrasi)' }) }
    const b = {
      id, tahun: Number(tahun), sumber: 'migrasi', baris_sumber: t._baris, jenis: cocok ? 'honor' : 'pengadaan', cara: siplah ? 'siplah' : 'non_siplah',
      ...(cocok ? { jenis_honor: transpor ? 'transpor' : 'honor', penerima: cocok.orang, tgl_kegiatan: keIsoTanggal(t.tgl_nota) || tgl, uraian_honor: { kode_kegiatan: kode.kode_kegiatan, kode_rekening: kode.kode_rekening, uraian_rkas: uraian, harga_rkas: 0, kategori: item[0].kategori } } : {}),
      nama_pekerjaan: uraian.slice(0, 140), uraian_pembayaran: uraian, id_rekanan: null,
      rekanan: !cocok && t.penerima ? { nama_usaha: String(t.penerima).trim(), status_pkp: pajak.some((p) => p.jenis === 'PPN'), npwp: '' } : null,
      item, total: nilai, kategori: kategoriBelanja(item), status: 'lunas',
      tgl_pesanan: keIsoTanggal(t.tgl_nota) || tgl, tgl_terima: keIsoTanggal(t.tgl_nota) || tgl, tgl_lunas: tgl, tgl_kwitansi: tgl,
      bnu: bnuTampil ? { [kunciGrup]: bnuTampil } : {}, kode_asli: kode.kode_asli, snp_asli: String(t.snp || '').trim(), keterangan: String(t.ket || '').trim(),
      pajak, pajak_manual: true, dokumen: {}, nomor: {}, arsip: {}, jumlah_foto: 0, persen_lengkap: 0,
    }
    belanja.push(b)
    const disetor = pajak.filter((p) => p.cara !== 'mitra')
    if (setorSama && disetor.length) {
      const tglSetor = keIsoTanggal(t.tgl_setor) || tgl
      setoran.push({ id: `${id}-setor`, tahun: Number(tahun), sumber: 'migrasi', tanggal: tglSetor, masa: tglSetor.slice(0, 7), kode_billing: '', ntpn: String(t.ntpn || '').trim().toUpperCase(), bnu: '', dari: 'bank',
        jenis: disetor.map((p) => p.jenis).join(', '), total: disetor.reduce((s, p) => s + p.nilai, 0), butir: disetor.map((p) => ({ id_pajak: idPajak(id, p), id_belanja: id, jenis: p.jenis, nilai: p.nilai, no_bupot: '' })) })
    }
  })
  grupList.filter((g) => !g.dipakai).forEach((g) => laporan.honorLepas.push({ tanggal: g.tanggal, kegiatan: g.kegiatan, total: g.orang.reduce((s, o) => s + o.bruto, 0), orang: g.orang.length }))

  const kas = penerimaan.filter((p) => keIsoTanggal(p.tanggal) && keAngka(p.nilai)).map((p, i) => ({
    id: `mig-${tahun}-kas-${i + 1}`, tahun: Number(tahun), sumber: 'migrasi', sumber_data: 'migrasi', tanggal: keIsoTanggal(p.tanggal), jenis: p.jenis || 'terima_dana', bnu: String(p.bnu || '').trim(), uraian: String(p.uraian || '').trim(), nilai: keAngka(p.nilai),
  }))
  return { belanja, kas, setoran, laporan }
}

/** Angka ringkasan di lembar "X ARKAS"/"SIMAKDA" (baris pertama: diterima, belanja, sisa) */
export function angkaRingkasan(lembar) {
  for (const r of lembar.baris.slice(0, 5)) {
    const angka = r.filter((v) => typeof v === 'number' || /rp|\d[.,]\d{3}/i.test(String(v ?? ''))).map(keAngka).filter((n) => n > 1000)
    if (angka.length >= 3) return { diterima: angka[0], belanja: angka[1], sisa: angka[2] }
  }
  return null
}
