<script setup>
import { reactive, computed } from 'vue'
import { periksaNpwp, formatNpwp, normalWa, hanyaAngka } from '@/utils/validasi'
import { KOLOM_REKANAN } from '@/services/master'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const props = defineProps({ rekanan: Object, bolehUbah: Boolean, menyimpan: Boolean, pegawai: { type: Array, default: () => [] }, semuaRekanan: { type: Array, default: () => [] } })
const emit = defineEmits(['tutup', 'simpan', 'hapus'])

const f = reactive({ ...Object.fromEntries(KOLOM_REKANAN.map((k) => [k, ''])), aktif: true, status_pkp: false, bentuk_usaha: 'orang_pribadi', ...(props.rekanan || {}) })
const galatNpwp = computed(() => periksaNpwp(f.npwp))
const normNama = (s) => String(s || '').toLowerCase().replace(/\b(drs|dra|ir|h|hj|s\.?\w+|m\.?\w+)\b\.?/g, '').replace(/[^a-z]/g, '')

// Peringatan konflik kepentingan: pemilik/NPWP rekanan sama dengan pegawai sekolah
const konflik = computed(() => {
  const npwp = hanyaAngka(f.npwp)
  const nama = normNama(f.pemilik)
  return props.pegawai.filter((p) => (npwp && hanyaAngka(p.npwp) === npwp) || (nama.length > 3 && normNama(p.nama) === nama))
})
const ganda = computed(() => {
  const nm = f.nama_usaha.trim().toLowerCase()
  return props.semuaRekanan.find((r) => r.id !== props.rekanan?.id && r.nama_usaha?.trim().toLowerCase() === nm && hanyaAngka(r.npwp) === hanyaAngka(f.npwp))
})
const peringatanPajak = computed(() => !f.status_pkp && f.bentuk_usaha === 'badan' ? 'Penyedia berbentuk badan biasanya PKP. Pastikan status PKP benar.' : '')

const sah = computed(() => !!f.nama_usaha.trim() && !galatNpwp.value && !ganda.value)
function simpan() {
  if (!sah.value) return
  emit('simpan', { ...f, nama_usaha: f.nama_usaha.trim(), npwp: formatNpwp(f.npwp), no_wa: normalWa(f.no_wa) })
}
</script>

<template>
  <Laci :judul="props.rekanan?.id ? (props.bolehUbah ? 'Ubah rekanan' : 'Data rekanan') : 'Tambah rekanan'" :subjudul="props.rekanan?.nama_usaha" ikon="Store" warna="from-amber-400 to-orange-500" @tutup="emit('tutup')">
    <fieldset :disabled="!props.bolehUbah" class="space-y-5 p-5">
      <section class="space-y-4">
        <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="Store" :ukuran="16" class="text-biru" /> Usaha</h3>
        <div><label class="label" for="nu">Nama usaha / toko <span class="text-merah">*</span></label><input id="nu" v-model="f.nama_usaha" class="masukan" /></div>
        <div>
          <span class="label">Bentuk usaha</span>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="[v, l, ket] in [['orang_pribadi', 'Orang pribadi', 'Toko/usaha perorangan'], ['badan', 'Badan usaha', 'CV, PT, UD, koperasi']]" :key="v"
                   :class="['cursor-pointer rounded-xl border p-3', f.bentuk_usaha === v ? 'border-biru bg-biru/5 dark:bg-blue-950/30' : 'border-slate-300 dark:border-slate-600']">
              <input v-model="f.bentuk_usaha" type="radio" :value="v" class="sr-only" /><b class="block text-sm">{{ l }}</b><span class="text-xs text-slate-500">{{ ket }}</span>
            </label>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="np">NPWP</label><input id="np" v-model="f.npwp" class="masukan kode" />
            <p v-if="galatNpwp" class="mt-1 text-xs text-rose-600">{{ galatNpwp }}</p>
          </div>
          <label class="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
            <input v-model="f.status_pkp" type="checkbox" class="h-5 w-5 accent-biru" />
            <span><b class="block text-sm">Pengusaha Kena Pajak (PKP)</b><span class="text-xs text-slate-500">Memungut PPN</span></span>
          </label>
        </div>
        <p v-if="peringatanPajak" class="flex gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"><Ikon nama="Info" :ukuran="14" />{{ peringatanPajak }}</p>
        <div><label class="label" for="al">Alamat</label><textarea id="al" v-model="f.alamat" rows="2" class="masukan" /></div>
      </section>

      <section class="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
        <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="UserRound" :ukuran="16" class="text-biru" /> Pemilik & kontak</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="label" for="pm">Nama pemilik</label><input id="pm" v-model="f.pemilik" class="masukan" /></div>
          <div><label class="label" for="jb">Jabatan</label><input id="jb" v-model="f.jabatan_pemilik" class="masukan" placeholder="Pemilik / Direktur" /></div>
          <div><label class="label" for="tl">Telepon</label><input id="tl" v-model="f.telepon" class="masukan kode" inputmode="tel" /></div>
          <div><label class="label" for="wa">No. WhatsApp</label><input id="wa" v-model="f.no_wa" class="masukan kode" inputmode="tel" /></div>
        </div>
      </section>

      <section class="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
        <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="Landmark" :ukuran="16" class="text-biru" /> Rekening</h3>
        <div class="grid gap-4 sm:grid-cols-3">
          <div><label class="label" for="bk">Bank</label><input id="bk" v-model="f.bank" class="masukan" /></div>
          <div><label class="label" for="rk">No. rekening</label><input id="rk" v-model="f.no_rekening" class="masukan kode" inputmode="numeric" /></div>
          <div><label class="label" for="an">Atas nama</label><input id="an" v-model="f.atas_nama_rekening" class="masukan" /></div>
        </div>
      </section>

      <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <input v-model="f.aktif" type="checkbox" class="h-5 w-5 accent-biru" />
        <span><b class="block text-sm">Rekanan aktif</b><span class="text-xs text-slate-500">Rekanan nonaktif tidak muncul saat memilih penyedia belanja.</span></span>
      </label>

      <div v-if="konflik.length" class="flex gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <Ikon nama="Info" :ukuran="18" class="mt-0.5 text-biru" />
        <span><b>Catatan:</b> usaha ini milik pegawai sekolah ({{ konflik.map((p) => p.nama).join(', ') }}). Tetap boleh disimpan dan dipakai; pastikan harga wajar dan dokumen pengadaannya lengkap.</span>
      </div>
      <div v-if="ganda" class="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        <Ikon nama="CircleAlert" :ukuran="18" class="mt-0.5" /> Rekanan dengan nama dan NPWP yang sama sudah ada.
      </div>
    </fieldset>

    <template v-if="props.bolehUbah" #kaki>
      <button class="tombol-utama" :disabled="!sah || props.menyimpan" @click="simpan">
        <Ikon :nama="props.menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="props.menyimpan && 'animate-spin'" /> Simpan
      </button>
      <button class="tombol-garis" @click="emit('tutup')">Batal</button>
      <button v-if="props.rekanan?.id" class="tombol ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="emit('hapus')"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
    </template>
  </Laci>
</template>
