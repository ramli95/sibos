import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Notifikasi lonceng (di aplikasi) + pesan singkat (toast).
// Sumber Firestore `notifikasi` dan push FCM disambungkan setelah proyek Firebase siap.
export const useNotifikasi = defineStore('notifikasi', () => {
  const daftar = ref([
    { id: 1, jenis: 'info', ikon: 'Sparkles', judul: 'Selamat datang di SIBOS', isi: 'Fase 1 — Fondasi sedang disiapkan.', waktu: new Date(), dibaca: false },
    { id: 2, jenis: 'peringatan', ikon: 'HardDrive', judul: 'Penghubung Drive belum tersambung', isi: 'Isi URL Apps Script di Pengaturan → Drive & Cadangan.', waktu: new Date(), dibaca: false },
  ])
  const toast = ref([])

  const belumDibaca = computed(() => daftar.value.filter((n) => !n.dibaca).length)
  const tandaiSemua = () => daftar.value.forEach((n) => (n.dibaca = true))

  function kabari(pesan, jenis = 'sukses') {
    const id = Date.now() + Math.random()
    toast.value.push({ id, pesan, jenis })
    setTimeout(() => (toast.value = toast.value.filter((t) => t.id !== id)), 4000)
  }

  return { daftar, toast, belumDibaca, tandaiSemua, kabari }
})
