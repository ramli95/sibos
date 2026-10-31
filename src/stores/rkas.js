// Keadaan RKAS yang dipakai bersama (halaman RKAS, Dasbor, Standar Harga).
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { muatDaftarVersi, muatUraian } from '@/services/rkas'
import { muatReferensi } from '@/services/referensi'
import { pencariNama } from '@/utils/rkasPohon'

export const useRkas = defineStore('rkas', () => {
  const tahun = ref(2026)
  const daftarVersi = ref([])
  const idVersi = ref(null)
  const uraian = ref([])
  const memuat = ref(false)
  const galat = ref('')
  const nama = ref(pencariNama())
  let dimuat = false

  const versi = computed(() => daftarVersi.value.find((v) => v.id === idVersi.value) || null)
  const versiBerlaku = computed(() => daftarVersi.value.find((v) => v.berlaku) || daftarVersi.value[daftarVersi.value.length - 1] || null)

  async function muatNama() {
    const [keg, rek] = await Promise.all([muatReferensi('kegiatan_arkas').catch(() => ({ butir: [] })), muatReferensi('rekening_arkas').catch(() => ({ butir: [] }))])
    nama.value = pencariNama(keg.butir, rek.butir)
  }

  async function muat({ segar = false } = {}) {
    if (dimuat && !segar) return
    memuat.value = true
    galat.value = ''
    try {
      const [d] = await Promise.all([muatDaftarVersi(tahun.value), muatNama()])
      daftarVersi.value = d
      if (!d.find((v) => v.id === idVersi.value)) idVersi.value = versiBerlaku.value?.id || null
      await pilihVersi(idVersi.value, { segar })
      dimuat = true
    } catch (e) { galat.value = e.message } finally { memuat.value = false }
  }

  async function pilihVersi(id, { segar = false } = {}) {
    idVersi.value = id
    uraian.value = id ? await muatUraian(id, { segar }) : []
  }

  async function gantiTahun(t) { tahun.value = Number(t); dimuat = false; idVersi.value = null; await muat() }

  return { tahun, daftarVersi, idVersi, versi, versiBerlaku, uraian, memuat, galat, nama, muat, muatNama, pilihVersi, gantiTahun }
})
