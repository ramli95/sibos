<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotifikasi } from '@/stores/notifikasi'
import { useAuth } from '@/stores/auth'
import { aktifkanPush, izinPush, pushDidukung } from '@/services/push'
import { panggilPenghubung } from '@/services/penghubung'
import { formatWaktuRelatif, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const notif = useNotifikasi()
const auth = useAuth()
const izin = ref('default')
const sibuk = ref('')
const saring = ref('semua')
onMounted(() => { izin.value = izinPush() })

const warna = { info: 'ikon-chip', sukses: 'ikon-chip-sukses', peringatan: 'ikon-chip-peringatan', galat: 'ikon-chip-bahaya' }
const tampil = computed(() => notif.daftar.filter((n) => saring.value === 'semua' || !n.dibaca))

async function aktifkan() {
  sibuk.value = 'aktif'
  try { await aktifkanPush(); izin.value = 'granted'; notif.kabari('Notifikasi aktif di perangkat ini.') }
  catch (e) { notif.kabari(e.message, 'galat'); izin.value = izinPush() } finally { sibuk.value = '' }
}
async function uji() {
  sibuk.value = 'uji'
  try { const r = await panggilPenghubung('uji_push'); notif.kabari(r.terkirim ? `Notifikasi uji dikirim ke ${r.terkirim} perangkat.` : 'Belum ada perangkat yang mengaktifkan notifikasi.', r.terkirim ? 'sukses' : 'info') }
  catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <!-- Push di perangkat ini -->
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-biru p-5 text-white shadow">
      <Ikon nama="BellRing" :ukuran="90" class="absolute -bottom-4 -right-3 opacity-15" />
      <div class="relative flex flex-wrap items-center gap-4">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Ikon nama="Smartphone" :ukuran="24" /></span>
        <div class="min-w-0 flex-1">
          <h2 class="text-lg font-bold">Notifikasi di perangkat ini</h2>
          <p class="text-sm text-white/85">
            <template v-if="!pushDidukung()">Peramban ini belum mendukung push. Di iPhone, pasang SIBOS ke Layar Utama dulu.</template>
            <template v-else-if="izin === 'granted'">Aktif — pemberitahuan muncul walau SIBOS sedang ditutup.</template>
            <template v-else-if="izin === 'denied'">Diblokir. Izinkan notifikasi untuk situs ini di pengaturan peramban.</template>
            <template v-else>Terima pemberitahuan (cadangan gagal, tenggat laporan, pajak, KGB) di HP atau laptop.</template>
          </p>
        </div>
        <button v-if="pushDidukung() && izin !== 'denied'" class="tombol bg-white text-navy hover:bg-blue-50" :disabled="!!sibuk" @click="aktifkan">
          <Ikon :nama="sibuk === 'aktif' ? 'RefreshCw' : 'Bell'" :ukuran="17" :class="sibuk === 'aktif' && 'animate-spin'" /> {{ izin === 'granted' ? 'Segarkan' : 'Aktifkan' }}
        </button>
        <button v-if="izin === 'granted'" class="tombol bg-white/15 text-white hover:bg-white/25" :disabled="!!sibuk" @click="uji">
          <Ikon :nama="sibuk === 'uji' ? 'RefreshCw' : 'Sparkles'" :ukuran="17" :class="sibuk === 'uji' && 'animate-spin'" /> Kirim uji
        </button>
      </div>
    </section>

    <section class="kartu overflow-hidden">
      <header class="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4 dark:border-slate-700">
        <h3 class="flex flex-1 items-center gap-2 font-bold"><Ikon nama="Bell" :ukuran="18" class="text-biru" /> Semua notifikasi</h3>
        <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button v-for="[v, l] in [['semua', 'Semua'], ['belum', `Belum dibaca (${notif.belumDibaca})`]]" :key="v" @click="saring = v"
                  :class="['rounded-lg px-3 py-1.5 text-sm font-semibold', saring === v ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']">{{ l }}</button>
        </div>
        <button class="tombol-garis px-3 py-2" :disabled="!notif.belumDibaca" @click="notif.tandaiSemua()"><Ikon nama="CircleCheck" :ukuran="16" /> Tandai dibaca</button>
      </header>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="n in tampil" :key="n.id" :class="['flex cursor-pointer gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40', !n.dibaca && 'bg-blue-50/60 dark:bg-blue-950/20']" @click="notif.tandai(n)">
          <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', warna[n.jenis] || warna.info]"><Ikon :nama="n.ikon || 'Bell'" :ukuran="18" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ n.judul }} <span v-if="!n.dibaca" class="ml-1 inline-block h-2 w-2 rounded-full bg-merah align-middle" /></p>
            <p class="text-sm text-slate-600 dark:text-slate-300">{{ n.isi }}</p>
            <p class="mt-0.5 text-xs text-slate-400" :title="n.waktu ? tanggalPanjang(n.waktu) : ''">{{ formatWaktuRelatif(n.waktu) }}</p>
          </div>
        </li>
        <li v-if="!tampil.length" class="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500">
          <Ikon nama="BellRing" :ukuran="30" class="text-slate-300" /> Tidak ada notifikasi.
        </li>
      </ul>
    </section>
    <p v-if="auth.isAdmin" class="text-center text-xs text-slate-500">Jenis notifikasi tenggat laporan, pajak, dan KGB aktif bersama modulnya (Fase 4–6).</p>
  </div>
</template>
