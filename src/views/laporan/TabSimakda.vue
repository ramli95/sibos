<script setup>
// Bantu salin ke SIMAKDA (input manual): satu baris per BNU (kegiatan + rekening) dengan tanggal, uraian,
// penyedia, nilai, dan pajak; bisa diunduh Excel atau disalin per baris.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { barisSimakda } from '@/utils/laporan'
import { JENIS_KOLOM_PAJAK } from '@/utils/bku'
import { rupiah, tanggalPendek, NAMA_BULAN } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'

const kas = useKas()
const belanja = useBelanja()
const notif = useNotifikasi()

const bulan = ref(new Date().getFullYear() === kas.tahun ? new Date().getMonth() : '')
const penerimaan = ref(true)
const baris = computed(() => barisSimakda({ belanja: belanja.daftar, kas: kas.kas, bulan: bulan.value === '' ? null : bulan.value, sertakanPenerimaan: penerimaan.value }))
const tanpaBnu = computed(() => baris.value.filter((r) => r.jenis === 'Belanja' && !r.bnu).length)
const jml = (k) => baris.value.filter((r) => r.jenis === 'Belanja').reduce((s, r) => s + (r[k] || 0), 0)
const disalin = ref('')

const KOLOM = [
  { judul: 'Tanggal', nilai: (r) => r.tanggal, jenis: 'tanggal', lebar: 12 },
  { judul: 'No. Bukti (BNU)', nilai: (r) => r.bnu, lebar: 14 },
  { judul: 'Jenis', nilai: (r) => r.jenis, lebar: 12 },
  { judul: 'Kode Kegiatan', nilai: (r) => r.kode_kegiatan, lebar: 13 },
  { judul: 'Kode Rekening', nilai: (r) => r.kode_rekening, lebar: 19 },
  { judul: 'Uraian', nilai: (r) => r.uraian, lebar: 55 },
  { judul: 'Penyedia/Penerima', nilai: (r) => r.penyedia, lebar: 28 },
  { judul: 'NPWP', nilai: (r) => r.npwp, lebar: 22 },
  { judul: 'Nilai (Rp)', nilai: (r) => r.nilai, jenis: 'uang', lebar: 16 },
  ...JENIS_KOLOM_PAJAK.map((j) => ({ judul: j, nilai: (r) => r[j] || 0, jenis: 'uang', lebar: 13 })),
  { judul: 'Cara Bayar', nilai: (r) => (r.cara_bayar === 'tunai' ? 'Tunai' : 'Bank/Non-tunai'), lebar: 14 },
  { judul: 'No. Kwitansi/Invoice', nilai: (r) => r.no_bukti, lebar: 24 },
]
async function excel() {
  const label = bulan.value === '' ? `TA ${kas.tahun}` : `${NAMA_BULAN[bulan.value]} ${kas.tahun}`
  try { await eksporExcel({ judul: `Bantu Salin SIMAKDA ${label}`, namaBerkas: `SIMAKDA ${label}`, baris: baris.value, kolom: KOLOM }) } catch (e) { notif.kabari(e.message, 'galat') }
}
async function salin(r) {
  const teks = [tanggalPendek(r.tanggal), r.bnu, r.kode_kegiatan, r.kode_rekening, r.uraian, r.penyedia, r.nilai, ...JENIS_KOLOM_PAJAK.map((j) => r[j] || 0)].join('\t')
  try { await navigator.clipboard.writeText(teks); disalin.value = r.id; setTimeout(() => (disalin.value === r.id ? (disalin.value = '') : null), 1600) } catch { notif.kabari('Peramban menolak menyalin. Gunakan Excel.', 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="simakda-pilihan">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="FileSpreadsheet" :ukuran="19" /></span>
      <select v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan"><option value="">Setahun</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <label class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"><input v-model="penerimaan" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Sertakan penerimaan & bunga</label>
      <button class="tombol-utama ml-auto" @click="excel"><Ikon nama="FileDown" :ukuran="17" /> Unduh Excel</button>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="kartu p-4"><p class="text-xs text-slate-500">Baris belanja (per BNU)</p><p class="angka text-2xl font-extrabold">{{ baris.filter((r) => r.jenis === 'Belanja').length }}</p></div>
      <div class="kartu p-4"><p class="text-xs text-slate-500">Jumlah belanja</p><p class="angka text-2xl font-extrabold">{{ rupiah(jml('nilai')) }}</p></div>
      <div :class="['kartu p-4', tanpaBnu && 'ring-2 ring-amber-400']"><p class="text-xs text-slate-500">Belum ada BNU</p><p :class="['angka text-2xl font-extrabold', tanpaBnu ? 'text-amber-600' : 'text-emerald-600']">{{ tanpaBnu }}</p><p v-if="tanpaBnu" class="text-xs text-slate-500">Isi BNU di Buku Kas → BKU agar urutan sama dengan ARKAS.</p></div>
    </div>

    <div class="kartu flex items-start gap-3 p-4 text-sm text-slate-600 dark:text-slate-300">
      <Ikon nama="Lightbulb" class="mt-0.5 shrink-0 text-[#E3A414]" />
      <span>Urutan kolom mengikuti isian SIMAKDA. Tekan <b>Salin</b> pada satu baris untuk menyalin isinya (dipisah Tab), lalu tempel di SIMAKDA atau lembar kerja. Pajak dicantumkan pada baris BNU pertama setiap transaksi agar tidak terhitung ganda.</span>
    </div>

    <section class="kartu overflow-hidden" data-tur="simakda-tabel">
      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Tanggal</th><th class="px-3 py-2.5 text-left">BNU</th><th class="px-3 py-2.5 text-left">Kegiatan / Rekening</th><th class="px-3 py-2.5 text-left">Uraian</th>
            <th class="px-3 py-2.5 text-right">Nilai</th><th class="px-3 py-2.5 text-right">Pajak</th><th class="px-3 py-2.5" />
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="r in baris" :key="r.id" :class="['hover:bg-slate-50 dark:hover:bg-slate-800/40', r.jenis !== 'Belanja' && 'bg-sky-50/50 dark:bg-sky-950/20']">
              <td class="whitespace-nowrap px-3 py-2">{{ tanggalPendek(r.tanggal) }}</td>
              <td class="kode whitespace-nowrap px-3 py-2 text-xs"><span v-if="r.bnu">{{ r.bnu }}</span><span v-else-if="r.jenis === 'Belanja'" class="lencana bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">kosong</span></td>
              <td class="kode whitespace-nowrap px-3 py-2 text-xs">{{ r.kode_kegiatan }}<br />{{ r.kode_rekening }}</td>
              <td class="px-3 py-2"><p class="line-clamp-2">{{ r.uraian }}</p><p v-if="r.penyedia" class="text-xs text-slate-500">{{ r.penyedia }}</p></td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right font-semibold">{{ rupiah(r.nilai, { tanpaRp: true }) }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-right text-xs"><template v-for="j in JENIS_KOLOM_PAJAK" :key="j"><span v-if="r[j]" class="block">{{ j }} {{ rupiah(r[j], { tanpaRp: true }) }}</span></template></td>
              <td class="px-3 py-2"><button class="tombol-garis px-2.5 py-1.5 text-xs" @click="salin(r)"><Ikon :nama="disalin === r.id ? 'Check' : 'Copy'" :ukuran="14" :class="disalin === r.id ? 'text-emerald-600' : 'text-biru'" /> {{ disalin === r.id ? 'Tersalin' : 'Salin' }}</button></td>
            </tr>
            <tr v-if="!baris.length"><td colspan="7" class="px-3 py-8 text-center text-slate-500">Tidak ada baris pada periode ini.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        <div v-for="r in baris" :key="r.id" class="flex items-start gap-3 p-3">
          <div class="min-w-0 flex-1">
            <p class="kode text-xs text-slate-500">{{ tanggalPendek(r.tanggal) }} · {{ r.bnu || 'tanpa BNU' }} · {{ r.kode_rekening }}</p>
            <p class="line-clamp-2 text-sm">{{ r.uraian }}</p>
            <p class="angka text-sm font-bold">{{ rupiah(r.nilai) }}</p>
          </div>
          <button class="tombol-garis px-2.5 py-1.5" :aria-label="`Salin ${r.uraian}`" @click="salin(r)"><Ikon :nama="disalin === r.id ? 'Check' : 'Copy'" :ukuran="15" /></button>
        </div>
      </div>
    </section>
  </div>
</template>
