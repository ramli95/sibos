<script setup>
// Panel samping (desktop) / layar penuh (HP) untuk formulir
import { onMounted, onBeforeUnmount } from 'vue'
import Ikon from './Ikon.vue'

const props = defineProps({ judul: String, subjudul: String, ikon: { type: String, default: 'Pencil' }, warna: { type: String, default: '' }, lebar: { type: String, default: 'max-w-2xl' } })
const emit = defineEmits(['tutup'])
const esc = (e) => { if (e.key === 'Escape') emit('tutup') }
onMounted(() => { addEventListener('keydown', esc); document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { removeEventListener('keydown', esc); document.body.style.overflow = '' })
</script>

<template>
  <Teleport to="body">
    <div class="tanpa-cetak fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" @click="emit('tutup')" />
      <section :class="['relative flex h-full w-full flex-col bg-white shadow-2xl dark:bg-[#161D2B]', props.lebar]" role="dialog" aria-modal="true" :aria-label="props.judul">
        <header class="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <span :class="['grid h-10 w-10 place-items-center rounded-xl ikon-chip']"><Ikon :nama="props.ikon" :ukuran="19" /></span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate font-bold">{{ props.judul }}</h2>
            <p v-if="props.subjudul" class="truncate text-xs text-slate-500">{{ props.subjudul }}</p>
          </div>
          <button class="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="19" /></button>
        </header>
        <div class="flex-1 overflow-y-auto"><slot /></div>
        <footer v-if="$slots.kaki" class="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-700"><slot name="kaki" /></footer>
      </section>
    </div>
  </Teleport>
</template>
