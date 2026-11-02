<script setup>
// Laporan Kas Lain & Iuran: rekap semua pos per periode, buku kas per pos, dan rekap setoran tahunan
// per orang (12 bulan) untuk pos iuran bulanan. Semua bisa dicetak F4 (Times New Roman) atau Excel.
import { ref, computed } from 'vue'
import { pakaiKasLain } from './pakaiKasLain'
import { useNotifikasi } from '@/stores/notifikasi'
import { WARNA_POS, bukuPos, rentang, jumlah } from '@/utils/kasLain'
import { rupiah, tanggalPendek, NAMA_BULAN } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const notif = useNotifikasi()
const { posUrut, transaksi, tagihan, utang } = pakaiKasLain()

const sekarang = new Date()
const jenis = ref('bulan')
const tahun = ref(sekarang.getFullYear())
const bulan = ref(sekarang.getMonth() + 1)
const daftarTahun = computed(() => [...new Set([sekarang.getFullYear(), ...transaksi.value.map((t) => Number(String(t.tanggal).slice(0, 4))), ...tagihan.value.map((t) => Number(String(t.periode).slice(0, 4)))])].filter(Boolean).sort((a, b) => b - a))
const r = computed(() => rentang(jenis.value, tahun.value, bulan.value))

const rekap = computed(() => posUrut.value.map((p) => ({ p, ...bukuPos(p, transaksi.value, r.value.dari, r.value.sampai) })))
const tot = computed(() => ({ awal: jumlah(rekap.value, 'awal'), masuk: jumlah(rekap.value, 'masuk'), keluar: jumlah(rekap.value, 'keluar'), akhir: jumlah(rekap.value, 'akhir') }))
const piutang = computed(() => jumlah(utang.value.filter((u) => u.arah === 'piutang' && u.status !== 'lunas'), 'sisa'))
const utangKas = computed(() => jumlah(utang.value.filter((u) => u.arah === 'utang' && u.status !== 'lunas'), 'sisa'))

// Cetak
const cetak = ref('')
const posCetak = ref('')
const bukuCetak = computed(() => rekap.value.find((x) => x.p.id === posCetak.value))
const kolomRekap = [
  { judul: 'Pos', nilai: (x) => x.p.nama },
  { judul: 'Saldo awal', nilai: (x) => x.awal, lebar: '3cm', uang: true, jumlah: true },
  { judul: 'Masuk', nilai: (x) => x.masuk, lebar: '3cm', uang: true, jumlah: true },
  { judul: 'Keluar', nilai: (x) => x.keluar, lebar: '3cm', uang: true, jumlah: true },
  { judul: 'Saldo akhir', nilai: (x) => x.akhir, lebar: '3cm', uang: true, jumlah: true },
]
const kolomBuku = [
  { judul: 'Tanggal', nilai: (x) => tanggalPendek(x.tanggal), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'No. Bukti', nilai: (x) => x.no_bukti || '', lebar: '3cm' },
  { judul: 'Uraian', nilai: (x) => x.uraian },
  { judul: 'Masuk', nilai: (x) => x.masuk, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Keluar', nilai: (x) => x.keluar, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (x) => x.saldo, lebar: '2.9cm', uang: true },
]

// Rekap setoran tahunan per orang (12 bulan)
const posMatriks = ref('')
const matriks = computed(() => {
  if (!posMatriks.value) return []
  const m = new Map()
  tagihan.value.filter((t) => t.pos_id === posMatriks.value && String(t.periode).startsWith(String(tahun.value))).forEach((t) => {
    const k = t.orang?.id || t.orang?.nama
    const o = m.get(k) || { nama: t.orang?.nama, bln: {}, lain: [], dibayar: 0, sisa: 0, tagihan: 0 }
    const b = /^\d{4}-(\d{2})$/.exec(t.periode)?.[1]
    if (b) o.bln[Number(b)] = t; else o.lain.push(t)
    o.dibayar += t.dibayar; o.sisa += t.sisa; o.tagihan += t.nominal
    m.set(k, o)
  })
  return [...m.values()].sort((a, b) => a.nama.localeCompare(b.nama))
})
const sel = (t) => (!t ? '' : t.status === 'lunas' ? rupiah(t.dibayar, { tanpaRp: true }) : t.dibayar ? `${rupiah(t.dibayar, { tanpaRp: true })}*` : 'belum')
const kolomMatriks = [
  { judul: 'Nama', nilai: (o) => o.nama },
  ...NAMA_BULAN.map((n, i) => ({ judul: n.slice(0, 3), nilai: (o) => sel(o.bln[i + 1]), lebar: '1.55cm', rata: 'kanan' })),
  { judul: 'Dibayar', nilai: (o) => o.dibayar, lebar: '2.3cm', uang: true, jumlah: true },
  { judul: 'Sisa', nilai: (o) => o.sisa, lebar: '2.1cm', uang: true, jumlah: true },
]

async function excel(apa) {
  const peta = {
    rekap: { judul: `Rekap Kas Lain ${r.value.judul}`, baris: rekap.value, kolom: kolomRekap },
    buku: { judul: `Buku Kas ${bukuCetak.value?.p.nama} ${r.value.judul}`, baris: bukuCetak.value?.baris || [], kolom: kolomBuku },
    matriks: { judul: `Rekap Setoran ${posUrut.value.find((p) => p.id === posMatriks.value)?.nama} ${tahun.value}`, baris: matriks.value, kolom: kolomMatriks },
  }[apa]
  try { await eksporExcel({ judul: peta.judul, namaBerkas: peta.judul, baris: peta.baris, kolom: peta.kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : k.lebar ? 12 : 36, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-4">
    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="kaslain-periode">
      <div class="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button v-for="[k, l] in [['bulan', 'Bulanan'], ['tahun', 'Tahunan']]" :key="k" :class="['rounded-lg px-3 py-1.5 text-sm font-semibold', jenis === k ? 'bg-white text-biru shadow dark:bg-slate-900 dark:text-blue-300' : 'text-slate-500']" @click="jenis = k">{{ l }}</button>
      </div>
      <select v-if="jenis === 'bulan'" v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i + 1">{{ n }}</option></select>
      <select v-model.number="tahun" class="masukan w-auto py-2" aria-label="Tahun"><option v-for="t in daftarTahun" :key="t" :value="t">{{ t }}</option></select>
      <span class="text-sm text-slate-500">{{ tanggalPendek(r.dari) }} – {{ tanggalPendek(r.sampai) }}</span>
    </div>

    <!-- Rekap semua pos -->
    <section class="kartu overflow-hidden">
      <header class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
        <span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip"><Ikon nama="Sheet" :ukuran="17" /></span>
        <h2 class="min-w-0 flex-1 font-bold">Rekap semua pos · {{ r.judul }}</h2>
        <button class="tombol-garis px-3 py-1.5 text-xs" aria-label="Excel rekap" @click="excel('rekap')"><Ikon nama="FileSpreadsheet" :ukuran="15" class="text-emerald-600" /></button>
        <button class="tombol-utama px-3 py-1.5 text-xs" @click="cetak = 'rekap'"><Ikon nama="Printer" :ukuran="15" /> Cetak</button>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[40rem] text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th class="px-4 py-2">Pos</th><th class="px-3 py-2 text-right">Saldo awal</th><th class="px-3 py-2 text-right">Masuk</th><th class="px-3 py-2 text-right">Keluar</th><th class="px-4 py-2 text-right">Saldo akhir</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="x in rekap" :key="x.p.id">
              <td class="px-4 py-2"><span class="flex items-center gap-2 font-semibold"><span :class="['grid h-7 w-7 shrink-0 place-items-center rounded-lg', (WARNA_POS[x.p.warna] || WARNA_POS.biru).chip]"><Ikon :nama="x.p.ikon || 'WalletCards'" :ukuran="14" /></span>{{ x.p.nama }}</span></td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(x.awal) }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right text-emerald-600">{{ rupiah(x.masuk) }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right text-rose-600">{{ rupiah(x.keluar) }}</td>
              <td class="angka whitespace-nowrap px-4 py-2 text-right font-bold">{{ rupiah(x.akhir) }}</td>
            </tr>
          </tbody>
          <tfoot class="bg-slate-50 font-bold dark:bg-slate-900"><tr><td class="px-4 py-2">Jumlah</td><td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(tot.awal) }}</td><td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(tot.masuk) }}</td><td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(tot.keluar) }}</td><td class="angka whitespace-nowrap px-4 py-2 text-right">{{ rupiah(tot.akhir) }}</td></tr></tfoot>
        </table>
      </div>
      <p class="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">Piutang belum kembali {{ rupiah(piutang) }} · utang belum dibayar {{ rupiah(utangKas) }} (per hari ini).</p>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Buku kas pos -->
      <section class="kartu space-y-3 p-4">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="NotebookTabs" :ukuran="17" /></span> Buku kas per pos</h2>
        <p class="text-xs text-slate-500">Rincian masuk–keluar satu pos untuk {{ r.judul }}, dengan saldo berjalan.</p>
        <select v-model="posCetak" class="masukan" aria-label="Pos buku kas"><option value="">Pilih pos…</option><option v-for="p in posUrut" :key="p.id" :value="p.id">{{ p.nama }}</option></select>
        <p v-if="bukuCetak" class="text-sm"><span class="angka font-semibold">{{ bukuCetak.baris.length }}</span> transaksi · saldo akhir <b class="angka">{{ rupiah(bukuCetak.akhir) }}</b></p>
        <div class="flex gap-2">
          <button class="tombol-garis flex-1" :disabled="!bukuCetak" @click="excel('buku')"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /> Excel</button>
          <button class="tombol-utama flex-1" :disabled="!bukuCetak" @click="cetak = 'buku'"><Ikon nama="Printer" :ukuran="16" /> Cetak</button>
        </div>
      </section>

      <!-- Rekap setoran tahunan -->
      <section class="kartu space-y-3 p-4">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="CalendarCheck" :ukuran="17" /></span> Rekap setoran {{ tahun }}</h2>
        <p class="text-xs text-slate-500">Tabel per orang × 12 bulan (cocok untuk arisan, dana sosial, zakat bulanan). Tanda * = baru dibayar sebagian.</p>
        <select v-model="posMatriks" class="masukan" aria-label="Pos rekap setoran"><option value="">Pilih pos…</option><option v-for="p in posUrut" :key="p.id" :value="p.id">{{ p.nama }}</option></select>
        <p v-if="posMatriks" class="text-sm"><span class="angka font-semibold">{{ matriks.length }}</span> orang · terkumpul <b class="angka">{{ rupiah(jumlah(matriks, 'dibayar')) }}</b> · sisa <b class="angka text-rose-600">{{ rupiah(jumlah(matriks, 'sisa')) }}</b></p>
        <div class="flex gap-2">
          <button class="tombol-garis flex-1" :disabled="!matriks.length" @click="excel('matriks')"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /> Excel</button>
          <button class="tombol-utama flex-1" :disabled="!matriks.length" @click="cetak = 'matriks'"><Ikon nama="Printer" :ukuran="16" /> Cetak</button>
        </div>
      </section>
    </div>

    <CetakBuku v-if="cetak === 'rekap'" judul="Rekapitulasi Kas Lain & Iuran" :subjudul="`${r.judul} · di luar Dana BOSP`" :kolom="kolomRekap" :baris="rekap" excel orientasi="portrait" :tanggal="r.sampai"
               :ringkasan="[['Piutang belum kembali', piutang], ['Utang belum dibayar', utangKas]]"
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui,\nKepala Sekolah' }" :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Pengelola,' }" @excel="excel('rekap')" @tutup="cetak = ''" />
    <CetakBuku v-if="cetak === 'buku' && bukuCetak" :judul="`Buku Kas ${bukuCetak.p.nama}`" :subjudul="`${r.judul} · di luar Dana BOSP`" :kolom="kolomBuku" :baris="bukuCetak.baris" excel orientasi="portrait" kecil :tanggal="r.sampai"
               :ringkasan="[['Saldo awal', bukuCetak.awal], ['Masuk', bukuCetak.masuk], ['Keluar', bukuCetak.keluar], ['Saldo akhir', bukuCetak.akhir]]"
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui,\nKepala Sekolah' }" :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Pengelola,' }" @excel="excel('buku')" @tutup="cetak = ''" />
    <CetakBuku v-if="cetak === 'matriks'" :judul="`Rekap Setoran ${posUrut.find((p) => p.id === posMatriks)?.nama}`" :subjudul="`Tahun ${tahun} · * dibayar sebagian · di luar Dana BOSP`" :kolom="kolomMatriks" :baris="matriks" excel orientasi="landscape" kecil
               :ringkasan="[['Total tagihan', jumlah(matriks, 'tagihan')], ['Terkumpul', jumlah(matriks, 'dibayar')], ['Belum dibayar', jumlah(matriks, 'sisa')]]"
               :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Pengelola,' }" @excel="excel('matriks')" @tutup="cetak = ''" />
  </div>
</template>
