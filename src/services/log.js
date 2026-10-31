// Log aktivitas: setiap perubahan data tercatat (siapa, apa, kapan).
// Log hanya bisa ditambah, tidak bisa diubah atau dihapus (dijaga Firestore Rules).
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, modePratinjau } from './firebase'

export async function catatAktivitas(aksi, keterangan, data = {}) {
  if (modePratinjau || !auth?.currentUser) return
  try {
    await addDoc(collection(db, 'log_aktivitas'), {
      uid: auth.currentUser.uid,
      aksi, // contoh: masuk, tambah, ubah, hapus, impor, cadangan, buka_bulan
      keterangan,
      koleksi: data.koleksi || null,
      id_dokumen: data.id || null,
      sebelum: data.sebelum ?? null,
      sesudah: data.sesudah ?? null,
      waktu: serverTimestamp(),
      perangkat: navigator.userAgent.slice(0, 160),
    })
  } catch (e) {
    console.warn('Log aktivitas gagal dicatat', e)
  }
}
