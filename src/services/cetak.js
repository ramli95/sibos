// Pengaturan cetak & data bersama untuk dokumen (profil sekolah, kop, pejabat).
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, modePratinjau } from './firebase'
import { catatAktivitas } from './log'
import { SEKOLAH_AWAL } from '@/config/sekolahAwal'

// Kertas F4 215 × 330 mm. Margin dalam cm.
export const CETAK_AWAL = {
  orientasi_bawaan: 'portrait',
  portrait: { atas: 2, bawah: 2, kiri: 3, kanan: 2 },
  landscape: { atas: 2, bawah: 2, kiri: 2, kanan: 2 },
  ukuran_huruf: 12,
  spasi: 1.15,
  tanda_tangan: 'basah', // basah | gambar
}

export async function muatCetak() {
  if (modePratinjau) return structuredClone(CETAK_AWAL)
  const s = await getDoc(doc(db, 'sekolah', 'cetak'))
  const d = s.exists() ? s.data() : {}
  return { ...CETAK_AWAL, ...d, portrait: { ...CETAK_AWAL.portrait, ...d.portrait }, landscape: { ...CETAK_AWAL.landscape, ...d.landscape } }
}

export async function simpanCetak(data) {
  await setDoc(doc(db, 'sekolah', 'cetak'), { ...data, diperbarui: serverTimestamp() }, { merge: true })
  await catatAktivitas('ubah', 'Memperbarui pengaturan cetak', { koleksi: 'sekolah', id: 'cetak' })
}

export async function muatProfilSekolah() {
  if (modePratinjau) return { ...SEKOLAH_AWAL }
  const s = await getDoc(doc(db, 'sekolah', 'profil'))
  return s.exists() ? { ...SEKOLAH_AWAL, ...s.data() } : { ...SEKOLAH_AWAL }
}

/** CSS @page untuk F4 sesuai pengaturan; dipasang di <head> saat halaman cetak dibuka */
export function pasangHalamanCetak(cetak, orientasi) {
  const m = cetak[orientasi]
  const ukuran = orientasi === 'landscape' ? '330mm 215mm' : '215mm 330mm'
  let el = document.getElementById('sibos-page')
  if (!el) { el = document.createElement('style'); el.id = 'sibos-page'; document.head.appendChild(el) }
  el.textContent = `@page { size: ${ukuran}; margin: ${m.atas}cm ${m.kanan}cm ${m.bawah}cm ${m.kiri}cm; }`
  return () => el.remove()
}

/**
 * Menambahkan isi satu elemen ke PDF (bisa lebih dari satu halaman), sama persis dengan pratinjau.
 * Halaman dipotong di batas baris/paragraf agar tidak ada baris yang terbelah.
 */
async function tambahKePdf(pdf, el, { orientasi, margin, pertama }) {
  const { default: html2canvas } = await import('html2canvas-pro')
  const [lebarKertas, tinggiKertas] = orientasi === 'landscape' ? [330, 215] : [215, 330]
  const mm = (cm) => cm * 10
  const lebarIsi = lebarKertas - mm(margin.kiri) - mm(margin.kanan)
  const tinggiIsi = tinggiKertas - mm(margin.atas) - mm(margin.bawah)
  const skala = 2
  // Semua gaya halaman disalin langsung ke salinan dokumen agar hasil sama dengan pratinjau
  const gaya = [...document.styleSheets].map((ss) => { try { return [...ss.cssRules].map((r) => r.cssText).join('\n') } catch { return '' } }).join('\n')
  const kanvas = await html2canvas(el, {
    scale: skala, useCORS: true, backgroundColor: '#ffffff', logging: false,
    onclone: (d) => { const st = d.createElement('style'); st.textContent = gaya; d.head.appendChild(st); d.documentElement.classList.remove('dark') },
  })
  const pxPerMm = el.offsetWidth / lebarIsi
  const tinggiHalamanPx = tinggiIsi * pxPerMm
  // Titik potong yang aman: bagian bawah setiap baris tabel, paragraf, dan blok
  const atas = el.getBoundingClientRect().top
  const titik = [...new Set([...el.querySelectorAll('tr, p, li, h1, h2, h3, table, .ttd, .potong, :scope > div > div')].filter((x) => x.classList.contains('ttd') || !x.closest('.ttd'))
    .map((x) => Math.round(x.getBoundingClientRect().bottom - atas)))].sort((a, b) => a - b)
  const totalPx = el.scrollHeight
  let mulai = 0, ke = 0
  while (mulai < totalPx - 2) {
    const batas = mulai + tinggiHalamanPx
    let akhir = batas >= totalPx ? totalPx : Math.max(...titik.filter((t) => t > mulai + 20 && t <= batas), 0)
    if (!akhir || akhir <= mulai) akhir = Math.min(batas, totalPx)
    const potong = document.createElement('canvas')
    potong.width = kanvas.width
    potong.height = Math.ceil((akhir - mulai) * skala)
    const ctx = potong.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, potong.width, potong.height)
    ctx.drawImage(kanvas, 0, Math.floor(mulai * skala), kanvas.width, potong.height, 0, 0, potong.width, potong.height)
    if (!(pertama && ke === 0)) pdf.addPage([215, 330], orientasi)
    pdf.addImage(potong.toDataURL('image/jpeg', 0.92), 'JPEG', mm(margin.kiri), mm(margin.atas), lebarIsi, (akhir - mulai) / pxPerMm)
    mulai = akhir
    ke++
  }
}

/**
 * Membuat PDF F4 dari elemen isi dokumen (huruf Times New Roman). margin dalam cm: { atas, bawah, kiri, kanan }
 */
export async function buatPdf(el, { orientasi = 'portrait', margin, namaBerkas = 'Dokumen SIBOS' }) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: [215, 330], orientation: orientasi, compress: true })
  await tambahKePdf(pdf, el, { orientasi, margin, pertama: true })
  pdf.setProperties({ title: namaBerkas, creator: 'SIBOS' })
  pdf.save(`${namaBerkas}.pdf`)
}

/**
 * PDF gabungan berisi beberapa dokumen dengan arah kertas berbeda (Paket SPJ).
 * halaman: [{ el, orientasi }]; cetak: pengaturan cetak (margin tegak & mendatar).
 */
export async function buatPdfPaket(halaman, cetak, { namaBerkas = 'Paket SPJ', kembalikan = false } = {}) {
  const { jsPDF } = await import('jspdf')
  const awal = halaman[0]?.orientasi || 'portrait'
  const pdf = new jsPDF({ unit: 'mm', format: [215, 330], orientation: awal, compress: true })
  for (let i = 0; i < halaman.length; i++) {
    const h = halaman[i]
    await tambahKePdf(pdf, h.el, { orientasi: h.orientasi, margin: cetak[h.orientasi], pertama: i === 0 })
  }
  pdf.setProperties({ title: namaBerkas, creator: 'SIBOS' })
  if (kembalikan) return pdf.output('blob')
  pdf.save(`${namaBerkas}.pdf`)
}
