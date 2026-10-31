<script setup>
// Pergeseran anggaran antar uraian dan antar bulan dalam satu versi RKAS. Total versi harus tetap.
import { ref, computed, watch, onMounted } from 'vue'
import { useRkas } from '@/stores/rkas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { modePratinjau } from '@/services/firebase'
import { simpanPergeseran, muatPergeseran, rapikanUraian } from '@/services/rkas'
import { rupiah, NAMA_BULAN, formatWaktuRelatif } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const rkas = useRkas()
const auth = useAuth()
const notif = useNotifikasi()
const cari = ref('')
const keranjang = ref([]) // { sebelum, sesudah }
const alasan = ref('')
const menyimpan = ref(false)
const riwayat = ref([])
const adaBulan = computed(() => rkas.uraian.length > 0 && rkas.uraian.every((u) => u.bulan))

async function muatRiwayat() { if (rkas.idVersi) riwayat.value = await muatPergeseran(rkas.idVersi).catch(() => []) }
onMounted(muatRiwayat)
watch(() => rkas.idVersi, () => { keranjang.value = []; muatRiwayat() })

const hasilCari = computed(() => {
  const q = cari.value.trim().toLowerCase()
  if (q.length < 2) return []
  const dipilih = new Set(keranjang.value.map((k) => k.sesudah.id))
  return rkas.uraian.filter((u) => !dipilih.has(u.id) && [u.uraian, u.kode_kegiatan, u.kode_rekening].some((x) => x.toLowerCase().includes(q))).slice(0, 12)
})

function tambah(u) {
  keranjang.value.push({ sebelum: u, sesudah: { ...u, bulan: u.bulan ? [...u.bulan] : null } })
  cari.value = ''
}
function tambahBaru() {
  const contoh = keranjang.value[0]?.sesudah || rkas.uraian[0]
  keranjang.value.push({ sebelum: null, sesudah: { id: null, kode_kegiatan: contoh?.kode_kegiatan || '', kode_rekening: contoh?.kode_rekening || '', uraian: '', volume: 0, satuan: '', harga: 0, jumlah: 0, tahap1: 0, tahap2: 0, bulan: adaBulan.value ? Array(12).fill(0) : null, baru: true } })
}
const hapus = (i) => keranjang.value.splice(i, 1)

// Hitung ulang jumlah dari volume × harga
function hitung(k) {
  const s = k.sesudah
  s.jumlah = Math.round((Number(s.volume) || 0) * (Number(s.harga) || 0))
  if (!s.bulan) { s.tahap2 = Math.max(0, s.jumlah - (Number(s.tahap1) || 0)) }
}
const jumlahBulan = (s) => (s.bulan ? s.bulan.reduce((a, b) => a + (Number(b) || 0), 0) : (Number(s.tahap1) || 0) + (Number(s.tahap2) || 0))
const selisihBulan = (s) => s.jumlah - jumlahBulan(s)
function ratakanKe(k, i) { k.sesudah.bulan[i] = (Number(k.sesudah.bulan[i]) || 0) + selisihBulan(k.sesudah) }

const selisihTotal = computed(() => keranjang.value.reduce((t, k) => t + k.sesudah.jumlah - (k.sebelum?.jumlah || 0), 0))
const masalah = computed(() => {
  const m = []
  keranjang.value.forEach((k, i) => {
    const s = k.sesudah
    if (!s.uraian?.trim()) m.push(`Baris ${i + 1}: uraian kosong`)
    if (!/^\d{2}\.\d{2}\.\d{2}$/.test(s.kode_kegiatan)) m.push(`Baris ${i + 1}: kode kegiatan harus seperti 03.01.01`)
    if (!/^5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(s.kode_rekening)) m.push(`Baris ${i + 1}: kode rekening harus seperti 5.1.02.01.01.0012`)
    if (selisihBulan(s) !== 0) m.push(`Baris ${i + 1}: rincian ${s.bulan ? 'bulan' : 'tahap'} belum sama dengan jumlah (selisih ${rupiah(selisihBulan(s))})`)
    if (s.jumlah < 0 || s.volume < 0) m.push(`Baris ${i + 1}: volume tidak boleh negatif`)
  })
  if (keranjang.value.length && selisihTotal.value !== 0) m.push(`Total RKAS berubah ${rupiah(selisihTotal.value)} — harus 0`)
  return m
})
const bolehSimpan = computed(() => keranjang.value.length > 0 && masalah.value.length === 0 && !menyimpan.value)

async function simpan() {
  if (modePratinjau) { notif.kabari('Mode Pratinjau: pergeseran tidak disimpan.', 'info'); return }
  menyimpan.value = true
  try {
    const perubahan = keranjang.value.map((k) => ({ sebelum: k.sebelum, sesudah: rapikanUraian({ ...k.sesudah, id: k.sesudah.id || undefined }) }))
    await simpanPergeseran(rkas.versi, rkas.uraian, perubahan, alasan.value.trim())
    await rkas.pilihVersi(rkas.idVersi)
    keranjang.value = []; alasan.value = ''
    notif.kabari('Pergeseran tersimpan dan tercatat di log aktivitas.')
    await muatRiwayat()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
const kodeKegiatan = computed(() => [...new Set(rkas.uraian.map((u) => u.kode_kegiatan))].sort())
const kodeRekening = computed(() => [...new Set(rkas.uraian.map((u) => u.kode_rekening))].sort())
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div class="space-y-4">
      <section v-if="auth.isAdmin" class="kartu p-5">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-400 to-red-600 text-white shadow"><Ikon nama="ArrowRightLeft" :ukuran="19" /></span>
          <div class="flex-1">
            <h2 class="font-bold">Geser anggaran</h2>
            <p class="text-xs text-slate-500">Pilih uraian yang dikurangi dan ditambah, ubah volume/harga/bulan. Total {{ rkas.versi?.nama }} harus tetap {{ rupiah(rkas.versi?.total) }}.</p>
          </div>
        </div>
        <div class="relative">
          <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-3 text-slate-400" />
          <input v-model="cari" class="masukan pl-9" placeholder="Ketik uraian atau kode untuk menambah ke daftar pergeseran…" />
          <div v-if="hasilCari.length" class="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <button v-for="u in hasilCari" :key="u.id" type="button" class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" @click="tambah(u)">
              <Ikon nama="Plus" :ukuran="15" class="text-biru" />
              <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ u.uraian }}</span><span class="kode text-[11px] text-slate-500">{{ u.kode_kegiatan }} · {{ u.kode_rekening }} · {{ u.volume }} {{ u.satuan }}</span></span>
              <span class="angka text-xs font-semibold">{{ rupiah(u.jumlah) }}</span>
            </button>
          </div>
        </div>
        <button class="tombol-garis mt-3" @click="tambahBaru"><Ikon nama="Plus" :ukuran="16" class="text-emerald-600" /> Uraian baru</button>
      </section>

      <div v-for="(k, i) in keranjang" :key="i" class="kartu p-4">
        <div class="flex flex-wrap items-start gap-3">
          <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white', k.sesudah.jumlah < (k.sebelum?.jumlah || 0) ? 'bg-rose-500' : k.sesudah.jumlah > (k.sebelum?.jumlah || 0) ? 'bg-emerald-500' : 'bg-slate-400']">
            <Ikon :nama="k.sesudah.jumlah < (k.sebelum?.jumlah || 0) ? 'TrendingDown' : k.sesudah.jumlah > (k.sebelum?.jumlah || 0) ? 'TrendingUp' : 'Equal'" :ukuran="17" />
          </span>
          <div class="min-w-0 flex-1">
            <input v-if="k.sesudah.baru" v-model="k.sesudah.uraian" class="masukan py-2" placeholder="Nama uraian" />
            <p v-else class="font-semibold">{{ k.sesudah.uraian }}</p>
            <p v-if="!k.sesudah.baru" class="kode text-[11px] text-slate-500">{{ k.sesudah.kode_kegiatan }} · {{ k.sesudah.kode_rekening }}</p>
            <div v-else class="mt-2 grid gap-2 sm:grid-cols-3">
              <select v-model="k.sesudah.kode_kegiatan" class="masukan py-2 kode"><option v-for="x in kodeKegiatan" :key="x" :value="x">{{ x }} {{ rkas.nama.kegiatan(x).slice(0, 40) }}</option></select>
              <select v-model="k.sesudah.kode_rekening" class="masukan py-2 kode"><option v-for="x in kodeRekening" :key="x" :value="x">{{ x }}</option></select>
              <input v-model="k.sesudah.satuan" class="masukan py-2" placeholder="Satuan" />
            </div>
          </div>
          <button class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" aria-label="Keluarkan" @click="hapus(i)"><Ikon nama="Trash2" :ukuran="17" /></button>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label class="text-xs font-semibold text-slate-500">Volume<input v-model.number="k.sesudah.volume" type="number" min="0" step="any" class="masukan angka mt-1 py-2" @input="hitung(k)" /></label>
          <label class="text-xs font-semibold text-slate-500">Harga<input v-model.number="k.sesudah.harga" type="number" min="0" class="masukan angka mt-1 py-2" @input="hitung(k)" /></label>
          <div class="text-xs font-semibold text-slate-500">Sebelum<p class="angka mt-1 py-2 text-sm text-slate-700 dark:text-slate-200">{{ rupiah(k.sebelum?.jumlah || 0) }}</p></div>
          <div class="text-xs font-semibold text-slate-500">Sesudah<p class="angka mt-1 py-2 text-sm font-bold text-slate-900 dark:text-white">{{ rupiah(k.sesudah.jumlah) }}</p></div>
        </div>
        <div v-if="k.sesudah.bulan" class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <label v-for="(b, m) in k.sesudah.bulan" :key="m" class="text-[11px] font-semibold text-slate-500">
            <span class="flex items-center justify-between">{{ NAMA_BULAN[m].slice(0, 3) }}
              <button v-if="selisihBulan(k.sesudah) !== 0" type="button" class="text-biru hover:underline" title="Masukkan selisih ke bulan ini" @click="ratakanKe(k, m)">+sisa</button>
            </span>
            <input v-model.number="k.sesudah.bulan[m]" type="number" min="0" class="masukan angka mt-0.5 px-2 py-1.5 text-xs" />
          </label>
        </div>
        <div v-else class="mt-3 grid grid-cols-2 gap-2">
          <label class="text-xs font-semibold text-slate-500">Tahap I<input v-model.number="k.sesudah.tahap1" type="number" min="0" class="masukan angka mt-1 py-2" @input="k.sesudah.tahap2 = Math.max(0, k.sesudah.jumlah - (k.sesudah.tahap1 || 0))" /></label>
          <label class="text-xs font-semibold text-slate-500">Tahap II<input v-model.number="k.sesudah.tahap2" type="number" min="0" class="masukan angka mt-1 py-2" /></label>
        </div>
        <p v-if="selisihBulan(k.sesudah) !== 0" class="mt-2 text-xs font-semibold text-amber-600">Rincian {{ k.sesudah.bulan ? 'bulan' : 'tahap' }} belum sama dengan jumlah: selisih {{ rupiah(selisihBulan(k.sesudah)) }}</p>
      </div>

      <section v-if="keranjang.length" class="kartu p-4">
        <div class="flex flex-wrap items-center gap-3">
          <div :class="['flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold', selisihTotal === 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300']">
            <Ikon :nama="selisihTotal === 0 ? 'CircleCheck' : 'Scale'" :ukuran="17" /> Selisih total: <span class="angka">{{ rupiah(selisihTotal) }}</span>
          </div>
          <input v-model="alasan" class="masukan min-w-[14rem] flex-1 py-2" placeholder="Alasan pergeseran (mis. kebutuhan AC ruang kelas)" />
          <button class="tombol-utama" :disabled="!bolehSimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan pergeseran</button>
        </div>
        <ul v-if="masalah.length" class="mt-3 space-y-1 text-xs text-rose-600">
          <li v-for="m in masalah" :key="m" class="flex items-start gap-1.5"><Ikon nama="CircleAlert" :ukuran="13" class="mt-0.5" /> {{ m }}</li>
        </ul>
      </section>
      <div v-else-if="auth.isAdmin" class="kartu flex items-center gap-3 p-5 text-sm text-slate-500"><Ikon nama="Info" class="text-biru" /> Belum ada uraian di daftar pergeseran.</div>
    </div>

    <!-- Riwayat -->
    <aside class="kartu h-fit p-5">
      <h3 class="mb-3 flex items-center gap-2 font-bold"><Ikon nama="History" :ukuran="18" class="text-ungu" /> Riwayat pergeseran</h3>
      <p v-if="!riwayat.length" class="text-sm text-slate-500">Belum ada pergeseran pada versi ini.</p>
      <ol class="space-y-3">
        <li v-for="p in riwayat" :key="p.id" class="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
          <p class="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{{ formatWaktuRelatif(p.waktu) }}</span><span class="angka font-semibold text-slate-700 dark:text-slate-200">{{ rupiah(p.nilai) }}</span></p>
          <p v-if="p.alasan" class="mt-1 font-medium">{{ p.alasan }}</p>
          <ul class="mt-1.5 space-y-1 text-xs">
            <li v-for="(x, i) in p.rincian" :key="i" class="flex items-center gap-1.5">
              <Ikon :nama="(x.sesudah?.jumlah || 0) < (x.sebelum?.jumlah || 0) ? 'TrendingDown' : 'TrendingUp'" :ukuran="13" :class="(x.sesudah?.jumlah || 0) < (x.sebelum?.jumlah || 0) ? 'text-rose-500' : 'text-emerald-500'" />
              <span class="min-w-0 flex-1 truncate">{{ x.sesudah?.uraian }}</span>
              <span class="angka">{{ rupiah((x.sesudah?.jumlah || 0) - (x.sebelum?.jumlah || 0)) }}</span>
            </li>
          </ul>
        </li>
      </ol>
    </aside>
  </div>
</template>
