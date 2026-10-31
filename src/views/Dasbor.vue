<script setup>
import { computed, reactive, onMounted } from 'vue'
import { doc, getDoc, collection, getCountFromServer } from 'firebase/firestore'
import { useAuth } from '@/stores/auth'
import { db, modePratinjau } from '@/services/firebase'
import { sapaan, tanggalPanjang, rupiah, rupiahRingkas, persen as fPersen } from '@/utils/format'
import { useRkas } from '@/stores/rkas'
import { ringkasan, proporsiJuknis } from '@/utils/rkasPohon'
import Ikon from '@/components/Ikon.vue'
import KartuStat from '@/components/KartuStat.vue'

const auth = useAuth()
const namaDepan = computed(() => (auth.pengguna?.nama || '').split(',')[0])

// Ringkasan RKAS versi berlaku
const rkas = useRkas()
onMounted(() => rkas.muat().catch(() => {}))
const rk = computed(() => ringkasan(rkas.uraian))
const proporsi = computed(() => proporsiJuknis(rkas.uraian, rkas.versi?.pagu || rk.value.jumlah))
const kartuRkas = computed(() => [
  { judul: 'Pagu RKAS', nilai: rupiahRingkas(rk.value.jumlah), ikon: 'ClipboardList', warna: 'from-amber-400 via-orange-500 to-rose-500', bayangan: 'shadow-orange-500/30', sub: rupiah(rk.value.jumlah) },
  { judul: 'Tahap I', nilai: rupiahRingkas(rk.value.tahap1), ikon: 'Flag', warna: 'from-sky-400 via-blue-500 to-indigo-600', bayangan: 'shadow-blue-500/30', sub: 'Januari – Juni' },
  { judul: 'Tahap II', nilai: rupiahRingkas(rk.value.tahap2), ikon: 'Target', warna: 'from-fuchsia-500 via-pink-500 to-rose-500', bayangan: 'shadow-pink-500/30', sub: 'Juli – Desember' },
  { judul: 'Dibelanjakan', nilai: 'Rp 0', ikon: 'ShoppingCart', warna: 'from-emerald-400 via-teal-500 to-cyan-600', bayangan: 'shadow-teal-500/30', sub: 'Terisi mulai Fase 3', persen: 0 },
])

// Daftar persiapan Fase 1 & 2 — status dibaca langsung dari database
const st = reactive({ penghubung: false, profil: false, logo: false, pejabat: 0, pegawai: 0, rekanan: 0, cadangan: false, referensi: false, harga: 0 })

onMounted(async () => {
  if (modePratinjau || !auth.isAdmin) return
  const aman = (p) => p.catch(() => null)
  const [ph, pr, cd, pj, pg, rk, rf, sh] = await Promise.all([
    aman(getDoc(doc(db, 'sistem', 'penghubung'))), aman(getDoc(doc(db, 'sekolah', 'profil'))), aman(getDoc(doc(db, 'sistem', 'cadangan'))),
    aman(getCountFromServer(collection(db, 'pejabat'))), aman(getCountFromServer(collection(db, 'pegawai'))), aman(getCountFromServer(collection(db, 'rekanan'))), aman(getDoc(doc(db, 'referensi', 'snp'))),
    aman(getCountFromServer(collection(db, 'standar_harga'))),
  ])
  st.harga = sh?.data().count || 0
  st.penghubung = !!ph?.data()?.url_apps_script
  st.profil = !!pr?.exists()
  st.logo = !!(pr?.data()?.logo_pemkot && pr?.data()?.logo_tutwuri)
  st.cadangan = !!cd?.data()?.terakhir
  st.pejabat = pj?.data().count || 0
  st.pegawai = pg?.data().count || 0
  st.rekanan = rk?.data().count || 0
  st.referensi = !!rf?.exists()
})

const persiapan = computed(() => [
  { ikon: 'Database', judul: 'Firebase tersambung', ket: 'Login & database Firestore Jakarta', selesai: !modePratinjau, warna: 'from-orange-400 to-rose-500', ke: null },
  { ikon: 'HardDrive', judul: 'Penghubung Google Drive', ket: st.penghubung ? 'URL Apps Script tersimpan' : 'Apps Script + folder SIBOS', selesai: st.penghubung, warna: 'from-emerald-400 to-teal-500', ke: '/pengaturan/drive' },
  { ikon: 'CloudUpload', judul: 'Cadangan pertama', ket: 'Muncul di Drive: SIBOS/Cadangan', selesai: st.cadangan, warna: 'from-teal-400 to-cyan-600', ke: '/pengaturan/drive' },
  { ikon: 'School', judul: 'Profil sekolah & kop', ket: st.logo ? 'Profil & logo lengkap — uji cetak F4' : 'Tinggal unggah logo Pemkot & Tut Wuri', selesai: st.profil && st.logo, warna: 'from-blue-500 to-indigo-600', ke: st.logo ? '/cetak/uji' : '/pengaturan/kop' },
  { ikon: 'UserCheck', judul: 'Pejabat per periode', ket: st.pejabat ? `${st.pejabat} periode tercatat` : 'KS, Bendahara, Komite, Pengurus Barang', selesai: st.pejabat >= 6, warna: 'from-violet-500 to-fuchsia-500', ke: '/pengaturan/pejabat' },
  { ikon: 'BookMarked', judul: 'Referensi juknis', ket: st.referensi ? 'Data awal terpasang' : 'Pasang data awal SNP, komponen, dll.', selesai: st.referensi, warna: 'from-lime-400 to-green-600', ke: '/referensi' },
  { ikon: 'Users', judul: 'Impor data pegawai', ket: st.pegawai ? `${st.pegawai} pegawai` : 'Dari sheet dB-SKPG', selesai: st.pegawai > 0, warna: 'from-sky-400 to-blue-600', ke: '/impor' },
  { ikon: 'Store', judul: 'Impor data rekanan', ket: st.rekanan ? `${st.rekanan} rekanan` : 'Dari sheet db_Rekanan', selesai: st.rekanan > 0, warna: 'from-amber-400 to-orange-500', ke: '/impor' },
  { ikon: 'ClipboardList', judul: 'Impor RKAS dari ARKAS', ket: rkas.versi ? `${rkas.versi.nama}: ${rupiah(rkas.versi.total)}` : 'PDF Kertas Kerja per Tahap', selesai: !!rkas.versi && rkas.versi.total === rkas.versi.pagu, warna: 'from-orange-400 to-rose-500', ke: '/rkas/versi' },
  { ikon: 'CalendarDays', judul: 'Rencana per bulan', ket: rkas.versi?.ada_bulanan ? 'Rincian per bulan terisi' : 'PDF Rincian Kertas Kerja Perbulan', selesai: !!rkas.versi?.ada_bulanan, warna: 'from-teal-400 to-cyan-600', ke: '/rkas/versi' },
  { ikon: 'Tags', judul: 'Standar harga satuan', ket: st.harga ? `${st.harga} item harga` : 'Ambil dari RKAS', selesai: st.harga > 0, warna: 'from-amber-400 to-orange-500', ke: '/standar-harga' },
])
const jumlahSelesai = computed(() => persiapan.value.filter((p) => p.selesai).length)
const persen = computed(() => Math.round((jumlahSelesai.value / persiapan.value.length) * 100))
</script>

<template>
  <div class="space-y-6">
    <!-- Sapaan -->
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#1F4BB8] to-biru p-6 text-white shadow-lg sm:p-8">
      <div class="pointer-events-none absolute -right-4 bottom-0 flex items-end gap-3 opacity-25" aria-hidden="true">
        <div class="h-12 w-6 rounded-full bg-kuning" /><div class="h-20 w-6 rounded-full bg-merah" />
        <div class="h-28 w-6 rounded-full bg-tosca" /><div class="h-36 w-6 rounded-full bg-langit" />
      </div>
      <p class="flex items-center gap-2 text-sm text-blue-100"><Ikon nama="CalendarDays" :ukuran="16" /> {{ tanggalPanjang(new Date()) }}</p>
      <h2 class="mt-2 text-2xl font-extrabold sm:text-3xl">{{ sapaan() }}, {{ namaDepan }}</h2>
      <p class="mt-1 max-w-xl text-blue-100">SIBOS memasuki <b>Fase 2 — Perencanaan</b>: RKAS, standar harga, dan proporsi juknis. Selesaikan daftar persiapan di bawah.</p>
    </section>

    <!-- RKAS -->
    <section v-if="rkas.versi" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuStat v-for="k in kartuRkas" :key="k.judul" v-bind="k" ringkas :bisa-klik="false" />
      </div>
      <RouterLink to="/rkas/ringkasan" class="kartu flex flex-wrap items-center gap-4 p-4 transition hover:shadow-md">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white"><Ikon nama="Scale" :ukuran="19" /></span>
        <div class="min-w-[10rem] flex-1"><p class="font-bold">Proporsi juknis</p><p class="text-xs text-slate-500">{{ rkas.versi.nama }} · Pasal 42</p></div>
        <span v-for="p in proporsi" :key="p.kunci" :class="['flex items-center gap-2 rounded-xl px-3 py-2 text-sm', p.aman ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200']">
          <Ikon :nama="p.aman ? 'CircleCheck' : 'TriangleAlert'" :ukuran="15" /> {{ p.judul }} <b class="angka">{{ fPersen(p.persen) }}</b>
          <span class="text-xs opacity-75">({{ p.jenis === 'min' ? '≥' : '≤' }}{{ p.batas }}%)</span>
        </span>
        <Ikon nama="ChevronRight" class="text-slate-400" />
      </RouterLink>
    </section>

    <!-- Persiapan -->
    <section v-if="auth.isAdmin" class="kartu p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="flex items-center gap-2 text-lg font-bold"><Ikon nama="Sparkles" :ukuran="20" class="text-kuning" /> Persiapan Fase 1 &amp; 2</h3>
        <span class="lencana bg-biru/10 text-biru dark:bg-biru/20 dark:text-blue-300">{{ jumlahSelesai }} dari {{ persiapan.length }} selesai</span>
      </div>
      <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" :aria-valuenow="persen" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-gradient-to-r from-kuning via-merah to-tosca transition-all" :style="{ width: Math.max(persen, 3) + '%' }" />
      </div>
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <component :is="p.ke ? 'RouterLink' : 'div'" v-for="p in persiapan" :key="p.judul" :to="p.ke"
                   class="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition hover:border-biru/40 hover:shadow-md dark:border-slate-700">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', p.warna]"><Ikon :nama="p.ikon" :ukuran="20" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ p.judul }}</p>
            <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ p.ket }}</p>
          </div>
          <Ikon :nama="p.selesai ? 'CircleCheck' : 'ChevronRight'" :ukuran="20" :class="p.selesai ? 'text-emerald-500' : 'text-slate-300 group-hover:text-biru'" />
        </component>
      </div>
    </section>
  </div>
</template>
