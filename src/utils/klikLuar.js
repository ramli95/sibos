import { onMounted, onBeforeUnmount } from 'vue'

// Menutup menu tarik-turun saat pengguna mengklik di luar elemen
export function onClickOutside(elRef, fungsi) {
  const tangani = (e) => { if (elRef.value && !elRef.value.contains(e.target)) fungsi(e) }
  onMounted(() => document.addEventListener('pointerdown', tangani))
  onBeforeUnmount(() => document.removeEventListener('pointerdown', tangani))
}
