// Memanggil penghubung Google Apps Script (unggah Drive, cadangan, reset password).
// URL disimpan di Firestore sistem/penghubung, jadi bisa diganti tanpa mengubah kode.
import { auth, modePratinjau } from './firebase'
import { bacaPenghubung } from './sistem'

let urlTersimpan = null
export const lupakanUrl = () => { urlTersimpan = null }

async function ambilUrl() {
  if (!urlTersimpan) urlTersimpan = (await bacaPenghubung()).url_apps_script || ''
  return urlTersimpan
}

export async function panggilPenghubung(aksi, data = {}, { url } = {}) {
  if (modePratinjau) throw new Error('Mode Pratinjau: penghubung tidak tersedia.')
  const tujuan = url || (await ambilUrl())
  if (!tujuan) throw new Error('Penghubung Drive belum dipasang. Isi URL di Pengaturan → Drive & Cadangan.')
  const idToken = await auth.currentUser.getIdToken()
  let r
  try {
    // text/plain agar tidak memicu pemeriksaan CORS tambahan oleh browser
    r = await fetch(tujuan, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ aksi, idToken, ...data }) })
  } catch {
    throw new Error('Penghubung tidak dapat dihubungi. Periksa URL dan pastikan akses Web App diatur ke "Anyone".')
  }
  if (!r.ok) throw new Error(`Penghubung tidak menjawab (kode ${r.status}).`)
  let j
  try { j = await r.json() } catch { throw new Error('Jawaban penghubung tidak dikenali. Pastikan URL berakhiran /exec.') }
  if (!j.ok) throw new Error(j.pesan || 'Penghubung menolak permintaan.')
  return j
}

const keBase64 = (file) => new Promise((selesai, gagal) => {
  const r = new FileReader()
  r.onload = () => selesai(String(r.result).split(',')[1])
  r.onerror = () => gagal(new Error('Berkas tidak dapat dibaca.'))
  r.readAsDataURL(file)
})

/** Unggah berkas ke Drive. jalur contoh: ['2026', '10 Oktober', 'SPJ'] */
export async function unggahBerkas(file, jalur, namaBaru) {
  if (file.size > 25 * 1024 * 1024) throw new Error('Ukuran berkas maksimal 25 MB.')
  return panggilPenghubung('unggah', { nama: namaBaru || file.name, mime: file.type, base64: await keBase64(file), jalur })
}
