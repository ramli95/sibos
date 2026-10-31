/* Service worker push SIBOS — menampilkan notifikasi dari Firebase Cloud Messaging */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let p = {}
  try { p = e.data ? e.data.json() : {} } catch { p = { notification: { body: e.data && e.data.text() } } }
  const n = p.notification || {}
  const d = p.data || {}
  const judul = n.title || d.title || 'SIBOS'
  const tautan = (p.fcmOptions && p.fcmOptions.link) || d.link || self.registration.scope.replace(/fcm\/$/, '')
  e.waitUntil(self.registration.showNotification(judul, {
    body: n.body || d.body || '',
    icon: self.registration.scope.replace(/fcm\/$/, '') + 'pwa-192.png',
    badge: self.registration.scope.replace(/fcm\/$/, '') + 'favicon-32.png',
    tag: d.tag || undefined,
    data: { tautan },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const tujuan = (e.notification.data && e.notification.data.tautan) || '/'
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const ada = ws.find((w) => w.url.startsWith(tujuan.split('#')[0]))
    return ada ? ada.focus() : self.clients.openWindow(tujuan)
  }))
})
