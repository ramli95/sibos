<script setup>
import { computed, reactive, onMounted } from 'vue'
import { doc, getDoc, collection, getCountFromServer } from 'firebase/firestore'
import { useAuth } from '@/stores/auth'
import { db, modePratinjau } from '@/services/firebase'
import { sapaan, tanggalPanjang, rupiah, rupiahRingkas, persen as fPersen } from '@/utils/format'
import { useRkas } from '@/stores/rkas'
import { useBelanja } from '@/stores/belanja'
import { useKas } from '@/stores/kas'
import { useGaji, namaLengkap } from '@/stores/gaji'
import { ringkasan, proporsiJuknis } from '@/utils/rkasPohon'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'

const auth = useAuth()
const namaDepan = computed(() => (auth.pengguna?.nama || '').split(',')[0])

// Ringkasan RKAS versi berlaku
const rkas = useRkas()
const belanja = useBelanja()
const kas = useKas()
const gaji = useGaji()
onMounted(() => { rkas.muat().catch(() => {}); kas.muat().catch(() => {}); if (auth.isAdmin) gaji.muat().catch(() => {}) })
const belumLengkap = computed(() => belanja.daftar.filter((b) => (b.persen_lengkap || 0) < 100).length)
const rk = computed(() => ringkasan(rkas.uraian))
const proporsi = computed(() => proporsiJuknis(rkas.uraian, rkas.versi?.pagu || rk.value.jumlah))
const kartuRkas = computed(() => [
  { judul: 'Pagu RKAS', nilai: rupiahRingkas(rk.value.jumlah), ikon: 'ClipboardList', nada: 'gelap', sub: rupiah(rk.value.jumlah) },
  { judul: 'Tahap I', nilai: rupiahRingkas(rk.value.tahap1), ikon: 'Flag', nada: 'primer', sub: 'Januari – Juni' },
  { judul: 'Tahap II', nilai: rupiahRingkas(rk.value.tahap2), ikon: 'Target', nada: 'primer', sub: 'Juli – Desember' },
  { judul: 'Dibelanjakan', nilai: rupiahRingkas(belanja.totalRealisasi), ikon: 'ShoppingCart', nada: 'sukses', sub: `${fPersen(rk.value.jumlah ? (belanja.totalRealisasi / rk.value.jumlah) * 100 : 0, 1)} dari RKAS · ${belanja.lunas.length} lunas`, persen: rk.value.jumlah ? (belanja.totalRealisasi / rk.value.jumlah) * 100 : 0, ke: '/belanja/daftar' },
])

const pintasBelanja = computed(() => [
  ...(auth.isAdmin ? [{ judul: 'Belanja baru', ket: 'Paket dokumen SPJ otomatis', ikon: 'CirclePlus', chip: 'ikon-chip', ke: '/belanja/baru' }] : []),
  { judul: 'Belum lengkap', ket: belumLengkap.value ? `${belumLengkap.value} transaksi perlu arsip/foto/BNU` : 'Semua transaksi lengkap', ikon: 'ListChecks', chip: belumLengkap.value ? 'ikon-chip-peringatan' : 'ikon-chip-sukses', ke: '/belanja/arsip' },
  { judul: 'Pajak belum disetor', ket: kas.terutang.length ? `${rupiah(kas.totalTerutang)} · ${kas.terutang.length} kewajiban` : 'Semua pajak sudah disetor', ikon: 'ReceiptText', chip: kas.terutang.length ? 'ikon-chip-peringatan' : 'ikon-chip-sukses', ke: '/pajak/terutang' },
  { judul: 'Buku Kas', ket: `Saldo bank ${rupiah(kas.saldoBank)}`, ikon: 'BookOpenText', chip: 'ikon-chip-tosca', ke: '/buku-kas/bku' },
  { judul: 'Agenda surat', ket: 'Nomor surat & kwitansi', ikon: 'Mailbox', chip: 'ikon-chip-kuning', ke: '/agenda-surat/daftar' },
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
  { ikon: 'Database', judul: 'Firebase tersambung', ket: 'Login & database Firestore Jakarta', selesai: !modePratinjau, ke: null },
  { ikon: 'HardDrive', judul: 'Penghubung Google Drive', ket: st.penghubung ? 'URL Apps Script tersimpan' : 'Apps Script + folder SIBOS', selesai: st.penghubung, ke: '/pengaturan/drive' },
  { ikon: 'CloudUpload', judul: 'Cadangan pertama', ket: 'Muncul di Drive: SIBOS/Cadangan', selesai: st.cadangan, ke: '/pengaturan/drive' },
  { ikon: 'School', judul: 'Profil sekolah & kop', ket: st.logo ? 'Profil & logo lengkap — uji cetak F4' : 'Tinggal unggah logo Pemkot & Tut Wuri', selesai: st.profil && st.logo, ke: st.logo ? '/cetak/uji' : '/pengaturan/kop' },
  { ikon: 'UserCheck', judul: 'Pejabat per periode', ket: st.pejabat ? `${st.pejabat} periode tercatat` : 'KS, Bendahara, Komite, Pengurus Barang', selesai: st.pejabat >= 6, ke: '/pengaturan/pejabat' },
  { ikon: 'BookMarked', judul: 'Referensi juknis', ket: st.referensi ? 'Data awal terpasang' : 'Pasang data awal SNP, komponen, dll.', selesai: st.referensi, ke: '/referensi' },
  { ikon: 'Users', judul: 'Impor data pegawai', ket: st.pegawai ? `${st.pegawai} pegawai` : 'Dari sheet dB-SKPG', selesai: st.pegawai > 0, ke: '/impor' },
  { ikon: 'Store', judul: 'Impor data rekanan', ket: st.rekanan ? `${st.rekanan} rekanan` : 'Dari sheet db_Rekanan', selesai: st.rekanan > 0, ke: '/impor' },
  { ikon: 'ClipboardList', judul: 'Impor RKAS dari ARKAS', ket: rkas.versi ? `${rkas.versi.nama}: ${rupiah(rkas.versi.total)}` : 'PDF Kertas Kerja per Tahap', selesai: !!rkas.versi && rkas.versi.total === rkas.versi.pagu, ke: '/rkas/versi' },
  { ikon: 'CalendarDays', judul: 'Rencana per bulan', ket: rkas.versi?.ada_bulanan ? 'Rincian per bulan terisi' : 'PDF Rincian Kertas Kerja Perbulan', selesai: !!rkas.versi?.ada_bulanan, ke: '/rkas/versi' },
  { ikon: 'Tags', judul: 'Standar harga satuan', ket: st.harga ? `${st.harga} item harga` : 'Ambil dari RKAS', selesai: st.harga > 0, ke: '/standar-harga' },
])
const jumlahSelesai = computed(() => persiapan.value.filter((p) => p.selesai).length)
const persen = computed(() => Math.round((jumlahSelesai.value / persiapan.value.length) * 100))
</script>

<template>
  <div class="space-y-6">
    <!-- Sapaan -->
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#1F4BB8] to-biru p-6 text-white shadow-lg sm:p-8">
      <div class="pointer-events-none absolute -right-4 bottom-0 flex items-end gap-3 opacity-20" aria-hidden="true">
        <div class="h-12 w-6 rounded-full bg-white/60" /><div class="h-20 w-6 rounded-full bg-white/60" />
        <div class="h-28 w-6 rounded-full bg-white/60" /><div class="h-36 w-6 rounded-full bg-white/60" />
      </div>
      <p class="flex items-center gap-2 text-sm text-blue-100"><Ikon nama="CalendarDays" :ukuran="16" /> {{ tanggalPanjang(new Date()) }}</p>
      <h2 class="mt-2 text-2xl font-extrabold sm:text-3xl">{{ sapaan() }}, {{ namaDepan }}</h2>
      <p class="mt-1 max-w-xl text-blue-100">Catat sekali — dokumen SPJ, buku kas, laporan, inventaris, hingga daftar gaji &amp; SKPG terisi otomatis.</p>
    </section>

    <!-- Pengingat KGB H-30 (hanya Bendahara) -->
    <RouterLink v-if="auth.isAdmin && gaji.kgbH30.length" to="/gaji/kgb" data-tur="dasbor-kgb"
                class="kartu flex flex-wrap items-center gap-4 border-l-4 border-l-amber-500 p-4 transition hover:shadow-md">
      <span class="grid h-11 w-11 place-items-center rounded-xl ikon-chip-peringatan"><Ikon nama="BellRing" :ukuran="20" /></span>
      <div class="min-w-[12rem] flex-1">
        <p class="font-bold">KGB jatuh tempo ≤ 30 hari · {{ gaji.kgbH30.length }} pegawai</p>
        <p class="text-xs text-slate-500">Siapkan surat pengantar usulan KGB ke Dinas Pendidikan.</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span v-for="x in gaji.kgbH30.slice(0, 4)" :key="x.p.id" :class="['lencana', x.st.lencana]">{{ namaLengkap(x.p).split(',')[0] }} · {{ x.st.label }}</span>
        <span v-if="gaji.kgbH30.length > 4" class="lencana bg-slate-100 text-slate-600 dark:bg-slate-800">+{{ gaji.kgbH30.length - 4 }}</span>
      </div>
      <Ikon nama="ChevronRight" class="text-slate-400" />
    </RouterLink>

    <!-- RKAS -->
    <section v-if="rkas.versi" class="space-y-4">
      <GridStat :daftar="kartuRkas" ringkas :bisa-klik="false" />
      <div class="grid gap-3 sm:grid-cols-3">
        <RouterLink v-for="x in pintasBelanja" :key="x.ke" :to="x.ke" class="kartu flex items-center gap-3 p-4 transition hover:shadow-md">
          <span :class="['grid h-10 w-10 place-items-center rounded-xl', x.chip]"><Ikon :nama="x.ikon" :ukuran="19" /></span>
          <div class="min-w-0 flex-1"><p class="font-bold">{{ x.judul }}</p><p class="truncate text-xs text-slate-500">{{ x.ket }}</p></div>
          <Ikon nama="ChevronRight" class="text-slate-400" />
        </RouterLink>
      </div>
      <RouterLink to="/rkas/ringkasan" class="kartu flex flex-wrap items-center gap-4 p-4 transition hover:shadow-md">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Scale" :ukuran="19" /></span>
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
        <h3 class="flex items-center gap-2 text-lg font-bold"><Ikon nama="Sparkles" :ukuran="20" class="text-biru" /> Persiapan Fase 1 &amp; 2</h3>
        <span class="lencana bg-biru/10 text-biru dark:bg-biru/20 dark:text-blue-300">{{ jumlahSelesai }} dari {{ persiapan.length }} selesai</span>
      </div>
      <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" :aria-valuenow="persen" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-biru transition-all" :style="{ width: Math.max(persen, 3) + '%' }" />
      </div>
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <component :is="p.ke ? 'RouterLink' : 'div'" v-for="p in persiapan" :key="p.judul" :to="p.ke"
                   class="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition hover:border-biru/40 hover:shadow-md dark:border-slate-700">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', p.selesai ? 'ikon-chip-sukses' : 'ikon-chip']"><Ikon :nama="p.ikon" :ukuran="20" /></span>
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
