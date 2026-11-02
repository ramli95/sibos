<script setup>
// Template pesan WhatsApp (template_wa/{jenis}) — bisa diubah dan dikembalikan ke bawaan.
import { ref, onMounted } from 'vue'
import { pakaiWa } from './pakaiWa'
import { useNotifikasi } from '@/stores/notifikasi'
import { SEMUA_JENIS_WA as JENIS_WA, TEMPLATE_AWAL, ISIAN_WA } from '@/utils/wa'
import Ikon from '@/components/Ikon.vue'

const wa = pakaiWa()
const notif = useNotifikasi()
const isi = ref({})
onMounted(async () => { await wa.muat(); isi.value = { ...wa.template.value } })
async function simpan(k) { try { await wa.simpanTemplate(k, isi.value[k]); notif.kabari(`Template "${JENIS_WA[k].judul}" disimpan.`) } catch (e) { notif.kabari(e.message, 'galat') } }
function bawaan(k) { isi.value = { ...isi.value, [k]: TEMPLATE_AWAL[k] } }
function sisip(k, kunci, el) {
  const t = document.getElementById(el)
  const a = t?.selectionStart ?? isi.value[k].length
  isi.value = { ...isi.value, [k]: isi.value[k].slice(0, a) + `{${kunci}}` + isi.value[k].slice(t?.selectionEnd ?? a) }
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2" data-tur="wa-template">
    <section v-for="(j, k) in JENIS_WA" :key="k" class="kartu space-y-3 p-4">
      <div class="flex items-center gap-3">
        <span :class="['grid h-10 w-10 place-items-center rounded-xl', j.warna]"><Ikon :nama="j.ikon" :ukuran="19" /></span>
        <h3 class="flex-1 font-bold">{{ j.judul }}</h3>
        <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="bawaan(k)"><Ikon nama="Undo2" :ukuran="14" class="text-slate-500" /> Bawaan</button>
      </div>
      <textarea :id="`tpl-${k}`" v-model="isi[k]" rows="9" class="masukan text-sm" :aria-label="`Template ${j.judul}`" />
      <div class="flex flex-wrap gap-1.5">
        <button v-for="x in ISIAN_WA[k]" :key="x" class="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600 hover:bg-[#22A08D]/15 hover:text-[#167A6B] dark:bg-slate-800 dark:text-slate-300" @click="sisip(k, x, `tpl-${k}`)">{{ '{' + x + '}' }}</button>
      </div>
      <div class="flex justify-end"><button class="tombol-utama px-3 py-1.5 text-sm" @click="simpan(k)"><Ikon nama="Save" :ukuran="16" /> Simpan</button></div>
    </section>
    <p class="text-xs text-slate-500 lg:col-span-2"><Ikon nama="Info" :ukuran="13" class="inline" /> Tanda *teks* menjadi huruf tebal di WhatsApp. Ketuk isian {…} untuk menyisipkannya di posisi kursor.</p>
  </div>
</template>
