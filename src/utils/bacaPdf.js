// Membaca teks PDF per halaman (pdf.js dimuat saat dibutuhkan).
//
// Laporan ARKAS berbentuk tabel; isi satu sel (mis. uraian panjang) bisa terpecah ke beberapa baris.
// Supaya isi sel tetap utuh, teks disusun per "pita baris" tabel (dari nomor urut ke nomor urut berikutnya),
// lalu per kolom: kolom kode → kolom uraian → kolom rincian (volume, satuan, harga, jumlah, tahap).
// Batas kolom dibaca dari judul tabel ("Uraian", "Volume", "Satuan", …). Bila judul tidak ditemukan,
// teks disusun per baris biasa.

let pdfjs = null
async function muatPdfjs() {
  if (pdfjs) return pdfjs
  pdfjs = await import('pdfjs-dist')
  const pekerja = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = pekerja
  return pdfjs
}

const RE_NOMOR = /^\d+\.$/
const RE_KODEISH = /^(\d{2}\.)+$|^5\.\d(\.\d{2}){3}\.(\d{2}\.)*$|^5\.\d(\.\d{2}){3}\.\d{4}$|^\d{4}$/

function keItem(items) {
  return items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({ s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3]) || it.height || 8 }))
}

function kelompokkanBaris(isi) {
  const urut = [...isi].sort((a, b) => b.y - a.y || a.x - b.x)
  const baris = []
  for (const it of urut) {
    const b = baris.find((r) => Math.abs(r.y - it.y) <= Math.max(1.5, it.h * 0.35))
    if (b) b.isi.push(it)
    else baris.push({ y: it.y, isi: [it] })
  }
  baris.sort((a, b) => b.y - a.y)
  baris.forEach((r) => r.isi.sort((a, b) => a.x - b.x))
  return baris
}

/** Gabungkan item yang bersebelahan (tanpa celah) menjadi satu kata */
function rangkai(isi) {
  let teks = ''
  let akhir = null
  for (const it of isi) {
    const celah = akhir == null ? 0 : it.x - akhir
    teks += akhir == null ? it.s : (celah > it.h * 0.18 || celah < -it.h ? ' ' : '') + it.s
    akhir = it.x + it.w
  }
  return teks
}

const urutYX = (a, b) => (Math.abs(a.y - b.y) > Math.max(1.5, a.h * 0.35) ? b.y - a.y : a.x - b.x)

/** Pecah item judul berisi beberapa kata ("Volume Satuan") menjadi label per kata */
function pecahLabel(it) {
  const kata = it.s.split(/\s+/)
  if (kata.length === 1) return [it]
  const n = it.s.length
  let pos = 0
  return kata.map((k) => { const x = it.x + (pos / n) * it.w; pos += k.length + 1; return { ...it, s: k, x, w: (k.length / n) * it.w } })
}

const RE_KAKI = /Kertas\s*Kerja\s*per\s*(Tahap|Bulan)|^Halaman\s+\d+\s+dari/i

/** Teks satu halaman, disusun mengikuti tabel bila judul kolom dikenali */
export function susunBaris(items) {
  const isi = keItem(items)
  const baris = kelompokkanBaris(isi)
  const biasa = () => baris.map((r) => rangkai(r.isi)).join('\n')

  // Judul kolom (bisa satu item untuk beberapa kata, mis. "Volume Satuan")
  const lUraian = isi.find((it) => /^Uraian$/i.test(it.s))
  if (!lUraian) return biasa()
  // hanya item di sekitar judul tabel (bukan isi seperti "1 kegiatan")
  const label = isi.filter((it) => Math.abs(it.y - lUraian.y) < 22 && /^(No\.?|Urut|Uraian|Jumlah|Volume|Satuan|Tarif|Harga|Kode|Rekening|Program|1|2)(\s|$)/i.test(it.s) && it.s.length < 30).flatMap(pecahLabel)
  const lVolume = label.find((l) => /^Volume$/i.test(l.s) && (!lUraian || l.x > lUraian.x))
  if (!lUraian || !lVolume) return biasa()
  const yJudul = Math.min(lUraian.y, lVolume.y)
  const lKanan = label.filter((l) => Math.abs(l.y - yJudul) < 40 && l.x >= lVolume.x - 2 && /^(Volume|Satuan|Tarif|Harga|Jumlah|1|2)$/i.test(l.s) && !/^Harga$/i.test(l.s))
  const pusatKanan = [...new Set(lKanan.map((l) => Math.round(l.x + l.w / 2)))].sort((a, b) => a - b)
  const batasKanan = pusatKanan.slice(0, -1).map((c, i) => (c + pusatKanan[i + 1]) / 2)
  const kolomKanan = (it) => { const c = it.x + Math.min(it.w, 40) / 2; let k = 0; while (k < batasKanan.length && c > batasKanan[k]) k++; return k }
  const xRincian = lVolume.x - Math.max(2, lVolume.w * 0.6)
  const xNomor = Math.min(...isi.filter((it) => RE_NOMOR.test(it.s) && it.x < lUraian.x).map((it) => it.x), Infinity)
  const adalahNomor = (it) => RE_NOMOR.test(it.s) && Math.abs(it.x - xNomor) < 6 && it.y < yJudul - 1
  // Kertas kerja per bulan: nomor urut sejajar baris terakhir sel → baris teks masuk ke nomor terdekat.
  // Kertas kerja per tahap: nomor urut sejajar baris pertama → baris teks ikut nomor di atasnya.
  const modeTerdekat = isi.some((it) => /Kertas\s*Kerja\s*per\s*Bulan|PERBULAN/i.test(it.s))

  const JUDUL = /^(No\.?|Urut|Uraian|Jumlah|Tahap|Volume|Satuan|1|2|Tarif|Harga|Rincian|Perhitungan|Kode|Rekening|Program|ProgramUraian)$/i
  const kaki = (r) => RE_KAKI.test(rangkai(r.isi))
  const judul = (r) => r.isi.every((it) => it.s.split(/\s+/).every((w) => JUDUL.test(w)))
  const totalAkhir = (r) => r.y < yJudul - 1 && r.isi.some((it) => /^Jumlah\b/i.test(it.s) && it.x < lVolume.x)

  function susunPita(pita) {
    const semua = pita.flatMap((r) => r.isi)
    const kiri = semua.filter((it) => it.x < xRincian)
    const kanan = semua.filter((it) => it.x >= xRincian)
    const nomor = kiri.filter(adalahNomor)
    // urutan kode: awalan rekening → sufiks 4 digit → kode program
    const jenisKode = (s) => (/^5\./.test(s) ? 0 : /^\d{4}$/.test(s) ? 1 : 2)
    const calonKode = kiri.filter((it) => !nomor.includes(it) && it.x < lUraian.x && /^[\d.]+$/.test(it.s))
    // item kode yang berdempetan (03. + 01.) dirangkai dulu per baris, baru dipilah
    const tokKode = kelompokkanBaris(calonKode).flatMap((r) => rangkai(r.isi).split(/\s+/))
    const kode = tokKode.filter((t) => RE_KODEISH.test(t)).map((s, i) => ({ s, i })).sort((a, b) => jenisKode(a.s) - jenisKode(b.s) || a.i - b.i)
    const sisaKode = tokKode.filter((t) => !RE_KODEISH.test(t))
    const uraian = kiri.filter((it) => !nomor.includes(it) && !calonKode.includes(it))
    const teksUraian = kelompokkanBaris(uraian).map((r) => rangkai(r.isi)).join(' ')
    const perKolom = new Map()
    kanan.forEach((it) => { const k = kolomKanan(it); perKolom.set(k, [...(perKolom.get(k) || []), it]) })
    const teksKanan = [...perKolom.keys()].sort((a, b) => a - b).map((k) => kelompokkanBaris(perKolom.get(k)).map((r) => rangkai(r.isi)).join(' '))
    return [...nomor.map((x) => x.s), ...kode.map((x) => x.s), ...sisaKode, teksUraian, ...teksKanan].filter(Boolean).join(' ')
  }

  const awal = []   // teks sebelum tabel (identitas, penerimaan)
  const akhir = []  // baris Jumlah, tanda tangan, kaki halaman
  const data = []
  for (const r of baris) {
    if (r.y >= yJudul - 1 || judul(r)) { if (r.y >= yJudul - 1 && !judul(r)) awal.push(rangkai(r.isi)); continue }
    if (kaki(r)) { akhir.push(rangkai(r.isi)); continue }
    if (totalAkhir(r) || akhir.length) { akhir.push(rangkai(r.isi)); continue }
    data.push(r)
  }
  const penanda = data.filter((r) => r.isi.some(adalahNomor)).map((r) => r.y)
  if (!penanda.length) return [...awal, ...data.map((r) => rangkai(r.isi)), ...akhir].join('\n')
  const pita = penanda.map(() => [])
  const lepas = []
  for (const r of data) {
    let i
    if (modeTerdekat) {
      i = 0
      penanda.forEach((y, k) => { if (Math.abs(r.y - y) < Math.abs(r.y - penanda[i])) i = k })
    } else {
      i = -1
      penanda.forEach((y, k) => { if (r.y <= y + 1) i = k })
    }
    if (i < 0) lepas.push(rangkai(r.isi))
    else pita[i].push(r)
  }
  return [...awal, ...lepas, ...pita.map(susunPita), ...akhir].join('\n')
}

/** file (File/Blob) → { halaman: [teks…], jumlahHalaman } */
export async function bacaTeksPdf(file, { kemajuan } = {}) {
  const lib = await muatPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  const tugas = lib.getDocument({ data, isEvalSupported: false })
  const dok = await tugas.promise
  const halaman = []
  for (let i = 1; i <= dok.numPages; i++) {
    const hal = await dok.getPage(i)
    const isi = await hal.getTextContent()
    halaman.push(susunBaris(isi.items))
    kemajuan?.(i, dok.numPages)
  }
  await tugas.destroy()
  return { halaman, jumlahHalaman: halaman.length }
}
