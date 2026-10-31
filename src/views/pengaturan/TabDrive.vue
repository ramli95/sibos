<script setup>
import { reactive, ref, onMounted } from 'vue'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'
import { bacaPenghubung } from '@/services/sistem'
import { catatAktivitas } from '@/services/log'
import { ID_FOLDER_DRIVE_AWAL } from '@/config/sekolahAwal'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'

const notif = useNotifikasi()
const f = reactive({ url_apps_script: '', id_folder_drive: ID_FOLDER_DRIVE_AWAL })
const menyimpan = ref(false)

onMounted(async () => { if (!modePratinjau) Object.assign(f, await bacaPenghubung()) })

async function simpan() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau: pengaturan tidak disimpan.', 'info')
  menyimpan.value = true
  try {
    await setDoc(doc(db, 'sistem', 'penghubung'), { url_apps_script: f.url_apps_script.trim(), id_folder_drive: f.id_folder_drive.trim(), diperbarui: serverTimestamp() }, { merge: true })
    await catatAktivitas('ubah', 'Memperbarui pengaturan penghubung Google Drive', { koleksi: 'sistem', id: 'penghubung' })
    notif.kabari('Pengaturan Drive tersimpan.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

const susunan = [
  ['SIBOS/2026/10 Oktober/SPJ', 'text-merah'], ['SIBOS/2026/10 Oktober/Laporan', 'text-kuning'],
  ['SIBOS/2026/Pajak', 'text-tosca'], ['SIBOS/Kepegawaian', 'text-langit'], ['SIBOS/Cadangan', 'text-ungu'],
]
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
    <section class="kartu space-y-4 p-5">
      <h3 class="flex items-center gap-2.5 font-bold">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="HardDrive" :ukuran="17" /></span>
        Penghubung Google Drive
      </h3>
      <div>
        <label class="label" for="fd">ID folder SIBOS</label>
        <input id="fd" v-model="f.id_folder_drive" class="masukan kode" />
        <a :href="`https://drive.google.com/drive/folders/${f.id_folder_drive}`" target="_blank" rel="noopener" class="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-biru hover:underline">
          <Ikon nama="Link" :ukuran="13" /> Buka folder di Drive
        </a>
      </div>
      <div>
        <label class="label" for="ua">URL Web App Apps Script</label>
        <input id="ua" v-model="f.url_apps_script" class="masukan kode" placeholder="https://script.google.com/macros/s/…/exec" />
        <p class="mt-1.5 text-xs text-slate-500">Diisi setelah penghubung dipasang (langkah berikutnya). Bila bendahara berganti akun, cukup perbarui di sini — tanpa mengubah kode.</p>
      </div>
      <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon nama="CircleCheck" :ukuran="17" /> Simpan</button>
    </section>

    <section class="kartu h-fit space-y-3 p-5">
      <h3 class="flex items-center gap-2 font-bold"><Ikon nama="CloudUpload" :ukuran="18" class="text-tosca" /> Cadangan & susunan folder</h3>
      <ul class="space-y-1.5">
        <li v-for="[s, w] in susunan" :key="s" class="kode flex items-center gap-2 text-xs"><Ikon nama="HardDrive" :ukuran="14" :class="w" /> {{ s }}</li>
      </ul>
      <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
        Cadangan harian 23.00 WITA ke <b>SIBOS Cadangan 2026</b> + JSON mingguan (12 versi). Aktif setelah penghubung terpasang.
      </div>
      <button class="tombol-garis w-full" disabled><Ikon nama="CloudUpload" :ukuran="17" /> Cadangkan sekarang</button>
    </section>
  </div>
</template>
