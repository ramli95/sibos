import { doc, getDoc, writeBatch, collection, serverTimestamp } from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { JENIS_REFERENSI } from '@/config/referensiAwal'

const cache = {}

/** { butir: [...], tersimpan: bool } — bila belum tersimpan, berisi data awal */
export async function muatReferensi(jenis, { segar = false } = {}) {
  if (!segar && cache[jenis]) return cache[jenis]
  const def = JENIS_REFERENSI.find((j) => j.kunci === jenis)
  let hasil = { butir: def.awal.map((b) => ({ ...b })), tersimpan: false }
  if (!modePratinjau) {
    const s = await getDoc(doc(db, 'referensi', jenis))
    if (s.exists()) hasil = { butir: s.data().butir || [], tersimpan: true, diperbarui: s.data().diperbarui }
  }
  cache[jenis] = hasil
  return hasil
}

export async function simpanReferensi(jenis, butir, keterangan) {
  const b = writeBatch(db)
  b.set(doc(db, 'referensi', jenis), { butir, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi: 'ubah', keterangan, koleksi: 'referensi', id_dokumen: jenis,
    sebelum: null, sesudah: { jumlah: butir.length }, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
  await b.commit()
  cache[jenis] = { butir, tersimpan: true }
}

/** Memasang data awal untuk semua tabel yang belum tersimpan */
export async function pasangSemuaAwal() {
  const b = writeBatch(db)
  let n = 0
  for (const j of JENIS_REFERENSI) {
    const s = await getDoc(doc(db, 'referensi', j.kunci))
    if (!s.exists()) { b.set(doc(db, 'referensi', j.kunci), { butir: j.awal, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }); n++ }
    delete cache[j.kunci]
  }
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi: 'tambah', keterangan: `Memasang data awal ${n} tabel referensi juknis`, koleksi: 'referensi', id_dokumen: null,
    sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
  await b.commit()
  return n
}
