<script setup>
// Keuangan Bendahara (Fase 7): Dasbor uang BOSP bulanan, Catatan Kas Sekolah (di luar Dana BOSP),
// dan Catatan Pribadi Bendahara (talangan/pengembalian — hanya pemilik akun yang bisa melihat).
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TAB_KEUANGAN } from '@/config/menu'
import { useAuth } from '@/stores/auth'
import Ikon from '@/components/Ikon.vue'
import TabBulanan from './TabBulanan.vue'
import BukuCatatan from './BukuCatatan.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const tab = computed(() => TAB_KEUANGAN.filter((t) => !t.peran || auth.punyaPeran(...t.peran)))
const aktif = computed(() => (tab.value.some((t) => t.kunci === route.params.tab) ? route.params.tab : 'bulanan'))

const JENIS_KAS_SEKOLAH = {
  masuk: { label: 'Pemasukan', efek: 1, ikon: 'ArrowDownLeft', warna: 'ikon-chip-sukses' },
  keluar: { label: 'Pengeluaran', efek: -1, ikon: 'ArrowUpRight', warna: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300' },
}
const JENIS_PRIBADI = {
  talangan: { label: 'Talangan', efek: 1, ikon: 'HandCoins', warna: 'ikon-chip-kuning' },
  kembali: { label: 'Dikembalikan', efek: -1, ikon: 'Undo2', warna: 'ikon-chip-sukses' },
  catatan: { label: 'Catatan', efek: 0, ikon: 'NotebookPen', warna: 'ikon-chip' },
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="PiggyBank" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#167A6B] dark:text-teal-300">Keuangan bendahara</p>
        <h1 class="text-lg font-extrabold sm:text-xl">{{ tab.find((t) => t.kunci === aktif)?.judul }}</h1>
      </div>
    </div>
    <div class="kartu flex gap-1 overflow-x-auto p-1.5 tanpa-penggulir" role="tablist" aria-label="Bagian keuangan">
      <button v-for="t in tab" :key="t.kunci" role="tab" :aria-selected="aktif === t.kunci"
              :class="['flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition', aktif === t.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']"
              @click="router.replace(`/keuangan/${t.kunci}`)">
        <Ikon :nama="t.ikon" :ukuran="17" :class="aktif === t.kunci ? 'text-white' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <template v-if="aktif === 'kas-sekolah'">
      <p class="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><Ikon nama="Info" :ukuran="17" class="mt-0.5 shrink-0" />
        Catatan uang sekolah <b>di luar Dana BOSP</b> (mis. dana titipan, sumbangan sah, kas kegiatan). Tidak masuk BKU, laporan ARKAS, maupun SIMAKDA.</p>
      <BukuCatatan koleksi="catatan_kas_sekolah" judul="Catatan Kas Sekolah" :jenis="JENIS_KAS_SEKOLAH" label-saldo="Saldo kas sekolah" :bisa-ubah="auth.isAdmin" />
    </template>
    <template v-else-if="aktif === 'pribadi'">
      <p class="flex items-start gap-2 rounded-2xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Ikon nama="LockKeyhole" :ukuran="17" class="mt-0.5 shrink-0 text-biru" />
        Hanya akun Anda yang bisa membuka catatan ini — tidak tampil bagi Kepala Sekolah, tidak masuk Log Aktivitas, dan tidak ikut berpindah saat serah terima. Catat uang pribadi yang dipakai lebih dulu untuk kegiatan (talangan) dan pengembaliannya.</p>
      <BukuCatatan koleksi="catatan_pribadi" judul="Catatan Pribadi Bendahara" :jenis="JENIS_PRIBADI" label-saldo="Talangan belum kembali" pribadi :bisa-cetak="false" />
    </template>
    <TabBulanan v-else />
  </div>
</template>
