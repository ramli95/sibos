<script setup>
// Formulir satu baris inventaris (KIB atau ekstrakomptabel). Kode barang dipilih dari Referensi Barang Modal ARKAS;
// nomor register diusulkan otomatis per kode barang.
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { KELAS_BARANG, GOLONGAN_KIB, KONDISI } from '@/config/aset'
import { muatRefBarangModal } from '@/services/aset'
import { golongan, registerBerikut, usulanRefBarang, cariRefBarang } from '@/utils/aset'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const props = defineProps({ aset: Object, semua: { type: Array, default: () => [] }, ruang: { type: Array, default: () => [] }, bolehUbah: Boolean, menyimpan: Boolean })
const emit = defineEmits(['tutup', 'simpan', 'hapus'])

const f = reactive({
  jenis: 'kib', kode_barang: '', nama: '', merk: '', spesifikasi: '', bahan: '', ukuran: '', jumlah: 1, satuan: 'unit', harga_satuan: 0,
  tgl_perolehan: new Date().toISOString().slice(0, 10), register_awal: null, kondisi: 'B', id_ruang: '', asal: 'Dana BOSP', keterangan: '', status: 'aktif',
  kode_rekening: '', ...(props.aset || {}),
})
const regOtomatis = ref(!props.aset?.id)
const gol = computed(() => (f.jenis === 'kib' ? golongan(f.kode_barang, f.kode_rekening) : ''))
const usulReg = computed(() => registerBerikut(props.semua.filter((a) => a.id !== props.aset?.id), f.kode_barang))
watch([() => f.kode_barang, regOtomatis], () => { if (regOtomatis.value) f.register_awal = usulReg.value }, { immediate: true })
const regAkhir = computed(() => (Number(f.register_awal) || 0) + Math.max(1, Number(f.jumlah) || 1) - 1)
const nilai = computed(() => Math.round((Number(f.jumlah) || 0) * (Number(f.harga_satuan) || 0)))

// Referensi barang modal
const ref_ = ref([])
const cari = ref('')
const bukaRef = ref(false)
onMounted(async () => { try { ref_.value = await muatRefBarangModal() } catch { ref_.value = [] } })
const usulan = computed(() => (cari.value.trim() ? cariRefBarang(ref_.value, cari.value, 40) : usulanRefBarang(ref_.value, f.nama, f.kode_rekening, 10)))
function pilihRef(x) {
  f.kode_barang = x.kode_barang
  if (!f.nama) f.nama = x.nama
  if (!f.kode_rekening) f.kode_rekening = x.kode_rekening
  bukaRef.value = false
}

const sah = computed(() => !!f.nama.trim() && (Number(f.jumlah) || 0) >= 1)
function simpan() {
  if (!sah.value) return
  emit('simpan', { ...f, nama: f.nama.trim(), golongan: gol.value || null, register_awal: Number(f.register_awal) || null, register_akhir: regAkhir.value || null, id_ruang: f.id_ruang || null })
}
</script>

<template>
  <Laci :judul="props.aset?.id ? (props.bolehUbah ? 'Ubah barang inventaris' : 'Barang inventaris') : 'Catat barang inventaris'" :subjudul="props.aset?.nama_pekerjaan || props.aset?.nama" ikon="Boxes" @tutup="emit('tutup')">
    <fieldset :disabled="!props.bolehUbah" class="space-y-5 p-5">
      <div class="grid grid-cols-2 gap-2">
        <label v-for="k in ['kib', 'ekstra']" :key="k" :class="['cursor-pointer rounded-xl border p-3', f.jenis === k ? 'border-biru bg-biru/5 dark:bg-blue-950/30' : 'border-slate-300 dark:border-slate-600']">
          <input v-model="f.jenis" type="radio" :value="k" class="sr-only" />
          <span class="flex items-center gap-2 text-sm font-bold"><Ikon :nama="KELAS_BARANG[k].ikon" :ukuran="16" :style="{ color: KELAS_BARANG[k].warna }" /> {{ KELAS_BARANG[k].label }}</span>
          <span class="text-xs text-slate-500">{{ KELAS_BARANG[k].ket }}</span>
        </label>
      </div>

      <section class="space-y-3">
        <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="Barcode" :ukuran="16" class="text-biru" /> Kode barang (Referensi Barang Modal ARKAS)</h3>
        <div class="flex gap-2">
          <input v-model="f.kode_barang" class="masukan kode flex-1" placeholder="1.3.02.10.01.0002.00020" aria-label="Kode barang" />
          <button type="button" class="tombol-garis" @click="bukaRef = !bukaRef"><Ikon nama="Search" :ukuran="16" class="text-biru" /> Cari</button>
        </div>
        <p v-if="gol" class="text-xs text-slate-500"><Ikon nama="Layers" :ukuran="12" class="inline" /> {{ GOLONGAN_KIB[gol].judul }}</p>
        <div v-if="bukaRef" class="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
          <input v-model="cari" type="search" class="masukan mb-2 py-2" placeholder="Ketik nama barang, mis. laptop, meja siswa" aria-label="Cari referensi" />
          <p v-if="!ref_.length" class="p-2 text-xs text-slate-500">Memuat referensi…</p>
          <ul class="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            <li v-for="x in usulan" :key="x.kode_barang + x.spesifikasi">
              <button type="button" class="w-full rounded-lg p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800" @click="pilihRef(x)">
                <p class="text-sm font-semibold">{{ x.nama }} <span v-if="x.spesifikasi" class="font-normal text-slate-500">— {{ x.spesifikasi }}</span></p>
                <p class="kode text-xs text-slate-500">{{ x.kode_barang }} · {{ x.kode_rekening }} · {{ rupiah(x.harga) }}/{{ x.satuan }}</p>
              </button>
            </li>
            <li v-if="ref_.length && !usulan.length" class="p-2 text-xs text-slate-500">Tidak ditemukan. Kode barang boleh dikosongkan atau diketik manual.</li>
          </ul>
        </div>
      </section>

      <section class="space-y-4">
        <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="Package" :ukuran="16" class="text-biru" /> Barang</h3>
        <div><label class="label" for="fa-nama">Nama barang <span class="text-merah">*</span></label><input id="fa-nama" v-model="f.nama" class="masukan" /></div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="label" for="fa-merk">Merk / tipe</label><input id="fa-merk" v-model="f.merk" class="masukan" /></div>
          <div><label class="label" for="fa-bahan">Bahan</label><input id="fa-bahan" v-model="f.bahan" class="masukan" placeholder="Kayu, besi, plastik…" /></div>
        </div>
        <div><label class="label" for="fa-spek">Spesifikasi / ukuran</label><input id="fa-spek" v-model="f.spesifikasi" class="masukan" /></div>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><label class="label" for="fa-jml">Jumlah <span class="text-merah">*</span></label><input id="fa-jml" v-model.number="f.jumlah" type="number" min="1" class="masukan angka" /></div>
          <div><label class="label" for="fa-sat">Satuan</label><input id="fa-sat" v-model="f.satuan" class="masukan" /></div>
          <div class="col-span-2"><label class="label" for="fa-harga">Harga satuan (Rp)</label><input id="fa-harga" v-model.number="f.harga_satuan" type="number" min="0" class="masukan angka" /></div>
        </div>
        <p class="text-sm">Nilai perolehan: <b class="angka">{{ rupiah(nilai) }}</b></p>
      </section>

      <section class="space-y-4">
        <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="Hash" :ukuran="16" class="text-biru" /> Perolehan, register & penempatan</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="label" for="fa-tgl">Tanggal perolehan</label><input id="fa-tgl" v-model="f.tgl_perolehan" type="date" class="masukan" /></div>
          <div>
            <label class="label" for="fa-reg">Nomor register awal</label>
            <div class="flex items-center gap-2"><input id="fa-reg" v-model.number="f.register_awal" type="number" min="1" class="masukan angka" :disabled="regOtomatis" />
              <label class="flex shrink-0 items-center gap-1.5 text-xs"><input v-model="regOtomatis" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Otomatis</label></div>
            <p class="mt-1 text-xs text-slate-500">Register {{ String(f.register_awal || 0).padStart(4, '0') }}{{ regAkhir > (f.register_awal || 0) ? ` s.d. ${String(regAkhir).padStart(4, '0')}` : '' }} (urut per kode barang)</p>
          </div>
          <div><label class="label" for="fa-ruang">Ruangan</label>
            <select id="fa-ruang" v-model="f.id_ruang" class="masukan"><option value="">— Belum ditempatkan —</option><option v-for="r in props.ruang" :key="r.id" :value="r.id">{{ r.kode }} · {{ r.nama }}</option></select></div>
          <div><span class="label">Kondisi</span>
            <div class="flex gap-1.5"><label v-for="(v, k) in KONDISI" :key="k" :class="['flex-1 cursor-pointer rounded-xl border px-2 py-2 text-center text-xs font-semibold', f.kondisi === k ? v.lencana + ' border-transparent' : 'border-slate-300 dark:border-slate-600']"><input v-model="f.kondisi" type="radio" :value="k" class="sr-only" />{{ v.label }}</label></div></div>
          <div><label class="label" for="fa-asal">Asal usul</label><input id="fa-asal" v-model="f.asal" class="masukan" /></div>
          <div><label class="label" for="fa-status">Status</label>
            <select id="fa-status" v-model="f.status" class="masukan"><option value="aktif">Aktif / ada</option><option value="dihapus">Dihapus / dimusnahkan</option></select></div>
        </div>
        <div><label class="label" for="fa-ket">Keterangan</label><textarea id="fa-ket" v-model="f.keterangan" rows="2" class="masukan" /></div>
        <p v-if="props.aset?.id_belanja" class="flex items-center gap-1.5 text-xs text-slate-500"><Ikon nama="Link" :ukuran="13" /> Dari belanja: {{ props.aset.nama_pekerjaan }} · {{ props.aset.kode_rekening }}</p>
      </section>
    </fieldset>
    <template v-if="props.bolehUbah" #kaki>
      <button v-if="props.aset?.id" class="tombol-garis text-rose-600" :disabled="props.menyimpan" @click="emit('hapus', props.aset)"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
      <button class="tombol-utama ml-auto" :disabled="!sah || props.menyimpan" @click="simpan"><Ikon :nama="props.menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="props.menyimpan && 'animate-spin'" /> Simpan</button>
    </template>
  </Laci>
</template>
