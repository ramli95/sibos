<script setup>
// Dasbor Uang BOSP Bulanan (Fase 7): saldo, penerimaan, belanja, pajak per bulan; grafik rencana vs realisasi;
// tabel 12 bulan dengan status tutup buku. Sumber: Buku Kas Umum SIBOS.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKas } from '@/stores/kas'
import { useRkas } from '@/stores/rkas'
import { useBelanja } from '@/stores/belanja'
import { ringkasanBulan } from '@/utils/bku'
import { realisasiPerBulan, rencanaPerBulan, rekapRealisasi } from '@/utils/laporan'
import { rupiah, rupiahRingkas, persen, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import GrafikBulanan from '@/components/GrafikBulanan.vue'
import PilihTahun from '@/components/PilihTahun.vue'

const kas = useKas()
const rkas = useRkas()
const belanja = useBelanja()
const router = useRouter()
async function muat(tahun) {
  await kas.muat(tahun ? { tahun } : {})
  if (rkas.tahun !== kas.tahun) await rkas.gantiTahun(kas.tahun); else await rkas.muat()
}
onMounted(() => muat())
const kini = new Date()
const bulan = ref(kini.getFullYear() === kas.tahun ? kini.getMonth() : 11)

const bulanan = computed(() => NAMA_BULAN.map((n, i) => {
  const r = ringkasanBulan(kas.baris, i, kas.tahun)
  const id = `${kas.tahun}-${String(i + 1).padStart(2, '0')}`
  const pajakPungut = kas.kewajiban.filter((p) => String(p.tgl_pungut).startsWith(id) && p.cara !== 'mitra' && p.cara !== 'luar').reduce((s, p) => s + p.nilai, 0)
  const pajakSetor = kas.baris.filter((b) => b.jenis === 'setor_pajak' && String(b.tanggal).startsWith(id)).reduce((s, b) => s - (b.bank + b.tunai), 0)
  return { i, nama: n, ...r, pajakPungut, pajakSetor, tutup: kas.tutupBulan(id)?.status === 'ditutup' }
}))
const b = computed(() => bulanan.value[bulan.value])
const rencana = computed(() => rencanaPerBulan(rkas.uraian))
const realisasi = computed(() => realisasiPerBulan(belanja.daftar))
const komponen = computed(() => rekapRealisasi({ uraian: rkas.uraian, belanja: belanja.daftar, susunan: 'komponen', dari: bulan.value, sampai: bulan.value, nama: rkas.nama }).baris.filter((r) => r.kini).sort((x, y) => y.kini - x.kini).slice(0, 5))

const statistik = computed(() => [
  { judul: `Saldo awal ${NAMA_BULAN[bulan.value]}`, nilai: rupiahRingkas(b.value.saldo_awal), sub: rupiah(b.value.saldo_awal), ikon: 'PiggyBank', nada: 'gelap' },
  { judul: 'Penerimaan', nilai: rupiahRingkas(b.value.penerimaan_dana), sub: `Semua masuk ${rupiah(b.value.masuk)}`, ikon: 'ArrowDownLeft', nada: 'primer' },
  { judul: 'Belanja (lunas)', nilai: rupiahRingkas(b.value.belanja), sub: rencana.value[bulan.value] ? `${persen((b.value.belanja / rencana.value[bulan.value]) * 100, 0)} dari rencana bulan ini` : 'Tanpa rencana bulan ini', ikon: 'ShoppingCart', nada: 'primer' },
  { judul: 'Saldo akhir', nilai: rupiahRingkas(b.value.saldo_akhir), sub: `Bank ${rupiahRingkas(b.value.saldo_bank)} · Tunai ${rupiahRingkas(b.value.saldo_tunai)}`, ikon: 'Landmark', nada: 'primer' },
])
const sisaPajak = computed(() => b.value.pajakPungut - b.value.pajakSetor)
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-3" data-tur="bulanan-pilih">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="CalendarDays" :ukuran="19" /></span>
      <div class="flex gap-1 overflow-x-auto tanpa-penggulir">
        <button v-for="m in bulanan" :key="m.i" @click="bulan = m.i"
                :class="['relative shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold', bulan === m.i ? 'bg-[#22A08D] text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']">
          {{ m.nama.slice(0, 3) }}<span v-if="m.tutup" class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
        </button>
      </div>
      <div class="ml-auto"><PilihTahun id="tahun-bulanan" :model-value="kas.tahun" @update:model-value="muat($event)" /></div>
    </div>

    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" ringkas />

    <div class="grid gap-3 sm:grid-cols-3">
      <div :class="['kartu flex items-center gap-3 p-4', b.tutup ? '' : 'border-l-4 border-l-amber-500']">
        <span :class="['grid h-10 w-10 place-items-center rounded-xl', b.tutup ? 'ikon-chip-sukses' : 'ikon-chip-peringatan']"><Ikon :nama="b.tutup ? 'CalendarCheck' : 'TriangleAlert'" :ukuran="19" /></span>
        <div class="min-w-0 flex-1"><p class="font-bold">{{ b.tutup ? 'Buku sudah ditutup' : 'Buku belum ditutup' }}</p><p class="text-xs text-slate-500">{{ b.jumlah_baris }} baris BKU · {{ b.tanpa_bnu }} tanpa BNU</p></div>
        <button class="text-slate-400" aria-label="Buka tutup buku" @click="router.push('/buku-kas/tutup')"><Ikon nama="ChevronRight" /></button>
      </div>
      <div class="kartu flex items-center gap-3 p-4">
        <span :class="['grid h-10 w-10 place-items-center rounded-xl', sisaPajak > 0 ? 'ikon-chip-peringatan' : 'ikon-chip-kuning']"><Ikon nama="ReceiptText" :ukuran="19" /></span>
        <div class="min-w-0 flex-1"><p class="font-bold">Pajak bulan ini</p><p class="text-xs text-slate-500">Dipungut <span class="angka">{{ rupiah(b.pajakPungut) }}</span> · disetor <span class="angka">{{ rupiah(b.pajakSetor) }}</span></p></div>
      </div>
      <div class="kartu flex items-center gap-3 p-4">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="ArrowUpRight" :ukuran="19" /></span>
        <div class="min-w-0 flex-1"><p class="font-bold">Semua pengeluaran</p><p class="text-xs text-slate-500">Belanja, pajak, biaya bank: <span class="angka">{{ rupiah(b.keluar) }}</span></p></div>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section class="kartu p-4 sm:p-5">
        <h2 class="mb-2 flex items-center gap-2 font-bold"><Ikon nama="ChartColumn" :ukuran="18" class="text-biru" /> Rencana RKAS vs realisasi per bulan</h2>
        <GrafikBulanan :rencana="rencana" :realisasi="realisasi" :tinggi="240" />
      </section>
      <section class="kartu p-4 sm:p-5">
        <h2 class="mb-3 flex items-center gap-2 font-bold"><Ikon nama="Grid3x3" :ukuran="18" class="text-[#E3A414]" /> Komponen terbesar {{ NAMA_BULAN[bulan] }}</h2>
        <p v-if="!komponen.length" class="py-6 text-center text-sm text-slate-500">Belum ada belanja lunas bulan ini.</p>
        <ul class="space-y-2.5">
          <li v-for="k in komponen" :key="k.kode" class="text-sm">
            <div class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" :style="{ background: k.warna }" /><span class="flex-1 truncate">{{ k.nama }}</span><b class="angka">{{ rupiahRingkas(k.kini) }}</b></div>
            <div class="ml-4 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: `${(k.kini / (komponen[0]?.kini || 1)) * 100}%`, background: k.warna }" /></div>
          </li>
        </ul>
      </section>
    </div>

    <!-- 12 bulan -->
    <section class="kartu overflow-hidden">
      <div class="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800"><span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Table2" :ukuran="19" /></span><h2 class="font-bold">Arus uang TA {{ kas.tahun }}</h2></div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Bulan</th><th class="px-3 py-2.5 text-right">Saldo awal</th><th class="px-3 py-2.5 text-right">Masuk</th><th class="px-3 py-2.5 text-right">Keluar</th><th class="px-3 py-2.5 text-right">Saldo akhir</th><th class="px-3 py-2.5 text-center">Tutup</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="m in bulanan" :key="m.i" :class="['cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50', bulan === m.i && 'bg-[#22A08D]/8 font-semibold']" @click="bulan = m.i">
              <td class="px-3 py-2">{{ m.nama }}</td>
              <td class="angka px-3 py-2 text-right text-slate-500">{{ rupiah(m.saldo_awal, { tanpaRp: true }) }}</td>
              <td class="angka px-3 py-2 text-right text-emerald-600">{{ m.masuk ? rupiah(m.masuk, { tanpaRp: true }) : '–' }}</td>
              <td class="angka px-3 py-2 text-right text-rose-600">{{ m.keluar ? rupiah(m.keluar, { tanpaRp: true }) : '–' }}</td>
              <td class="angka px-3 py-2 text-right">{{ rupiah(m.saldo_akhir, { tanpaRp: true }) }}</td>
              <td class="px-3 py-2 text-center"><Ikon :nama="m.tutup ? 'CircleCheck' : 'Minus'" :ukuran="16" :class="['inline', m.tutup ? 'text-emerald-500' : 'text-slate-300']" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
