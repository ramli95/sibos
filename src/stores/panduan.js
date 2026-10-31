// Keadaan tur interaktif Panduan Input: tur aktif, langkah, dan tur yang sudah pernah dilihat (per perangkat).
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TUR } from '@/config/panduan'

const KUNCI = 'sibos-tur-dilihat'
const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || '[]') } catch { return [] } }
const tulis = (v) => { try { localStorage.setItem(KUNCI, JSON.stringify(v)) } catch { /* penyimpanan peramban tidak tersedia */ } }

export const usePanduan = defineStore('panduan', () => {
  const aktif = ref(null)   // kunci tur
  const langkah = ref(0)
  const dilihat = ref(baca())

  const tur = computed(() => (aktif.value ? TUR[aktif.value] : null))
  const sudah = (k) => dilihat.value.includes(k)
  function tandai(k) { if (!sudah(k)) { dilihat.value = [...dilihat.value, k]; tulis(dilihat.value) } }

  function mulai(k) { if (!TUR[k]) return; aktif.value = k; langkah.value = 0 }
  function lanjut() { if (!tur.value) return; if (langkah.value < tur.value.langkah.length - 1) langkah.value++; else selesai() }
  function kembali() { if (langkah.value > 0) langkah.value-- }
  function selesai() { if (aktif.value) tandai(aktif.value); aktif.value = null; langkah.value = 0 }
  function ulangSemua() { dilihat.value = []; tulis([]) }

  return { aktif, langkah, tur, dilihat, sudah, tandai, mulai, lanjut, kembali, selesai, ulangSemua }
})
