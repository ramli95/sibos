<script setup>
// Surat Keterangan Perincian Gaji (SKPG) — format mengikuti sheet "SKPG" & "SKPG Honor" Jurnal Dana BOS.
// Ditandatangani Kepala Sekolah (mengetahui) dan Bendahara Gaji. F4, Times New Roman.
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { formatNip, PANGKAT_PNS } from '@/utils/validasi'
import { rupiah, terbilang, tanggalPanjang, NAMA_BULAN } from '@/utils/format'
import { KEPERLUAN_SKPG } from '@/config/gaji'

const props = defineProps({
  profil: { type: Object, required: true },
  s: { type: Object, required: true }, // dokumen skpg: { nomor, tanggal, periode, keperluan, nama, nip, nik, npwp, status, golongan, pangkat, tmt_tugas, angka{} }
  kepsek: Object,
  bendahara: Object,
})
const a = computed(() => props.s.angka || {})
const rp = (n) => rupiah(n || 0, { tanpaRp: true })
const honorer = computed(() => props.s.status === 'Honorer')
const unit = computed(() => (props.profil.nama_arkas || 'UPT SPF SMP Negeri 19 Makassar').replace(/^UPT SPF SMP NEGERI/i, 'UPT SPF SMP Negeri').replace(/MAKASSAR$/i, 'Makassar'))
const pangkat = computed(() => {
  if (props.s.status === 'PPPK') return `PPPK / ${props.s.golongan || '-'}`
  const p = props.s.pangkat || PANGKAT_PNS[props.s.golongan] || ''
  return [p, props.s.golongan].filter(Boolean).join(' / ') || '-'
})
const bulan = computed(() => { const [y, m] = String(props.s.periode || '').split('-'); return m ? `${NAMA_BULAN[Number(m) - 1]} ${y}` : '' })
const keperluan = computed(() => {
  const k = KEPERLUAN_SKPG.find((x) => x.kunci === props.s.keperluan)
  return props.s.keperluan_lain || (k ? k.judul.toLowerCase() : '')
})
const keluarga = computed(() => (a.value.tj_istri || 0) + (a.value.tj_anak || 0))
const tunjangan = computed(() => [
  ['a.', 'Keluarga', keluarga.value],
  ['b.', 'Jabatan Fungsional', a.value.tj_fungsional],
  ['c.', 'Beras', a.value.tj_beras],
  ['d.', 'Khusus Pajak', a.value.tj_pph],
  ['e.', 'BPJS 4%', a.value.bpjs],
  ['f.', 'JKK', a.value.jkk],
  ['g.', 'JKM', a.value.jkm],
])
const potongan = computed(() => [
  ['a.', 'Pajak Penghasilan', a.value.pot_pph],
  ['b.', 'BPJS', a.value.pot_bpjs],
  ['c.', 'Iuran Wajib 1%', a.value.pot_iwp1],
  ['d.', props.s.status === 'PNS' ? 'Iuran Wajib 8%' : 'Jam. Hari Tua/JHT', a.value.pot_iwp8],
  ['e.', 'Taperum', a.value.pot_taperum],
  ['f.', 'JKK', a.value.pot_jkk],
  ['g.', 'JKM', a.value.pot_jkm],
  ...(a.value.pot_lain ? [['h.', props.s.ket_potongan_lain || 'Potongan lain', a.value.pot_lain]] : []),
])
const seluruhnya = computed(() => (a.value.bersih || 0) + (a.value.tj_kinerja || 0) + (a.value.tj_profesi || 0))
</script>

<template>
  <div class="skpg">
    <KopSurat :profil="props.profil" />
    <div class="judul">SURAT KETERANGAN PERINCIAN GAJI</div>
    <div class="nomor">Nomor: {{ props.s.nomor || '……………………' }}</div>
    <p>Yang bertanda tangan di bawah ini, Kepala dan Bendaharawan Gaji {{ unit }}, menerangkan bahwa:</p>
    <table class="id">
      <tr><td class="l">Nama</td><td class="t">:</td><td class="tebal">{{ props.s.nama_lengkap || props.s.nama }}</td></tr>
      <tr v-if="!honorer"><td class="l">NIP</td><td class="t">:</td><td>{{ formatNip(props.s.nip) || '-' }}</td></tr>
      <tr v-else><td class="l">NIK</td><td class="t">:</td><td>{{ props.s.nik || '-' }}</td></tr>
      <tr v-if="!honorer"><td class="l">NPWP</td><td class="t">:</td><td>{{ props.s.npwp || '-' }}</td></tr>
      <tr><td class="l">{{ honorer ? 'Status' : 'Pangkat/Gol' }}</td><td class="t">:</td><td>{{ honorer ? 'Honorer' : pangkat }}</td></tr>
      <tr v-if="props.s.jabatan"><td class="l">Jabatan</td><td class="t">:</td><td>{{ props.s.jabatan }}</td></tr>
    </table>
    <p>Adalah benar pegawai di {{ unit }}<template v-if="props.s.tmt_tugas"> terhitung mulai tanggal (TMT) {{ tanggalPanjang(props.s.tmt_tugas) }}</template> dan menerima penghasilan tetap setiap bulannya<template v-if="bulan"> (Daftar Gaji bulan {{ bulan }})</template> dengan perincian sebagai berikut:</p>

    <table class="rinci">
      <colgroup><col style="width: 0.7cm" /><col style="width: 0.6cm" /><col /><col style="width: 0.4cm" /><col style="width: 3.2cm" /><col style="width: 5.2cm" /></colgroup>
      <tr><td>1.</td><td colspan="2">{{ honorer ? 'Honor Pokok' : 'Gaji Pokok' }}</td><td>:</td><td class="kanan">{{ rp(a.gaji_pokok) }}</td><td /></tr>
      <tr><td>2.</td><td colspan="2">Tunjangan-tunjangan</td><td>:</td><td /><td /></tr>
      <tr v-for="[h, l, v] in tunjangan" :key="'t' + h"><td /><td>{{ h }}</td><td>{{ l }}</td><td>:</td><td class="kanan">{{ rp(v) }}</td><td /></tr>
      <tr><td>3.</td><td colspan="2">Pembulatan</td><td>:</td><td class="kanan garis">{{ rp(a.pembulatan) }}</td><td /></tr>
      <tr><td /><td colspan="4" class="kanan">Jumlah Gaji Kotor</td><td class="kanan tebal">Rp{{ rp(a.kotor) }}</td></tr>
      <tr><td>4.</td><td colspan="2">Potongan-potongan</td><td>:</td><td /><td /></tr>
      <tr v-for="(x, i) in potongan" :key="'p' + i" :class="i === potongan.length - 1 && 'akhir'"><td /><td>{{ x[0] }}</td><td>{{ x[1] }}</td><td>:</td><td class="kanan" :class="i === potongan.length - 1 && 'garis'">{{ rp(x[2]) }}</td><td /></tr>
      <tr><td /><td colspan="4" class="kanan">Jumlah Potongan</td><td class="kanan tebal garis">Rp{{ rp(a.potongan) }}</td></tr>
      <tr><td /><td colspan="4" class="kanan">Jumlah Gaji Bersih</td><td class="kanan tebal">Rp{{ rp(a.bersih) }}</td></tr>
      <tr><td>5.</td><td colspan="5">Penghasilan Tambahan Diluar Daftar Gaji</td></tr>
      <tr><td /><td>a.</td><td>Tunjangan Kinerja</td><td>:</td><td class="kanan">{{ rp(a.tj_kinerja) }}</td><td /></tr>
      <tr><td /><td>b.</td><td>Tunjangan Profesi</td><td>:</td><td class="kanan garis">{{ rp(a.tj_profesi) }}</td><td /></tr>
      <tr><td /><td colspan="4" class="kanan">Jumlah Seluruhnya</td><td class="kanan tebal ganda">Rp{{ rp(seluruhnya) }}</td></tr>
    </table>
    <table class="id terbilang"><tr><td class="l">Terbilang</td><td class="t">:</td><td><i>{{ terbilang(seluruhnya) }}</i></td></tr></table>

    <p>Demikian surat keterangan ini dibuat dan diberikan kepada yang bersangkutan sesuai dengan gaji yang diterimanya, untuk dapat dipergunakan sebagaimana mestinya<template v-if="keperluan"> dalam rangka {{ keperluan }}</template>.</p>
    <BlokTandaTangan :kiri="{ label: 'Mengetahui, Kepala Sekolah,', pejabat: props.kepsek }" :kanan="{ label: 'Bendahara Gaji,', pejabat: props.bendahara }" :tanggal="props.s.tanggal" />
  </div>
</template>

<style scoped>
.skpg { color: #000; text-align: justify; }
.skpg :deep(table) { text-align: left; }
.judul { margin-top: 0.45cm; text-align: center; font-weight: bold; text-decoration: underline; }
.nomor { text-align: center; margin-bottom: 0.3cm; }
p { margin: 0.15cm 0; }
.id { margin: 0.1cm 0 0.2cm 0.6cm; border-collapse: collapse; }
.id td { padding: 0 4px 0 0; vertical-align: top; }
.id .l { width: 3.2cm; } .id .t { width: 0.3cm; }
.rinci { width: 100%; border-collapse: collapse; margin: 0.1cm 0 0.1cm 0.6cm; max-width: calc(100% - 0.6cm); }
.rinci td { padding: 0 3px; vertical-align: top; }
.kanan { text-align: right; white-space: nowrap; }
.tebal { font-weight: bold; }
.garis { border-bottom: 1px solid #000; }
.ganda { border-bottom: 3px double #000; }
.terbilang { margin-top: 0.15cm; }
</style>
