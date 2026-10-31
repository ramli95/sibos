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

/** Teks satu halaman, disusun mengikuti tabel bila judul kolom dikenali */
export function susunBaris(items) {
  const isi = keItem(items)
  const baris = kelompokkanBaris(isi)
  const biasa = () => baris.map((r) => rangkai(r.isi)).join('\n')

  // Judul kolom
  const cari = (re) => isi.find((it) => re.test(it.s))
  const lUraian = cari(/^Uraian$/i)
  const lVolume = cari(/^Volume$/i)
  if (!lUraian || !lVolume || lVolume.x <= lUraian.x) return biasa()
  const yJudul = Math.min(lUraian.y, lVolume.y)
  const label = isi.filter((it) => Math.abs(it.y - yJudul) < 40 && it.x >= lVolume.x - 2 && /^(Volume|Satuan|Tarif|Harga|Jumlah|1|2)$/i.test(it.s))
  const pusatKanan = [...new Map(label.map((l) => [Math.round(l.x + l.w / 2), l])).keys()].sort((a, b) => a - b)
  const batasKanan = pusatKanan.slice(0, -1).map((c, i) => (c + pusatKanan[i + 1]) / 2)
  const kolomKanan = (it) => { const c = it.x + it.w / 2; let k = 0; while (k < batasKanan.length && c > batasKanan[k]) k++; return k }
  const xRincian = lVolume.x - Math.max(2, lVolume.w * 0.6)

  // Pita baris tabel: mulai dari baris yang diawali nomor urut "12." di sisi kiri
  const xNomor = Math.min(...isi.filter((it) => RE_NOMOR.test(it.s) && it.x < lUraian.x).map((it) => it.x), Infinity)
  const out = []
  let pita = null
  const tutup = () => {
    if (!pita) return
    const semua = pita.flatMap((r) => r.isi)
    const kiri = semua.filter((it) => it.x < xRincian)
    const kanan = semua.filter((it) => it.x >= xRincian)
    const nomor = kiri.filter((it) => RE_NOMOR.test(it.s) && Math.abs(it.x - xNomor) < 6)
    // urutan kode: awalan rekening → sufiks 4 digit → kode program
    const jenisKode = (s) => (/^5\./.test(s) ? 0 : /^\d{4}$/.test(s) ? 1 : 2)
    const kode = kiri.filter((it) => !nomor.includes(it) && it.x < lUraian.x && RE_KODEISH.test(it.s)).sort((a, b) => jenisKode(a.s) - jenisKode(b.s) || urutYX(a, b))
    const uraian = kiri.filter((it) => !nomor.includes(it) && !kode.includes(it))
    const teksUraian = kelompokkanBaris(uraian).map((r) => rangkai(r.isi)).join(' ')
    const perKolom = new Map()
    kanan.forEach((it) => { const k = kolomKanan(it); perKolom.set(k, [...(perKolom.get(k) || []), it]) })
    const teksKanan = [...perKolom.keys()].sort((a, b) => a - b).map((k) => kelompokkanBaris(perKolom.get(k)).map((r) => rangkai(r.isi)).join(' '))
    out.push([...nomor.map((x) => x.s), ...kode.map((x) => x.s), teksUraian, ...teksKanan].filter(Boolean).join(' '))
    pita = null
  }
  const JUDUL = /^(No\.?|Urut|Uraian|Jumlah|Tahap|Volume|Satuan|1|2|Tarif|Harga|Rincian|Perhitungan|Kode|Rekening|Program|ProgramUraian)$/i
  for (const r of baris) {
    if (!pita && r.isi.every((it) => it.s.split(/\s+/).every((w) => JUDUL.test(w)))) continue // judul kolom (diulang tiap halaman)
    const awal = r.isi[0]
    const mulai = awal && RE_NOMOR.test(awal.s) && Math.abs(awal.x - xNomor) < 6 && r.y < yJudul - 1
    const akhir = r.isi.some((it) => /^Jumlah\b/i.test(it.s) && it.x < lVolume.x) && r.y < yJudul - 1
    if (mulai) { tutup(); pita = [r]; continue }
    if (akhir) { tutup(); out.push(rangkai(r.isi)); continue }
    if (pita) pita.push(r)
    else out.push(rangkai(r.isi))
  }
  tutup()
  return out.join('\n')
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
