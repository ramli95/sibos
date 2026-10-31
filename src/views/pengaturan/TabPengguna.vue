<script setup>
import { ref, reactive, onMounted } from 'vue'
import { PERAN, SEMUA_PERAN } from '@/config/peran'
import { modePratinjau } from '@/services/firebase'
import { daftarPengguna, buatPengguna, ubahPeran } from '@/services/pengguna'
import { panggilPenghubung } from '@/services/penghubung'
import { useNotifikasi } from '@/stores/notifikasi'
import { useAuth } from '@/stores/auth'
import Ikon from '@/components/Ikon.vue'

const notif = useNotifikasi()
const auth = useAuth()
const daftar = ref([])
const memuat = ref(true)
const formTerbuka = ref(false)
const hasilAkun = ref(null)
const f = reactive({ nama: '', username: '', email: '', nip: '', peran: ['tim_bos'] })

const CONTOH = [
  { uid: 'pratinjau', nama: 'Ramli, S.Pd., M.Pd., Gr.', username: 'ramli', email: 'ramli51@guru.sma.belajar.id', peran: ['bendahara'], aktif: true },
  { uid: 'c2', nama: 'Muhammad Warham, S.Ag., M.Pd.I.', username: 'warham', email: '', peran: ['kepala_sekolah'], aktif: true, wajib_ganti_password: true },
]

async function muat() {
  memuat.value = true
  try { daftar.value = modePratinjau ? CONTOH : await daftarPengguna() } finally { memuat.value = false }
}
onMounted(muat)

async function simpan() {
  if (!f.peran.length) return notif.kabari('Pilih minimal satu peran.', 'galat')
  if (modePratinjau) return notif.kabari('Mode Pratinjau: akun tidak disimpan.', 'info')
  try {
    hasilAkun.value = await buatPengguna({ ...f })
    Object.assign(f, { nama: '', username: '', email: '', nip: '', peran: ['tim_bos'] })
    formTerbuka.value = false
    await muat()
  } catch (e) { notif.kabari(e.message, 'galat') }
}

async function alihPeran(p, kunci) {
  if (kunci === 'bendahara') return notif.kabari('Peran Bendahara dialihkan lewat Serah Terima Bendahara.', 'info')
  const baru = p.peran.includes(kunci) ? p.peran.filter((x) => x !== kunci) : [...p.peran, kunci]
  if (modePratinjau) { p.peran = baru; return }
  try { await ubahPeran(p, baru, p.aktif !== false); p.peran = baru; notif.kabari('Peran diperbarui.') } catch (e) { notif.kabari(e.message, 'galat') }
}

async function alihAktif(p) {
  if (p.uid === auth.pengguna?.uid) return notif.kabari('Anda tidak dapat menonaktifkan akun sendiri.', 'galat')
  const aktif = p.aktif === false
  if (modePratinjau) { p.aktif = aktif; return }
  try { await ubahPeran(p, p.peran, aktif); p.aktif = aktif } catch (e) { notif.kabari(e.message, 'galat') }
}

const mereset = ref('')
async function resetPassword(p) {
  if (!confirm(`Buat password sementara untuk ${p.nama}? Password lamanya tidak berlaku lagi.`)) return
  mereset.value = p.uid
  try {
    const r = await panggilPenghubung('reset_password', { uid: p.uid })
    hasilAkun.value = { username: r.username, password: r.password, reset: true }
    p.wajib_ganti_password = true
  } catch (e) { notif.kabari(e.message, 'galat') } finally { mereset.value = '' }
}

const salin = (t) => navigator.clipboard?.writeText(t).then(() => notif.kabari('Disalin.'))
</script>

<template>
  <div class="space-y-5">
    <!-- Kartu peralihan bendahara -->
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-biru p-5 text-white shadow">
      <div class="flex flex-wrap items-center gap-4">
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Ikon nama="Repeat" :ukuran="24" /></span>
        <div class="min-w-0 flex-1">
          <h3 class="text-lg font-bold">Serah Terima Bendahara</h3>
          <p class="text-sm text-white/85">Alihkan peran Admin ke bendahara baru: akun, periode pejabat, dan pemilik sistem berpindah sekaligus, tercatat di log.</p>
        </div>
        <RouterLink to="/serah-terima" class="tombol bg-white text-navy hover:bg-blue-50"><Ikon nama="ArrowRightLeft" :ukuran="17" /> Mulai serah terima</RouterLink>
      </div>
    </section>

    <!-- Akun baru dibuat -->
    <section v-if="hasilAkun" class="kartu border-emerald-300 p-5 dark:border-emerald-700">
      <h3 class="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300"><Ikon nama="CircleCheck" :ukuran="19" /> {{ hasilAkun.reset ? 'Password sementara dibuat' : 'Akun berhasil dibuat' }}</h3>
      <p class="mt-1 text-sm text-slate-500">Berikan data ini kepada pemilik akun. Password sementara hanya tampil sekali; saat login pertama ia wajib membuat password sendiri.</p>
      <div class="mt-3 flex flex-wrap gap-3">
        <div class="rounded-xl bg-slate-100 px-4 py-2 dark:bg-slate-800"><span class="text-xs text-slate-500">Username</span><p class="kode font-semibold">{{ hasilAkun.username }}</p></div>
        <div class="rounded-xl bg-slate-100 px-4 py-2 dark:bg-slate-800"><span class="text-xs text-slate-500">Password sementara</span><p class="kode font-semibold">{{ hasilAkun.password }}</p></div>
        <button class="tombol-garis" @click="salin(`Username: ${hasilAkun.username}\nPassword sementara: ${hasilAkun.password}`)"><Ikon nama="Copy" :ukuran="16" /> Salin</button>
        <button class="tombol-garis" @click="hasilAkun = null"><Ikon nama="X" :ukuran="16" /> Tutup</button>
      </div>
    </section>

    <!-- Daftar pengguna -->
    <section class="kartu overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
        <h3 class="flex items-center gap-2.5 font-bold">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300"><Ikon nama="UsersRound" :ukuran="17" /></span>
          Pengguna & Peran
        </h3>
        <button class="tombol-utama" @click="formTerbuka = !formTerbuka"><Ikon nama="UserPlus" :ukuran="17" /> Tambah pengguna</button>
      </div>

      <form v-if="formTerbuka" class="grid gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/40" @submit.prevent="simpan">
        <div><label class="label" for="pn">Nama lengkap & gelar</label><input id="pn" v-model="f.nama" class="masukan" required /></div>
        <div><label class="label" for="pu">Username</label><input id="pu" v-model="f.username" class="masukan" autocapitalize="none" required placeholder="huruf kecil, mis. warham" /></div>
        <div><label class="label" for="pe">Email (opsional, untuk lupa password)</label><input id="pe" v-model="f.email" type="email" class="masukan" /></div>
        <div><label class="label" for="pnip">NIP (opsional)</label><input id="pnip" v-model="f.nip" class="masukan kode" maxlength="18" inputmode="numeric" /></div>
        <fieldset class="sm:col-span-2">
          <legend class="label">Peran</legend>
          <div class="flex flex-wrap gap-2">
            <label v-for="k in SEMUA_PERAN.filter((x) => x !== 'bendahara')" :key="k"
                   :class="['flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
                            f.peran.includes(k) ? 'border-biru bg-biru/10 text-biru dark:text-blue-300' : 'border-slate-300 dark:border-slate-600']">
              <input v-model="f.peran" type="checkbox" :value="k" class="sr-only" /><Ikon :nama="PERAN[k].ikon" :ukuran="15" /> {{ PERAN[k].label }}
            </label>
          </div>
        </fieldset>
        <div class="flex gap-2 sm:col-span-2">
          <button class="tombol-utama"><Ikon nama="UserPlus" :ukuran="17" /> Buat akun</button>
          <button type="button" class="tombol-garis" @click="formTerbuka = false">Batal</button>
        </div>
      </form>

      <div v-if="memuat" class="p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
      <ul v-else class="divide-y divide-slate-200 dark:divide-slate-700">
        <li v-for="p in daftar" :key="p.uid" :class="['flex flex-wrap items-center gap-3 p-4', p.aktif === false && 'opacity-55']">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-biru text-sm font-bold text-white">{{ p.nama?.[0] }}</span>
          <div class="min-w-[12rem] flex-1">
            <p class="font-semibold">{{ p.nama }}</p>
            <p class="text-xs text-slate-500">@{{ p.username }}<template v-if="p.email"> · {{ p.email }}</template>
              <span v-if="p.wajib_ganti_password" class="ml-1 text-amber-600">· belum login pertama</span></p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="k in SEMUA_PERAN" :key="k" type="button" @click="alihPeran(p, k)" :title="k === 'bendahara' ? 'Dialihkan lewat Serah Terima' : 'Klik untuk memberi/mencabut peran'"
                    :class="['lencana transition', p.peran?.includes(k) ? PERAN[k].warna : 'bg-transparent text-slate-400 ring-1 ring-inset ring-slate-200 hover:text-slate-600 dark:ring-slate-700']">
              <Ikon :nama="PERAN[k].ikon" :ukuran="12" /> {{ PERAN[k].singkat }}
            </button>
          </div>
          <button v-if="p.uid !== auth.pengguna?.uid" type="button" @click="resetPassword(p)" title="Reset password (password sementara)" :disabled="mereset === p.uid"
                  class="grid h-9 w-9 place-items-center rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40">
            <Ikon nama="KeyRound" :ukuran="17" :class="mereset === p.uid && 'animate-pulse'" />
          </button>
          <button type="button" @click="alihAktif(p)" :title="p.aktif === false ? 'Aktifkan' : 'Nonaktifkan'"
                  :class="['grid h-9 w-9 place-items-center rounded-lg', p.aktif === false ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40']">
            <Ikon nama="Power" :ukuran="17" />
          </button>
        </li>
      </ul>
      <p class="flex gap-2 border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
        <Ikon nama="Info" :ukuran="14" class="mt-0.5" /> Tombol kunci kuning membuat password sementara (lewat penghubung Apps Script). Pengguna yang punya email juga bisa memakai "Lupa password" sendiri.
      </p>
    </section>
  </div>
</template>
