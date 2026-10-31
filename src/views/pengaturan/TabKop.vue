<script setup>
import { ref, onMounted } from 'vue'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { catatAktivitas } from '@/services/log'
import { unggahBerkas } from '@/services/penghubung'
import { kecilkanGambar } from '@/utils/gambar'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'
import KopSurat from '@/components/cetak/KopSurat.vue'

const notif = useNotifikasi()
const profil = ref(null)
const sibuk = ref('')

onMounted(async () => { profil.value = await muatProfilSekolah() })

const LOGO = [
  { kunci: 'logo_pemkot', judul: 'Logo Pemerintah Kota Makassar', posisi: 'Kiri', warna: 'from-rose-400 to-red-500' },
  { kunci: 'logo_tutwuri', judul: 'Logo Tut Wuri Handayani', posisi: 'Kanan', warna: 'from-sky-400 to-blue-600' },
]

async function pilih(kunci, e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return
  sibuk.value = kunci
  try {
    const url = await kecilkanGambar(f, { maks: 360, batasKb: 250 })
    profil.value[kunci] = url
    if (!modePratinjau) {
      await setDoc(doc(db, 'sekolah', 'profil'), { [kunci]: url, diperbarui: serverTimestamp() }, { merge: true })
      await catatAktivitas('ubah', `Mengganti ${kunci === 'logo_pemkot' ? 'logo Pemkot' : 'logo Tut Wuri'} pada kop surat`, { koleksi: 'sekolah', id: 'profil' })
      // arsip berkas asli ke Drive (tidak menghalangi bila penghubung belum siap)
      unggahBerkas(f, ['Pengaturan'], `${kunci}_${f.name}`).catch(() => {})
    }
    notif.kabari('Logo tersimpan.')
  } catch (err) { notif.kabari(err.message, 'galat') } finally { sibuk.value = '' }
}

async function hapus(kunci) {
  if (!confirm('Hapus logo ini dari kop surat?')) return
  profil.value[kunci] = null
  if (!modePratinjau) await setDoc(doc(db, 'sekolah', 'profil'), { [kunci]: null, diperbarui: serverTimestamp() }, { merge: true })
}
</script>

<template>
  <div v-if="!profil" class="kartu p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
  <div v-else class="space-y-5">
    <div class="grid gap-4 md:grid-cols-2">
      <section v-for="l in LOGO" :key="l.kunci" class="kartu flex items-center gap-4 p-5">
        <div class="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-slate-200">
          <img v-if="profil[l.kunci]" :src="profil[l.kunci]" :alt="l.judul" class="max-h-20 max-w-20 object-contain" />
          <Ikon v-else nama="Image" :ukuran="30" class="text-slate-300" />
        </div>
        <div class="min-w-0 flex-1 space-y-2">
          <p class="flex items-center gap-2 font-bold"><span :class="['h-2.5 w-2.5 rounded-full bg-gradient-to-br', l.warna]" />{{ l.judul }}</p>
          <p class="text-xs text-slate-500">Posisi {{ l.posisi.toLowerCase() }} kop · PNG/JPG, latar transparan lebih baik.</p>
          <div class="flex flex-wrap gap-2">
            <label class="tombol-garis cursor-pointer px-3 py-2">
              <Ikon :nama="sibuk === l.kunci ? 'RefreshCw' : 'Upload'" :ukuran="16" :class="sibuk === l.kunci && 'animate-spin'" /> {{ profil[l.kunci] ? 'Ganti' : 'Unggah' }}
              <input type="file" accept="image/*" class="sr-only" @change="pilih(l.kunci, $event)" />
            </label>
            <button v-if="profil[l.kunci]" class="tombol px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="hapus(l.kunci)"><Ikon nama="Trash2" :ukuran="16" /></button>
          </div>
        </div>
      </section>
    </div>

    <section class="kartu p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h3 class="flex flex-1 items-center gap-2 font-bold"><Ikon nama="Printer" :ukuran="18" class="text-merah" /> Pratinjau kop (lebar F4)</h3>
        <RouterLink to="/pengaturan/profil" class="tombol-garis px-3 py-2"><Ikon nama="Pencil" :ukuran="16" /> Ubah baris kop</RouterLink>
        <RouterLink to="/cetak/uji" class="tombol-utama px-3 py-2"><Ikon nama="Printer" :ukuran="16" /> Uji cetak F4</RouterLink>
      </div>
      <div class="overflow-x-auto rounded-xl bg-slate-100 p-4 dark:bg-slate-900">
        <div class="mx-auto bg-white p-[1cm] shadow" style="width: 215mm; min-width: 215mm">
          <KopSurat :profil="profil" />
        </div>
      </div>
    </section>
  </div>
</template>
