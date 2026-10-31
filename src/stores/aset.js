// Barang & Aset per tahun: inventaris (semua tahun), ruangan, kelas barang, BAST, persediaan.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBelanja } from './belanja'
import { muatAset, muatRuang, muatKelas, muatBast, muatPersediaan } from '@/services/aset'
import { itemBarang, bukuPersediaan } from '@/utils/aset'

export const useAset = defineStore('aset', () => {
  const belanja = useBelanja()
  const aset = ref([])
  const ruang = ref([])
  const kelas = ref({})
  const bast = ref([])
  const persediaan = ref([])
  const memuat = ref(false)
  const galat = ref('')
  let dimuat = null

  async function muat({ segar = false, tahun } = {}) {
    if (tahun) await belanja.muat({ tahun }); else await belanja.muat()
    const t = belanja.tahun
    if (dimuat === t && !segar) return
    memuat.value = true
    galat.value = ''
    try {
      const [a, r, k, b, p] = await Promise.all([muatAset(), muatRuang(), muatKelas(t), muatBast(t), muatPersediaan(t)])
      aset.value = a; ruang.value = r; kelas.value = k; bast.value = b; persediaan.value = p
      if (segar) await belanja.muat({ segar: true })
      dimuat = t
    } catch (e) { galat.value = e.message } finally { memuat.value = false }
  }
  const segarkan = () => muat({ segar: true })

  const aktif = computed(() => aset.value.filter((a) => a.status !== 'dihapus'))
  const barang = computed(() => itemBarang(belanja.daftar, kelas.value, aset.value))
  const buku = computed(() => bukuPersediaan(barang.value, persediaan.value))
  const namaRuang = (id) => ruang.value.find((r) => r.id === id)?.nama || ''

  return { tahun: computed(() => belanja.tahun), aset, aktif, ruang, kelas, bast, persediaan, memuat, galat, muat, segarkan, barang, buku, namaRuang }
})
