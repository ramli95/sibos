<script setup>
// Buku Pembantu Pajak: penerimaan (pungut/potong) dan penyetoran per jenis pajak; tanggal pungut & setor terpisah.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useNotifikasi } from '@/stores/notifikasi'
import { bukuPajak, JENIS_KOLOM_PAJAK } from '@/utils/bku'
import { rupiah, rupiahRingkas, tanggalPendek, NAMA_BULAN, dariIso } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const kas = useKas()
const notif = useNotifikasi()
const bulan = ref('')
const mitra = ref(false)
const semua = computed(() => bukuPajak(kas.kewajiban, { termasukMitra: mitra.value }))
const awalBulan = computed(() => (bulan.value === '' ? null : `${kas.tahun}-${String(Number(bulan.value) + 1).padStart(2, '0')}-01`))
const saldoAwal = computed(() => (awalBulan.value ? semua.value.filter((r) => r.tanggal < awalBulan.value).reduce((s, r) => s + r.terima - r.setor, 0) : 0))
const baris = computed(() => (bulan.value === '' ? semua.value : semua.value.filter((r) => dariIso(r.tanggal)?.getMonth() === Number(bulan.value))))
const jml = (k) => baris.value.reduce((s, r) => s + (r[k] || 0), 0)
const saldoAkhir = computed(() => saldoAwal.value + jml('terima') - jml('setor'))
const statistik = computed(() => [
  { judul: 'Saldo awal', nilai: rupiahRingkas(saldoAwal.value), sub: rupiah(saldoAwal.value), ikon: 'PiggyBank', nada: 'gelap', ringkas: true },
  { judul: 'Diterima (pungut/potong)', nilai: rupiahRingkas(jml('terima')), sub: rupiah(jml('terima')), ikon: 'ArrowDownLeft', nada: 'primer', ringkas: true },
  { judul: 'Disetor', nilai: rupiahRingkas(jml('setor')), sub: rupiah(jml('setor')), ikon: 'ArrowUpRight', nada: 'primer', ringkas: true },
  { judul: 'Saldo pajak', nilai: rupiahRingkas(saldoAkhir.value), sub: rupiah(saldoAkhir.value), ikon: 'Scale', nada: saldoAkhir.value ? 'peringatan' : 'sukses', ringkas: true },
])

const periode = computed(() => (bulan.value === '' ? `Tahun Anggaran ${kas.tahun}` : `Bulan ${NAMA_BULAN[bulan.value]} ${kas.tahun}`))
const tglAkhir = computed(() => (bulan.value === '' ? `${kas.tahun}-12-31` : new Date(kas.tahun, Number(bulan.value) + 1, 0).toISOString().slice(0, 10)))
const kolomCetak = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2cm', rata: 'tengah' },
  { judul: 'No. Bukti', nilai: (r) => r.bnu, lebar: '2cm', kode: true },
  { judul: 'Uraian', nilai: (r) => r.uraian },
  ...JENIS_KOLOM_PAJAK.map((j) => ({ judul: j, nilai: (r) => r[j] || 0, lebar: '2cm', uang: true })),
  { judul: 'Penerimaan', nilai: (r) => r.terima, lebar: '2.4cm', uang: true, jumlah: true },
  { judul: 'Pengeluaran', nilai: (r) => r.setor, lebar: '2.4cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (r) => r.saldo, lebar: '2.4cm', uang: true },
]
const cetak = ref(false)
async function excel() {
  try {
    await eksporExcel({ judul: `Buku Pembantu Pajak ${periode.value}`, namaBerkas: `Buku Pembantu Pajak ${periode.value}`, baris: baris.value,
      kolom: kolomCetak.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : k.judul === 'Uraian' ? 60 : 14, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" />
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <select v-model="bulan" class="masukan w-auto py-2.5" aria-label="Bulan"><option value="">Setahun</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <label class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"><input v-model="mitra" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Tampilkan pajak SIPLah (terima-setor)</label>
      <div class="ml-auto flex gap-2">
        <button class="tombol-garis" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> <span class="hidden sm:inline">Excel</span></button>
        <button class="tombol-garis" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Cetak / PDF</span></button>
      </div>
    </div>

    <div class="kartu overflow-hidden">
      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Tanggal</th><th class="px-3 py-2.5 text-left">Bukti</th><th class="px-3 py-2.5 text-left">Uraian</th>
            <th v-for="j in JENIS_KOLOM_PAJAK" :key="j" class="px-3 py-2.5 text-right">{{ j }}</th><th class="px-3 py-2.5 text-right">Saldo</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="bulan !== ''" class="bg-slate-50/60 dark:bg-slate-800/30"><td colspan="3" class="px-3 py-2 font-semibold">Saldo awal</td><td :colspan="JENIS_KOLOM_PAJAK.length" /><td class="angka px-3 py-2 text-right font-semibold">{{ rupiah(saldoAwal, { tanpaRp: true }) }}</td></tr>
            <tr v-for="r in baris" :key="r.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td class="whitespace-nowrap px-3 py-2">{{ tanggalPendek(r.tanggal) }}</td><td class="kode whitespace-nowrap px-3 py-2 text-xs">{{ r.bnu }}</td>
              <td class="px-3 py-2"><span :class="['mr-1.5 inline-block h-2 w-2 rounded-full', r.arah === 'terima' ? 'bg-[#E3A414]' : 'bg-[#22A08D]']" />{{ r.uraian }}</td>
              <td v-for="j in JENIS_KOLOM_PAJAK" :key="j" :class="['angka whitespace-nowrap px-3 py-2 text-right', r.arah === 'setor' && r[j] ? 'text-[#167A6C] dark:text-[#5FD3C0]' : '']">{{ r[j] ? (r.arah === 'setor' ? '(' : '') + rupiah(r[j], { tanpaRp: true }) + (r.arah === 'setor' ? ')' : '') : '' }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right font-semibold">{{ rupiah(r.saldo, { tanpaRp: true }) }}</td>
            </tr>
            <tr v-if="!baris.length"><td :colspan="JENIS_KOLOM_PAJAK.length + 4" class="px-3 py-8 text-center text-slate-500">Tidak ada pajak pada periode ini.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        <div v-for="r in baris" :key="r.id" class="flex items-start gap-3 p-3">
          <span :class="['mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', r.arah === 'terima' ? 'ikon-chip-kuning' : 'ikon-chip-tosca']"><Ikon :nama="r.arah === 'terima' ? 'ArrowDownLeft' : 'ArrowUpRight'" :ukuran="16" /></span>
          <div class="min-w-0 flex-1"><p class="line-clamp-2 text-sm">{{ r.uraian }}</p><p class="text-xs text-slate-500">{{ tanggalPendek(r.tanggal) }}<template v-if="r.bnu"> · {{ r.bnu }}</template> · saldo {{ rupiah(r.saldo) }}</p></div>
          <b :class="['angka shrink-0 text-sm', r.arah === 'setor' && 'text-[#167A6C] dark:text-[#5FD3C0]']">{{ r.arah === 'setor' ? '−' : '+' }}{{ rupiah(r.terima || r.setor) }}</b>
        </div>
        <p v-if="!baris.length" class="p-8 text-center text-sm text-slate-500">Tidak ada pajak pada periode ini.</p>
      </div>
    </div>

    <CetakBuku v-if="cetak" judul="Buku Pembantu Pajak" :subjudul="periode" :kolom="kolomCetak" :baris="baris" :tanggal="tglAkhir" excel kecil
               :ringkasan="[['Saldo awal', saldoAwal], ['Jumlah penerimaan', jml('terima')], ['Jumlah penyetoran', jml('setor')], ['Saldo akhir (pajak belum disetor)', saldoAkhir]]"
               @excel="excel" @tutup="cetak = false" />
  </div>
</template>
