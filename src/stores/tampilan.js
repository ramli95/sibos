import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Preferensi tampilan per perangkat: sidebar 'tetap' (selalu lebar) atau 'otomatis' (ikon saja, melebar saat disentuh)
export const useTampilan = defineStore('tampilan', () => {
  const baca = () => { try { return localStorage.getItem('sibos-sidebar') || 'tetap' } catch { return 'tetap' } }
  const sidebar = ref(baca())
  watch(sidebar, (v) => { try { localStorage.setItem('sibos-sidebar', v) } catch {} })
  const alihSidebar = () => (sidebar.value = sidebar.value === 'tetap' ? 'otomatis' : 'tetap')
  return { sidebar, alihSidebar }
})
