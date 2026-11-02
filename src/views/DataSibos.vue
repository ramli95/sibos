<script setup>
// Ekspor & Impor Data: ekspor seluruh data ke Excel, perbaiki di Excel, lalu impor kembali.
// SIBOS menampilkan dulu apa yang akan berubah (baru / diubah / tetap / tidak ada di berkas) sebelum menyimpan.
import { ref, reactive, computed } from 'vue'
import { KOLEKSI_DATA, DEF_KOLEKSI } from '@/config/dataSibos'
import { eksporData, bacaBerkasData, rencanakan, terapkan, waktuInfo } from '@/services/dataSibos'
import { modePratinjau } from '@/services/firebase'
import { useNotifikasi } from '@/stores/notifikasi'
import Ikon from '@/components/Ikon.vue'

const notif = useNotifikasi()
const semuaId = KOLEKSI_DATA.flatMap((k) => k.daftar.map((d) => d.id))
const pilih = ref(new Set(semuaId))
const alih = (id) => { const s = new Set(pilih.value); s.has(id) ? s.delete(id) : s.add(id); pilih.value = s }
const alihKelompok = (k) => { const ids = k.daftar.map((d) => d.id); const penuh = ids.every((i) => pilih.value.has(i)); const s = new Set(pilih.value); ids.forEach((i) => (penuh ? s.delete(i) : s.add(i))); pilih.value = s }

const sibuk = ref('')
async function ekspor() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau tidak terhubung ke database.', 'info')
  sibuk.value = 'Menyiapkan…'
  try { const r = await eksporData([...pilih.value], { kemajuan: (t) => (sibuk.value = t) }); notif.kabari(`Berkas Excel diunduh (${r.length} lembar data).`) }
  catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}

/* ---------- Impor kembali ---------- */
const masukan = ref(null)
const berkas = ref(null)
const rencana = ref(null)
const opsi = reactive({})
const buka = ref(null)
const hasil = ref(null)
async function pilihBerkas(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (modePratinjau) return notif.kabari('Mode Pratinjau tidak terhubung ke database.', 'info')
  hasil.value = null
  sibuk.value = 'Membaca berkas…'
  try {
    const b = await bacaBerkasData(file)
    sibuk.value = 'Membandingkan dengan database…'
    rencana.value = await rencanakan(b)
    berkas.value = { nama: file.name, info: b.info }
    Object.keys(opsi).forEach((k) => delete opsi[k])
    rencana.value.forEach((p) => { opsi[p.nama] = { pakai: (p.baru.length + p.ubah.length) > 0, hapus: false } })
  } catch (err) { notif.kabari(err.message, 'galat'); rencana.value = null } finally { sibuk.value = '' }
}
const galatBerat = (p) => p.galat.filter((g) => !/diabaikan/.test(g))
const bisaHapus = (p) => p.def.hapus !== false && !p.sub && p.hilang.length > 0
const jumlah = computed(() => (rencana.value || []).filter((p) => opsi[p.nama]?.pakai && !galatBerat(p).length)
  .reduce((s, p) => ({ baru: s.baru + p.baru.length, ubah: s.ubah + (p.def.hanyaTambah ? 0 : p.ubah.length), hapus: s.hapus + (opsi[p.nama].hapus && bisaHapus(p) ? p.hilang.length : 0) }), { baru: 0, ubah: 0, hapus: 0 }))
async function jalankan() {
  const j = jumlah.value
  if (!confirm(`Terapkan ${j.baru} data baru, ${j.ubah} perubahan${j.hapus ? `, dan HAPUS ${j.hapus} data` : ''}? Sebaiknya ekspor cadangan dulu sebelum mengimpor.`)) return
  sibuk.value = 'Menyimpan…'
  try { hasil.value = await terapkan(rencana.value, opsi, berkas.value.nama, { kemajuan: (t) => (sibuk.value = t) }); rencana.value = null; notif.kabari('Data dari berkas sudah diterapkan.') }
  catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
const judulKel = (p) => (p.sub ? `${DEF_KOLEKSI[p.koleksi].judul} — ${p.sub}` : DEF_KOLEKSI[p.koleksi].judul)
const muatUlang = () => location.reload()
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="ArrowDownUp" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Ekspor & Impor Data</p>
        <h1 class="text-lg font-extrabold sm:text-xl">Ekspor → perbaiki di Excel → impor kembali</h1>
        <p class="text-xs text-slate-500">SIBOS mengikuti isi berkas yang Bapak impor. Perubahan ditampilkan dulu sebelum disimpan.</p>
      </div>
      <RouterLink to="/impor" class="tombol-garis"><Ikon nama="FileUp" :ukuran="16" class="text-[#E3A414]" /> Impor dari format lain</RouterLink>
    </div>

    <div v-if="sibuk" class="kartu flex items-center gap-3 p-4 text-sm"><Ikon nama="RefreshCw" class="animate-spin text-biru" /> {{ sibuk }}</div>

    <!-- Hasil impor -->
    <section v-if="hasil" class="kartu space-y-3 border-l-4 border-l-emerald-500 p-5">
      <h3 class="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300"><Ikon nama="CircleCheck" :ukuran="19" /> Impor selesai</h3>
      <ul class="space-y-1 text-sm"><li v-for="h in hasil" :key="h" class="flex gap-2"><Ikon nama="Check" :ukuran="15" class="mt-0.5 text-emerald-500" />{{ h }}</li></ul>
      <button class="tombol-utama" @click="muatUlang"><Ikon nama="RefreshCw" :ukuran="16" /> Muat ulang aplikasi agar semua menu memakai data baru</button>
    </section>

    <!-- Rencana impor -->
    <section v-if="rencana" class="space-y-3">
      <div class="kartu flex flex-wrap items-center gap-3 p-4">
        <Ikon nama="FileSpreadsheet" :ukuran="20" class="text-emerald-600" />
        <div class="min-w-0 flex-1"><p class="truncate font-bold">{{ berkas.nama }}</p><p class="text-xs text-slate-500">Diekspor {{ waktuInfo(berkas.info) }}<template v-if="berkas.info?.oleh"> oleh {{ berkas.info.oleh }}</template></p></div>
        <span class="lencana bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="Plus" :ukuran="13" /> {{ jumlah.baru }} baru</span>
        <span class="lencana bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Ikon nama="Pencil" :ukuran="13" /> {{ jumlah.ubah }} diubah</span>
        <span v-if="jumlah.hapus" class="lencana bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><Ikon nama="Trash2" :ukuran="13" /> {{ jumlah.hapus }} dihapus</span>
      </div>

      <div v-for="p in rencana" :key="p.nama" class="kartu p-4">
        <div class="flex flex-wrap items-center gap-3">
          <input v-model="opsi[p.nama].pakai" type="checkbox" class="h-5 w-5 accent-[#22A08D]" :disabled="!!galatBerat(p).length" :aria-label="`Terapkan ${judulKel(p)}`" />
          <span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip"><Ikon :nama="p.def.ikon" :ukuran="17" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ judulKel(p) }}</p>
            <p class="flex flex-wrap gap-x-3 text-xs text-slate-500">
              <span class="text-emerald-600">{{ p.baru.length }} baru</span><span class="text-amber-600">{{ p.ubah.length }} diubah</span><span>{{ p.sama }} tetap</span>
              <span v-if="p.hilang.length" class="text-rose-600">{{ p.hilang.length }} tidak ada di berkas</span>
            </p>
          </div>
          <label v-if="bisaHapus(p)" class="flex items-center gap-1.5 text-xs font-semibold text-rose-600"><input v-model="opsi[p.nama].hapus" type="checkbox" class="h-4 w-4 accent-rose-600" /> Hapus {{ p.hilang.length }} yang tidak ada di berkas</label>
          <button v-if="p.baru.length || p.ubah.length || p.hilang.length" class="text-xs font-semibold text-biru hover:underline" @click="buka = buka === p.nama ? null : p.nama">{{ buka === p.nama ? 'Tutup' : 'Lihat' }}</button>
        </div>
        <ul v-if="galatBerat(p).length || p.galat.length" class="mt-2 space-y-0.5 text-xs" :class="galatBerat(p).length ? 'text-rose-600' : 'text-amber-600'">
          <li v-for="g in p.galat.slice(0, 8)" :key="g" class="flex gap-1"><Ikon nama="TriangleAlert" :ukuran="13" class="mt-0.5" /> {{ g }}</li>
          <li v-if="p.galat.length > 8">…dan {{ p.galat.length - 8 }} lainnya</li>
          <li v-if="galatBerat(p).length" class="font-semibold">Perbaiki berkas lalu impor ulang — bagian ini tidak bisa diterapkan.</li>
        </ul>
        <div v-if="buka === p.nama" class="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div v-for="[judul, isi, warna] in [['Baru', p.baru, 'text-emerald-700 dark:text-emerald-300'], ['Diubah', p.ubah, 'text-amber-700 dark:text-amber-300'], ['Tidak ada di berkas', p.hilang, 'text-rose-700 dark:text-rose-300']]" :key="judul" class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p :class="['mb-1 font-bold', warna]">{{ judul }} ({{ isi.length }})</p>
            <p v-for="(x, i) in isi.slice(0, 15)" :key="i" class="truncate">{{ x.label }}</p>
            <p v-if="isi.length > 15" class="text-slate-500">…{{ isi.length - 15 }} lainnya</p>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tombol-utama" :disabled="!!sibuk || !(jumlah.baru + jumlah.ubah + jumlah.hapus)" @click="jalankan"><Ikon nama="Save" :ukuran="17" /> Terapkan ke SIBOS</button>
        <button class="tombol-garis" @click="rencana = null">Batal</button>
      </div>
    </section>

    <div v-if="!rencana" class="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <!-- Ekspor -->
      <section class="kartu space-y-4 p-5" data-tur="data-ekspor">
        <div class="flex flex-wrap items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Download" :ukuran="19" /></span>
          <div class="min-w-0 flex-1"><h3 class="font-bold">1. Ekspor ke Excel</h3><p class="text-xs text-slate-500">{{ pilih.size }} dari {{ semuaId.length }} jenis data dipilih</p></div>
          <button class="tombol-garis" @click="pilih = new Set(pilih.size === semuaId.length ? [] : semuaId)"><Ikon nama="CopyCheck" :ukuran="16" /> {{ pilih.size === semuaId.length ? 'Kosongkan' : 'Pilih semua' }}</button>
        </div>
        <div v-for="k in KOLEKSI_DATA" :key="k.kelompok" class="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <button class="mb-2 flex w-full items-center gap-2 text-left text-sm font-bold" @click="alihKelompok(k)">
            <Ikon :nama="k.ikon" :ukuran="16" class="text-[#E3A414]" /> {{ k.kelompok }}
            <span class="ml-auto text-xs font-normal text-biru">{{ k.daftar.every((d) => pilih.has(d.id)) ? 'Lepas semua' : 'Pilih semua' }}</span>
          </button>
          <div class="grid gap-1.5 sm:grid-cols-2">
            <label v-for="d in k.daftar" :key="d.id" :class="['flex cursor-pointer items-start gap-2 rounded-xl px-2.5 py-2 text-sm', pilih.has(d.id) ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50']">
              <input type="checkbox" :checked="pilih.has(d.id)" class="mt-0.5 h-4 w-4 accent-[#1A56DB]" @change="alih(d.id)" />
              <Ikon :nama="d.ikon" :ukuran="16" class="mt-0.5 shrink-0 text-slate-400" />
              <span class="min-w-0"><span class="block">{{ d.judul }}</span><span v-if="d.ket" class="block text-[11px] text-slate-500">{{ d.ket }}</span></span>
            </label>
          </div>
        </div>
        <button class="tombol-utama w-full justify-center" :disabled="!pilih.size || !!sibuk" @click="ekspor"><Ikon nama="FileSpreadsheet" :ukuran="17" /> Ekspor {{ pilih.size }} jenis data ke Excel</button>
      </section>

      <!-- Impor kembali -->
      <section class="space-y-4">
        <div class="kartu space-y-3 p-5" data-tur="data-impor">
          <div class="flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="Upload" :ukuran="19" /></span>
            <div><h3 class="font-bold">2. Impor kembali</h3><p class="text-xs text-slate-500">Pilih berkas hasil ekspor yang sudah diperbaiki.</p></div>
          </div>
          <input ref="masukan" type="file" accept=".xlsx" class="hidden" @change="pilihBerkas" />
          <button class="tombol-utama w-full justify-center bg-[#22A08D] hover:bg-[#1B8574]" :disabled="!!sibuk" @click="masukan.click()"><Ikon nama="Upload" :ukuran="17" /> Pilih berkas .xlsx</button>
        </div>
        <div class="kartu space-y-2 p-5 text-sm text-slate-600 dark:text-slate-300">
          <h3 class="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Ikon nama="Lightbulb" :ukuran="17" class="text-[#E3A414]" /> Aturan singkat</h3>
          <p class="flex gap-2"><Ikon nama="Hash" :ukuran="15" class="mt-0.5 shrink-0 text-biru" /> <span>Kolom <b>_id</b> jangan diubah. Baris baru: kosongkan _id.</span></p>
          <p class="flex gap-2"><Ikon nama="Layers" :ukuran="15" class="mt-0.5 shrink-0 text-[#22A08D]" /> <span>Lembar bertanda <b>~</b> berisi rincian (item, penerima, uraian, butir).</span></p>
          <p class="flex gap-2"><Ikon nama="Eraser" :ukuran="15" class="mt-0.5 shrink-0 text-rose-500" /> Sel kosong = isian dihapus. Baris induk yang dihapus hanya ikut terhapus bila dicentang saat impor.</p>
          <p class="flex gap-2"><Ikon nama="ShieldCheck" :ukuran="15" class="mt-0.5 shrink-0 text-emerald-600" /> Ekspor cadangan dulu sebelum mengimpor perubahan besar.</p>
        </div>
      </section>
    </div>
  </div>
</template>
