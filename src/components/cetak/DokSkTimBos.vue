<script setup>
// Surat Keputusan Kepala Sekolah tentang Tim BOS Sekolah (Permendikdasmen 8/2026 Pasal 65:
// kepala sekolah penanggung jawab, bendahara, anggota 1 guru, 1 Komite Sekolah, 1 orang tua/wali murid).
// Halaman 1: keputusan; halaman berikutnya: lampiran susunan & tugas tim. F4 tegak, Times New Roman.
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import { formatNip } from '@/utils/validasi'
import { tanggalPanjang } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  sk: { type: Object, required: true }, // { nomor, tanggal, tahun, anggota:[{ peran, nama, nip, unsur }], tembusan:[] }
  kepsek: Object,
})
const unit = computed(() => props.profil.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR')
const nmKepsek = computed(() => (props.kepsek ? props.kepsek.nama + (props.kepsek.gelar ? ', ' + props.kepsek.gelar : '') : '……………………………'))
const TUGAS = {
  'Penanggung Jawab': 'Bertanggung jawab atas penyediaan data Dapodik, perencanaan (RKAS), penggunaan, dan pelaporan Dana BOSP; menandatangani dokumen pertanggungjawaban.',
  Bendahara: 'Melakukan penatausahaan Dana BOSP: mencatat penerimaan & pengeluaran pada BKU dan buku pembantu, memungut/memotong & menyetor pajak, menyusun laporan bulanan, tahap, dan tahunan.',
  Anggota: 'Membantu penyusunan RKAS dan pelaksanaan kegiatan, melakukan pemantauan penggunaan dana, serta menyampaikan informasi penggunaan dana kepada warga sekolah dan masyarakat.',
}
</script>

<template>
  <div class="sk">
    <KopSurat :profil="props.profil" />
    <div class="judul">KEPUTUSAN KEPALA {{ unit }}</div>
    <div class="tengah">NOMOR: {{ props.sk.nomor || '……………………………' }}</div>
    <div class="tengah tebal">TENTANG</div>
    <div class="tengah tebal">PEMBENTUKAN TIM BANTUAN OPERASIONAL SEKOLAH (BOS)<br />TAHUN ANGGARAN {{ props.sk.tahun }}</div>
    <div class="tengah tebal" style="margin-top: 0.25cm">KEPALA {{ unit }},</div>

    <table class="pasal">
      <tr><td class="k">Menimbang</td><td class="t">:</td><td>
        <ol type="a">
          <li>bahwa dalam rangka pengelolaan Dana BOSP Reguler yang fleksibel, efektif, efisien, akuntabel, dan transparan, kepala sekolah membentuk tim BOS sekolah;</li>
          <li>bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a, perlu menetapkan Keputusan Kepala Sekolah tentang Pembentukan Tim BOS Tahun Anggaran {{ props.sk.tahun }}.</li>
        </ol></td></tr>
      <tr><td class="k">Mengingat</td><td class="t">:</td><td>
        <ol>
          <li>Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;</li>
          <li>Peraturan Menteri Dalam Negeri Nomor 3 Tahun 2023 tentang Pengelolaan Dana Bantuan Operasional Satuan Pendidikan pada Pemerintah Daerah;</li>
          <li>Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 18 Tahun 2022 tentang Pedoman Pengadaan Barang/Jasa oleh Satuan Pendidikan;</li>
          <li>Peraturan Menteri Pendidikan Dasar dan Menengah Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana Bantuan Operasional Satuan Pendidikan.</li>
        </ol></td></tr>
    </table>
    <div class="tengah tebal" style="margin: 0.2cm 0">MEMUTUSKAN:</div>
    <table class="pasal">
      <tr><td class="k">Menetapkan</td><td class="t">:</td><td class="tebal">KEPUTUSAN KEPALA SEKOLAH TENTANG PEMBENTUKAN TIM BOS {{ unit }} TAHUN ANGGARAN {{ props.sk.tahun }}.</td></tr>
      <tr><td class="k">KESATU</td><td class="t">:</td><td>Membentuk Tim BOS {{ unit }} Tahun Anggaran {{ props.sk.tahun }} dengan susunan sebagaimana tercantum dalam Lampiran Keputusan ini.</td></tr>
      <tr><td class="k">KEDUA</td><td class="t">:</td><td>Tim BOS sebagaimana dimaksud pada Diktum KESATU bertugas sesuai uraian tugas dalam Lampiran dan bertanggung jawab kepada Kepala Sekolah.</td></tr>
      <tr><td class="k">KETIGA</td><td class="t">:</td><td>Anggota tim unsur orang tua/wali murid dipilih oleh kepala sekolah dan Komite Sekolah dengan mempertimbangkan kredibilitas dan tidak memiliki konflik kepentingan.</td></tr>
      <tr><td class="k">KEEMPAT</td><td class="t">:</td><td>Segala biaya yang timbul akibat ditetapkannya Keputusan ini dibebankan pada anggaran yang sesuai dan tidak mengikat.</td></tr>
      <tr><td class="k">KELIMA</td><td class="t">:</td><td>Keputusan ini berlaku sejak tanggal ditetapkan dengan ketentuan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.</td></tr>
    </table>

    <table class="ttd"><tr><td />
      <td>Ditetapkan di {{ props.sk.kota || 'Makassar' }}<br />pada tanggal {{ tanggalPanjang(props.sk.tanggal) }}<br />Kepala Sekolah,<div class="ruang" /><b class="u">{{ nmKepsek }}</b>
        <div v-if="props.kepsek?.pangkat">{{ props.kepsek.pangkat }}</div><div v-if="props.kepsek?.nip">NIP {{ formatNip(props.kepsek.nip) }}</div></td>
    </tr></table>
    <div v-if="props.sk.tembusan?.length" class="tembusan">Tembusan:<ol><li v-for="t in props.sk.tembusan" :key="t">{{ t }}</li></ol></div>

    <!-- Lampiran -->
    <div class="lampiran">
      <table class="lamp-id"><tr><td>LAMPIRAN</td><td>: KEPUTUSAN KEPALA {{ unit }}</td></tr><tr><td>NOMOR</td><td>: {{ props.sk.nomor }}</td></tr><tr><td>TANGGAL</td><td>: {{ tanggalPanjang(props.sk.tanggal) }}</td></tr></table>
      <div class="tengah tebal" style="margin: 0.4cm 0 0.25cm">SUSUNAN DAN URAIAN TUGAS TIM BOS<br />{{ unit }} TAHUN ANGGARAN {{ props.sk.tahun }}</div>
      <table class="tabel">
        <thead><tr><th style="width: 0.9cm">No</th><th style="width: 5.6cm">Nama / NIP</th><th style="width: 3.4cm">Kedudukan dalam Tim</th><th>Uraian Tugas</th></tr></thead>
        <tbody>
          <tr v-for="(a, i) in props.sk.anggota" :key="i">
            <td class="tengah">{{ i + 1 }}</td>
            <td><b>{{ a.nama || '……………………' }}</b><br v-if="a.nip" /><span v-if="a.nip">NIP {{ formatNip(a.nip) }}</span><br v-if="a.unsur" /><i v-if="a.unsur">{{ a.unsur }}</i></td>
            <td class="tengah">{{ a.peran }}</td>
            <td class="kecil">{{ TUGAS[a.peran] || TUGAS.Anggota }}</td>
          </tr>
        </tbody>
      </table>
      <table class="ttd"><tr><td /><td>Kepala Sekolah,<div class="ruang" /><b class="u">{{ nmKepsek }}</b><div v-if="props.kepsek?.nip">NIP {{ formatNip(props.kepsek.nip) }}</div></td></tr></table>
    </div>
  </div>
</template>

<style scoped>
.sk { color: #000; text-align: justify; }
.judul { margin-top: 0.45cm; text-align: center; font-weight: bold; }
.tengah { text-align: center; } .tebal { font-weight: bold; }
.pasal { width: 100%; border-collapse: collapse; margin-top: 0.15cm; }
.pasal td { vertical-align: top; padding: 1px 2px; }
.pasal .k { width: 2.6cm; font-weight: bold; } .pasal .t { width: 0.4cm; }
ol { margin: 0; padding-left: 0.6cm; }
.ttd { width: 100%; margin-top: 0.5cm; border-collapse: collapse; page-break-inside: avoid; }
.ttd td { width: 50%; vertical-align: top; padding-left: 1.6cm; }
.ruang { height: 2cm; } .u { text-decoration: underline; }
.tembusan { margin-top: 0.4cm; font-size: 0.9em; }
.lampiran { break-before: page; page-break-before: always; padding-top: 0.2cm; }
.lamp-id { margin-left: auto; font-size: 0.9em; border-collapse: collapse; }
.lamp-id td { padding: 0 4px; }
.tabel { width: 100%; border-collapse: collapse; }
.tabel th, .tabel td { border: 1px solid #000; padding: 2px 5px; vertical-align: top; }
.tabel th { background: #f1f1f1; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.kecil { font-size: 0.92em; }
</style>
