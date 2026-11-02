<script setup>
// Kwitansi Setoran (Kas Lain & Iuran, di luar Dana BOSP). Dua rangkap dalam satu lembar F4 tegak:
// lembar penyetor dan arsip bendahara, dipisah garis potong. Times New Roman, ruang tanda tangan & stempel.
import { rupiah, terbilang, tanggalPanjang } from '@/utils/format'
import { formatNip } from '@/utils/validasi'

const props = defineProps({
  profil: { type: Object, required: true },
  k: { type: Object, required: true },   // { no, tanggal, dari, nilai, untuk, cara, tagihan, dibayar, sisa, lunas, ket }
  penerima: Object,                       // pejabat (bendahara)
  labelPenerima: { type: String, default: 'Yang menerima,' },
})
const nama = (p) => (p ? p.nama + (p.gelar ? ', ' + p.gelar : '') : '……………………………')
const unit = () => props.profil.nama_arkas || props.profil.nama || 'UPT SPF SMP NEGERI 19 MAKASSAR'
</script>

<template>
  <div class="kw-lembar">
    <div v-for="(rangkap, i) in ['Lembar Penyetor', 'Arsip Bendahara']" :key="i" class="kw">
      <div class="kw-kepala">
        <div>
          <div class="kw-judul">KWITANSI SETORAN</div>
          <div class="kw-sub">{{ unit() }}</div>
        </div>
        <div class="kw-no">
          <div>No. <b>{{ props.k.no || '…………' }}</b></div>
          <div class="kw-rangkap">{{ rangkap }}</div>
        </div>
      </div>
      <table class="kw-isi">
        <tr><td class="l">Telah terima dari</td><td class="t">:</td><td><b>{{ props.k.dari }}</b></td></tr>
        <tr><td class="l">Uang sejumlah</td><td class="t">:</td><td><div class="kw-huruf"><i>{{ terbilang(props.k.nilai) }}</i></div></td></tr>
        <tr><td class="l">Untuk pembayaran</td><td class="t">:</td><td>{{ props.k.untuk }}</td></tr>
        <tr v-if="props.k.cara"><td class="l">Cara bayar</td><td class="t">:</td><td>{{ props.k.cara }}</td></tr>
        <tr v-if="props.k.tagihan"><td class="l">Keterangan tagihan</td><td class="t">:</td>
          <td>Tagihan {{ rupiah(props.k.tagihan) }} · telah dibayar {{ rupiah(props.k.dibayar) }} · sisa <b>{{ rupiah(props.k.sisa) }}</b></td></tr>
        <tr v-if="props.k.ket"><td class="l">Catatan</td><td class="t">:</td><td>{{ props.k.ket }}</td></tr>
      </table>
      <div class="kw-bawah">
        <div class="kw-jumlah">
          <div class="kw-rp">{{ rupiah(props.k.nilai) }}</div>
          <div v-if="props.k.lunas" class="kw-lunas">LUNAS</div>
        </div>
        <table class="kw-ttd">
          <tr>
            <td>
              <div class="tak">.</div>
              <div>Penyetor,</div>
              <div class="ruang" />
              <div class="nm">{{ props.k.dari }}</div>
            </td>
            <td>
              <div>Makassar, {{ tanggalPanjang(props.k.tanggal) }}</div>
              <div>{{ props.labelPenerima }}</div>
              <div class="ruang" />
              <div class="nm">{{ nama(props.penerima) }}</div>
              <div v-if="props.penerima?.nip">NIP {{ formatNip(props.penerima.nip) }}</div>
            </td>
          </tr>
        </table>
      </div>
      <div class="kw-catatan">Dicatat di luar Dana BOSP — tidak termasuk laporan BOSP/ARKAS/SIMAKDA.</div>
    </div>
  </div>
</template>

<style scoped>
.kw-lembar { color: #000; font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; }
.kw { border: 1.2pt solid #000; padding: 0.35cm 0.5cm 0.25cm; margin-bottom: 0.9cm; position: relative; page-break-inside: avoid; }
.kw + .kw::before { content: '✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'; position: absolute; top: -0.68cm; left: 0; right: 0; text-align: center; font-size: 9pt; color: #555; white-space: nowrap; overflow: hidden; }
.kw-kepala { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1pt solid #000; padding-bottom: 0.15cm; margin-bottom: 0.2cm; }
.kw-judul { font-size: 14pt; font-weight: bold; letter-spacing: 1pt; }
.kw-sub { font-size: 10.5pt; }
.kw-no { text-align: right; font-size: 10.5pt; }
.kw-rangkap { font-style: italic; font-size: 9.5pt; }
.kw-isi { width: 100%; border-collapse: collapse; }
.kw-isi td { padding: 2px 4px 2px 0; vertical-align: top; }
.kw-isi .l { width: 3.9cm; } .kw-isi .t { width: 0.3cm; }
.kw-huruf { background: #eee; padding: 2px 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.kw-bawah { margin-top: 0.2cm; }
.kw-jumlah { display: flex; align-items: center; gap: 0.5cm; }
.kw-rp { width: 5.6cm; border: 1.2pt solid #000; padding: 4px 8px; font-size: 13pt; font-weight: bold; text-align: center; }
.kw-lunas { display: inline-block; border: 2pt solid #000; padding: 1px 12px; font-weight: bold; letter-spacing: 3pt; transform: rotate(-6deg); }
.kw-ttd { width: 100%; border-collapse: collapse; margin-top: 0.1cm; }
.kw-ttd td { width: 50%; text-align: center; vertical-align: top; padding: 0 0.4cm; }
.kw-ttd .tak { visibility: hidden; }
.kw-ttd .ruang { height: 1.6cm; }
.kw-ttd .nm { font-weight: bold; text-decoration: underline; }
.kw-catatan { margin-top: 0.15cm; font-size: 8.5pt; font-style: italic; color: #333; }
</style>
