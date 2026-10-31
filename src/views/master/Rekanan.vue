<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { modePratinjau } from '@/services/firebase'
import { muatRekanan, muatPegawai, simpanRekanan, hapusRekanan } from '@/services/master'
import { eksporExcel } from '@/utils/excel'
import { formatWa } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'
import FormRekanan from './FormRekanan.vue'
import CetakDaftar from '@/components/cetak/CetakDaftar.vue'

const auth = useAuth()
const notif = useNotifikasi()
const daftar = ref([])
const pegawai = ref([])
const memuat = ref(true)
const cari = ref('')
const saring = ref('semua')
const terpilih = ref(null)
const menyimpan = ref(false)

const CONTOH = [
  { id: 'r1', nama_usaha: 'Toko Contoh Jaya', pemilik: 'Pemilik Contoh', bentuk_usaha: 'orang_pribadi', npwp: '01.234.567.8-805.000', status_pkp: false, no_wa: '6281111111111', bank: 'BRI', aktif: true },
  { id: 'r2', nama_usaha: 'CV Contoh Mandiri', pemilik: 'Direktur Contoh', bentuk_usaha: 'badan', npwp: '02.345.678.9-805.000', status_pkp: true, no_wa: '', bank: 'Bank Sulselbar', aktif: true },
]

async function muat() {
  memuat.value = true
  try {
    if (modePratinjau) { daftar.value = CONTOH; return }
    const [r, p] = await Promise.all([muatRekanan(), auth.isAdmin ? muatPegawai({ denganRahasia: true }) : Promise.resolve([])])
    daftar.value = r
    pegawai.value = p
  } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
}
onMounted(muat)

const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return daftar.value.filter((r) =>
    (saring.value === 'semua' || (saring.value === 'pkp' ? r.status_pkp : saring.value === 'nonpkp' ? !r.status_pkp : r.bentuk_usaha === saring.value)) &&
    (!q || [r.nama_usaha, r.pemilik, r.npwp, r.alamat].some((v) => String(v || '').toLowerCase().includes(q))))
})

const statistik = computed(() => [
  { judul: 'Rekanan', nilai: daftar.value.length, ikon: 'Store', warna: 'from-amber-400 to-orange-500', s: 'semua' },
  { judul: 'PKP', nilai: daftar.value.filter((r) => r.status_pkp).length, ikon: 'BadgeCheck', warna: 'from-emerald-400 to-teal-600', s: 'pkp' },
  { judul: 'Non-PKP', nilai: daftar.value.filter((r) => !r.status_pkp).length, ikon: 'ReceiptText', warna: 'from-sky-400 to-blue-600', s: 'nonpkp' },
  { judul: 'Badan usaha', nilai: daftar.value.filter((r) => r.bentuk_usaha === 'badan').length, ikon: 'Building2', warna: 'from-violet-500 to-fuchsia-500', s: 'badan' },
])

async function simpan(data) {
  if (modePratinjau) { notif.kabari('Mode Pratinjau: data tidak disimpan.', 'info'); terpilih.value = null; return }
  menyimpan.value = true
  try { await simpanRekanan(terpilih.value?.id || null, data, terpilih.value); notif.kabari(`${data.nama_usaha} tersimpan.`); terpilih.value = null; await muat() }
  catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus() {
  if (!confirm(`Hapus rekanan ${terpilih.value.nama_usaha}? Sebaiknya nonaktifkan saja bila pernah dipakai di transaksi.`)) return
  try { await hapusRekanan(terpilih.value); notif.kabari('Rekanan dihapus.'); terpilih.value = null; await muat() } catch (e) { notif.kabari(e.message, 'galat') }
}

const cetakTerbuka = ref(false)
const kolomCetak = [
  { judul: 'Nama Usaha', nilai: (r) => r.nama_usaha, lebar: '5cm' },
  { judul: 'Pemilik', nilai: (r) => r.pemilik, lebar: '4cm' },
  { judul: 'Bentuk', nilai: (r) => (r.bentuk_usaha === 'badan' ? 'Badan' : 'Orang pribadi'), lebar: '2.4cm' },
  { judul: 'NPWP', nilai: (r) => r.npwp, lebar: '4.2cm' },
  { judul: 'PKP', nilai: (r) => (r.status_pkp ? 'Ya' : 'Tidak'), lebar: '1.3cm', rata: 'tengah' },
  { judul: 'Alamat', nilai: (r) => r.alamat },
  { judul: 'Rekening', nilai: (r) => [r.bank, r.no_rekening].filter(Boolean).join(' '), lebar: '4cm' },
]

async function ekspor() {
  const kolom = [
    { kunci: 'nama_usaha', judul: 'Nama Usaha', lebar: 28 }, { kunci: 'pemilik', judul: 'Pemilik', lebar: 22 }, { kunci: 'jabatan_pemilik', judul: 'Jabatan', lebar: 14 },
    { judul: 'Bentuk Usaha', lebar: 14, nilai: (r) => (r.bentuk_usaha === 'badan' ? 'Badan' : 'Orang pribadi') },
    { kunci: 'npwp', judul: 'NPWP', lebar: 22 }, { kunci: 'status_pkp', judul: 'PKP', lebar: 6 }, { kunci: 'alamat', judul: 'Alamat', lebar: 34 },
    { kunci: 'telepon', judul: 'Telepon', lebar: 15 }, { kunci: 'no_wa', judul: 'No. WA', lebar: 16 },
    { kunci: 'bank', judul: 'Bank', lebar: 16 }, { kunci: 'no_rekening', judul: 'No. Rekening', lebar: 18 }, { kunci: 'atas_nama_rekening', judul: 'Atas Nama', lebar: 22 },
  ]
  try { await eksporExcel({ judul: 'Daftar Rekanan', kolom, baris: hasil.value, namaBerkas: 'Daftar Rekanan SIBOS' }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <button v-for="s in statistik" :key="s.judul" type="button" @click="saring = s.s"
              :class="['relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', s.warna, saring === s.s && 'ring-4 ring-white/60 dark:ring-white/20']">
        <Ikon :nama="s.ikon" :ukuran="44" class="absolute -bottom-1 -right-1 opacity-20" />
        <p class="text-xs font-semibold uppercase tracking-wide text-white/85">{{ s.judul }}</p>
        <p class="angka mt-1 text-3xl font-extrabold">{{ memuat ? '…' : s.nilai }}</p>
      </button>
    </div>

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[14rem] flex-1">
        <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" class="masukan pl-9" placeholder="Cari nama usaha, pemilik, NPWP…" />
      </div>
      <div class="ml-auto flex flex-wrap gap-2">
        <button class="tombol-garis" @click="cetakTerbuka = true"><Ikon nama="Printer" :ukuran="17" class="text-merah" /> Cetak / Unduh</button>
        <template v-if="auth.isAdmin">
          <RouterLink to="/impor?jenis=rekanan" class="tombol-garis"><Ikon nama="FileUp" :ukuran="17" class="text-tosca" /> Impor</RouterLink>
          <button class="tombol bg-orange-500 text-white hover:bg-orange-600" @click="terpilih = {}"><Ikon nama="Plus" :ukuran="17" /> Tambah</button>
        </template>
      </div>
    </div>

    <div v-if="memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat rekanan…</div>
    <div v-else-if="!hasil.length" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white"><Ikon nama="Store" :ukuran="26" /></span>
      <p class="font-semibold">{{ daftar.length ? 'Tidak ada yang cocok.' : 'Belum ada data rekanan.' }}</p>
      <RouterLink v-if="!daftar.length && auth.isAdmin" to="/impor?jenis=rekanan" class="tombol-utama"><Ikon nama="FileUp" :ukuran="17" /> Impor dari Excel</RouterLink>
    </div>
    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <button v-for="r in hasil" :key="r.id" type="button" @click="terpilih = r"
              :class="['kartu flex flex-col gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md', r.aktif === false && 'opacity-55']">
        <div class="flex items-start gap-3">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white', r.bentuk_usaha === 'badan' ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-gradient-to-br from-amber-400 to-orange-500']">
            <Ikon :nama="r.bentuk_usaha === 'badan' ? 'Building2' : 'Store'" :ukuran="20" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold">{{ r.nama_usaha }}</p>
            <p class="truncate text-xs text-slate-500">{{ r.pemilik || '—' }}</p>
          </div>
          <span :class="['lencana', r.status_pkp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300']">{{ r.status_pkp ? 'PKP' : 'Non-PKP' }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <span class="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300"><Ikon nama="ReceiptText" :ukuran="13" class="text-tosca" /><span class="kode truncate">{{ r.npwp || 'NPWP —' }}</span></span>
          <span class="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300"><Ikon nama="Phone" :ukuran="13" class="text-emerald-500" /><span class="kode truncate">{{ formatWa(r.no_wa) || r.telepon || '—' }}</span></span>
          <span class="col-span-2 flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300"><Ikon nama="Landmark" :ukuran="13" class="text-kuning" />{{ r.bank ? `${r.bank} · ${r.no_rekening || ''}` : 'Rekening —' }}</span>
        </div>
      </button>
    </div>

    <CetakDaftar v-if="cetakTerbuka" judul="Daftar Rekanan" :kolom="kolomCetak" :baris="hasil" excel @tutup="cetakTerbuka = false" @excel="ekspor" />
    <FormRekanan v-if="terpilih" :rekanan="terpilih.id ? terpilih : null" :boleh-ubah="auth.isAdmin" :menyimpan="menyimpan" :pegawai="pegawai" :semua-rekanan="daftar"
                 @tutup="terpilih = null" @simpan="simpan" @hapus="hapus" />
  </div>
</template>
