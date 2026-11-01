import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, modePratinjau, DOMAIN_AKUN } from '@/services/firebase'
import { catatAktivitas } from '@/services/log'
import { PEMILIK_AWAL } from '@/config/sekolahAwal'

// Login memakai username ATAU email. Username dipetakan ke email di belakang layar:
//  - email asli bila pengguna mendaftarkan email (koleksi akun_login/{username})
//  - email sintetis username@akun.sibos-smpn19.id bila tidak punya email (reset oleh Admin)
export const useAuth = defineStore('auth', () => {
  const pengguna = ref(null) // { uid, username, nama, peran[], wajib_ganti_password, email }
  const siap = ref(false)
  // Akun pemilik yang sudah login tetapi sistem belum disiapkan → diarahkan ke Penyiapan Awal
  const perluPenyiapan = ref(false)
  const akunFirebase = ref(null)

  const peran = computed(() => pengguna.value?.peran || [])
  const punyaPeran = (...daftar) => daftar.length === 0 || daftar.some((p) => peran.value.includes(p))
  const isAdmin = computed(() => peran.value.includes('bendahara'))

  async function emailDariUsername(masukan) {
    const u = masukan.trim().toLowerCase()
    if (u.includes('@')) return { email: u, asli: true }
    const snap = await getDoc(doc(db, 'akun_login', u))
    return { email: snap.exists() ? snap.data().email : `${u}@${DOMAIN_AKUN}`, asli: snap.exists() && !snap.data().email.endsWith(DOMAIN_AKUN) }
  }

  async function muatProfil(user) {
    akunFirebase.value = user
    perluPenyiapan.value = false
    const snap = await getDoc(doc(db, 'pengguna', user.uid)).catch(() => null)
    if (snap?.exists() && snap.data().aktif !== false) {
      pengguna.value = { uid: user.uid, ...snap.data() }
      return
    }
    // Belum ada profil: bila ini email pemilik & sistem belum disiapkan → Penyiapan Awal
    if (user.email === PEMILIK_AWAL.email) {
      const penyiapan = await getDoc(doc(db, 'sistem', 'penyiapan')).catch(() => null)
      if (!penyiapan?.exists()) {
        perluPenyiapan.value = true
        pengguna.value = null
        return
      }
    }
    await signOut(auth)
    akunFirebase.value = null
    throw new Error('Akun belum terdaftar atau dinonaktifkan. Hubungi Bendahara.')
  }

  function mulai() {
    if (modePratinjau) { siap.value = true; return Promise.resolve() }
    return new Promise((selesai) => {
      onAuthStateChanged(auth, async (user) => {
        try { if (user) await muatProfil(user); else { pengguna.value = null; akunFirebase.value = null } } catch { pengguna.value = null }
        siap.value = true
        selesai()
      })
    })
  }

  async function masuk(username, password) {
    try { localStorage.setItem('sibos_aktif_terakhir', String(Date.now())) } catch { /* abaikan */ } // hitungan keluar otomatis mulai dari login
    if (modePratinjau) {
      pengguna.value = {
        uid: 'pratinjau', username: username || 'ramli', nama: 'Ramli, S.Pd., M.Pd., Gr.', email: PEMILIK_AWAL.email,
        peran: ['bendahara', 'tim_bos'], wajib_ganti_password: false, aktif: true,
      }
      return
    }
    const { email } = await emailDariUsername(username)
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      await muatProfil(user)
      if (pengguna.value) await catatAktivitas('masuk', 'Masuk ke SIBOS')
    } catch (e) {
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(e.code)) {
        throw new Error('Username atau password salah.')
      }
      if (e.code === 'auth/too-many-requests') throw new Error('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.')
      throw e
    }
  }

  async function muatUlangProfil() {
    if (akunFirebase.value) await muatProfil(akunFirebase.value)
  }

  async function buatPassword(baru) {
    if (modePratinjau) { pengguna.value.wajib_ganti_password = false; return }
    await updatePassword(auth.currentUser, baru)
    await updateDoc(doc(db, 'pengguna', pengguna.value.uid), { wajib_ganti_password: false, password_diubah: serverTimestamp() })
    pengguna.value.wajib_ganti_password = false
    await catatAktivitas('ubah_password', 'Membuat password baru')
  }

  // Hasil: 'terkirim' (tautan ke email) atau 'hubungi_admin' (tidak punya email)
  async function lupaPassword(username) {
    if (modePratinjau) return 'terkirim'
    const { email, asli } = await emailDariUsername(username)
    if (!asli) return 'hubungi_admin'
    await sendPasswordResetEmail(auth, email)
    return 'terkirim'
  }

  async function keluar() {
    if (!modePratinjau) { if (pengguna.value) await catatAktivitas('keluar', 'Keluar dari SIBOS'); await signOut(auth) }
    pengguna.value = null
    akunFirebase.value = null
    perluPenyiapan.value = false
  }

  return {
    pengguna, siap, peran, isAdmin, perluPenyiapan, akunFirebase,
    punyaPeran, mulai, masuk, muatUlangProfil, buatPassword, lupaPassword, keluar,
  }
})
