<script setup>
// Daftar setoran per orang: semua tagihan (lintas pos), setorannya, dan pinjaman orang tersebut.
// Cetak "Kartu Setoran" F4, Excel, dan WhatsApp rincian tagihan yang belum lunas.
import { ref, computed } from 'vue'
import { pakaiKasLain } from './pakaiKasLain'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { STATUS, CARA_BAYAR, labelPeriode, jumlah, rincianWa } from '@/utils/kasLain'
import { rupiah, tanggalPendek } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import KirimWaKas from './KirimWaKas.vue'

const auth = useAuth()
const notif = useNotifikasi()
const { tagihan, utang, orang, namaPos } = pakaiKasLain()

const kunci = (o) => o?.id || `nama:${o?.nama}`
// Semua orang yang punya tagihan/pinjaman + pegawai lain
const daftar = computed(() => {
  const m = new Map()
  const tambah = (o) => { if (!o?.nama) return null; const k = kunci(o); if (!m.has(k)) m.set(k, { k, nama: o.nama, no: o.no_wa || orang.value.find((x) => x.id === o.id)?.no_wa || '', tagihan: [], utang: [] }); return m.get(k) }
  tagihan.value.forEach((t) => tambah(t.orang)?.tagihan.push(t))
  utang.value.forEach((u) => tambah(u.pihak)?.utang.push(u))
  orang.value.forEach((o) => tambah(o))
  return [...m.values()].map((x) => ({ ...x, sisa: jumlah(x.tagihan, 'sisa'), setor: jumlah(x.tagihan, 'dibayar'), sisaUtang: jumlah(x.utang.filter((u) => u.arah === 'piutang'), 'sisa') }))
    .sort((a, b) => b.sisa - a.sisa || b.tagihan.length - a.tagihan.length || a.nama.localeCompare(b.nama))
})
const cari = ref('')
const tampil = computed(() => daftar.value.filter((x) => !cari.value || x.nama.toLowerCase().includes(cari.value.toLowerCase())))
const pilih = ref('')
const o = computed(() => daftar.value.find((x) => x.k === pilih.value))
const tahun = ref('')
const daftarTahun = computed(() => [...new Set((o.value?.tagihan || []).map((t) => String(t.periode).slice(0, 4)))].sort().reverse())
const tgh = computed(() => (o.value?.tagihan || []).filter((t) => !tahun.value || String(t.periode).startsWith(tahun.value)).sort((a, b) => String(a.periode).localeCompare(String(b.periode)) || namaPos(a.pos_id).localeCompare(namaPos(b.pos_id))))
const setoran = computed(() => tgh.value.flatMap((t) => (t.setoran || []).map((s) => ({ ...s, t }))).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal))))
const ringkas = computed(() => ({ tagihan: jumlah(tgh.value, 'nominal'), dibayar: jumlah(tgh.value, 'dibayar'), sisa: jumlah(tgh.value, 'sisa') }))
// Ringkas per pos
const perPos = computed(() => {
  const m = {}
  tgh.value.forEach((t) => { const p = (m[t.pos_id] ??= { pos: namaPos(t.pos_id), tagihan: 0, dibayar: 0, sisa: 0, n: 0 }); p.tagihan += t.nominal; p.dibayar += t.dibayar; p.sisa += t.sisa; p.n++ })
  return Object.values(m)
})

const wa = ref(false)
const cetak = ref(false)
const kolom = [
  { judul: 'Pos', nilai: (r) => namaPos(r.pos_id), lebar: '3.4cm' },
  { judul: 'Periode', nilai: (r) => labelPeriode(r.periode) + (r.ket ? ` (${r.ket})` : ''), lebar: '3.4cm' },
  { judul: 'Tanggal & kwitansi setoran', nilai: (r) => (r.setoran || []).map((s) => `${tanggalPendek(s.tanggal)} ${rupiah(s.nilai, { tanpaRp: true })} (${s.no_kwitansi})`).join('; ') || '-' },
  { judul: 'Tagihan', nilai: (r) => r.nominal, lebar: '2.4cm', uang: true, jumlah: true },
  { judul: 'Dibayar', nilai: (r) => r.dibayar, lebar: '2.4cm', uang: true, jumlah: true },
  { judul: 'Sisa', nilai: (r) => r.sisa, lebar: '2.4cm', uang: true, jumlah: true },
  { judul: 'Status', nilai: (r) => STATUS[r.status].label, lebar: '1.9cm', rata: 'tengah' },
]
async function excel() {
  try { await eksporExcel({ judul: `Daftar Setoran ${o.value.nama}`, namaBerkas: `Daftar Setoran ${o.value.nama}`, baris: tgh.value, kolom: kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : 30, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
    <!-- Daftar orang -->
    <section :class="['kartu overflow-hidden lg:block', o && 'hidden']" data-tur="kaslain-orang">
      <div class="border-b border-slate-100 p-3 dark:border-slate-800">
        <div class="relative"><Ikon nama="Search" :ukuran="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari nama" aria-label="Cari nama" /></div>
      </div>
      <ul class="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        <li v-for="x in tampil" :key="x.k">
          <button :class="['flex w-full items-center gap-3 px-4 py-2.5 text-left', pilih === x.k ? 'bg-biru/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50']" @click="pilih = x.k; tahun = ''">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ x.nama.charAt(0) }}</span>
            <span class="min-w-0 flex-1"><span class="line-clamp-2 block text-sm font-semibold leading-snug">{{ x.nama }}</span><span class="block text-xs text-slate-500">{{ x.tagihan.length }} tagihan{{ x.utang.length ? ` · ${x.utang.length} pinjaman` : '' }}</span></span>
            <span v-if="x.sisa" class="angka shrink-0 text-xs font-bold text-rose-600">{{ rupiah(x.sisa) }}</span>
            <Ikon v-else-if="x.tagihan.length" nama="CheckCheck" :ukuran="16" class="shrink-0 text-emerald-600" />
          </button>
        </li>
      </ul>
    </section>

    <!-- Detail orang -->
    <div v-if="o" class="min-w-0 space-y-4">
      <div class="kartu flex flex-wrap items-center gap-3 p-4">
        <button class="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 lg:hidden dark:bg-slate-800" aria-label="Kembali ke daftar" @click="pilih = ''"><Ikon nama="ArrowLeft" :ukuran="18" /></button>
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="Contact" :ukuran="21" /></span>
        <div class="min-w-0 flex-1"><h2 class="truncate font-extrabold">{{ o.nama }}</h2><p class="text-xs text-slate-500">{{ o.no || 'Nomor WA belum diisi' }}</p></div>
        <div class="flex flex-wrap gap-2">
          <select v-if="daftarTahun.length > 1" v-model="tahun" class="masukan w-auto py-2" aria-label="Tahun"><option value="">Semua tahun</option><option v-for="t in daftarTahun" :key="t" :value="t">{{ t }}</option></select>
          <button class="tombol-garis" aria-label="Excel" :disabled="!tgh.length" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /></button>
          <button class="tombol-garis" :disabled="!tgh.length" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> Cetak</button>
          <button v-if="auth.isAdmin" class="tombol-utama !bg-emerald-600" :disabled="!o.sisa" @click="wa = true"><Ikon nama="MessageCircle" :ukuran="17" /> WA tagihan</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div v-for="[l, n, c] in [['Tagihan', ringkas.tagihan, 'text-biru dark:text-blue-300'], ['Dibayar', ringkas.dibayar, 'text-emerald-600'], ['Sisa', ringkas.sisa, ringkas.sisa ? 'text-rose-600' : 'text-emerald-600']]" :key="l" class="kartu min-w-0 p-3 text-center">
          <p class="text-[11px] font-semibold uppercase text-slate-500">{{ l }}</p><p :class="['angka truncate text-sm font-extrabold sm:text-base', c]" :title="rupiah(n)">{{ rupiah(n) }}</p>
        </div>
      </div>

      <section v-if="perPos.length > 1" class="kartu overflow-hidden">
        <h3 class="border-b border-slate-100 px-4 py-2.5 text-sm font-bold dark:border-slate-800">Per pos</h3>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="p in perPos" :key="p.pos" class="flex items-center gap-3 px-4 py-2 text-sm">
            <span class="min-w-0 flex-1 truncate font-semibold">{{ p.pos }} <span class="font-normal text-slate-500">· {{ p.n }}×</span></span>
            <span class="angka text-xs text-slate-500">{{ rupiah(p.dibayar) }} / {{ rupiah(p.tagihan) }}</span>
            <span :class="['angka w-24 text-right text-xs font-bold', p.sisa ? 'text-rose-600' : 'text-emerald-600']">{{ p.sisa ? rupiah(p.sisa) : 'Lunas' }}</span>
          </li>
        </ul>
      </section>

      <section class="kartu overflow-hidden">
        <h3 class="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-bold dark:border-slate-800"><Ikon nama="ListTodo" :ukuran="16" class="text-[#E3A414]" /> Tagihan</h3>
        <p v-if="!tgh.length" class="p-6 text-center text-sm text-slate-500">Belum ada tagihan.</p>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="t in tgh" :key="t.id" class="flex items-center gap-3 px-4 py-2.5">
            <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">{{ namaPos(t.pos_id) }} · {{ labelPeriode(t.periode) }}</p><p class="text-xs text-slate-500">{{ rupiah(t.dibayar) }} dari {{ rupiah(t.nominal) }}</p></div>
            <span :class="['lencana shrink-0', STATUS[t.status].kelas]">{{ t.status === 'lunas' ? 'Lunas' : rupiah(t.sisa) }}</span>
          </li>
        </ul>
      </section>

      <section class="kartu overflow-hidden">
        <h3 class="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-bold dark:border-slate-800"><Ikon nama="Receipt" :ukuran="16" class="text-[#22A08D]" /> Riwayat setoran</h3>
        <p v-if="!setoran.length" class="p-6 text-center text-sm text-slate-500">Belum ada setoran.</p>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="s in setoran" :key="s.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ikon-chip-sukses"><Ikon nama="ArrowDownLeft" :ukuran="15" /></span>
            <span class="min-w-0 flex-1"><span class="block truncate font-semibold">{{ namaPos(s.t.pos_id) }} · {{ labelPeriode(s.t.periode) }}</span><span class="block truncate text-xs text-slate-500">{{ tanggalPendek(s.tanggal) }} · {{ CARA_BAYAR[s.cara] || s.cara }} · <span class="kode">{{ s.no_kwitansi }}</span></span></span>
            <span class="angka shrink-0 font-bold text-emerald-600">{{ rupiah(s.nilai) }}</span>
          </li>
        </ul>
      </section>

      <section v-if="o.utang.length" class="kartu overflow-hidden">
        <h3 class="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-bold dark:border-slate-800"><Ikon nama="HandCoins" :ukuran="16" class="text-violet-600" /> Utang piutang</h3>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="u in o.utang" :key="u.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span class="min-w-0 flex-1 truncate"><b>{{ u.arah === 'piutang' ? 'Meminjam' : 'Meminjamkan' }}</b> · {{ u.uraian }} · {{ tanggalPendek(u.tanggal) }}</span>
            <span :class="['lencana shrink-0', STATUS[u.status].kelas]">{{ u.status === 'lunas' ? 'Lunas' : rupiah(u.sisa) }}</span>
          </li>
        </ul>
      </section>
    </div>
    <div v-else class="kartu hidden flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500 lg:flex">
      <Ikon nama="Contact" :ukuran="32" class="text-slate-300" /> Pilih nama di sebelah kiri untuk melihat daftar setorannya.
    </div>

    <KirimWaKas v-if="wa && o" :nama="o.nama" :no="o.no" :jenis="['tagih']" :acuan="`orang:${o.k}`"
                :data="() => ({ nama: o.nama, rincian: rincianWa(o.tagihan.filter((t) => t.status !== 'lunas'), namaPos), sisa: rupiah(o.sisa) })" @tutup="wa = false" />

    <CetakBuku v-if="cetak && o" :judul="`Daftar Setoran — ${o.nama}`" :subjudul="`${tahun ? 'Tahun ' + tahun : 'Semua periode'} · Kas Lain & Iuran (di luar Dana BOSP)`" :kolom="kolom" :baris="tgh" excel orientasi="landscape" kecil
               :ringkasan="[['Total tagihan', ringkas.tagihan], ['Telah dibayar', ringkas.dibayar], ['Belum dibayar', ringkas.sisa]]"
               :ttd-kiri="{ label: 'Yang bersangkutan,', pejabat: { nama: o.nama } }" :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Pengelola,' }" @excel="excel" @tutup="cetak = false" />
  </div>
</template>
