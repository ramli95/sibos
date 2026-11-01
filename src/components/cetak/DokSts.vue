<script setup>
// Surat Tanda Setoran (STS) — setoran dari rekening Dana BOSP ke Rekening Kas Umum Daerah
// (mis. pengembalian sisa/kelebihan dana, jasa giro yang harus disetor, atau temuan pemeriksaan).
// F4 tegak, Times New Roman, tanda tangan Kepala Sekolah & Bendahara (ruang stempel).
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { rupiah, terbilang, tanggalPanjang } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  sts: { type: Object, required: true }, // { nomor, tanggal, bank, rekening, penyetor, baris:[{ kode, uraian, nilai }], keterangan }
  kepsek: Object,
  bendahara: Object,
})
const total = computed(() => (props.sts.baris || []).reduce((s, r) => s + (Number(r.nilai) || 0), 0))
const unit = computed(() => props.profil.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR')
</script>

<template>
  <div class="sts">
    <KopSurat :profil="props.profil" />
    <div class="judul">SURAT TANDA SETORAN (STS)</div>
    <div class="nomor">Nomor: {{ props.sts.nomor || '……………………' }}</div>
    <table class="id">
      <tr><td class="l">Harap diterima uang sebesar</td><td class="t">:</td><td><b>{{ rupiah(total) }}</b></td></tr>
      <tr><td class="l">Dengan huruf</td><td class="t">:</td><td><i>{{ terbilang(total) }}</i></td></tr>
      <tr><td class="l">Disetor ke</td><td class="t">:</td><td>{{ props.sts.bank || 'Rekening Kas Umum Daerah Kota Makassar' }}{{ props.sts.rekening ? ` — No. Rek. ${props.sts.rekening}` : '' }}</td></tr>
      <tr><td class="l">Penyetor</td><td class="t">:</td><td>{{ props.sts.penyetor || `Bendahara Dana BOSP ${unit}` }}</td></tr>
      <tr><td class="l">Tanggal setor</td><td class="t">:</td><td>{{ tanggalPanjang(props.sts.tanggal) }}</td></tr>
    </table>
    <p>Dengan rincian penerimaan sebagai berikut:</p>
    <table class="tabel">
      <thead><tr><th style="width: 0.9cm">No</th><th style="width: 4.2cm">Kode Rekening</th><th>Uraian</th><th style="width: 3.4cm">Jumlah (Rp)</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in props.sts.baris" :key="i"><td class="tengah">{{ i + 1 }}</td><td class="tengah">{{ r.kode }}</td><td>{{ r.uraian }}</td><td class="kanan">{{ rupiah(r.nilai, { tanpaRp: true }) }}</td></tr>
      </tbody>
      <tfoot><tr><td colspan="3" class="kanan"><b>Jumlah</b></td><td class="kanan"><b>{{ rupiah(total, { tanpaRp: true }) }}</b></td></tr></tfoot>
    </table>
    <p v-if="props.sts.keterangan" class="ket">Keterangan: {{ props.sts.keterangan }}</p>
    <p>Uang tersebut di atas telah kami terima/setorkan pada tanggal {{ tanggalPanjang(props.sts.tanggal) }}. Bukti setor bank (validasi/NTB) dilampirkan.</p>
    <BlokTandaTangan :kiri="{ label: `Mengetahui,\nKepala ${unit}`, pejabat: props.kepsek }" :kanan="{ label: 'Bendahara Dana BOSP\n(Penyetor)', pejabat: props.bendahara }" :tanggal="props.sts.tanggal" />
  </div>
</template>

<style scoped>
.sts { color: #000; }
.judul { margin-top: 0.5cm; text-align: center; font-weight: bold; text-decoration: underline; font-size: 1.1em; }
.nomor { text-align: center; margin-bottom: 0.4cm; }
p { margin: 0.15cm 0; text-align: justify; }
.id { border-collapse: collapse; margin-bottom: 0.25cm; }
.id td { padding: 1px 4px 1px 0; vertical-align: top; }
.id .l { width: 5.2cm; } .id .t { width: 0.3cm; }
.tabel { width: 100%; border-collapse: collapse; }
.tabel th, .tabel td { border: 1px solid #000; padding: 2px 5px; vertical-align: top; }
.tabel th { background: #f1f1f1; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.kanan { text-align: right; white-space: nowrap; } .tengah { text-align: center; }
.ket { font-style: italic; }
</style>
