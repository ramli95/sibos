<script setup>
// Pilihan tahun anggaran: tahun aktif, tahun berikutnya, dan tahun-tahun arsip.
import { useTahun } from '@/stores/tahun'
const props = defineProps({ modelValue: [Number, String], id: { type: String, default: 'pilih-tahun' } })
const emit = defineEmits(['update:modelValue'])
const tahun = useTahun()
</script>

<template>
  <label class="sr-only" :for="props.id">Tahun anggaran</label>
  <select :id="props.id" class="masukan flex-1 py-2 sm:w-auto sm:flex-none" :value="Number(props.modelValue)" @change="emit('update:modelValue', Number($event.target.value))">
    <option v-for="t in tahun.daftar" :key="t" :value="t">{{ tahun.label(t) }}</option>
  </select>
</template>
