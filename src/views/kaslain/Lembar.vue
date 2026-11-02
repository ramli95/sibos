<script setup>
// Lembar bawah (HP) / dialog (layar lebar) untuk formulir Kas Lain.
import { onMounted, onBeforeUnmount } from 'vue'
import Ikon from '@/components/Ikon.vue'
const props = defineProps({ judul: String, sub: String, ikon: { type: String, default: 'NotebookPen' }, chip: { type: String, default: 'ikon-chip' }, lebar: { type: String, default: 'max-w-lg' } })
const emit = defineEmits(['tutup'])
onMounted(() => { document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { document.body.style.overflow = '' })
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] grid place-items-end bg-slate-900/40 sm:place-items-center sm:p-4" @click.self="emit('tutup')">
      <div :class="['flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-slate-900', props.lebar]">
        <header class="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', props.chip]"><Ikon :nama="props.ikon" :ukuran="19" /></span>
          <div class="min-w-0 flex-1"><h2 class="font-bold leading-tight">{{ props.judul }}</h2><p v-if="props.sub" class="truncate text-xs text-slate-500">{{ props.sub }}</p></div>
          <button type="button" class="text-slate-400" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="20" /></button>
        </header>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"><slot /></div>
        <footer v-if="$slots.kaki" class="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800"><slot name="kaki" /></footer>
      </div>
    </div>
  </Teleport>
</template>
