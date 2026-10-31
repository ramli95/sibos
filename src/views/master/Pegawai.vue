<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { modePratinjau } from '@/services/firebase'
import { muatPegawai, simpanPegawai, hapusPegawai } from '@/services/master'
import { eksporExcel } from '@/utils/excel'
import { formatNip, formatWa, STATUS_KEPEGAWAIAN } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'
import FormPegawai from './FormPegawai.vue'

const auth = useAuth()
const notif = useNotifikasi()
const daftar = ref([])
const memuat = ref(true)
const cari = ref('')
const saring = ref('Semua')
const tampilNonaktif = ref(false)
const terpilih = ref(null) // objek pegawai atau {} untuk baru
const menyimpan = ref(false)

const CONTOH = [
  { id: 'c1', nama: 'Ramli', gelar: 'S.Pd., M.Pd., Gr.', nip: '199511152020121007', jenis_kelamin: 'L', status_kepegawaian: 'PNS', golongan: 'III/b', pangkat: 'Penata Muda Tingkat I', jabatan: 'Guru BK', terima_tpg: true, no_wa: '6281234567890', aktif: true },
  { id: 'c2', nama: 'Contoh Guru PPPK', gelar: 'S.Pd.', nip: '198803122023212011', jenis_kelamin: 'P', status_kepegawaian: 'PPPK', golongan: 'IX', jabatan: 'Guru Matematika', terima_tpg: false, aktif: true },
  { id: 'c3', nama: 'Contoh Tenaga Honorer', gelar: 'S.Kom.', nip: '', jenis_kelamin: 'L', status_kepegawaian: 'Honorer', jabatan: 'Operator Sekolah', aktif: true },
  { id: 'c4', nama: 'Contoh Penjaga Sekolah', nip: '', jenis_kelamin: 'L', status_kepegawaian: 'PTT', jabatan: 'Penjaga Sekolah', aktif: true },
]

async function muat() {
  memuat.value = true
  try { daftar.value = modePratinjau ? CONTOH : await muatPegawai({ denganRahasia: auth.isAdmin }) }
  catch (e) { notif.kabari(e.message, 'galat') }
  finally { memuat.value = false }
}
onMounted(muat)

const namaLengkap = (p) => [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? `, ${p.gelar}` : '')
const aktifSaja = computed(() => daftar.value.filter((p) => tampilNonaktif.value || p.aktif !== false))
const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return aktifSaja.value.filter((p) =>
    (saring.value === 'Semua' || p.status_kepegawaian === saring.value) &&
    (!q || [p.nama, p.nip, p.jabatan, p.nuptk].some((v) => String(v || '').toLowerCase().includes(q))))
})

const warnaStatus = {
  PNS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PPPK: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Honorer: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PTT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}
const statistik = computed(() => {
  const d = daftar.value.filter((p) => p.aktif !== false)
  const n = (s) => d.filter((p) => p.status_kepegawaian === s).length
  return [
    { judul: 'Pegawai aktif', nilai: d.length, ikon: 'Users', warna: 'from-blue-500 to-indigo-600', saring: 'Semua' },
    { judul: 'PNS', nilai: n('PNS'), ikon: 'BadgeCheck', warna: 'from-sky-400 to-blue-600', saring: 'PNS' },
    { judul: 'PPPK', nilai: n('PPPK'), ikon: 'Briefcase', warna: 'from-teal-400 to-emerald-600', saring: 'PPPK' },
    { judul: 'Honorer & PTT', nilai: n('Honorer') + n('PTT'), ikon: 'UserRound', warna: 'from-amber-400 to-orange-500', saring: 'Honorer' },
    { judul: 'Penerima TPG', nilai: d.filter((p) => p.terima_tpg).length, ikon: 'Sparkles', warna: 'from-violet-500 to-fuchsia-500', saring: null },
  ]
})

async function simpan(data) {
  if (modePratinjau) { notif.kabari('Mode Pratinjau: data tidak disimpan.', 'info'); terpilih.value = null; return }
  menyimpan.value = true
  try {
    await simpanPegawai(terpilih.value?.id || null, data, terpilih.value)
    notif.kabari(`Data ${data.nama} tersimpan.`)
    terpilih.value = null
    await muat()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

async function hapus() {
  const p = terpilih.value
  if (!confirm(`Hapus data ${p.nama}? Bila pegawai hanya pindah/pensiun, sebaiknya matikan "Masih aktif bertugas" saja.`)) return
  try { await hapusPegawai(p); notif.kabari('Data pegawai dihapus.'); terpilih.value = null; await muat() } catch (e) { notif.kabari(e.message, 'galat') }
}

async function ekspor() {
  const kolom = [
    { judul: 'Nama', lebar: 30, nilai: namaLengkap },
    { kunci: 'nip', judul: 'NIP', lebar: 22, nilai: (p) => formatNip(p.nip) },
    { kunci: 'nuptk', judul: 'NUPTK', lebar: 18 },
    { kunci: 'jenis_kelamin', judul: 'L/P', lebar: 5 },
    { kunci: 'tempat_lahir', judul: 'Tempat Lahir', lebar: 14 },
    { kunci: 'tanggal_lahir', judul: 'Tanggal Lahir', lebar: 12, jenis: 'tanggal' },
    { kunci: 'status_kepegawaian', judul: 'Status', lebar: 10 },
    { kunci: 'golongan', judul: 'Gol.', lebar: 7 },
    { kunci: 'pangkat', judul: 'Pangkat', lebar: 20 },
    { kunci: 'jabatan', judul: 'Jabatan', lebar: 24 },
    { kunci: 'tmt_kgb_terakhir', judul: 'TMT KGB', lebar: 12, jenis: 'tanggal' },
    { kunci: 'terima_tpg', judul: 'TPG', lebar: 6 },
    { kunci: 'no_wa', judul: 'No. WA', lebar: 16 },
    ...(auth.isAdmin ? [
      { kunci: 'nik', judul: 'NIK', lebar: 19 }, { kunci: 'npwp', judul: 'NPWP', lebar: 22 },
      { kunci: 'status_kawin', judul: 'Status Kawin', lebar: 12 }, { kunci: 'anak', judul: 'Anak', lebar: 6, jenis: 'angka' }, { kunci: 'jiwa', judul: 'Jiwa', lebar: 6, jenis: 'angka' },
      { kunci: 'bank', judul: 'Bank', lebar: 16 }, { kunci: 'no_rekening', judul: 'No. Rekening', lebar: 18 }, { kunci: 'atas_nama_rekening', judul: 'Atas Nama', lebar: 22 },
    ] : []),
  ]
  try { await eksporExcel({ judul: 'Daftar Pegawai', kolom, baris: hasil.value, namaBerkas: 'Daftar Pegawai SIBOS' }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Statistik -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <button v-for="s in statistik" :key="s.judul" type="button" :disabled="!s.saring" @click="s.saring && (saring = s.saring)"
              :class="['relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md', s.warna]">
        <Ikon :nama="s.ikon" :ukuran="44" class="absolute -bottom-1 -right-1 opacity-20" />
        <p class="text-xs font-semibold uppercase tracking-wide text-white/85">{{ s.judul }}</p>
        <p class="angka mt-1 text-3xl font-extrabold">{{ memuat ? '…' : s.nilai }}</p>
      </button>
    </div>

    <!-- Alat -->
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[14rem] flex-1">
        <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" class="masukan pl-9" placeholder="Cari nama, NIP, jabatan…" />
      </div>
      <div class="flex flex-wrap gap-1">
        <button v-for="s in ['Semua', ...STATUS_KEPEGAWAIAN]" :key="s" @click="saring = s"
                :class="['lencana px-3 py-1.5 text-[13px] transition', saring === s ? 'bg-biru text-white' : (warnaStatus[s] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')]">{{ s }}</button>
      </div>
      <label class="flex items-center gap-1.5 px-1 text-xs text-slate-500"><input v-model="tampilNonaktif" type="checkbox" class="accent-biru" /> Tampilkan nonaktif</label>
      <div class="ml-auto flex flex-wrap gap-2">
        <button class="tombol-garis" @click="ekspor"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> Ekspor Excel</button>
        <template v-if="auth.isAdmin">
          <RouterLink to="/impor?jenis=pegawai" class="tombol-garis"><Ikon nama="FileUp" :ukuran="17" class="text-tosca" /> Impor</RouterLink>
          <button class="tombol-utama" @click="terpilih = {}"><Ikon nama="UserPlus" :ukuran="17" /> Tambah</button>
        </template>
      </div>
    </div>

    <!-- Daftar -->
    <div class="kartu overflow-hidden">
      <div v-if="memuat" class="p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat data pegawai…</div>
      <div v-else-if="!hasil.length" class="flex flex-col items-center gap-3 p-10 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white"><Ikon nama="Users" :ukuran="26" /></span>
        <p class="font-semibold">{{ daftar.length ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada data pegawai.' }}</p>
        <RouterLink v-if="!daftar.length && auth.isAdmin" to="/impor?jenis=pegawai" class="tombol-utama"><Ikon nama="FileUp" :ukuran="17" /> Impor dari Excel</RouterLink>
      </div>
      <template v-else>
        <!-- Tabel (layar lebar) -->
        <table class="hidden w-full text-sm md:table">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50">
            <tr><th class="px-4 py-3">Nama</th><th class="px-3 py-3">NIP</th><th class="px-3 py-3">Status</th><th class="px-3 py-3">Jabatan</th><th class="px-3 py-3">Gol.</th><th class="px-3 py-3">WhatsApp</th><th class="w-12"></th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="p in hasil" :key="p.id" class="cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-slate-800/50" :class="p.aktif === false && 'opacity-50'" @click="terpilih = p">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white', p.jenis_kelamin === 'P' ? 'bg-gradient-to-br from-rose-400 to-fuchsia-500' : 'bg-gradient-to-br from-sky-400 to-blue-600']">{{ p.nama?.[0] }}</span>
                  <div><p class="font-semibold">{{ namaLengkap(p) }}</p><p v-if="p.terima_tpg" class="text-xs text-violet-600 dark:text-violet-300">Penerima TPG</p></div>
                </div>
              </td>
              <td class="kode px-3 py-3 text-xs">{{ formatNip(p.nip) || '—' }}</td>
              <td class="px-3 py-3"><span :class="['lencana', warnaStatus[p.status_kepegawaian]]">{{ p.status_kepegawaian || '—' }}</span></td>
              <td class="px-3 py-3">{{ p.jabatan || '—' }}</td>
              <td class="px-3 py-3">{{ p.golongan || '—' }}</td>
              <td class="kode px-3 py-3 text-xs">{{ formatWa(p.no_wa) || '—' }}</td>
              <td class="px-3"><Ikon :nama="auth.isAdmin ? 'Pencil' : 'Eye'" :ukuran="16" class="text-slate-400" /></td>
            </tr>
          </tbody>
        </table>
        <!-- Kartu (HP) -->
        <ul class="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          <li v-for="p in hasil" :key="p.id" class="flex items-center gap-3 p-4" :class="p.aktif === false && 'opacity-50'" @click="terpilih = p">
            <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-white', p.jenis_kelamin === 'P' ? 'bg-gradient-to-br from-rose-400 to-fuchsia-500' : 'bg-gradient-to-br from-sky-400 to-blue-600']">{{ p.nama?.[0] }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ namaLengkap(p) }}</p>
              <p class="kode truncate text-xs text-slate-500">{{ formatNip(p.nip) || p.jabatan }}</p>
            </div>
            <span :class="['lencana', warnaStatus[p.status_kepegawaian]]">{{ p.status_kepegawaian }}</span>
          </li>
        </ul>
        <p class="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800">{{ hasil.length }} dari {{ aktifSaja.length }} pegawai</p>
      </template>
    </div>

    <FormPegawai v-if="terpilih" :pegawai="terpilih.id ? terpilih : null" :boleh-ubah="auth.isAdmin" :lihat-rahasia="auth.isAdmin" :menyimpan="menyimpan"
                 @tutup="terpilih = null" @simpan="simpan" @hapus="hapus" />
  </div>
</template>
