<script setup>
// Poster Papan Informasi (F4 tegak) untuk papan pengumuman sekolah. Kontak pengaduan disimpan di
// sekolah/informasi; QR mengarah ke halaman publik bila sudah diterbitkan.
import { ref, computed, onMounted } from 'vue'
import { pakaiInformasi } from './pakaiInformasi'
import { muatSatu, simpanSatu, muatPublik, URL_PUBLIK } from '@/services/catatan'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { rupiah, rupiahRingkas, persen, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokPoster from '@/components/cetak/DokPoster.vue'

const props = defineProps({ periode: { type: String, required: true } })
const auth = useAuth()
const notif = useNotifikasi()
const { kas, r, tanggal, kepsek, bendahara } = pakaiInformasi(() => props.periode)

const kontak = ref('')
const pakaiQr = ref(true)
const semuaKomponen = ref(false)
const terbit = ref(null)
const cetak = ref(false)
onMounted(async () => {
  const [inf, pub] = await Promise.all([muatSatu('sekolah', 'informasi').catch(() => null), muatPublik().catch(() => null)])
  kontak.value = inf?.kontak || 'Pertanyaan dan pengaduan penggunaan Dana BOSP dapat disampaikan langsung kepada Kepala Sekolah, Bendahara, atau Komite Sekolah pada hari dan jam kerja.'
  terbit.value = pub
})
async function simpanKontak() {
  try { await simpanSatu('sekolah', 'informasi', { kontak: kontak.value }, 'Mengubah teks informasi & pengaduan papan informasi'); notif.kabari('Teks pengaduan disimpan.') } catch (e) { notif.kabari(e.message, 'galat') }
}
const tautan = computed(() => (pakaiQr.value && terbit.value ? URL_PUBLIK() : ''))
const lebar = (p) => `${Math.max(0, Math.min(100, p))}%`
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <!-- Pratinjau ringkas -->
      <section class="kartu overflow-hidden" data-tur="poster-pratinjau">
        <div class="bg-gradient-to-br from-navy to-biru p-5 text-center text-white">
          <p class="text-[11px] font-bold tracking-[0.3em] text-amber-300">PAPAN INFORMASI</p>
          <p class="text-lg font-extrabold sm:text-xl">Penggunaan Dana BOSP Reguler</p>
          <p class="text-xs text-blue-100">TA {{ kas.tahun }} · {{ r.periode.judul }} ({{ r.periode.ket }})</p>
        </div>
        <div class="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
          <div v-for="[l, n, w] in [['Tersedia', r.danaTersedia, 'border-biru bg-blue-50 text-biru dark:bg-blue-950/30'], ['Digunakan', r.realisasi, 'border-[#22A08D] bg-teal-50 text-[#167A6B] dark:bg-teal-950/30 dark:text-teal-300'], ['Sisa', r.sisa, 'border-[#E3A414] bg-amber-50 text-[#9A6B00] dark:bg-amber-950/30 dark:text-amber-300']]" :key="l"
               :class="['rounded-xl border-2 p-2 text-center sm:p-3', w]">
            <p class="text-[11px] font-bold uppercase tracking-wide">{{ l }}</p>
            <p class="angka text-sm font-extrabold sm:text-base">{{ rupiahRingkas(n) }}</p>
          </div>
        </div>
        <ul class="space-y-2 px-4 pb-4">
          <li v-for="g in r.komponen.filter((x) => x.anggaran || x.realisasi)" :key="g.kode" class="text-xs">
            <div class="flex items-center gap-2">
              <span class="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" :style="{ background: g.warna }">{{ g.huruf }}</span>
              <span class="flex-1 truncate">{{ g.nama }}</span><span class="angka text-slate-500">{{ persen(g.persen, 0) }}</span>
            </div>
            <div class="ml-7 mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" :style="{ width: lebar(g.persen), background: g.warna }" /></div>
          </li>
        </ul>
      </section>

      <!-- Pengaturan cetak -->
      <section class="kartu space-y-4 p-4 sm:p-5" data-tur="poster-atur">
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Printer" :ukuran="19" /></span>
          <div><h2 class="font-bold">Cetak poster F4</h2><p class="text-xs text-slate-500">Tegak, Times New Roman, kop sekolah · per {{ tanggalPanjang(tanggal) }}</p></div>
        </div>
        <div>
          <label class="label" for="kontak">Teks informasi & pengaduan</label>
          <textarea id="kontak" v-model="kontak" rows="4" class="masukan" />
          <button v-if="auth.isAdmin" class="tombol-garis mt-2 px-3 py-1.5 text-xs" @click="simpanKontak"><Ikon nama="Save" :ukuran="14" class="text-biru" /> Simpan teks</button>
        </div>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="pakaiQr" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#1A62E8]" :disabled="!terbit" />
          <span>Sertakan QR ke halaman publik
            <span class="block text-xs text-slate-500">{{ terbit ? `Diterbitkan ${tanggalPanjang(terbit.diterbitkan)}` : 'Belum diterbitkan — buka tab Tautan Publik.' }}</span></span>
        </label>
        <label class="flex items-center gap-3 text-sm"><input v-model="semuaKomponen" type="checkbox" class="h-4 w-4 accent-[#1A62E8]" /> Tampilkan 12 komponen (termasuk yang kosong)</label>
        <div class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          Dana tersedia <b class="angka">{{ rupiah(r.danaTersedia) }}</b> · digunakan <b class="angka">{{ rupiah(r.realisasi) }}</b> ({{ persen(r.persen, 1) }}).
          Penerimaan diambil dari Buku Kas (penerimaan dana & saldo awal); realisasi dari belanja Lunas.
        </div>
        <button class="tombol-utama w-full" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" /> Pratinjau & cetak poster</button>
      </section>
    </div>

    <CetakSurat v-if="cetak" :judul="`Papan Informasi Dana BOSP ${r.periode.judul} ${kas.tahun}`" @tutup="cetak = false">
      <template #default="{ profil }">
        <DokPoster :profil="profil" :r="r" :tahun="kas.tahun" :tanggal="tanggal" :kepsek="kepsek" :bendahara="bendahara" :kontak="kontak" :tautan="tautan" :semua-komponen="semuaKomponen" />
      </template>
    </CetakSurat>
  </div>
</template>
