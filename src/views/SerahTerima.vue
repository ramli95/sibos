<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { modePratinjau } from '@/services/firebase'
import { daftarPengguna } from '@/services/pengguna'
import { serahTerimaBendahara } from '@/services/sistem'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const auth = useAuth()
const notif = useNotifikasi()
const router = useRouter()
const langkah = ref(1)
const pengguna = ref([])
const memproses = ref(false)
const selesai = ref(false)

const hariIni = new Date().toISOString().slice(0, 10)
const f = reactive({
  uidBaru: '', tanggal: hariIni, jabatan: ['bendahara_bosp', 'bendahara_gaji'], aksesLama: 'tim_bos', catatan: '',
  nama: '', gelar: '', pangkat: '', nip: '',
})

onMounted(async () => {
  pengguna.value = modePratinjau
    ? [
        { uid: 'pratinjau', nama: 'Ramli, S.Pd., M.Pd., Gr.', email: 'ramli51@guru.sma.belajar.id', peran: ['bendahara'], aktif: true },
        { uid: 'c3', nama: 'Contoh Bendahara Baru, S.Pd.', email: '', peran: ['tim_bos'], aktif: true, nip: '' },
      ]
    : await daftarPengguna()
})

const lama = computed(() => pengguna.value.find((p) => p.peran?.includes('bendahara')) || null)
const calon = computed(() => pengguna.value.filter((p) => p.aktif !== false && p.uid !== lama.value?.uid))
const baru = computed(() => pengguna.value.find((p) => p.uid === f.uidBaru))

watch(baru, (p) => {
  if (!p) return
  const [nama, ...gelar] = (p.nama || '').split(',')
  f.nama = nama.trim(); f.gelar = gelar.join(',').trim(); f.nip = p.nip || ''
})

const langkahList = [
  { no: 1, judul: 'Bendahara baru', ikon: 'UserCog' },
  { no: 2, judul: 'Tanggal & jabatan', ikon: 'CalendarDays' },
  { no: 3, judul: 'Periksa & tetapkan', ikon: 'ShieldCheck' },
]
const bisaLanjut = computed(() => (langkah.value === 1 ? !!f.uidBaru && !!f.nama : langkah.value === 2 ? f.jabatan.length > 0 && !!f.tanggal : true))

// Pekerjaan di luar aplikasi yang ikut berpindah (dicentang manual)
const tugasLuar = reactive([
  { ikon: 'Database', teks: 'Firebase: tambahkan email bendahara baru sebagai Owner (⚙ → Users and permissions).', ok: false },
  { ikon: 'HardDrive', teks: 'Google Drive: bagikan folder SIBOS ke bendahara baru sebagai Editor, atau salin ke akunnya.', ok: false },
  { ikon: 'Link', teks: 'Penghubung Apps Script: bila folder pindah akun, pasang ulang penghubung dan perbarui URL di Pengaturan → Drive & Cadangan.', ok: false },
  { ikon: 'Mail', teks: 'Pastikan akun bendahara baru memakai email aktif agar bisa reset password sendiri.', ok: false },
])

async function tetapkan() {
  memproses.value = true
  try {
    if (!modePratinjau) {
      await serahTerimaBendahara({
        lama: lama.value, baru: baru.value, tanggal: f.tanggal, jabatan: f.jabatan, aksesLama: f.aksesLama, catatan: f.catatan,
        pejabatBaru: { nama: f.nama, gelar: f.gelar, pangkat: f.pangkat, nip: f.nip },
      })
    }
    selesai.value = true
    notif.kabari('Serah terima bendahara tercatat.')
  } catch (e) {
    notif.kabari(e.code === 'permission-denied' ? 'Ditolak: hanya Bendahara atau Kepala Sekolah yang dapat melakukan serah terima.' : e.message, 'galat')
  } finally { memproses.value = false }
}

async function keluarSetelahSelesai() {
  if (lama.value?.uid === auth.pengguna?.uid) { await auth.keluar(); router.replace('/masuk') } else router.replace('/dasbor')
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <!-- Penanda langkah -->
    <ol class="kartu flex items-center gap-2 p-3">
      <li v-for="(l, i) in langkahList" :key="l.no" class="flex flex-1 items-center gap-2">
        <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold transition',
                       selesai || langkah > l.no ? 'bg-emerald-500 text-white' : langkah === l.no ? 'bg-biru text-white shadow' : 'bg-slate-100 text-slate-400 dark:bg-slate-800']">
          <Ikon :nama="selesai || langkah > l.no ? 'CircleCheck' : l.ikon" :ukuran="17" />
        </span>
        <span :class="['hidden text-sm font-semibold sm:block', langkah === l.no ? '' : 'text-slate-400']">{{ l.judul }}</span>
        <span v-if="i < langkahList.length - 1" class="mx-1 h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </li>
    </ol>

    <!-- Selesai -->
    <section v-if="selesai" class="kartu p-6 text-center">
      <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl ikon-chip-sukses"><Ikon nama="CircleCheck" :ukuran="28" /></span>
      <h2 class="mt-4 text-xl font-bold">Serah terima tercatat</h2>
      <p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Mulai {{ tanggalPanjang(f.tanggal) }}, <b>{{ f.nama }}</b> menjadi Bendahara (Admin) SIBOS. Dokumen bertanggal sebelumnya tetap atas nama bendahara lama.
      </p>
      <button class="tombol-utama mt-5" @click="keluarSetelahSelesai"><Ikon nama="CircleCheck" :ukuran="17" /> Selesai</button>
    </section>

    <!-- Langkah 1 -->
    <section v-else-if="langkah === 1" class="kartu space-y-4 p-5">
      <div class="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900/50">
        <span class="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-biru dark:bg-blue-900/40 dark:text-blue-300"><Ikon nama="ShieldCheck" :ukuran="17" /></span>
        <span>Bendahara saat ini: <b>{{ lama?.nama || 'belum ada' }}</b></span>
      </div>
      <div>
        <label class="label" for="calon">Akun bendahara baru</label>
        <select id="calon" v-model="f.uidBaru" class="masukan">
          <option value="" disabled>Pilih dari daftar pengguna…</option>
          <option v-for="p in calon" :key="p.uid" :value="p.uid">{{ p.nama }}{{ p.email ? ` — ${p.email}` : ' — tanpa email' }}</option>
        </select>
        <p class="mt-1.5 text-xs text-slate-500">Belum ada akunnya? Buat dulu di Pengaturan → Pengguna & Peran.</p>
      </div>
      <div v-if="baru && !baru.email" class="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        <Ikon nama="TriangleAlert" :ukuran="17" class="mt-0.5" /> Akun ini belum punya email. Disarankan bendahara memakai email aktif agar bisa memulihkan password sendiri.
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div><label class="label" for="sn">Nama (tanpa gelar)</label><input id="sn" v-model="f.nama" class="masukan" /></div>
        <div><label class="label" for="sg">Gelar</label><input id="sg" v-model="f.gelar" class="masukan" /></div>
        <div><label class="label" for="sp">Pangkat/golongan</label><input id="sp" v-model="f.pangkat" class="masukan" placeholder="mis. Penata Muda Tk. I/III.b" /></div>
        <div><label class="label" for="snip">NIP</label><input id="snip" v-model="f.nip" class="masukan kode" maxlength="18" inputmode="numeric" /></div>
      </div>
    </section>

    <!-- Langkah 2 -->
    <section v-else-if="langkah === 2" class="kartu space-y-4 p-5">
      <div>
        <label class="label" for="tgl">Tanggal serah terima (mulai menjabat)</label>
        <input id="tgl" v-model="f.tanggal" type="date" class="masukan max-w-xs" />
      </div>
      <fieldset>
        <legend class="label">Jabatan yang diserahkan</legend>
        <div class="flex flex-wrap gap-2">
          <label v-for="[k, l, ikon] in [['bendahara_bosp', 'Bendahara BOSP', 'PiggyBank'], ['bendahara_gaji', 'Bendahara Gaji', 'Banknote']]" :key="k"
                 :class="['flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold', f.jabatan.includes(k) ? 'border-biru bg-biru/10 text-biru dark:text-blue-300' : 'border-slate-300 dark:border-slate-600']">
            <input v-model="f.jabatan" type="checkbox" :value="k" class="sr-only" /><Ikon :nama="ikon" :ukuran="16" /> {{ l }}
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend class="label">Akses bendahara lama setelah serah terima</legend>
        <div class="grid gap-2 sm:grid-cols-2">
          <label v-for="[k, l, ket, ikon] in [['tim_bos', 'Tetap sebagai Tim BOS', 'Masih bisa melihat & membantu masa transisi', 'UsersRound'], ['nonaktif', 'Nonaktifkan akun', 'Tidak bisa masuk lagi', 'Power']]" :key="k"
                 :class="['flex cursor-pointer gap-3 rounded-xl border p-3', f.aksesLama === k ? 'border-biru bg-biru/5' : 'border-slate-300 dark:border-slate-600']">
            <input v-model="f.aksesLama" type="radio" :value="k" class="sr-only" />
            <Ikon :nama="ikon" :ukuran="18" :class="f.aksesLama === k ? 'text-biru' : 'text-slate-400'" />
            <span><b class="block text-sm">{{ l }}</b><span class="text-xs text-slate-500">{{ ket }}</span></span>
          </label>
        </div>
      </fieldset>
      <div><label class="label" for="cat">Catatan (opsional)</label><textarea id="cat" v-model="f.catatan" rows="2" class="masukan" placeholder="mis. Berdasarkan SK Kepala Sekolah No. …" /></div>
    </section>

    <!-- Langkah 3 -->
    <section v-else class="space-y-4">
      <div class="kartu p-5">
        <h3 class="mb-3 flex items-center gap-2 font-bold"><Ikon nama="ShieldCheck" :ukuran="19" class="text-biru" /> Ringkasan</h3>
        <div class="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><p class="text-xs text-slate-500">Dari</p><p class="font-semibold">{{ lama?.nama || '—' }}</p></div>
          <Ikon nama="ArrowRightLeft" :ukuran="22" class="mx-auto text-biru" />
          <div class="rounded-xl bg-biru/5 p-3 dark:bg-blue-950/30"><p class="text-xs text-slate-500">Kepada</p><p class="font-semibold">{{ f.nama }}{{ f.gelar ? `, ${f.gelar}` : '' }}</p></div>
        </div>
        <ul class="mt-4 space-y-1.5 text-sm">
          <li class="flex gap-2"><Ikon nama="CalendarDays" :ukuran="16" class="mt-0.5 text-amber-500" /> Mulai {{ tanggalPanjang(f.tanggal) }}; periode lama ditutup sehari sebelumnya.</li>
          <li class="flex gap-2"><Ikon nama="UserCheck" :ukuran="16" class="mt-0.5 text-biru" /> Jabatan: {{ f.jabatan.map((j) => (j === 'bendahara_bosp' ? 'Bendahara BOSP' : 'Bendahara Gaji')).join(' & ') }}</li>
          <li class="flex gap-2"><Ikon nama="UsersRound" :ukuran="16" class="mt-0.5 text-rose-500" /> Bendahara lama: {{ f.aksesLama === 'tim_bos' ? 'tetap sebagai Tim BOS' : 'dinonaktifkan' }}</li>
        </ul>
      </div>
      <div class="kartu p-5">
        <h3 class="mb-1 flex items-center gap-2 font-bold"><Ikon nama="Link" :ukuran="19" class="text-emerald-600" /> Yang perlu dipindahkan di luar SIBOS</h3>
        <p class="mb-3 text-xs text-slate-500">Centang sebagai pengingat; tidak menghalangi penetapan.</p>
        <label v-for="t in tugasLuar" :key="t.teks" class="flex cursor-pointer gap-3 rounded-lg p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
          <input v-model="t.ok" type="checkbox" class="mt-1 accent-biru" />
          <Ikon :nama="t.ikon" :ukuran="16" class="mt-0.5 text-slate-400" /><span :class="t.ok && 'text-slate-400 line-through'">{{ t.teks }}</span>
        </label>
      </div>
    </section>

    <!-- Navigasi -->
    <div v-if="!selesai" class="flex justify-between">
      <button class="tombol-garis" @click="langkah > 1 ? langkah-- : router.back()"><Ikon nama="ArrowLeft" :ukuran="17" /> {{ langkah > 1 ? 'Kembali' : 'Batal' }}</button>
      <button v-if="langkah < 3" class="tombol-utama" :disabled="!bisaLanjut" @click="langkah++">Lanjut <Ikon nama="ChevronRight" :ukuran="17" /></button>
      <button v-else class="tombol-utama" :disabled="memproses" @click="tetapkan">
        <Ikon :nama="memproses ? 'RefreshCw' : 'Repeat'" :ukuran="17" :class="memproses && 'animate-spin'" /> Tetapkan serah terima
      </button>
    </div>
  </div>
</template>
