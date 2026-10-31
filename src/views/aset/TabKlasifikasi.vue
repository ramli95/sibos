<script setup>
// Barang dari belanja Lunas: tentukan kelasnya (KIB / ekstrakomptabel / persediaan / bukan barang),
// lalu catat ke inventaris. Kelas bawaan ditebak dari kode rekening & nama barang; pilihan pengguna disimpan.
import { ref, computed } from 'vue'
import { useAset } from '@/stores/aset'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { KELAS_BARANG } from '@/config/aset'
import { simpanKelas, simpanAset, simpanAsetMassal, muatRefBarangModal } from '@/services/aset'
import { golongan, registerBerikut, usulanRefBarang } from '@/utils/aset'
import { rupiah, tanggalPendek, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import FormAset from './FormAset.vue'

const aset = useAset()
const auth = useAuth()
const notif = useNotifikasi()
const bolehUbah = computed(() => auth.punyaPeran('bendahara', 'pengurus_barang'))

const saring = ref('')
const cari = ref('')
const bulan = ref('')
const hitung = computed(() => Object.fromEntries(Object.keys(KELAS_BARANG).map((k) => [k, aset.barang.filter((x) => x.kelas === k).length])))
const daftar = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return aset.barang
    .filter((x) => !saring.value || (saring.value === 'belum' ? (x.kelas === 'kib' || x.kelas === 'ekstra') && x.tercatat < x.volume : x.kelas === saring.value))
    .filter((x) => bulan.value === '' || Number(String(x.tgl_lunas).slice(5, 7)) - 1 === Number(bulan.value))
    .filter((x) => !q || `${x.nama} ${x.spesifikasi} ${x.nama_pekerjaan} ${x.penyedia}`.toLowerCase().includes(q))
})
const belum = computed(() => aset.barang.filter((x) => (x.kelas === 'kib' || x.kelas === 'ekstra') && x.tercatat < x.volume))

async function ganti(x, kelas) {
  if (!bolehUbah.value || x.kelas === kelas) return
  const nilai = kelas === x.bawaan ? null : kelas
  const lama = aset.kelas[x.kunci]
  if (nilai) aset.kelas[x.kunci] = nilai; else delete aset.kelas[x.kunci]
  try { await simpanKelas(aset.tahun, { [x.kunci]: nilai }) } catch (e) {
    if (lama) aset.kelas[x.kunci] = lama; else delete aset.kelas[x.kunci]
    notif.kabari('Gagal menyimpan kelas: ' + e.message, 'galat')
  }
}

// Formulir catat satu barang
const form = ref(null)
const menyimpan = ref(false)
function dariItem(x, ref_ = []) {
  const usul = usulanRefBarang(ref_, x.nama, x.kode_rekening, 1)[0]
  return {
    jenis: x.kelas, kode_barang: x.kelas === 'kib' ? usul?.kode_barang || '' : '', nama: x.nama, spesifikasi: x.spesifikasi, jumlah: Math.max(1, x.volume - x.tercatat), satuan: x.satuan,
    harga_satuan: x.harga, tgl_perolehan: x.tanggal, kode_rekening: x.kode_rekening, kode_kegiatan: x.kode_kegiatan, id_belanja: x.id_belanja, id_item: x.id_item,
    nama_pekerjaan: x.nama_pekerjaan, penyedia: x.penyedia, asal: 'Dana BOSP', kondisi: 'B', id_ruang: '',
  }
}
async function catat(x) {
  let ref_ = []
  try { ref_ = await muatRefBarangModal() } catch { /* referensi opsional */ }
  form.value = dariItem(x, ref_)
}
async function simpan(data) {
  menyimpan.value = true
  try {
    await simpanAset(null, data, `Mencatat ${data.nama} (${data.jumlah} ${data.satuan}) ke inventaris dari belanja "${data.nama_pekerjaan}"`)
    notif.kabari('Barang tercatat di inventaris.')
    form.value = null
    await aset.segarkan()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

async function catatSemua() {
  if (!belum.value.length || !confirm(`Catat ${belum.value.length} barang ke inventaris sekaligus? Kode barang diisi dari usulan Referensi Barang Modal (bisa diubah kemudian), kondisi Baik, belum ditempatkan di ruangan.`)) return
  menyimpan.value = true
  try {
    let ref_ = []
    try { ref_ = await muatRefBarangModal() } catch { /* opsional */ }
    const sementara = [...aset.aset]
    const baru = belum.value.map((x) => {
      const a = dariItem(x, ref_)
      a.golongan = a.jenis === 'kib' ? golongan(a.kode_barang, a.kode_rekening) : null
      a.register_awal = registerBerikut(sementara, a.kode_barang)
      a.register_akhir = a.register_awal + a.jumlah - 1
      sementara.push(a)
      return a
    })
    await simpanAsetMassal(baru)
    notif.kabari(`${baru.length} barang tercatat di inventaris.`)
    await aset.segarkan()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex items-start gap-3 p-4 text-sm text-slate-600 dark:text-slate-300">
      <Ikon nama="Lightbulb" class="mt-0.5 shrink-0 text-[#E3A414]" />
      <span>Barang dari belanja Lunas dikelompokkan otomatis: rekening <b>5.2</b> → KIB; barang tahan lama atau ≥ Rp500.000 dari <b>5.1.02.01</b> → ekstrakomptabel; selebihnya → persediaan. Ketuk kelas lain bila tebakan keliru.</span>
    </div>

    <!-- Saring kelas -->
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-5" data-tur="klasifikasi-saring">
      <button :class="['kartu flex items-center gap-2 p-3 text-left', saring === 'belum' && 'ring-2 ring-amber-400']" @click="saring = saring === 'belum' ? '' : 'belum'">
        <span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip-peringatan"><Ikon nama="TriangleAlert" :ukuran="17" /></span>
        <span><span class="block text-xs text-slate-500">Belum dicatat</span><b class="angka text-lg">{{ belum.length }}</b></span>
      </button>
      <button v-for="(v, k) in KELAS_BARANG" :key="k" :class="['kartu flex items-center gap-2 p-3 text-left', saring === k && 'ring-2']" :style="saring === k ? { '--tw-ring-color': v.warna } : null" @click="saring = saring === k ? '' : k">
        <span class="grid h-9 w-9 place-items-center rounded-xl text-white" :style="{ background: v.warna }"><Ikon :nama="v.ikon" :ukuran="17" /></span>
        <span><span class="block text-xs text-slate-500">{{ v.singkat }}</span><b class="angka text-lg">{{ hitung[k] }}</b></span>
      </button>
    </div>

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[12rem] flex-1">
        <Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" type="search" class="masukan py-2 pl-9" placeholder="Cari barang, belanja, penyedia" aria-label="Cari barang" />
      </div>
      <select v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan"><option value="">Setahun</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <button v-if="bolehUbah && belum.length" class="tombol-utama" :disabled="menyimpan" @click="catatSemua"><Ikon nama="PackagePlus" :ukuran="17" /> Catat semua ({{ belum.length }})</button>
    </div>

    <div class="space-y-2" data-tur="klasifikasi-daftar">
      <div v-for="x in daftar" :key="x.kunci" class="kartu p-3">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" :style="{ background: KELAS_BARANG[x.kelas].warna }"><Ikon :nama="KELAS_BARANG[x.kelas].ikon" :ukuran="18" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ x.nama }}</p>
            <p v-if="x.spesifikasi" class="line-clamp-1 text-xs text-slate-500">{{ x.spesifikasi }}</p>
            <p class="text-xs text-slate-500">{{ tanggalPendek(x.tgl_lunas) }} · {{ x.nama_pekerjaan }}{{ x.penyedia ? ' · ' + x.penyedia : '' }}</p>
            <p class="kode text-xs text-slate-400">{{ x.kode_rekening }}</p>
          </div>
          <div class="shrink-0 text-right">
            <p class="angka text-sm font-bold">{{ rupiah(x.jumlah) }}</p>
            <p class="text-xs text-slate-500">{{ x.volume }} {{ x.satuan }} × {{ rupiah(x.harga) }}</p>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <button v-for="(v, k) in KELAS_BARANG" :key="k" :disabled="!bolehUbah" @click="ganti(x, k)"
                  :class="['flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition', x.kelas === k ? v.lencana : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800']">
            <Ikon :nama="v.ikon" :ukuran="13" /> {{ v.singkat }}
          </button>
          <span v-if="x.diubah" class="text-[11px] text-slate-400">(diubah dari {{ KELAS_BARANG[x.bawaan].singkat }})</span>
          <template v-if="x.kelas === 'kib' || x.kelas === 'ekstra'">
            <span :class="['lencana ml-auto', x.tercatat >= x.volume ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300']">
              <Ikon :nama="x.tercatat >= x.volume ? 'BadgeCheck' : 'Clock'" :ukuran="12" /> Tercatat {{ x.tercatat }}/{{ x.volume }}
            </span>
            <button v-if="bolehUbah && x.tercatat < x.volume" class="tombol-garis px-2.5 py-1.5 text-xs" @click="catat(x)"><Ikon nama="PackagePlus" :ukuran="14" class="text-biru" /> Catat</button>
          </template>
        </div>
      </div>
      <p v-if="!daftar.length" class="kartu p-8 text-center text-sm text-slate-500">{{ aset.memuat ? 'Memuat…' : 'Tidak ada barang pada saringan ini.' }}</p>
    </div>

    <FormAset v-if="form" :aset="form" :semua="aset.aset" :ruang="aset.ruang" :boleh-ubah="bolehUbah" :menyimpan="menyimpan" @tutup="form = null" @simpan="simpan" />
  </div>
</template>
