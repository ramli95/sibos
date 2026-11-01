// Keadaan RKAS yang dipakai bersama (halaman RKAS, Dasbor, Standar Harga).
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { muatDaftarVersi, muatUraian } from '@/services/rkas'
import { muatReferensi } from '@/services/referensi'
import { pencariNama } from '@/utils/rkasPohon'
import { useTahun } from './tahun'

export const useRkas = defineStore('rkas', () => {
  const tahun = ref(2026)
  const daftarVersi = ref([])
  const idVersi = ref(null)
  const uraian = ref([])
  const memuat = ref(false)
  const galat = ref('')
  const nama = ref(pencariNama())
  const refKegiatan = ref([])
  const refRekening = ref([])
  let dimuat = false

  const versi = computed(() => daftarVersi.value.find((v) => v.id === idVersi.value) || null)
  const versiBerlaku = computed(() => daftarVersi.value.find((v) => v.berlaku) || daftarVersi.value.filter((v) => !v.draf).slice(-1)[0] || null)

  async function muatNama() {
    const [keg, rek] = await Promise.all([muatReferensi('kegiatan_arkas').catch(() => ({ butir: [] })), muatReferensi('rekening_arkas').catch(() => ({ butir: [] }))])
    nama.value = pencariNama(keg.butir, rek.butir)
    refKegiatan.value = keg.butir; refRekening.value = rek.butir
  }

  let tahunDiatur = false
  async function muat({ segar = false } = {}) {
    if (dimuat && !segar) return
    if (!tahunDiatur) { const ta = useTahun(); if (ta.siap) { tahun.value = ta.aktif; tahunDiatur = true } }
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

  async function gantiTahun(t) { tahunDiatur = true; tahun.value = Number(t); dimuat = false; idVersi.value = null; await muat() }

  /** Ganti isi uraian versi aktif tanpa memuat ulang (setelah edit draf) */
  function pasangUraian(daftar) { uraian.value = [...daftar] }
  async function muatDaftar() { daftarVersi.value = await muatDaftarVersi(tahun.value) }

  return { tahun, daftarVersi, idVersi, versi, versiBerlaku, uraian, refKegiatan, refRekening, pasangUraian, muatDaftar, memuat, galat, nama, muat, muatNama, pilihVersi, gantiTahun }
})
