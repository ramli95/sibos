<script setup>
// Memilih/mengubah satu item belanja: dari Standar Harga (harga sekolah, pembanding SSH) lalu dikaitkan ke uraian RKAS.
import InputAngka from '@/components/InputAngka.vue'
import { reactive, ref, computed } from 'vue'
import { rupiah, NAMA_BULAN } from '@/utils/format'
import { usulanUraian, kunciUraian, rapikanNamaItem } from '@/utils/belanja'
import { kategoriRekening } from '@/utils/arkas'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'
import { useRkas } from '@/stores/rkas'

const props = defineProps({
  item: Object, // null = item baru
  harga: { type: Array, default: () => [] },
  uraian: { type: Array, default: () => [] },
  pakai: { type: Function, required: true }, // (kunci) → { komitmen, bulanKomitmen[12] } tanpa item ini
  bulan: { type: Number, default: null }, // 0–11, bulan transaksi
  namaRekening: { type: Function, default: (k) => k },
  namaKegiatan: { type: Function, default: (k) => k },
})
const emit = defineEmits(['tutup', 'simpan'])

const JENIS = [['barang', 'Barang', 'Package'], ['jasa', 'Jasa', 'Wrench'], ['konsumsi', 'Konsumsi', 'UtensilsCrossed']]
const f = reactive({
  id_harga: null, nama: '', spesifikasi: '', jenis: 'barang', volume: 1, satuan: '', harga: 0, harga_ssh: 0,
  kode_kegiatan: '', kode_rekening: '', uraian_rkas: '', harga_rkas: 0, luar_rkas: false, ...(props.item || {}),
})

/* ---------- Di luar RKAS: belanja dulu, uraiannya ditambahkan di ARKAS saat pergeseran/perubahan ---------- */
const rkasStore = useRkas()
const kegiatanLuar = computed(() => {
  const peta = new Map()
  rkasStore.refKegiatan.filter((k) => k.kode.split('.').length === 3).forEach((k) => peta.set(k.kode, k.nama))
  props.uraian.forEach((u) => { if (!peta.has(u.kode_kegiatan)) peta.set(u.kode_kegiatan, props.namaKegiatan(u.kode_kegiatan)) })
  return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id', { numeric: true }))
})
const rekeningLuar = computed(() => {
  const peta = new Map()
  rkasStore.refRekening.forEach((r) => peta.set(r.kode, r.nama))
  props.uraian.forEach((u) => { if (!peta.has(u.kode_rekening)) peta.set(u.kode_rekening, props.namaRekening(u.kode_rekening)) })
  return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id', { numeric: true }))
})
function alihLuar() {
  f.luar_rkas = !f.luar_rkas
  if (!f.luar_rkas) Object.assign(f, { kode_kegiatan: '', kode_rekening: '', uraian_rkas: '', harga_rkas: 0 })
}
const cariHarga = ref('')
const cariUraian = ref('')
const lihatSemuaUraian = ref(false)

const jenisDariHarga = (h) => (h.jenis === 'jasa' ? 'jasa' : h.jenis === 'konsumsi' ? 'konsumsi' : 'barang')
const hasilHarga = computed(() => {
  const q = cariHarga.value.trim().toLowerCase()
  const d = props.harga.filter((h) => h.aktif !== false && h.jenis !== 'honor' && h.jenis !== 'transpor')
  return (q ? d.filter((h) => [h.nama_item, h.kelompok, h.kode_item, h.spesifikasi].some((v) => String(v || '').toLowerCase().includes(q))) : d).slice(0, 30)
})
function pilihHarga(h) {
  Object.assign(f, {
    id_harga: h.id, nama: rapikanNamaItem(h.nama_item, jenisDariHarga(h)), spesifikasi: h.spesifikasi || '', jenis: jenisDariHarga(h), satuan: h.satuan,
    harga: h.harga, harga_ssh: h.harga_ssh || 0,
  })
  // Uraian RKAS otomatis bila hanya satu yang cocok rekening & nama
  const u = usulanUraian(h.nama_item, h.kode_rekening, props.uraian)
  if (u[0] && !f.kode_rekening) pilihUraian(u[0])
}
const terpilihHarga = computed(() => props.harga.find((h) => h.id === f.id_harga))

const usulan = computed(() => usulanUraian(f.nama, terpilihHarga.value?.kode_rekening, props.uraian))
const daftarUraian = computed(() => {
  const q = cariUraian.value.trim().toLowerCase()
  if (!q && !lihatSemuaUraian.value) return usulan.value
  return props.uraian.filter((u) => !q || [u.uraian, u.kode_kegiatan, u.kode_rekening, props.namaKegiatan(u.kode_kegiatan)].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 60)
})
function pilihUraian(u) {
  Object.assign(f, { kode_kegiatan: u.kode_kegiatan, kode_rekening: u.kode_rekening, uraian_rkas: u.uraian, harga_rkas: u.harga, kategori: u.kategori || kategoriRekening(u.kode_rekening) })
  if (!f.satuan) f.satuan = u.satuan
  if (!f.harga) f.harga = u.harga
  if (!f.nama) f.nama = u.uraian
}
const uraianTerpilih = computed(() => props.uraian.find((u) => kunciUraian(u) === kunciUraian(f) && u.harga === f.harga_rkas) || props.uraian.find((u) => kunciUraian(u) === kunciUraian(f)))

const jumlah = computed(() => Math.round((Number(f.volume) || 0) * (Number(f.harga) || 0)))
const info = computed(() => {
  const u = uraianTerpilih.value
  if (!u) return null
  const p = props.pakai(kunciUraian(u))
  const sisa = u.jumlah - p.komitmen
  const m = props.bulan
  const rencanaBulan = m != null && u.bulan ? u.bulan[m] : null
  const sisaBulan = rencanaBulan != null ? rencanaBulan - p.bulanKomitmen[m] : null
  return { u, sisa, sisaBulan, rencanaBulan, lewat: jumlah.value > sisa, lewatBulan: sisaBulan != null && jumlah.value > sisaBulan }
})
const peringatan = computed(() => {
  const w = []
  if (f.luar_rkas) w.push({ nada: 'info', teks: 'Item di luar RKAS: jangan lupa tambahkan uraiannya di ARKAS saat pergeseran/perubahan (lihat RKAS → Pergeseran).' })
  if (info.value?.lewat) w.push({ nada: 'bahaya', teks: `Melebihi sisa pagu uraian (${rupiah(info.value.sisa)}). Perlu pergeseran di ARKAS.` })
  else if (info.value?.lewatBulan) w.push({ nada: 'peringatan', teks: `Melebihi sisa rencana ${NAMA_BULAN[props.bulan]} (${rupiah(info.value.sisaBulan)}).` })
  if (f.harga_ssh && f.harga > f.harga_ssh) w.push({ nada: 'peringatan', teks: `Harga di atas SSH (${rupiah(f.harga_ssh)}). Siapkan alasan/pembanding harga.` })
  if (!f.id_harga && f.nama) w.push({ nada: 'info', teks: 'Item tidak diambil dari Standar Harga.' })
  return w
})
const sah = computed(() => f.nama.trim() && Number(f.volume) > 0 && f.satuan.trim() && Number(f.harga) > 0 && f.kode_rekening && (!f.luar_rkas || f.kode_kegiatan))
function simpan() {
  if (!sah.value) return
  const nama = rapikanNamaItem(f.nama, f.jenis)
  const luar = f.luar_rkas ? { uraian_rkas: f.uraian_rkas?.trim() || nama, harga_rkas: Math.round(Number(f.harga)), kategori: kategoriRekening(f.kode_rekening) } : {}
  emit('simpan', { ...f, ...luar, nama, volume: Number(f.volume), harga: Math.round(Number(f.harga)) })
}
const NADA = { bahaya: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200', peringatan: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', info: 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200' }
</script>

<template>
  <Laci :judul="props.item ? 'Ubah item' : 'Tambah item'" subjudul="Standar Harga → uraian RKAS" ikon="Package" lebar="max-w-3xl" @tutup="emit('tutup')">
    <div class="space-y-6 p-5">
      <!-- 1. Standar harga -->
      <section class="space-y-3">
        <h3 class="flex items-center gap-2 text-sm font-bold"><span class="grid h-6 w-6 place-items-center rounded-full bg-biru text-xs text-white">1</span> Pilih dari Standar Harga</h3>
        <div class="relative">
          <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="cariHarga" class="masukan pl-9" placeholder="Cari item: service AC, kertas, konsumsi…" />
        </div>
        <div class="gulir-halus max-h-56 space-y-1.5 overflow-y-auto pr-1">
          <button v-for="h in hasilHarga" :key="h.id" type="button" @click="pilihHarga(h)"
                  :class="['flex w-full items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition', f.id_harga === h.id ? 'border-biru bg-biru/5 dark:bg-blue-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700']">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ikon-chip"><Ikon :nama="h.jenis === 'jasa' ? 'Wrench' : h.jenis === 'konsumsi' ? 'UtensilsCrossed' : 'Package'" :ukuran="15" /></span>
            <span class="min-w-0 flex-1"><b class="block truncate">{{ h.nama_item }}</b><span class="text-xs text-slate-500">{{ h.kelompok }} · {{ h.satuan }}</span></span>
            <span class="text-right"><b class="angka block">{{ rupiah(h.harga) }}</b><span v-if="h.harga_ssh" :class="['text-[11px]', h.harga > h.harga_ssh ? 'text-rose-600' : 'text-slate-500']">SSH {{ rupiah(h.harga_ssh) }}</span></span>
          </button>
          <p v-if="!hasilHarga.length" class="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800/50">Tidak ditemukan. Isi item secara manual di bawah, atau tambahkan dulu ke Standar Harga.</p>
        </div>
      </section>

      <!-- 2. Rincian item -->
      <section class="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
        <h3 class="flex items-center gap-2 text-sm font-bold"><span class="grid h-6 w-6 place-items-center rounded-full bg-biru text-xs text-white">2</span> Rincian item</h3>
        <div class="grid grid-cols-3 gap-2">
          <label v-for="[v, l, ik] in JENIS" :key="v" :class="['flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-semibold', f.jenis === v ? 'border-biru bg-biru/5 text-biru dark:bg-blue-950/30 dark:text-blue-300' : 'border-slate-300 dark:border-slate-600']">
            <input v-model="f.jenis" type="radio" :value="v" class="sr-only" /><Ikon :nama="ik" :ukuran="15" /> {{ l }}
          </label>
        </div>
        <div><label class="label" for="it-nama">Nama barang/jasa <span class="text-merah">*</span></label><input id="it-nama" v-model="f.nama" class="masukan" @blur="f.nama = rapikanNamaItem(f.nama, f.jenis)" />
          <p v-if="f.jenis === 'jasa'" class="mt-1 text-xs text-slate-500">Item jasa otomatis diawali kata “Jasa”.</p></div>
        <div><label class="label" for="it-spek">Spesifikasi / ruang lingkup</label><input id="it-spek" v-model="f.spesifikasi" class="masukan" placeholder="Merek, ukuran, lingkup pekerjaan…" /></div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><label class="label" for="it-vol">Volume <span class="text-merah">*</span></label><InputAngka id="it-vol" v-model="f.volume" class="masukan angka" /></div>
          <div><label class="label" for="it-sat">Satuan <span class="text-merah">*</span></label><input id="it-sat" v-model="f.satuan" class="masukan" /></div>
          <div class="col-span-2"><label class="label" for="it-hrg">Harga satuan (Rp) <span class="text-merah">*</span></label><InputAngka id="it-hrg" v-model="f.harga" class="masukan angka" /></div>
        </div>
        <p class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"><span class="text-slate-500">Jumlah</span><b class="angka">{{ rupiah(jumlah) }}</b></p>
      </section>

      <!-- 3. Uraian RKAS -->
      <section class="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
        <h3 class="flex items-center gap-2 text-sm font-bold"><span class="grid h-6 w-6 place-items-center rounded-full bg-biru text-xs text-white">3</span> Kaitkan ke uraian RKAS <span class="text-merah">*</span></h3>
        <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/30">
          <input type="checkbox" :checked="f.luar_rkas" class="mt-0.5 h-4 w-4 accent-[#E3A414]" @change="alihLuar" />
          <span><b class="block">Belum ada di RKAS (di luar RKAS)</b><span class="text-xs text-slate-600 dark:text-slate-300">Belanja dulu; item ini masuk daftar "perlu ditambahkan di ARKAS" di RKAS → Pergeseran dan bisa sekali klik dimasukkan ke draf.</span></span>
        </label>
        <div v-if="f.luar_rkas" class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="it-keg">Kegiatan ARKAS <span class="text-merah">*</span></label>
            <select id="it-keg" v-model="f.kode_kegiatan" class="masukan"><option value="">— pilih kegiatan —</option><option v-for="[k, n] in kegiatanLuar" :key="k" :value="k">{{ k }} · {{ n }}</option></select></div>
          <div><label class="label" for="it-rek">Rekening belanja <span class="text-merah">*</span></label>
            <select id="it-rek" v-model="f.kode_rekening" class="masukan"><option value="">— pilih rekening —</option><option v-for="[k, n] in rekeningLuar" :key="k" :value="k">{{ k }} · {{ n }}</option></select></div>
          <div class="sm:col-span-2"><label class="label" for="it-urk">Uraian yang akan ditambahkan di ARKAS</label><input id="it-urk" v-model="f.uraian_rkas" class="masukan" :placeholder="f.nama || 'Sama dengan nama item'" /></div>
        </div>
        <div v-if="!f.luar_rkas" class="flex gap-2">
          <div class="relative flex-1">
            <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="cariUraian" class="masukan pl-9" placeholder="Cari uraian, kode kegiatan, kode rekening…" />
          </div>
          <button type="button" class="tombol-garis px-3" @click="lihatSemuaUraian = !lihatSemuaUraian"><Ikon :nama="lihatSemuaUraian ? 'Sparkles' : 'ListTree'" :ukuran="16" class="text-biru" /> <span class="hidden sm:inline">{{ lihatSemuaUraian ? 'Usulan' : 'Semua' }}</span></button>
        </div>
        <template v-if="!f.luar_rkas">
        <p v-if="!cariUraian && !lihatSemuaUraian" class="text-xs text-slate-500">Usulan berdasarkan nama item & kode rekening Standar Harga.</p>
        <div class="gulir-halus max-h-64 space-y-1.5 overflow-y-auto pr-1">
          <button v-for="u in daftarUraian" :key="u.id" type="button" @click="pilihUraian(u)"
                  :class="['w-full rounded-xl border p-2.5 text-left text-sm transition', uraianTerpilih?.id === u.id ? 'border-biru bg-biru/5 dark:bg-blue-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700']">
            <span class="flex items-start justify-between gap-2"><b class="min-w-0 flex-1">{{ u.uraian }}</b><b class="angka shrink-0">{{ rupiah(u.harga) }}</b></span>
            <span class="kode mt-0.5 block truncate text-[11px] text-slate-500">{{ u.kode_kegiatan }} · {{ u.kode_rekening }} · {{ props.namaKegiatan(u.kode_kegiatan) }}</span>
            <span class="mt-0.5 block text-[11px] text-slate-500">Pagu {{ rupiah(u.jumlah) }} · sisa <b :class="u.jumlah - props.pakai(kunciUraian(u)).komitmen <= 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'">{{ rupiah(u.jumlah - props.pakai(kunciUraian(u)).komitmen) }}</b></span>
          </button>
          <p v-if="!daftarUraian.length" class="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800/50">Tidak ada usulan. Tekan “Semua” atau cari uraian RKAS.</p>
        </div>
        <div v-if="info" class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Rekening</p><p class="kode truncate text-xs font-semibold">{{ f.kode_rekening }}</p><p class="truncate text-[11px] text-slate-500">{{ props.namaRekening(f.kode_rekening) }}</p></div>
          <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Sisa pagu uraian</p><p :class="['angka font-bold', info.lewat ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400']">{{ rupiah(info.sisa) }}</p></div>
          <div v-if="info.rencanaBulan != null" class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Sisa rencana {{ NAMA_BULAN[props.bulan] }}</p><p :class="['angka font-bold', info.lewatBulan ? 'text-amber-600' : '']">{{ rupiah(info.sisaBulan) }}</p></div>
        </div>
        </template>
      </section>

      <div v-for="(w, i) in peringatan" :key="i" :class="['flex gap-2 rounded-xl p-3 text-sm', NADA[w.nada]]"><Ikon :nama="w.nada === 'info' ? 'Info' : 'TriangleAlert'" :ukuran="17" class="mt-0.5" /> {{ w.teks }}</div>
    </div>
    <template #kaki>
      <button class="tombol-utama" :disabled="!sah" @click="simpan"><Ikon nama="Save" :ukuran="17" /> {{ props.item ? 'Simpan item' : 'Tambahkan' }}</button>
      <button class="tombol-garis" @click="emit('tutup')">Batal</button>
      <span v-if="!sah" class="text-xs text-slate-500">Lengkapi nama, volume, satuan, harga & uraian RKAS{{ f.luar_rkas ? ' (kegiatan & rekening)' : '' }}.</span>
    </template>
  </Laci>
</template>
