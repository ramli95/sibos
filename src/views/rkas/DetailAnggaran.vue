<script setup>
// Pop-up "Isi Detail Anggaran Kegiatan" seperti ARKAS: kegiatan, rekening belanja, uraian, harga satuan,
// dan rencana per bulan (jumlah + satuan). Bila sudah ada belanja, tiap bulan menampilkan "Dibelanjakan"
// dan anggaran bulan itu tidak boleh di bawah yang sudah dibelanjakan.
import { reactive, ref, computed } from 'vue'
import { useRkas } from '@/stores/rkas'
import { kategoriRekening, KATEGORI } from '@/utils/arkas'
import { rupiah, NAMA_BULAN } from '@/utils/format'
import { NAMA_REKENING } from '@/services/rkas'
import Ikon from '@/components/Ikon.vue'

const props = defineProps({
  uraian: { type: Object, default: null }, // null = uraian baru
  usulan: { type: Object, default: null }, // isian awal untuk uraian baru (mis. dari belanja di luar RKAS)
  bolehUbah: Boolean,
  dibelanjakan: { type: Array, default: () => Array(12).fill(0) }, // rupiah per bulan dari belanja tercatat
  menyimpan: Boolean,
})
const emit = defineEmits(['tutup', 'simpan', 'hapus'])
const rkas = useRkas()

const awal = props.uraian || props.usulan || {}
const harga0 = Number(awal.harga) || 0
const f = reactive({
  kode_kegiatan: awal.kode_kegiatan || '', kode_rekening: awal.kode_rekening || '', uraian: awal.uraian || '',
  harga: harga0, satuan: awal.satuan || '',
})
// Kartu bulan: { i (0–11), vol }
const bulan = ref(
  (awal.bulan || []).map((rp, i) => ({ i, vol: harga0 ? Math.round(((rp || 0) / harga0) * 100) / 100 : 0 })).filter((b) => b.vol || props.dibelanjakan[b.i]),
)
if (!bulan.value.length) {
  if (awal.bulan) bulan.value = []
  else if (awal.volume) bulan.value = [{ i: 0, vol: Number(awal.volume) }]
}
props.dibelanjakan.forEach((rp, i) => { if (rp && !bulan.value.some((b) => b.i === i)) bulan.value.push({ i, vol: 0 }) })
bulan.value.sort((a, b) => a.i - b.i)

const sisaBulan = computed(() => NAMA_BULAN.map((n, i) => i).filter((i) => !bulan.value.some((b) => b.i === i)))
function tambahBulan() { if (sisaBulan.value.length) bulan.value.push({ i: sisaBulan.value[0], vol: 1 }); bulan.value.sort((a, b) => a.i - b.i) }
function buangBulan(k) { bulan.value.splice(k, 1) }
const rpBulan = (b) => Math.round((Number(b.vol) || 0) * (Number(f.harga) || 0))
const total = computed(() => bulan.value.reduce((s, b) => s + rpBulan(b), 0))
const volBelanja = (i) => (f.harga ? Math.round((props.dibelanjakan[i] / f.harga) * 100) / 100 : 0)

// Pencarian kegiatan & rekening (dari Referensi ARKAS + kode yang sudah dipakai RKAS)
const cariKeg = ref('')
const cariRek = ref('')
const bukaKeg = ref(false)
const bukaRek = ref(false)
const daftarKeg = computed(() => {
  const peta = new Map()
  rkas.refKegiatan.filter((k) => (k.tingkat ?? k.kode.split('.').length) >= 3 || k.kode.split('.').length === 3).forEach((k) => peta.set(k.kode, k.nama))
  rkas.uraian.forEach((u) => { if (!peta.has(u.kode_kegiatan)) peta.set(u.kode_kegiatan, rkas.nama.kegiatan(u.kode_kegiatan)) })
  const q = cariKeg.value.trim().toLowerCase()
  return [...peta.entries()].map(([kode, nama]) => ({ kode, nama })).filter((k) => !q || `${k.kode} ${k.nama}`.toLowerCase().includes(q)).sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })).slice(0, 40)
})
const daftarRek = computed(() => {
  const peta = new Map()
  rkas.refRekening.forEach((r) => peta.set(r.kode, r.nama))
  rkas.uraian.forEach((u) => { if (!peta.has(u.kode_rekening)) peta.set(u.kode_rekening, rkas.nama.rekening(u.kode_rekening)) })
  const q = cariRek.value.trim().toLowerCase()
  return [...peta.entries()].map(([kode, nama]) => ({ kode, nama })).filter((r) => !q || `${r.kode} ${r.nama}`.toLowerCase().includes(q)).sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })).slice(0, 40)
})
function tutupNanti(x) { setTimeout(() => { if (x === 'keg') bukaKeg.value = false; else bukaRek.value = false }, 150) }
// Uraian yang sudah dibelanjakan: kegiatan, rekening & nama uraian dikunci agar belanja tetap terkait
const terkunci = computed(() => !!props.uraian && props.dibelanjakan.some((x) => x))
const namaKeg = computed(() => (f.kode_kegiatan ? `${f.kode_kegiatan} · ${rkas.nama.kegiatan(f.kode_kegiatan) || ''}` : ''))
const namaRek = computed(() => (f.kode_rekening ? `${f.kode_rekening} · ${rkas.nama.rekening(f.kode_rekening) || NAMA_REKENING[f.kode_rekening] || ''}` : ''))

const galat = computed(() => {
  const g = []
  if (!/^\d{2}\.\d{2}\.\d{2}$/.test(f.kode_kegiatan)) g.push('Pilih kegiatan.')
  if (!/^5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(f.kode_rekening)) g.push('Pilih rekening belanja.')
  if (!f.uraian.trim()) g.push('Isi uraian.')
  if (!(Number(f.harga) > 0)) g.push('Isi harga satuan.')
  if (!f.satuan.trim()) g.push('Isi satuan.')
  if (!bulan.value.some((b) => Number(b.vol) > 0)) g.push('Isi jumlah minimal satu bulan.')
  bulan.value.forEach((b) => { if (rpBulan(b) < (props.dibelanjakan[b.i] || 0)) g.push(`${NAMA_BULAN[b.i]}: anggaran di bawah yang sudah dibelanjakan (${rupiah(props.dibelanjakan[b.i])}).`) })
  if (new Set(bulan.value.map((b) => b.i)).size !== bulan.value.length) g.push('Ada bulan yang dipilih dua kali.')
  return g
})
const berubah = computed(() => {
  if (!props.uraian) return true
  const u = props.uraian
  return u.kode_kegiatan !== f.kode_kegiatan || u.kode_rekening !== f.kode_rekening || u.uraian !== f.uraian.trim() || u.harga !== Number(f.harga) || u.satuan !== f.satuan.trim()
    || (u.bulan || []).some((rp, i) => (rp || 0) !== rpBulan(bulan.value.find((b) => b.i === i) || { vol: 0 }))
})
function simpan() {
  if (galat.value.length) return
  const per = Array(12).fill(0)
  bulan.value.forEach((b) => { per[b.i] = rpBulan(b) })
  const volume = Math.round(bulan.value.reduce((s, b) => s + (Number(b.vol) || 0), 0) * 100) / 100
  emit('simpan', {
    ...(props.uraian || {}), kode_kegiatan: f.kode_kegiatan, kode_rekening: f.kode_rekening, kategori: kategoriRekening(f.kode_rekening),
    uraian: f.uraian.trim(), harga: Math.round(Number(f.harga)), satuan: f.satuan.trim(), volume, jumlah: per.reduce((a, b) => a + b, 0), bulan: per,
  })
}
const kat = computed(() => (f.kode_rekening ? KATEGORI[kategoriRekening(f.kode_rekening)] : null))
</script>

<template>
  <Teleport to="body">
    <div class="tanpa-cetak fixed inset-0 z-[55] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" @click.self="emit('tutup')">
      <section class="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-[#161D2B]" role="dialog" aria-modal="true" aria-label="Detail anggaran kegiatan">
        <header class="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
          <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon :nama="props.bolehUbah ? 'FilePen' : 'FileText'" :ukuran="19" /></span>
          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-bold">{{ props.uraian ? (props.bolehUbah ? 'Edit Detail Anggaran' : 'Detail Anggaran') : 'Isi Detail Anggaran Kegiatan' }}</h2>
            <p v-if="!props.bolehUbah" class="text-xs text-slate-500">Hanya lihat — ubah lewat draf di tab Pergeseran.</p>
          </div>
          <button class="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="19" /></button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto">
        <fieldset :disabled="!props.bolehUbah" class="min-w-0 space-y-4 p-5">
          <!-- Kegiatan -->
          <div class="relative">
            <label class="label" for="da-keg">Kegiatan</label>
            <div class="relative">
              <Ikon nama="Search" :ukuran="17" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="da-keg" :disabled="terkunci" :value="bukaKeg ? cariKeg : namaKeg" class="masukan pl-9" placeholder="Apa kegiatan yang ingin dianggarkan?" autocomplete="off"
                     @focus="bukaKeg = true; cariKeg = ''" @input="cariKeg = $event.target.value" @blur="tutupNanti('keg')" />
            </div>
            <ul v-if="bukaKeg && props.bolehUbah" class="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <li v-for="k in daftarKeg" :key="k.kode"><button type="button" class="flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800" @mousedown.prevent="f.kode_kegiatan = k.kode; bukaKeg = false"><span class="kode shrink-0 text-xs text-slate-500">{{ k.kode }}</span>{{ k.nama }}</button></li>
              <li v-if="!daftarKeg.length" class="px-3 py-2 text-sm text-slate-500">Tidak ditemukan.</li>
            </ul>
          </div>
          <!-- Rekening -->
          <div class="relative">
            <label class="label" for="da-rek">Rekening Belanja</label>
            <div class="relative">
              <Ikon nama="Search" :ukuran="17" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="da-rek" :disabled="terkunci" :value="bukaRek ? cariRek : namaRek" class="masukan pl-9" placeholder="Apa jenis rekening belanja untuk kegiatan tersebut?" autocomplete="off"
                     @focus="bukaRek = true; cariRek = ''" @input="cariRek = $event.target.value" @blur="tutupNanti('rek')" />
            </div>
            <ul v-if="bukaRek && props.bolehUbah" class="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <li v-for="r in daftarRek" :key="r.kode"><button type="button" class="flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800" @mousedown.prevent="f.kode_rekening = r.kode; bukaRek = false"><span class="kode shrink-0 text-xs text-slate-500">{{ r.kode }}</span>{{ r.nama }}</button></li>
              <li v-if="!daftarRek.length" class="px-3 py-2 text-sm text-slate-500">Tidak ditemukan.</li>
            </ul>
            <p v-if="kat" class="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Ikon :nama="kat.ikon" :ukuran="13" /> {{ kat.panjang }}</p>
          </div>

          <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div class="grid gap-3 sm:grid-cols-[1fr_14rem]">
              <div><label class="label" for="da-ur">Uraian</label><input id="da-ur" v-model="f.uraian" :disabled="terkunci" class="masukan" placeholder="Apa detail barang atau jasanya? (mis. papan tulis, honor narasumber)" /></div>
              <div><label class="label" for="da-hg">Harga Satuan yang Dianggarkan</label><input id="da-hg" v-model.number="f.harga" type="number" min="0" class="masukan angka" placeholder="Berapa perkiraan harganya?" /></div>
            </div>
            <div class="mt-4 flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
              <p class="font-semibold">Dianggarkan untuk Bulan</p>
              <p class="text-sm">Total Anggaran: <b class="angka">{{ rupiah(total) }}</b><span v-if="props.uraian && total !== props.uraian.jumlah" :class="['ml-1 text-xs', total > props.uraian.jumlah ? 'text-emerald-600' : 'text-rose-600']">({{ total > props.uraian.jumlah ? '+' : '' }}{{ rupiah(total - props.uraian.jumlah) }})</span></p>
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div v-for="(b, k) in bulan" :key="k" class="relative rounded-2xl border border-slate-300 p-3 dark:border-slate-600">
                <button v-if="props.bolehUbah && !props.dibelanjakan[b.i]" type="button" class="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-700 text-white shadow hover:bg-rose-600" :aria-label="`Hapus ${NAMA_BULAN[b.i]}`" @click="buangBulan(k)"><Ikon nama="Minus" :ukuran="14" /></button>
                <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <select v-model.number="b.i" class="rounded-lg border-0 bg-transparent p-0 pr-6 text-sm font-semibold focus:ring-0" :aria-label="`Bulan ke-${k + 1}`">
                    <option v-for="(n, i) in NAMA_BULAN" :key="i" :value="i" :disabled="i !== b.i && bulan.some((x) => x.i === i)">{{ n }}</option>
                  </select>
                  <span class="angka text-sm font-bold">{{ rupiah(rpBulan(b)) }}</span>
                </div>
                <p class="mt-2 text-xs text-slate-500">Dianggarkan</p>
                <div class="mt-1 grid grid-cols-[5.5rem_1fr] gap-2">
                  <input v-model.number="b.vol" type="number" min="0" step="any" class="masukan angka py-2" :aria-label="`Jumlah ${NAMA_BULAN[b.i]}`" placeholder="Jumlah" />
                  <input v-model="f.satuan" class="masukan py-2" placeholder="Satuan" :aria-label="`Satuan ${NAMA_BULAN[b.i]}`" />
                </div>
                <template v-if="props.dibelanjakan[b.i]">
                  <div class="mt-2 flex items-center justify-between text-xs"><span class="text-slate-500">Dibelanjakan</span><b class="angka text-[#22A08D]">{{ rupiah(props.dibelanjakan[b.i]) }}</b></div>
                  <div class="mt-1 grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
                    <span class="rounded-xl bg-slate-100 px-3 py-2 text-right angka dark:bg-slate-800">{{ volBelanja(b.i).toLocaleString('id-ID') }}</span>
                    <span class="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">{{ f.satuan }}</span>
                  </div>
                </template>
              </div>
              <button v-if="props.bolehUbah && sisaBulan.length" type="button" class="flex min-h-[8rem] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-biru hover:text-biru dark:border-slate-600 dark:text-slate-300" @click="tambahBulan">
                <Ikon nama="Plus" :ukuran="17" /> Tambah Bulan
              </button>
            </div>
          </div>
          <p v-if="props.bolehUbah && terkunci" class="flex gap-1.5 text-xs text-slate-500"><Ikon nama="Lock" :ukuran="13" class="mt-0.5" /> Sudah ada belanja: kegiatan, rekening, dan nama uraian dikunci agar transaksi tetap terkait. Harga, jumlah, dan bulan masih bisa diubah.</p>
        </fieldset>
        </div>

        <footer class="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-[#161D2B]">
          <ul v-if="props.bolehUbah && galat.length" class="w-full space-y-0.5 text-xs text-rose-600"><li v-for="g in galat" :key="g" class="flex gap-1"><Ikon nama="CircleAlert" :ukuran="13" class="mt-0.5" /> {{ g }}</li></ul>
          <button v-if="props.bolehUbah && props.uraian && !props.dibelanjakan.some((x) => x)" class="tombol-garis text-rose-600" @click="emit('hapus')"><Ikon nama="Trash2" :ukuran="16" /> Hapus uraian</button>
          <div class="ml-auto flex gap-2">
            <button class="tombol-garis" @click="emit('tutup')">{{ props.bolehUbah ? 'Batal' : 'Tutup' }}</button>
            <button v-if="props.bolehUbah" class="tombol-utama bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900" :disabled="!!galat.length || !berubah || props.menyimpan" @click="simpan">
              <Ikon :nama="props.menyimpan ? 'RefreshCw' : props.uraian ? 'Save' : 'Plus'" :ukuran="17" :class="props.menyimpan && 'animate-spin'" /> {{ props.uraian ? 'Perbarui' : 'Masukkan ke Anggaran' }}
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
