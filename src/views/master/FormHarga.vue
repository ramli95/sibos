<script setup>
import { reactive, computed, ref } from 'vue'
import { KATEGORI } from '@/utils/arkas'
import { rupiah, persen } from '@/utils/format'
import { namaSumber } from '@/services/ssh'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'
import CariSsh from '@/components/CariSsh.vue'

const props = defineProps({ item: Object, bolehUbah: Boolean, menyimpan: Boolean, kelompok: { type: Array, default: () => [] }, semua: { type: Array, default: () => [] } })
const emit = defineEmits(['tutup', 'simpan', 'hapus'])
const f = reactive({
  kode_item: '', kelompok: 'Barang Lainnya', nama_item: '', spesifikasi: '', satuan: '', harga: 0, jenis: 'barang', kode_rekening: '', kategori: 'operasional',
  pajak_bawaan: 'PPN', tahun: new Date().getFullYear(), aktif: true, sumber: 'Manual', sumber_ssh: '', kode_ssh: '', uraian_ssh: '', harga_ssh: 0, ...(props.item || {}),
})
// Referensi SSH pemerintah: harga tertinggi yang boleh dipakai. Harga sekolah (toko) boleh berbeda.
const cariSsh = ref(false)
function pilihSsh(b) {
  Object.assign(f, { sumber_ssh: b.sumber, kode_ssh: b.kode, uraian_ssh: [b.uraian, b.spesifikasi].filter(Boolean).join(' — '), harga_ssh: b.harga })
  if (!f.nama_item.trim()) f.nama_item = b.uraian
  if (!f.spesifikasi.trim()) f.spesifikasi = b.spesifikasi
  if (!f.satuan.trim()) f.satuan = b.satuan
  if (!Number(f.harga)) f.harga = b.harga
  cariSsh.value = false
}
const lepasSsh = () => Object.assign(f, { sumber_ssh: '', kode_ssh: '', uraian_ssh: '', harga_ssh: 0 })
const selisihSsh = computed(() => (f.harga_ssh ? Number(f.harga) - f.harga_ssh : 0))
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
      <!-- Referensi SSH -->
      <section class="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 dark:border-sky-900 dark:bg-sky-950/20">
        <div class="flex flex-wrap items-center gap-2">
          <Ikon nama="Landmark" :ukuran="17" class="text-sky-600" />
          <b class="flex-1 text-sm">Referensi SSH pemerintah</b>
          <button type="button" class="tombol-garis px-3 py-1.5 text-xs" @click="cariSsh = true"><Ikon nama="Search" :ukuran="14" class="text-biru" /> {{ f.kode_ssh ? 'Ganti' : 'Cari di SSH' }}</button>
          <button v-if="f.kode_ssh" type="button" class="tombol-garis px-3 py-1.5 text-xs" @click="lepasSsh"><Ikon nama="X" :ukuran="14" class="text-rose-500" /> Lepas</button>
        </div>
        <p v-if="!f.kode_ssh" class="mt-1.5 text-xs text-slate-500">Opsional. Pilih item SSH Pemkot Makassar atau Pemprov Sulsel sebagai pembanding; harga sekolah tetap bisa mengikuti harga toko.</p>
        <div v-else class="mt-2 grid gap-2 text-sm sm:grid-cols-[1fr_auto]">
          <p class="min-w-0"><span class="block leading-snug">{{ f.uraian_ssh }}</span><span class="text-xs text-slate-500">{{ namaSumber(f.sumber_ssh) }} · <span class="kode">{{ f.kode_ssh }}</span></span></p>
          <div class="text-right">
            <p class="angka font-bold">{{ rupiah(f.harga_ssh) }}</p>
            <span v-if="selisihSsh > 0" class="lencana bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><Ikon nama="TrendingUp" :ukuran="12" /> {{ persen((selisihSsh / f.harga_ssh) * 100, 1) }} di atas SSH</span>
            <span v-else-if="selisihSsh < 0" class="lencana bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="TrendingDown" :ukuran="12" /> {{ persen((-selisihSsh / f.harga_ssh) * 100, 1) }} di bawah SSH</span>
            <span v-else class="lencana bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"><Ikon nama="Equal" :ukuran="12" /> Sama dengan SSH</span>
          </div>
        </div>
        <p v-if="selisihSsh > 0" class="mt-2 flex items-start gap-1.5 text-xs text-rose-700 dark:text-rose-300"><Ikon nama="TriangleAlert" :ukuran="14" class="mt-0.5" /> SSH adalah harga tertinggi. Siapkan alasan bila harga sekolah melebihi SSH.</p>
      </section>

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
    <CariSsh v-if="cariSsh" :awal="f.nama_item" @pilih="pilihSsh" @tutup="cariSsh = false" />
  </Laci>
</template>
