<script setup>
// Grafik proporsi RKAS seperti ARKAS: batas penggunaan Juknis (buku, pemeliharaan/rehab, honor),
// kategori anggaran (operasional, alat & mesin, aset tetap lainnya), per SNP, dan per jenis belanja.
// Setiap grafik bisa diunduh sebagai PNG.
import { ref, computed } from 'vue'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { proporsiJuknis, bangunPohon, jenisBelanja } from '@/utils/rkasPohon'
import { KATEGORI } from '@/utils/arkas'
import { rupiah, rupiahRingkas, persen as fPersen } from '@/utils/format'
import { unduhSvgPng } from '@/utils/grafik'
import Ikon from '@/components/Ikon.vue'

const rkas = useRkas()
const notif = useNotifikasi()
const total = computed(() => rkas.uraian.reduce((s, u) => s + u.jumlah, 0))
const pagu = computed(() => rkas.versi?.pagu || total.value)
const judulVersi = computed(() => `RKAS ${rkas.tahun} · ${rkas.versi?.nama || ''}`)

/* ---------- 1. Batas Juknis ---------- */
const juknis = computed(() => proporsiJuknis(rkas.uraian, pagu.value).map((p) => ({ ...p, judul: p.kunci === 'pemeliharaan' ? 'Pemeliharaan/rehab sarpras' : p.judul })))
const maksJ = computed(() => Math.max(30, Math.ceil(Math.max(...juknis.value.map((p) => p.persen), 0) / 5) * 5 + 5))
const JX = 190, JW = 420
const xj = (v) => JX + (v / maksJ.value) * JW
const gridJ = computed(() => Array.from({ length: maksJ.value / 5 + 1 }, (_, i) => i * 5))
function batang(x, y, w, h) { // ujung kanan membulat 4px, dasar rata di sumbu
  if (w <= 0) return ''
  const r = Math.min(4, w, h / 2)
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`
}

/* ---------- 2. Kategori (donat) ---------- */
const WARNA_KAT = { operasional: 'var(--viz-operasional)', alat_mesin: 'var(--viz-alat)', aset_lain: 'var(--viz-aset)' }
const kategori = computed(() => Object.entries(KATEGORI).map(([k, v]) => {
  const nilai = rkas.uraian.filter((u) => u.kategori === k).reduce((s, u) => s + u.jumlah, 0)
  return { kunci: k, nama: v.nama, panjang: v.panjang, nilai, persen: total.value ? (nilai / total.value) * 100 : 0, warna: WARNA_KAT[k] }
}))
const R = 90, CX = 120, CY = 120, T = 34
function busur(a0, a1) {
  const pt = (a, r) => [CX + r * Math.sin(a), CY - r * Math.cos(a)]
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4
  const besar = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, R - T), [x3, y3] = pt(a0, R - T)
  return `M${x0},${y0}A${R},${R} 0 ${besar} 1 ${x1},${y1}L${x2},${y2}A${R - T},${R - T} 0 ${besar} 0 ${x3},${y3}Z`
}
const potongan = computed(() => {
  let a = 0
  return kategori.value.filter((k) => k.nilai > 0).map((k) => { const a0 = a; a += (k.nilai / (total.value || 1)) * Math.PI * 2; return { ...k, d: busur(a0, a) } })
})

/* ---------- 3. Per SNP & 4. Per jenis belanja ---------- */
const snp = computed(() => bangunPohon(rkas.uraian, rkas.nama).map((s) => ({ kode: s.kode, nama: s.nama || `SNP ${s.kode}`, nilai: s.jumlah, persen: total.value ? (s.jumlah / total.value) * 100 : 0 })))
const jenis = computed(() => jenisBelanja(rkas.uraian, pagu.value).filter((j) => j.nilai > 0).sort((a, b) => b.nilai - a.nilai))
const BX = 230, BW = 280, TB = 30
const maksSnp = computed(() => Math.max(1, ...snp.value.map((s) => s.nilai)))
const maksJenis = computed(() => Math.max(1, ...jenis.value.map((s) => s.nilai)))

/* ---------- Unduh ---------- */
const svgJ = ref(null), svgK = ref(null), svgS = ref(null), svgB = ref(null)
const sibuk = ref('')
async function unduh(el, nama) {
  sibuk.value = nama
  try { await unduhSvgPng(el, `Grafik ${nama} - ${judulVersi.value}`) } catch (e) { notif.kabari('Gambar gagal dibuat: ' + e.message, 'galat') } finally { sibuk.value = '' }
}
async function unduhSemua() {
  for (const [el, n] of [[svgJ, 'Batas Juknis'], [svgK, 'Kategori Anggaran'], [svgS, 'Per SNP'], [svgB, 'Jenis Belanja']]) if (el.value) await unduh(el.value, n)
}
const potong = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t)
</script>

<template>
  <div class="space-y-4">
    <div class="kartu flex flex-wrap items-center gap-3 p-3">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="ChartColumn" :ukuran="19" /></span>
      <div class="min-w-0 flex-1"><p class="font-bold">Grafik proporsi {{ judulVersi }}</p><p class="text-xs text-slate-500">Dasar persentase: pagu {{ rupiah(pagu) }} · dianggarkan {{ rupiah(total) }}</p></div>
      <button class="tombol-utama" :disabled="!!sibuk" @click="unduhSemua"><Ikon :nama="sibuk ? 'RefreshCw' : 'ImageDown'" :ukuran="17" :class="sibuk && 'animate-spin'" /> Unduh semua (PNG)</button>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <!-- 1. Batas Juknis -->
      <section class="kartu p-4">
        <div class="mb-2 flex items-start gap-2">
          <div class="min-w-0 flex-1"><h3 class="font-bold">Batas penggunaan dana (Juknis Pasal 42)</h3><p class="text-xs text-slate-500">Buku minimal 10%, pemeliharaan/rehab maksimal 20%, honor maksimal 20% dari pagu</p></div>
          <button class="tombol-garis px-2.5" :disabled="!!sibuk" aria-label="Unduh grafik batas juknis" @click="unduh(svgJ, 'Batas Juknis')"><Ikon nama="ImageDown" :ukuran="16" class="text-biru" /></button>
        </div>
        <svg ref="svgJ" viewBox="0 0 640 250" class="w-full" role="img" aria-label="Grafik batas penggunaan dana Juknis" style="font-family: system-ui, sans-serif">
          <text x="10" y="18" class="fill-slate-800 dark:fill-slate-100" font-size="13" font-weight="700">Batas Penggunaan Dana BOSP · {{ judulVersi }}</text>
          <g v-for="g in gridJ" :key="g">
            <line :x1="xj(g)" :x2="xj(g)" y1="36" y2="212" stroke="var(--viz-grid)" stroke-width="1" />
            <text :x="xj(g)" y="228" text-anchor="middle" font-size="10" fill="var(--viz-teks)">{{ g }}%</text>
          </g>
          <g v-for="(p, i) in juknis" :key="p.kunci">
            <text x="10" :y="62 + i * 60" font-size="12" font-weight="600" class="fill-slate-700 dark:fill-slate-200">{{ p.judul }}</text>
            <text x="10" :y="78 + i * 60" font-size="10" fill="var(--viz-teks)">{{ p.jenis === 'min' ? 'Minimal' : 'Maksimal' }} {{ p.batas }}%</text>
            <path :d="batang(JX, 48 + i * 60, Math.max(0, xj(p.persen) - JX), 26)" :fill="p.aman ? 'var(--viz-aman)' : 'var(--viz-lewat)'"><title>{{ p.judul }}: {{ fPersen(p.persen) }} ({{ rupiah(p.nilai) }})</title></path>
            <line :x1="xj(p.batas)" :x2="xj(p.batas)" :y1="42 + i * 60" :y2="80 + i * 60" stroke="currentColor" class="text-slate-800 dark:text-slate-100" stroke-width="2" stroke-dasharray="4 3" />
            <text :x="Math.min(xj(p.persen) + 6, 560)" :y="65 + i * 60" font-size="11" font-weight="700" class="fill-slate-800 dark:fill-slate-100">{{ fPersen(p.persen) }}</text>
            <text :x="Math.min(xj(p.persen) + 6, 560)" :y="79 + i * 60" font-size="10" fill="var(--viz-teks)">{{ p.aman ? '✓ sesuai' : (p.jenis === 'min' ? '⚠ kurang' : '⚠ melebihi') }} · {{ rupiahRingkas(p.nilai) }}</text>
          </g>
          <text x="10" y="246" font-size="9" fill="var(--viz-teks)">Garis putus-putus = batas Juknis. Hijau = sesuai, merah = belum sesuai.</text>
        </svg>
      </section>

      <!-- 2. Kategori -->
      <section class="kartu p-4">
        <div class="mb-2 flex items-start gap-2">
          <div class="min-w-0 flex-1"><h3 class="font-bold">Kategori anggaran</h3><p class="text-xs text-slate-500">Operasional, Alat & Mesin, Aset Tetap Lainnya</p></div>
          <button class="tombol-garis px-2.5" :disabled="!!sibuk" aria-label="Unduh grafik kategori" @click="unduh(svgK, 'Kategori Anggaran')"><Ikon nama="ImageDown" :ukuran="16" class="text-biru" /></button>
        </div>
        <svg ref="svgK" viewBox="0 0 640 250" class="w-full" role="img" aria-label="Grafik kategori anggaran" style="font-family: system-ui, sans-serif">
          <g transform="translate(0,6)">
            <path v-for="k in potongan" :key="k.kunci" :d="k.d" :fill="k.warna" stroke="var(--permukaan, #fff)" stroke-width="2" class="stroke-white dark:stroke-[#161D2B]"><title>{{ k.panjang }}: {{ rupiah(k.nilai) }} ({{ fPersen(k.persen) }})</title></path>
            <text :x="CX" :y="CY - 4" text-anchor="middle" font-size="11" fill="var(--viz-teks)">Total</text>
            <text :x="CX" :y="CY + 14" text-anchor="middle" font-size="14" font-weight="700" class="fill-slate-800 dark:fill-slate-100">{{ rupiahRingkas(total) }}</text>
          </g>
          <text x="270" y="30" font-size="13" font-weight="700" class="fill-slate-800 dark:fill-slate-100">Kategori Anggaran · {{ judulVersi }}</text>
          <g v-for="(k, i) in kategori" :key="k.kunci" :transform="`translate(270, ${62 + i * 58})`">
            <rect width="14" height="14" rx="3" :fill="k.warna" />
            <text x="22" y="12" font-size="12" font-weight="600" class="fill-slate-700 dark:fill-slate-200">{{ k.panjang }}</text>
            <text x="22" y="30" font-size="12" class="fill-slate-800 dark:fill-slate-100" font-weight="700">{{ rupiah(k.nilai) }}</text>
            <text x="350" y="30" font-size="12" text-anchor="end" fill="var(--viz-teks)">{{ fPersen(k.persen) }}</text>
          </g>
        </svg>
      </section>

      <!-- 3. Per SNP -->
      <section class="kartu p-4">
        <div class="mb-2 flex items-start gap-2">
          <div class="min-w-0 flex-1"><h3 class="font-bold">Anggaran per Standar Nasional Pendidikan</h3></div>
          <button class="tombol-garis px-2.5" :disabled="!!sibuk" aria-label="Unduh grafik per SNP" @click="unduh(svgS, 'Per SNP')"><Ikon nama="ImageDown" :ukuran="16" class="text-biru" /></button>
        </div>
        <svg ref="svgS" :viewBox="`0 0 640 ${50 + snp.length * TB}`" class="w-full" role="img" aria-label="Grafik anggaran per SNP" style="font-family: system-ui, sans-serif">
          <text x="10" y="20" font-size="13" font-weight="700" class="fill-slate-800 dark:fill-slate-100">Anggaran per SNP · {{ judulVersi }}</text>
          <g v-for="(s, i) in snp" :key="s.kode">
            <text x="10" :y="50 + i * TB" font-size="11" class="fill-slate-700 dark:fill-slate-200">{{ s.kode }}. {{ potong(s.nama, 34) }}</text>
            <path :d="batang(BX, 38 + i * TB, (s.nilai / maksSnp) * BW, 18)" fill="var(--viz-operasional)"><title>{{ s.nama }}: {{ rupiah(s.nilai) }}</title></path>
            <text :x="BX + (s.nilai / maksSnp) * BW + 6" :y="51 + i * TB" font-size="11" font-weight="600" class="fill-slate-800 dark:fill-slate-100">{{ rupiahRingkas(s.nilai) }} · {{ fPersen(s.persen, 1) }}</text>
          </g>
        </svg>
      </section>

      <!-- 4. Jenis belanja -->
      <section class="kartu p-4">
        <div class="mb-2 flex items-start gap-2">
          <div class="min-w-0 flex-1"><h3 class="font-bold">Proporsi jenis belanja</h3><p class="text-xs text-slate-500">Persentase terhadap pagu</p></div>
          <button class="tombol-garis px-2.5" :disabled="!!sibuk" aria-label="Unduh grafik jenis belanja" @click="unduh(svgB, 'Jenis Belanja')"><Ikon nama="ImageDown" :ukuran="16" class="text-biru" /></button>
        </div>
        <svg ref="svgB" :viewBox="`0 0 640 ${50 + jenis.length * TB}`" class="w-full" role="img" aria-label="Grafik proporsi jenis belanja" style="font-family: system-ui, sans-serif">
          <text x="10" y="20" font-size="13" font-weight="700" class="fill-slate-800 dark:fill-slate-100">Jenis Belanja · {{ judulVersi }}</text>
          <g v-for="(j, i) in jenis" :key="j.kunci">
            <text x="10" :y="50 + i * TB" font-size="11" class="fill-slate-700 dark:fill-slate-200">{{ j.nama }}</text>
            <path :d="batang(BX, 38 + i * TB, (j.nilai / maksJenis) * BW, 18)" fill="var(--viz-aset)"><title>{{ j.nama }}: {{ rupiah(j.nilai) }}</title></path>
            <text :x="BX + (j.nilai / maksJenis) * BW + 6" :y="51 + i * TB" font-size="11" font-weight="600" class="fill-slate-800 dark:fill-slate-100">{{ fPersen(j.persen) }} · {{ rupiahRingkas(j.nilai) }}</text>
          </g>
        </svg>
      </section>
    </div>
    <p class="text-xs text-slate-500"><Ikon nama="Info" :ukuran="13" class="inline text-biru" /> Grafik mengikuti versi RKAS yang dipilih di atas (termasuk draf pergeseran). Arahkan kursor ke batang untuk melihat nilai rupiahnya.</p>
  </div>
</template>
