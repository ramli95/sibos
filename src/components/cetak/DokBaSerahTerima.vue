<script setup>
// Berita Acara Serah Terima Pengelolaan Dana BOSP dari bendahara lama (Pihak Pertama) kepada bendahara baru
// (Pihak Kedua), disaksikan dua saksi dan diketahui Kepala Sekolah. F4 tegak, Times New Roman.
// Lampiran: pajak belum disetor, transaksi belum lunas, transaksi SPJ belum lengkap, daftar arsip.
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import { formatNip } from '@/utils/validasi'
import { rupiah, terbilang, tanggalPanjang, tanggalPendek, tanggalKata } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  ba: { type: Object, required: true },   // { nomor, tanggal, tempat, tahun, pihak1, pihak2, saksi:[2], kepsek, arsip:[], catatan, saldo_koran }
  k: { type: Object, required: true },    // hasil keadaanSerahTerima
})
const nm = (p) => (p?.nama ? p.nama + (p.gelar ? ', ' + p.gelar : '') : '……………………………………')
const unit = computed(() => props.profil.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR')
const rp = (n) => rupiah(n)
const arsip = computed(() => (props.ba.arsip || []).filter((a) => a.ada !== false && a.nama))
const koran = computed(() => Number(props.ba.saldo_koran) || 0)
const sepakat = computed(() => !koran.value || koran.value === props.k.saldoBank)
const no = (i) => String.fromCharCode(65 + i)
</script>

<template>
  <div class="ba">
    <KopSurat :profil="props.profil" />
    <div class="judul">BERITA ACARA SERAH TERIMA</div>
    <div class="judul2">PENGELOLAAN DANA BOSP REGULER TAHUN ANGGARAN {{ props.ba.tahun }}</div>
    <div class="nomor">Nomor: {{ props.ba.nomor || '……………………………' }}</div>

    <p>Pada hari ini {{ tanggalKata(props.ba.tanggal) }}, bertempat di {{ props.ba.tempat || unit }}, kami yang bertanda tangan di bawah ini:</p>
    <table class="id">
      <tr><td class="n">1.</td><td class="l">Nama</td><td class="t">:</td><td><b>{{ nm(props.ba.pihak1) }}</b></td></tr>
      <tr><td /><td class="l">NIP</td><td class="t">:</td><td>{{ props.ba.pihak1?.nip ? formatNip(props.ba.pihak1.nip) : '-' }}</td></tr>
      <tr v-if="props.ba.pihak1?.pangkat"><td /><td class="l">Pangkat/Golongan</td><td class="t">:</td><td>{{ props.ba.pihak1.pangkat }}</td></tr>
      <tr><td /><td class="l">Jabatan</td><td class="t">:</td><td>{{ props.ba.pihak1?.jabatan || 'Bendahara Dana BOSP (lama)' }}</td></tr>
      <tr><td /><td colspan="3">selanjutnya disebut <b>PIHAK PERTAMA</b> (yang menyerahkan);</td></tr>
      <tr><td class="n">2.</td><td class="l">Nama</td><td class="t">:</td><td><b>{{ nm(props.ba.pihak2) }}</b></td></tr>
      <tr><td /><td class="l">NIP</td><td class="t">:</td><td>{{ props.ba.pihak2?.nip ? formatNip(props.ba.pihak2.nip) : '-' }}</td></tr>
      <tr v-if="props.ba.pihak2?.pangkat"><td /><td class="l">Pangkat/Golongan</td><td class="t">:</td><td>{{ props.ba.pihak2.pangkat }}</td></tr>
      <tr><td /><td class="l">Jabatan</td><td class="t">:</td><td>{{ props.ba.pihak2?.jabatan || 'Bendahara Dana BOSP (baru)' }}</td></tr>
      <tr><td /><td colspan="3">selanjutnya disebut <b>PIHAK KEDUA</b> (yang menerima).</td></tr>
    </table>
    <p>PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menerima dari PIHAK PERTAMA, tugas pengelolaan dan penatausahaan Dana BOSP Reguler {{ unit }} Tahun Anggaran {{ props.ba.tahun }} per tanggal {{ tanggalPanjang(props.ba.tanggal) }}{{ props.ba.dasar ? `, berdasarkan ${props.ba.dasar}` : '' }}, dengan keadaan sebagai berikut:</p>

    <div class="sub">{{ no(0) }}. Keadaan Kas</div>
    <table class="rinci">
      <tr><td>Pagu RKAS tahun berjalan</td><td class="kanan">{{ rp(props.k.pagu) }}</td></tr>
      <tr v-if="props.k.saldoAwal"><td>Sisa dana tahun anggaran sebelumnya</td><td class="kanan">{{ rp(props.k.saldoAwal) }}</td></tr>
      <tr><td>Penerimaan Dana BOSP s.d. tanggal serah terima</td><td class="kanan">{{ rp(props.k.terima) }}</td></tr>
      <tr><td>Realisasi belanja (lunas) s.d. tanggal serah terima</td><td class="kanan">{{ rp(props.k.realisasi) }}</td></tr>
      <tr><td>Saldo di rekening bank menurut BKU</td><td class="kanan">{{ rp(props.k.saldoBank) }}</td></tr>
      <tr v-if="koran"><td>Saldo menurut rekening koran/buku tabungan</td><td class="kanan">{{ rp(koran) }}</td></tr>
      <tr><td>Saldo kas tunai</td><td class="kanan">{{ rp(props.k.saldoTunai) }}</td></tr>
      <tr class="tebal"><td>Jumlah saldo yang diserahkan</td><td class="kanan">{{ rp(props.k.saldo) }}</td></tr>
    </table>
    <p class="kecil">Terbilang: <i>{{ terbilang(props.k.saldo) }}</i>.<template v-if="koran && !sepakat"> Selisih saldo bank dengan rekening koran sebesar {{ rp(koran - props.k.saldoBank) }} dijelaskan pada catatan.</template></p>

    <div class="sub">{{ no(1) }}. Pajak yang Telah Dipungut/Dipotong dan Belum Disetor</div>
    <p v-if="!props.k.pajak.length">Nihil.</p>
    <table v-else class="tabel">
      <thead><tr><th style="width: 0.8cm">No</th><th style="width: 2.1cm">Tanggal</th><th style="width: 1.7cm">Jenis</th><th>Uraian</th><th style="width: 2.9cm">Jumlah (Rp)</th></tr></thead>
      <tbody><tr v-for="(p, i) in props.k.pajak" :key="p.id"><td class="tengah">{{ i + 1 }}</td><td class="tengah">{{ tanggalPendek(p.tanggal) }}</td><td class="tengah">{{ p.jenis }}</td><td>{{ p.uraian }}{{ p.pihak ? ` — ${p.pihak}` : '' }}</td><td class="kanan">{{ rupiah(p.nilai, { tanpaRp: true }) }}</td></tr></tbody>
      <tfoot><tr><td colspan="4" class="kanan"><b>Jumlah</b></td><td class="kanan"><b>{{ rupiah(props.k.totalPajak, { tanpaRp: true }) }}</b></td></tr></tfoot>
    </table>

    <div class="sub">{{ no(2) }}. Transaksi yang Belum Lunas</div>
    <p v-if="!props.k.belumLunas.length">Nihil.</p>
    <table v-else class="tabel">
      <thead><tr><th style="width: 0.8cm">No</th><th style="width: 2.1cm">Tanggal</th><th>Uraian / Penyedia</th><th style="width: 2.4cm">Status</th><th style="width: 2.9cm">Nilai (Rp)</th></tr></thead>
      <tbody><tr v-for="(b, i) in props.k.belumLunas" :key="b.id"><td class="tengah">{{ i + 1 }}</td><td class="tengah">{{ tanggalPendek(b.tanggal) }}</td><td>{{ b.uraian }}{{ b.pihak ? ` — ${b.pihak}` : '' }}</td><td class="tengah">{{ b.status }}</td><td class="kanan">{{ rupiah(b.nilai, { tanpaRp: true }) }}</td></tr></tbody>
      <tfoot><tr><td colspan="4" class="kanan"><b>Jumlah</b></td><td class="kanan"><b>{{ rupiah(props.k.totalBelumLunas, { tanpaRp: true }) }}</b></td></tr></tfoot>
    </table>

    <div class="sub">{{ no(3) }}. Transaksi Lunas yang Kelengkapan SPJ-nya Belum Lengkap</div>
    <p v-if="!props.k.belumLengkap.length">Nihil — seluruh SPJ lengkap.</p>
    <table v-else class="tabel">
      <thead><tr><th style="width: 0.8cm">No</th><th style="width: 2.1cm">Tgl Lunas</th><th>Uraian</th><th style="width: 5cm">Kekurangan</th><th style="width: 1.3cm">%</th></tr></thead>
      <tbody><tr v-for="(b, i) in props.k.belumLengkap" :key="b.id"><td class="tengah">{{ i + 1 }}</td><td class="tengah">{{ tanggalPendek(b.tanggal) }}</td><td>{{ b.uraian }}</td><td class="kecil">{{ b.kurang.join('; ') }}</td><td class="tengah">{{ b.persen }}</td></tr></tbody>
    </table>

    <div class="sub">{{ no(4) }}. Arsip dan Dokumen yang Diserahkan</div>
    <table class="tabel">
      <thead><tr><th style="width: 0.8cm">No</th><th>Nama Arsip / Dokumen</th><th style="width: 3.3cm">Jumlah / Keterangan</th></tr></thead>
      <tbody><tr v-for="(a, i) in arsip" :key="i"><td class="tengah">{{ i + 1 }}</td><td>{{ a.nama }}</td><td>{{ a.jumlah }}</td></tr></tbody>
    </table>

    <p v-if="props.ba.catatan" class="catatan"><b>Catatan:</b> {{ props.ba.catatan }}</p>
    <p>Sejak tanggal serah terima, tanggung jawab penatausahaan Dana BOSP beralih kepada PIHAK KEDUA. Segala transaksi sebelum tanggal tersebut tetap menjadi tanggung jawab PIHAK PERTAMA. Berita acara ini dibuat rangkap 3 (tiga) untuk dipergunakan sebagaimana mestinya.</p>

    <div class="ttd-wrap">
      <table class="ttd">
        <tr>
          <td><div class="tak">.</div>Yang Menerima,<br />PIHAK KEDUA<div class="ruang" /><div class="nm">{{ nm(props.ba.pihak2) }}</div><div v-if="props.ba.pihak2?.nip">NIP {{ formatNip(props.ba.pihak2.nip) }}</div></td>
          <td>{{ props.ba.kota || 'Makassar' }}, {{ tanggalPanjang(props.ba.tanggal) }}<br />Yang Menyerahkan,<br />PIHAK PERTAMA<div class="ruang" /><div class="nm">{{ nm(props.ba.pihak1) }}</div><div v-if="props.ba.pihak1?.nip">NIP {{ formatNip(props.ba.pihak1.nip) }}</div></td>
        </tr>
        <tr><td colspan="2" class="tengah saksi-judul">Saksi-saksi:</td></tr>
        <tr>
          <td v-for="(s, i) in [0, 1]" :key="i">{{ i + 1 }}. {{ props.ba.saksi?.[i]?.jabatan || 'Saksi' }}<div class="ruang kecil-r" /><div class="nm">{{ nm(props.ba.saksi?.[i]) }}</div><div v-if="props.ba.saksi?.[i]?.nip">NIP {{ formatNip(props.ba.saksi[i].nip) }}</div></td>
        </tr>
        <tr>
          <td colspan="2" class="pusat">Mengetahui,<br />Kepala {{ unit }}<div class="ruang" /><div class="nm">{{ nm(props.ba.kepsek) }}</div><div v-if="props.ba.kepsek?.pangkat">{{ props.ba.kepsek.pangkat }}</div><div v-if="props.ba.kepsek?.nip">NIP {{ formatNip(props.ba.kepsek.nip) }}</div></td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style scoped>
.ba { color: #000; text-align: justify; }
.judul { margin-top: 0.45cm; text-align: center; font-weight: bold; text-decoration: underline; }
.judul2 { text-align: center; font-weight: bold; }
.nomor { text-align: center; margin-bottom: 0.35cm; }
p { margin: 0.12cm 0; }
.id { margin: 0.1cm 0 0.15cm 0.3cm; border-collapse: collapse; }
.id td { padding: 0 4px 0 0; vertical-align: top; }
.id .n { width: 0.6cm; } .id .l { width: 4.2cm; } .id .t { width: 0.3cm; }
.sub { font-weight: bold; margin: 0.3cm 0 0.1cm; }
.rinci { border-collapse: collapse; min-width: 13cm; margin-left: 0.5cm; }
.rinci td { padding: 1px 6px; border-bottom: 1px dotted #777; }
.rinci .tebal td { font-weight: bold; border-top: 1px solid #000; border-bottom: 1.5px solid #000; }
.tabel { width: 100%; border-collapse: collapse; font-size: 0.92em; }
.tabel th, .tabel td { border: 1px solid #000; padding: 1px 4px; vertical-align: top; text-align: left; }
.tabel th { background: #f1f1f1; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.kanan { text-align: right; white-space: nowrap; } .tengah { text-align: center; }
.kecil { font-size: 0.88em; }
.catatan { border: 1px solid #000; padding: 0.15cm 0.25cm; }
.ttd-wrap { page-break-inside: avoid; break-inside: avoid; margin-top: 0.5cm; }
.ttd { width: 100%; border-collapse: collapse; text-align: left; }
.ttd td { width: 50%; vertical-align: top; padding: 0 0 0.25cm 1.6cm; } /* ruang stempel di kiri */
.ttd td.pusat { padding-left: 0; text-align: center; }
.ttd td.tengah { padding-left: 0; }
.saksi-judul { padding-top: 0.15cm !important; }
.ruang { height: 1.9cm; } .kecil-r { height: 1.6cm; }
.nm { font-weight: bold; text-decoration: underline; }
.tak { visibility: hidden; }
</style>
