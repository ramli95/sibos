<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRkas } from '@/stores/rkas'
import { KATEGORI } from '@/utils/arkas'
import { ringkasan, proporsiJuknis, matriksSnpKomponen } from '@/utils/rkasPohon'
import { KOMPONEN_ARKAS } from '@/config/kodeArkas'
import { rupiah, rupiahRingkas, persen, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import KartuStat from '@/components/KartuStat.vue'
import GrafikBulanan from '@/components/GrafikBulanan.vue'

const rkas = useRkas()
const router = useRouter()
const r = computed(() => ringkasan(rkas.uraian))
const pagu = computed(() => rkas.versi?.pagu || r.value.jumlah)
// Realisasi diisi dari transaksi belanja (Fase 3). Untuk sekarang nol.
const realisasi = computed(() => Array(12).fill(0))
const totalRealisasi = computed(() => realisasi.value.reduce((a, b) => a + b, 0))

const kartu = computed(() => [
  { judul: 'Total RKAS', nilai: rupiahRingkas(r.value.jumlah), ikon: 'Sigma', warna: 'from-violet-500 via-purple-500 to-fuchsia-600', bayangan: 'shadow-fuchsia-500/30', sub: rupiah(r.value.jumlah), persen: pagu.value ? (r.value.jumlah / pagu.value) * 100 : 0 },
  ...['operasional', 'alat_mesin', 'aset_lain'].map((k) => ({
    judul: KATEGORI[k].nama, nilai: rupiahRingkas(r.value.kategori[k]), ikon: KATEGORI[k].ikon, warna: KATEGORI[k].warna, bayangan: KATEGORI[k].bayangan,
    sub: `Realisasi Rp 0 · sisa ${rupiahRingkas(r.value.kategori[k])}`, persen: 0,
  })),
])
const proporsi = computed(() => proporsiJuknis(rkas.uraian, pagu.value))
const matriks = computed(() => matriksSnpKomponen(rkas.uraian))
const snpAda = computed(() => Object.keys(matriks.value).sort())
const kompAda = computed(() => [...new Set(rkas.uraian.map((u) => u.komponen))].sort())
const maksSel = computed(() => Math.max(1, ...snpAda.value.flatMap((s) => Object.values(matriks.value[s]))))
const selGaya = (v) => {
  if (!v) return {}
  const t = 0.12 + 0.78 * (v / maksSel.value)
  return { background: `color-mix(in oklab, var(--viz-operasional) ${Math.round(t * 100)}%, transparent)`, color: t > 0.5 ? '#fff' : undefined }
}
const jumlahKomp = (k) => rkas.uraian.filter((u) => u.komponen === k).reduce((s, u) => s + u.jumlah, 0)
const jumlahSnp = (s) => Object.values(matriks.value[s] || {}).reduce((a, b) => a + b, 0)
const lihatTabel = ref(false)
const juta = (n) => (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })
const skala = (p) => Math.min(100, (p.persen / Math.max(p.batas * 1.6, p.persen * 1.05)) * 100)
const posisiBatas = (p) => Math.min(100, (p.batas / Math.max(p.batas * 1.6, p.persen * 1.05)) * 100)
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KartuStat v-for="k in kartu" :key="k.judul" v-bind="k" :memuat="rkas.memuat" :bisa-klik="false" ringkas />
    </div>

    <!-- Proporsi juknis -->
    <section class="kartu p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow"><Ikon nama="Scale" :ukuran="19" /></span>
        <div class="flex-1">
          <h2 class="font-bold">Proporsi juknis BOSP</h2>
          <p class="text-xs text-slate-500">Permendikdasmen No. 8 Tahun 2026 Pasal 42 · dihitung dari alokasi {{ rupiah(pagu) }}</p>
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <div v-for="p in proporsi" :key="p.kunci" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <div class="flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" :style="{ background: p.warna }"><Ikon :nama="p.ikon" :ukuran="19" /></span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold leading-tight">{{ p.judul }}</p>
              <p class="text-xs text-slate-500">{{ p.jenis === 'min' ? 'Minimal' : 'Maksimal' }} {{ p.batas }}% · {{ p.pasal }}</p>
            </div>
            <span :class="['lencana shrink-0', p.aman ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300']">
              <Ikon :nama="p.aman ? 'CircleCheck' : 'TriangleAlert'" :ukuran="12" /> {{ p.aman ? 'Sesuai' : (p.jenis === 'min' ? 'Kurang' : 'Melebihi') }}
            </span>
          </div>
          <p class="angka mt-3 text-3xl font-extrabold tracking-tight">{{ persen(p.persen) }}</p>
          <p class="angka text-sm text-slate-600 dark:text-slate-300">{{ rupiah(p.nilai) }}</p>
          <div class="relative mt-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800" role="meter" :aria-valuenow="p.persen.toFixed(2)" aria-valuemin="0" :aria-label="p.judul">
            <div class="h-full rounded-full transition-all duration-700" :style="{ width: skala(p) + '%', background: p.aman ? 'var(--viz-aman)' : 'var(--viz-lewat)' }" />
            <div class="absolute -top-1 h-5 w-0.5 rounded bg-slate-700 dark:bg-slate-200" :style="{ left: posisiBatas(p) + '%' }" :title="`Batas ${p.batas}%`" />
          </div>
          <p class="mt-2 text-xs text-slate-500">{{ p.ket }}</p>
          <p v-if="!p.aman" class="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <Ikon nama="TriangleAlert" :ukuran="14" class="mt-0.5" />
            {{ p.jenis === 'min' ? `Kurang ${rupiah(pagu * p.batas / 100 - p.nilai)} untuk mencapai ${p.batas}%.` : `Lebih ${rupiah(p.nilai - pagu * p.batas / 100)} dari batas ${p.batas}%.` }}
          </p>
        </div>
      </div>
    </section>

    <!-- Rencana vs realisasi bulanan -->
    <section class="kartu p-5">
      <div class="mb-2 flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow"><Ikon nama="ChartColumn" :ukuran="19" /></span>
        <div class="flex-1">
          <h2 class="font-bold">Rencana vs realisasi per bulan</h2>
          <p class="text-xs text-slate-500">Realisasi terisi otomatis dari belanja (Fase 3). Tahap I {{ rupiah(r.tahap1) }} · Tahap II {{ rupiah(r.tahap2) }}</p>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span class="flex items-center gap-1.5"><i class="h-3 w-3 rounded-sm" style="background: var(--viz-rencana)" /> Rencana</span>
          <span class="flex items-center gap-1.5"><i class="h-3 w-3 rounded-sm" style="background: var(--viz-realisasi)" /> Realisasi</span>
          <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="lihatTabel = !lihatTabel"><Ikon :nama="lihatTabel ? 'ChartColumn' : 'Table2'" :ukuran="14" /> {{ lihatTabel ? 'Grafik' : 'Tabel' }}</button>
        </div>
      </div>
      <div v-if="!r.adaBulanan" class="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Ikon nama="Info" class="mt-0.5" />
        <div>Rencana bulanan belum ada untuk versi ini. Impor <b>Rincian Kertas Kerja Perbulan</b> dari ARKAS di tab Versi & Impor.
          <button class="ml-1 font-semibold underline" @click="router.replace('/rkas/versi')">Buka</button></div>
      </div>
      <template v-else>
        <GrafikBulanan v-if="!lihatTabel" :rencana="r.bulan" :realisasi="realisasi" />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-xs uppercase tracking-wide text-slate-500"><th class="py-2">Bulan</th><th class="py-2 text-right">Rencana</th><th class="py-2 text-right">Realisasi</th><th class="py-2 text-right">Sisa</th></tr></thead>
            <tbody>
              <tr v-for="(v, i) in r.bulan" :key="i" class="border-t border-slate-100 dark:border-slate-800">
                <td class="py-1.5">{{ NAMA_BULAN[i] }}</td><td class="angka py-1.5 text-right">{{ rupiah(v) }}</td>
                <td class="angka py-1.5 text-right">{{ rupiah(realisasi[i]) }}</td><td class="angka py-1.5 text-right">{{ rupiah(v - realisasi[i]) }}</td>
              </tr>
              <tr class="border-t-2 border-slate-300 font-bold dark:border-slate-600"><td class="py-2">Jumlah</td><td class="angka text-right">{{ rupiah(r.jumlah) }}</td><td class="angka text-right">{{ rupiah(totalRealisasi) }}</td><td class="angka text-right">{{ rupiah(r.jumlah - totalRealisasi) }}</td></tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <!-- Matriks SNP × komponen -->
    <section class="kartu p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow"><Ikon nama="Grid3x3" :ukuran="19" /></span>
        <div class="flex-1">
          <h2 class="font-bold">Matriks SNP × komponen</h2>
          <p class="text-xs text-slate-500">Kode segmen 1 (SNP) dan segmen 2 (komponen Pasal 42) dari kode kegiatan ARKAS. Angka dalam juta rupiah; warna makin pekat = anggaran makin besar.</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <th class="sticky left-0 bg-white p-2 text-left dark:bg-[#161D2B]">SNP</th>
              <th v-for="k in kompAda" :key="k" class="p-2 text-center font-semibold" :title="KOMPONEN_ARKAS[k]?.nama">
                <span class="kode">{{ k }}</span><br /><span class="font-normal text-slate-500">{{ KOMPONEN_ARKAS[k]?.nama }}</span>
              </th>
              <th class="p-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in snpAda" :key="s">
              <td class="sticky left-0 bg-white p-2 font-semibold dark:bg-[#161D2B]"><span class="kode">{{ s }}</span> {{ rkas.nama.kegiatan(s) }}</td>
              <td v-for="k in kompAda" :key="k" class="angka whitespace-nowrap rounded-md p-2 text-right" :style="selGaya(matriks[s][k])" :title="matriks[s][k] ? rupiah(matriks[s][k]) : ''">
                {{ matriks[s][k] ? juta(matriks[s][k]) : '' }}
              </td>
              <td class="angka whitespace-nowrap p-2 text-right font-bold">{{ juta(jumlahSnp(s)) }}</td>
            </tr>
            <tr>
              <td class="sticky left-0 bg-white p-2 font-bold dark:bg-[#161D2B]">Jumlah</td>
              <td v-for="k in kompAda" :key="k" class="angka whitespace-nowrap p-2 text-right font-bold">{{ juta(jumlahKomp(k)) }}</td>
              <td class="angka whitespace-nowrap p-2 text-right font-extrabold">{{ juta(r.jumlah) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
