<script setup>
// Realisasi per SNP / komponen Juknis / kegiatan / rekening: anggaran RKAS (versi berlaku) vs belanja Lunas,
// dengan periode bulanan, tahap, atau tahunan; proporsi Pasal 42 dihitung dari realisasi.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { SUSUNAN_REALISASI, PERIODE } from '@/config/laporan'
import { WARNA_SNP } from '@/config/kodeArkas'
import { rekapRealisasi, rentang, akhirBulanIso, realisasiPerBulan, rencanaPerBulan, itemLunas } from '@/utils/laporan'
import { proporsiJuknis } from '@/utils/rkasPohon'
import { rupiah, rupiahRingkas, persen, NAMA_BULAN } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import GrafikBulanan from '@/components/GrafikBulanan.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const notif = useNotifikasi()

const susunan = ref('snp')
const periode = ref('tahun')
const bulan = ref(Math.min(new Date().getMonth(), 11))
const tahap = ref(new Date().getMonth() < 6 ? 1 : 2)
const nilaiPeriode = computed(() => (periode.value === 'bulan' ? bulan.value : tahap.value))
const batas = computed(() => rentang(periode.value, nilaiPeriode.value))
const labelPeriode = computed(() => periode.value === 'bulan' ? `Bulan ${NAMA_BULAN[bulan.value]} ${kas.tahun}` : periode.value === 'tahap' ? `Tahap ${tahap.value === 1 ? 'I (Januari–Juni)' : 'II (Juli–Desember)'} ${kas.tahun}` : `Tahun Anggaran ${kas.tahun}`)

const rekap = computed(() => rekapRealisasi({ uraian: rkas.uraian, belanja: belanja.daftar, susunan: susunan.value, dari: batas.value[0], sampai: batas.value[1], nama: rkas.nama }))
const pagu = computed(() => rkas.versiBerlaku?.pagu || rekap.value.total.anggaran)
const t = computed(() => rekap.value.total)

const statistik = computed(() => [
  { judul: 'Anggaran RKAS', nilai: rupiahRingkas(t.value.anggaran), sub: rupiah(t.value.anggaran), ikon: 'ClipboardList', nada: 'gelap', ringkas: true },
  { judul: `Realisasi ${periode.value === 'tahun' ? 'setahun' : 'periode ini'}`, nilai: rupiahRingkas(t.value.kini), sub: rupiah(t.value.kini), ikon: 'ShoppingCart', nada: 'primer', ringkas: true },
  { judul: 'Realisasi s.d. periode', nilai: rupiahRingkas(t.value.sd), sub: rupiah(t.value.sd), ikon: 'TrendingUp', nada: 'primer', ringkas: true, persen: t.value.persen },
  { judul: 'Sisa anggaran', nilai: rupiahRingkas(t.value.sisa), sub: `Terserap ${persen(t.value.persen, 1)}`, ikon: 'PiggyBank', nada: t.value.sisa < 0 ? 'bahaya' : 'primer', ringkas: true },
])

// Proporsi Pasal 42 dari realisasi s.d. akhir periode
const proporsi = computed(() => {
  const item = itemLunas(belanja.daftar).filter((i) => i.bulan <= batas.value[1]).map((i) => ({ ...i, komponen: String(i.kode_kegiatan).split('.')[1] }))
  return proporsiJuknis(item, pagu.value)
})

const realBulan = computed(() => realisasiPerBulan(belanja.daftar))
const rencBulan = computed(() => rencanaPerBulan(rkas.uraian))

const warnaKode = (r) => r.warna || (susunan.value === 'snp' ? WARNA_SNP[r.kode] : susunan.value === 'kegiatan' ? WARNA_SNP[r.kode.split('.')[0]] : WARNA_SNP[(rkas.uraian.find((u) => u.kode_rekening === r.kode)?.kode_kegiatan || '').split('.')[0]]) || '#94a3b8'
const lebar = (p) => Math.max(0, Math.min(100, p))

const judulSusunan = computed(() => SUSUNAN_REALISASI.find((s) => s.kunci === susunan.value)?.judul || '')
const kolomCetak = computed(() => [
  { judul: 'Kode', nilai: (r) => r.kode, lebar: '2.6cm', kode: true },
  { judul: 'Uraian', nilai: (r) => r.nama },
  { judul: 'Anggaran', nilai: (r) => r.anggaran, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Realisasi s.d. Periode Lalu', nilai: (r) => r.lalu, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Realisasi Periode Ini', nilai: (r) => r.kini, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Realisasi s.d. Periode Ini', nilai: (r) => r.sd, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Sisa Anggaran', nilai: (r) => r.sisa, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: '%', nilai: (r) => persen(r.persen, 2).replace('%', ''), lebar: '1.3cm', rata: 'kanan' },
])
const cetak = ref(false)
async function excel() {
  try {
    await eksporExcel({ judul: `Realisasi ${judulSusunan.value} — ${labelPeriode.value}`, namaBerkas: `Realisasi ${judulSusunan.value} ${labelPeriode.value}`, baris: rekap.value.baris,
      kolom: kolomCetak.value.map((k) => ({ judul: k.judul, lebar: k.uang ? 17 : k.judul === 'Uraian' ? 60 : 14, nilai: k.uang ? k.nilai : k.judul === '%' ? (r) => Number(r.persen.toFixed(2)) : k.nilai, jenis: k.uang ? 'uang' : 'teks' })) })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Pilihan -->
    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="realisasi-pilihan">
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button v-for="p in PERIODE" :key="p.kunci" :class="['rounded-lg px-3 py-1.5 text-sm font-semibold', periode === p.kunci ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']" @click="periode = p.kunci">{{ p.judul }}</button>
      </div>
      <select v-if="periode === 'bulan'" v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <select v-if="periode === 'tahap'" v-model.number="tahap" class="masukan w-auto py-2" aria-label="Tahap"><option :value="1">Tahap I (Jan–Jun)</option><option :value="2">Tahap II (Jul–Des)</option></select>
      <div class="ml-auto flex gap-2">
        <button class="tombol-garis" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> <span class="hidden sm:inline">Excel</span></button>
        <button class="tombol-garis" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Cetak / PDF</span></button>
      </div>
    </div>

    <GridStat :daftar="statistik" :memuat="rkas.memuat || kas.memuat" :bisa-klik="false" ringkas />

    <div v-if="!rkas.uraian.length && !rkas.memuat" class="kartu flex items-start gap-3 p-4 text-sm text-amber-800 dark:text-amber-200">
      <Ikon nama="Info" class="mt-0.5 shrink-0 text-amber-500" /> RKAS tahun {{ kas.tahun }} belum diimpor, sehingga kolom anggaran kosong. Impor di menu RKAS → Versi & Impor.
    </div>

    <!-- Proporsi Pasal 42 dari realisasi -->
    <section class="kartu p-5" data-tur="realisasi-proporsi">
      <div class="mb-3 flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="Scale" :ukuran="19" /></span>
        <div class="min-w-0 flex-1">
          <h2 class="font-bold">Proporsi realisasi menurut Juknis</h2>
          <p class="text-xs text-slate-500">Pasal 42 Permendikdasmen 8/2026 · realisasi s.d. {{ NAMA_BULAN[batas[1]] }} dibanding alokasi {{ rupiah(pagu) }}</p>
        </div>
      </div>
      <div class="grid gap-3 md:grid-cols-3">
        <div v-for="p in proporsi" :key="p.kunci" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <div class="flex items-center gap-2">
            <span class="grid h-8 w-8 place-items-center rounded-lg text-white" :style="{ background: p.warna }"><Ikon :nama="p.ikon" :ukuran="16" /></span>
            <span class="flex-1 text-sm font-semibold">{{ p.judul }}</span>
            <span :class="['lencana', p.aman ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300']">{{ p.jenis === 'min' ? 'min' : 'maks' }} {{ p.batas }}%</span>
          </div>
          <p class="angka mt-2 text-2xl font-extrabold">{{ persen(p.persen) }}</p>
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: lebar(p.persen / Math.max(p.batas * 1.5, p.persen) * 100) + '%', background: p.warna }" /></div>
          <p class="angka mt-1 text-xs text-slate-500">{{ rupiah(p.nilai) }}</p>
        </div>
      </div>
    </section>

    <!-- Rencana vs realisasi bulanan -->
    <section class="kartu p-5">
      <div class="mb-2 flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="ChartColumn" :ukuran="19" /></span>
        <div class="flex-1"><h2 class="font-bold">Rencana vs realisasi per bulan</h2><p class="text-xs text-slate-500">Rencana dari RKAS berlaku; realisasi dari belanja Lunas (tanggal lunas).</p></div>
        <div class="flex items-center gap-3 text-xs">
          <span class="flex items-center gap-1.5"><i class="h-3 w-3 rounded-sm" style="background: var(--viz-rencana)" /> Rencana</span>
          <span class="flex items-center gap-1.5"><i class="h-3 w-3 rounded-sm" style="background: var(--viz-realisasi)" /> Realisasi</span>
        </div>
      </div>
      <GrafikBulanan :rencana="rencBulan" :realisasi="realBulan" :tinggi="230" />
    </section>

    <!-- Tabel realisasi -->
    <section class="kartu overflow-hidden" data-tur="realisasi-tabel">
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
        <button v-for="s in SUSUNAN_REALISASI" :key="s.kunci" :class="['flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold', susunan === s.kunci ? 'bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800']" @click="susunan = s.kunci">
          <Ikon :nama="s.ikon" :ukuran="15" /> {{ s.judul }}
        </button>
        <span class="ml-auto text-xs text-slate-500">{{ labelPeriode }}</span>
      </div>
      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Kode</th><th class="px-3 py-2.5 text-left">Uraian</th><th class="px-3 py-2.5 text-right">Anggaran</th>
            <th class="px-3 py-2.5 text-right">s.d. Lalu</th><th class="px-3 py-2.5 text-right">Periode Ini</th><th class="px-3 py-2.5 text-right">s.d. Ini</th><th class="px-3 py-2.5 text-right">Sisa</th><th class="w-40 px-3 py-2.5 text-left">Serapan</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="r in rekap.baris" :key="r.kode" class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td class="kode whitespace-nowrap px-3 py-2 text-xs"><span class="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" :style="{ background: warnaKode(r) }" />{{ r.kode }}</td>
              <td class="px-3 py-2">{{ r.nama || '—' }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(r.anggaran, { tanpaRp: true }) }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right text-slate-500">{{ rupiah(r.lalu, { tanpaRp: true }) }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(r.kini, { tanpaRp: true }) }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right font-semibold">{{ rupiah(r.sd, { tanpaRp: true }) }}</td>
              <td :class="['angka whitespace-nowrap px-3 py-2 text-right', r.sisa < 0 && 'text-rose-600']">{{ rupiah(r.sisa, { tanpaRp: true }) }}</td>
              <td class="px-3 py-2"><div class="flex items-center gap-2"><div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: lebar(r.persen) + '%', background: warnaKode(r) }" /></div><span class="angka w-12 text-right text-xs">{{ persen(r.persen, 1) }}</span></div></td>
            </tr>
            <tr v-if="!rekap.baris.length"><td colspan="8" class="px-3 py-8 text-center text-slate-500">Belum ada anggaran atau realisasi.</td></tr>
          </tbody>
          <tfoot v-if="rekap.baris.length" class="bg-slate-50 font-bold dark:bg-slate-800/60"><tr>
            <td colspan="2" class="px-3 py-2.5">Jumlah</td>
            <td class="angka px-3 py-2.5 text-right">{{ rupiah(t.anggaran, { tanpaRp: true }) }}</td><td class="angka px-3 py-2.5 text-right">{{ rupiah(t.lalu, { tanpaRp: true }) }}</td>
            <td class="angka px-3 py-2.5 text-right">{{ rupiah(t.kini, { tanpaRp: true }) }}</td><td class="angka px-3 py-2.5 text-right">{{ rupiah(t.sd, { tanpaRp: true }) }}</td>
            <td class="angka px-3 py-2.5 text-right">{{ rupiah(t.sisa, { tanpaRp: true }) }}</td><td class="angka px-3 py-2.5 text-xs">{{ persen(t.persen, 1) }}</td>
          </tr></tfoot>
        </table>
      </div>
      <div class="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        <div v-for="r in rekap.baris" :key="r.kode" class="p-3">
          <div class="flex items-start gap-2">
            <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: warnaKode(r) }" />
            <div class="min-w-0 flex-1"><p class="kode text-xs text-slate-500">{{ r.kode }}</p><p class="line-clamp-2 text-sm font-semibold">{{ r.nama || '—' }}</p></div>
            <b class="angka shrink-0 text-sm">{{ persen(r.persen, 1) }}</b>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: lebar(r.persen) + '%', background: warnaKode(r) }" /></div>
          <p class="angka mt-1.5 text-xs text-slate-500">{{ rupiah(r.sd) }} dari {{ rupiah(r.anggaran) }} · sisa {{ rupiah(r.sisa) }}</p>
        </div>
        <p v-if="!rekap.baris.length" class="p-8 text-center text-sm text-slate-500">Belum ada anggaran atau realisasi.</p>
      </div>
    </section>

    <CetakBuku v-if="cetak" :judul="`Laporan Realisasi ${judulSusunan}`" :subjudul="labelPeriode" :kolom="kolomCetak" :baris="rekap.baris" :tanggal="akhirBulanIso(kas.tahun, batas[1])" excel
               :identitas="[['Sumber Dana', 'BOSP Reguler'], ['Versi RKAS', rkas.versiBerlaku?.nama || '-'], ['Alokasi', rupiah(pagu)]]"
               :ringkasan="proporsi.map((p) => [`${p.judul} (${p.jenis === 'min' ? 'min' : 'maks'} ${p.batas}%)`, `${rupiah(p.nilai)} · ${persen(p.persen)}`])"
               @excel="excel" @tutup="cetak = false" />
  </div>
</template>
