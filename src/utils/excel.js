// Ekspor & baca Excel (ExcelJS dimuat saat dibutuhkan agar aplikasi tetap ringan).
// Lembar ekspor siap cetak: kertas F4/Folio, Times New Roman, margin kiri 3 cm (portrait) / 2 cm.
import { doc, getDoc } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'
import { SEKOLAH_AWAL } from '@/config/sekolahAwal'
import { tanggalPanjang } from './format'

const muatExcel = async () => (await import('exceljs')).default
const CM = 1 / 2.54
const HURUF = 'Times New Roman'

async function namaSekolah() {
  if (modePratinjau) return SEKOLAH_AWAL.nama_pemda
  try { const s = await getDoc(doc(db, 'sekolah', 'profil')); return s.data()?.nama_pemda || SEKOLAH_AWAL.nama_pemda } catch { return SEKOLAH_AWAL.nama_pemda }
}

function aturHalaman(ws, landscape) {
  ws.pageSetup = {
    paperSize: 14, // Folio / F4
    orientation: landscape ? 'landscape' : 'portrait',
    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: (landscape ? 2 : 3) * CM, right: 2 * CM, top: 2 * CM, bottom: 2 * CM, header: 0.8 * CM, footer: 0.8 * CM },
    printTitlesRow: '4:4',
  }
  ws.headerFooter.oddFooter = '&L&"Times New Roman"&8SIBOS&R&"Times New Roman"&8Halaman &P dari &N'
}

export function unduhBlob(isi, namaBerkas, jenis) {
  const blob = isi instanceof Blob ? isi : new Blob([isi], { type: jenis })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = namaBerkas
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/**
 * kolom: [{ kunci, judul, lebar, jenis: 'teks'|'angka'|'uang'|'tanggal' }]
 * baris: array objek
 */
export async function eksporExcel({ judul, kolom, baris, namaBerkas, landscape = true }) {
  const ExcelJS = await muatExcel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIBOS'
  const ws = wb.addWorksheet(judul.slice(0, 31))
  aturHalaman(ws, landscape)
  const n = kolom.length + 1

  ws.mergeCells(1, 1, 1, n)
  ws.getCell(1, 1).value = judul.toUpperCase()
  ws.getCell(1, 1).font = { name: HURUF, size: 14, bold: true }
  ws.getCell(1, 1).alignment = { horizontal: 'center' }
  ws.mergeCells(2, 1, 2, n)
  ws.getCell(2, 1).value = await namaSekolah()
  ws.getCell(2, 1).font = { name: HURUF, size: 12, bold: true }
  ws.getCell(2, 1).alignment = { horizontal: 'center' }
  ws.mergeCells(3, 1, 3, n)
  ws.getCell(3, 1).value = `Keadaan ${tanggalPanjang(new Date())}`
  ws.getCell(3, 1).font = { name: HURUF, size: 11, italic: true }
  ws.getCell(3, 1).alignment = { horizontal: 'center' }

  const kepala = ws.getRow(4)
  ;[{ judul: 'No', lebar: 5 }, ...kolom].forEach((k, i) => {
    const c = kepala.getCell(i + 1)
    c.value = k.judul
    c.font = { name: HURUF, size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    ws.getColumn(i + 1).width = k.lebar || 16
  })
  kepala.height = 30

  const garis = { style: 'thin', color: { argb: 'FF000000' } }
  baris.forEach((b, r) => {
    const row = ws.getRow(5 + r)
    row.getCell(1).value = r + 1
    kolom.forEach((k, i) => {
      const c = row.getCell(i + 2)
      let v = typeof k.nilai === 'function' ? k.nilai(b) : b[k.kunci]
      if (k.jenis === 'uang' || k.jenis === 'angka') { v = v === '' || v == null ? null : Number(v); c.numFmt = k.jenis === 'uang' ? '#,##0' : '0' }
      else if (k.jenis === 'tanggal' && v) { const t = new Date(`${v}T00:00:00Z`); if (!isNaN(t)) { v = t; c.numFmt = 'dd/mm/yyyy' } }
      else if (typeof v === 'boolean') v = v ? 'Ya' : 'Tidak'
      else if (v != null) v = String(v)
      c.value = v ?? ''
    })
    row.eachCell({ includeEmpty: true }, (c) => {
      c.font = { name: HURUF, size: 11 }
      c.alignment = { vertical: 'top', wrapText: true, ...(c.alignment || {}) }
    })
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' }
    if (r % 2 === 1) row.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5FB' } } })
  })
  for (let r = 4; r <= 4 + baris.length; r++) for (let c = 1; c <= n; c++) ws.getCell(r, c).border = { top: garis, left: garis, bottom: garis, right: garis }
  ws.views = [{ state: 'frozen', ySplit: 4 }]

  const buf = await wb.xlsx.writeBuffer()
  unduhBlob(buf, `${namaBerkas || judul}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

/** Templat impor: lembar Data (kepala + contoh) dan lembar Petunjuk */
export async function unduhTemplat({ jenis, kolom, contoh, petunjuk }) {
  const ExcelJS = await muatExcel()
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Data')
  kolom.forEach((k, i) => {
    const c = ws.getCell(1, i + 1)
    c.value = k.judul
    c.font = { name: HURUF, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.wajib ? 'FFE8455A' : 'FF1E3A8A' } }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    ws.getColumn(i + 1).width = Math.max(14, k.judul.length + 4)
    ws.getColumn(i + 1).numFmt = '@' // teks, agar NIP/NIK/rekening tidak berubah jadi angka
  })
  ws.getRow(1).height = 30
  contoh.forEach((baris, r) => kolom.forEach((k, i) => { const c = ws.getCell(r + 2, i + 1); c.value = baris[k.kunci] ?? ''; c.font = { name: HURUF, italic: true, color: { argb: 'FF5B6578' } } }))
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const wp = wb.addWorksheet('Petunjuk')
  wp.getColumn(1).width = 100
  ;[`TEMPLAT IMPOR ${jenis.toUpperCase()} — SIBOS`, '', ...petunjuk, '', 'Kolom berwarna MERAH wajib diisi. Hapus baris contoh sebelum mengimpor.']
    .forEach((t, i) => { const c = wp.getCell(i + 1, 1); c.value = t; c.font = { name: HURUF, size: i === 0 ? 13 : 11, bold: i === 0 }; c.alignment = { wrapText: true } })

  const buf = await wb.xlsx.writeBuffer()
  unduhBlob(buf, `Templat Impor ${jenis} SIBOS.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

/* ---------- membaca berkas ---------- */

function nilaiSel(v) {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    if ('result' in v) return nilaiSel(v.result)
    if (v.richText) return v.richText.map((t) => t.text).join('')
    if ('text' in v) return v.text
    if (v.error) return ''
  }
  return v
}

function uraiCsv(teks) {
  const pemisah = (teks.split('\n')[0].match(/;/g) || []).length > (teks.split('\n')[0].match(/,/g) || []).length ? ';' : ','
  const baris = []
  let sel = '', row = [], kutip = false
  for (let i = 0; i < teks.length; i++) {
    const ch = teks[i]
    if (kutip) {
      if (ch === '"' && teks[i + 1] === '"') { sel += '"'; i++ } else if (ch === '"') kutip = false; else sel += ch
    } else if (ch === '"') kutip = true
    else if (ch === pemisah) { row.push(sel); sel = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && teks[i + 1] === '\n') i++; row.push(sel); baris.push(row); row = []; sel = '' }
    else sel += ch
  }
  if (sel || row.length) { row.push(sel); baris.push(row) }
  return baris
}

/** Mengembalikan [{ nama, baris: [[sel...]] }] */
export async function bacaBerkas(file) {
  if (/\.csv$/i.test(file.name)) return [{ nama: file.name, baris: uraiCsv(await file.text()) }]
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Gunakan berkas .xlsx atau .csv. Berkas .xls lama: buka di Excel lalu Simpan Sebagai .xlsx.')
  const ExcelJS = await muatExcel()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  return wb.worksheets.filter((ws) => ws.state !== 'hidden' && ws.rowCount > 0).map((ws) => {
    const baris = []
    ws.eachRow({ includeEmpty: true }, (row) => {
      const isi = []
      for (let c = 1; c <= Math.min(ws.columnCount, 80); c++) isi.push(nilaiSel(row.getCell(c).value))
      baris.push(isi)
    })
    return { nama: ws.name, baris }
  })
}
