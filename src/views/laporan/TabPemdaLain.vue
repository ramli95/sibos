<script setup>
// Laporan versi Pemda yang tersisa (Fase 7): BKU per nota + terbilang, Buku Simpanan Bank, SPJ Belanja BOS,
// Surat Tanda Setoran (STS), dan SPTJM Pemda per semester/tahun (Permendagri 3/2023 Pasal 55–60).
// Format mengikuti struktur umum dokumen Pemda; bila Dinas/BPKAD memberi format resmi, susunan kolom bisa disesuaikan.
import InputAngka from '@/components/InputAngka.vue'
import { ref, reactive, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { laporanPemda, akhirBulanIso, itemLunas, penerimaanDana } from '@/utils/laporan'
import { ringkasanBulan, saldoSampai, kolomExcel } from '@/utils/bku'
import { KELOMPOK_BELANJA } from '@/config/laporan'
import { rupiah, terbilang, tanggalPendek, NAMA_BULAN, keIso } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokSts from '@/components/cetak/DokSts.vue'
import DokSptjmPemda from '@/components/cetak/DokSptjmPemda.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const notif = useNotifikasi()

const kini = new Date()
const bulan = ref(kini.getFullYear() === kas.tahun ? Math.max(0, kini.getMonth() - (kini.getDate() <= 10 ? 1 : 0)) : 11)
const periode = computed(() => `${NAMA_BULAN[bulan.value]} ${kas.tahun}`)
const tglAkhir = computed(() => akhirBulanIso(kas.tahun, bulan.value))
const awalBulan = computed(() => `${kas.tahun}-${String(bulan.value + 1).padStart(2, '0')}-01`)
const rb = computed(() => ringkasanBulan(kas.baris, bulan.value, kas.tahun))
const IDENTITAS = computed(() => [['Nama Satuan Pendidikan', 'UPT SPF SMP Negeri 19 Makassar'], ['Sumber Dana', 'Dana BOSP Reguler'], ['Bulan', periode.value]])
const dalamBulan = (r) => r.tanggal >= awalBulan.value && r.tanggal <= tglAkhir.value

/* ---------- 1. BKU per nota ---------- */
const barisNota = computed(() => {
  const grup = []
  const peta = new Map()
  kas.bku.filter(dalamBulan).forEach((r) => {
    const kunci = r.bnu ? `${r.tanggal}|${r.bnu}` : r.id
    if (!peta.has(kunci)) { const g = { id: kunci, tanggal: r.tanggal, bnu: r.bnu, kode: [], uraian: r.uraian, masuk: 0, keluar: 0, saldo: 0 }; peta.set(kunci, g); grup.push(g) }
    const g = peta.get(kunci)
    if (r.kode_rekening && !g.kode.includes(r.kode_rekening)) g.kode.push(r.kode_rekening)
    g.masuk += r.masuk; g.keluar += r.keluar; g.saldo = r.saldo
  })
  return [{ id: 'awal', tanggal: awalBulan.value, bnu: '', kode: [], uraian: 'Saldo bulan lalu', masuk: 0, keluar: 0, saldo: rb.value.saldo_awal, awal: true }, ...grup]
})
const kolomNota = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2cm', rata: 'tengah' },
  { judul: 'No. Bukti (BNU)', nilai: (r) => r.bnu, lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Kode Rekening', nilai: (r) => r.kode.join(', '), lebar: '3cm', kode: true },
  { judul: 'Uraian', nilai: (r) => r.uraian },
  { judul: 'Penerimaan', nilai: (r) => r.masuk, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Pengeluaran', nilai: (r) => r.keluar, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (r) => r.saldo, lebar: '2.7cm', uang: true },
  { judul: 'Terbilang', nilai: (r) => (r.awal ? '' : terbilang(r.masuk || r.keluar)), lebar: '5.4cm' },
]

/* ---------- 2. Buku Simpanan Bank ---------- */
const barisBank = computed(() => {
  const awal = saldoSampai(kas.baris, keIso(new Date(kas.tahun, bulan.value, 0)), 'bank')
  return [{ id: 'awal', tanggal: awalBulan.value, bnu: '', uraian: 'Saldo bulan lalu', masuk: 0, keluar: 0, saldo: awal }, ...kas.bank.filter(dalamBulan)]
})
const kolomBank = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'No. Bukti', nilai: (r) => r.bnu, lebar: '2.4cm', rata: 'tengah' },
  { judul: 'Uraian', nilai: (r) => r.uraian },
  { judul: 'Penerimaan (Debet)', nilai: (r) => r.masuk, lebar: '3.2cm', uang: true, jumlah: true },
  { judul: 'Pengeluaran (Kredit)', nilai: (r) => r.keluar, lebar: '3.2cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (r) => r.saldo, lebar: '3.2cm', uang: true },
]

/* ---------- 3. SPJ Belanja BOS ---------- */
const pagu = computed(() => rkas.versiBerlaku?.pagu || rkas.uraian.reduce((s, u) => s + u.jumlah, 0))
const lap = computed(() => laporanPemda({ uraian: rkas.uraian, belanja: belanja.daftar, kas: kas.kas, pagu: pagu.value, bulan: bulan.value, nama: rkas.nama }))
const barisSpj = computed(() => [...lap.value.belanja, { tingkat: 0, kode: '', nama: 'JUMLAH BELANJA', jumlah: true, ...lap.value.totalBelanja, sisa: lap.value.totalBelanja.anggaran - lap.value.totalBelanja.sd }].map((r, i) => ({ ...r, id: i })))
const kolomSpj = [
  { judul: 'Kode Rekening', nilai: (r) => r.kode, lebar: '3.2cm', kode: true },
  { judul: 'Uraian', nilai: (r) => (r.tingkat === 2 ? '   ' : '') + r.nama },
  { judul: 'Anggaran', nilai: (r) => r.anggaran, lebar: '2.9cm', uang: true },
  { judul: 'SPJ s.d. Bulan Lalu', nilai: (r) => r.lalu, lebar: '2.9cm', uang: true },
  { judul: 'SPJ Bulan Ini', nilai: (r) => r.kini, lebar: '2.9cm', uang: true },
  { judul: 'SPJ s.d. Bulan Ini', nilai: (r) => r.sd, lebar: '2.9cm', uang: true },
  { judul: 'Sisa Anggaran', nilai: (r) => r.sisa, lebar: '2.9cm', uang: true },
]
const warnaSpj = (r) => (r.jumlah ? '#f3f4f6' : r.tingkat === 1 ? '#f8fafc' : null)

/* ---------- 4. STS ---------- */
const sts = reactive({ nomor: '', tanggal: keIso(), bank: 'Rekening Kas Umum Daerah Kota Makassar', rekening: '', penyetor: '', keterangan: '', baris: [{ kode: '', uraian: '', nilai: 0 }] })
function isiBunga() {
  const n = kas.baris.filter((r) => r.jenis === 'bunga' && dalamBulan(r)).reduce((s, r) => s + r.bank + r.tunai, 0)
  sts.baris = [{ kode: '', uraian: `Jasa giro rekening Dana BOSP bulan ${periode.value}`, nilai: n }]
}

/* ---------- 5. SPTJM Pemda per semester/tahun ---------- */
const semester = ref(kini.getMonth() < 6 ? 1 : 2)
const rentangS = computed(() => (semester.value === 1 ? [0, 5] : semester.value === 2 ? [6, 11] : [0, 11]))
const judulS = computed(() => `${semester.value === 3 ? 'Tahun Anggaran' : `Semester ${semester.value === 1 ? 'I' : 'II'} Tahun Anggaran`} ${kas.tahun}`)
const tglS = computed(() => akhirBulanIso(kas.tahun, rentangS.value[1]))
const sptjm = computed(() => {
  const [dari, sampai] = rentangS.value
  const awalIso = `${kas.tahun}-${String(dari + 1).padStart(2, '0')}-01`
  const dalam = (r) => r.tanggal >= awalIso && r.tanggal <= tglS.value
  const jml = (jenis) => kas.baris.filter((r) => r.jenis === jenis && dalam(r)).reduce((s, r) => s + r.bank + r.tunai, 0)
  const { terima } = penerimaanDana(kas.kas)
  const terimaS = terima.slice(dari, sampai + 1).reduce((s, x) => s + x, 0)
  const awal = dari === 0 ? jml('saldo_awal') : saldoSampai(kas.baris, akhirBulanIso(kas.tahun, dari - 1), 'bku')
  const t = [[dari === 0 ? 'Sisa dana tahun anggaran sebelumnya' : 'Sisa dana Semester I', awal], ['Penerimaan Dana BOSP Reguler', terimaS], ['Jasa giro / bunga bank & pengembalian', jml('bunga') + jml('pengembalian')]]
  const item = itemLunas(belanja.daftar).filter((i) => i.bulan >= dari && i.bulan <= sampai)
  const b = KELOMPOK_BELANJA.map((k) => [k.kode, k.nama, item.filter((i) => String(i.kode_rekening || '').startsWith(k.kode)).reduce((s, i) => s + (i.jumlah || 0), 0)]).filter(([, , v]) => v)
  const lain = -(jml('pajak_bunga') + jml('biaya_bank') + jml('lainnya_keluar'))
  if (lain) b.push(['—', 'Pajak bunga, biaya bank & pengeluaran lain', lain])
  const total = (arr, i) => arr.reduce((s, x) => s + (Number(x[i]) || 0), 0)
  return { terima: t, belanja: b, sisa: total(t, 1) - total(b, 2) }
})

const cetak = ref('')
async function excel(jenis) {
  try {
    if (jenis === 'nota') await eksporExcel({ judul: `BKU per Nota ${periode.value}`, namaBerkas: `BKU per Nota ${periode.value}`, baris: barisNota.value, kolom: kolomExcel(kolomNota) })
    if (jenis === 'bank') await eksporExcel({ judul: `Buku Simpanan Bank ${periode.value}`, namaBerkas: `Buku Simpanan Bank ${periode.value}`, baris: barisBank.value, kolom: kolomExcel(kolomBank) })
    if (jenis === 'spj') await eksporExcel({ judul: `SPJ Belanja Dana BOS ${periode.value}`, namaBerkas: `SPJ Belanja BOS ${periode.value}`, baris: barisSpj.value, kolom: kolomExcel(kolomSpj) })
  } catch (e) { notif.kabari(e.message, 'galat') }
}

const dokumen = computed(() => [
  { kunci: 'nota', judul: 'BKU per Nota', ket: `${barisNota.value.length - 1} nota/BNU bulan ini, lengkap dengan terbilang.`, ikon: 'BookOpenText', warna: 'ikon-chip', excel: true },
  { kunci: 'bank', judul: 'Buku Simpanan Bank', ket: `Mutasi rekening Dana BOSP: ${barisBank.value.length - 1} baris, saldo akhir ${rupiah(rb.value.saldo_bank)}.`, ikon: 'Landmark', warna: 'ikon-chip-tosca', excel: true },
  { kunci: 'spj', judul: 'SPJ Belanja Dana BOS', ket: 'Anggaran, SPJ s.d. bulan lalu, bulan ini, s.d. bulan ini, dan sisa per rekening.', ikon: 'FileCheck', warna: 'ikon-chip-kuning', excel: true },
])
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-3" data-tur="pemdalain-bulan">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="CalendarDays" :ukuran="19" /></span>
      <select v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan laporan"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }} {{ kas.tahun }}</option></select>
      <span class="text-xs text-slate-500">Saldo awal <b class="angka">{{ rupiah(rb.saldo_awal) }}</b> · saldo akhir <b class="angka">{{ rupiah(rb.saldo_akhir) }}</b></span>
    </div>

    <div class="grid gap-3 md:grid-cols-3" data-tur="pemdalain-dokumen">
      <div v-for="d in dokumen" :key="d.kunci" class="kartu flex flex-col p-4">
        <div class="flex items-start gap-3">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', d.warna]"><Ikon :nama="d.ikon" :ukuran="21" /></span>
          <div class="min-w-0 flex-1"><h3 class="font-bold leading-tight">{{ d.judul }}</h3><p class="mt-1 text-xs text-slate-500">{{ d.ket }}</p></div>
        </div>
        <div class="mt-auto flex gap-2 pt-3">
          <button class="tombol-garis flex-1" @click="cetak = d.kunci"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button>
          <button class="tombol-garis" :aria-label="`Excel ${d.judul}`" @click="excel(d.kunci)"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /></button>
        </div>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <!-- STS -->
      <section class="kartu space-y-3 p-4 sm:p-5" data-tur="pemdalain-sts">
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-sukses"><Ikon nama="Banknote" :ukuran="19" /></span>
          <div class="flex-1"><h3 class="font-bold">Surat Tanda Setoran (STS)</h3><p class="text-xs text-slate-500">Setoran ke Kas Daerah: pengembalian, jasa giro, temuan.</p></div>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <input v-model="sts.nomor" class="masukan py-1.5" placeholder="Nomor STS" aria-label="Nomor STS" />
          <input v-model="sts.tanggal" type="date" class="masukan py-1.5" aria-label="Tanggal setor" />
          <input v-model="sts.bank" class="masukan py-1.5 sm:col-span-2" placeholder="Disetor ke" aria-label="Disetor ke" />
          <input v-model="sts.rekening" class="masukan kode py-1.5" placeholder="No. rekening tujuan" aria-label="Rekening tujuan" />
          <input v-model="sts.keterangan" class="masukan py-1.5" placeholder="Keterangan" aria-label="Keterangan STS" />
        </div>
        <div v-for="(r, i) in sts.baris" :key="i" class="flex flex-wrap gap-2">
          <input v-model="r.kode" class="masukan kode w-32 py-1.5 text-xs" placeholder="Kode rek." :aria-label="`Kode rekening ${i + 1}`" />
          <input v-model="r.uraian" class="masukan min-w-[8rem] flex-1 py-1.5 text-sm" placeholder="Uraian" :aria-label="`Uraian ${i + 1}`" />
          <InputAngka v-model="r.nilai" class="masukan angka w-32 py-1.5 text-sm" :aria-label="`Jumlah ${i + 1}`" />
          <button class="text-slate-400 hover:text-rose-600" :aria-label="`Hapus baris ${i + 1}`" @click="sts.baris.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="sts.baris.push({ kode: '', uraian: '', nilai: 0 })"><Ikon nama="Plus" :ukuran="14" class="text-biru" /> Baris</button>
          <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="isiBunga"><Ikon nama="Percent" :ukuran="14" class="text-[#22A08D]" /> Isi jasa giro {{ NAMA_BULAN[bulan] }}</button>
          <button class="tombol-utama ml-auto px-3 py-1.5 text-sm" @click="cetak = 'sts'"><Ikon nama="Printer" :ukuran="16" /> Cetak STS</button>
        </div>
      </section>

      <!-- SPTJM Pemda -->
      <section class="kartu space-y-3 p-4 sm:p-5" data-tur="pemdalain-sptjm">
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="Stamp" :ukuran="19" /></span>
          <div class="flex-1"><h3 class="font-bold">SPTJM Pemda</h3><p class="text-xs text-slate-500">Pernyataan tanggung jawab per semester / tahun (Permendagri 3/2023 Pasal 60).</p></div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="[v, l] in [[1, 'Semester I'], [2, 'Semester II'], [3, 'Setahun']]" :key="v" @click="semester = v"
                  :class="['rounded-xl border px-3 py-1.5 text-sm font-semibold', semester === v ? 'border-[#E3A414] bg-amber-50 text-[#9A6B00] dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700']">{{ l }}</button>
        </div>
        <table class="w-full text-sm">
          <tr v-for="[l, v] in sptjm.terima" :key="l"><td class="py-0.5 text-slate-500">{{ l }}</td><td class="angka text-right">{{ rupiah(v) }}</td></tr>
          <tr v-for="[k, l, v] in sptjm.belanja" :key="k"><td class="py-0.5 text-slate-500">− {{ l }}</td><td class="angka text-right">{{ rupiah(v) }}</td></tr>
          <tr class="border-t border-slate-200 font-bold dark:border-slate-700"><td class="py-1">Sisa dana</td><td class="angka text-right">{{ rupiah(sptjm.sisa) }}</td></tr>
        </table>
        <button class="tombol-utama w-full" @click="cetak = 'sptjm'"><Ikon nama="Printer" :ukuran="16" /> Cetak SPTJM {{ judulS }}</button>
      </section>
    </div>

    <CetakBuku v-if="cetak === 'nota'" judul="Buku Kas Umum per Nota" :subjudul="`Dana BOSP Reguler — Bulan ${periode}`" :kolom="kolomNota" :baris="barisNota" :tanggal="tglAkhir" excel kecil :identitas="IDENTITAS"
               :ringkasan="[['Saldo awal bulan', rb.saldo_awal], ['Penerimaan', rb.masuk], ['Pengeluaran', rb.keluar], ['Saldo akhir bulan', rb.saldo_akhir]]" @excel="excel('nota')" @tutup="cetak = ''" />
    <CetakBuku v-if="cetak === 'bank'" judul="Buku Simpanan Bank" :subjudul="`Rekening Dana BOSP Reguler — Bulan ${periode}`" :kolom="kolomBank" :baris="barisBank" :tanggal="tglAkhir" excel :identitas="IDENTITAS"
               :ringkasan="[['Saldo bank akhir bulan', rb.saldo_bank]]" @excel="excel('bank')" @tutup="cetak = ''" />
    <CetakBuku v-if="cetak === 'spj'" judul="Surat Pertanggungjawaban (SPJ) Belanja Dana BOS" :subjudul="`Bulan ${periode}`" :kolom="kolomSpj" :baris="barisSpj" :tanggal="tglAkhir" excel :warna-baris="warnaSpj" :identitas="IDENTITAS"
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui,\nKepala Sekolah selaku Penanggung Jawab' }" @excel="excel('spj')" @tutup="cetak = ''" />
    <CetakSurat v-if="cetak === 'sts'" :judul="`STS ${sts.nomor || ''}`.trim()" @tutup="cetak = ''">
      <template #default="{ profil, pejabat }"><DokSts :profil="profil" :sts="sts" :kepsek="pejabat('kepala_sekolah', sts.tanggal)" :bendahara="pejabat('bendahara_bosp', sts.tanggal)" /></template>
    </CetakSurat>
    <CetakSurat v-if="cetak === 'sptjm'" :judul="`SPTJM Pemda ${judulS}`" @tutup="cetak = ''">
      <template #default="{ profil, pejabat }"><DokSptjmPemda :profil="profil" :kepsek="pejabat('kepala_sekolah', tglS)" :periode="judulS" :tanggal="tglS" :terima="sptjm.terima" :belanja="sptjm.belanja" :sisa="sptjm.sisa" /></template>
    </CetakSurat>
  </div>
</template>
