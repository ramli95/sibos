<script setup>
import { ref, computed, watch } from 'vue'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { KATEGORI } from '@/utils/arkas'
import { bangunPohon } from '@/utils/rkasPohon'
import { WARNA_SNP, KOMPONEN_ARKAS } from '@/config/kodeArkas'
import { rupiah, NAMA_BULAN } from '@/utils/format'
import { barisDatar } from '@/utils/rkasPohon'
import DetailAnggaran from './DetailAnggaran.vue'
import { pakaiDetail } from './pakaiDetail'
import Ikon from '@/components/Ikon.vue'
import CetakRkas from './CetakRkas.vue'
import { eksporRkas } from './eksporRkas'

const rkas = useRkas()
const notif = useNotifikasi()
const cari = ref('')
const kategori = ref('semua')
const buka = ref(new Set())

const cocok = (u) => {
  if (kategori.value !== 'semua' && u.kategori !== kategori.value) return false
  const q = cari.value.trim().toLowerCase()
  return !q || [u.uraian, u.kode_kegiatan, u.kode_rekening, u.satuan, rkas.nama.kegiatan(u.kode_kegiatan)].some((x) => String(x || '').toLowerCase().includes(q))
}
const pohon = computed(() => bangunPohon(rkas.uraian, rkas.nama, { saring: cocok }))
const sedangMencari = computed(() => !!cari.value.trim() || kategori.value !== 'semua')
const terbuka = (k) => sedangMencari.value || buka.value.has(k)
function alih(k) { const s = new Set(buka.value); s.has(k) ? s.delete(k) : s.add(k); buka.value = s }
function bukaSemua(ya) {
  if (!ya) { buka.value = new Set(); return }
  const s = new Set()
  const jalan = (n) => { s.add(n.kode + '@' + n.tingkat); n.anak.forEach(jalan) }
  pohon.value.forEach(jalan)
  buka.value = s
}
watch(() => rkas.idVersi, () => { buka.value = new Set(pohon.value.map((n) => n.kode + '@1')) }, { immediate: true })
const k = (n) => n.kode + '@' + n.tingkat

const cetak = ref(null)
const { detail, menyimpan, bolehUbah, buka: bukaDetail, simpan: simpanDetail, hapus: hapusDetail } = pakaiDetail()

// Tampilan: pohon (seperti ARKAS) atau kolom bulan (3 bulan / 6 bulan) seperti kertas kerja Jurnal Dana BOS
const tampilan = ref('pohon')
const PERIODE = [
  { k: 't1', j: 'Tahap I (Jan–Jun)', dari: 1, n: 6 }, { k: 't2', j: 'Tahap II (Jul–Des)', dari: 7, n: 6 },
  { k: 'tw1', j: 'Triwulan I', dari: 1, n: 3 }, { k: 'tw2', j: 'Triwulan II', dari: 4, n: 3 }, { k: 'tw3', j: 'Triwulan III', dari: 7, n: 3 }, { k: 'tw4', j: 'Triwulan IV', dari: 10, n: 3 },
]
const periode = ref('t1')
const per = computed(() => PERIODE.find((p) => p.k === periode.value))
const bulanKolom = computed(() => Array.from({ length: per.value.n }, (_, i) => per.value.dari - 1 + i))
const datar = computed(() => barisDatar(pohon.value))
const volBln = (u, i) => { const x = (u.bulan?.[i] || 0) / (u.harga || 1); return x ? Math.round(x * 100) / 100 : '' }
function bukaCetak() { cetak.value = tampilan.value === 'kolom' ? { mode: 'kolom', kategori: kategori.value, bulanDari: per.value.dari, jumlahBulan: per.value.n } : { mode: 'tahap', kategori: kategori.value } }
async function ekspor() { try { await eksporRkas(rkas, { kategori: kategori.value, kolomBulan: tampilan.value === 'kolom' ? bulanKolom.value : null }) } catch (e) { notif.kabari(e.message, 'galat') } }
const saringKat = [
  { k: 'semua', j: 'Semua', ikon: 'Layers', w: 'bg-biru text-white' },
  ...Object.entries(KATEGORI).map(([kk, v]) => ({ k: kk, j: v.nama, ikon: v.ikon, w: 'bg-biru text-white' })),
]
</script>

<template>
  <div class="space-y-4">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[14rem] flex-1">
        <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" class="masukan pl-9" placeholder="Cari uraian, kode kegiatan, kode rekening…" />
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button v-for="s in saringKat" :key="s.k" @click="kategori = s.k"
                :class="['flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition', kategori === s.k ? s.w + ' shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300']">
          <Ikon :nama="s.ikon" :ukuran="14" /> {{ s.j }}
        </button>
      </div>
      <div class="ml-auto flex flex-wrap gap-2">
        <button class="tombol-garis px-3" title="Buka semua" @click="bukaSemua(true)"><Ikon nama="ChevronsUpDown" :ukuran="17" class="text-biru" /></button>
        <button class="tombol-garis px-3" title="Tutup semua" @click="bukaSemua(false)"><Ikon nama="ChevronsDownUp" :ukuran="17" class="text-biru" /></button>
        <button class="tombol-garis" @click="bukaCetak"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> Cetak / Unduh{{ kategori !== 'semua' ? ` (${KATEGORI[kategori].nama})` : '' }}</button>
        <button class="tombol-garis" @click="ekspor"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> Excel</button>
      </div>
    </div>

    <div class="kartu flex flex-wrap items-center gap-2 p-2">
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button v-for="[k, j, ik] in [['pohon', 'Pohon ARKAS', 'ListTree'], ['kolom', 'Kolom bulan', 'Columns3']]" :key="k" :class="['flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold', tampilan === k ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']" @click="tampilan = k"><Ikon :nama="ik" :ukuran="15" /> {{ j }}</button>
      </div>
      <div v-if="tampilan === 'kolom'" class="flex gap-1 overflow-x-auto tanpa-penggulir">
        <button v-for="p in PERIODE" :key="p.k" :class="['shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold', periode === p.k ? 'bg-[#22A08D] text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']" @click="periode = p.k">{{ p.j }}</button>
      </div>
      <p class="ml-auto text-xs text-slate-500"><Ikon nama="MousePointerClick" :ukuran="13" class="inline text-biru" /> Klik uraian untuk {{ bolehUbah ? 'mengubah (draf)' : 'melihat rincian per bulan' }}</p>
    </div>

    <!-- Tampilan kolom bulan -->
    <div v-if="tampilan === 'kolom' && pohon.length" class="kartu overflow-x-auto">
      <table class="w-full min-w-[900px] text-xs">
        <thead class="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <tr><th rowspan="2" class="sticky left-0 z-10 bg-slate-50 p-2 text-left dark:bg-slate-800">Uraian</th><th rowspan="2" class="p-2 text-right">Vol</th><th rowspan="2" class="p-2">Satuan</th><th rowspan="2" class="p-2 text-right">Harga</th><th rowspan="2" class="p-2 text-right">Jumlah</th>
            <th v-for="i in bulanKolom" :key="i" colspan="2" class="border-l border-slate-200 p-2 text-center dark:border-slate-700">{{ NAMA_BULAN[i] }}</th></tr>
          <tr><template v-for="i in bulanKolom" :key="i"><th class="border-l border-slate-200 px-2 pb-2 text-right dark:border-slate-700">Vol</th><th class="px-2 pb-2 text-right">Jumlah</th></template></tr>
        </thead>
        <tbody>
          <tr v-for="(b, n) in datar" :key="n" :class="['border-t border-slate-100 dark:border-slate-800', b.induk ? 'font-semibold' : 'cursor-pointer hover:bg-blue-50/60 dark:hover:bg-slate-800/50']"
              :style="b.induk ? { background: `var(--arkas-${b.tingkat === 1 ? 'snp' : b.tingkat === 2 ? 'komponen' : 'kegiatan'})` } : null" @click="!b.induk && bukaDetail(rkas.uraian.find((u) => u.id === b.id))">
            <td class="sticky left-0 max-w-[22rem] bg-inherit p-2" :style="b.induk ? null : { background: 'var(--latar-kartu, transparent)' }">
              <span v-if="b.induk" class="kode mr-1 text-slate-500">{{ b.kode }}</span>{{ b.induk ? b.nama : b.uraian }}
            </td>
            <td class="angka p-2 text-right">{{ b.induk ? '' : b.volume.toLocaleString('id-ID') }}</td>
            <td class="p-2">{{ b.induk ? '' : b.satuan }}</td>
            <td class="angka p-2 text-right">{{ b.induk ? '' : rupiah(b.harga, { tanpaRp: true }) }}</td>
            <td class="angka p-2 text-right">{{ rupiah(b.jumlah, { tanpaRp: true }) }}</td>
            <template v-for="i in bulanKolom" :key="i">
              <td class="angka border-l border-slate-100 p-2 text-right dark:border-slate-800">{{ b.induk ? '' : volBln(b, i) }}</td>
              <td :class="['angka p-2 text-right', (b.bulan?.[i] || 0) ? '' : 'text-slate-300 dark:text-slate-600']">{{ b.bulan?.[i] ? rupiah(b.bulan[i], { tanpaRp: true }) : '-' }}</td>
            </template>
          </tr>
        </tbody>
        <tfoot class="bg-slate-50 font-bold dark:bg-slate-800/60">
          <tr><td class="sticky left-0 bg-slate-50 p-2 dark:bg-slate-800" colspan="4">Jumlah</td><td class="angka p-2 text-right">{{ rupiah(pohon.reduce((s, x) => s + x.jumlah, 0), { tanpaRp: true }) }}</td>
            <template v-for="i in bulanKolom" :key="i"><td /><td class="angka p-2 text-right">{{ rupiah(pohon.reduce((s, x) => s + x.bulan[i], 0), { tanpaRp: true }) }}</td></template></tr>
        </tfoot>
      </table>
    </div>

    <div v-if="!pohon.length" class="kartu flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500"><Ikon nama="SearchX" :ukuran="28" /> Tidak ada uraian yang cocok.</div>

    <!-- Tingkat 1: SNP -->
    <section v-for="s in (tampilan === 'pohon' ? pohon : [])" :key="s.kode" class="kartu overflow-hidden">
      <button type="button" class="flex w-full items-center gap-3 p-4 text-left transition hover:brightness-[0.98]" style="background: var(--arkas-snp)" :aria-expanded="terbuka(k(s))" @click="alih(k(s))">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-white shadow" :style="{ background: WARNA_SNP[s.kode] }"><span class="kode">{{ s.kode }}</span></span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-bold">{{ s.nama || 'SNP ' + s.kode }}</p>
          <p class="text-xs text-slate-500">{{ s.jumlahUraian }} uraian · Tahap I <span class="angka">{{ rupiah(s.tahap1) }}</span> · Tahap II <span class="angka">{{ rupiah(s.tahap2) }}</span></p>
        </div>
        <p class="angka hidden text-right text-lg font-extrabold sm:block">{{ rupiah(s.jumlah) }}</p>
        <Ikon nama="ChevronDown" :ukuran="18" :class="['transition', terbuka(k(s)) && 'rotate-180']" />
      </button>
      <p class="angka -mt-2 px-4 pb-3 text-right font-extrabold sm:hidden" style="background: var(--arkas-snp)">{{ rupiah(s.jumlah) }}</p>

      <div v-if="terbuka(k(s))" class="border-t border-slate-100 dark:border-slate-800">
        <!-- Tingkat 2: komponen -->
        <div v-for="c in s.anak" :key="c.kode" class="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
          <button type="button" class="flex w-full items-center gap-3 py-3 pl-6 pr-4 text-left hover:brightness-[0.98]" style="background: var(--arkas-komponen)" @click="alih(k(c))">
            <span class="h-8 w-1.5 shrink-0 rounded-full" :style="{ background: KOMPONEN_ARKAS[c.kode.split('.')[1]]?.warna || '#94a3b8' }" />
            <span class="kode shrink-0 text-xs text-slate-500">{{ c.kode }}</span>
            <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ c.nama }}</span>
            <span class="angka text-sm font-bold">{{ rupiah(c.jumlah) }}</span>
            <Ikon nama="ChevronDown" :ukuran="16" :class="['transition', terbuka(k(c)) && 'rotate-180']" />
          </button>
          <div v-if="terbuka(k(c))" class="pb-2 pt-2">
            <!-- Tingkat 3: kegiatan -->
            <div v-for="g in c.anak" :key="g.kode" class="ml-6 mr-3 mb-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <button type="button" class="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:brightness-[0.98]" style="background: var(--arkas-kegiatan)" @click="alih(k(g))">
                <Ikon nama="FolderTree" :ukuran="16" class="mt-0.5 text-amber-500" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold leading-snug"><span class="kode mr-1.5 text-xs text-slate-500">{{ g.kode }}</span>{{ g.nama }}</p>
                  <p class="text-xs text-slate-500">{{ g.jumlahUraian }} uraian · T1 <span class="angka">{{ rupiah(g.tahap1) }}</span> · T2 <span class="angka">{{ rupiah(g.tahap2) }}</span></p>
                </div>
                <span class="angka text-sm font-bold">{{ rupiah(g.jumlah) }}</span>
              </button>
              <div v-if="terbuka(k(g))" class="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
                <table class="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr class="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                      <th class="px-3 py-2">Uraian</th><th class="px-2 py-2 text-right">Volume</th><th class="px-2 py-2">Satuan</th>
                      <th class="px-2 py-2 text-right">Harga</th><th class="px-2 py-2 text-right">Jumlah</th><th class="px-2 py-2 text-right">Tahap I</th><th class="px-3 py-2 text-right">Tahap II</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- Tingkat 4: rekening, tingkat 5: uraian -->
                    <template v-for="r in g.anak" :key="r.kode">
                      <tr class="bg-blue-50/60 dark:bg-blue-950/20">
                        <td colspan="4" class="px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
                          <Ikon nama="BookOpenText" :ukuran="13" class="mr-1 inline" /><span class="kode">{{ r.kode }}</span><template v-if="r.nama"> · {{ r.nama }}</template>
                        </td>
                        <td class="angka px-2 py-1.5 text-right text-xs font-bold text-blue-800 dark:text-blue-300">{{ rupiah(r.jumlah, { tanpaRp: true }) }}</td><td colspan="2" />
                      </tr>
                      <tr v-for="u in r.uraian" :key="u.id" class="cursor-pointer border-t border-slate-100 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50" @click="bukaDetail(u)">
                        <td class="px-3 py-2">
                          <span class="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" :style="{ background: `var(--viz-${u.kategori === 'operasional' ? 'operasional' : u.kategori === 'alat_mesin' ? 'alat' : 'aset'})` }" :title="KATEGORI[u.kategori]?.nama" />
                          {{ u.uraian }}
                        </td>
                        <td class="angka px-2 py-2 text-right">{{ u.volume.toLocaleString('id-ID') }}</td>
                        <td class="px-2 py-2 text-slate-600 dark:text-slate-300">{{ u.satuan }}</td>
                        <td class="angka px-2 py-2 text-right">{{ rupiah(u.harga, { tanpaRp: true }) }}</td>
                        <td class="angka px-2 py-2 text-right font-semibold">{{ rupiah(u.jumlah, { tanpaRp: true }) }}</td>
                        <td class="angka px-2 py-2 text-right text-slate-600 dark:text-slate-300">{{ rupiah(u.tahap1, { tanpaRp: true }) }}</td>
                        <td class="angka px-3 py-2 text-right text-slate-600 dark:text-slate-300">{{ rupiah(u.tahap2, { tanpaRp: true }) }}</td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <DetailAnggaran v-if="detail" :uraian="detail.uraian" :dibelanjakan="detail.dibelanjakan" :boleh-ubah="bolehUbah" :menyimpan="menyimpan" @tutup="detail = null" @simpan="simpanDetail" @hapus="hapusDetail" />
    <CetakRkas v-if="cetak" v-bind="cetak" @tutup="cetak = null" @excel="ekspor" />
  </div>
</template>
