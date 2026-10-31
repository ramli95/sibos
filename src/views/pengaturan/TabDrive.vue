<script setup>
import { reactive, ref, onMounted } from 'vue'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'
import { bacaPenghubung } from '@/services/sistem'
import { panggilPenghubung, lupakanUrl } from '@/services/penghubung'
import { catatAktivitas } from '@/services/log'
import { ID_FOLDER_DRIVE_AWAL } from '@/config/sekolahAwal'
import { useNotifikasi } from '@/stores/notifikasi'
import { tanggalPanjang, formatWaktuRelatif } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const notif = useNotifikasi()
const f = reactive({ url_apps_script: '', id_folder_drive: ID_FOLDER_DRIVE_AWAL })
const cadangan = ref(null)
const uji = ref(null) // { ok, pesan, folder, pemilik }
const sibuk = ref('')

async function muatCadangan() {
  if (modePratinjau) return
  const s = await getDoc(doc(db, 'sistem', 'cadangan'))
  cadangan.value = s.exists() ? s.data() : null
}

onMounted(async () => {
  if (modePratinjau) return
  Object.assign(f, await bacaPenghubung())
  await muatCadangan()
})

const urlSah = (u) => /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/.test(u.trim())

async function simpan() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau: pengaturan tidak disimpan.', 'info')
  if (f.url_apps_script && !urlSah(f.url_apps_script)) return notif.kabari('URL harus berbentuk https://script.google.com/macros/s/…/exec', 'galat')
  sibuk.value = 'simpan'
  try {
    await setDoc(doc(db, 'sistem', 'penghubung'), { url_apps_script: f.url_apps_script.trim(), id_folder_drive: f.id_folder_drive.trim(), diperbarui: serverTimestamp() }, { merge: true })
    lupakanUrl()
    await catatAktivitas('ubah', 'Memperbarui pengaturan penghubung Google Drive', { koleksi: 'sistem', id: 'penghubung' })
    notif.kabari('Pengaturan Drive tersimpan.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}

async function ujiSambungan() {
  sibuk.value = 'uji'
  uji.value = null
  try {
    const r = await panggilPenghubung('ping', {}, { url: f.url_apps_script.trim() })
    uji.value = { ok: true, ...r }
  } catch (e) { uji.value = { ok: false, pesan: e.message } } finally { sibuk.value = '' }
}

async function cadangkanSekarang() {
  sibuk.value = 'cadang'
  try {
    const r = await panggilPenghubung('cadangkan')
    notif.kabari(`Cadangan selesai: ${r.jumlah_dokumen} dokumen.`)
    await muatCadangan()
  } catch (e) { notif.kabari(e.message, 'galat'); await muatCadangan() } finally { sibuk.value = '' }
}

const susunan = [
  ['SIBOS/2026/10 Oktober/SPJ', 'text-merah'], ['SIBOS/2026/10 Oktober/Laporan', 'text-kuning'],
  ['SIBOS/2026/Pajak', 'text-tosca'], ['SIBOS/Kepegawaian', 'text-langit'], ['SIBOS/Cadangan', 'text-ungu'],
]
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
    <section class="kartu space-y-4 p-5">
      <h3 class="flex items-center gap-2.5 font-bold">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="HardDrive" :ukuran="17" /></span>
        Penghubung Google Drive
      </h3>
      <div>
        <label class="label" for="ua">URL Web App Apps Script</label>
        <input id="ua" v-model="f.url_apps_script" class="masukan kode" placeholder="https://script.google.com/macros/s/…/exec" />
        <p class="mt-1.5 text-xs text-slate-500">Bila bendahara berganti akun, cukup perbarui URL ini — tanpa mengubah kode.</p>
      </div>
      <div>
        <label class="label" for="fd">ID folder SIBOS</label>
        <input id="fd" v-model="f.id_folder_drive" class="masukan kode" />
        <a :href="`https://drive.google.com/drive/folders/${f.id_folder_drive}`" target="_blank" rel="noopener" class="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-biru hover:underline">
          <Ikon nama="Link" :ukuran="13" /> Buka folder di Drive
        </a>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tombol-utama" :disabled="!!sibuk" @click="simpan"><Ikon nama="CircleCheck" :ukuran="17" /> Simpan</button>
        <button class="tombol-garis" :disabled="!!sibuk || !f.url_apps_script" @click="ujiSambungan">
          <Ikon nama="RefreshCw" :ukuran="17" :class="sibuk === 'uji' && 'animate-spin'" /> Uji sambungan
        </button>
      </div>

      <div v-if="uji" :class="['flex gap-3 rounded-xl p-3.5 text-sm', uji.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200']">
        <Ikon :nama="uji.ok ? 'CircleCheck' : 'TriangleAlert'" :ukuran="19" />
        <div v-if="uji.ok">
          <b>Tersambung.</b> Folder induk: <b>{{ uji.folder }}</b> · pemilik penghubung: {{ uji.pemilik }}.
          <span class="block text-xs opacity-80">Jangan lupa klik Simpan bila URL baru.</span>
        </div>
        <div v-else><b>Gagal.</b> {{ uji.pesan }}</div>
      </div>
    </section>

    <section class="kartu h-fit space-y-3 p-5">
      <h3 class="flex items-center gap-2 font-bold"><Ikon nama="CloudUpload" :ukuran="18" class="text-tosca" /> Cadangan otomatis</h3>

      <div v-if="cadangan?.status === 'gagal'" class="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
        <Ikon nama="TriangleAlert" :ukuran="17" class="mt-0.5" />
        <span><b>Cadangan terakhir gagal</b> ({{ formatWaktuRelatif(cadangan.terakhir_gagal) }}). {{ cadangan.pesan }}</span>
      </div>
      <div v-if="cadangan?.terakhir" class="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 p-3.5 text-sm dark:from-teal-950/40 dark:to-emerald-950/30">
        <p class="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Berhasil terakhir</p>
        <p class="mt-0.5 font-bold">{{ tanggalPanjang(cadangan.terakhir) }} · {{ formatWaktuRelatif(cadangan.terakhir) }}</p>
        <p class="text-slate-600 dark:text-slate-300">{{ cadangan.jumlah_dokumen }} dokumen dari {{ cadangan.jumlah_koleksi }} koleksi</p>
        <div class="mt-2 flex flex-wrap gap-3">
          <a v-if="cadangan.tautan_sheet" :href="cadangan.tautan_sheet" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"><Ikon nama="FileSpreadsheet" :ukuran="14" /> Buka spreadsheet</a>
          <a v-if="cadangan.tautan_json" :href="cadangan.tautan_json" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-semibold text-biru hover:underline"><Ikon nama="Download" :ukuran="14" /> JSON lengkap</a>
        </div>
      </div>
      <p v-else-if="!cadangan" class="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900/50">Belum ada cadangan.</p>

      <p class="text-xs text-slate-500">Harian pukul 23.00 WITA ke spreadsheet <b>SIBOS Cadangan {{ new Date().getFullYear() }}</b>; tiap Minggu + tiap cadangan manual juga disimpan sebagai JSON (12 versi terakhir).</p>
      <button class="tombol w-full bg-tosca text-white hover:bg-teal-600" :disabled="!!sibuk || !f.url_apps_script" @click="cadangkanSekarang">
        <Ikon :nama="sibuk === 'cadang' ? 'RefreshCw' : 'CloudUpload'" :ukuran="17" :class="sibuk === 'cadang' && 'animate-spin'" />
        {{ sibuk === 'cadang' ? 'Mencadangkan…' : 'Cadangkan sekarang' }}
      </button>

      <div class="border-t border-slate-200 pt-3 dark:border-slate-700">
        <p class="mb-1.5 text-xs font-semibold text-slate-500">Susunan folder</p>
        <ul class="space-y-1">
          <li v-for="[s, w] in susunan" :key="s" class="kode flex items-center gap-2 text-xs"><Ikon nama="HardDrive" :ukuran="13" :class="w" /> {{ s }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>
