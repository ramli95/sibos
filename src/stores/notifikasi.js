import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, query, where, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'

// Notifikasi lonceng (koleksi `notifikasi`, per pengguna) + pesan singkat (toast).
export const useNotifikasi = defineStore('notifikasi', () => {
  const daftar = ref([])
  const toast = ref([])
  let berhenti = null

  const belumDibaca = computed(() => daftar.value.filter((n) => !n.dibaca).length)

  function mulai(uid) {
    hentikan()
    if (modePratinjau) {
      daftar.value = [
        { id: 'a', jenis: 'info', ikon: 'Sparkles', judul: 'Selamat datang di SIBOS', isi: 'Fase 1 — Fondasi sudah siap dipakai.', waktu: new Date(), dibaca: false },
        { id: 'b', jenis: 'sukses', ikon: 'CloudUpload', judul: 'Cadangan berhasil', isi: '128 dokumen dicadangkan ke Google Drive.', waktu: new Date(Date.now() - 864e5), dibaca: true },
      ]
      return
    }
    berhenti = onSnapshot(query(collection(db, 'notifikasi'), where('uid', '==', uid), limit(100)), (s) => {
      daftar.value = s.docs.map((d) => ({ id: d.id, ...d.data(), waktu: d.data().waktu?.toDate?.() || null }))
        .sort((a, b) => (b.waktu || 0) - (a.waktu || 0))
    }, () => {})
  }
  function hentikan() { berhenti?.(); berhenti = null; daftar.value = [] }

  async function tandai(n) {
    if (n.dibaca) return
    n.dibaca = true
    if (!modePratinjau) await updateDoc(doc(db, 'notifikasi', n.id), { dibaca: true }).catch(() => {})
  }
  async function tandaiSemua() {
    const belum = daftar.value.filter((n) => !n.dibaca)
    belum.forEach((n) => (n.dibaca = true))
    if (modePratinjau || !belum.length) return
    const b = writeBatch(db)
    belum.slice(0, 400).forEach((n) => b.update(doc(db, 'notifikasi', n.id), { dibaca: true }))
    await b.commit().catch(() => {})
  }

  function kabari(pesan, jenis = 'sukses') {
    const id = Date.now() + Math.random()
    toast.value.push({ id, pesan, jenis })
    setTimeout(() => (toast.value = toast.value.filter((t) => t.id !== id)), 4500)
  }

  return { daftar, toast, belumDibaca, mulai, hentikan, tandai, tandaiSemua, kabari }
})
