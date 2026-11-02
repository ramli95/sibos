<script setup>
// Rekonsiliasi ARKAS – SIMAKDA – Bank (Fase 8): saldo akhir bulan menurut SIBOS dibandingkan dengan saldo
// yang tampil di ARKAS, SIMAKDA, dan rekening koran; centang transaksi yang sudah diinput ke ARKAS/SIMAKDA.
import InputAngka from '@/components/InputAngka.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatSemua, simpanSatu } from '@/services/catatan'
import { tandaiInput } from '@/services/belanja'
import { rekonBulan, idBulan } from '@/utils/rekonsiliasi'
import { rupiah, rupiahRingkas, tanggalPendek, keIso, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const kas = useKas()
const belanja = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()
const kini = new Date()
const bulan = ref(kini.getFullYear() === kas.tahun ? Math.max(0, kini.getMonth() - (kini.getDate() <= 10 ? 1 : 0)) : 11)
const dokRekon = ref([])
onMounted(async () => { dokRekon.value = await muatSemua('rekonsiliasi').catch(() => []) })

const rekonDari = (i) => dokRekon.value.find((d) => d.id === idBulan(kas.tahun, i)) || null
const semua = computed(() => NAMA_BULAN.map((n, i) => ({ nama: n, i, ...rekonBulan({ baris: kas.baris, belanja: belanja.daftar, koran: kas.koran, rekon: rekonDari(i), tahun: kas.tahun, bulan: i }) })))
const r = computed(() => semua.value[bulan.value])

// Isian saldo ARKAS & SIMAKDA
const isi = ref({ saldo_arkas: '', saldo_simakda: '', catatan: '' })
watch([bulan, dokRekon], () => { const d = rekonDari(bulan.value); isi.value = { saldo_arkas: d?.saldo_arkas ?? '', saldo_simakda: d?.saldo_simakda ?? '', catatan: d?.catatan || '' } }, { immediate: true })
async function simpan() {
  try {
    const id = idBulan(kas.tahun, bulan.value)
    const data = { tahun: kas.tahun, bulan: id, saldo_arkas: isi.value.saldo_arkas === '' ? null : Number(isi.value.saldo_arkas), saldo_simakda: isi.value.saldo_simakda === '' ? null : Number(isi.value.saldo_simakda), catatan: isi.value.catatan, saldo_sibos: r.value.saldo.bku }
    await simpanSatu('rekonsiliasi', id, data, `Rekonsiliasi ${NAMA_BULAN[bulan.value]} ${kas.tahun}: ARKAS ${data.saldo_arkas ?? '-'}, SIMAKDA ${data.saldo_simakda ?? '-'}`)
    dokRekon.value = [...dokRekon.value.filter((d) => d.id !== id), { id, ...data }]
    notif.kabari('Rekonsiliasi disimpan.')
  } catch (e) { notif.kabari(e.code === 'permission-denied' ? 'Ditolak: perbarui Firestore Rules Fase 8.' : e.message, 'galat') }
}

// Centang input per transaksi
const sibuk = ref('')
async function tandai(daftar, jenis, sudah) {
  if (!daftar.length) return
  sibuk.value = jenis
  try {
    const baru = await tandaiInput(daftar, jenis, sudah ? keIso() : '')
    baru.forEach((b) => belanja.ganti(b))
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
const kartu = computed(() => [
  { k: 'SIBOS (BKU)', n: r.value.saldo.bku, s: `Bank ${rupiahRingkas(r.value.saldo.bank)} · Tunai ${rupiahRingkas(r.value.saldo.tunai)}`, ikon: 'BookOpenText', warna: 'ikon-chip', sel: null },
  { k: 'ARKAS', n: r.value.arkas, s: 'Saldo akhir di BKU ARKAS', ikon: 'ClipboardList', warna: 'ikon-chip-kuning', sel: r.value.selisih.arkas },
  { k: 'SIMAKDA', n: r.value.simakda, s: 'Saldo akhir di SIMAKDA', ikon: 'Landmark', warna: 'ikon-chip-tosca', sel: r.value.selisih.simakda },
  { k: 'Rekening koran', n: r.value.koran, s: 'Dibanding saldo bank BKU', ikon: 'FileSearch', warna: 'ikon-chip-sukses', sel: r.value.selisih.koran },
])
const NADA = { cocok: 'bg-emerald-500', selisih: 'bg-amber-500', belum: 'bg-slate-300 dark:bg-slate-600' }
</script>

<template>
  <div class="space-y-5">
    <!-- 12 bulan -->
    <div class="kartu p-3" data-tur="rekon-bulan">
      <div class="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        <button v-for="m in semua" :key="m.i" @click="bulan = m.i"
                :class="['flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition', bulan === m.i ? 'bg-biru text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-slate-800']">
          {{ m.nama.slice(0, 3) }}<span :class="['h-2 w-2 rounded-full', NADA[m.status]]" />
        </button>
      </div>
      <p class="mt-2 flex flex-wrap gap-x-4 text-[11px] text-slate-500"><span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Cocok & semua sudah diinput</span><span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Ada selisih / belum diinput</span><span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300" />Belum dicek</span></p>
    </div>

    <!-- Perbandingan saldo -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tur="rekon-saldo">
      <div v-for="x in kartu" :key="x.k" class="kartu p-4">
        <div class="flex items-center gap-2"><span :class="['grid h-9 w-9 place-items-center rounded-xl', x.warna]"><Ikon :nama="x.ikon" :ukuran="17" /></span><b class="text-sm">{{ x.k }}</b></div>
        <p class="angka mt-2 whitespace-nowrap text-[15px] font-extrabold sm:text-lg">{{ x.n == null ? '—' : rupiah(x.n) }}</p>
        <p class="text-[11px] text-slate-500">{{ x.s }}</p>
        <p v-if="x.sel != null" :class="['mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold', x.sel === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300']">
          <Ikon :nama="x.sel === 0 ? 'CircleCheck' : 'TriangleAlert'" :ukuran="13" /> {{ x.sel === 0 ? 'Cocok' : `Selisih ${rupiah(x.sel)}` }}</p>
      </div>
    </div>

    <section v-if="auth.isAdmin" class="kartu grid gap-3 p-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
      <div><label class="label" for="r-arkas">Saldo akhir ARKAS {{ NAMA_BULAN[bulan] }}</label><InputAngka id="r-arkas" v-model="isi.saldo_arkas" class="masukan angka" placeholder="dari BKU ARKAS" /></div>
      <div><label class="label" for="r-simakda">Saldo akhir SIMAKDA</label><InputAngka id="r-simakda" v-model="isi.saldo_simakda" class="masukan angka" placeholder="dari SIMAKDA" /></div>
      <div><label class="label" for="r-cat">Catatan selisih</label><input id="r-cat" v-model="isi.catatan" class="masukan" placeholder="mis. bunga Oktober belum dicatat di SIMAKDA" /></div>
      <button class="tombol-utama" @click="simpan"><Ikon nama="Save" :ukuran="17" /> Simpan</button>
    </section>

    <!-- Status input transaksi -->
    <section class="kartu overflow-hidden" data-tur="rekon-input">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="ListChecks" :ukuran="19" /></span>
        <div class="min-w-0 flex-1"><h2 class="font-bold">Transaksi lunas {{ NAMA_BULAN[bulan] }} {{ kas.tahun }}</h2>
          <p class="text-xs text-slate-500">{{ r.transaksi.length }} transaksi · belum ARKAS <b>{{ r.belumArkas }}</b> · belum SIMAKDA <b>{{ r.belumSimakda }}</b></p></div>
        <template v-if="auth.isAdmin && r.transaksi.length">
          <button class="tombol-garis px-3 py-1.5 text-xs" :disabled="!!sibuk || !r.belumArkas" @click="tandai(r.transaksi.filter((b) => !b.input_arkas), 'arkas', true)"><Ikon :nama="sibuk === 'arkas' ? 'RefreshCw' : 'CopyCheck'" :ukuran="14" :class="['text-[#B7820A]', sibuk === 'arkas' && 'animate-spin']" /> Semua ARKAS</button>
          <button class="tombol-garis px-3 py-1.5 text-xs" :disabled="!!sibuk || !r.belumSimakda" @click="tandai(r.transaksi.filter((b) => !b.input_simakda), 'simakda', true)"><Ikon :nama="sibuk === 'simakda' ? 'RefreshCw' : 'CopyCheck'" :ukuran="14" :class="['text-[#167A6B]', sibuk === 'simakda' && 'animate-spin']" /> Semua SIMAKDA</button>
        </template>
      </div>
      <p v-if="!r.transaksi.length" class="p-8 text-center text-sm text-slate-500">Tidak ada transaksi lunas bulan ini.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[620px] text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Tanggal</th><th class="px-3 py-2.5 text-left">Transaksi</th><th class="px-3 py-2.5 text-left">BNU</th><th class="px-3 py-2.5 text-right">Nilai</th>
            <th class="px-3 py-2.5 text-center">ARKAS</th><th class="px-3 py-2.5 text-center">SIMAKDA</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="b in r.transaksi" :key="b.id">
              <td class="whitespace-nowrap px-3 py-2 text-xs">{{ tanggalPendek(b.tgl_lunas) }}</td>
              <td class="px-3 py-2"><RouterLink :to="`/belanja/lihat/${b.id}`" class="font-semibold hover:text-biru">{{ b.nama_pekerjaan }}</RouterLink></td>
              <td class="kode px-3 py-2 text-xs">{{ Object.values(b.bnu || {}).filter(Boolean).join(', ') || '—' }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ rupiah(b.total, { tanpaRp: true }) }}</td>
              <td v-for="j in ['arkas', 'simakda']" :key="j" class="px-3 py-2 text-center">
                <button :disabled="!auth.isAdmin || !!sibuk" :aria-label="`${b.nama_pekerjaan} sudah diinput ke ${j.toUpperCase()}`" :title="b[`input_${j}`] ? `Diinput ${tanggalPendek(b[`input_${j}`])}` : 'Belum diinput'" @click="tandai([b], j, !b[`input_${j}`])"
                        :class="['inline-grid h-7 w-7 place-items-center rounded-lg transition', b[`input_${j}`] ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-slate-300 hover:border-emerald-500 dark:border-slate-600']">
                  <Ikon nama="Check" :ukuran="15" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <p class="flex items-start gap-2 text-xs text-slate-500"><Ikon nama="Info" :ukuran="14" class="mt-0.5 shrink-0" /> Saldo rekening koran diambil dari Buku Kas → Rekening Koran. Selisih yang umum: bunga/pajak bunga atau biaya bank yang belum dicatat, dan pajak yang belum disetor.</p>
  </div>
</template>
