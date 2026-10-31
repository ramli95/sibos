// Inisialisasi Firebase. Konfigurasi dibaca dari variabel VITE_FIREBASE_* (lihat .env.example).
// Bila konfigurasi belum diisi, SIBOS berjalan dalam "Mode Pratinjau" tanpa koneksi data.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const modePratinjau = !config.apiKey || !config.projectId

export const app = modePratinjau ? null : initializeApp(config)
export const auth = modePratinjau ? null : getAuth(app)
// Cache lokal: halaman tetap terbuka saat sinyal lemah, sinkron otomatis saat online
export const db = modePratinjau
  ? null
  : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })

// Domain email sintetis untuk pengguna tanpa email (username → email di belakang layar)
export const DOMAIN_AKUN = 'akun.sibos-smpn19.id'
