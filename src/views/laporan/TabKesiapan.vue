<script setup>
// Skor kesiapan SPJ: dokumen & data 50%, pajak 25%, foto & arsip 25%. Per transaksi, per bulan, setahun.
// Hanya penanda — tidak memblokir simpan, cetak, atau tutup buku.
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { BOBOT_SKOR, ASPEK_SKOR, NADA_SKOR, AMBANG_SKOR } from '@/config/laporan'
import { skorSemua, rataSkor } from '@/utils/skorSpj'
import { bulanBelanja } from '@/utils/laporan'
import { rupiah, tanggalPendek, NAMA_BULAN } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const router = useRouter()
const kas = useKas()
const belanja = useBelanja()
const notif = useNotifikasi()

const skor = computed(() => skorSemua(belanja.daftar, kas.kewajiban))
const lunas = computed(() => belanja.daftar.filter((b) => b.status === 'lunas'))
const total = computed(() => rataSkor(lunas.value, skor.value))
const perBulan = computed(() => NAMA_BULAN.map((n, i) => ({ i, nama: n, ...rataSkor(lunas.value.filter((b) => bulanBelanja(b) === i), skor.value) })))

const bulan = ref('')
const nada = ref('')
const cari = ref('')
const daftar = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return belanja.daftar
    .filter((b) => (bulan.value === '' ? true : bulanBelanja(b) === Number(bulan.value)))
    .filter((b) => !nada.value || skor.value.get(b.id)?.nada === nada.value)
    .filter((b) => !q || `${b.nama_pekerjaan} ${b.rekanan?.nama_usaha || ''}`.toLowerCase().includes(q))
    .map((b) => ({ ...b, skor: skor.value.get(b.id) }))
    .sort((a, b) => (a.skor?.nilai ?? 0) - (b.skor?.nilai ?? 0) || String(a.tgl_lunas || '').localeCompare(String(b.tgl_lunas || '')))
})

// Busur pengukur (setengah lingkaran)
const busur = (n) => { const a = Math.PI * (1 - n / 100); return `M 10 60 A 50 50 0 0 1 ${60 + 50 * Math.cos(a)} ${60 - 50 * Math.sin(a)}` }
const warnaNada = { hijau: '#10b981', kuning: '#f59e0b', merah: '#f43f5e' }

const kolomCetak = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tgl_lunas || r.tgl_pesanan || r.tgl_kegiatan), lebar: '2cm', rata: 'tengah' },
  { judul: 'Transaksi', nilai: (r) => r.nama_pekerjaan },
  { judul: 'Nilai', nilai: (r) => r.total, lebar: '2.6cm', uang: true },
  { judul: 'Skor', nilai: (r) => r.skor?.nilai ?? 0, lebar: '1.3cm', rata: 'tengah' },
  { judul: 'Yang Belum Lengkap', nilai: (r) => (r.skor?.kurang || []).join('; ') || 'Lengkap', lebar: '9cm' },
  { judul: 'Paraf', nilai: () => '', lebar: '1.6cm' },
]
const cetak = ref(false)
const periode = computed(() => (bulan.value === '' ? `Tahun Anggaran ${kas.tahun}` : `Bulan ${NAMA_BULAN[bulan.value]} ${kas.tahun}`))
async function excel() {
  try {
    await eksporExcel({ judul: `Kesiapan SPJ ${periode.value}`, namaBerkas: `Kesiapan SPJ ${periode.value}`, baris: daftar.value,
      kolom: [...kolomCetak.slice(0, 5).map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : /Transaksi|Belum/.test(k.judul) ? 55 : 12, nilai: k.nilai, jenis: k.uang ? 'uang' : k.judul === 'Skor' ? 'angka' : 'teks' })),
        ...Object.keys(BOBOT_SKOR).map((a) => ({ judul: `${ASPEK_SKOR[a].judul} (%)`, lebar: 14, nilai: (r) => Math.round((r.skor?.aspek[a].nilai || 0) * 100), jenis: 'angka' }))] })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Ringkasan -->
    <section class="kartu grid gap-5 p-5 md:grid-cols-[220px_1fr]" data-tur="kesiapan-skor">
      <div class="flex flex-col items-center justify-center">
        <svg viewBox="0 0 120 70" class="w-48" role="img" :aria-label="`Skor kesiapan ${total.nilai}`">
          <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="currentColor" class="text-slate-200 dark:text-slate-700" stroke-width="11" stroke-linecap="round" />
          <path v-if="total.nilai > 0" :d="busur(total.nilai)" fill="none" :stroke="warnaNada[total.nada]" stroke-width="11" stroke-linecap="round" />
          <text x="60" y="56" text-anchor="middle" class="angka fill-current text-[22px] font-extrabold">{{ total.nilai }}</text>
        </svg>
        <span :class="['lencana -mt-1', NADA_SKOR[total.nada].lencana]"><Ikon :nama="NADA_SKOR[total.nada].ikon" :ukuran="13" /> {{ NADA_SKOR[total.nada].label }}</span>
        <p class="mt-1 text-center text-xs text-slate-500">{{ total.siap }} dari {{ total.jumlah }} transaksi lunas siap diperiksa</p>
      </div>
      <div class="space-y-3">
        <div>
          <h2 class="font-bold">Skor kesiapan SPJ {{ kas.tahun }}</h2>
          <p class="text-xs text-slate-500">Rata-rata berbobot nilai transaksi. Hijau ≥ {{ AMBANG_SKOR.hijau }}, kuning {{ AMBANG_SKOR.kuning }}–{{ AMBANG_SKOR.hijau - 1 }}, merah &lt; {{ AMBANG_SKOR.kuning }}. Skor tidak memblokir apa pun.</p>
        </div>
        <div v-for="(b, a) in BOBOT_SKOR" :key="a" class="flex items-center gap-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" :style="{ background: ASPEK_SKOR[a].warna }"><Ikon :nama="ASPEK_SKOR[a].ikon" :ukuran="17" /></span>
          <div class="min-w-0 flex-1">
            <div class="flex justify-between text-sm"><span class="font-semibold">{{ ASPEK_SKOR[a].judul }} <span class="text-xs font-normal text-slate-500">bobot {{ b }}%</span></span><b class="angka">{{ total.aspek[a] }}%</b></div>
            <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: total.aspek[a] + '%', background: ASPEK_SKOR[a].warna }" /></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Per bulan -->
    <section class="kartu p-4" data-tur="kesiapan-bulan">
      <div class="mb-3 flex items-center gap-2"><Ikon nama="CalendarDays" :ukuran="18" class="text-biru" /><h2 class="font-bold">Per bulan</h2><span class="text-xs text-slate-500">— ketuk untuk menyaring</span></div>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        <button v-for="m in perBulan" :key="m.i" :disabled="!m.jumlah" @click="bulan = bulan === m.i ? '' : m.i"
                :class="['rounded-xl border p-2 text-left transition disabled:opacity-40', bulan === m.i ? 'border-biru ring-2 ring-biru/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700']">
          <p class="text-xs text-slate-500">{{ m.nama.slice(0, 3) }}</p>
          <p :class="['angka text-lg font-extrabold', m.jumlah ? NADA_SKOR[m.nada].teks : 'text-slate-300']">{{ m.jumlah ? m.nilai : '–' }}</p>
          <div class="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div :class="['h-full', NADA_SKOR[m.nada].batang]" :style="{ width: (m.jumlah ? m.nilai : 0) + '%' }" /></div>
          <p class="mt-1 text-[10px] text-slate-500">{{ m.jumlah }} trx</p>
        </button>
      </div>
    </section>

    <!-- Saring -->
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[12rem] flex-1">
        <Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" type="search" class="masukan py-2 pl-9" placeholder="Cari transaksi atau penyedia" aria-label="Cari transaksi" />
      </div>
      <select v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan"><option value="">Setahun</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <div class="flex gap-1">
        <button v-for="(v, k) in NADA_SKOR" :key="k" :class="['lencana cursor-pointer', nada === k ? v.lencana + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300']" @click="nada = nada === k ? '' : k">
          <Ikon :nama="v.ikon" :ukuran="12" /> {{ v.label }}
        </button>
      </div>
      <div class="ml-auto flex gap-2">
        <button class="tombol-garis" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> <span class="hidden sm:inline">Excel</span></button>
        <button class="tombol-garis" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Daftar periksa</span></button>
      </div>
    </div>

    <!-- Daftar transaksi -->
    <div class="space-y-2" data-tur="kesiapan-daftar">
      <button v-for="b in daftar" :key="b.id" class="kartu flex w-full items-start gap-3 p-3 text-left transition hover:shadow-md" @click="router.push(`/belanja/lihat/${b.id}`)">
        <div :class="['grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white']" :style="{ background: warnaNada[b.skor?.nada || 'merah'] }">
          <span class="angka text-lg font-extrabold">{{ b.skor?.nilai ?? 0 }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="line-clamp-1 font-semibold">{{ b.nama_pekerjaan }}</p>
          <p class="text-xs text-slate-500">{{ tanggalPendek(b.tgl_lunas || b.tgl_pesanan || b.tgl_kegiatan) || 'Tanpa tanggal' }} · {{ rupiah(b.total) }}{{ b.status !== 'lunas' ? ' · belum lunas' : '' }}</p>
          <div class="mt-1.5 flex gap-1.5">
            <span v-for="(v, a) in BOBOT_SKOR" :key="a" class="flex items-center gap-1 text-[11px] text-slate-500" :title="ASPEK_SKOR[a].judul">
              <Ikon :nama="ASPEK_SKOR[a].ikon" :ukuran="12" :style="{ color: ASPEK_SKOR[a].warna }" /> {{ Math.round((b.skor?.aspek[a].nilai || 0) * 100) }}%
            </span>
          </div>
          <p v-if="b.skor?.kurang.length" class="mt-1 line-clamp-2 text-xs text-rose-600 dark:text-rose-400">Kurang: {{ b.skor.kurang.join(' · ') }}</p>
          <p v-else class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Lengkap, siap diperiksa.</p>
        </div>
        <Ikon nama="ChevronRight" :ukuran="18" class="mt-3 shrink-0 text-slate-300" />
      </button>
      <p v-if="!daftar.length" class="kartu p-8 text-center text-sm text-slate-500">Tidak ada transaksi pada saringan ini.</p>
    </div>

    <CetakBuku v-if="cetak" judul="Daftar Periksa Kesiapan SPJ" :subjudul="periode" :kolom="kolomCetak" :baris="daftar" :tanggal="new Date().toISOString().slice(0, 10)" excel kecil
               :ringkasan="[['Skor rata-rata', String(total.nilai)], ['Transaksi siap (≥ 90)', `${total.siap} dari ${total.jumlah}`]]" @excel="excel" @tutup="cetak = false" />
  </div>
</template>
