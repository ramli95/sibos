<script setup>
// Pita pemberitahuan saat membuka tahun arsip atau tahun berikutnya.
import { computed } from 'vue'
import { useTahun } from '@/stores/tahun'
import Ikon from './Ikon.vue'
const props = defineProps({ tahun: [Number, String] })
const ta = useTahun()
const status = computed(() => ta.statusTahun(props.tahun))
</script>

<template>
  <div v-if="status !== 'aktif'" :class="['flex items-start gap-3 rounded-2xl p-3.5 text-sm', status === 'arsip' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-[#E3A414]/12 text-[#7A5300] dark:text-[#F2C14E]']">
    <Ikon :nama="status === 'arsip' ? 'Archive' : 'CalendarPlus'" :ukuran="18" class="mt-0.5 shrink-0" />
    <p v-if="status === 'arsip'"><b>TA {{ props.tahun }} adalah arsip.</b> Data tetap bisa dibuka, dicetak dan diekspor. Tahun aktif: TA {{ ta.aktif }}. Perubahan pada arsip tetap tercatat di Log Aktivitas.</p>
    <p v-else><b>TA {{ props.tahun }} belum aktif.</b> Bisa dipakai untuk menyiapkan RKAS tahun depan. Tahun aktif: TA {{ ta.aktif }}.</p>
  </div>
</template>
