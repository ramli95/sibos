<script setup>
// Arsip & kelengkapan: daftar periksa per transaksi (dokumen, foto, BNU, arsip bertanda tangan)
import { ref, computed } from 'vue'
import { useBelanja } from '@/stores/belanja'
import { kelengkapan, persenLengkap, tanggalRealisasi } from '@/utils/belanja'
import { rupiah, tanggalPendek } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'

const belanja = useBelanja()
const saring = ref('belum')
const baris = computed(() => belanja.daftar.map((b) => { const c = kelengkapan(b); return { b, c, p: persenLengkap(c) } })
  .sort((a, x) => a.p - x.p || String(tanggalRealisasi(x.b)).localeCompare(String(tanggalRealisasi(a.b)))))
const kurang = (k) => baris.value.filter((x) => x.c.some((c) => c.kunci === k && !c.ok)).length
const hasil = computed(() => baris.value.filter((x) => saring.value === 'semua' || (saring.value === 'belum' ? x.p < 100 : saring.value === 'lengkap' ? x.p === 100 : x.c.some((c) => c.kunci === saring.value && !c.ok))))

const statistik = computed(() => {
  const n = baris.value.length
  const ok = baris.value.filter((x) => x.p === 100).length
  return [
    { judul: 'Lengkap', nilai: ok, ikon: 'BadgeCheck', nada: 'sukses', s: 'lengkap', sub: `dari ${n} transaksi`, persen: n ? Math.round((ok / n) * 100) : 0 },
    { judul: 'Belum ada BNU', nilai: kurang('bnu'), ikon: 'BookOpenText', nada: kurang('bnu') ? 'peringatan' : 'primer', s: 'bnu', sub: 'Nomor Buku Kas ARKAS' },
    { judul: 'Belum ada foto', nilai: kurang('foto'), ikon: 'Image', nada: kurang('foto') ? 'peringatan' : 'primer', s: 'foto', sub: 'Dokumentasi BAST/kegiatan' },
    { judul: 'Arsip ttd belum', nilai: kurang('paket_ttd'), ikon: 'FileCheck', nada: kurang('paket_ttd') ? 'peringatan' : 'primer', s: 'paket_ttd', sub: 'Paket SPJ bertanda tangan' },
  ]
})
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="belanja.memuat" :aktif="(s) => saring === s.s" @klik="(s) => (saring = saring === s.s ? 'belum' : s.s)" />

    <div class="kartu tanpa-penggulir flex gap-1.5 overflow-x-auto p-3">
      <button v-for="[k, l, ik] in [['belum', 'Belum lengkap', 'ListChecks'], ['lengkap', 'Lengkap', 'BadgeCheck'], ['semua', 'Semua', 'Layers']]" :key="k" type="button" @click="saring = k"
              :class="['flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                       saring === k ? 'border-biru bg-biru text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300']">
        <Ikon :nama="ik" :ukuran="13" /> {{ l }}
      </button>
    </div>

    <div v-if="!hasil.length" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl ikon-chip-sukses"><Ikon nama="BadgeCheck" :ukuran="26" /></span>
      <p class="font-semibold">{{ baris.length ? 'Tidak ada transaksi pada saringan ini.' : 'Belum ada transaksi.' }}</p>
    </div>
    <div v-else class="space-y-3">
      <RouterLink v-for="{ b, c, p } in hasil" :key="b.id" :to="`/belanja/lihat/${b.id}`" class="kartu block p-4 transition hover:shadow-md">
        <div class="flex items-start gap-3">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold', p === 100 ? 'ikon-chip-sukses' : p >= 60 ? 'ikon-chip' : 'ikon-chip-peringatan']">{{ p }}%</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold">{{ b.nama_pekerjaan }}</p>
            <p class="truncate text-xs text-slate-500">{{ tanggalPendek(tanggalRealisasi(b)) || '—' }} · {{ b.jenis === 'honor' ? `${(b.penerima || []).length} penerima` : b.rekanan?.nama_usaha || '—' }} · <span class="angka">{{ rupiah(b.total) }}</span></p>
          </div>
          <Ikon nama="ChevronRight" class="mt-2 text-slate-300" />
        </div>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <span v-for="x in c" :key="x.kunci" :class="['lencana', x.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200']">
            <Ikon :nama="x.ok ? 'CircleCheck' : 'CircleAlert'" :ukuran="12" /> {{ x.judul }}<template v-if="x.ket"> ({{ x.ket }})</template>
          </span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
