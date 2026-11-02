<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { pakaiKasLain } from './pakaiKasLain'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { WARNA_POS, STATUS, labelPeriode, jumlah, rincianWa } from '@/utils/kasLain'
import { rupiah, rupiahRingkas, tanggalPendek } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import KirimWaKas from './KirimWaKas.vue'

const router = useRouter()
const auth = useAuth()
const notif = useNotifikasi()
const { posUrut, posAktif, transaksi, tagihan, utang, saldo, namaPos, pasangPosBawaan, orang } = pakaiKasLain()

const bulanIni = new Date().toISOString().slice(0, 7)
const belum = computed(() => tagihan.value.filter((t) => t.status !== 'lunas'))
const piutang = computed(() => utang.value.filter((u) => u.arah === 'piutang' && u.status !== 'lunas'))
const utangKas = computed(() => utang.value.filter((u) => u.arah === 'utang' && u.status !== 'lunas'))
const totalSaldo = computed(() => posUrut.value.reduce((s, p) => s + saldo(p), 0))
const statistik = computed(() => [
  { judul: 'Saldo semua pos', nilai: rupiahRingkas(totalSaldo.value), sub: rupiah(totalSaldo.value), ikon: 'Vault', nada: 'gelap' },
  { judul: 'Tagihan belum lunas', nilai: rupiahRingkas(jumlah(belum.value, 'sisa')), sub: `${new Set(belum.value.map((t) => t.orang?.id || t.orang?.nama)).size} orang · ${belum.value.length} tagihan`, ikon: 'ListTodo', nada: belum.value.length ? 'peringatan' : 'sukses' },
  { judul: 'Piutang belum kembali', nilai: rupiahRingkas(jumlah(piutang.value, 'sisa')), sub: `${piutang.value.length} pinjaman`, ikon: 'HandCoins', nada: 'primer' },
  { judul: 'Utang belum dibayar', nilai: rupiahRingkas(jumlah(utangKas.value, 'sisa')), sub: `${utangKas.value.length} catatan`, ikon: 'Scale', nada: 'primer' },
])

const ringkasPos = computed(() => posAktif.value.map((p) => {
  const bln = transaksi.value.filter((t) => t.pos_id === p.id && String(t.tanggal).startsWith(bulanIni))
  const tg = tagihan.value.filter((t) => t.pos_id === p.id)
  return {
    p, saldo: saldo(p), w: WARNA_POS[p.warna] || WARNA_POS.biru,
    masuk: jumlah(bln.filter((t) => t.jenis === 'masuk')), keluar: jumlah(bln.filter((t) => t.jenis === 'keluar')),
    belum: tg.filter((t) => t.status !== 'lunas').length, total: tg.length,
  }
}))

// Orang dengan sisa tagihan terbesar
const penunggak = computed(() => {
  const m = new Map()
  for (const t of belum.value) {
    const k = t.orang?.id || t.orang?.nama
    const o = m.get(k) || { nama: t.orang?.nama, no: t.orang?.no_wa || orang.value.find((x) => x.id === t.orang?.id)?.no_wa || '', daftar: [], sisa: 0, lewat: false }
    o.daftar.push(t); o.sisa += t.sisa; o.lewat ||= t.lewat
    m.set(k, o)
  }
  return [...m.values()].sort((a, b) => b.sisa - a.sisa)
})
const tampilPenunggak = ref(6)
const wa = ref(null)

const memasang = ref(false)
async function pasang() {
  memasang.value = true
  try { await pasangPosBawaan(); notif.kabari('Pos bawaan terpasang. Ubah nominal & saldo awal di Buku Kas per Pos.') } catch (e) { notif.kabari(e.message, 'galat') } finally { memasang.value = false }
}
</script>

<template>
  <div class="space-y-5">
    <p class="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><Ikon nama="Info" :ukuran="17" class="mt-0.5 shrink-0" />
      <span>Uang yang dikelola bendahara <b>di luar Dana BOSP</b> — arisan, dana sosial, zakat profesi, potongan sertifikasi, komite, dll. Tidak masuk BKU, ARKAS, maupun SIMAKDA.</span></p>

    <div v-if="!posUrut.length" class="kartu flex flex-col items-center gap-3 p-8 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl ikon-chip-kuning"><Ikon nama="WalletCards" :ukuran="26" /></span>
      <h2 class="font-bold">Belum ada pos kas</h2>
      <p class="max-w-md text-sm text-slate-500">Pasang pos bawaan (Uang Arisan, Dana Sosial, Zakat Profesi, Potongan Sertifikasi, Komite) lalu sesuaikan, atau buat pos sendiri di Buku Kas per Pos.</p>
      <div v-if="auth.isAdmin" class="flex flex-wrap justify-center gap-2">
        <button class="tombol-utama" :disabled="memasang" data-tur="kaslain-pasang" @click="pasang"><Ikon :nama="memasang ? 'RefreshCw' : 'Sparkles'" :ukuran="17" :class="memasang && 'animate-spin'" /> Pasang pos bawaan</button>
        <button class="tombol-garis" @click="router.push('/kas-lain/pos')"><Ikon nama="Plus" :ukuran="17" /> Buat pos sendiri</button>
      </div>
    </div>

    <template v-else>
      <GridStat :daftar="statistik" :bisa-klik="false" ringkas data-tur="kaslain-stat" />

      <section>
        <h2 class="mb-2 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"><Ikon nama="WalletCards" :ukuran="16" class="text-biru" /> Saldo per pos</h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-tur="kaslain-pos">
          <button v-for="r in ringkasPos" :key="r.p.id" class="kartu min-w-0 overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-lg" @click="router.push({ path: '/kas-lain/pos', query: { pos: r.p.id } })">
            <div class="h-1.5" :style="{ background: r.w.garis }" />
            <div class="flex items-center gap-3 p-4">
              <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', r.w.chip]"><Ikon :nama="r.p.ikon || 'WalletCards'" :ukuran="21" /></span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-bold">{{ r.p.nama }}</p>
                <p class="angka text-lg font-extrabold" :class="r.saldo < 0 && 'text-rose-600'">{{ rupiah(r.saldo) }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
              <span class="flex items-center gap-1"><Ikon nama="ArrowDownLeft" :ukuran="13" class="text-emerald-600" /> <span class="angka">{{ rupiahRingkas(r.masuk) }}</span></span>
              <span class="flex items-center gap-1"><Ikon nama="ArrowUpRight" :ukuran="13" class="text-rose-600" /> <span class="angka">{{ rupiahRingkas(r.keluar) }}</span></span>
              <span class="text-slate-400">bulan ini</span>
              <span v-if="r.total" class="ml-auto flex items-center gap-1"><Ikon nama="ListTodo" :ukuran="13" :class="r.belum ? 'text-amber-600' : 'text-emerald-600'" /> {{ r.belum ? `${r.belum} belum lunas` : 'semua lunas' }}</span>
            </div>
          </button>
        </div>
      </section>

      <section class="kartu overflow-hidden">
        <header class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip-peringatan"><Ikon nama="BellRing" :ukuran="17" /></span>
          <h2 class="min-w-0 flex-1 font-bold">Belum lunas per orang</h2>
          <button class="tombol-garis px-3 py-1.5 text-xs" @click="router.push('/kas-lain/tagihan')"><Ikon nama="ListTodo" :ukuran="14" /> Semua tagihan</button>
        </header>
        <p v-if="!penunggak.length" class="flex items-center justify-center gap-2 p-6 text-sm text-emerald-600"><Ikon nama="CheckCheck" :ukuran="18" /> Semua tagihan sudah lunas.</p>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="o in penunggak.slice(0, tampilPenunggak)" :key="o.nama" class="flex items-center gap-3 px-4 py-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ (o.nama || '?').charAt(0) }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{{ o.nama }}</p>
              <p class="truncate text-xs text-slate-500">{{ o.daftar.map((t) => `${namaPos(t.pos_id)} ${labelPeriode(t.periode)}`).join(' · ') }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="angka text-sm font-bold text-rose-600">{{ rupiah(o.sisa) }}</p>
              <span v-if="o.lewat" class="lencana bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Lewat tempo</span>
            </div>
            <button v-if="auth.isAdmin" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30" :aria-label="`WhatsApp ${o.nama}`" @click="wa = o"><Ikon nama="MessageCircle" :ukuran="17" /></button>
          </li>
        </ul>
        <button v-if="penunggak.length > tampilPenunggak" class="w-full border-t border-slate-100 py-2 text-xs font-semibold text-biru dark:border-slate-800" @click="tampilPenunggak += 10">Tampilkan lebih banyak ({{ penunggak.length - tampilPenunggak }})</button>
      </section>

      <section v-if="piutang.length || utangKas.length" class="kartu overflow-hidden">
        <header class="flex items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="HandCoins" :ukuran="17" /></span>
          <h2 class="min-w-0 flex-1 font-bold">Utang piutang berjalan</h2>
          <button class="tombol-garis px-3 py-1.5 text-xs" @click="router.push('/kas-lain/utang')"><Ikon nama="ArrowRight" :ukuran="14" /> Buka</button>
        </header>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="u in [...piutang, ...utangKas].slice(0, 6)" :key="u.id" class="flex items-center gap-3 px-4 py-3 text-sm">
            <span :class="['lencana shrink-0', u.arah === 'piutang' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300']">{{ u.arah === 'piutang' ? 'Piutang' : 'Utang' }}</span>
            <span class="min-w-0 flex-1 truncate"><b>{{ u.pihak?.nama }}</b> · {{ u.uraian }}</span>
            <span class="angka shrink-0 font-bold">{{ rupiah(u.sisa) }}</span>
            <span :class="['lencana hidden shrink-0 sm:inline-flex', STATUS[u.status].kelas]">{{ u.jatuh_tempo ? tanggalPendek(u.jatuh_tempo) : STATUS[u.status].label }}</span>
          </li>
        </ul>
      </section>
    </template>

    <KirimWaKas v-if="wa" :nama="wa.nama" :no="wa.no" :jenis="['tagih']" acuan="kas_lain"
                :data="() => ({ nama: wa.nama, rincian: rincianWa(wa.daftar, namaPos), sisa: rupiah(wa.sisa) })" @tutup="wa = null" />
  </div>
</template>
