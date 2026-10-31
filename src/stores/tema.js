import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Tema: 'terang' | 'gelap' | 'sistem'. Tersimpan di perangkat; nanti juga di profil pengguna.
export const useTema = defineStore('tema', () => {
  const baca = () => { try { return localStorage.getItem('sibos-tema') || 'sistem' } catch { return 'sistem' } }
  const pilihan = ref(baca())
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  function terapkan() {
    const gelap = pilihan.value === 'gelap' || (pilihan.value === 'sistem' && media.matches)
    document.documentElement.classList.toggle('dark', gelap)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', gelap ? '#0F1E4D' : '#1E3A8A')
  }

  watch(pilihan, (v) => { try { localStorage.setItem('sibos-tema', v) } catch {} terapkan() })
  media.addEventListener('change', terapkan)
  terapkan()

  return { pilihan, terapkan }
})
