<script setup>
// Halaman publik Informasi Dana BOSP — dibuka tanpa login (tautan/QR di papan pengumuman).
// Isi = ringkasan yang diterbitkan Bendahara (publik/bos), bukan data langsung.
import { ref, computed, onMounted } from 'vue'
import { muatPublik } from '@/services/catatan'
import { rupiah, persen, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import LogoSibos from '@/components/LogoSibos.vue'

const d = ref(null)
const memuat = ref(true)
const galat = ref('')
onMounted(async () => {
  try { d.value = await muatPublik() } catch (e) { galat.value = e.message } finally { memuat.value = false }
})
const kartu = computed(() => (d.value ? [
  { l: 'Dana tersedia', n: d.value.dana_tersedia, ikon: 'PiggyBank', w: 'from-[#1A62E8] to-[#1E3A8A]' },
  { l: 'Dana digunakan', n: d.value.realisasi, ikon: 'ShoppingCart', w: 'from-[#22A08D] to-[#167A6B]' },
  { l: 'Sisa dana', n: d.value.sisa, ikon: 'Landmark', w: 'from-[#E3A414] to-[#B7820A]' },
] : []))
const capaian = computed(() => (d.value?.dana_tersedia ? (d.value.realisasi / d.value.dana_tersedia) * 100 : 0))
const pct = (g) => (g.anggaran ? (g.realisasi / g.anggaran) * 100 : 0)
const lebar = (p) => `${Math.max(0, Math.min(100, p))}%`
</script>

<template>
  <div class="min-h-dvh bg-slate-50 text-slate-800">
    <header class="bg-gradient-to-br from-navy via-[#1F4BB8] to-biru px-4 pb-16 pt-6 text-white">
      <div class="mx-auto flex max-w-3xl items-center gap-3">
        <LogoSibos :ukuran="40" transparan />
        <div class="min-w-0">
          <p class="text-[11px] font-bold tracking-[0.25em] text-amber-300">PAPAN INFORMASI</p>
          <h1 class="text-lg font-extrabold leading-tight sm:text-2xl">Penggunaan Dana BOSP Reguler</h1>
          <p v-if="d" class="truncate text-sm text-blue-100">{{ d.sekolah?.nama }}</p>
        </div>
      </div>
    </header>

    <main class="mx-auto -mt-12 max-w-3xl space-y-4 px-4 pb-10">
      <div v-if="memuat" class="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow"><Ikon nama="RefreshCw" class="mx-auto mb-2 animate-spin text-biru" /> Memuat…</div>
      <div v-else-if="!d" class="rounded-2xl bg-white p-8 text-center shadow">
        <Ikon nama="EyeOff" :ukuran="32" class="mx-auto mb-2 text-slate-400" />
        <p class="font-bold">Informasi belum diterbitkan</p>
        <p class="text-sm text-slate-500">{{ galat || 'Silakan kembali lagi nanti.' }}</p>
      </div>
      <template v-else>
        <div class="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm shadow">
          <Ikon nama="CalendarRange" :ukuran="17" class="text-biru" />
          <b>TA {{ d.tahun }}</b> · {{ d.judul_periode }}
          <span class="ml-auto text-xs text-slate-500">Diperbarui {{ tanggalPanjang(d.diterbitkan) }}</span>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div v-for="k in kartu" :key="k.l" :class="['rounded-2xl bg-gradient-to-br p-4 text-white shadow', k.w]">
            <div class="flex items-center gap-2 text-sm text-white/85"><Ikon :nama="k.ikon" :ukuran="17" /> {{ k.l }}</div>
            <p class="angka mt-1 text-xl font-extrabold">{{ rupiah(k.n) }}</p>
          </div>
        </div>
        <div class="rounded-2xl bg-white p-4 shadow">
          <div class="flex items-center justify-between text-sm"><span class="font-semibold">Capaian penggunaan</span><b class="angka">{{ persen(capaian, 1) }}</b></div>
          <div class="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-gradient-to-r from-[#22A08D] to-[#1A62E8]" :style="{ width: lebar(capaian) }" /></div>
          <p class="mt-2 text-xs text-slate-500">
            <template v-if="d.saldo_awal">Sisa tahun lalu {{ rupiah(d.saldo_awal) }} · </template>
            <template v-if="d.sisa_sebelum">Sisa tahap sebelumnya {{ rupiah(d.sisa_sebelum) }} · </template>
            Diterima periode ini {{ rupiah(d.terima) }} · Pagu setahun {{ rupiah(d.pagu) }}
          </p>
        </div>

        <section class="rounded-2xl bg-white p-4 shadow">
          <h2 class="mb-3 flex items-center gap-2 font-bold"><Ikon nama="Grid3x3" :ukuran="18" class="text-biru" /> Rencana & realisasi per komponen</h2>
          <ul class="space-y-3">
            <li v-for="g in d.komponen" :key="g.kode">
              <div class="flex items-center gap-2 text-sm">
                <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" :style="{ background: g.warna }">{{ g.huruf }}</span>
                <span class="min-w-0 flex-1 truncate">{{ g.nama }}</span>
                <span class="angka text-xs text-slate-500">{{ g.anggaran ? persen(pct(g), 0) : '—' }}</span>
              </div>
              <div class="ml-8 mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full" :style="{ width: lebar(pct(g)), background: g.warna }" /></div>
              <p class="ml-8 mt-0.5 text-xs text-slate-500"><span class="angka">{{ rupiah(g.realisasi) }}</span> dari <span class="angka">{{ rupiah(g.anggaran) }}</span></p>
            </li>
          </ul>
        </section>

        <section class="rounded-2xl border-2 border-dashed border-biru/40 bg-white p-4 text-sm shadow">
          <h2 class="mb-1 flex items-center gap-2 font-bold"><Ikon nama="Megaphone" :ukuran="18" class="text-[#E3A414]" /> Informasi & pengaduan</h2>
          <p class="text-slate-600">{{ d.kontak || 'Sampaikan pertanyaan atau pengaduan kepada Kepala Sekolah atau Komite Sekolah.' }}</p>
          <p v-if="d.kepala_sekolah" class="mt-2 text-xs text-slate-500">Penanggung jawab: {{ d.kepala_sekolah }}, Kepala Sekolah</p>
        </section>
        <p class="text-center text-xs text-slate-400">{{ d.sekolah?.alamat }}<br />Realisasi = belanja yang telah dibayar lunas. Sumber: SIBOS.</p>
      </template>
    </main>
  </div>
</template>
