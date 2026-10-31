<script setup>
import { ref, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatCetak, simpanCetak, CETAK_AWAL } from '@/services/cetak'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'
import JendelaUjiCetak from '@/components/cetak/JendelaUjiCetak.vue'

const notif = useNotifikasi()
const c = ref(null)
const menyimpan = ref(false)
const uji = ref(false)
onMounted(async () => { c.value = await muatCetak() })

const SISI = [['atas', 'Atas'], ['bawah', 'Bawah'], ['kiri', 'Kiri'], ['kanan', 'Kanan']]

async function simpan() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau: tidak disimpan.', 'info')
  menyimpan.value = true
  try { await simpanCetak(JSON.parse(JSON.stringify(c.value))); notif.kabari('Pengaturan cetak tersimpan.') }
  catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
function kembalikan() { c.value = structuredClone(CETAK_AWAL) }
</script>

<template>
  <div v-if="!c" class="kartu p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
  <div v-else class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div class="space-y-5">
      <section class="kartu p-5">
        <h3 class="mb-1 flex items-center gap-2 font-bold"><Ikon nama="FileSignature" :ukuran="18" class="text-biru" /> Kertas & huruf</h3>
        <p class="mb-4 text-sm text-slate-500">Semua dokumen SIBOS dicetak di kertas <b>F4/Folio (215 × 330 mm)</b> dengan huruf <b>Times New Roman</b>.</p>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <span class="label">Orientasi bawaan</span>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="[v, l] in [['portrait', 'Tegak'], ['landscape', 'Mendatar']]" :key="v"
                     :class="['flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold', c.orientasi_bawaan === v ? 'border-biru bg-biru/10 text-biru' : 'border-slate-300 dark:border-slate-600']">
                <input v-model="c.orientasi_bawaan" type="radio" :value="v" class="sr-only" />
                <span :class="['rounded-sm border-2 border-current', v === 'portrait' ? 'h-7 w-5' : 'h-5 w-7']" />{{ l }}
              </label>
            </div>
          </div>
          <div><label class="label" for="uh">Ukuran huruf isi (pt)</label><input id="uh" v-model.number="c.ukuran_huruf" type="number" min="9" max="14" step="0.5" class="masukan angka" /></div>
          <div><label class="label" for="sp">Spasi baris</label><select id="sp" v-model.number="c.spasi" class="masukan"><option :value="1">1,0</option><option :value="1.15">1,15</option><option :value="1.5">1,5</option></select></div>
        </div>
      </section>

      <section v-for="o in ['portrait', 'landscape']" :key="o" class="kartu p-5">
        <h3 class="mb-4 flex items-center gap-2 font-bold">
          <span :class="['grid h-8 w-8 place-items-center rounded-lg', o === 'portrait' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300']">
            <span :class="['rounded-sm border-2 border-current', o === 'portrait' ? 'h-4 w-3' : 'h-3 w-4']" />
          </span>
          Margin {{ o === 'portrait' ? 'tegak (portrait)' : 'mendatar (landscape)' }} · cm
        </h3>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div v-for="[k, l] in SISI" :key="k"><label class="label" :for="o + k">{{ l }}</label><input :id="o + k" v-model.number="c[o][k]" type="number" min="0.5" max="5" step="0.1" class="masukan angka" /></div>
        </div>
      </section>

      <section class="kartu p-5">
        <h3 class="mb-3 flex items-center gap-2 font-bold"><Ikon nama="Stamp" :ukuran="18" class="text-ungu" /> Tanda tangan bawaan</h3>
        <div class="grid gap-2 sm:grid-cols-2">
          <label v-for="[v, l, ket] in [['basah', 'Tanda tangan basah', 'Ruang kosong untuk ditandatangani'], ['gambar', 'Gambar tanda tangan', 'Memakai gambar dari Pejabat per Periode']]" :key="v"
                 :class="['cursor-pointer rounded-xl border p-3', c.tanda_tangan === v ? 'border-ungu bg-violet-50 dark:bg-violet-950/30' : 'border-slate-300 dark:border-slate-600']">
            <input v-model="c.tanda_tangan" type="radio" :value="v" class="sr-only" /><b class="block text-sm">{{ l }}</b><span class="text-xs text-slate-500">{{ ket }}</span>
          </label>
        </div>
        <p class="mt-2 text-xs text-slate-500">Tetap bisa dipilih ulang setiap kali mencetak.</p>
      </section>

      <div class="flex flex-wrap gap-2">
        <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
        <button class="tombol-garis" @click="kembalikan"><Ikon nama="RefreshCw" :ukuran="17" /> Kembalikan bawaan</button>
      </div>
    </div>

    <!-- Gambar margin -->
    <aside class="kartu h-fit space-y-4 p-5 lg:sticky lg:top-24">
      <h3 class="flex items-center gap-2 font-bold"><Ikon nama="Eye" :ukuran="18" class="text-tosca" /> Gambaran halaman</h3>
      <div class="mx-auto bg-white shadow ring-1 ring-slate-200" :style="{ width: '172px', height: '264px', padding: `${c.portrait.atas * 8}px ${c.portrait.kanan * 8}px ${c.portrait.bawah * 8}px ${c.portrait.kiri * 8}px` }">
        <div class="h-full rounded-sm border border-dashed border-biru/60 bg-biru/5 p-1.5">
          <div class="mb-1.5 h-2 rounded bg-slate-300" /><div v-for="i in 9" :key="i" class="mb-1 h-1 rounded bg-slate-200" :style="{ width: 100 - (i % 3) * 12 + '%' }" />
        </div>
      </div>
      <p class="text-center text-xs text-slate-500">F4 tegak · kiri {{ c.portrait.kiri }} cm, sisi lain {{ c.portrait.atas }}/{{ c.portrait.kanan }}/{{ c.portrait.bawah }} cm</p>
      <button class="tombol w-full bg-merah text-white hover:brightness-95" @click="uji = true"><Ikon nama="Printer" :ukuran="17" /> Uji cetak kop di F4</button>
      <p class="text-xs text-slate-500">Saat dialog cetak terbuka, pilih ukuran kertas <b>F4/Folio</b> (atau 215 × 330 mm) dan skala <b>100% / Ukuran sebenarnya</b>.</p>
    </aside>
    <JendelaUjiCetak v-if="uji" @tutup="uji = false" />
  </div>
</template>
