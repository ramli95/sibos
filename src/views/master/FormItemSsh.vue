<script setup>
// Ubah / tambah / hapus satu item SSH pemerintah (hanya Bendahara)
import { reactive, computed } from 'vue'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const props = defineProps({ item: Object, sumber: Object, menyimpan: Boolean })
const emit = defineEmits(['tutup', 'simpan', 'hapus'])
const baru = props.item?.idx == null
const f = reactive({ kode: '', kelompok: '', uraian: '', spesifikasi: '', satuan: '', harga: 0, ...(props.item || {}) })
const hargaAwal = props.item?.harga || 0
const sah = computed(() => f.uraian.trim() && f.satuan.trim() && Number(f.harga) > 0)
function simpan() {
  if (!sah.value) return
  emit('simpan', { kode: f.kode.trim(), kelompok: f.kelompok.trim(), uraian: f.uraian.trim(), spesifikasi: f.spesifikasi.trim(), satuan: f.satuan.trim(), harga: Math.round(Number(f.harga)) })
}
</script>

<template>
  <Laci :judul="baru ? 'Tambah item SSH' : 'Ubah item SSH'" :subjudul="props.sumber?.nama" ikon="Landmark" lebar="max-w-xl" @tutup="emit('tutup')">
    <div class="space-y-4 p-5">
      <p class="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
        <Ikon nama="Info" :ukuran="15" class="mt-px text-biru" />
        Perubahan berlaku untuk semua pengguna SIBOS di sekolah ini. Gunakan untuk mengoreksi hasil baca dokumen atau menyesuaikan dengan Perwali/Pergub terbaru.
      </p>
      <div><label class="label" for="su">Uraian <span class="text-merah">*</span></label><input id="su" v-model="f.uraian" class="masukan" /></div>
      <div><label class="label" for="ss">Spesifikasi</label><input id="ss" v-model="f.spesifikasi" class="masukan" /></div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label class="label" for="st">Satuan <span class="text-merah">*</span></label><input id="st" v-model="f.satuan" class="masukan" placeholder="mis. Orang/Kali" /></div>
        <div>
          <label class="label" for="sh">Harga <span class="text-merah">*</span></label>
          <input id="sh" v-model.number="f.harga" type="number" min="0" inputmode="numeric" class="masukan angka" />
          <p class="mt-1 text-xs text-slate-500">{{ rupiah(f.harga) }}<template v-if="!baru && Number(f.harga) !== hargaAwal"> · sebelumnya {{ rupiah(hargaAwal) }}</template></p>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label class="label" for="sg">Kelompok</label><input id="sg" v-model="f.kelompok" class="masukan" placeholder="mis. Konsumsi Makan dan Minum" /></div>
        <div><label class="label" for="sk">Kode</label><input id="sk" v-model="f.kode" class="masukan kode" /></div>
      </div>
    </div>
    <template #kaki>
      <button v-if="!baru" class="tombol-garis text-rose-600" :disabled="props.menyimpan" @click="emit('hapus')"><Ikon nama="Trash2" :ukuran="17" /> Hapus</button>
      <button class="tombol-utama ml-auto" :disabled="!sah || props.menyimpan" @click="simpan"><Ikon :nama="props.menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="props.menyimpan && 'animate-spin'" /> Simpan</button>
    </template>
  </Laci>
</template>
