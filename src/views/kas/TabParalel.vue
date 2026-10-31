<script setup>
// Masa uji paralel: angka SIBOS dibandingkan per bulan dengan ARKAS, SIMAKDA dan rekening koran.
// Selesai bila saldo bank Semester I sama dengan ARKAS & SIMAKDA.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanTutupBuku } from '@/services/kas'
import { ringkasanBulan } from '@/utils/bku'
import { TARGET_SEMESTER_1 } from '@/config/pajak'
import { rupiah, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const kas = useKas()
const auth = useAuth()
const notif = useNotifikasi()
const BLN = [...Array(12).keys()]
const idBln = (m) => `${kas.tahun}-${String(m + 1).padStart(2, '0')}`
const data = computed(() => BLN.map((m) => {
  const r = ringkasanBulan(kas.baris, m, kas.tahun)
  const t = kas.tutupBulan(idBln(m)) || {}
  const k = kas.koran.find((x) => x.id === idBln(m))
  return { m, r, arkas: t.saldo_arkas ?? null, simakda: t.saldo_simakda ?? null, koran: k ? k.saldo_akhir : null, status: t.status }
}))
const s1 = computed(() => {
  const r = data.value[5].r
  const belanja = data.value.slice(0, 6).reduce((s, x) => s + x.r.belanja, 0)
  const terima = data.value.slice(0, 6).reduce((s, x) => s + x.r.penerimaan_dana, 0)
  return { saldo: r.saldo_bank, belanja, terima, arkas: data.value[5].arkas, simakda: data.value[5].simakda, koran: data.value[5].koran }
})
const cocokTarget = computed(() => s1.value.saldo === TARGET_SEMESTER_1 && s1.value.arkas === TARGET_SEMESTER_1 && s1.value.simakda === TARGET_SEMESTER_1)
const ada = (x) => x.r.jumlah_baris || x.arkas != null || x.simakda != null || x.koran != null
const tanda = (v, acuan) => (v == null ? 'kosong' : v === acuan ? 'sama' : 'beda')
const GAYA = { kosong: 'text-slate-400', sama: 'text-emerald-600 dark:text-emerald-400', beda: 'text-rose-600 dark:text-rose-400 font-bold' }

const ubah = ref(null)
function bukaUbah(x) { if (auth.isAdmin) ubah.value = { m: x.m, arkas: x.arkas ?? '', simakda: x.simakda ?? '' } }
async function simpan() {
  const u = ubah.value
  try {
    await simpanTutupBuku(idBln(u.m), { saldo_arkas: u.arkas === '' ? null : Number(u.arkas), saldo_simakda: u.simakda === '' ? null : Number(u.simakda), status: kas.tutupBulan(idBln(u.m))?.status || 'terbuka' },
      `Uji paralel ${NAMA_BULAN[u.m]}: ARKAS ${u.arkas || '-'}, SIMAKDA ${u.simakda || '-'}`)
    await kas.segarkan(); ubah.value = null
  } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <section :class="['relative overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-6', cocokTarget ? 'bg-gradient-to-br from-emerald-600 to-[#167A6C]' : 'bg-gradient-to-br from-navy to-biru']">
      <div class="flex flex-wrap items-start gap-4">
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><Ikon :nama="cocokTarget ? 'BadgeCheck' : 'Target'" :ukuran="26" /></span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-wider text-white/75">Target uji paralel · Semester I {{ kas.tahun }}</p>
          <p class="angka text-2xl font-extrabold sm:text-3xl">{{ rupiah(s1.saldo) }}</p>
          <p class="text-sm text-white/80">Saldo bank SIBOS per 30 Juni · target {{ rupiah(TARGET_SEMESTER_1) }}
            <b v-if="s1.saldo !== TARGET_SEMESTER_1">(selisih {{ rupiah(s1.saldo - TARGET_SEMESTER_1) }})</b></p>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div v-for="[l, v, ok] in [['Penerimaan', s1.terima, null], ['Belanja', s1.belanja, null], ['ARKAS', s1.arkas, s1.arkas === s1.saldo], ['SIMAKDA', s1.simakda, s1.simakda === s1.saldo], ['Rek. koran', s1.koran, s1.koran === s1.saldo]]" :key="l" class="rounded-xl bg-white/12 p-2.5">
          <p class="flex items-center gap-1 text-[11px] text-white/75">{{ l }} <Ikon v-if="ok !== null && v != null" :nama="ok ? 'CircleCheck' : 'CircleX'" :ukuran="12" /></p>
          <p class="angka text-sm font-bold">{{ v == null ? '—' : rupiah(v) }}</p>
        </div>
      </div>
    </section>

    <div class="kartu overflow-hidden">
      <div class="flex items-center gap-2 border-b border-slate-100 p-3.5 dark:border-slate-800">
        <span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="GitCompareArrows" :ukuran="17" /></span>
        <h2 class="flex-1 font-bold">Perbandingan saldo akhir bulan</h2>
        <p class="hidden text-xs text-slate-500 sm:block">Ketuk baris untuk mengisi angka ARKAS/SIMAKDA</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Bulan</th><th class="px-3 py-2.5 text-right">Belanja</th><th class="px-3 py-2.5 text-right">Saldo bank SIBOS</th>
            <th class="px-3 py-2.5 text-right">ARKAS</th><th class="px-3 py-2.5 text-right">SIMAKDA</th><th class="px-3 py-2.5 text-right">Rek. koran</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="x in data.filter(ada)" :key="x.m" :class="['cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40', x.m === 5 && 'bg-[#E3A414]/8']" @click="bukaUbah(x)">
              <td class="whitespace-nowrap px-3 py-2.5 font-semibold"><Ikon v-if="x.status === 'ditutup'" nama="Lock" :ukuran="13" class="mr-1 inline text-emerald-600" />{{ NAMA_BULAN[x.m] }}</td>
              <td class="angka whitespace-nowrap px-3 py-2.5 text-right">{{ rupiah(x.r.belanja, { tanpaRp: true }) }}</td>
              <td class="angka whitespace-nowrap px-3 py-2.5 text-right font-bold">{{ rupiah(x.r.saldo_bank, { tanpaRp: true }) }}</td>
              <td v-for="k in ['arkas', 'simakda', 'koran']" :key="k" :class="['angka whitespace-nowrap px-3 py-2.5 text-right', GAYA[tanda(x[k], x.r.saldo_bank)]]">
                {{ x[k] == null ? '—' : rupiah(x[k], { tanpaRp: true }) }}<span v-if="tanda(x[k], x.r.saldo_bank) === 'beda'" class="block text-[11px]">{{ rupiah(x[k] - x.r.saldo_bank) }}</span></td>
            </tr>
            <tr v-if="!data.some(ada)"><td colspan="6" class="px-3 py-8 text-center text-slate-500">Belum ada transaksi. Mulai dari tab Migrasi 2026.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="text-xs text-slate-500">Hijau = sama dengan saldo bank SIBOS, merah = berbeda (beserta selisihnya). Selama uji paralel, Jurnal Dana BOS tetap dipakai berdampingan sampai semua bulan hijau.</p>

    <div v-if="ubah" class="fixed inset-0 z-50 grid place-items-end bg-slate-900/40 p-0 sm:place-items-center sm:p-4" @click.self="ubah = null">
      <div class="kartu w-full max-w-sm space-y-3 rounded-b-none p-5 sm:rounded-b-2xl">
        <h3 class="flex items-center gap-2 font-bold"><Ikon nama="Pencil" :ukuran="17" class="text-biru" /> Saldo {{ NAMA_BULAN[ubah.m] }} menurut aplikasi lain</h3>
        <div><label class="label" for="up-arkas">ARKAS</label><input id="up-arkas" v-model="ubah.arkas" type="number" class="masukan angka" /></div>
        <div><label class="label" for="up-sim">SIMAKDA</label><input id="up-sim" v-model="ubah.simakda" type="number" class="masukan angka" /></div>
        <div class="flex gap-2"><button class="tombol-utama flex-1" @click="simpan"><Ikon nama="Save" :ukuran="16" /> Simpan</button><button class="tombol-garis" @click="ubah = null">Batal</button></div>
      </div>
    </div>
  </div>
</template>
