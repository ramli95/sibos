<script setup>
// Berita Acara Serah Terima Barang dari Bendahara BOSP (Pihak Pertama) kepada Pengurus Barang (Pihak Kedua),
// diketahui Kepala Sekolah. Barang hasil pengadaan Dana BOSP untuk dicatat & dikelola sebagai barang milik daerah.
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { formatNip } from '@/utils/validasi'
import { rupiah, tanggalKata, terbilang } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  bast: { type: Object, required: true },
  bendahara: Object, pengurus: Object, kepsek: Object,
})
const nama = (p) => (p ? p.nama + (p.gelar ? ', ' + p.gelar : '') : '……………………………')
const total = computed(() => (props.bast.butir || []).reduce((s, x) => s + (x.nilai || 0), 0))
const unit = computed(() => props.profil.nama_arkas || 'UPT SPF SMP Negeri 19 Makassar')
</script>

<template>
  <div class="bast">
    <KopSurat :profil="props.profil" />
    <div class="judul">BERITA ACARA SERAH TERIMA BARANG</div>
    <div class="nomor">Nomor: {{ props.bast.nomor || '……………………' }}</div>
    <p>Pada hari ini {{ tanggalKata(props.bast.tanggal) }}, kami yang bertanda tangan di bawah ini:</p>
    <table class="pihak">
      <tr><td class="n">1.</td><td class="l">Nama</td><td class="t">:</td><td>{{ nama(props.bendahara) }}</td></tr>
      <tr><td /><td class="l">NIP</td><td class="t">:</td><td>{{ props.bendahara?.nip ? formatNip(props.bendahara.nip) : '-' }}</td></tr>
      <tr><td /><td class="l">Jabatan</td><td class="t">:</td><td>Bendahara Dana BOSP {{ unit }}</td></tr>
      <tr><td /><td colspan="3">selanjutnya disebut <b>PIHAK PERTAMA</b>;</td></tr>
      <tr><td class="n">2.</td><td class="l">Nama</td><td class="t">:</td><td>{{ nama(props.pengurus) }}</td></tr>
      <tr><td /><td class="l">NIP</td><td class="t">:</td><td>{{ props.pengurus?.nip ? formatNip(props.pengurus.nip) : '-' }}</td></tr>
      <tr><td /><td class="l">Jabatan</td><td class="t">:</td><td>Pengurus Barang {{ unit }}</td></tr>
      <tr><td /><td colspan="3">selanjutnya disebut <b>PIHAK KEDUA</b>.</td></tr>
    </table>
    <p>PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menerima dari PIHAK PERTAMA, barang hasil pengadaan yang bersumber dari Dana BOSP Reguler Tahun Anggaran {{ String(props.bast.tanggal).slice(0, 4) }} untuk dicatat dan dikelola sebagai barang milik daerah, dengan rincian sebagai berikut:</p>
    <table class="tabel">
      <thead><tr><th style="width: 0.8cm">No</th><th>Nama Barang</th><th style="width: 4cm">Merk/Spesifikasi</th><th style="width: 3.4cm">Kode Barang</th><th style="width: 2cm">Register</th><th style="width: 1.8cm">Jumlah</th><th style="width: 2.6cm">Nilai (Rp)</th><th style="width: 1.3cm">Kondisi</th></tr></thead>
      <tbody>
        <tr v-for="(x, i) in props.bast.butir" :key="i">
          <td class="tengah">{{ i + 1 }}</td><td>{{ x.nama }}</td><td>{{ x.merk }}</td><td class="kd">{{ x.kode_barang || 'Ekstrakomptabel' }}</td>
          <td class="tengah">{{ x.register }}</td><td class="tengah">{{ x.jumlah }} {{ x.satuan }}</td><td class="kanan">{{ rupiah(x.nilai, { tanpaRp: true }) }}</td><td class="tengah">{{ x.kondisi || 'B' }}</td>
        </tr>
      </tbody>
      <tfoot><tr><td colspan="6" class="tengah tebal">JUMLAH</td><td class="kanan tebal">{{ rupiah(total, { tanpaRp: true }) }}</td><td /></tr></tfoot>
    </table>
    <p class="terbilang">Terbilang: <i>{{ terbilang(total) }}</i></p>
    <p v-if="props.bast.catatan">Catatan: {{ props.bast.catatan }}</p>
    <p>Sejak penandatanganan berita acara ini, pengelolaan, pencatatan, dan pengamanan barang tersebut menjadi tanggung jawab PIHAK KEDUA sesuai ketentuan pengelolaan barang milik daerah. Berita acara ini dibuat rangkap 3 (tiga) untuk dipergunakan sebagaimana mestinya.</p>
    <BlokTandaTangan :kiri="{ label: 'PIHAK KEDUA, Yang Menerima', pejabat: props.pengurus }" :kanan="{ label: 'PIHAK PERTAMA, Yang Menyerahkan', pejabat: props.bendahara }" :tanggal="props.bast.tanggal" />
    <BlokTandaTangan :tengah="{ label: 'Mengetahui, Kepala Sekolah', pejabat: props.kepsek }" :tanggal="props.bast.tanggal" />
  </div>
</template>

<style scoped>
.bast { color: #000; text-align: justify; }
.judul { margin-top: 0.45cm; text-align: center; font-weight: bold; text-decoration: underline; }
.nomor { text-align: center; margin-bottom: 0.3cm; }
p { margin: 0.15cm 0; }
.pihak { margin: 0.1cm 0 0.15cm; border-collapse: collapse; }
.pihak td { padding: 0 4px 0 0; vertical-align: top; }
.pihak .n { width: 0.6cm; } .pihak .l { width: 2.4cm; } .pihak .t { width: 0.3cm; }
.tabel { width: 100%; border-collapse: collapse; font-size: 0.85em; margin: 0.15cm 0; text-align: left; }
.tabel th, .tabel td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
.tabel th { background: #f1f1f1; text-align: center; }
.tabel tr { page-break-inside: avoid; break-inside: avoid; }
.tengah { text-align: center; } .kanan { text-align: right; white-space: nowrap; } .tebal { font-weight: bold; } .kd { font-family: 'Courier New', monospace; font-size: 0.9em; }
.terbilang { margin-top: 0; }
@media print { .tabel th { background: #f1f1f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
