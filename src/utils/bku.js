// Penyusunan Buku Kas Umum, Buku Bank, Kas Tunai dan Buku Pembantu Pajak.
// Sumber: belanja Lunas (per kode kegiatan+rekening = per BNU), kewajiban pajak (pungut/potong),
// setoran pajak, dan baris kas manual. Setiap baris punya "efek" ke bank dan tunai.
import { kelompokRekening } from './belanja'
import { JENIS_KAS } from '@/config/pajak'
import { dariIso } from './format'

export const JENIS_KOLOM_PAJAK = ['PPN', 'PPh 21', 'PPh 22', 'PPh 23', 'PPh 4(2)']

const URUT = { saldo_awal: 0, terima_dana: 1, pengembalian: 2, bunga: 3, setor_tunai: 4, tarik_tunai: 5, belanja: 6, terima_pajak: 7, setor_pajak: 8, pajak_bunga: 9, biaya_bank: 10, lainnya_keluar: 11 }
const angkaBnu = (s) => { const m = String(s || '').match(/(\d+)\s*$/); return m ? Number(m[1]) : 1e9 }
export const bulanDari = (iso) => { const d = dariIso(iso); return d ? d.getMonth() : null }

/** Baris dasar: { id, tanggal, jenis, bnu, kode_kegiatan, kode_rekening, uraian, bank, tunai, ref } (bank/tunai = efek ±) */
export function susunBaris({ belanja = [], kewajiban = [], setoran = [], kas = [] }) {
  const baris = []
  const bayar = new Map()
  belanja.forEach((b) => {
    if (b.status !== 'lunas' || !b.tgl_lunas) return
    const tunai = b.cara_bayar === 'tunai'
    bayar.set(b.id, tunai ? 'tunai' : 'bank')
    kelompokRekening(b.item || []).forEach((g) => {
      const v = -g.jumlah
      baris.push({
        id: `${b.id}|${g.kunci}`, tanggal: b.tgl_lunas, jenis: 'belanja', bnu: b.bnu?.[g.kunci] || '', kode_kegiatan: g.kode_kegiatan, kode_rekening: g.kode_rekening,
        uraian: b.uraian_pembayaran || b.nama_pekerjaan, pihak: b.jenis === 'honor' ? '' : b.rekanan?.nama_usaha || '',
        bank: tunai ? 0 : v, tunai: tunai ? v : 0, ref: { tipe: 'belanja', id: b.id, kunci: g.kunci }, sumber: b.sumber,
      })
    })
  })
  kewajiban.forEach((p) => {
    if (p.cara === 'mitra') return
    const s = bayar.get(p.id_belanja) || 'bank'
    baris.push({
      id: `pj|${p.id}`, tanggal: p.tgl_pungut, jenis: 'terima_pajak', bnu: p.bnu_terima || '', kode_kegiatan: '', kode_rekening: '',
      uraian: `Terima ${p.jenis} ${p.uraian}`, pajak: p.jenis, bank: s === 'bank' ? p.nilai : 0, tunai: s === 'tunai' ? p.nilai : 0, ref: { tipe: 'pajak', id: p.id, id_belanja: p.id_belanja },
    })
  })
  setoran.forEach((st) => {
    const per = new Map()
    ;(st.butir || []).forEach((x) => per.set(x.jenis, (per.get(x.jenis) || 0) + (Number(x.nilai) || 0)))
    ;[...per.entries()].forEach(([jenis, nilai], i) => {
      baris.push({
        id: `st|${st.id}|${jenis}`, tanggal: st.tanggal, jenis: 'setor_pajak', bnu: st.bnu_jenis?.[jenis] || (i === 0 ? st.bnu || '' : ''), kode_kegiatan: '', kode_rekening: '',
        uraian: `Setor ${jenis}${st.ntpn ? ` (NTPN ${st.ntpn})` : ''}`, pajak: jenis, bank: st.dari === 'tunai' ? 0 : -nilai, tunai: st.dari === 'tunai' ? -nilai : 0, ref: { tipe: 'setoran', id: st.id },
      })
    })
  })
  kas.forEach((k) => {
    const info = JENIS_KAS[k.jenis] || JENIS_KAS.lainnya_keluar
    const n = Number(k.nilai) || 0
    let bank = 0, tunai = 0
    if (k.jenis === 'tarik_tunai') { bank = -n; tunai = n }
    else if (k.jenis === 'setor_tunai') { bank = n; tunai = -n }
    else {
      const v = info.arah === 'masuk' ? n : -n
      if ((k.sumber || info.sumber) === 'tunai') tunai = v; else bank = v
    }
    baris.push({ id: `ks|${k.id}`, tanggal: k.tanggal, jenis: k.jenis, bnu: k.bnu || '', kode_kegiatan: k.kode_kegiatan || '', kode_rekening: k.kode_rekening || '', uraian: k.uraian || info.label, bank, tunai, ref: { tipe: 'kas', id: k.id }, sumber: k.sumber_data })
  })
  return baris.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || (URUT[a.jenis] ?? 20) - (URUT[b.jenis] ?? 20) || angkaBnu(a.bnu) - angkaBnu(b.bnu) || a.id.localeCompare(b.id))
}

/**
 * Baris untuk satu buku dengan saldo berjalan.
 * buku: 'bku' (gabungan; pemindahan bank↔tunai tidak menambah/mengurangi), 'bank', 'tunai'
 */
export function bukuDengan(baris, buku) {
  let saldo = 0
  return baris
    .filter((r) => (buku === 'bku' ? true : r[buku] !== 0))
    .map((r) => {
      const efek = buku === 'bku' ? r.bank + r.tunai : r[buku]
      const pindah = buku === 'bku' && (r.jenis === 'tarik_tunai' || r.jenis === 'setor_tunai')
      saldo += efek
      return { ...r, masuk: efek > 0 ? efek : 0, keluar: efek < 0 ? -efek : 0, pindah, saldo }
    })
}

/** Ringkasan per bulan (0–11) dari baris buku berjalan */
export function ringkasanBulan(baris, bulan, tahun) {
  const awalBulan = `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
  const akhirBulan = `${tahun}-${String(bulan + 1).padStart(2, '0')}-31`
  const sebelum = baris.filter((r) => r.tanggal < awalBulan)
  const dalam = baris.filter((r) => r.tanggal >= awalBulan && r.tanggal <= akhirBulan)
  const sampai = baris.filter((r) => r.tanggal <= akhirBulan)
  const jml = (arr, f) => arr.reduce((s, r) => s + f(r), 0)
  const efek = (r) => r.bank + r.tunai
  return {
    saldo_awal: jml(sebelum, efek),
    masuk: jml(dalam, (r) => Math.max(0, efek(r))),
    keluar: jml(dalam, (r) => Math.max(0, -efek(r))),
    saldo_akhir: jml(sampai, efek),
    saldo_bank: jml(sampai, (r) => r.bank),
    saldo_tunai: jml(sampai, (r) => r.tunai),
    belanja: jml(dalam.filter((r) => r.jenis === 'belanja'), (r) => -efek(r)),
    penerimaan_dana: jml(dalam.filter((r) => r.jenis === 'terima_dana'), efek),
    jumlah_baris: dalam.length,
    tanpa_bnu: dalam.filter((r) => r.jenis === 'belanja' && !r.bnu).length,
  }
}

/** Saldo per tanggal (inklusif) */
export const saldoSampai = (baris, iso, kolom = 'bank') => baris.filter((r) => r.tanggal <= iso).reduce((s, r) => s + (kolom === 'bku' ? r.bank + r.tunai : r[kolom]), 0)

/* ---------------- Buku Pembantu Pajak ---------------- */

/** Baris: penerimaan (pungut/potong) & penyetoran per kewajiban, dengan kolom per jenis pajak dan saldo */
export function bukuPajak(kewajiban, { termasukMitra = true } = {}) {
  const r = []
  kewajiban.forEach((p) => {
    if (p.cara === 'mitra' && !termasukMitra) return
    const kol = (v) => Object.fromEntries(JENIS_KOLOM_PAJAK.map((j) => [j, j === p.jenis ? v : 0]))
    r.push({ id: `${p.id}|t`, tanggal: p.tgl_pungut, bnu: p.bnu_terima || p.bnu || '', uraian: `${p.cara === 'mitra' ? 'Dipungut mitra SIPLah — ' : p.cara === 'pungut' ? 'Pungut ' : 'Potong '}${p.jenis} ${p.uraian}`, ...kol(p.nilai), terima: p.nilai, setor: 0, p, arah: 'terima' })
    if (p.status === 'disetor' && p.tgl_setor) {
      r.push({ id: `${p.id}|s`, tanggal: p.tgl_setor, bnu: p.bnu_setor || '', uraian: `${p.cara === 'mitra' ? 'Disetor mitra SIPLah — ' : 'Setor '}${p.jenis} ${p.uraian}${p.ntpn ? ` · NTPN ${p.ntpn}` : ''}`, ...kol(p.nilai), terima: 0, setor: p.nilai, p, arah: 'setor' })
    }
  })
  r.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || (a.arah === 'terima' ? 0 : 1) - (b.arah === 'terima' ? 0 : 1))
  let saldo = 0
  return r.map((x) => { saldo += x.terima - x.setor; return { ...x, saldo } })
}

/* ---------------- Rekap per penerima ---------------- */

export function rekapPenerima(belanja, tahun) {
  const peta = new Map()
  belanja.forEach((b) => {
    if (b.jenis !== 'honor' || b.status !== 'lunas' || !String(b.tgl_lunas).startsWith(String(tahun))) return
    const m = bulanDari(b.tgl_lunas)
    ;(b.penerima || []).forEach((p) => {
      const k = p.nip ? `nip:${p.nip}` : `nama:${String(p.nama).toLowerCase().replace(/[^a-z]/g, '')}`
      if (!peta.has(k)) peta.set(k, { kunci: k, nama: p.nama, nip: p.nip, golongan: p.golongan, status: p.status_kepegawaian, sumber: p.sumber, npwp: p.npwp, honor: 0, transpor: 0, pph21: 0, diterima: 0, kali: 0, bulan: Array(12).fill(0), rincian: [] })
      const x = peta.get(k)
      if (b.jenis_honor === 'transpor') x.transpor += p.bruto; else x.honor += p.bruto
      x.pph21 += p.pph21 || 0
      x.diterima += p.diterima ?? p.bruto - (p.pph21 || 0)
      x.kali++
      if (m != null) x.bulan[m] += p.bruto
      x.rincian.push({ id_belanja: b.id, tanggal: b.tgl_lunas, kegiatan: b.nama_pekerjaan, jenis: b.jenis_honor, bruto: p.bruto, pph21: p.pph21 || 0, tarif: p.tarif_pph21, alasan: p.alasan_pph21 || '' })
    })
  })
  return [...peta.values()].sort((a, b) => b.honor + b.transpor - (a.honor + a.transpor))
}

export function rekapRekanan(belanja, kewajiban, tahun) {
  const peta = new Map()
  belanja.forEach((b) => {
    if (b.jenis === 'honor' || b.status !== 'lunas' || !String(b.tgl_lunas).startsWith(String(tahun))) return
    const k = b.id_rekanan || b.rekanan?.nama_usaha || 'tanpa'
    if (!peta.has(k)) peta.set(k, { kunci: k, nama: b.rekanan?.nama_usaha || '(tanpa rekanan)', npwp: b.rekanan?.npwp || '', pkp: !!b.rekanan?.status_pkp, siplah: 0, total: 0, kali: 0, pajak: {} })
    const x = peta.get(k)
    x.total += b.total || 0
    x.kali++
    if (b.cara === 'siplah') x.siplah++
  })
  kewajiban.forEach((p) => {
    const b = belanja.find((y) => y.id === p.id_belanja)
    if (!b || b.jenis === 'honor') return
    const x = peta.get(b.id_rekanan || b.rekanan?.nama_usaha || 'tanpa')
    if (x) x.pajak[p.jenis] = (x.pajak[p.jenis] || 0) + p.nilai
  })
  return [...peta.values()].sort((a, b) => b.total - a.total)
}

/* ---------------- Rekening koran: pencocokan ---------------- */

/**
 * Calon transaksi bank untuk dicocokkan dengan rekening koran.
 * Di bank, belanja dibayar NETO (bruto − pajak yang dipungut/dipotong) dan satu kode billing = satu debit,
 * jadi baris BKU dikelompokkan: per belanja (belanja + terima pajaknya), per setoran, per baris kas.
 * Baris belanja per BNU juga disertakan sebagai cadangan (bila dibayar bruto).
 */
export function calonBank(baris) {
  const grup = new Map()
  baris.filter((r) => r.bank !== 0).forEach((r) => {
    const k = r.ref.tipe === 'belanja' ? `b:${r.ref.id}` : r.ref.tipe === 'pajak' ? `b:${r.ref.id_belanja}` : r.ref.tipe === 'setoran' ? `s:${r.ref.id}` : `k:${r.ref.id}`
    if (!grup.has(k)) grup.set(k, [])
    grup.get(k).push(r)
  })
  const hasil = []
  grup.forEach((rows, k) => {
    const utama = rows.find((r) => r.jenis !== 'terima_pajak') || rows[0]
    hasil.push({ id: k, tanggal: rows.map((r) => r.tanggal).sort()[0], bank: rows.reduce((s, r) => s + r.bank, 0), uraian: utama.uraian, bnu: rows.map((r) => r.bnu).filter(Boolean).join(', '), baris: rows.map((r) => r.id) })
    if (rows.length > 1) rows.filter((r) => r.jenis === 'belanja').forEach((r) => hasil.push({ id: `r:${r.id}`, tanggal: r.tanggal, bank: r.bank, uraian: r.uraian, bnu: r.bnu, baris: [r.id], cadangan: true }))
  })
  return hasil
}

/**
 * Cocokkan mutasi koran dengan calon transaksi bank. Kunci: nilai sama & tanggal paling dekat (±7 hari).
 * Pasangan manual (id_bku) dihormati.
 */
export function cocokkanKoran(mutasi, calon) {
  const terpakai = new Set(mutasi.map((m) => m.id_bku).filter(Boolean))
  const barisTerpakai = new Set()
  calon.filter((c) => terpakai.has(c.id)).forEach((c) => c.baris.forEach((x) => barisTerpakai.add(x)))
  const hari = (a, b) => Math.abs((dariIso(a) - dariIso(b)) / 86400000)
  return mutasi.map((m) => {
    if (m.id_bku) return { ...m, pasangan: calon.find((c) => c.id === m.id_bku) || null, cara: 'manual' }
    if (m.abaikan) return { ...m, pasangan: null, cara: 'abaikan' }
    const nilai = m.kredit ? m.kredit : -m.debit
    const p = calon.filter((c) => !terpakai.has(c.id) && !c.baris.some((x) => barisTerpakai.has(x)) && c.bank === nilai && hari(c.tanggal, m.tanggal) <= 7)
      .sort((a, b) => (a.cadangan ? 1 : 0) - (b.cadangan ? 1 : 0) || hari(a.tanggal, m.tanggal) - hari(b.tanggal, m.tanggal))[0] || null
    if (p) { terpakai.add(p.id); p.baris.forEach((x) => barisTerpakai.add(x)) }
    return { ...m, pasangan: p, cara: p ? 'otomatis' : '' }
  })
}

/** Tebak jenis mutasi koran tanpa pasangan (bunga, pajak bunga, biaya admin) */
export function tebakJenisMutasi(m) {
  const u = String(m.uraian || '').toLowerCase()
  if (m.kredit && /bunga|jasa giro|interest/.test(u)) return 'bunga'
  if (m.debit && /pajak|pph|tax/.test(u)) return 'pajak_bunga'
  if (m.debit && /adm|biaya|fee|materai|meterai/.test(u)) return 'biaya_bank'
  if (m.kredit && /bos|rkud|kasda|pemkot|pemda|sp2d|transfer masuk/.test(u)) return 'terima_dana'
  if (m.debit && /tarik|tunai|cash/.test(u)) return 'tarik_tunai'
  return m.kredit ? 'pengembalian' : 'lainnya_keluar'
}

/** Kolom cetak (DokBuku) → kolom Excel */
export const kolomExcel = (kolom) => kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : /uraian|kegiatan|nama|keterangan/i.test(k.judul) ? 55 : 15, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' }))
