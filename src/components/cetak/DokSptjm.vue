<script setup>
// Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) Kepala Sekolah — lampiran laporan realisasi penerimaan
// dan belanja Dana BOSP bulanan (Permendagri 3/2023 Pasal 34 ayat 3).
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { formatNip } from '@/utils/validasi'
import { rupiah, terbilang } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  kepsek: Object,
  periode: { type: String, required: true },   // "Oktober 2026"
  tanggal: { type: String, required: true },
  rincian: { type: Array, default: () => [] },  // [[label, nilai]]
  sisa: { type: Number, default: 0 },
})
const nama = computed(() => (props.kepsek ? props.kepsek.nama + (props.kepsek.gelar ? ', ' + props.kepsek.gelar : '') : '……………………………'))
const unit = computed(() => props.profil.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR')
</script>

<template>
  <div class="sptjm">
    <KopSurat :profil="props.profil" />
    <div class="judul">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</div>
    <div class="sub">DANA BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) REGULER</div>
    <p>Yang bertanda tangan di bawah ini:</p>
    <table class="id">
      <tr><td class="l">Nama</td><td class="t">:</td><td>{{ nama }}</td></tr>
      <tr><td class="l">NIP</td><td class="t">:</td><td>{{ props.kepsek?.nip ? formatNip(props.kepsek.nip) : '-' }}</td></tr>
      <tr v-if="props.kepsek?.pangkat"><td class="l">Pangkat/Golongan</td><td class="t">:</td><td>{{ props.kepsek.pangkat }}</td></tr>
      <tr><td class="l">Jabatan</td><td class="t">:</td><td>Kepala {{ unit }} selaku Penanggung Jawab Dana BOSP</td></tr>
      <tr><td class="l">NPSN</td><td class="t">:</td><td>{{ props.profil.npsn }}</td></tr>
      <tr><td class="l">Alamat Satuan Pendidikan</td><td class="t">:</td><td>{{ props.profil.alamat }}</td></tr>
    </table>
    <p>dengan ini menyatakan dengan sesungguhnya bahwa:</p>
    <ol>
      <li>Laporan realisasi penerimaan dan belanja Dana BOSP Reguler bulan <b>{{ props.periode }}</b> telah disusun berdasarkan Buku Kas Umum dan buku pembantu yang telah ditutup dan ditandatangani oleh Bendahara dan Penanggung Jawab, dengan rincian:
        <table class="rinci">
          <tr v-for="[l, v] in props.rincian" :key="l"><td>{{ l }}</td><td class="kanan">{{ rupiah(v) }}</td></tr>
        </table>
      </li>
      <li>Seluruh belanja telah digunakan sesuai Rencana Kegiatan dan Anggaran Satuan Pendidikan (RKAS) dan petunjuk teknis pengelolaan Dana BOSP, serta didukung bukti pengeluaran yang sah dan lengkap.</li>
      <li>Bukti-bukti pengeluaran disimpan di satuan pendidikan untuk keperluan pemeriksaan oleh aparat pengawas fungsional.</li>
      <li>Sisa dana per akhir bulan sebesar <b>{{ rupiah(props.sisa) }}</b> ({{ terbilang(props.sisa) }}) tersimpan pada rekening Dana BOSP satuan pendidikan.</li>
      <li>Apabila di kemudian hari terdapat kelebihan pembayaran atau kerugian negara/daerah atas penggunaan dana tersebut, saya bersedia bertanggung jawab sepenuhnya dan menyetorkan kelebihan tersebut ke rekening yang ditentukan sesuai ketentuan peraturan perundang-undangan.</li>
    </ol>
    <p>Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
    <BlokTandaTangan :kanan="{ label: `Kepala ${unit}`, pejabat: props.kepsek }" :tanggal="props.tanggal" />
    <p class="materai">Meterai Rp10.000 ditempel pada tanda tangan.</p>
  </div>
</template>

<style scoped>
.sptjm { color: #000; text-align: justify; }
.judul { margin-top: 0.5cm; text-align: center; font-weight: bold; text-decoration: underline; }
.sub { text-align: center; margin-bottom: 0.4cm; }
p { margin: 0.15cm 0; }
.id { margin: 0.1cm 0 0.2cm 0.5cm; border-collapse: collapse; }
.id td { padding: 0 4px 0 0; vertical-align: top; }
.id .l { width: 5cm; } .id .t { width: 0.3cm; }
ol { margin: 0.1cm 0 0.2cm; padding-left: 0.7cm; }
ol li { margin-bottom: 0.12cm; }
.rinci { margin: 0.1cm 0; border-collapse: collapse; min-width: 11cm; }
.rinci td { padding: 1px 6px; border-bottom: 1px dotted #777; }
.kanan { text-align: right; white-space: nowrap; }
.materai { font-size: 0.8em; font-style: italic; color: #555; margin-top: 0.3cm; }
@media print { .materai { display: none; } }
</style>
