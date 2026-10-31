<script setup>
// KIB (B, E, …) dan Buku Inventaris (termasuk ekstrakomptabel): saring, ubah, pindah ruang, ubah kondisi,
// cetak KIB/Buku Inventaris F4, dan cetak label QR.
import { ref, computed } from 'vue'
import { useAset } from '@/stores/aset'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { KELAS_BARANG, GOLONGAN_KIB, KONDISI } from '@/config/aset'
import { simpanAset, hapusAset, ubahAsetMassal } from '@/services/aset'
import { formatRegister } from '@/utils/aset'
import { rupiah, rupiahRingkas, tanggalPendek } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokLabelBarang from '@/components/cetak/DokLabelBarang.vue'
import FormAset from './FormAset.vue'

const aset = useAset()
const auth = useAuth()
const notif = useNotifikasi()
const bolehUbah = computed(() => auth.punyaPeran('bendahara', 'pengurus_barang'))

const jenis = ref('') // '' | 'B' | 'E' | ... | 'ekstra'
const ruang = ref('')
const kondisi = ref('')
const tahunIni = ref(false)
const lihatHapus = ref(false)
const cari = ref('')
const daftar = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return aset.aset
    .filter((a) => lihatHapus.value || a.status !== 'dihapus')
    .filter((a) => !jenis.value || (jenis.value === 'ekstra' ? a.jenis === 'ekstra' : a.jenis === 'kib' && a.golongan === jenis.value))
    .filter((a) => !ruang.value || (ruang.value === '-' ? !a.id_ruang : a.id_ruang === ruang.value))
    .filter((a) => !kondisi.value || a.kondisi === kondisi.value)
    .filter((a) => !tahunIni.value || Number(a.tahun) === Number(aset.tahun))
    .filter((a) => !q || `${a.nama} ${a.merk} ${a.kode_barang} ${a.spesifikasi} ${a.keterangan}`.toLowerCase().includes(q))
    .sort((a, b) => String(a.kode_barang || '~').localeCompare(String(b.kode_barang || '~'), 'id', { numeric: true }) || (a.register_awal || 0) - (b.register_awal || 0))
})
const golAda = computed(() => [...new Set(aset.aktif.filter((a) => a.jenis === 'kib').map((a) => a.golongan || 'B'))].sort())
const jml = (arr, f) => arr.reduce((s, a) => s + (Number(f(a)) || 0), 0)
const statistik = computed(() => {
  const kib = aset.aktif.filter((a) => a.jenis === 'kib'), ek = aset.aktif.filter((a) => a.jenis === 'ekstra')
  return [
    { judul: 'Aset tetap (KIB)', nilai: rupiahRingkas(jml(kib, (a) => a.nilai)), sub: `${jml(kib, (a) => a.jumlah)} unit`, ikon: 'Boxes', nada: 'gelap', ringkas: true },
    { judul: 'Ekstrakomptabel', nilai: rupiahRingkas(jml(ek, (a) => a.nilai)), sub: `${jml(ek, (a) => a.jumlah)} unit`, ikon: 'Armchair', nada: 'primer', ringkas: true },
    { judul: 'Belum ditempatkan', nilai: aset.aktif.filter((a) => !a.id_ruang).length, sub: 'catatan tanpa ruangan', ikon: 'DoorOpen', nada: aset.aktif.some((a) => !a.id_ruang) ? 'peringatan' : 'sukses' },
    { judul: 'Rusak (KB/RB)', nilai: aset.aktif.filter((a) => a.kondisi !== 'B').length, sub: 'catatan perlu tindak lanjut', ikon: 'Wrench', nada: aset.aktif.some((a) => a.kondisi === 'RB') ? 'bahaya' : 'primer' },
  ]
})

// Pilihan massal
const pilih = ref(new Set())
const semuaDipilih = computed(() => daftar.value.length > 0 && daftar.value.every((a) => pilih.value.has(a.id)))
function alihSemua() { pilih.value = semuaDipilih.value ? new Set() : new Set(daftar.value.map((a) => a.id)) }
function alih(id) { const s = new Set(pilih.value); s.has(id) ? s.delete(id) : s.add(id); pilih.value = s }
const terpilih = computed(() => aset.aset.filter((a) => pilih.value.has(a.id)))
const keRuang = ref('')
const keKondisi = ref('')
async function terapkan(ubah, ket) {
  try { await ubahAsetMassal(terpilih.value, ubah, ket); notif.kabari('Perubahan disimpan.'); await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}

// Formulir
const form = ref(null)
const menyimpan = ref(false)
async function simpan(data) {
  menyimpan.value = true
  try { await simpanAset(data.id || null, data); notif.kabari('Barang disimpan.'); form.value = null; await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus(a) {
  if (!confirm(`Hapus catatan "${a.nama}" dari inventaris? Untuk barang yang rusak/dimusnahkan, sebaiknya ubah statusnya menjadi "Dihapus" agar riwayat tetap ada.`)) return
  menyimpan.value = true
  try { await hapusAset(a); form.value = null; await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

// Cetak
const cetak = ref('')
const cetakKib = ref('B')
const kolomKibB = [
  { judul: 'Kode Barang', nilai: (a) => a.kode_barang, lebar: '3.6cm', kode: true },
  { judul: 'Nama/Jenis Barang', nilai: (a) => a.nama },
  { judul: 'No. Register', nilai: (a) => formatRegister(a), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Merk/Type', nilai: (a) => a.merk, lebar: '3cm' },
  { judul: 'Ukuran/CC', nilai: (a) => a.ukuran || a.spesifikasi, lebar: '3cm' },
  { judul: 'Bahan', nilai: (a) => a.bahan, lebar: '1.8cm' },
  { judul: 'Tahun Pembelian', nilai: (a) => String(a.tgl_perolehan || a.tahun).slice(0, 4), lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Asal Usul', nilai: (a) => a.asal, lebar: '2cm' },
  { judul: 'Jumlah', nilai: (a) => `${a.jumlah} ${a.satuan || ''}`, lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Harga (Rp)', nilai: (a) => a.nilai, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Keterangan', nilai: (a) => [KONDISI[a.kondisi]?.label, aset.namaRuang(a.id_ruang), a.keterangan].filter(Boolean).join('; '), lebar: '3cm' },
]
const kolomKibE = [
  { judul: 'Kode Barang', nilai: (a) => a.kode_barang, lebar: '3.6cm', kode: true },
  { judul: 'Nama Barang', nilai: (a) => a.nama },
  { judul: 'No. Register', nilai: (a) => formatRegister(a), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Judul/Pencipta/Spesifikasi', nilai: (a) => [a.merk, a.spesifikasi].filter(Boolean).join(' — '), lebar: '5cm' },
  { judul: 'Jumlah', nilai: (a) => `${a.jumlah} ${a.satuan || ''}`, lebar: '1.8cm', rata: 'tengah' },
  { judul: 'Tahun Cetak/Pembelian', nilai: (a) => String(a.tgl_perolehan || a.tahun).slice(0, 4), lebar: '1.8cm', rata: 'tengah' },
  { judul: 'Asal Usul', nilai: (a) => a.asal, lebar: '2cm' },
  { judul: 'Harga (Rp)', nilai: (a) => a.nilai, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Keterangan', nilai: (a) => [KONDISI[a.kondisi]?.label, aset.namaRuang(a.id_ruang), a.keterangan].filter(Boolean).join('; '), lebar: '3cm' },
]
const kolomBuku = [
  { judul: 'Kode Barang', nilai: (a) => a.kode_barang || '(ekstrakomptabel)', lebar: '3.4cm', kode: true },
  { judul: 'Register', nilai: (a) => formatRegister(a), lebar: '2cm', rata: 'tengah' },
  { judul: 'Nama/Jenis Barang', nilai: (a) => a.nama },
  { judul: 'Merk/Type', nilai: (a) => a.merk, lebar: '2.6cm' },
  { judul: 'Bahan', nilai: (a) => a.bahan, lebar: '1.7cm' },
  { judul: 'Asal', nilai: (a) => a.asal, lebar: '1.8cm' },
  { judul: 'Tahun', nilai: (a) => String(a.tgl_perolehan || a.tahun).slice(0, 4), lebar: '1.3cm', rata: 'tengah' },
  { judul: 'Jumlah', nilai: (a) => `${a.jumlah} ${a.satuan || ''}`, lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Kondisi', nilai: (a) => a.kondisi, lebar: '1.2cm', rata: 'tengah' },
  { judul: 'Harga (Rp)', nilai: (a) => a.nilai, lebar: '2.5cm', uang: true, jumlah: true },
  { judul: 'Ruangan / Keterangan', nilai: (a) => [aset.namaRuang(a.id_ruang), a.jenis === 'ekstra' ? 'Ekstrakomptabel' : '', a.keterangan].filter(Boolean).join('; '), lebar: '3.2cm' },
]
const barisCetak = computed(() => {
  const aktif = aset.aktif.slice().sort((a, b) => String(a.kode_barang || '~').localeCompare(String(b.kode_barang || '~'), 'id', { numeric: true }) || (a.register_awal || 0) - (b.register_awal || 0))
  if (cetak.value === 'kib') return aktif.filter((a) => a.jenis === 'kib' && (a.golongan || 'B') === cetakKib.value)
  if (cetak.value === 'ekstra') return aktif.filter((a) => a.jenis === 'ekstra')
  return aktif
})
const judulCetak = computed(() => cetak.value === 'kib' ? `Kartu Inventaris Barang (${GOLONGAN_KIB[cetakKib.value].judul.replace(/^KIB \w — /, `KIB ${cetakKib.value} `)})` : cetak.value === 'ekstra' ? 'Daftar Barang Ekstrakomptabel' : 'Buku Inventaris')
const kolomCetak = computed(() => (cetak.value === 'kib' ? (cetakKib.value === 'E' ? kolomKibE : kolomKibB) : kolomBuku))
async function excel() {
  try {
    await eksporExcel({ judul: judulCetak.value, namaBerkas: `${judulCetak.value} ${aset.tahun}`, baris: barisCetak.value,
      kolom: kolomCetak.value.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : /Nama|Judul/.test(k.judul) ? 40 : 18, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) })
  } catch (e) { notif.kabari(e.message, 'galat') }
}

// Label QR: satu label per unit
const label = computed(() => (terpilih.value.length ? terpilih.value : daftar.value).flatMap((a) => {
  const n = Math.max(1, Number(a.jumlah) || 1)
  return Array.from({ length: n }, (_, i) => ({ id: a.id, kode_barang: a.kode_barang, register: String((Number(a.register_awal) || 1) + i).padStart(4, '0'), nama: a.nama, tahun: String(a.tgl_perolehan || a.tahun).slice(0, 4), ruang: aset.namaRuang(a.id_ruang) }))
}))
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="aset.memuat" :bisa-klik="false" />

    <div class="kartu space-y-2 p-3" data-tur="inventaris-saring">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-[12rem] flex-1">
          <Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="cari" type="search" class="masukan py-2 pl-9" placeholder="Cari nama, merk, kode barang" aria-label="Cari barang" />
        </div>
        <select v-model="jenis" class="masukan w-auto py-2" aria-label="Jenis"><option value="">Semua jenis</option><option v-for="g in golAda" :key="g" :value="g">KIB {{ g }}</option><option value="ekstra">Ekstrakomptabel</option></select>
        <select v-model="ruang" class="masukan w-auto py-2" aria-label="Ruangan"><option value="">Semua ruangan</option><option value="-">Belum ditempatkan</option><option v-for="r in aset.ruang" :key="r.id" :value="r.id">{{ r.nama }}</option></select>
        <select v-model="kondisi" class="masukan w-auto py-2" aria-label="Kondisi"><option value="">Semua kondisi</option><option v-for="(v, k) in KONDISI" :key="k" :value="k">{{ v.label }}</option></select>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm"><input v-model="tahunIni" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Perolehan {{ aset.tahun }} saja</label>
        <label class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm"><input v-model="lihatHapus" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Tampilkan yang dihapus</label>
        <div class="ml-auto flex flex-wrap gap-2">
          <button v-if="bolehUbah" class="tombol-utama" @click="form = { jenis: 'ekstra', asal: 'Hibah/lainnya' }"><Ikon nama="Plus" :ukuran="17" /> <span class="hidden sm:inline">Tambah manual</span></button>
          <button class="tombol-garis" @click="cetak = 'label'"><Ikon nama="QrCode" :ukuran="17" class="text-[#22A08D]" /> <span class="hidden sm:inline">Label QR</span></button>
          <button class="tombol-garis" @click="cetak = 'buku'"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Cetak</span></button>
        </div>
      </div>
    </div>

    <!-- Aksi massal -->
    <div v-if="bolehUbah && pilih.size" class="kartu flex flex-wrap items-center gap-2 border-2 border-biru/40 p-3">
      <b class="text-sm">{{ pilih.size }} dipilih</b>
      <select v-model="keRuang" class="masukan w-auto py-2" aria-label="Pindah ke ruangan"><option value="">Pindah ke ruangan…</option><option v-for="r in aset.ruang" :key="r.id" :value="r.id">{{ r.nama }}</option></select>
      <button class="tombol-garis" :disabled="!keRuang" @click="terapkan({ id_ruang: keRuang }, `Memindahkan barang ke ${aset.namaRuang(keRuang)}`)"><Ikon nama="DoorOpen" :ukuran="16" class="text-biru" /> Pindahkan</button>
      <select v-model="keKondisi" class="masukan w-auto py-2" aria-label="Ubah kondisi"><option value="">Ubah kondisi…</option><option v-for="(v, k) in KONDISI" :key="k" :value="k">{{ v.label }}</option></select>
      <button class="tombol-garis" :disabled="!keKondisi" @click="terapkan({ kondisi: keKondisi }, `Mengubah kondisi barang menjadi ${KONDISI[keKondisi]?.label}`)"><Ikon nama="Wrench" :ukuran="16" class="text-[#E3A414]" /> Terapkan</button>
      <button class="ml-auto text-sm text-slate-500 underline" @click="pilih = new Set()">Batal pilih</button>
    </div>

    <section class="kartu overflow-hidden" data-tur="inventaris-daftar">
      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th v-if="bolehUbah" class="w-10 px-3 py-2.5"><input type="checkbox" :checked="semuaDipilih" class="h-4 w-4 accent-[#1A56DB]" aria-label="Pilih semua" @change="alihSemua" /></th>
            <th class="px-3 py-2.5 text-left">Kode / Register</th><th class="px-3 py-2.5 text-left">Barang</th><th class="px-3 py-2.5 text-left">Ruangan</th>
            <th class="px-3 py-2.5 text-center">Jumlah</th><th class="px-3 py-2.5 text-center">Kondisi</th><th class="px-3 py-2.5 text-right">Nilai</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="a in daftar" :key="a.id" :class="['cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40', a.status === 'dihapus' && 'opacity-50 line-through']" @click="form = { ...a }">
              <td v-if="bolehUbah" class="px-3 py-2" @click.stop><input type="checkbox" :checked="pilih.has(a.id)" class="h-4 w-4 accent-[#1A56DB]" :aria-label="`Pilih ${a.nama}`" @change="alih(a.id)" /></td>
              <td class="px-3 py-2"><p class="kode text-xs">{{ a.kode_barang || '—' }}</p><p class="text-xs text-slate-500">Reg. {{ formatRegister(a) || '—' }}</p></td>
              <td class="px-3 py-2">
                <p class="font-semibold">{{ a.nama }} <span :class="['lencana ml-1 align-middle', KELAS_BARANG[a.jenis]?.lencana]">{{ a.jenis === 'kib' ? `KIB ${a.golongan || 'B'}` : 'Ekstra' }}</span></p>
                <p class="line-clamp-1 text-xs text-slate-500">{{ [a.merk, a.spesifikasi].filter(Boolean).join(' · ') }} · {{ tanggalPendek(a.tgl_perolehan) }}</p>
              </td>
              <td class="px-3 py-2 text-xs">{{ aset.namaRuang(a.id_ruang) || '—' }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-center">{{ a.jumlah }} {{ a.satuan }}</td>
              <td class="px-3 py-2 text-center"><span :class="['lencana', KONDISI[a.kondisi]?.lencana]">{{ a.kondisi }}</span></td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right font-semibold">{{ rupiah(a.nilai, { tanpaRp: true }) }}</td>
            </tr>
            <tr v-if="!daftar.length"><td colspan="7" class="px-3 py-8 text-center text-slate-500">Belum ada barang. Catat dari tab Barang dari Belanja.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        <div v-for="a in daftar" :key="a.id" :class="['flex items-start gap-3 p-3', a.status === 'dihapus' && 'opacity-50']">
          <input v-if="bolehUbah" type="checkbox" :checked="pilih.has(a.id)" class="mt-1 h-4 w-4 accent-[#1A56DB]" :aria-label="`Pilih ${a.nama}`" @change="alih(a.id)" />
          <button class="min-w-0 flex-1 text-left" @click="form = { ...a }">
            <p class="font-semibold">{{ a.nama }}</p>
            <p class="kode text-xs text-slate-500">{{ a.kode_barang || 'Ekstrakomptabel' }} · Reg. {{ formatRegister(a) || '—' }}</p>
            <p class="text-xs text-slate-500">{{ aset.namaRuang(a.id_ruang) || 'Belum ditempatkan' }} · {{ a.jumlah }} {{ a.satuan }} · <span :class="['lencana', KONDISI[a.kondisi]?.lencana]">{{ a.kondisi }}</span></p>
          </button>
          <b class="angka shrink-0 text-sm">{{ rupiahRingkas(a.nilai) }}</b>
        </div>
      </div>
    </section>

    <FormAset v-if="form" :aset="form" :semua="aset.aset" :ruang="aset.ruang" :boleh-ubah="bolehUbah" :menyimpan="menyimpan" @tutup="form = null" @simpan="simpan" @hapus="hapus" />

    <CetakBuku v-if="cetak === 'buku' || cetak === 'kib' || cetak === 'ekstra'" :judul="judulCetak" :subjudul="`Keadaan per ${tanggalPendek(new Date().toISOString().slice(0, 10))}`"
               :kolom="kolomCetak" :baris="barisCetak" :tanggal="new Date().toISOString().slice(0, 10)" excel kecil
               :identitas="[['Satuan Pendidikan', 'UPT SPF SMP Negeri 19 Makassar'], ['Kode Lokasi/Unit', '1.01.0.00.0.00.01.0047'], ['Pemilik', 'Pemerintah Kota Makassar']]"
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui, Kepala Sekolah' }" :ttd-kanan="{ jabatan: 'pengurus_barang', label: 'Pengurus Barang' }"
               @excel="excel" @tutup="cetak = ''">
      <template #alat>
        <select v-model="cetak" class="rounded-xl bg-white/10 px-2 py-2 text-sm text-white" aria-label="Jenis cetakan">
          <option value="buku" class="text-black">Buku Inventaris</option><option value="kib" class="text-black">KIB per golongan</option><option value="ekstra" class="text-black">Ekstrakomptabel</option>
        </select>
        <select v-if="cetak === 'kib'" v-model="cetakKib" class="rounded-xl bg-white/10 px-2 py-2 text-sm text-white" aria-label="Golongan KIB">
          <option v-for="(v, k) in GOLONGAN_KIB" :key="k" :value="k" class="text-black">KIB {{ k }}</option>
        </select>
      </template>
    </CetakBuku>
    <CetakSurat v-if="cetak === 'label'" :judul="`Label Barang (${label.length} label)`" @tutup="cetak = ''">
      <DokLabelBarang :label="label" />
    </CetakSurat>
  </div>
</template>
