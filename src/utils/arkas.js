// Pembaca laporan ARKAS (teks per halaman dari PDF) → struktur RKAS SIBOS.
//
// Dua laporan yang didukung:
//  1. "Kertas Kerja RKAS per Tahap"  → seluruh uraian dengan volume, satuan, harga, jumlah, Tahap I & II.
//  2. "Rincian Kertas Kerja Perbulan" → rincian uraian per bulan (Januari–Desember).
//
// Cara kerja: teks dipecah menjadi token, lalu dibagi per baris memakai nomor urut ARKAS yang berurutan
// (1., 2., 3., …). Isi setiap baris dikenali dari polanya (kode rekening 5.x, kode kegiatan 03.01.01,
// angka rupiah 1.250.000, bilangan bulat), sehingga tidak bergantung pada urutan kolom atau pemenggalan baris.
// Modul ini murni (tanpa DOM) agar bisa diuji di Node.

const BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember']

const RE_UANG = /^\d{1,3}(\.\d{3})*$/          // 1.250.000 · 900 · 0
const RE_BULAT = /^\d+$/                          // 860000 · 12 · 0012
const RE_KODE = /^(\d{2}\.)+$/                    // 03. · 03.01. · 03.03.06.
const RE_REK_KEG = /^(5\.\d\.\d{2}\.\d{2}\.\d{2})\.((?:\d{2}\.){0,3})$/   // 5.1.02.01.01.03.03.06. (kertas kerja per tahap)
const RE_REK_PENUH = /^5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4}$/                 // 5.1.02.01.01.0012 (per bulan)
const RE_SUFIKS = /^\d{4}$/

export const keAngka = (s) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0
const bulatkan = (n) => Math.round(n)

/* ------------------------------------------------------------------ */
/*  Persiapan teks                                                     */
/* ------------------------------------------------------------------ */

const BUANG = [
  /Kertas\s*Kerja\s*per\s*(Tahap|Bulan)\s*-\s*NPSN\s*:\s*\d+\s*,\s*Nama\s*Sekolah\s*:[^\n]*?Halaman\s*\d+\s*dari\s*\d+/gi,
  /Kertas\s*Kerja\s*per\s*(Tahap|Bulan)\s*-\s*NPSN\s*:\s*\d+\s*,\s*Nama\s*Sekolah\s*:[^\n]*/gi,
  /Halaman\s*\d+\s*dari\s*\d+/gi,
  // Judul kolom tabel (diulang di setiap halaman): per bulan diakhiri "Tarif Harga Jumlah",
  // per tahap diakhiri "Kode Program"
  /(Rincian\s*)?No\.\s*Urut\s*Kode\s*Rekening[\s\S]{0,200}?Tarif\s*Harga\s*Jumlah/gi,
  /(Rincian\s*)?No\.\s*Urut[\s\S]{0,200}?Kode\s*Program/gi,
  /\bDraft\b/g,
]

function bersihkan(teks) {
  let t = String(teks).replace(/\\\./g, '.').replace(/ /g, ' ')
  for (const re of BUANG) t = t.replace(re, ' ')
  return t
}

const keToken = (teks) => bersihkan(teks).split(/\s+/).filter(Boolean)

/** Pecah token menjadi baris berdasarkan nomor urut 1., 2., 3., … */
function pecahBaris(tok, { mulai = 0 } = {}) {
  const baris = []
  let harap = 1
  let kini = null
  let total = null
  for (let i = mulai; i < tok.length; i++) {
    const t = tok[i]
    // Akhir tabel: "Jumlah 1.181.400.000 …"
    if (t === 'Jumlah' && RE_UANG.test(tok[i + 1] || '') && kini) {
      total = [keAngka(tok[i + 1]), RE_UANG.test(tok[i + 2] || '') ? keAngka(tok[i + 2]) : null, RE_UANG.test(tok[i + 3] || '') ? keAngka(tok[i + 3]) : null]
      break
    }
    const sebelum = tok[i - 1] || ''
    const sesudah = tok[i + 1] || ''
    if (t === `${harap}.` && /^(\d{2}\.|5\.\d)/.test(sesudah) && !RE_KODE.test(sebelum) && !RE_REK_KEG.test(sebelum) && !RE_REK_PENUH.test(sebelum)) {
      kini = { no: harap, tok: [] }
      baris.push(kini)
      harap++
      continue
    }
    if (kini) kini.tok.push(t)
  }
  return { baris, total }
}

/** Satuan ARKAS sering terpenggal: "kegiata"+"n", "pelajar"+"an", "eksemp"+"lar", "bungku"+"s" */
function rangkaiSatuan(kata) {
  const out = []
  for (const k of kata) {
    const prev = out[out.length - 1]
    if (prev && /[a-z]$/.test(prev) && prev.replace(/[^a-z]/gi, '').length >= 5 && /^[a-z]{1,3}$/.test(k)) out[out.length - 1] = prev + k
    else out.push(k)
  }
  return out.join(' ').replace(/\s+\/\s*/g, ' / ').replace(/^\/\s*/, '/').trim()
}

/** Cari volume (v) dan harga (h) dengan v × h = jumlah. Mengembalikan indeks token. */
function cariVolumeHarga(tok, jumlah, larang) {
  const calon = []
  tok.forEach((t, i) => {
    if (larang.has(i)) return
    if (RE_BULAT.test(t) || RE_UANG.test(t)) { const n = keAngka(t); if (n > 0) calon.push([i, n]) }
  })
  let terbaik = null
  for (let a = 0; a < calon.length; a++) {
    for (let b = a + 1; b < calon.length; b++) {
      const [iv, v] = calon[a]; const [ih, h] = calon[b]
      if (Math.abs(v * h - jumlah) <= Math.max(1, v * 0.5)) {
        // utamakan volume yang paling dekat dengan kolom rincian (indeks terbesar)
        if (!terbaik || iv > terbaik.iv || (iv === terbaik.iv && ih < terbaik.ih)) terbaik = { iv, ih, v, h }
      }
    }
  }
  return terbaik
}

const kataUraian = (t) => !RE_KODE.test(t) && !RE_REK_KEG.test(t) && !RE_REK_PENUH.test(t)

/* ------------------------------------------------------------------ */
/*  1. Kertas Kerja per Tahap                                          */
/* ------------------------------------------------------------------ */

function uraiBarisTahap(b, konteks) {
  const t = b.tok
  // Tiga angka terakhir yang memenuhi Jumlah = Tahap I + Tahap II
  let it = -1
  for (let i = t.length - 3; i >= 0; i--) {
    if (RE_UANG.test(t[i]) && RE_UANG.test(t[i + 1]) && RE_UANG.test(t[i + 2]) && keAngka(t[i]) === keAngka(t[i + 1]) + keAngka(t[i + 2])) { it = i; break }
  }
  if (it < 0) return { galat: `Baris ${b.no}: angka Jumlah/Tahap tidak terbaca`, teks: t.join(' ') }
  const [jumlah, tahap1, tahap2] = [keAngka(t[it]), keAngka(t[it + 1]), keAngka(t[it + 2])]
  const iRek = t.findIndex((x) => RE_REK_KEG.test(x))

  if (iRek < 0) {
    // Baris induk: program (SNP), komponen, atau kegiatan
    const kode = t.filter((x, i) => RE_KODE.test(x) && (i < it || i > it + 2))
    if (!kode.length) return { galat: `Baris ${b.no}: kode program tidak terbaca`, teks: t.join(' ') }
    const penuh = (kode.length > 1 ? kode[kode.length - 1] + kode[0] : kode[0]).replace(/\.$/, '')
    const nama = t.filter((x, i) => (i < it || i > it + 2) && !RE_KODE.test(x)).join(' ')
    return { jenis: 'induk', no: b.no, kode: penuh, tingkat: penuh.split('.').length, nama, jumlah, tahap1, tahap2 }
  }

  // Baris uraian belanja
  const m = t[iRek].match(RE_REK_KEG)
  const prefiks = m[1]
  // Kode kegiatan: bagian setelah rekening (03.03.06) dilengkapi token kode lain di baris (06.)
  const seg = m[2].split('.').filter(Boolean)
  const iKodeLain = []
  t.forEach((x, i) => { if (i !== iRek && RE_KODE.test(x) && seg.length < 3) { seg.push(...x.split('.').filter(Boolean)); iKodeLain.push(i) } })
  let kegiatan = seg.slice(0, 3).join('.')
  if (kegiatan.split('.').length !== 3 && konteks.kegiatan) kegiatan = konteks.kegiatan
  // Sufiks rekening (4 digit): tepat setelah awalan rekening, atau token 4 digit terakhir setelah angka tahap
  let iSuf = RE_SUFIKS.test(t[iRek + 1] || '') ? iRek + 1 : -1
  if (iSuf < 0) for (let i = t.length - 1; i > iRek; i--) if (RE_SUFIKS.test(t[i]) && (i > it + 2 || i === t.length - 1)) { iSuf = i; break }
  const larang = new Set([it, it + 1, it + 2, iRek, iSuf, ...iKodeLain])
  const vh = cariVolumeHarga(t, jumlah, larang)
  const iVol = vh ? vh.iv : it
  const uraian = t.slice(0, iVol).filter((x, i) => !larang.has(i) && kataUraian(x) && !(i === 0 && RE_KODE.test(x))).join(' ')
  const kataSatuan = t.filter((x, i) => i > iVol && !larang.has(i) && (!vh || i !== vh.ih) && kataUraian(x) && !RE_UANG.test(x) && !RE_BULAT.test(x))
  return {
    jenis: 'uraian', no: b.no,
    kode_kegiatan: kegiatan,
    kode_rekening: iSuf >= 0 ? `${prefiks}.${t[iSuf]}` : prefiks,
    uraian: uraian.trim(),
    volume: vh ? vh.v : 1,
    satuan: rangkaiSatuan(kataSatuan),
    harga: vh ? bulatkan(vh.h) : jumlah,
    jumlah, tahap1, tahap2,
    peringatan: vh ? null : 'volume × harga tidak cocok dengan jumlah',
  }
}

/**
 * halaman: array teks (satu per halaman PDF)
 * Hasil: { jenis: 'tahap', tahun, sekolah, tanggal, total, tahap1, tahap2, induk: [...], uraian: [...], galat: [...], cocok }
 */
export function uraiKertasKerjaTahap(halaman) {
  const semua = halaman.join('\n')
  const tok = keToken(semua)
  const tahun = Number((semua.match(/TAHUN\s*ANGGARAN\s*:\s*(\d{4})/i) || [])[1]) || null
  const pagu = keAngka((semua.match(/Total\s*Penerimaan\s*([\d.]+)/i) || [])[1] || 0)
  const iMulai = tok.findIndex((x, i) => x === 'Penerimaan' && tok[i - 1] === 'Total')
  const { baris, total } = pecahBaris(tok, { mulai: Math.max(0, iMulai + 2) })
  const induk = []
  const uraian = []
  const galat = []
  const konteks = {}
  for (const b of baris) {
    const r = uraiBarisTahap(b, konteks)
    if (r.galat) { galat.push(r); continue }
    if (r.jenis === 'induk') {
      induk.push(r)
      if (r.tingkat === 1) { konteks.snp = r.kode; konteks.komponen = null; konteks.kegiatan = null }
      if (r.tingkat === 2) { konteks.komponen = r.kode; konteks.kegiatan = null }
      if (r.tingkat === 3) konteks.kegiatan = r.kode
    } else uraian.push(r)
  }
  return susunHasil({ jenis: 'tahap', tahun, pagu, total, induk, uraian, galat, teks: semua })
}

/* ------------------------------------------------------------------ */
/*  2. Rincian Kertas Kerja per Bulan                                  */
/* ------------------------------------------------------------------ */

function uraiBarisBulan(b) {
  const t = b.tok
  const iRek = t.findIndex((x) => RE_REK_PENUH.test(x))
  // kode kegiatan: token 2 digit berurutan (bisa terpisah spasi: 04. 06. 02.)
  const kodeTok = []
  const iKode = []
  t.forEach((x, i) => { if (RE_KODE.test(x) && (iKode.length === 0 || i === iKode[iKode.length - 1] + 1 || kodeTok.join('').split('.').length <= 3)) { kodeTok.push(x); iKode.push(i) } })
  const kode = kodeTok.join('').replace(/\.$/, '').split('.').slice(0, 3).join('.')
  const iUang = []
  t.forEach((x, i) => { if (RE_UANG.test(x) && !iKode.includes(i)) iUang.push(i) })
  if (!iUang.length) return { galat: `Baris ${b.no}: jumlah tidak terbaca`, teks: t.join(' ') }
  const iJml = iUang[iUang.length - 1]
  const jumlah = keAngka(t[iJml])
  if (iRek < 0) {
    const nama = t.filter((x, i) => !iKode.includes(i) && i !== iJml).join(' ')
    return { jenis: 'induk', no: b.no, kode, tingkat: kode.split('.').length, nama, jumlah }
  }
  const larang = new Set([iRek, iJml, ...iKode])
  const vh = cariVolumeHarga(t, jumlah, larang)
  const iVol = vh ? vh.iv : iJml
  const uraian = t.slice(0, iVol).filter((x, i) => !larang.has(i) && kataUraian(x)).join(' ')
  const kataSatuan = t.filter((x, i) => i > iVol && !larang.has(i) && (!vh || i !== vh.ih) && kataUraian(x) && !RE_UANG.test(x) && !RE_BULAT.test(x))
  return {
    jenis: 'uraian', no: b.no, kode_kegiatan: kode, kode_rekening: t[iRek], uraian: uraian.trim(),
    volume: vh ? vh.v : 1, satuan: rangkaiSatuan(kataSatuan), harga: vh ? bulatkan(vh.h) : jumlah, jumlah,
  }
}

/** Hasil: { jenis: 'bulan', tahun, bulan: [{ bulan: 1..12, total, uraian: [...] }], galat } */
export function uraiKertasKerjaBulan(halaman) {
  const semua = bersihkan(halaman.join('\n'))
  const tahun = Number((semua.match(/TAHUN\s*ANGGARAN\s*:\s*(\d{4})/i) || [])[1]) || null
  const pagu = keAngka((semua.match(/Total\s*Penerimaan\s*([\d.]+)/i) || [])[1] || 0)
  const bagian = semua.split(/RINCIAN\s+KERTAS\s+KERJA\s+PER\s*BULAN/i).slice(1)
  const reBulan = new RegExp(`\\b(${BULAN.join('|')})\\s+(20\\d{2})\\b`, 'i')
  const hasil = []
  const galat = []
  for (const teks of bagian) {
    const mb = teks.match(reBulan)
    if (!mb) continue
    const bulan = BULAN.indexOf(mb[1].toLowerCase()) + 1
    const tok = keToken(teks)
    const iMulai = tok.findIndex((x, i) => x === 'Penerimaan' && tok[i - 1] === 'Total')
    const { baris, total } = pecahBaris(tok, { mulai: Math.max(0, iMulai + 2) })
    const uraian = []
    for (const b of baris) {
      const r = uraiBarisBulan(b)
      if (r.galat) galat.push({ ...r, bulan })
      else if (r.jenis === 'uraian') uraian.push({ ...r, bulan })
    }
    const ada = hasil.find((h) => h.bulan === bulan)
    if (ada) { ada.uraian.push(...uraian); ada.total = (ada.total || 0) + (total?.[0] || 0) }
    else hasil.push({ bulan, total: total?.[0] ?? null, uraian })
  }
  hasil.sort((a, b) => a.bulan - b.bulan)
  hasil.forEach((h) => { h.jumlah_uraian = h.uraian.reduce((s, u) => s + u.jumlah, 0); h.cocok = h.total == null || h.total === h.jumlah_uraian })
  return { jenis: 'bulan', tahun, pagu, bulan: hasil, galat, total: hasil.reduce((s, h) => s + h.jumlah_uraian, 0) }
}

/* ------------------------------------------------------------------ */
/*  Penggabungan & pemeriksaan                                         */
/* ------------------------------------------------------------------ */

function susunHasil({ jenis, tahun, pagu, total, induk, uraian, galat, teks }) {
  const jml = uraian.reduce((s, u) => s + u.jumlah, 0)
  const t1 = uraian.reduce((s, u) => s + u.tahap1, 0)
  const t2 = uraian.reduce((s, u) => s + u.tahap2, 0)
  // Periksa setiap baris induk = jumlah uraian di bawahnya
  const selisih = []
  for (const r of induk) {
    const isi = uraian.filter((u) => u.kode_kegiatan === r.kode || u.kode_kegiatan.startsWith(r.kode + '.'))
    const s = isi.reduce((a, u) => a + u.jumlah, 0)
    if (s !== r.jumlah) selisih.push({ kode: r.kode, nama: r.nama, arkas: r.jumlah, terbaca: s })
  }
  const tanggal = (teks.match(/Kec\.\s*\w+,\s*(\d{1,2}\s+\w+\s+\d{4})/) || [])[1] || null
  return {
    jenis, tahun, pagu, tanggal_dokumen: tanggal, draf: /\bDraft\b/.test(teks),
    total_arkas: total?.[0] ?? null, tahap1_arkas: total?.[1] ?? null, tahap2_arkas: total?.[2] ?? null,
    total: jml, tahap1: t1, tahap2: t2,
    induk, uraian, galat, selisih,
    cocok: total?.[0] === jml && galat.length === 0 && selisih.length === 0,
  }
}

const normKata = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ')

/**
 * Isi rencana bulanan (rupiah per bulan) uraian per tahap memakai rincian per bulan.
 * Pencocokan: kegiatan + rekening + harga + kata uraian (urutan kata diabaikan),
 * lalu kegiatan + rekening + harga saja untuk sisanya.
 */
export function pasangBulanan(uraian, hasilBulan) {
  const sisa = []
  hasilBulan.bulan.forEach((b) => b.uraian.forEach((u) => sisa.push({ ...u, terpakai: 0 })))
  const hasil = uraian.map((u) => ({ ...u, bulan: Array(12).fill(0) }))
  const kunciA = (u) => `${u.kode_kegiatan}|${u.kode_rekening}|${u.harga}|${normKata(u.uraian)}`
  const kunciB = (u) => `${u.kode_kegiatan}|${u.kode_rekening}|${u.harga}`
  const sisaTahap = (u, bln) => (bln <= 6 ? u.tahap1 : u.tahap2) - u.bulan.slice(bln <= 6 ? 0 : 6, bln <= 6 ? 6 : 12).reduce((a, b) => a + b, 0)

  for (const kunci of [kunciA, kunciB]) {
    const grup = new Map()
    hasil.forEach((u) => { if (u.bulan.reduce((a, b) => a + b, 0) < u.jumlah) { const k = kunci(u); grup.set(k, [...(grup.get(k) || []), u]) } })
    for (const m of sisa.sort((a, b) => a.bulan - b.bulan)) {
      if (m.terpakai >= m.jumlah) continue
      const calon = grup.get(kunci(m))
      if (!calon) continue
      let butuh = m.jumlah - m.terpakai
      for (const u of calon) {
        if (butuh <= 0) break
        const ruang = Math.min(sisaTahap(u, m.bulan), u.jumlah - u.bulan.reduce((a, b) => a + b, 0))
        if (ruang <= 0) continue
        const ambil = Math.min(ruang, butuh)
        u.bulan[m.bulan - 1] += ambil
        m.terpakai += ambil
        butuh -= ambil
      }
    }
  }
  const tidakCocok = hasil.filter((u) => u.bulan.reduce((a, b) => a + b, 0) !== u.jumlah)
  const sisaBulan = sisa.filter((m) => m.terpakai < m.jumlah).map((m) => ({ ...m, sisa: m.jumlah - m.terpakai }))
  return { uraian: hasil, tidakCocok, sisaBulan, lengkap: tidakCocok.length === 0 && sisaBulan.length === 0 }
}

/** Bila hanya ada rincian per bulan: gabungkan baris bulanan menjadi uraian tahunan */
export function uraianDariBulanan(hasilBulan) {
  const peta = new Map()
  for (const b of hasilBulan.bulan) {
    for (const u of b.uraian) {
      const k = `${u.kode_kegiatan}|${u.kode_rekening}|${u.harga}|${u.satuan}|${normKata(u.uraian)}`
      if (!peta.has(k)) peta.set(k, { ...u, volume: 0, jumlah: 0, bulan: Array(12).fill(0) })
      const x = peta.get(k)
      x.volume += u.volume; x.jumlah += u.jumlah; x.bulan[b.bulan - 1] += u.jumlah
    }
  }
  return [...peta.values()].map((u, i) => ({
    ...u, no: i + 1, tahap1: u.bulan.slice(0, 6).reduce((a, b) => a + b, 0), tahap2: u.bulan.slice(6).reduce((a, b) => a + b, 0),
  }))
}

/* ------------------------------------------------------------------ */
/*  Klasifikasi                                                        */
/* ------------------------------------------------------------------ */

/** Kategori anggaran dari kode rekening: 5.1 operasional · 5.2.02 alat & mesin · 5.2.05 aset tetap lainnya */
export function kategoriRekening(kode) {
  if (/^5\.2\.02/.test(kode)) return 'alat_mesin'
  if (/^5\.2\.05/.test(kode)) return 'aset_lain'
  if (/^5\.2/.test(kode)) return 'aset_lain'
  return 'operasional'
}

export const KATEGORI = {
  operasional: { nama: 'Operasional', panjang: 'Belanja Operasional (Barang & Jasa)', ikon: 'ShoppingBag', warna: 'from-sky-400 via-blue-500 to-indigo-600', bayangan: 'shadow-blue-500/30', titik: '#3b82f6' },
  alat_mesin: { nama: 'Alat & Mesin', panjang: 'Belanja Modal Peralatan & Mesin', ikon: 'Cpu', warna: 'from-amber-400 via-orange-500 to-rose-500', bayangan: 'shadow-orange-500/30', titik: '#f97316' },
  aset_lain: { nama: 'Aset Tetap Lainnya', panjang: 'Belanja Modal Aset Tetap Lainnya', ikon: 'Library', warna: 'from-emerald-400 via-teal-500 to-cyan-600', bayangan: 'shadow-teal-500/30', titik: '#14b8a6' },
}

/** Pecah kode kegiatan 03.03.06 → { snp: '03', komponen: '03', kegiatan: '06' } */
export function pecahKode(kode) {
  const [snp = '', komponen = '', kegiatan = ''] = String(kode || '').split('.')
  return { snp, komponen, kegiatan }
}

export { BULAN as NAMA_BULAN_KECIL }
