import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

// Hash history (#/dasbor) supaya semua halaman tetap terbuka di GitHub Pages tanpa error 404.
const routes = [
  { path: '/masuk', name: 'masuk', component: () => import('@/views/akun/Masuk.vue'), meta: { publik: true, judul: 'Masuk' } },
  { path: '/lupa-password', name: 'lupa', component: () => import('@/views/akun/LupaPassword.vue'), meta: { publik: true, judul: 'Lupa Password' } },
  { path: '/penyiapan-awal', name: 'penyiapan', component: () => import('@/views/akun/PenyiapanAwal.vue'), meta: { judul: 'Penyiapan Awal' } },
  { path: '/cetak/uji', component: () => import('@/views/CetakUji.vue'), meta: { judul: 'Uji Cetak F4', peran: ['bendahara'] } },
  { path: '/buat-password', name: 'buat-password', component: () => import('@/views/akun/BuatPassword.vue'), meta: { judul: 'Buat Password' } },
  {
    path: '/',
    component: () => import('@/layouts/TataLetakUtama.vue'),
    children: [
      { path: '', redirect: '/dasbor' },
      { path: 'dasbor', component: () => import('@/views/Dasbor.vue'), meta: { judul: 'Dasbor', ikon: 'LayoutDashboard' } },
      { path: 'pegawai', component: () => import('@/views/master/Pegawai.vue'), meta: { judul: 'Data Pegawai', ikon: 'Users', peran: ['bendahara', 'tim_bos', 'kepala_sekolah'] } },
      { path: 'rekanan', component: () => import('@/views/master/Rekanan.vue'), meta: { judul: 'Rekanan', ikon: 'Store' } },
      { path: 'referensi', component: () => import('@/views/master/Referensi.vue'), meta: { judul: 'Referensi Juknis', ikon: 'BookMarked' } },
      { path: 'impor', component: () => import('@/views/Impor.vue'), meta: { judul: 'Impor Data', ikon: 'FileUp', peran: ['bendahara'] } },
      { path: 'log', component: () => import('@/views/LogAktivitas.vue'), meta: { judul: 'Log Aktivitas', ikon: 'History', peran: ['bendahara', 'kepala_sekolah'] } },
      { path: 'pengaturan/:tab?', component: () => import('@/views/pengaturan/Pengaturan.vue'), meta: { judul: 'Pengaturan', ikon: 'Settings', peran: ['bendahara'] } },
      { path: 'serah-terima', component: () => import('@/views/SerahTerima.vue'), meta: { judul: 'Serah Terima Bendahara', ikon: 'Repeat', peran: ['bendahara', 'kepala_sekolah'] } },
      { path: 'notifikasi', component: () => import('@/views/Notifikasi.vue'), meta: { judul: 'Notifikasi', ikon: 'Bell' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dasbor' },
]

const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.beforeEach(async (ke) => {
  const auth = useAuth()
  if (!auth.siap) await auth.mulai()
  if (auth.perluPenyiapan) return ke.name === 'penyiapan' ? true : '/penyiapan-awal'
  if (ke.name === 'penyiapan') return auth.pengguna ? '/dasbor' : '/masuk'
  if (ke.meta.publik) return auth.pengguna ? '/dasbor' : true
  if (!auth.pengguna) return { path: '/masuk', query: { lanjut: ke.fullPath } }
  if (auth.pengguna.wajib_ganti_password && ke.name !== 'buat-password') return '/buat-password'
  if (ke.meta.peran && !auth.punyaPeran(...ke.meta.peran)) return '/dasbor'
  return true
})

router.afterEach((ke) => { document.title = `${ke.meta.judul || 'SIBOS'} · SIBOS` })

export default router
