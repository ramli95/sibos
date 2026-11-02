// Layanan data Fase 7: papan informasi publik, template & riwayat WhatsApp, berita acara serah terima,
// catatan kas sekolah, dan catatan pribadi bendahara. Mode Pratinjau memakai penyimpanan di memori.
import { collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'

const memori = {} // { koleksi: Map(id → data) } untuk Mode Pratinjau
const wadah = (k) => (memori[k] ??= new Map())
const uid = () => auth?.currentUser?.uid || 'pratinjau'
const idAcak = () => Math.random().toString(36).slice(2, 10)

function log(b, aksi, keterangan, koleksi, id) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: uid(), aksi, keterangan, koleksi, id_dokumen: id, sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
}

/** Semua dokumen satu koleksi; saring: [kolom, nilai] (kesamaan) */
export async function muatSemua(koleksi, saring = null) {
  if (modePratinjau) return [...wadah(koleksi).entries()].map(([id, d]) => ({ id, ...d })).filter((d) => !saring || d[saring[0]] === saring[1])
  const q = saring ? query(collection(db, koleksi), where(saring[0], '==', saring[1])) : collection(db, koleksi)
  const s = await getDocs(q)
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function muatSatu(koleksi, id) {
  if (modePratinjau) { const d = wadah(koleksi).get(id); return d ? { id, ...d } : null }
  const s = await getDoc(doc(db, koleksi, id))
  return s.exists() ? { id: s.id, ...s.data() } : null
}

/** Simpan (buat/ubah) satu dokumen. keterangan = teks log (kosong = tanpa log). Hasil: id */
export async function simpanSatu(koleksi, id, data, keterangan = '') {
  const isi = { ...data }
  delete isi.id
  if (modePratinjau) {
    const k = id || idAcak()
    wadah(koleksi).set(k, { ...isi, diperbarui: new Date().toISOString(), diperbarui_oleh: uid() })
    return k
  }
  const ref = id ? doc(db, koleksi, id) : doc(collection(db, koleksi))
  const b = writeBatch(db)
  b.set(ref, { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: uid() }, { merge: true })
  if (keterangan) log(b, id ? 'ubah' : 'tambah', keterangan, koleksi, ref.id)
  await b.commit()
  return ref.id
}

export async function hapusSatu(koleksi, id, keterangan = '') {
  if (modePratinjau) { wadah(koleksi).delete(id); return }
  if (!keterangan) { await deleteDoc(doc(db, koleksi, id)); return }
  const b = writeBatch(db)
  b.delete(doc(db, koleksi, id))
  log(b, 'hapus', keterangan, koleksi, id)
  await b.commit()
}

/* ---------- Papan informasi publik ---------- */
// Satu dokumen publik/bos yang bisa dibaca siapa pun (tanpa login). Hanya angka ringkasan.
export const URL_PUBLIK = () => `${location.origin}${location.pathname}#/info-bos`

export const muatPublik = () => muatSatu('publik', 'bos')
export async function terbitkanPublik(data) {
  const isi = { ...data, diterbitkan: new Date().toISOString() }
  await simpanSatu('publik', 'bos', isi, `Menerbitkan papan informasi publik Dana BOSP TA ${data.tahun} ${data.judul_periode}`)
  return isi
}
export const cabutPublik = () => hapusSatu('publik', 'bos', 'Mencabut papan informasi publik Dana BOSP')

/* ---------- Catatan pribadi bendahara (hanya pemiliknya) ---------- */
export const muatCatatanPribadi = () => muatSemua('catatan_pribadi', ['uid', uid()])
export const simpanCatatanPribadi = (id, data) => simpanSatu('catatan_pribadi', id, { ...data, uid: uid() })
export const hapusCatatanPribadi = (id) => hapusSatu('catatan_pribadi', id)

/* ---------- Pengingat harian ke lonceng notifikasi (Fase 8) ---------- */
// Sekali sehari per perangkat: pengingat "bahaya" & "peringatan" menjadi notifikasi lonceng (id tetap → tidak dobel).
export async function kirimPengingatHarian(daftar) {
  if (modePratinjau || !auth?.currentUser) return 0
  const hari = new Date().toISOString().slice(0, 10)
  const kunci = `sibos_pengingat_${auth.currentUser.uid}_${hari}`
  try { if (localStorage.getItem(kunci)) return 0 } catch { /* abaikan */ }
  let n = 0
  for (const x of daftar.filter((d) => d.nada !== 'info')) {
    const id = `pengingat_${auth.currentUser.uid}_${hari}_${x.kunci}`.replace(/[^\w-]/g, '_')
    try {
      await setDoc(doc(db, 'notifikasi', id), { uid: auth.currentUser.uid, jenis: x.nada === 'bahaya' ? 'galat' : 'peringatan', ikon: x.ikon, judul: x.judul, isi: x.isi, tautan: x.ke, dibaca: false, waktu: serverTimestamp() })
      n++
    } catch { /* sudah ada / ditolak: lewati */ }
  }
  try { localStorage.setItem(kunci, '1') } catch { /* abaikan */ }
  return n
}
