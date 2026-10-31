// Menyusun isi Paket SPJ satu transaksi menjadi daftar halaman berurutan:
// 1 Kwitansi Besar · 2 Kwitansi Kecil · 3 Pemesanan (perencanaan, pembandingan, negosiasi, SP) · 4 Proforma & Invoice
// 5 SHP & BAST · 6 Lampiran Foto · 7 Daftar penerimaan/hadir (penerimaan honor & transpor mendatar)
import { DOKUMEN } from '@/config/belanja'
import { dokumenTransaksi, kelompokRekening } from '@/utils/belanja'
import { namaOrang } from '@/utils/dokumenSpj'
import DokKwitansiBesar from './DokKwitansiBesar.vue'
import DokSampul from './DokSampul.vue'
import DokKwitansiKecil from './DokKwitansiKecil.vue'
import DokPerencanaan from './DokPerencanaan.vue'
import DokPembandingan from './DokPembandingan.vue'
import DokNegosiasi from './DokNegosiasi.vue'
import DokSuratPesanan from './DokSuratPesanan.vue'
import DokTagihan from './DokTagihan.vue'
import DokShp from './DokShp.vue'
import DokBast from './DokBast.vue'
import DokFoto from './DokFoto.vue'
import DokDaftarHadir from './DokDaftarHadir.vue'
import DokPenerimaKonsumsi from './DokPenerimaKonsumsi.vue'
import DokPenerimaanHonor from './DokPenerimaanHonor.vue'
import DokNotulen from './DokNotulen.vue'

/** Kwitansi besar per BNU: transaksi lain dengan BNU sama ikut digabung */
export function grupKwitansiBesar(b, semua = []) {
  const grup = new Map()
  kelompokRekening(b.item || []).forEach((g) => {
    const bnu = String(b.bnu?.[g.kunci] || '').trim()
    const kunci = bnu ? `bnu:${bnu.toLowerCase()}` : `rek:${g.kunci}`
    if (!grup.has(kunci)) grup.set(kunci, { bnu, baris: [], dari: new Set(), pajak: [] })
    if (!bnu) grup.get(kunci).baris.push({ uraian: b.nama_pekerjaan, kode_kegiatan: g.kode_kegiatan, kode_rekening: g.kode_rekening, jumlah: g.jumlah })
  })
  grup.forEach((x) => {
    if (!x.bnu) { x.dari.add(b.id); return }
    const daftar = [b, ...semua.filter((y) => y.id !== b.id)]
    daftar.forEach((y) => kelompokRekening(y.item || []).forEach((g) => {
      if (String(y.bnu?.[g.kunci] || '').trim().toLowerCase() !== x.bnu.toLowerCase()) return
      x.baris.push({ uraian: y.nama_pekerjaan, kode_kegiatan: g.kode_kegiatan, kode_rekening: g.kode_rekening, jumlah: g.jumlah })
      x.dari.add(y.id)
    }))
  })
  // Pajak: dari transaksi yang tergabung (dijumlah per jenis)
  grup.forEach((x) => {
    const per = new Map()
    ;[b, ...semua].filter((y, i, a) => x.dari.has(y.id) && a.findIndex((z) => z.id === y.id) === i).forEach((y) => (y.pajak || []).forEach((p) => {
      const lama = per.get(p.jenis) || { jenis: p.jenis, tarif: p.tarif, nilai: 0 }
      lama.nilai += p.nilai || 0
      per.set(p.jenis, lama)
    }))
    // Bila kwitansi hanya sebagian rekening transaksi, pajak ditampilkan proporsional
    const totalB = b.total || 1
    const porsi = x.dari.size === 1 ? x.baris.reduce((s, r) => s + r.jumlah, 0) / totalB : 1
    x.pajak = [...per.values()].map((p) => ({ ...p, nilai: Math.round(p.nilai * porsi) }))
  })
  return [...grup.values()]
}

/** Daftar dokumen yang bisa dipilih di jendela paket (kunci + judul + ikon) */
export function pilihanPaket(b, foto = []) {
  return dokumenTransaksi(b).filter((k) => DOKUMEN[k] && (k !== 'foto' || foto.length))
    .sort((a, c) => DOKUMEN[a].urutan - DOKUMEN[c].urutan)
    .map((k) => ({ kunci: k, judul: k === 'tanda_terima_transpor' && b.jenis_honor === 'transpor' ? 'Tanda Terima Transpor' : DOKUMEN[k].judul, ikon: DOKUMEN[k].ikon }))
}

/**
 * Halaman paket. opsi: { k (konteks), profil, foto, semua (belanja setahun), pegawai, namaKeg, namaRek, pilih: Set kunci }
 * Hasil: [{ kunci, judul, mendatar, komponen, props }]
 */
export function susunPaket(b, o) {
  const pilih = o.pilih
  const ada = (k) => pilih.has(k)
  const dasar = { b, k: o.k, profil: o.profil }
  const h = []
  const grup = grupKwitansiBesar(b, o.semua)
  if (ada('sampul')) grup.forEach((g, i) =>
    h.push({ kunci: 'sampul', judul: `Sampul${g.bnu ? ' ' + g.bnu : ''}`, komponen: DokSampul, props: { b, k: o.k, grup: g, namaKeg: o.namaKeg }, id: `s${i}` }))
  if (ada('kwitansi_besar')) grup.forEach((g, i) =>
    h.push({ kunci: 'kwitansi_besar', judul: `Kwitansi Besar${g.bnu ? ' ' + g.bnu : ''}`, komponen: DokKwitansiBesar, props: { b, k: o.k, grup: g, namaKeg: o.namaKeg, namaRek: o.namaRek }, id: `kb${i}` }))
  if (ada('kwitansi_kecil')) h.push({ kunci: 'kwitansi_kecil', judul: 'Kwitansi Kecil', komponen: DokKwitansiKecil, props: { b, k: o.k } })
  if (ada('perencanaan')) h.push({ kunci: 'perencanaan', judul: 'Dokumen Perencanaan', komponen: DokPerencanaan, props: { ...dasar, namaRek: o.namaRek } })
  if (ada('pembandingan')) h.push({ kunci: 'pembandingan', judul: 'Hasil Pembandingan', komponen: DokPembandingan, props: dasar })
  if (ada('negosiasi')) h.push({ kunci: 'negosiasi', judul: 'Hasil Negosiasi', komponen: DokNegosiasi, props: dasar })
  if (ada('surat_pesanan')) h.push({ kunci: 'surat_pesanan', judul: 'Surat Pesanan', komponen: DokSuratPesanan, props: dasar })
  if (ada('proforma')) h.push({ kunci: 'proforma', judul: 'Proforma Invoice', komponen: DokTagihan, props: { b, k: o.k, jenis: 'proforma' } })
  if (ada('invoice')) h.push({ kunci: 'invoice', judul: 'Invoice', komponen: DokTagihan, props: { b, k: o.k, jenis: 'invoice' } })
  if (ada('shp')) h.push({ kunci: 'shp', judul: 'Surat Hasil Pemeriksaan', komponen: DokShp, props: dasar })
  if (ada('bast')) h.push({ kunci: 'bast', judul: 'Berita Acara Serah Terima', komponen: DokBast, props: dasar })
  if (ada('foto') && o.foto?.length) {
    const per = b.lampiran?.foto_per_halaman || 4
    const n = Math.ceil(o.foto.length / per)
    for (let i = 0; i < n; i++) h.push({ kunci: 'foto', judul: `Lampiran Foto ${n > 1 ? i + 1 : ''}`.trim(), komponen: DokFoto, props: { b, k: o.k, foto: o.foto.slice(i * per, (i + 1) * per), perHalaman: per, ke: i + 1, dari: n }, id: `f${i}` })
  }
  if (ada('notulen')) h.push({ kunci: 'notulen', judul: 'Notulen', komponen: DokNotulen, props: dasar })
  if (ada('penerimaan_honor')) h.push({ kunci: 'penerimaan_honor', judul: 'Daftar Penerimaan Honor', mendatar: true, komponen: DokPenerimaanHonor, props: dasar })
  if (ada('tanda_terima_transpor')) h.push({ kunci: 'tanda_terima_transpor', judul: 'Tanda Terima Transpor', mendatar: true, komponen: DokPenerimaanHonor, props: { ...dasar, transpor: true } })
  if (ada('daftar_hadir')) {
    const peserta = b.lampiran?.peserta_pegawai ? (o.pegawai || []).filter((p) => p.aktif !== false).map((p) => ({ nama: namaOrang(p), jabatan: p.jabatan })) : b.jenis === 'honor' ? b.penerima : []
    h.push({ kunci: 'daftar_hadir', judul: 'Daftar Hadir', komponen: DokDaftarHadir, props: { ...dasar, peserta, baris: b.lampiran?.baris_hadir || 30 } })
  }
  if (ada('penerima_konsumsi')) h.push({ kunci: 'penerima_konsumsi', judul: 'Penerima Konsumsi', komponen: DokPenerimaKonsumsi, props: { ...dasar, baris: b.lampiran?.baris_konsumsi || 50 } })
  return h
}
