<script setup>
// Tabel gaji pokok PNS (PP 5/2024) dan PPPK (Perpres 11/2024) — untuk rujukan & pemeriksaan.
import { ref, computed } from 'vue'
import { GAJI_PNS, GAJI_PPPK } from '@/config/tabelGaji'
import { useGaji } from '@/stores/gaji'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const gaji = useGaji()
const jenis = ref('PNS')
const kelompok = ref(0)
const KELOMPOK = { PNS: [['Gol. I', ['I/a', 'I/b', 'I/c', 'I/d']], ['Gol. II', ['II/a', 'II/b', 'II/c', 'II/d']], ['Gol. III', ['III/a', 'III/b', 'III/c', 'III/d']], ['Gol. IV', ['IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e']]],
  PPPK: [['I–IV', ['I', 'II', 'III', 'IV']], ['V–VIII', ['V', 'VI', 'VII', 'VIII']], ['IX–XII', ['IX', 'X', 'XI', 'XII']], ['XIII–XVII', ['XIII', 'XIV', 'XV', 'XVI', 'XVII']]] }
const tabel = computed(() => (jenis.value === 'PNS' ? GAJI_PNS : GAJI_PPPK))
const gol = computed(() => KELOMPOK[jenis.value][kelompok.value][1])
const mkg = computed(() => [...new Set(gol.value.flatMap((g) => Object.keys(tabel.value[g]).map(Number)))].sort((a, b) => a - b))
const dipakai = computed(() => new Set(gaji.pegawaiAsn.filter((p) => p.status_kepegawaian === jenis.value).map((p) => { const g = gaji.dasarDari(p); return `${p.golongan}|${g.mkg}` })))
const jumlahPegawai = (g) => gaji.pegawaiAsn.filter((p) => p.status_kepegawaian === jenis.value && p.golongan === g).length
</script>

<template>
  <div class="space-y-4">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button v-for="j in ['PNS', 'PPPK']" :key="j" :class="['rounded-lg px-4 py-2 text-sm font-bold', jenis === j ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']" @click="jenis = j; kelompok = 0">{{ j }}</button>
      </div>
      <div class="flex gap-1 overflow-x-auto tanpa-penggulir">
        <button v-for="(k, i) in KELOMPOK[jenis]" :key="k[0]" :class="['shrink-0 rounded-lg px-3 py-2 text-sm font-semibold', kelompok === i ? 'bg-[#22A08D] text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']" @click="kelompok = i">{{ k[0] }}</button>
      </div>
      <p class="ml-auto flex items-center gap-1.5 text-xs text-slate-500"><Ikon nama="BookMarked" :ukuran="14" class="text-biru" /> {{ jenis === 'PNS' ? 'PP 5/2024' : 'Perpres 11/2024' }} · berlaku 1 Januari 2024</p>
    </div>
    <div class="kartu overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60">
          <tr><th class="p-2.5 text-left">MKG</th><th v-for="g in gol" :key="g" class="p-2.5 text-right">{{ g }}<span v-if="jumlahPegawai(g)" class="ml-1 rounded-full bg-[#E3A414] px-1.5 text-[10px] text-white">{{ jumlahPegawai(g) }}</span></th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="m in mkg" :key="m">
            <td class="p-2.5 font-semibold">{{ m }} th</td>
            <td v-for="g in gol" :key="g" :class="['angka p-2.5 text-right', dipakai.has(`${g}|${m}`) && 'bg-amber-50 font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200']">{{ tabel[g][m] ? rupiah(tabel[g][m], { tanpaRp: true }) : '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-slate-500"><span class="inline-block h-3 w-3 rounded bg-amber-100 align-middle dark:bg-amber-900/40" /> Sel berwarna = dipakai pegawai sekolah saat ini.</p>
  </div>
</template>
