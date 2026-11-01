<script setup>
import { ref, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { bacaVapid, simpanVapid } from '@/services/push'
import { catatAktivitas } from '@/services/log'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'

const notif = useNotifikasi()
const vapid = ref('')
const menyimpan = ref(false)
onMounted(async () => { vapid.value = await bacaVapid().catch(() => '') })

async function simpan() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau.', 'info')
  if (vapid.value.trim().length < 60) return notif.kabari('Kunci VAPID tampaknya belum lengkap (biasanya 87 karakter).', 'galat')
  menyimpan.value = true
  try { await simpanVapid(vapid.value); await catatAktivitas('ubah', 'Memperbarui kunci notifikasi push (VAPID)', { koleksi: 'sistem', id: 'notifikasi' }); notif.kabari('Kunci notifikasi tersimpan.') }
  catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

const jenis = [
  { ikon: 'CloudUpload', judul: 'Cadangan gagal', ket: 'Dikirim penghubung Apps Script ke semua Bendahara', fase: 1, aktif: true, warna: 'from-teal-400 to-cyan-600' },
  { ikon: 'ReceiptText', judul: 'Pajak belum disetor', ket: 'Pajak terutang mendekati tenggat', fase: 4, warna: 'from-emerald-400 to-teal-600' },
  { ikon: 'CalendarDays', judul: 'Tenggat laporan', ket: '31 Juli (tahap I) dan 31 Januari (tahunan)', fase: 5, warna: 'from-amber-400 to-orange-500' },
  { ikon: 'TrendingUp', judul: 'KGB H-30', ket: 'Setiap pagi: pegawai yang KGB-nya jatuh tempo ≤ 30 hari (Apps Script v7)', fase: 6, aktif: true, warna: 'from-violet-500 to-fuchsia-500' },
]
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-2">
    <section class="kartu space-y-4 p-5">
      <h3 class="flex items-center gap-2.5 font-bold">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300"><Ikon nama="KeyRound" :ukuran="17" /></span>
        Kunci notifikasi push (VAPID)
      </h3>
      <ol class="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
        <li>Buka Firebase Console → ⚙ <b>Project settings</b> → tab <b>Cloud Messaging</b>.</li>
        <li>Gulir ke <b>Web configuration → Web Push certificates</b> → <b>Generate key pair</b>.</li>
        <li>Salin kunci yang muncul (diawali huruf "B…"), tempel di bawah, lalu Simpan.</li>
      </ol>
      <div><label class="label" for="vp">Key pair</label><textarea id="vp" v-model="vapid" rows="3" class="masukan kode text-xs" placeholder="BExxxx…" /></div>
      <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
      <RouterLink to="/notifikasi" class="flex items-center gap-1.5 text-sm font-semibold text-biru hover:underline"><Ikon nama="BellRing" :ukuran="15" /> Aktifkan & uji di perangkat ini</RouterLink>
    </section>

    <section class="kartu space-y-3 p-5">
      <h3 class="flex items-center gap-2 font-bold"><Ikon nama="Bell" :ukuran="18" class="text-biru" /> Jenis notifikasi</h3>
      <div v-for="j in jenis" :key="j.judul" class="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-lg ikon-chip']"><Ikon :nama="j.ikon" :ukuran="17" /></span>
        <div class="min-w-0 flex-1"><p class="text-sm font-semibold">{{ j.judul }}</p><p class="text-xs text-slate-500">{{ j.ket }}</p></div>
        <span :class="['lencana', j.aktif ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800']">{{ j.aktif ? 'Aktif' : 'Lewat dasbor' }}</span>
      </div>
    </section>
  </div>
</template>
