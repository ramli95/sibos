<script setup>
// SPTJM Penggunaan Dana BOSP untuk Pemerintah Daerah per semester/tahun (Permendagri 3/2023 Pasal 60
// ayat 1 huruf b: surat pernyataan tanggung jawab bahwa dana telah digunakan sesuai peruntukan).
// Rincian penerimaan & belanja per jenis belanja (5.1.02 / 5.2.02 / 5.2.05) dan sisa dana.
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { formatNip } from '@/utils/validasi'
import { rupiah, terbilang } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  kepsek: Object,
  periode: { type: String, required: true }, // "Semester I Tahun Anggaran 2026"
  tanggal: { type: String, required: true },
  terima: { type: Array, default: () => [] },  // [[label, nilai]]
  belanja: { type: Array, default: () => [] }, // [[kode, label, nilai]]
  sisa: { type: Number, default: 0 },
})
const nama = computed(() => (props.kepsek ? props.kepsek.nama + (props.kepsek.gelar ? ', ' + props.kepsek.gelar : '') : '……………………………'))
const unit = computed(() => props.profil.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR')
const totTerima = computed(() => props.terima.reduce((s, [, v]) => s + (Number(v) || 0), 0))
const totBelanja = computed(() => props.belanja.reduce((s, [, , v]) => s + (Number(v) || 0), 0))
</script>

<template>
  <div class="sptjm">
    <KopSurat :profil="props.profil" />
    <div class="judul">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</div>
    <div class="sub">PENGGUNAAN DANA BOSP REGULER<br />{{ props.periode.toUpperCase() }}</div>
    <p>Yang bertanda tangan di bawah ini:</p>
    <table class="id">
      <tr><td class="l">Nama</td><td class="t">:</td><td>{{ nama }}</td></tr>
      <tr><td class="l">NIP</td><td class="t">:</td><td>{{ props.kepsek?.nip ? formatNip(props.kepsek.nip) : '-' }}</td></tr>
      <tr><td class="l">Jabatan</td><td class="t">:</td><td>Kepala {{ unit }} selaku Penanggung Jawab Dana BOSP</td></tr>
      <tr><td class="l">NPSN</td><td class="t">:</td><td>{{ props.profil.npsn }}</td></tr>
      <tr><td class="l">Kode Unit (Pemda)</td><td class="t">:</td><td>{{ props.profil.kode_sekolah_pemda || '-' }}</td></tr>
    </table>
    <p>menyatakan dengan sesungguhnya bahwa Dana BOSP Reguler {{ props.periode }} telah kami terima dan gunakan sesuai Rencana Kegiatan dan Anggaran Sekolah (RKAS) serta petunjuk teknis yang berlaku, dengan rincian sebagai berikut:</p>
    <table class="tabel">
      <tr class="kepala"><td colspan="2">I. PENERIMAAN</td><td class="kanan">Jumlah (Rp)</td></tr>
      <tr v-for="[l, v] in props.terima" :key="l"><td colspan="2" class="isi">{{ l }}</td><td class="kanan">{{ rupiah(v, { tanpaRp: true }) }}</td></tr>
      <tr class="tebal"><td colspan="2">Jumlah penerimaan</td><td class="kanan">{{ rupiah(totTerima, { tanpaRp: true }) }}</td></tr>
      <tr class="kepala"><td colspan="3">II. BELANJA</td></tr>
      <tr v-for="[k, l, v] in props.belanja" :key="k"><td style="width: 3cm" class="isi">{{ k }}</td><td>{{ l }}</td><td class="kanan">{{ rupiah(v, { tanpaRp: true }) }}</td></tr>
      <tr class="tebal"><td colspan="2">Jumlah belanja</td><td class="kanan">{{ rupiah(totBelanja, { tanpaRp: true }) }}</td></tr>
      <tr class="tebal"><td colspan="2">III. SISA DANA (I − II)</td><td class="kanan">{{ rupiah(props.sisa, { tanpaRp: true }) }}</td></tr>
    </table>
    <p class="kecil">Sisa dana terbilang: <i>{{ terbilang(props.sisa) }}</i>.</p>
    <ol>
      <li>Bukti-bukti pengeluaran yang sah dan lengkap disimpan di satuan pendidikan sebagai objek pemeriksaan (Permendagri 3/2023 Pasal 60 ayat 2).</li>
      <li>Sisa dana tetap berada di rekening Dana BOSP satuan pendidikan dan dilaporkan kepada PPKD selaku BUD.</li>
      <li>Apabila di kemudian hari terdapat kerugian negara/daerah, kami bersedia bertanggung jawab dan menyetorkannya ke Rekening Kas Umum Daerah sesuai ketentuan.</li>
    </ol>
    <p>Demikian surat pernyataan ini dibuat dengan sebenarnya.</p>
    <BlokTandaTangan :kanan="{ label: `Kepala ${unit}`, pejabat: props.kepsek }" :tanggal="props.tanggal" />
    <p class="materai">Meterai Rp10.000 ditempel pada tanda tangan.</p>
  </div>
</template>

<style scoped>
.sptjm { color: #000; text-align: justify; }
.judul { margin-top: 0.5cm; text-align: center; font-weight: bold; text-decoration: underline; }
.sub { text-align: center; margin-bottom: 0.35cm; font-weight: bold; }
p { margin: 0.15cm 0; }
.id { margin: 0.1cm 0 0.2cm 0.5cm; border-collapse: collapse; }
.id td { padding: 0 4px 0 0; vertical-align: top; }
.id .l { width: 4.6cm; } .id .t { width: 0.3cm; }
.tabel { width: 100%; border-collapse: collapse; }
.tabel td { border: 1px solid #000; padding: 1px 6px; }
.tabel .kepala td { font-weight: bold; background: #f1f1f1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.tabel .tebal td { font-weight: bold; }
.tabel .isi { padding-left: 0.5cm; }
.kanan { text-align: right; white-space: nowrap; width: 3.6cm; }
.kecil { font-size: 0.9em; }
ol { margin: 0.1cm 0 0.2cm; padding-left: 0.7cm; }
.materai { font-size: 0.8em; font-style: italic; color: #555; margin-top: 0.3cm; }
@media print { .materai { display: none; } }
</style>
