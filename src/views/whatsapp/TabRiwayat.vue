<script setup>
// Riwayat pesan WhatsApp yang dibuka dari SIBOS (pesan_wa). Catatan: SIBOS hanya tahu pesan dibuka,
// bukan apakah benar-benar terkirim di WhatsApp.
import { ref, computed, onMounted } from 'vue'
import { pakaiWa } from './pakaiWa'
import { useNotifikasi } from '@/stores/notifikasi'
import { SEMUA_JENIS_WA as JENIS_WA, tautanWa } from '@/utils/wa'
import { formatWaktuRelatif } from '@/utils/format'
import { formatWa } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'

const wa = pakaiWa()
const notif = useNotifikasi()
const saring = ref('')
const cari = ref('')
onMounted(() => wa.muat({ segar: true }))
const daftar = computed(() => wa.riwayat.value
  .filter((x) => !saring.value || x.jenis === saring.value)
  .filter((x) => !cari.value || `${x.nama} ${x.ringkas}`.toLowerCase().includes(cari.value.toLowerCase()))
  .slice(0, 300))
async function hapus(x) { try { await wa.hapusRiwayat(x) } catch (e) { notif.kabari(e.message, 'galat') } }
</script>

<template>
  <div class="space-y-4" data-tur="wa-riwayat">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[12rem] flex-1"><Ikon nama="Search" :ukuran="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari nama atau isi pesan" aria-label="Cari riwayat" /></div>
      <select v-model="saring" class="masukan w-auto" aria-label="Jenis pesan"><option value="">Semua jenis</option><option v-for="(j, k) in JENIS_WA" :key="k" :value="k">{{ j.judul }}</option></select>
    </div>
    <section class="kartu overflow-hidden">
      <p v-if="!daftar.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="History" class="mx-auto mb-2 text-slate-400" /> Belum ada riwayat pesan.</p>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="x in daftar" :key="x.id" class="flex items-start gap-3 px-4 py-3">
          <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl', JENIS_WA[x.jenis]?.warna || 'ikon-chip']"><Ikon :nama="JENIS_WA[x.jenis]?.ikon || 'MessageCircle'" :ukuran="16" /></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ x.nama || 'Tanpa nama' }} <span class="font-normal text-slate-500">{{ x.no ? formatWa(x.no) : '' }}</span></p>
            <p class="line-clamp-2 whitespace-pre-line text-xs text-slate-500">{{ x.ringkas }}</p>
            <p class="mt-0.5 text-[11px] text-slate-400">{{ JENIS_WA[x.jenis]?.judul }} · {{ formatWaktuRelatif(x.waktu) }}</p>
          </div>
          <a :href="tautanWa(x.no, x.ringkas)" target="_blank" rel="noopener" class="text-emerald-600" :aria-label="`Kirim ulang ke ${x.nama}`"><Ikon nama="Repeat" :ukuran="17" /></a>
          <button class="text-slate-400 hover:text-rose-600" :aria-label="`Hapus riwayat ${x.nama}`" @click="hapus(x)"><Ikon nama="Trash2" :ukuran="16" /></button>
        </li>
      </ul>
    </section>
    <p class="text-xs text-slate-500"><Ikon nama="Info" :ukuran="13" class="inline" /> Riwayat mencatat pesan yang dibuka dari SIBOS; pastikan Bapak menekan Kirim di WhatsApp.</p>
  </div>
</template>
