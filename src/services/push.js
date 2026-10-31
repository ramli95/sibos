// Notifikasi push (Firebase Cloud Messaging) untuk HP & laptop.
// Service worker khusus push berada di fcm/sw.js (cakupan terpisah dari service worker PWA).
import { doc, getDoc, updateDoc, arrayUnion, setDoc, serverTimestamp } from 'firebase/firestore'
import { app, db, auth, modePratinjau } from './firebase'

export const pushDidukung = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window

export async function bacaVapid() {
  if (modePratinjau) return ''
  const s = await getDoc(doc(db, 'sistem', 'notifikasi'))
  return s.data()?.vapid || ''
}

export async function simpanVapid(vapid) {
  await setDoc(doc(db, 'sistem', 'notifikasi'), { vapid: vapid.trim(), diperbarui: serverTimestamp() }, { merge: true })
}

export const izinPush = () => (pushDidukung() ? Notification.permission : 'tidak_didukung')

export async function aktifkanPush() {
  if (!pushDidukung()) throw new Error('Peramban ini belum mendukung notifikasi push. Di iPhone, pasang SIBOS ke Layar Utama terlebih dahulu.')
  const vapid = await bacaVapid()
  if (!vapid) throw new Error('Kunci notifikasi (VAPID) belum diisi Bendahara di Pengaturan → Notifikasi.')
  const izin = await Notification.requestPermission()
  if (izin !== 'granted') throw new Error('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di peramban.')
  const base = import.meta.env.BASE_URL
  const reg = await navigator.serviceWorker.register(`${base}fcm/sw.js`, { scope: `${base}fcm/` })
  const { getMessaging, getToken } = await import('firebase/messaging')
  const token = await getToken(getMessaging(app), { vapidKey: vapid, serviceWorkerRegistration: reg })
  if (!token) throw new Error('Token notifikasi tidak didapat.')
  await updateDoc(doc(db, 'pengguna', auth.currentUser.uid), { token_fcm: arrayUnion(token) })
  return token
}

/** Pesan push saat aplikasi sedang terbuka (ditampilkan sebagai toast) */
export async function dengarkanPushDepan(tampilkan) {
  if (modePratinjau || !pushDidukung() || Notification.permission !== 'granted') return
  try {
    const { getMessaging, onMessage } = await import('firebase/messaging')
    onMessage(getMessaging(app), (p) => tampilkan(p.notification?.title || 'SIBOS', p.notification?.body || ''))
  } catch { /* abaikan */ }
}
