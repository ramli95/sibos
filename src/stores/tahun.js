// Tahun anggaran aktif & arsip.
// sistem/tahun_anggaran: { aktif, mulai, riwayat: [{ dari, ke, waktu, uid }] }
// Tahun sebelum tahun aktif otomatis berstatus ARSIP: tetap bisa dibuka, dicetak dan diekspor.
// Peralihan tidak menghapus data apa pun; sisa saldo dapat dibawa sebagai saldo awal tahun baru.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, writeBatch, collection, serverTimestamp } from 'firebase/firestore'
import { db, auth, modePratinjau } from '@/services/firebase'

export const TAHUN_MULAI = 2026
const contoh = { aktif: 2026, mulai: TAHUN_MULAI, riwayat: [] }

export const useTahun = defineStore('tahun', () => {
  const aktif = ref(2026)
  const mulai = ref(TAHUN_MULAI)
  const riwayat = ref([])
  const siap = ref(false)

  async function muat({ segar = false } = {}) {
    if (siap.value && !segar) return
    try {
      let d = null
      if (modePratinjau) d = contoh
      else { const s = await getDoc(doc(db, 'sistem', 'tahun_anggaran')); d = s.exists() ? s.data() : null }
      aktif.value = Number(d?.aktif) || Math.max(TAHUN_MULAI, new Date().getFullYear())
      mulai.value = Number(d?.mulai) || TAHUN_MULAI
      riwayat.value = d?.riwayat || []
    } catch { aktif.value = Math.max(TAHUN_MULAI, new Date().getFullYear()) }
    siap.value = true
  }

  /** Semua tahun yang bisa dibuka: dari tahun mulai sampai tahun aktif + 1 (menyiapkan RKAS tahun depan), terbaru dulu */
  const daftar = computed(() => {
    const d = []
    for (let t = aktif.value + 1; t >= Math.min(mulai.value, aktif.value); t--) d.push(t)
    return d
  })
  const isArsip = (t) => Number(t) < aktif.value
  const statusTahun = (t) => (Number(t) === aktif.value ? 'aktif' : Number(t) < aktif.value ? 'arsip' : 'berikutnya')
  const label = (t) => `TA ${t}${isArsip(t) ? ' · arsip' : Number(t) > aktif.value ? ' · berikutnya' : ''}`

  /**
   * Alihkan tahun aktif. saldoAwal: [{ jenis:'saldo_awal', nilai, sumber:'bank'|'tunai', uraian }] dicatat di tahun baru.
   */
  async function alihkan(baru, { saldoAwal = [] } = {}) {
    const dari = aktif.value
    const entri = { dari, ke: Number(baru), waktu: new Date().toISOString(), uid: auth?.currentUser?.uid || 'pratinjau' }
    if (modePratinjau) {
      Object.assign(contoh, { aktif: Number(baru), riwayat: [...contoh.riwayat, entri] })
      const c = await import('@/services/contohKas')
      saldoAwal.forEach((s, i) => c.kas.push({ id: `saldo-awal-${baru}-${i}`, tahun: Number(baru), tanggal: `${baru}-01-01`, bnu: '', ...s }))
      await muat({ segar: true })
      return
    }
    const b = writeBatch(db)
    b.set(doc(db, 'sistem', 'tahun_anggaran'), { aktif: Number(baru), mulai: mulai.value, riwayat: [...riwayat.value, entri], diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
    saldoAwal.forEach((s, i) => b.set(doc(db, 'kas', `saldo-awal-${baru}-${s.sumber || i}`), {
      tahun: Number(baru), tanggal: `${baru}-01-01`, bnu: '', ...s, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid,
    }))
    b.set(doc(collection(db, 'log_aktivitas')), {
      uid: auth.currentUser.uid, aksi: 'ganti_tahun', keterangan: `Mengalihkan tahun anggaran aktif TA ${dari} → TA ${baru}${saldoAwal.length ? ` dengan saldo awal ${saldoAwal.map((s) => `${s.sumber} Rp ${Number(s.nilai).toLocaleString('id-ID')}`).join(', ')}` : ''}; TA ${dari} menjadi arsip`,
      koleksi: 'sistem', id_dokumen: 'tahun_anggaran', sebelum: { aktif: dari }, sesudah: { aktif: Number(baru) }, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
    })
    await b.commit()
    await muat({ segar: true })
  }

  return { aktif, mulai, riwayat, siap, muat, daftar, isArsip, statusTahun, label, alihkan }
})
