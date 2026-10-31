<script setup>
// Kelola sumber SSH pemerintah: tambah SSH tahun baru dari Excel, ganti isi, aktif/nonaktif,
// ubah info (dasar hukum), ekspor Excel, kembalikan bawaan / hapus.
import { ref, reactive, computed, onMounted } from 'vue'
import { useNotifikasi } from '@/stores/notifikasi'
import {
  WILAYAH, muatDaftarSumber, muatSsh, simpanIsiSsh, simpanInfoSsh, hapusSsh, bacaExcelSsh, eksporSsh, unduhTemplatSsh, kunciBaru,
} from '@/services/ssh'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const emit = defineEmits(['tutup'])
const notif = useNotifikasi()
const daftar = ref([])
const sibuk = ref('')
const form = ref(null) // { mode: 'baru' | 'info' | 'isi', ...meta }
const berkas = ref(null) // { nama, butir, lewat }
const salinDari = ref('')

async function muat(segar = true) { daftar.value = await muatDaftarSumber({ segar }) }
onMounted(() => muat(false))

const tahunIni = new Date().getFullYear()
function bukaBaru() {
  form.value = reactive({ mode: 'baru', nama: '', singkat: '', dasar: '', tahun: tahunIni + 1, wilayah: 'kota', aktif: true, catatan: '' })
  berkas.value = null; salinDari.value = ''
}
function bukaInfo(s) { form.value = reactive({ mode: 'info', ...s }); berkas.value = null }
function bukaIsi(s) { form.value = reactive({ mode: 'isi', ...s }); berkas.value = null; salinDari.value = '' }

async function pilihBerkas(e) {
  const f = e.target.files?.[0]; e.target.value = ''
  if (!f) return
  sibuk.value = 'baca'
  try { const r = await bacaExcelSsh(f); berkas.value = { nama: f.name, ...r }; salinDari.value = '' }
  catch (err) { notif.kabari(err.message, 'galat') } finally { sibuk.value = '' }
}

const sahForm = computed(() => {
  const x = form.value
  if (!x) return false
  if (!x.nama?.trim() || !x.dasar?.trim() || !Number(x.tahun)) return false
  if (x.mode === 'baru') return !!(berkas.value?.butir.length || salinDari.value)
  if (x.mode === 'isi') return !!berkas.value?.butir.length
  return true
})

async function simpan() {
  const x = form.value
  sibuk.value = 'simpan'
  try {
    if (x.mode === 'info') {
      await simpanInfoSsh(x)
      notif.kabari(`Info ${x.nama} tersimpan.`)
    } else {
      const kunci = x.mode === 'baru' ? kunciBaru(x.singkat || x.nama, x.tahun, daftar.value.map((s) => s.kunci)) : x.kunci
      const butir = berkas.value?.butir || (await muatSsh(salinDari.value)).butir
      const r = await simpanIsiSsh({ ...x, kunci }, butir,
        `${x.mode === 'baru' ? 'Tambah' : 'Ganti isi'} ${x.nama} dari ${berkas.value ? `"${berkas.value.nama}"` : 'salinan SSH lain'}: ${butir.length} item`)
      notif.kabari(`${x.nama}: ${r.jumlah.toLocaleString('id-ID')} item tersimpan${r.pratinjau ? ' (Mode Pratinjau, tidak permanen)' : ''}.`)
    }
    form.value = null
    await muat()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}

async function alihAktif(s) {
  sibuk.value = s.kunci
  try { await simpanInfoSsh({ ...s, aktif: !s.aktif }); await muat() } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
async function hapus(s) {
  const tanya = s.bawaan
    ? `Kembalikan ${s.nama} ke data bawaan SIBOS? Semua perubahan item yang sudah dibuat sekolah akan hilang.`
    : `Hapus ${s.nama} beserta ${s.jumlah?.toLocaleString('id-ID') || 0} itemnya? Harga sekolah yang sudah merujuk SSH ini tetap tersimpan.`
  if (!confirm(tanya)) return
  sibuk.value = s.kunci
  try { await hapusSsh(s); notif.kabari(s.bawaan ? `${s.nama} kembali ke data bawaan.` : `${s.nama} dihapus.`); await muat() }
  catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
async function ekspor(s) {
  sibuk.value = s.kunci
  try { await eksporSsh(s) } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
const status = (s) => (s.bawaan ? (s.tersimpan ? 'Bawaan · diubah sekolah' : 'Bawaan SIBOS') : 'Ditambahkan sekolah')
</script>

<template>
  <Laci judul="Kelola SSH pemerintah" subjudul="Perbarui setiap tahun sesuai Perwali/Pergub terbaru" ikon="Landmark" lebar="max-w-3xl" @tutup="emit('tutup')">
    <div class="space-y-4 p-4 sm:p-5">
      <div class="flex flex-wrap gap-2">
        <button class="tombol-utama" @click="bukaBaru"><Ikon nama="CalendarPlus" :ukuran="17" /> SSH tahun baru</button>
        <button class="tombol-garis" @click="unduhTemplatSsh"><Ikon nama="FileDown" :ukuran="17" class="text-biru" /> Templat Excel</button>
      </div>

      <ul class="space-y-3">
        <li v-for="s in daftar" :key="s.kunci" :class="['rounded-2xl border p-4 dark:border-slate-700', s.aktif ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-75']">
          <div class="flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ikon-chip"><Ikon :nama="s.ikon" :ukuran="19" /></span>
            <div class="min-w-0 flex-1">
              <p class="font-bold leading-snug">{{ s.nama }}</p>
              <p class="text-xs text-slate-500">{{ s.dasar }}</p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <span class="lencana bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">TA {{ s.tahun }}</span>
                <span class="lencana bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{{ status(s) }}</span>
                <span v-if="s.jumlah" class="lencana bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{{ s.jumlah.toLocaleString('id-ID') }} item</span>
                <span :class="['lencana', s.aktif ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800']">
                  <Ikon :nama="s.aktif ? 'CircleCheck' : 'Archive'" :ukuran="12" /> {{ s.aktif ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
            </div>
            <label class="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300" :title="s.aktif ? 'Nonaktifkan (tidak muncul di pencarian)' : 'Aktifkan'">
              <input type="checkbox" class="peer sr-only" :checked="s.aktif" :disabled="sibuk === s.kunci" @change="alihAktif(s)" />
              <span class="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-biru dark:bg-slate-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button class="tombol-garis px-3 py-1.5 text-xs" @click="bukaInfo(s)"><Ikon nama="Pencil" :ukuran="14" class="text-biru" /> Info</button>
            <button class="tombol-garis px-3 py-1.5 text-xs" @click="bukaIsi(s)"><Ikon nama="FileUp" :ukuran="14" class="text-biru" /> Ganti isi dari Excel</button>
            <button class="tombol-garis px-3 py-1.5 text-xs" :disabled="sibuk === s.kunci" @click="ekspor(s)"><Ikon nama="FileSpreadsheet" :ukuran="14" class="text-biru" /> Ekspor Excel</button>
            <button v-if="!s.bawaan || s.tersimpan" class="tombol-garis ml-auto px-3 py-1.5 text-xs text-rose-600" :disabled="sibuk === s.kunci" @click="hapus(s)">
              <Ikon :nama="s.bawaan ? 'Undo2' : 'Trash2'" :ukuran="14" /> {{ s.bawaan ? 'Kembalikan bawaan' : 'Hapus' }}
            </button>
          </div>
        </li>
      </ul>

      <p class="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
        <Ikon nama="Info" :ukuran="15" class="mt-px text-biru" />
        <span>Setiap tahun: tambahkan SSH tahun baru dari Excel (atau salin SSH lama lalu ubah harganya), kemudian nonaktifkan SSH tahun lalu.
          Dokumen PDF Perwali/Pergub perlu diubah ke Excel dahulu dengan susunan kolom pada templat.</span>
      </p>
    </div>

    <!-- Formulir sumber -->
    <Laci v-if="form" :judul="form.mode === 'baru' ? 'SSH tahun baru' : form.mode === 'isi' ? 'Ganti isi SSH' : 'Info SSH'" :subjudul="form.mode === 'baru' ? '' : form.nama"
          :ikon="form.mode === 'info' ? 'Pencil' : 'FileUp'" lebar="max-w-xl" @tutup="form = null">
      <div class="space-y-4 p-5">
        <template v-if="form.mode !== 'isi'">
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-2"><label class="label" for="kn">Nama <span class="text-merah">*</span></label><input id="kn" v-model="form.nama" class="masukan" placeholder="mis. SSH Pemkot Makassar 2027" /></div>
            <div><label class="label" for="kt">Tahun <span class="text-merah">*</span></label><input id="kt" v-model.number="form.tahun" type="number" class="masukan angka" /></div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div><label class="label" for="ks">Nama singkat</label><input id="ks" v-model="form.singkat" class="masukan" placeholder="mis. Pemkot Makassar" /></div>
            <div><label class="label" for="kw">Penerbit</label><select id="kw" v-model="form.wilayah" class="masukan"><option v-for="(w, k) in WILAYAH" :key="k" :value="k">{{ w.nama }}</option></select></div>
          </div>
          <div><label class="label" for="kd">Dasar hukum <span class="text-merah">*</span></label><input id="kd" v-model="form.dasar" class="masukan" placeholder="mis. Perwali Makassar No. … Tahun 2026 tentang SSH 2027" /></div>
          <div><label class="label" for="kc">Catatan</label><input id="kc" v-model="form.catatan" class="masukan" placeholder="opsional, tampil di atas hasil pencarian" /></div>
        </template>

        <section v-if="form.mode !== 'info'" class="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <p class="flex items-center gap-2 text-sm font-bold"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-biru" /> Isi SSH</p>
          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3.5 hover:border-biru dark:border-slate-600">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ikon-chip"><Ikon :nama="sibuk === 'baca' ? 'RefreshCw' : 'Upload'" :ukuran="19" :class="sibuk === 'baca' && 'animate-spin'" /></span>
            <span class="min-w-0 flex-1 text-sm">
              <b v-if="berkas" class="block truncate">{{ berkas.nama }}</b><b v-else class="block">Pilih berkas Excel (.xlsx / .csv)</b>
              <span class="text-xs text-slate-500">{{ berkas ? `${berkas.butir.length.toLocaleString('id-ID')} item terbaca dari lembar "${berkas.lembar}"${berkas.lewat ? ` · ${berkas.lewat} baris dilewati (uraian/satuan/harga kosong)` : ''}` : 'Kolom: Kode, Kelompok, Uraian, Spesifikasi, Satuan, Harga' }}</span>
            </span>
            <input type="file" accept=".xlsx,.csv" class="sr-only" @change="pilihBerkas" />
          </label>
          <template v-if="form.mode === 'baru'">
            <p class="text-center text-xs text-slate-400">atau</p>
            <div>
              <label class="label" for="ksd">Salin isi dari SSH lain, lalu ubah harganya satu per satu</label>
              <select id="ksd" v-model="salinDari" class="masukan" :disabled="!!berkas"><option value="">— tidak menyalin —</option><option v-for="s in daftar" :key="s.kunci" :value="s.kunci">{{ s.nama }}</option></select>
            </div>
          </template>
          <p v-if="form.mode === 'isi'" class="flex gap-1.5 text-xs text-amber-700 dark:text-amber-300"><Ikon nama="TriangleAlert" :ukuran="14" class="mt-px" /> Seluruh item lama diganti dengan isi berkas.</p>
        </section>
      </div>
      <template #kaki>
        <button class="tombol-utama ml-auto" :disabled="!sahForm || sibuk === 'simpan'" @click="simpan">
          <Ikon :nama="sibuk === 'simpan' ? 'RefreshCw' : 'Save'" :ukuran="17" :class="sibuk === 'simpan' && 'animate-spin'" /> Simpan
        </button>
      </template>
    </Laci>
  </Laci>
</template>
