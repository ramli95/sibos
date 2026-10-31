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
    data.kop_baris = data.kop_baris.map((b) => b.trim()).filter(Boolean)
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
  <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
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

      <section class="kartu p-5">
        <h3 class="mb-4 flex items-center gap-2.5 font-bold">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"><Ikon nama="FileSignature" :ukuran="17" /></span>Baris kop surat
        </h3>
        <div class="space-y-2">
          <div v-for="(b, i) in f.kop_baris" :key="i" class="flex gap-2">
            <span class="grid h-10 w-8 shrink-0 place-items-center text-sm font-bold text-slate-400">{{ i + 1 }}</span>
            <input v-model="f.kop_baris[i]" class="masukan" />
            <button type="button" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Hapus baris" @click="f.kop_baris.splice(i, 1)"><Ikon nama="X" :ukuran="17" /></button>
          </div>
          <button type="button" class="tombol-garis" @click="f.kop_baris.push('')"><Ikon nama="Plus" :ukuran="16" /> Tambah baris</button>
        </div>
      </section>
    </div>

    <!-- Pratinjau kop surat F4 -->
    <section class="kartu h-fit p-5 xl:sticky xl:top-24">
      <h3 class="mb-3 flex items-center gap-2.5 font-bold">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"><Ikon nama="Printer" :ukuran="17" /></span>
        Pratinjau kop surat
      </h3>
      <div class="rounded-lg bg-white p-4 text-black shadow-inner ring-1 ring-slate-200" style="font-family: 'Times New Roman', Times, serif">
        <div class="flex items-center gap-2 border-b-[3px] border-double border-black pb-2">
          <div class="grid h-12 w-10 shrink-0 place-items-center rounded border border-dashed border-slate-400 text-[8px] text-slate-500">Logo Pemkot</div>
          <div class="flex-1 text-center leading-tight">
            <div v-for="(b, i) in f.kop_baris" :key="i" :class="i === f.kop_baris.length - 1 ? 'text-[13px] font-bold' : 'text-[11px] font-bold'">{{ b }}</div>
            <div class="text-[9px]">{{ f.alamat }} Telp. {{ f.telepon }}</div>
            <div class="text-[9px]">NPSN {{ f.npsn }} · Email: {{ f.email }}</div>
          </div>
          <div class="grid h-12 w-10 shrink-0 place-items-center rounded border border-dashed border-slate-400 text-[8px] text-slate-500">Tut Wuri</div>
        </div>
      </div>
      <p class="mt-3 flex gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Ikon nama="Info" :ukuran="14" class="mt-0.5" /> Logo Pemkot & Tut Wuri diunggah di tab Kop & Logo.
      </p>
      <button class="tombol-utama mt-4 w-full" :disabled="menyimpan" @click="simpan">
        <Ikon :nama="menyimpan ? 'RefreshCw' : 'CircleCheck'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan profil
      </button>
    </section>
  </div>
</template>
