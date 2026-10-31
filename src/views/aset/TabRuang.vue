<script setup>
// Ruangan sekolah dan Kartu Inventaris Ruangan (KIR): isi ruangan, kondisi, penanggung jawab, cetak KIR & label.
import { ref, reactive, computed } from 'vue'
import { useAset } from '@/stores/aset'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { JENIS_RUANG, RUANG_AWAL, KONDISI } from '@/config/aset'
import { simpanRuang, simpanRuangMassal, hapusRuang } from '@/services/aset'
import { formatRegister } from '@/utils/aset'
import { rupiahRingkas } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokLabelBarang from '@/components/cetak/DokLabelBarang.vue'

const aset = useAset()
const auth = useAuth()
const notif = useNotifikasi()
const bolehUbah = computed(() => auth.punyaPeran('bendahara', 'pengurus_barang'))

const isi = (id) => aset.aktif.filter((a) => (id ? a.id_ruang === id : !a.id_ruang))
const kartu = computed(() => [...aset.ruang.map((r) => ({ ...r, barang: isi(r.id) })), { id: '', kode: '—', nama: 'Belum ditempatkan', jenis: 'lainnya', barang: isi('') }].map((r) => ({
  ...r, unit: r.barang.reduce((s, a) => s + (a.jumlah || 0), 0), nilai: r.barang.reduce((s, a) => s + (a.nilai || 0), 0), rusak: r.barang.filter((a) => a.kondisi !== 'B').length,
})))

const form = ref(null)
const f = reactive({})
const menyimpan = ref(false)
function buka(r) { Object.assign(f, { id: null, kode: `R-${String(aset.ruang.length + 1).padStart(2, '0')}`, nama: '', jenis: 'kelas', penanggung_jawab: '', nip_penanggung_jawab: '', keterangan: '' }, r || {}); form.value = true }
async function simpan() {
  if (!f.nama.trim()) return
  menyimpan.value = true
  try { await simpanRuang(f.id || null, f); notif.kabari('Ruangan disimpan.'); form.value = null; await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus() {
  if (isi(f.id).length) return notif.kabari('Ruangan masih berisi barang. Pindahkan dulu barangnya di tab KIB & Inventaris.', 'galat')
  if (!confirm(`Hapus ruangan ${f.nama}?`)) return
  try { await hapusRuang(f); form.value = null; await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}
async function isiBawaan() {
  try { await simpanRuangMassal(RUANG_AWAL.map((r) => ({ ...r, penanggung_jawab: '', nip_penanggung_jawab: '', keterangan: '' }))); await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}

// KIR
const kir = ref(null)
const cetakLabel = ref(null)
const kolomKir = [
  { judul: 'Nama Barang / Jenis Barang', nilai: (a) => a.nama },
  { judul: 'Merk/Model', nilai: (a) => a.merk, lebar: '2.8cm' },
  { judul: 'Bahan', nilai: (a) => a.bahan, lebar: '1.8cm' },
  { judul: 'Tahun Pembelian', nilai: (a) => String(a.tgl_perolehan || a.tahun).slice(0, 4), lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Kode Barang', nilai: (a) => a.kode_barang || 'Ekstrakomptabel', lebar: '3.4cm', kode: true },
  { judul: 'No. Register', nilai: (a) => formatRegister(a), lebar: '2.1cm', rata: 'tengah' },
  { judul: 'Jumlah', nilai: (a) => a.jumlah, lebar: '1.3cm', rata: 'tengah' },
  { judul: 'Harga (Rp)', nilai: (a) => a.nilai, lebar: '2.5cm', uang: true, jumlah: true },
  ...Object.keys(KONDISI).map((k) => ({ judul: k, nilai: (a) => (a.kondisi === k ? a.jumlah : ''), lebar: '1cm', rata: 'tengah' })),
  { judul: 'Keterangan', nilai: (a) => a.keterangan, lebar: '2.6cm' },
]
const labelRuang = computed(() => (cetakLabel.value?.barang || []).flatMap((a) => Array.from({ length: Math.max(1, a.jumlah || 1) }, (_, i) => ({
  id: a.id, kode_barang: a.kode_barang, register: String((Number(a.register_awal) || 1) + i).padStart(4, '0'), nama: a.nama, tahun: String(a.tgl_perolehan || a.tahun).slice(0, 4), ruang: cetakLabel.value.nama,
}))))
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="DoorOpen" :ukuran="19" /></span>
      <div class="min-w-0 flex-1"><p class="font-bold">{{ aset.ruang.length }} ruangan</p><p class="text-xs text-slate-500">KIR dicetak per ruangan dan ditempel di dinding ruangan.</p></div>
      <button v-if="bolehUbah && !aset.ruang.length" class="tombol-garis" @click="isiBawaan"><Ikon nama="Wand2" :ukuran="16" class="text-[#E3A414]" /> Isi daftar bawaan</button>
      <button v-if="bolehUbah" class="tombol-utama" @click="buka()"><Ikon nama="Plus" :ukuran="17" /> Ruangan</button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-tur="ruang-daftar">
      <div v-for="r in kartu" :key="r.id || 'tanpa'" :class="['kartu flex flex-col p-4', !r.id && 'border-2 border-dashed border-amber-300 dark:border-amber-700']">
        <div class="flex items-start gap-3">
          <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', r.id ? 'ikon-chip' : 'ikon-chip-peringatan']"><Ikon :nama="JENIS_RUANG[r.jenis]?.ikon || 'DoorOpen'" :ukuran="20" /></span>
          <div class="min-w-0 flex-1">
            <p class="kode text-xs text-slate-500">{{ r.kode }}</p>
            <p class="truncate font-bold">{{ r.nama }}</p>
            <p class="truncate text-xs text-slate-500">{{ r.penanggung_jawab ? `PJ: ${r.penanggung_jawab}` : (r.id ? 'Penanggung jawab belum diisi' : 'Tempatkan di tab KIB & Inventaris') }}</p>
          </div>
          <button v-if="bolehUbah && r.id" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" :aria-label="`Ubah ${r.nama}`" @click="buka(r)"><Ikon nama="Pencil" :ukuran="15" class="text-slate-400" /></button>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800/50"><p class="angka font-bold">{{ r.unit }}</p><p class="text-[11px] text-slate-500">unit</p></div>
          <div class="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800/50"><p class="angka font-bold">{{ rupiahRingkas(r.nilai) }}</p><p class="text-[11px] text-slate-500">nilai</p></div>
          <div :class="['rounded-lg py-1.5', r.rusak ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-800/50']"><p class="angka font-bold">{{ r.rusak }}</p><p class="text-[11px] opacity-70">rusak</p></div>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="tombol-garis flex-1 text-sm" :disabled="!r.barang.length" @click="kir = r"><Ikon nama="Printer" :ukuran="15" class="text-biru" /> KIR</button>
          <button class="tombol-garis flex-1 text-sm" :disabled="!r.barang.length" @click="cetakLabel = r"><Ikon nama="QrCode" :ukuran="15" class="text-[#22A08D]" /> Label</button>
        </div>
      </div>
    </div>

    <Laci v-if="form" :judul="f.id ? 'Ubah ruangan' : 'Tambah ruangan'" :subjudul="f.nama" ikon="DoorOpen" lebar="max-w-lg" @tutup="form = null">
      <div class="space-y-4 p-5">
        <div class="grid grid-cols-3 gap-3">
          <div><label class="label" for="r-kode">Kode</label><input id="r-kode" v-model="f.kode" class="masukan kode" /></div>
          <div class="col-span-2"><label class="label" for="r-nama">Nama ruangan <span class="text-merah">*</span></label><input id="r-nama" v-model="f.nama" class="masukan" placeholder="Ruang Kelas VII-A" /></div>
        </div>
        <div><span class="label">Jenis</span>
          <div class="grid grid-cols-2 gap-2"><label v-for="(v, k) in JENIS_RUANG" :key="k" :class="['flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm', f.jenis === k ? 'border-biru bg-biru/5 font-semibold dark:bg-blue-950/30' : 'border-slate-300 dark:border-slate-600']"><input v-model="f.jenis" type="radio" :value="k" class="sr-only" /><Ikon :nama="v.ikon" :ukuran="15" class="text-biru" /> {{ v.label }}</label></div></div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="r-pj">Penanggung jawab ruangan</label><input id="r-pj" v-model="f.penanggung_jawab" class="masukan" placeholder="Nama, gelar" /></div>
          <div><label class="label" for="r-nip">NIP penanggung jawab</label><input id="r-nip" v-model="f.nip_penanggung_jawab" class="masukan angka" inputmode="numeric" /></div>
        </div>
        <div><label class="label" for="r-ket">Keterangan</label><input id="r-ket" v-model="f.keterangan" class="masukan" /></div>
      </div>
      <template #kaki>
        <button v-if="f.id" class="tombol-garis text-rose-600" @click="hapus"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
        <button class="tombol-utama ml-auto" :disabled="!f.nama || menyimpan" @click="simpan"><Ikon nama="Save" :ukuran="17" /> Simpan</button>
      </template>
    </Laci>

    <CetakBuku v-if="kir" judul="Kartu Inventaris Ruangan (KIR)" :subjudul="`${kir.kode} — ${kir.nama}`" :kolom="kolomKir" :baris="kir.barang" :tanggal="new Date().toISOString().slice(0, 10)" kecil
               :identitas="[['Satuan Pendidikan', 'UPT SPF SMP Negeri 19 Makassar'], ['Pemilik', 'Pemerintah Kota Makassar'], ['Ruangan', `${kir.kode} — ${kir.nama}`]]"
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui, Kepala Sekolah' }"
               :ttd-tengah="kir.penanggung_jawab ? { label: 'Penanggung Jawab Ruangan', pejabat: { nama: kir.penanggung_jawab, nip: kir.nip_penanggung_jawab } } : null"
               :ttd-kanan="{ jabatan: 'pengurus_barang', label: 'Pengurus Barang' }" @tutup="kir = null" />
    <CetakSurat v-if="cetakLabel" :judul="`Label ${cetakLabel.nama}`" @tutup="cetakLabel = null"><DokLabelBarang :label="labelRuang" /></CetakSurat>
  </div>
</template>
