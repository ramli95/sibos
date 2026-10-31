<script setup>
import { reactive, computed } from 'vue'
import { KATEGORI } from '@/utils/arkas'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const props = defineProps({ item: Object, bolehUbah: Boolean, menyimpan: Boolean, kelompok: { type: Array, default: () => [] }, semua: { type: Array, default: () => [] } })
const emit = defineEmits(['tutup', 'simpan', 'hapus'])
const f = reactive({
  kode_item: '', kelompok: 'Barang Lainnya', nama_item: '', spesifikasi: '', satuan: '', harga: 0, jenis: 'barang', kode_rekening: '', kategori: 'operasional',
  pajak_bawaan: 'PPN', tahun: new Date().getFullYear(), aktif: true, sumber: 'Manual', ...(props.item || {}),
})
const JENIS = [['barang', 'Barang'], ['jasa', 'Jasa'], ['konsumsi', 'Konsumsi'], ['transpor', 'Transpor'], ['honor', 'Honor'], ['langganan', 'Langganan'], ['administrasi', 'Administrasi']]
const PAJAK = ['', 'PPN', 'PPh 21', 'PPh 22', 'PPh 23', 'PPh 4(2)', 'Pajak daerah']
const ganda = computed(() => props.semua.find((x) => x.id !== props.item?.id && x.nama_item.trim().toLowerCase() === f.nama_item.trim().toLowerCase() && x.satuan === f.satuan && Number(x.harga) === Number(f.harga)))
const galatRek = computed(() => (f.kode_rekening && !/^5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(f.kode_rekening) ? 'Format: 5.1.02.01.01.0012' : ''))
const sah = computed(() => f.nama_item.trim() && f.satuan.trim() && Number(f.harga) > 0 && !ganda.value && !galatRek.value)
function pilihRekening() { if (f.kode_rekening.startsWith('5.2.02')) f.kategori = 'alat_mesin'; else if (f.kode_rekening.startsWith('5.2.05')) f.kategori = 'aset_lain'; else if (f.kode_rekening) f.kategori = 'operasional' }
function simpan() { if (sah.value) emit('simpan', { ...f, nama_item: f.nama_item.trim(), satuan: f.satuan.trim(), harga: Math.round(Number(f.harga)) }) }
</script>

<template>
  <Laci :judul="props.item?.id ? (props.bolehUbah ? 'Ubah standar harga' : 'Standar harga') : 'Tambah standar harga'" :subjudul="props.item?.nama_item" ikon="Tags" warna="from-amber-400 to-rose-500" @tutup="emit('tutup')">
    <fieldset :disabled="!props.bolehUbah" class="space-y-4 p-5">
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="sm:col-span-2"><label class="label" for="ni">Nama item <span class="text-merah">*</span></label><input id="ni" v-model="f.nama_item" class="masukan" /></div>
        <div><label class="label" for="ki">Kode item</label><input id="ki" v-model="f.kode_item" class="masukan kode" placeholder="otomatis" /></div>
      </div>
      <div><label class="label" for="sp">Spesifikasi</label><input id="sp" v-model="f.spesifikasi" class="masukan" placeholder="mis. 75 gsm, isi 500 lembar" /></div>
      <div class="grid gap-4 sm:grid-cols-3">
        <div><label class="label" for="sa">Satuan <span class="text-merah">*</span></label><input id="sa" v-model="f.satuan" class="masukan" /></div>
        <div><label class="label" for="hg">Harga satuan <span class="text-merah">*</span></label><input id="hg" v-model.number="f.harga" type="number" min="0" class="masukan angka" /><p class="mt-1 text-xs text-slate-500">{{ rupiah(f.harga) }}</p></div>
        <div><label class="label" for="th">Tahun</label><input id="th" v-model.number="f.tahun" type="number" class="masukan angka" /></div>
      </div>
      <p v-if="ganda" class="flex gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><Ikon nama="CircleAlert" :ukuran="14" /> Item dengan nama, satuan dan harga yang sama sudah ada.</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label class="label" for="kl">Kelompok</label><input id="kl" v-model="f.kelompok" list="daftar-kelompok" class="masukan" /><datalist id="daftar-kelompok"><option v-for="k in props.kelompok" :key="k" :value="k" /></datalist></div>
        <div><label class="label" for="jn">Jenis</label><select id="jn" v-model="f.jenis" class="masukan"><option v-for="[v, l] in JENIS" :key="v" :value="v">{{ l }}</option></select></div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label class="label" for="kr">Kode rekening</label><input id="kr" v-model="f.kode_rekening" class="masukan kode" placeholder="5.1.02.01.01.0012" @change="pilihRekening" /><p v-if="galatRek" class="mt-1 text-xs text-rose-600">{{ galatRek }}</p></div>
        <div><label class="label" for="pj">Pajak bawaan</label><select id="pj" v-model="f.pajak_bawaan" class="masukan"><option v-for="p in PAJAK" :key="p" :value="p">{{ p || 'Tanpa pajak' }}</option></select></div>
      </div>
      <div>
        <span class="label">Kategori anggaran</span>
        <div class="grid gap-2 sm:grid-cols-3">
          <label v-for="(k, kk) in KATEGORI" :key="kk" :class="['flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm', f.kategori === kk ? 'border-transparent bg-gradient-to-r text-white shadow ' + k.warna : 'border-slate-300 dark:border-slate-600']">
            <input v-model="f.kategori" type="radio" :value="kk" class="sr-only" /><Ikon :nama="k.ikon" :ukuran="16" /> {{ k.nama }}
          </label>
        </div>
      </div>
      <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><input v-model="f.aktif" type="checkbox" class="h-5 w-5 accent-emerald-600" /><span class="text-sm font-semibold">Aktif (bisa dipilih saat belanja)</span></label>

      <section v-if="props.item?.riwayat?.length" class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <h4 class="mb-2 flex items-center gap-2 text-sm font-bold"><Ikon nama="History" :ukuran="15" class="text-ungu" /> Riwayat harga</h4>
        <ol class="space-y-1 text-sm">
          <li v-for="(r, i) in [...props.item.riwayat].reverse()" :key="i" class="flex justify-between"><span class="text-slate-500">{{ r.tanggal }} · TA {{ r.tahun }}</span><b class="angka">{{ rupiah(r.harga) }}</b></li>
        </ol>
      </section>
    </fieldset>
    <template v-if="props.bolehUbah" #kaki>
      <button v-if="props.item?.id" class="tombol-garis text-rose-600" @click="emit('hapus')"><Ikon nama="Trash2" :ukuran="17" /> Hapus</button>
      <button class="tombol-utama ml-auto" :disabled="!sah || props.menyimpan" @click="simpan"><Ikon :nama="props.menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="props.menyimpan && 'animate-spin'" /> Simpan</button>
    </template>
  </Laci>
</template>
