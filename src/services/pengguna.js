// Kelola akun pengguna SIBOS (hanya Bendahara/Admin).
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, getDocs, orderBy, query, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore'
import { app, db, auth, DOMAIN_AKUN } from './firebase'

export async function daftarPengguna() {
  const s = await getDocs(query(collection(db, 'pengguna'), orderBy('nama')))
  return s.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

/** Password sementara yang mudah dibacakan: 3 huruf + 4 angka + 1 huruf, mis. "Kbt4819m" */
export function passwordSementara() {
  const huruf = 'abcdefghjkmnpqrstuvwxyz'
  const acak = (s) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length]
  const angka = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
  return acak(huruf).toUpperCase() + acak(huruf) + acak(huruf) + angka + acak(huruf)
}

/**
 * Membuat akun baru tanpa mengeluarkan Admin yang sedang login:
 * akun dibuat lewat instance Firebase kedua, lalu profilnya ditulis oleh Admin.
 */
export async function buatPengguna({ username, nama, email, peran, nip }) {
  const u = username.trim().toLowerCase()
  if (!/^[a-z0-9._]{3,30}$/.test(u)) throw new Error('Username 3–30 karakter: huruf kecil, angka, titik, atau garis bawah.')
  if ((await getDoc(doc(db, 'akun_login', u))).exists()) throw new Error(`Username "${u}" sudah dipakai.`)
  const emailLogin = (email || '').trim().toLowerCase() || `${u}@${DOMAIN_AKUN}`
  const sandi = passwordSementara()

  const kedua = initializeApp(app.options, `pembuat-akun-${Date.now()}`)
  let uid
  try {
    const kred = await createUserWithEmailAndPassword(getAuth(kedua), emailLogin, sandi)
    uid = kred.user.uid
    await signOut(getAuth(kedua))
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') throw new Error('Email ini sudah terdaftar di SIBOS.')
    throw e
  } finally {
    await deleteApp(kedua)
  }

  const b = writeBatch(db)
  b.set(doc(db, 'pengguna', uid), {
    username: u, nama, email: email ? emailLogin : '', nip: nip || '', peran, aktif: true,
    wajib_ganti_password: true, dibuat: serverTimestamp(), dibuat_oleh: auth.currentUser.uid,
  })
  b.set(doc(db, 'akun_login', u), { email: emailLogin })
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi: 'tambah', keterangan: `Membuat akun ${nama} (@${u}) dengan peran ${peran.join(', ')}`,
    koleksi: 'pengguna', id_dokumen: uid, sebelum: null, sesudah: { username: u, peran }, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
  await b.commit()
  return { uid, username: u, password: sandi }
}

export async function ubahPeran(target, peran, aktif = true) {
  const b = writeBatch(db)
  b.update(doc(db, 'pengguna', target.uid), { peran, aktif, diubah: serverTimestamp(), diubah_oleh: auth.currentUser.uid })
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi: 'ubah', keterangan: `Mengubah peran ${target.nama}: ${peran.join(', ') || '(tanpa peran)'}${aktif ? '' : ' — dinonaktifkan'}`,
    koleksi: 'pengguna', id_dokumen: target.uid, sebelum: { peran: target.peran, aktif: target.aktif }, sesudah: { peran, aktif },
    waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
  await b.commit()
}
