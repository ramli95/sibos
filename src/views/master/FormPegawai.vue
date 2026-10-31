<script setup>
import { reactive, ref, computed, watch } from 'vue'
import {
  periksaNip, periksaNik, periksaNpwp, formatNpwp, normalWa, hanyaAngka,
  STATUS_KEPEGAWAIAN, PANGKAT_PNS, GOLONGAN_PPPK,
} from '@/utils/validasi'
import { KOLOM_PEGAWAI_UMUM, KOLOM_PEGAWAI_RAHASIA } from '@/services/master'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const props = defineProps({ pegawai: Object, bolehUbah: Boolean, lihatRahasia: Boolean, menyimpan: Boolean })
const emit = defineEmits(['tutup', 'simpan', 'hapus'])

const kosong = Object.fromEntries([...KOLOM_PEGAWAI_UMUM, ...KOLOM_PEGAWAI_RAHASIA].map((k) => [k, '']))
const f = reactive({ ...kosong, aktif: true, terima_tpg: false, status_kepegawaian: 'PNS', ...(props.pegawai || {}) })
const tab = ref('identitas')

const tabs = computed(() => [
  { kunci: 'identitas', judul: 'Identitas', ikon: 'UserRound', warna: '' },
  { kunci: 'kepegawaian', judul: 'Kepegawaian', ikon: 'Briefcase', warna: '' },
  ...(props.lihatRahasia ? [
    { kunci: 'keluarga', judul: 'Keluarga & Pajak', ikon: 'HeartHandshake', warna: '' },
    { kunci: 'rekening', judul: 'Kontak & Rekening', ikon: 'Landmark', warna: '' },
  ] : [{ kunci: 'kontak', judul: 'Kontak', ikon: 'Phone', warna: '' }]),
])

// --- NIP: validasi + isi otomatis tanggal lahir & jenis kelamin ---
const cekNip = computed(() => periksaNip(f.nip, { tanggalLahir: f.tanggal_lahir, jenisKelamin: f.jenis_kelamin }))
watch(() => f.nip, (v) => {
  const r = periksaNip(v)
  if (r.kosong || hanyaAngka(v).length !== 18) return
  if (!f.tanggal_lahir && r.tanggal_lahir) f.tanggal_lahir = r.tanggal_lahir
  if (!f.jenis_kelamin && r.jenis_kelamin) f.jenis_kelamin = r.jenis_kelamin
})

const asn = computed(() => ['PNS', 'PPPK'].includes(f.status_kepegawaian))
const pilihanGolongan = computed(() => f.status_kepegawaian === 'PNS' ? Object.keys(PANGKAT_PNS) : f.status_kepegawaian === 'PPPK' ? GOLONGAN_PPPK : [])
watch(() => f.golongan, (g) => { if (f.status_kepegawaian === 'PNS' && PANGKAT_PNS[g]) f.pangkat = PANGKAT_PNS[g] })

const galatNik = computed(() => periksaNik(f.nik))
const galatNpwp = computed(() => periksaNpwp(f.npwp))
const wajibHonorer = computed(() => {
  if (asn.value) return []
  const kurang = []
  if (!hanyaAngka(f.nik)) kurang.push('NIK')
  if (!hanyaAngka(f.npwp)) kurang.push('NPWP')
  if (!f.nuptk) kurang.push('NUPTK')
  if (!f.status_dapodik) kurang.push('Status Dapodik')
  if (!f.sk_penugasan) kurang.push('SK penugasan')
  if (!f.no_rekening) kurang.push('Rekening')
  return kurang
})

const sah = computed(() => !!f.nama.trim() && cekNip.value.sah && (!props.lihatRahasia || (!galatNik.value && !galatNpwp.value)))

function simpan() {
  if (!sah.value) return
  const data = { ...f, nama: f.nama.trim(), nip: hanyaAngka(f.nip), nik: hanyaAngka(f.nik), npwp: formatNpwp(f.npwp), no_wa: normalWa(f.no_wa),
    anak: f.anak === '' ? '' : Number(f.anak), jiwa: f.jiwa === '' ? '' : Number(f.jiwa) }
  emit('simpan', data)
}

const judul = computed(() => props.pegawai?.id ? (props.bolehUbah ? 'Ubah data pegawai' : 'Data pegawai') : 'Tambah pegawai')
</script>

<template>
  <Laci :judul="judul" :subjudul="props.pegawai?.nama" ikon="IdCard" warna="from-blue-500 to-indigo-600" @tutup="emit('tutup')">
    <div class="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#161D2B]" role="tablist">
      <button v-for="t in tabs" :key="t.kunci" role="tab" :aria-selected="tab === t.kunci" @click="tab = t.kunci"
              :class="['flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition',
                       tab === t.kunci ? 'bg-biru text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']">
        <Ikon :nama="t.ikon" :ukuran="16" :class="tab === t.kunci ? '' : 'text-slate-400'" /> {{ t.judul }}
      </button>
    </div>

    <fieldset :disabled="!props.bolehUbah" class="space-y-4 p-5">
      <!-- Identitas -->
      <template v-if="tab === 'identitas'">
        <div class="grid gap-4 sm:grid-cols-[110px_1fr_140px]">
          <div><label class="label" for="gd">Gelar depan</label><input id="gd" v-model="f.gelar_depan" class="masukan" placeholder="Drs." /></div>
          <div><label class="label" for="nm">Nama lengkap <span class="text-merah">*</span></label><input id="nm" v-model="f.nama" class="masukan" required /></div>
          <div><label class="label" for="gl">Gelar belakang</label><input id="gl" v-model="f.gelar" class="masukan" placeholder="S.Pd., M.Pd." /></div>
        </div>
        <div>
          <label class="label" for="nip">NIP <span class="font-normal text-slate-400">(18 digit; kosongkan untuk honorer)</span></label>
          <input id="nip" v-model="f.nip" class="masukan kode" inputmode="numeric" placeholder="19951115 202012 1 007" />
          <ul v-if="!cekNip.sah" class="mt-1.5 space-y-0.5 text-xs text-rose-600 dark:text-rose-400">
            <li v-for="g in cekNip.galat" :key="g" class="flex gap-1"><Ikon nama="CircleX" :ukuran="13" class="mt-0.5" />{{ g }}</li>
          </ul>
          <p v-else-if="!cekNip.kosong" class="mt-1.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Ikon nama="BadgeCheck" :ukuran="13" /> NIP sah · TMT {{ cekNip.tmt }}
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <span class="label">Jenis kelamin</span>
            <div class="flex gap-2">
              <label v-for="[v, l] in [['L', 'Laki-laki'], ['P', 'Perempuan']]" :key="v"
                     :class="['flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-sm font-semibold',
                              f.jenis_kelamin === v ? (v === 'L' ? 'border-biru bg-biru/10 text-biru' : 'border-biru bg-biru/10 text-biru') : 'border-slate-300 dark:border-slate-600']">
                <input v-model="f.jenis_kelamin" type="radio" :value="v" class="sr-only" />{{ l }}
              </label>
            </div>
          </div>
          <div><label class="label" for="tpl">Tempat lahir</label><input id="tpl" v-model="f.tempat_lahir" class="masukan" /></div>
          <div><label class="label" for="tl">Tanggal lahir</label><input id="tl" v-model="f.tanggal_lahir" type="date" class="masukan" /></div>
        </div>
        <div v-if="props.lihatRahasia" class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="nik">NIK</label><input id="nik" v-model="f.nik" class="masukan kode" inputmode="numeric" maxlength="20" />
            <p v-if="galatNik" class="mt-1 text-xs text-rose-600">{{ galatNik }}</p>
          </div>
          <div><label class="label" for="nuptk">NUPTK</label><input id="nuptk" v-model="f.nuptk" class="masukan kode" inputmode="numeric" /></div>
        </div>
        <div v-else><label class="label" for="nuptk2">NUPTK</label><input id="nuptk2" v-model="f.nuptk" class="masukan kode" /></div>
      </template>

      <!-- Kepegawaian -->
      <template v-else-if="tab === 'kepegawaian'">
        <div>
          <span class="label">Status kepegawaian</span>
          <div class="grid grid-cols-3 gap-2">
            <label v-for="(s, i) in STATUS_KEPEGAWAIAN" :key="s"
                   :class="['flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-sm font-bold',
                            f.status_kepegawaian === s ? 'border-biru bg-biru text-white' : 'border-slate-300 dark:border-slate-600']">
              <input v-model="f.status_kepegawaian" type="radio" :value="s" class="sr-only" />{{ s }}
            </label>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="label" for="jb">Jabatan</label><input id="jb" v-model="f.jabatan" class="masukan" placeholder="Guru Mata Pelajaran IPA" /></div>
          <div>
            <label class="label" for="gol">Golongan</label>
            <select v-if="pilihanGolongan.length" id="gol" v-model="f.golongan" class="masukan"><option value="">—</option><option v-for="g in pilihanGolongan" :key="g">{{ g }}</option></select>
            <input v-else id="gol" v-model="f.golongan" class="masukan" placeholder="—" />
          </div>
          <div><label class="label" for="pk">Pangkat</label><input id="pk" v-model="f.pangkat" class="masukan" /></div>
          <div><label class="label" for="kgb">TMT KGB terakhir</label><input id="kgb" v-model="f.tmt_kgb_terakhir" type="date" class="masukan" /></div>
          <div><label class="label" for="dp">Status Dapodik</label><input id="dp" v-model="f.status_dapodik" class="masukan" placeholder="Terdaftar / Belum" /></div>
          <div><label class="label" for="sk">SK penugasan</label><input id="sk" v-model="f.sk_penugasan" class="masukan" placeholder="Nomor SK" /></div>
        </div>
        <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <input v-model="f.terima_tpg" type="checkbox" class="h-5 w-5 accent-biru" />
          <span><b class="block text-sm">Menerima TPG (tunjangan profesi)</b><span class="text-xs text-slate-500">Penerima TPG tidak boleh menerima honor dari BOSP.</span></span>
        </label>
        <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <input v-model="f.aktif" type="checkbox" class="h-5 w-5 accent-biru" />
          <span><b class="block text-sm">Masih aktif bertugas</b><span class="text-xs text-slate-500">Matikan untuk pegawai yang pindah/pensiun; datanya tetap tersimpan.</span></span>
        </label>
        <div v-if="!asn && wajibHonorer.length && props.lihatRahasia" class="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <Ikon nama="TriangleAlert" :ukuran="17" class="mt-0.5" /><span>Honorer wajib dilengkapi: <b>{{ wajibHonorer.join(', ') }}</b>.</span>
        </div>
      </template>

      <!-- Keluarga & Pajak -->
      <template v-else-if="tab === 'keluarga'">
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="label" for="sk2">Status kawin</label>
            <select id="sk2" v-model="f.status_kawin" class="masukan"><option value="">—</option><option>Belum Kawin</option><option>Kawin</option><option>Cerai Hidup</option><option>Cerai Mati</option></select>
          </div>
          <div><label class="label" for="an">Jumlah anak</label><input id="an" v-model="f.anak" type="number" min="0" class="masukan angka" /></div>
          <div><label class="label" for="jw">Jumlah jiwa</label><input id="jw" v-model="f.jiwa" type="number" min="0" class="masukan angka" /></div>
        </div>
        <div>
          <label class="label" for="npwp">NPWP pribadi</label><input id="npwp" v-model="f.npwp" class="masukan kode" placeholder="15 atau 16 digit" />
          <p v-if="galatNpwp" class="mt-1 text-xs text-rose-600">{{ galatNpwp }}</p>
          <p class="mt-1 text-xs text-slate-500">Dipakai untuk PPh 21 honor & bukti potong.</p>
        </div>
        <div class="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
          <Ikon nama="Lock" :ukuran="15" class="text-biru" /> Data di tab ini dan tab rekening hanya dapat dilihat Bendahara (Admin).
        </div>
      </template>

      <!-- Kontak & Rekening -->
      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="label" for="wa">No. WhatsApp</label><input id="wa" v-model="f.no_wa" class="masukan kode" inputmode="tel" placeholder="0812…" /></div>
          <div><label class="label" for="em">Email</label><input id="em" v-model="f.email" type="email" class="masukan" /></div>
        </div>
        <template v-if="props.lihatRahasia">
          <div><label class="label" for="al">Alamat</label><textarea id="al" v-model="f.alamat" rows="2" class="masukan" /></div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div><label class="label" for="bk">Bank</label><input id="bk" v-model="f.bank" class="masukan" placeholder="Bank Sulselbar" /></div>
            <div><label class="label" for="rk">No. rekening</label><input id="rk" v-model="f.no_rekening" class="masukan kode" inputmode="numeric" /></div>
            <div><label class="label" for="an2">Atas nama</label><input id="an2" v-model="f.atas_nama_rekening" class="masukan" /></div>
          </div>
        </template>
      </template>
    </fieldset>

    <template v-if="props.bolehUbah" #kaki>
      <button class="tombol-utama" :disabled="!sah || props.menyimpan" @click="simpan">
        <Ikon :nama="props.menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="props.menyimpan && 'animate-spin'" /> Simpan
      </button>
      <button class="tombol-garis" @click="emit('tutup')">Batal</button>
      <button v-if="props.pegawai?.id" class="tombol ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="emit('hapus')"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
      <p v-if="!f.nama.trim()" class="w-full text-xs text-slate-500">Nama wajib diisi.</p>
    </template>
  </Laci>
</template>
