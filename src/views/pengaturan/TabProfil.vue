<script setup>
import { reactive, ref, onMounted } from 'vue'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'
import { catatAktivitas } from '@/services/log'
import { SEKOLAH_AWAL } from '@/config/sekolahAwal'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'

const notif = useNotifikasi()
const f = reactive({ ...SEKOLAH_AWAL, kop_baris: [...SEKOLAH_AWAL.kop_baris] })
let asli = {}
const memuat = ref(!modePratinjau)
const menyimpan = ref(false)

onMounted(async () => {
  if (modePratinjau) return
  try {
    const s = await getDoc(doc(db, 'sekolah', 'profil'))
    if (s.exists()) { const { diperbarui, ...isi } = s.data(); Object.assign(f, isi); asli = JSON.parse(JSON.stringify(isi)) }
  } finally { memuat.value = false }
})

const kelompok = [
  { judul: 'Identitas', ikon: 'School', warna: 'bg-blue-100 text-biru dark:bg-blue-900/40 dark:text-blue-300', isian: [
    ['nama_arkas', 'Nama versi ARKAS'], ['nama_pemda', 'Nama versi Pemda'], ['npsn', 'NPSN', true], ['status', 'Status'],
  ] },
  { judul: 'Keuangan & Pajak', ikon: 'ReceiptText', warna: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300', isian: [
    ['kode_sekolah_pemda', 'Kode sekolah Pemda (SIMAKDA)', true], ['npwp', 'NPWP satuan pendidikan', true], ['id_subunit', 'ID Subunit e-Bupot', true],
  ] },
  { judul: 'Kontak', ikon: 'Mail', warna: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', isian: [
    ['alamat', 'Alamat'], ['telepon', 'Telepon'], ['email', 'Email'],
  ] },
]

async function simpan() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau: profil tidak disimpan.', 'info')
  menyimpan.value = true
  try {
    const data = JSON.parse(JSON.stringify(f))
    await setDoc(doc(db, 'sekolah', 'profil'), { ...data, diperbarui: serverTimestamp() }, { merge: true })
    const berubah = Object.keys(data).filter((k) => JSON.stringify(data[k]) !== JSON.stringify(asli[k]))
    await catatAktivitas('ubah', `Memperbarui profil sekolah${berubah.length ? ': ' + berubah.join(', ') : ''}`, {
      koleksi: 'sekolah', id: 'profil',
      sebelum: Object.fromEntries(berubah.map((k) => [k, asli[k] ?? null])),
      sesudah: Object.fromEntries(berubah.map((k) => [k, data[k]])),
    })
    asli = data
    notif.kabari('Profil sekolah tersimpan.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
</script>

<template>
  <div v-if="memuat" class="kartu p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat profil…</div>
  <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div class="space-y-5">
      <section v-for="k in kelompok" :key="k.judul" class="kartu p-5">
        <h3 class="mb-4 flex items-center gap-2.5 font-bold">
          <span :class="['grid h-8 w-8 place-items-center rounded-lg', k.warna]"><Ikon :nama="k.ikon" :ukuran="17" /></span>{{ k.judul }}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="[kunci, label, mono] in k.isian" :key="kunci" :class="kunci.startsWith('nama') || kunci === 'alamat' ? 'sm:col-span-2' : ''">
            <label class="label" :for="kunci">{{ label }}</label>
            <input :id="kunci" v-model="f[kunci]" :class="['masukan', mono && 'kode']" :placeholder="kunci === 'id_subunit' ? 'Diisi Bendahara' : ''" />
          </div>
        </div>
      </section>

    </div>

    <!-- Simpan -->
    <section class="kartu h-fit space-y-3 p-5 xl:sticky xl:top-24">
      <h3 class="flex items-center gap-2.5 font-bold">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="Save" :ukuran="17" /></span>
        Simpan perubahan
      </h3>
      <p class="text-sm text-slate-500">Data ini dipakai di dokumen SPJ, laporan, dan panduan input ARKAS & SIMAKDA.</p>
      <button class="tombol-utama w-full" :disabled="menyimpan" @click="simpan">
        <Ikon :nama="menyimpan ? 'RefreshCw' : 'CircleCheck'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan profil
      </button>
      <RouterLink to="/pengaturan/kop" class="flex items-center gap-1.5 text-sm font-semibold text-biru hover:underline">
        <Ikon nama="FileSignature" :ukuran="15" /> Atur kop surat & logo
      </RouterLink>
    </section>
  </div>
</template>
