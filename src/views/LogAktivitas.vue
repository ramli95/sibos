<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'
import { daftarPengguna } from '@/services/pengguna'
import { useNotifikasi } from '@/stores/notifikasi'
import { tanggalPendek } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakDaftar from '@/components/cetak/CetakDaftar.vue'

const notif = useNotifikasi()
const log = ref([])
const nama = ref({})
const memuat = ref(true)
const cari = ref('')
const jenis = ref('semua')
const hari = ref(90)

const AKSI = {
  tambah: { label: 'Tambah', ikon: 'Plus', warna: 'from-emerald-400 to-teal-600' },
  ubah: { label: 'Ubah', ikon: 'Pencil', warna: 'from-sky-400 to-blue-600' },
  hapus: { label: 'Hapus', ikon: 'Trash2', warna: 'from-rose-400 to-red-500' },
  impor: { label: 'Impor', ikon: 'FileUp', warna: 'from-teal-400 to-cyan-600' },
  masuk: { label: 'Masuk', ikon: 'LogOut', warna: 'from-slate-400 to-slate-600' },
  keluar: { label: 'Keluar', ikon: 'LogOut', warna: 'from-slate-400 to-slate-500' },
  ubah_password: { label: 'Password', ikon: 'KeyRound', warna: 'from-amber-400 to-orange-500' },
  reset_password: { label: 'Reset password', ikon: 'KeyRound', warna: 'from-amber-400 to-orange-500' },
  penyiapan_awal: { label: 'Penyiapan', ikon: 'Sparkles', warna: 'from-violet-500 to-fuchsia-500' },
  serah_terima_bendahara: { label: 'Serah terima', ikon: 'Repeat', warna: 'from-violet-500 to-fuchsia-500' },
}
const gaya = (a) => AKSI[a] || { label: a, ikon: 'History', warna: 'from-slate-400 to-slate-600' }

async function muat() {
  memuat.value = true
  try {
    if (modePratinjau) {
      log.value = [
        { id: 1, aksi: 'penyiapan_awal', keterangan: 'Penyiapan Awal SIBOS: akun Admin pertama, profil sekolah, pejabat', uid: 'p', waktu: new Date() },
        { id: 2, aksi: 'impor', keterangan: 'Impor pegawai dari "Jurnal Dana BOS 2026.xlsx": 42 baru, 0 diperbarui', uid: 'p', waktu: new Date() },
        { id: 3, aksi: 'ubah', keterangan: 'Mengubah rekanan Toko Contoh Jaya: no_wa, bank', uid: 'p', waktu: new Date() },
      ]
      nama.value = { p: 'Ramli, S.Pd., M.Pd., Gr.' }
      return
    }
    const batas = new Date(); batas.setDate(batas.getDate() - hari.value)
    const [s, p] = await Promise.all([
      getDocs(query(collection(db, 'log_aktivitas'), where('waktu', '>=', Timestamp.fromDate(batas)), orderBy('waktu', 'desc'), limit(500))),
      daftarPengguna().catch(() => []),
    ])
    log.value = s.docs.map((d) => ({ id: d.id, ...d.data(), waktu: d.data().waktu?.toDate?.() || null }))
    nama.value = Object.fromEntries(p.map((u) => [u.uid, u.nama]))
  } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
}
onMounted(muat)

const jenisAda = computed(() => [...new Set(log.value.map((l) => l.aksi))])
const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return log.value.filter((l) => (jenis.value === 'semua' || l.aksi === jenis.value) &&
    (!q || [l.keterangan, nama.value[l.uid]].some((v) => String(v || '').toLowerCase().includes(q))))
})
const kelompok = computed(() => {
  const g = []
  hasil.value.forEach((l) => {
    const t = l.waktu ? tanggalPendek(l.waktu) : '—'
    if (!g.length || g[g.length - 1].tanggal !== t) g.push({ tanggal: t, isi: [] })
    g[g.length - 1].isi.push(l)
  })
  return g
})
const jam = (d) => (d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : '')

const cetakTerbuka = ref(false)
const kolomCetak = [
  { judul: 'Tanggal', nilai: (l) => (l.waktu ? tanggalPendek(l.waktu) : ''), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Jam', nilai: (l) => jam(l.waktu), lebar: '1.4cm', rata: 'tengah' },
  { judul: 'Pengguna', nilai: (l) => nama.value[l.uid] || '', lebar: '5cm' },
  { judul: 'Aksi', nilai: (l) => gaya(l.aksi).label, lebar: '2.6cm' },
  { judul: 'Keterangan', nilai: (l) => l.keterangan },
]

function ekspor() {
  eksporExcel({
    judul: 'Log Aktivitas', namaBerkas: 'Log Aktivitas SIBOS', baris: hasil.value,
    kolom: [
      { judul: 'Tanggal', lebar: 12, nilai: (l) => (l.waktu ? tanggalPendek(l.waktu) : '') },
      { judul: 'Jam (WITA)', lebar: 10, nilai: (l) => jam(l.waktu) },
      { judul: 'Pengguna', lebar: 28, nilai: (l) => nama.value[l.uid] || l.uid },
      { judul: 'Aksi', lebar: 14, nilai: (l) => gaya(l.aksi).label },
      { kunci: 'keterangan', judul: 'Keterangan', lebar: 70 },
    ],
  }).catch((e) => notif.kabari(e.message, 'galat'))
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[14rem] flex-1">
        <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" class="masukan pl-9" placeholder="Cari keterangan atau nama pengguna…" />
      </div>
      <select v-model="jenis" class="masukan w-auto"><option value="semua">Semua aksi</option><option v-for="a in jenisAda" :key="a" :value="a">{{ gaya(a).label }}</option></select>
      <select v-model.number="hari" class="masukan w-auto" @change="muat"><option :value="7">7 hari</option><option :value="30">30 hari</option><option :value="90">90 hari</option><option :value="365">1 tahun</option></select>
      <button class="tombol-garis" @click="cetakTerbuka = true"><Ikon nama="Printer" :ukuran="17" class="text-merah" /> Cetak / Unduh</button>
    </div>

    <CetakDaftar v-if="cetakTerbuka" judul="Log Aktivitas" :subjudul="`${hari} hari terakhir`" :kolom="kolomCetak" :baris="hasil" :tanda-tangan="false" excel
                 @tutup="cetakTerbuka = false" @excel="ekspor" />
    <div v-if="memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat log…</div>
    <div v-else-if="!hasil.length" class="kartu p-10 text-center text-sm text-slate-500">Tidak ada aktivitas pada rentang ini.</div>
    <div v-else class="space-y-5">
      <section v-for="g in kelompok" :key="g.tanggal">
        <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500"><Ikon nama="CalendarDays" :ukuran="15" class="text-biru" /> {{ g.tanggal }}</h3>
        <ol class="kartu divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="l in g.isi" :key="l.id" class="flex gap-3 p-3.5">
            <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white', gaya(l.aksi).warna]"><Ikon :nama="gaya(l.aksi).ikon" :ukuran="16" /></span>
            <div class="min-w-0 flex-1">
              <p class="text-sm">{{ l.keterangan }}</p>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                <span class="flex items-center gap-1"><Ikon nama="UserRound" :ukuran="12" />{{ nama[l.uid] || 'Pengguna' }}</span>
                <span class="flex items-center gap-1"><Ikon nama="Clock" :ukuran="12" />{{ jam(l.waktu) }} WITA</span>
                <span v-if="l.perangkat === 'Apps Script'" class="flex items-center gap-1"><Ikon nama="HardDrive" :ukuran="12" />Penghubung</span>
              </p>
            </div>
          </li>
        </ol>
      </section>
      <p v-if="hasil.length >= 500" class="text-center text-xs text-slate-500">Menampilkan 500 aktivitas terbaru.</p>
    </div>
  </div>
</template>
