<script setup>
// Laporan Format SIMAKDA: 9 laporan dengan susunan sama seperti cetakan SIMAKDA Pemkot Makassar,
// untuk periode bulanan, semester, setahun, atau rentang tanggal bebas (tanggal mulai – tanggal akhir).
import { ref, computed, onMounted, watch } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatReferensi } from '@/services/referensi'
import { muatProfilSekolah } from '@/services/cetak'
import { SEKOLAH_AWAL } from '@/config/sekolahAwal'
import { NAMA_BULAN, rupiah, keIso, tanggalPendek } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import {
  AKUN_SIMAKDA, KODE_PAJAK_SIMAKDA, periodeSimakda, teksPeriode, tanggalDmy, paguAkun,
  bkuSimakda, bukuPembantu, bukuPajakSimakda, spjBelanjaSimakda, bukuObjekSimakda, lrpbSimakda, sptjmSimakda, bmdSimakda,
} from '@/utils/simakda'
import Ikon from '@/components/Ikon.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokSimakda from '@/components/cetak/DokSimakda.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const notif = useNotifikasi()

const kini = new Date()
const mode = ref('rentang')
const bulan = ref(kas.tahun === kini.getFullYear() ? kini.getMonth() : 11)
const semester = ref(kini.getMonth() < 6 ? 1 : 2)
const tglDari = ref(`${kas.tahun}-01-01`)
const tglSampai = ref(kas.tahun === kini.getFullYear() ? keIso(kini) : `${kas.tahun}-12-31`)
watch(() => kas.tahun, (t) => { tglDari.value = `${t}-01-01`; tglSampai.value = t === kini.getFullYear() ? keIso(kini) : `${t}-12-31` })
const per = computed(() => periodeSimakda({ mode: mode.value, tahun: kas.tahun, bulan: bulan.value, semester: semester.value, dari: tglDari.value, sampai: tglSampai.value }))
const tglTtd = ref('')
const tanggalTtd = computed(() => tglTtd.value || per.value.sampai)
const nomorSptjm = ref('')
const akunObjek = ref(AKUN_SIMAKDA[0].kode)

// Kode akun pajak SIMAKDA dari Referensi → Kode Pajak (kolom Kode SIMAKDA), bila diisi
const kodePajak = ref({ ...KODE_PAJAK_SIMAKDA })
const profil = ref({ ...SEKOLAH_AWAL })
onMounted(async () => {
  profil.value = await muatProfilSekolah().catch(() => profil.value)
  try {
    const r = await muatReferensi('pajak')
    const peta = { PPN: 'PPN', PPh21: 'PPh 21', PPh22: 'PPh 22', PPh23: 'PPh 23', 'PPh4(2)': 'PPh 4(2)' }
    r.butir.forEach((b) => { if (peta[b.kode] && b.kode_simakda) kodePajak.value[peta[b.kode]] = b.kode_simakda })
  } catch { /* pakai bawaan */ }
})

const data = computed(() => ({ baris: kas.baris, belanja: belanja.daftar, kewajiban: kas.kewajiban, setoran: kas.setoran, uraian: rkas.uraian, kodePajak: kodePajak.value }))
const d = computed(() => {
  const { dari, sampai } = per.value
  return {
    bku: bkuSimakda(data.value, dari, sampai),
    tunai: bukuPembantu(data.value, dari, sampai, 'tunai'),
    bank: bukuPembantu(data.value, dari, sampai, 'bank'),
    pajak: bukuPajakSimakda(data.value, dari, sampai),
    spj: spjBelanjaSimakda(data.value, dari, sampai, { kodeKegiatan: profil.value.kode_kegiatan_dpa || '1.01.02.2.02.0042' }),
    objek: bukuObjekSimakda(data.value, dari, sampai, akunObjek.value),
    lrpb: lrpbSimakda(data.value, dari, sampai),
    sptjm: sptjmSimakda(data.value, dari, sampai),
    bmd: bmdSimakda(belanja.daftar, dari, sampai),
  }
})
const pagu = computed(() => paguAkun(rkas.uraian))
const akunAda = computed(() => AKUN_SIMAKDA.filter((a) => pagu.value[a.kode] || a.awalan !== '5.2.03'))

const DOK = computed(() => [
  { kunci: 'bku', judul: 'Buku Kas Umum', ikon: 'BookOpenText', warna: 'ikon-chip', ket: `${d.value.bku.isi.length} nomor · sisa kas ${rupiah(d.value.bku.sisa)}`, excel: true },
  { kunci: 'tunai', judul: 'Buku Pembantu Tunai', ikon: 'Banknote', warna: 'ikon-chip-tosca', ket: `${d.value.tunai.isi.length} baris · saldo ${rupiah(d.value.tunai.akhir)}`, excel: true },
  { kunci: 'bank', judul: 'Buku Simpanan Bank', ikon: 'Landmark', warna: 'ikon-chip', ket: `${d.value.bank.isi.length} baris · saldo ${rupiah(d.value.bank.akhir)}`, excel: true },
  { kunci: 'pajak', judul: 'Buku Pembantu Pajak', ikon: 'ReceiptText', warna: 'ikon-chip-kuning', ket: `Terima ${rupiah(d.value.pajak.masuk)} · setor ${rupiah(d.value.pajak.keluar)}`, excel: true },
  { kunci: 'spj', judul: 'LPJ Bendahara Pengeluaran (SPJ Belanja BOS)', ikon: 'FileCheck', warna: 'ikon-chip-tosca', ket: `Realisasi periode ${rupiah(d.value.spj.total.kini)} · F4 mendatar`, excel: true, orientasi: 'landscape' },
  { kunci: 'objek', judul: 'Buku Subrincian Objek', ikon: 'BookCopy', warna: 'ikon-chip-kuning', ket: `${d.value.objek.isi.length} transaksi · sisa anggaran ${rupiah(d.value.objek.akhir)}`, excel: true, pilihAkun: true },
  { kunci: 'lrpb', judul: 'Laporan Realisasi Penerimaan & Belanja', ikon: 'ChartColumn', warna: 'ikon-chip', ket: `Belanja periode ${rupiah(d.value.lrpb.jumlahKeluar.kini)}` },
  { kunci: 'sptjm', judul: 'SPTJM (Surat Pernyataan Tanggung Jawab Mutlak)', ikon: 'Stamp', warna: 'ikon-chip-tosca', ket: `Sisa dana ${rupiah(d.value.sptjm.sisa)}`, nomor: true },
  { kunci: 'bmd', judul: 'Rekapitulasi Pembelian BMD', ikon: 'Boxes', warna: 'ikon-chip-kuning', ket: `${d.value.bmd.isi.reduce((s, g) => s + g.item.length, 0)} barang · ${rupiah(d.value.bmd.total)}`, excel: true },
])
const cetak = ref('')
const dokCetak = computed(() => DOK.value.find((x) => x.kunci === cetak.value))
const namaBerkas = computed(() => `${dokCetak.value?.judul.split(' (')[0]} ${tanggalPendek(per.value.dari).replaceAll('/', '-')} sd ${tanggalPendek(per.value.sampai).replaceAll('/', '-')}`)

/* ---------- Excel ---------- */
const K = (judul, nilai, uang = false, lebar) => ({ judul, nilai, jenis: uang ? 'uang' : 'teks', lebar: lebar || (uang ? 17 : 14) })
async function excel(kunci) {
  const x = d.value[kunci]
  const p = teksPeriode(per.value.dari, per.value.sampai)
  let baris = [], kolom = [], judul = DOK.value.find((y) => y.kunci === kunci).judul
  if (kunci === 'bku') {
    baris = [{ uraian: 'Saldo Bulan Lalu', saldo: x.awal }, ...x.isi.flatMap((g) => [{ nomor: g.nomor, tanggal: tanggalDmy(g.tanggal), bnu: g.bnu, uraian: g.judul }, ...g.baris.map((l) => ({ uraian: l.label, masuk: l.masuk, keluar: l.keluar, saldo: l.saldo }))])]
    kolom = [K('Nomor', (r) => r.nomor ?? '', false, 8), K('Tanggal', (r) => r.tanggal || ''), K('No Bukti', (r) => r.bnu || ''), K('Uraian', (r) => r.uraian, false, 60), K('Penerimaan', (r) => r.masuk || '', true), K('Pengeluaran', (r) => r.keluar || '', true), K('Saldo', (r) => r.saldo ?? '', true)]
  } else if (kunci === 'tunai' || kunci === 'bank') {
    baris = [{ uraian: 'Saldo Lalu', saldo: x.awal }, ...x.isi.map((r) => ({ ...r, tanggal: tanggalDmy(r.tanggal) }))]
    kolom = [K('Tanggal', (r) => r.tanggal || ''), K('No. Bukti', (r) => r.bnu || ''), K('Uraian', (r) => r.uraian, false, 60), K('Penerimaan', (r) => r.masuk || '', true), K('Pengeluaran', (r) => r.keluar || '', true), K('Saldo', (r) => r.saldo, true)]
  } else if (kunci === 'pajak') {
    baris = [{ uraian: 'Saldo Pemotongan Bulan Lalu', saldo: x.awal }, ...x.isi.flatMap((e) => [{ tanggal: tanggalDmy(e.tanggal), bnu: e.bnu, uraian: e.judul }, ...e.baris.map((l) => ({ uraian: l.label, masuk: l.masuk, keluar: l.keluar, saldo: l.saldo }))])]
    kolom = [K('Tanggal', (r) => r.tanggal || ''), K('No. Bukti', (r) => r.bnu || ''), K('Uraian', (r) => r.uraian, false, 60), K('Penerimaan', (r) => r.masuk || '', true), K('Pengeluaran', (r) => r.keluar || '', true), K('Saldo', (r) => r.saldo ?? '', true)]
  } else if (kunci === 'spj') {
    baris = [...x.baris, { kode: '', nama: 'Jumlah', ...x.total }, ...x.kas.map((k) => ({ kode: '', nama: k.judul, lalu: k.kepala ? '' : k.lalu, kini: k.kepala ? '' : k.kini, sd: k.kepala ? '' : k.sd, anggaran: '', sisa: '' }))]
    kolom = [K('Kode Rekening', (r) => r.kode, false, 34), K('Uraian', (r) => r.nama, false, 50), K('Jumlah Anggaran', (r) => r.anggaran, true), K('s.d Bulan lalu', (r) => r.lalu, true), K('Bulan ini', (r) => r.kini, true), K('s.d Bulan ini', (r) => r.sd, true), K('Sisa Pagu Anggaran', (r) => r.sisa, true)]
  } else if (kunci === 'objek') {
    judul = `${judul} ${x.akun.kode}`
    baris = [{ uraian: 'Saldo Lalu', sisa: x.awal }, ...x.isi.map((r) => ({ ...r, tanggal: tanggalDmy(r.tanggal) }))]
    kolom = [K('Tanggal', (r) => r.tanggal || ''), K('No. Bukti', (r) => r.bnu || ''), K('Uraian', (r) => r.uraian, false, 60), K('Realisasi', (r) => r.realisasi ?? '', true), K('Sisa Anggaran', (r) => r.sisa, true)]
  } else if (kunci === 'bmd') {
    let n = 0
    baris = x.isi.flatMap((g) => [{ nama: g.akun.nama, jumlah: g.total }, ...g.item.map((i) => ({ ...i, no: ++n }))])
    kolom = [K('No.', (r) => r.no ?? '', false, 6), K('Nama Barang Milik Daerah', (r) => r.nama, false, 55), K('Jumlah Unit', (r) => r.volume ?? ''), K('Harga Satuan', (r) => r.harga ?? '', true), K('Jumlah', (r) => r.jumlah, true)]
  }
  try { await eksporExcel({ judul: `${judul.toUpperCase()} — PERIODE ${p}`, namaBerkas: `${judul.split(' (')[0]} SIMAKDA ${per.value.dari} sd ${per.value.sampai}`, baris, kolom }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-4">
    <section class="kartu space-y-3 p-4" data-tur="simakda-periode">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ikon-chip"><Ikon nama="CalendarRange" :ukuran="19" /></span>
        <div class="min-w-0 flex-1"><h2 class="font-bold">Periode laporan</h2><p class="text-xs text-slate-500">Sama seperti SIMAKDA: bulanan atau tanggal mulai s.d. tanggal akhir.</p></div>
      </div>
      <div class="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button v-for="[k, l, i] in [['rentang', 'Rentang tanggal', 'CalendarRange'], ['bulan', 'Bulanan', 'CalendarDays'], ['semester', 'Semester', 'Split'], ['tahun', 'Setahun', 'CalendarCheck']]" :key="k"
                :class="['flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold', mode === k ? 'bg-white text-biru shadow dark:bg-slate-900 dark:text-blue-300' : 'text-slate-500']" @click="mode = k">
          <Ikon :nama="i" :ukuran="15" /> {{ l }}
        </button>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <template v-if="mode === 'rentang'">
          <div><label class="label" for="sm-dari">Tanggal mulai</label><input id="sm-dari" v-model="tglDari" type="date" class="masukan" /></div>
          <div><label class="label" for="sm-sampai">Tanggal akhir</label><input id="sm-sampai" v-model="tglSampai" type="date" class="masukan" /></div>
        </template>
        <div v-else-if="mode === 'bulan'"><label class="label" for="sm-bulan">Bulan</label><select id="sm-bulan" v-model.number="bulan" class="masukan"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }} {{ kas.tahun }}</option></select></div>
        <div v-else-if="mode === 'semester'"><label class="label" for="sm-sem">Semester</label><select id="sm-sem" v-model.number="semester" class="masukan"><option :value="1">Semester I (Jan–Jun)</option><option :value="2">Semester II (Jul–Des)</option></select></div>
        <div><label class="label" for="sm-ttd">Tanggal tanda tangan</label><input id="sm-ttd" v-model="tglTtd" type="date" class="masukan" :placeholder="per.sampai" /></div>
      </div>
      <p class="flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-biru dark:bg-blue-950/30 dark:text-blue-300">
        <Ikon nama="CalendarDays" :ukuran="16" /> PERIODE : {{ teksPeriode(per.dari, per.sampai) }}
      </p>
    </section>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-tur="simakda-dokumen">
      <section v-for="x in DOK" :key="x.kunci" class="kartu flex min-w-0 flex-col gap-3 p-4">
        <div class="flex items-start gap-3">
          <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', x.warna]"><Ikon :nama="x.ikon" :ukuran="19" /></span>
          <div class="min-w-0 flex-1"><h3 class="font-bold leading-snug">{{ x.judul }}</h3><p class="text-xs text-slate-500">{{ x.ket }}</p></div>
        </div>
        <select v-if="x.pilihAkun" v-model="akunObjek" class="masukan py-2 text-sm" aria-label="Rekening objek"><option v-for="a in akunAda" :key="a.kode" :value="a.kode">{{ a.kode }} · {{ a.nama.replace(' BOSP-BOS Reguler', '') }}</option></select>
        <input v-if="x.nomor" v-model="nomorSptjm" class="masukan py-2 text-sm" placeholder="Nomor SPTJM, mis. 421/600/UPT.SPF.SMPN.19/VI/2026" aria-label="Nomor SPTJM" />
        <div class="mt-auto flex gap-2">
          <button v-if="x.excel" class="tombol-garis flex-1" @click="excel(x.kunci)"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /> Excel</button>
          <button class="tombol-utama flex-1" @click="cetak = x.kunci"><Ikon nama="Printer" :ukuran="16" /> Cetak</button>
        </div>
      </section>
    </div>

    <p class="flex items-start gap-2 rounded-2xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Ikon nama="Info" :ukuran="15" class="mt-0.5 shrink-0" />
      <span>Identitas (kelurahan, kecamatan, Nomor DPA, kode kegiatan) diambil dari Pengaturan → Profil Sekolah. Kode akun pajak (2110402 PPn, 2110314 PPh 23, 2110321 / 2110306 PPh 21) bisa diubah di Referensi Juknis → Kode Pajak.</span></p>

    <CetakSurat v-if="dokCetak" :judul="dokCetak.judul" :nama-berkas="namaBerkas" :orientasi="dokCetak.orientasi || 'portrait'" @tutup="cetak = ''">
      <template #default="{ pejabat }">
        <DokSimakda :jenis="cetak" :d="d[cetak]" :profil="profil" :dari="per.dari" :sampai="per.sampai" :tahun="kas.tahun" :tanggal="tanggalTtd" :nomor="nomorSptjm"
                    :kepsek="pejabat('kepala_sekolah', tanggalTtd)" :bendahara="pejabat('bendahara_bosp', tanggalTtd)" />
      </template>
    </CetakSurat>
  </div>
</template>
