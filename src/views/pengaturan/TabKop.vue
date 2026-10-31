<script setup>
import { ref, reactive, onMounted } from 'vue'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { catatAktivitas } from '@/services/log'
import { unggahBerkas } from '@/services/penghubung'
import { kecilkanGambar, gambarDariTautan } from '@/utils/gambar'
import { kopBawaan, HURUF_KOP, GARIS_KOP } from '@/config/sekolahAwal'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'
import KopSurat from '@/components/cetak/KopSurat.vue'
import JendelaUjiCetak from '@/components/cetak/JendelaUjiCetak.vue'

const notif = useNotifikasi()
const profil = ref(null)
const kop = ref(null)
const sibuk = ref('')
const tautan = reactive({ logo_pemkot: '', logo_tutwuri: '' })
const modeLogo = reactive({ logo_pemkot: 'unggah', logo_tutwuri: 'unggah' })
const ujiCetak = ref(false)

onMounted(async () => {
  profil.value = await muatProfilSekolah()
  kop.value = JSON.parse(JSON.stringify(profil.value.kop?.baris?.length ? profil.value.kop : kopBawaan(profil.value)))
  if (!['tunggal', 'ganda', 'tidak'].includes(kop.value.garis)) kop.value.garis = 'tunggal'
  kop.value.tebal_garis ??= 0.5
})

const LOGO = [
  { kunci: 'logo_pemkot', judul: 'Logo Pemerintah Kota Makassar', posisi: 'kiri', warna: 'from-rose-400 to-red-500' },
  { kunci: 'logo_tutwuri', judul: 'Logo Tut Wuri Handayani', posisi: 'kanan', warna: 'from-sky-400 to-blue-600' },
]

async function simpanLogo(kunci, nilai, keterangan) {
  profil.value[kunci] = nilai
  if (modePratinjau) return
  await setDoc(doc(db, 'sekolah', 'profil'), { [kunci]: nilai, diperbarui: serverTimestamp() }, { merge: true })
  await catatAktivitas('ubah', keterangan, { koleksi: 'sekolah', id: 'profil' })
}

async function pilihBerkas(kunci, e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return
  sibuk.value = kunci
  try {
    await simpanLogo(kunci, await kecilkanGambar(f, { maks: 400, batasKb: 250 }), `Mengunggah ${kunci === 'logo_pemkot' ? 'logo Pemkot' : 'logo Tut Wuri'}`)
    if (!modePratinjau) unggahBerkas(f, ['Pengaturan'], `${kunci}_${f.name}`).catch(() => {})
    notif.kabari('Logo tersimpan.')
  } catch (err) { notif.kabari(err.message, 'galat') } finally { sibuk.value = '' }
}

async function ambilTautan(kunci) {
  if (!tautan[kunci].trim()) return
  sibuk.value = kunci
  try {
    const { nilai, tersalin } = await gambarDariTautan(tautan[kunci], { maks: 400, batasKb: 250 })
    await simpanLogo(kunci, nilai, `Mengambil ${kunci === 'logo_pemkot' ? 'logo Pemkot' : 'logo Tut Wuri'} dari tautan`)
    tautan[kunci] = ''
    notif.kabari(tersalin ? 'Logo diambil dan disimpan di SIBOS.' : 'Logo disimpan sebagai tautan. Situs asal tidak mengizinkan penyalinan, jadi logo hilang bila tautannya mati — sebaiknya unduh lalu unggah.', tersalin ? 'sukses' : 'info')
  } catch (err) { notif.kabari(err.message, 'galat') } finally { sibuk.value = '' }
}

async function hapusLogo(kunci) {
  if (confirm('Hapus logo ini dari kop surat?')) await simpanLogo(kunci, null, 'Menghapus logo kop surat')
}

// ---- editor baris kop ----
const tambahBaris = () => kop.value.baris.push({ teks: '', ukuran: 11, tebal: false })
const geser = (i, arah) => { const b = kop.value.baris; const j = i + arah; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j], b[i]] }
const kembalikanBawaan = () => { if (confirm('Kembalikan susunan kop ke bawaan tata naskah?')) kop.value = kopBawaan(profil.value) }

async function simpanKop() {
  const data = { ...kop.value, baris: kop.value.baris.filter((b) => b.teks.trim()).map((b) => ({ ...b, teks: b.teks.trim(), ukuran: Number(b.ukuran) || 11 })) }
  profil.value.kop = data
  if (modePratinjau) return notif.kabari('Mode Pratinjau: tidak disimpan.', 'info')
  sibuk.value = 'kop'
  try {
    await setDoc(doc(db, 'sekolah', 'profil'), { kop: data, diperbarui: serverTimestamp() }, { merge: true })
    await catatAktivitas('ubah', 'Memperbarui susunan kop surat', { koleksi: 'sekolah', id: 'profil' })
    notif.kabari('Kop surat tersimpan.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
</script>

<template>
  <div v-if="!profil || !kop" class="kartu p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat…</div>
  <div v-else class="space-y-5">
    <!-- Logo -->
    <div class="grid gap-4 md:grid-cols-2">
      <section v-for="l in LOGO" :key="l.kunci" class="kartu space-y-3 p-5">
        <div class="flex items-center gap-4">
          <div class="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-slate-200">
            <img v-if="profil[l.kunci]" :src="profil[l.kunci]" :alt="l.judul" class="max-h-16 max-w-16 object-contain" />
            <Ikon v-else nama="Image" :ukuran="28" class="text-slate-300" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 font-bold"><span :class="['h-2.5 w-2.5 rounded-full bg-gradient-to-br', l.warna]" />{{ l.judul }}</p>
            <p class="text-xs text-slate-500">Posisi {{ l.posisi }} kop · PNG latar transparan paling rapi.</p>
            <p v-if="profil[l.kunci]" class="mt-1 text-xs" :class="profil[l.kunci].startsWith('data:') ? 'text-emerald-600' : 'text-amber-600'">
              {{ profil[l.kunci].startsWith('data:') ? 'Tersimpan di SIBOS' : 'Tersimpan sebagai tautan' }}
            </p>
          </div>
          <button v-if="profil[l.kunci]" class="grid h-9 w-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Hapus logo" @click="hapusLogo(l.kunci)"><Ikon nama="Trash2" :ukuran="16" /></button>
        </div>
        <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button v-for="[v, lb, ik] in [['unggah', 'Unggah berkas', 'Upload'], ['tautan', 'Dari tautan', 'Globe']]" :key="v" @click="modeLogo[l.kunci] = v"
                  :class="['flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold', modeLogo[l.kunci] === v ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']">
            <Ikon :nama="ik" :ukuran="15" /> {{ lb }}
          </button>
        </div>
        <label v-if="modeLogo[l.kunci] === 'unggah'" class="tombol-garis w-full cursor-pointer">
          <Ikon :nama="sibuk === l.kunci ? 'RefreshCw' : 'ImagePlus'" :ukuran="16" :class="sibuk === l.kunci && 'animate-spin'" /> Pilih gambar dari perangkat
          <input type="file" accept="image/*" class="sr-only" @change="pilihBerkas(l.kunci, $event)" />
        </label>
        <form v-else class="flex gap-2" @submit.prevent="ambilTautan(l.kunci)">
          <input v-model="tautan[l.kunci]" class="masukan kode text-xs" placeholder="https://…/logo.png atau tautan Google Drive" />
          <button class="tombol-utama shrink-0 px-3" :disabled="sibuk === l.kunci || !tautan[l.kunci]"><Ikon :nama="sibuk === l.kunci ? 'RefreshCw' : 'Download'" :ukuran="16" :class="sibuk === l.kunci && 'animate-spin'" /> Ambil</button>
        </form>
      </section>
    </div>

    <!-- Susunan kop -->
    <section class="kartu p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h3 class="flex flex-1 items-center gap-2 font-bold"><Ikon nama="FileSignature" :ukuran="18" class="text-merah" /> Susunan kop surat</h3>
        <button class="tombol-garis px-3 py-2" @click="kembalikanBawaan"><Ikon nama="RefreshCw" :ukuran="15" /> Bawaan tata naskah</button>
      </div>
      <div class="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="hk">Huruf kop</label>
          <select id="hk" v-model="kop.huruf" class="masukan"><option v-for="h in HURUF_KOP" :key="h" :value="h" :style="{ fontFamily: h }">{{ h }}</option></select>
        </div>
        <div>
          <span class="label">Garis kop</span>
          <div class="grid grid-cols-3 gap-1.5">
            <button v-for="g in GARIS_KOP" :key="g.nilai" type="button" @click="kop.garis = g.nilai"
                    :class="['rounded-lg border px-1 py-2 text-xs font-semibold', kop.garis === g.nilai ? 'border-biru bg-biru/10 text-biru' : 'border-slate-300 dark:border-slate-600']">{{ g.label }}</button>
          </div>
          <div v-if="kop.garis !== 'tidak'" class="mt-2 flex items-center gap-2">
            <label class="text-xs font-semibold text-slate-500" for="tg">Tebal garis</label>
            <select id="tg" v-model.number="kop.tebal_garis" class="masukan w-28 py-1.5 text-sm">
              <option v-for="t in [0.5, 0.75, 1, 1.5, 2.25, 3]" :key="t" :value="t">{{ String(t).replace('.', ',') }} pt</option>
            </select>
          </div>
        </div>
      </div>

      <ol class="space-y-2">
        <li v-for="(b, i) in kop.baris" :key="i" class="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-900/50">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-slate-400 dark:bg-slate-800">{{ i + 1 }}</span>
          <input v-model="b.teks" class="masukan min-w-[12rem] flex-1 py-2" :style="{ fontWeight: b.tebal ? 700 : 400 }" />
          <div class="flex items-center gap-1">
            <input v-model.number="b.ukuran" type="number" min="6" max="24" step="0.5" class="masukan angka w-20 py-2" title="Ukuran huruf (pt)" />
            <span class="text-xs text-slate-500">pt</span>
          </div>
          <button type="button" @click="b.tebal = !b.tebal" title="Tebal"
                  :class="['grid h-9 w-9 place-items-center rounded-lg border', b.tebal ? 'border-biru bg-biru text-white' : 'border-slate-300 text-slate-500 dark:border-slate-600']"><Ikon nama="Bold" :ukuran="16" /></button>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-800" title="Naik" @click="geser(i, -1)"><Ikon nama="ArrowUp" :ukuran="16" /></button>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-800" title="Turun" @click="geser(i, 1)"><Ikon nama="ArrowDown" :ukuran="16" /></button>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Hapus baris" @click="kop.baris.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
        </li>
      </ol>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="tombol-garis" @click="tambahBaris"><Ikon nama="Plus" :ukuran="16" /> Tambah baris</button>
        <button class="tombol-utama" :disabled="sibuk === 'kop'" @click="simpanKop"><Ikon :nama="sibuk === 'kop' ? 'RefreshCw' : 'Save'" :ukuran="16" :class="sibuk === 'kop' && 'animate-spin'" /> Simpan kop</button>
      </div>
      <p class="mt-3 text-xs text-slate-500">Contoh tata naskah: <i>PEMERINTAH KOTA MAKASSAR</i> → nama unit (tebal) → alamat lengkap dengan kode pos → Telpon/Faksimile → Laman & Pos-el.</p>
    </section>

    <!-- Pratinjau -->
    <section class="kartu p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h3 class="flex flex-1 items-center gap-2 font-bold"><Ikon nama="Eye" :ukuran="18" class="text-tosca" /> Pratinjau (lebar F4 tegak)</h3>
        <button class="tombol bg-merah px-3 py-2 text-white hover:brightness-95" @click="ujiCetak = true"><Ikon nama="Printer" :ukuran="16" /> Uji cetak F4</button>
      </div>
      <div class="gulir-halus overflow-x-auto rounded-xl bg-slate-200 p-4 dark:bg-slate-900">
        <div class="mx-auto bg-white shadow" style="width: 215mm; min-width: 215mm; padding: 1.5cm 2cm 1.5cm 3cm">
          <KopSurat :profil="{ ...profil, kop }" />
        </div>
      </div>
    </section>

    <JendelaUjiCetak v-if="ujiCetak" :profil="{ ...profil, kop }" @tutup="ujiCetak = false" />
  </div>
</template>
