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
