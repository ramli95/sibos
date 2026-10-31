<script setup>
import { useTema } from '@/stores/tema'
import Ikon from './Ikon.vue'

defineProps({ gelapLatar: Boolean })
const tema = useTema()
const pilihan = [
  { nilai: 'terang', ikon: 'Sun', label: 'Terang' },
  { nilai: 'gelap', ikon: 'Moon', label: 'Gelap' },
  { nilai: 'sistem', ikon: 'Monitor', label: 'Sistem' },
]
</script>

<template>
  <div role="radiogroup" aria-label="Tema tampilan"
       :class="['flex gap-1 rounded-xl p-1', gelapLatar ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800']">
    <button v-for="p in pilihan" :key="p.nilai" type="button" role="radio" :aria-checked="tema.pilihan === p.nilai" :title="p.label"
            :class="['flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
                     tema.pilihan === p.nilai ? 'bg-biru text-white shadow'
                       : gelapLatar ? 'text-blue-100/80 hover:bg-white/10' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700']"
            @click="tema.pilihan = p.nilai">
      <Ikon :nama="p.ikon" :ukuran="15" /> <span>{{ p.label }}</span>
    </button>
  </div>
</template>
