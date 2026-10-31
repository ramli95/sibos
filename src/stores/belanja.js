// Daftar belanja per tahun + realisasi (dipakai Belanja, RKAS, Dasbor).
// Realisasi = transaksi berstatus Lunas, dibukukan pada bulan tanggal lunas.
// Pemakaian pagu (untuk peringatan sisa pagu) = semua transaksi yang sudah dicatat, termasuk yang belum lunas.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { muatDaftarBelanja } from '@/services/belanja'
import { kunciUraian, tanggalRealisasi } from '@/utils/belanja'
import { dariIso } from '@/utils/format'

export const useBelanja = defineStore('belanja', () => {
  const tahun = ref(2026)
  const daftar = ref([])
  const memuat = ref(false)
  const galat = ref('')
  let dimuat = null

  async function muat({ segar = false, tahun: t } = {}) {
    if (t && Number(t) !== tahun.value) { tahun.value = Number(t); dimuat = null }
    if (dimuat === tahun.value && !segar) return
    memuat.value = true
    galat.value = ''
    try { daftar.value = await muatDaftarBelanja(tahun.value); dimuat = tahun.value } catch (e) { galat.value = e.message } finally { memuat.value = false }
  }

  const bulanDari = (b) => { const d = dariIso(tanggalRealisasi(b)); return d ? d.getMonth() : null }

  /** Per kunci uraian: { rencana… tidak di sini }, { lunas, komitmen, bulan[12] lunas, bulanKomitmen[12] } */
  function hitungPemakaian(kecualiId = null) {
    const peta = new Map()
    daftar.value.forEach((b) => {
      if (b.id === kecualiId) return
      const m = bulanDari(b)
      ;(b.item || []).forEach((i) => {
        const k = kunciUraian(i)
        if (!peta.has(k)) peta.set(k, { lunas: 0, komitmen: 0, bulan: Array(12).fill(0), bulanKomitmen: Array(12).fill(0) })
        const x = peta.get(k)
        x.komitmen += i.jumlah
        if (m != null) x.bulanKomitmen[m] += i.jumlah
        if (b.status === 'lunas') { x.lunas += i.jumlah; if (m != null) x.bulan[m] += i.jumlah }
      })
    })
    return peta
  }
  const pemakaian = computed(() => hitungPemakaian())

  const lunas = computed(() => daftar.value.filter((b) => b.status === 'lunas'))
  const totalRealisasi = computed(() => lunas.value.reduce((s, b) => s + (b.total || 0), 0))
  const realisasiBulanan = computed(() => {
    const r = Array(12).fill(0)
    lunas.value.forEach((b) => { const m = bulanDari(b); if (m != null) r[m] += b.total || 0 })
    return r
  })
  const realisasiKategori = computed(() => {
    const r = { operasional: 0, alat_mesin: 0, aset_lain: 0 }
    lunas.value.forEach((b) => (b.item || []).forEach((i) => { r[i.kategori] = (r[i.kategori] || 0) + i.jumlah }))
    return r
  })

  function ganti(b) {
    const i = daftar.value.findIndex((x) => x.id === b.id)
    if (i >= 0) daftar.value[i] = b; else daftar.value.unshift(b)
  }
  function buang(id) { daftar.value = daftar.value.filter((x) => x.id !== id) }

  return { tahun, daftar, memuat, galat, muat, pemakaian, hitungPemakaian, lunas, totalRealisasi, realisasiBulanan, realisasiKategori, ganti, buang }
})
