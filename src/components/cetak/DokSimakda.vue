<script setup>
// Dokumen laporan format SIMAKDA (Pemkot Makassar), periode bebas. Susunan kolom, judul, identitas,
// baris jumlah, dan tanda tangan mengikuti cetakan SIMAKDA; huruf Times New Roman, kertas F4.
import { computed } from 'vue'
import { rupiah, terbilang, NAMA_HARI } from '@/utils/format'
import { formatNip } from '@/utils/validasi'
import { teksPeriode, teksSemester, tanggalDmy } from '@/utils/simakda'
import { dariIso, tanggalPanjang } from '@/utils/format'

const props = defineProps({
  jenis: { type: String, required: true }, // bku | tunai | bank | pajak | spj | objek | lrpb | sptjm | bmd
  d: { type: Object, required: true },
  profil: { type: Object, required: true },
  dari: String, sampai: String, tahun: [Number, String],
  tanggal: String, // tanggal tanda tangan
  kepsek: Object, bendahara: Object,
  nomor: String, // nomor SPTJM
})

const uang = (n) => rupiah(n, { tanpaRp: true }) + ',00'
const uangBulat = (n) => rupiah(n, { tanpaRp: true })
const besar = (s) => String(s || '').toUpperCase()
const namaTtd = (p) => (p ? `${besar(p.nama)}${p.gelar ? ', ' + p.gelar : ''}` : '……………………………')
const sekolah = computed(() => besar(props.profil.nama_pemda || props.profil.nama_arkas))
const periode = computed(() => teksPeriode(props.dari, props.sampai))
const periodeKecil = computed(() => teksPeriode(props.dari, props.sampai, false).replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => a + b.toLowerCase()).replace('S.d.', 'S.D.'))
const identitas = computed(() => [
  ['Nama Sekolah', sekolah.value], ...(props.jenis === 'bku' ? [] : [['Kelurahan', besar(props.profil.kelurahan)]]),
  ['Kecamatan', besar(props.profil.kecamatan)], ['Kota', besar(props.profil.kota)], ['Provinsi', besar(props.profil.provinsi)],
])
const JUDUL = { bku: 'BUKU KAS UMUM', tunai: 'BUKU PEMBANTU TUNAI', bank: 'BUKU SIMPANAN BANK', pajak: 'BUKU PEMBANTU PAJAK', objek: 'BUKU SUBRINCIAN OBJEK' }
const hariTanggal = computed(() => { const t = dariIso(props.sampai); return t ? `${NAMA_HARI[t.getDay()]} tanggal ${tanggalPanjang(props.sampai).replace(/^(\d) /, '0$1 ')}` : '' })
const tglPanjang = (s) => tanggalPanjang(s).replace(/^(\d) /, '0$1 ')
</script>

<template>
  <div class="smk" :class="`smk-${props.jenis}`">
    <!-- ============ Buku (BKU, tunai, bank, pajak, objek) ============ -->
    <template v-if="JUDUL[props.jenis]">
      <div class="judul">
        <div>{{ JUDUL[props.jenis] }}</div>
        <div>PERIODE : {{ periode }}</div>
        <div>TAHUN ANGGARAN {{ props.tahun }}</div>
      </div>
      <table class="ident">
        <tr v-for="[l, v] in identitas" :key="l"><td class="l">{{ l }}</td><td class="t">:</td><td>{{ v }}</td></tr>
        <template v-if="props.jenis === 'bku'"><tr><td class="l">Saldo Awal</td><td class="t">:</td><td>{{ props.d.awalTahun ? uang(props.d.awalTahun) : '' }}</td></tr></template>
        <template v-if="props.jenis === 'objek'">
          <tr><td class="l">Kode Dan Nama Rekening</td><td class="t">:</td><td>{{ props.d.akun.kode }} {{ besar(props.d.akun.nama) }}</td></tr>
          <tr><td class="l">Anggaran</td><td class="t">:</td><td>{{ uang(props.d.anggaran) }}</td></tr>
        </template>
      </table>
    </template>

    <!-- BKU -->
    <table v-if="props.jenis === 'bku'" class="tabel">
      <thead>
        <tr><th style="width: 1.1cm">Nomor</th><th style="width: 1.75cm">Tanggal</th><th style="width: 1.5cm">No Bukti</th><th>Uraian</th><th style="width: 2.45cm">Penerimaan</th><th style="width: 2.45cm">Pengeluaran</th><th style="width: 2.45cm">Saldo</th></tr>
        <tr class="nomor"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></tr>
      </thead>
      <tbody>
        <tr><td></td><td></td><td></td><td></td><td></td><td class="kanan">Saldo Bulan Lalu</td><td class="kanan">{{ uang(props.d.awal) }}</td></tr>
        <template v-for="g in props.d.isi" :key="g.kunci">
          <tr class="kepala-nota">
            <td class="tengah" :rowspan="g.baris.length + 1">{{ g.nomor }}</td><td class="tengah tgl" :rowspan="g.baris.length + 1">{{ tanggalDmy(g.tanggal) }}</td><td class="tengah bukti" :rowspan="g.baris.length + 1">{{ g.bnu }}</td>
            <td>{{ g.judul }}</td><td></td><td></td><td></td>
          </tr>
          <tr v-for="(l, i) in g.baris" :key="i" class="dalam">
            <td>{{ l.label }}</td><td class="kanan bawah">{{ l.masuk ? uang(l.masuk) : '' }}</td><td class="kanan bawah">{{ l.keluar ? uang(l.keluar) : '' }}</td><td class="kanan bawah">{{ uang(l.saldo) }}</td>
          </tr>
        </template>
      </tbody>
    </table>
    <template v-if="props.jenis === 'bku'">
      <table class="jumlah-bku">
        <tr><td>Jumlah Periode {{ periodeKecil }}</td><td class="kanan">{{ uang(props.d.masuk) }}</td><td class="kanan">{{ uang(props.d.keluar) }}</td></tr>
        <tr><td>Jumlah Sampai Tanggal {{ tglPanjang(props.dari) }}</td><td class="kanan">{{ uang(props.d.sebelum.masuk) }}</td><td class="kanan">{{ uang(props.d.sebelum.keluar) }}</td></tr>
        <tr><td>Jumlah s/d Tanggal {{ tglPanjang(props.sampai) }}</td><td class="kanan">{{ uang(props.d.sd.masuk) }}</td><td class="kanan">{{ uang(props.d.sd.keluar) }}</td></tr>
        <tr><td>Sisa Kas Pada Tanggal {{ tglPanjang(props.sampai) }}</td><td></td><td class="kanan">{{ uang(props.d.sisa) }}</td></tr>
      </table>
      <div class="ba">
        <p>Pada hari ini {{ hariTanggal }}</p>
        <p>Oleh kami didapat dalam kas Rp. {{ uang(props.d.sisa) }}</p>
        <p>({{ terbilang(props.d.sisa).toLowerCase() }})</p>
        <p>Terdiri Dari :</p>
        <table class="rinci">
          <tr><td>a. Tunai</td><td>Rp</td><td class="kanan">{{ uang(props.d.kas.tunai) }}</td></tr>
          <tr><td>b. Saldo Bank</td><td>Rp</td><td class="kanan">{{ uang(props.d.kas.bank) }}</td></tr>
          <tr><td>c. Saldo Pajak</td><td>Rp</td><td class="kanan">{{ uang(props.d.kas.pajak) }}</td></tr>
          <tr><td>- Total</td><td>Rp</td><td class="kanan">{{ uang(props.d.sisa) }}</td></tr>
        </table>
        <p>- Keterangan/Perbedaan :</p>
      </div>
    </template>

    <!-- Buku Pembantu Tunai / Bank -->
    <table v-if="props.jenis === 'tunai' || props.jenis === 'bank'" class="tabel">
      <thead><tr><th style="width: 1.75cm">Tanggal.</th><th style="width: 1.5cm">No. Bukti</th><th>Uraian</th><th style="width: 2.5cm">Penerimaan</th><th style="width: 2.5cm">Pengeluaran</th><th style="width: 2.5cm">Saldo</th></tr></thead>
      <tbody>
        <tr><td></td><td></td><td>Saldo Lalu</td><td></td><td></td><td class="kanan">{{ uang(props.d.awal) }}</td></tr>
        <tr v-for="(r, i) in props.d.isi" :key="i">
          <td class="tengah">{{ tanggalDmy(r.tanggal) }}</td><td class="tengah">{{ r.bnu }}</td><td>{{ r.uraian }}</td>
          <td class="kanan">{{ r.masuk ? uang(r.masuk) : '' }}</td><td class="kanan">{{ r.keluar ? uang(r.keluar) : '' }}</td><td class="kanan">{{ uang(r.saldo) }}</td>
        </tr>
      </tbody>
      <tfoot><tr><td colspan="3" class="kanan"><b>JUMLAH</b></td><td class="kanan"><b>{{ uang(props.d.masuk) }}</b></td><td class="kanan"><b>{{ uang(props.d.keluar) }}</b></td><td class="kanan"><b>{{ uang(props.d.akhir) }}</b></td></tr></tfoot>
    </table>

    <!-- Buku Pembantu Pajak -->
    <table v-if="props.jenis === 'pajak'" class="tabel">
      <thead><tr><th style="width: 1.75cm">Tanggal</th><th style="width: 1.5cm">No. Bukti</th><th>Uraian</th><th style="width: 2.5cm">Penerimaan<br />(Rp)</th><th style="width: 2.5cm">Pengeluaran<br />(Rp)</th><th style="width: 2.5cm">Saldo</th></tr></thead>
      <tbody>
        <tr><td></td><td></td><td>Saldo Pemotongan Bulan Lalu</td><td></td><td></td><td class="kanan">{{ uangBulat(props.d.awal) }}</td></tr>
        <template v-for="(e, i) in props.d.isi" :key="i">
          <tr class="kepala-nota">
            <td class="tengah tgl" :rowspan="e.baris.length + 1">{{ tanggalDmy(e.tanggal) }}</td><td class="tengah bukti" :rowspan="e.baris.length + 1">{{ e.bnu }}</td>
            <td>{{ e.judul }}</td><td></td><td></td><td></td>
          </tr>
          <tr v-for="(l, j) in e.baris" :key="j" class="dalam">
            <td>{{ l.label }}</td><td class="kanan bawah">{{ l.masuk ? uangBulat(l.masuk) : '' }}</td><td class="kanan bawah">{{ l.keluar ? uangBulat(l.keluar) : '' }}</td><td class="kanan bawah">{{ uangBulat(l.saldo) }}</td>
          </tr>
        </template>
      </tbody>
      <tfoot><tr><td colspan="3" class="tengah"><b>TOTAL</b></td><td class="kanan"><b>{{ uang(props.d.masuk) }}</b></td><td class="kanan"><b>{{ uang(props.d.keluar) }}</b></td><td class="kanan"><b>{{ uang(props.d.akhir) }}</b></td></tr></tfoot>
    </table>

    <!-- Buku Subrincian Objek -->
    <table v-if="props.jenis === 'objek'" class="tabel">
      <thead>
        <tr><th style="width: 1.85cm">TANGGAL</th><th style="width: 1.6cm">NO. BUKTI</th><th>URAIAN</th><th style="width: 3cm">REALISASI</th><th style="width: 3cm">SISA ANGGARAN</th></tr>
        <tr class="nomor"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
      </thead>
      <tbody>
        <tr><td></td><td></td><td>Saldo Lalu</td><td></td><td class="kanan">{{ uang(props.d.awal) }}</td></tr>
        <tr v-for="(r, i) in props.d.isi" :key="i"><td class="tengah">{{ tanggalDmy(r.tanggal) }}</td><td class="tengah">{{ r.bnu }}</td><td>{{ r.uraian }}</td><td class="kanan">{{ uang(r.realisasi) }}</td><td class="kanan">{{ uang(r.sisa) }}</td></tr>
      </tbody>
      <tfoot><tr><td colspan="3" class="kanan"><b>JUMLAH</b></td><td class="kanan"><b>{{ uang(props.d.realisasi) }}</b></td><td class="kanan"><b>{{ uang(props.d.akhir) }}</b></td></tr></tfoot>
    </table>

    <!-- ============ LPJ Bendahara Pengeluaran (SPJ Belanja BOS) ============ -->
    <template v-if="props.jenis === 'spj'">
      <div class="kiri-atas"><b>SEKOLAH {{ sekolah }}</b><br /><b>TAHUN ANGGARAN {{ props.tahun }}</b></div>
      <div class="judul"><div>LAPORAN PERTANGGUNGJAWABAN BENDAHARA PENGELUARAN</div><div>(SPJ BELANJA BOS)</div><div>{{ periode }}</div></div>
      <table class="tabel kecil">
        <thead>
          <tr><th rowspan="2" style="width: 5.4cm">Kode Rekening</th><th rowspan="2">Uraian</th><th rowspan="2" style="width: 2.9cm">Jumlah<br />Anggaran</th><th colspan="3">SPJ - BELANJA NON RKUD</th><th rowspan="2" style="width: 2.9cm">Sisa Pagu<br />Anggaran</th></tr>
          <tr><th style="width: 2.6cm">s.d Bulan lalu</th><th style="width: 2.6cm">Bulan ini</th><th style="width: 2.6cm">s.d Bulan ini</th></tr>
          <tr class="nomor"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7 =(6-3)</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in props.d.baris" :key="r.kode" :class="r.tebal && 'tebal'">
            <td class="kode">{{ r.kode }}</td><td>{{ r.nama }}</td><td class="kanan">{{ uang(r.anggaran) }}</td><td class="kanan">{{ uang(r.lalu) }}</td><td class="kanan">{{ uang(r.kini) }}</td><td class="kanan">{{ uang(r.sd) }}</td><td class="kanan">{{ uang(r.sisa) }}</td>
          </tr>
          <tr class="tebal"><td></td><td class="tengah">Jumlah</td><td class="kanan">{{ uang(props.d.total.anggaran) }}</td><td class="kanan">{{ uang(props.d.total.lalu) }}</td><td class="kanan">{{ uang(props.d.total.kini) }}</td><td class="kanan">{{ uang(props.d.total.sd) }}</td><td class="kanan">{{ uang(props.d.total.sisa) }}</td></tr>
          <tr v-for="(k, i) in props.d.kas" :key="'k' + i" class="tanpa-garis">
            <td></td>
            <td :style="{ paddingLeft: k.sub ? '1.3cm' : k.kepala || k.jumlah ? '0.1cm' : '0.4cm' }" :class="k.jumlah && 'tebal'">{{ k.judul }}</td>
            <td></td>
            <template v-if="!k.kepala"><td class="kanan">{{ uang(k.lalu) }}</td><td class="kanan">{{ uang(k.kini) }}</td><td class="kanan">{{ uang(k.sd) }}</td></template>
            <template v-else><td></td><td></td><td></td></template>
            <td></td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- ============ Laporan Realisasi Penerimaan & Belanja ============ -->
    <template v-if="props.jenis === 'lrpb'">
      <div class="judul"><div>LAPORAN REALISASI PENERIMAAN DAN BELANJA DANA BOSP</div></div>
      <p class="teks">Bersama ini kami laporkan realisasi atas penggunaan Dana BOSP untuk {{ teksSemester(props.dari, props.sampai) }} tahun {{ props.tahun }} sebagai berikut:</p>
      <table class="tabel kecil lrpb">
        <thead>
          <tr><th style="width: 0.7cm">No</th><th>Uraian</th><th style="width: 2.35cm">Jumlah Anggaran (Rp)</th><th style="width: 2.3cm">Realisasi s.d Bulan Sebelumnya (Rp)</th><th style="width: 2.3cm">Realisasi Bulan ini (Rp)</th><th style="width: 2.35cm">Jumlah Realisasi s.d Bulan ini (Rp)</th><th style="width: 2.35cm">Selisih/ Kurang (Rp)</th></tr>
          <tr class="nomor"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>(7=3-6)</th></tr>
        </thead>
        <tbody>
          <tr><td></td><td>Penerimaan</td><td colspan="5"></td></tr>
          <tr v-for="[j, v] in props.d.terima" :key="j"><td></td><td style="padding-left: 0.3cm">{{ j }}</td><td class="kanan">{{ uang(v.anggaran) }}</td><td class="kanan">{{ uang(v.lalu) }}</td><td class="kanan">{{ uang(v.kini) }}</td><td class="kanan">{{ uang(v.sd) }}</td><td class="kanan">{{ uang(v.selisih) }}</td></tr>
          <tr class="tebal"><td></td><td class="kanan">Jumlah</td><td class="kanan">{{ uang(props.d.jumlahTerima.anggaran) }}</td><td class="kanan">{{ uang(props.d.jumlahTerima.lalu) }}</td><td class="kanan">{{ uang(props.d.jumlahTerima.kini) }}</td><td class="kanan">{{ uang(props.d.jumlahTerima.sd) }}</td><td class="kanan">{{ uang(props.d.jumlahTerima.selisih) }}</td></tr>
          <tr><td></td><td>Pengeluaran</td><td colspan="5"></td></tr>
          <template v-for="k in props.d.keluar" :key="k.judul">
            <tr><td></td><td :style="{ paddingLeft: k.sub ? '0.5cm' : '0.2cm' }">{{ k.judul }}</td><td colspan="5"></td></tr>
            <tr v-for="[j, v] in k.baris" :key="k.judul + j"><td></td><td style="padding-left: 0.8cm">{{ j }}</td><td class="kanan">{{ uang(v.anggaran) }}</td><td class="kanan">{{ uang(v.lalu) }}</td><td class="kanan">{{ uang(v.kini) }}</td><td class="kanan">{{ uang(v.sd) }}</td><td class="kanan">{{ uang(v.selisih) }}</td></tr>
          </template>
          <tr class="tebal"><td></td><td class="kanan">Jumlah</td><td class="kanan">{{ uang(props.d.jumlahKeluar.anggaran) }}</td><td class="kanan">{{ uang(props.d.jumlahKeluar.lalu) }}</td><td class="kanan">{{ uang(props.d.jumlahKeluar.kini) }}</td><td class="kanan">{{ uang(props.d.jumlahKeluar.sd) }}</td><td class="kanan">{{ uang(props.d.jumlahKeluar.selisih) }}</td></tr>
        </tbody>
      </table>
      <p class="teks">Laporan realisasi yang disampaikan telah sesuai dengan sasaran penggunaan yang ditetapkan dengan peraturan perundang-undangan dan telah didukung oleh kelengkapan dokumen yang sah sesuai ketentuan yang berlaku dan bertanggungjawab atas kebenarannya.<br />Demikian laporan realisasi ini dibuat untuk digunakan sebagaimana mestinya.</p>
    </template>

    <!-- ============ SPTJM ============ -->
    <template v-if="props.jenis === 'sptjm'">
      <div class="judul"><div>SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</div><div class="biasa">Nomor : {{ props.nomor || '…………………………' }}</div></div>
      <table class="ident">
        <tr><td class="l">1. Nama Satuan Pendidikan</td><td class="t">:</td><td>{{ sekolah }}</td></tr>
        <tr><td class="l">2. Kode Organisasi</td><td class="t">:</td><td>{{ props.profil.kode_sekolah_pemda }}</td></tr>
        <tr><td class="l">3. Nomor/tanggal DPA-SKPD</td><td class="t">:</td><td>{{ props.profil.no_dpa }}</td></tr>
        <tr><td class="l">4. Kegiatan Dana BOS</td><td class="t">:</td><td>{{ props.profil.kode_kegiatan_dpa }}</td></tr>
      </table>
      <p class="teks">Saya yang bertanda tangan dibawah ini menyatakan bahwa bertanggung jawab secara formal dan material atas kebenaran realisasi penerimaan dan pengeluaran Dana BOS serta kebenaran perhitungan dan setoran pajak yang telah dipungut atas penggunaan Dana BOS pada {{ teksSemester(props.dari, props.sampai) }} tahun anggaran {{ props.tahun }} dengan rincian sebagai berikut:</p>
      <table class="sptjm">
        <tr><td colspan="2">A. Saldo Awal Dana BOS</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.awal) }}</td></tr>
        <tr><td colspan="4">B. Penerimaan Dana BOS</td></tr>
        <tr><td class="i"></td><td>1. Tahap I</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.tahap1) }}</td></tr>
        <tr><td class="i"></td><td>2. Tahap II</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.tahap2) }}</td></tr>
        <tr><td class="i"></td><td>3. Pendapatan Lainnya</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.lain) }}</td></tr>
        <tr><td class="i"></td><td>&nbsp;&nbsp;&nbsp;Jumlah Penerimaan</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.terima) }}</td></tr>
        <tr><td colspan="4">C. Pengeluaran Dana BOS</td></tr>
        <tr><td class="i"></td><td>1. Jenis Belanja Pegawai</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.pegawai) }}</td></tr>
        <tr><td class="i"></td><td>2. Jenis Belanja Barang Dan jasa</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.barang) }}</td></tr>
        <tr><td class="i"></td><td>3. Jenis Belanja Modal</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.modal) }}</td></tr>
        <tr><td class="i"></td><td>&nbsp;&nbsp;&nbsp;Jumlah</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.belanja) }}</td></tr>
        <tr><td colspan="2">D. Sisa Dana BOS ((A + B) - C )</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.sisa) }}</td></tr>
        <tr><td class="i"></td><td>Terdiri Atas :</td><td></td><td></td></tr>
        <tr><td class="i"></td><td>1. Sisa Kas Tunai</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.tunai) }}</td></tr>
        <tr><td class="i"></td><td>2. Sisa di Bank</td><td class="rp">Rp.</td><td class="kanan">{{ uang(props.d.bank) }}</td></tr>
      </table>
      <p class="teks">Bukti-bukti atas belanja tersebut pada huruf B disimpan pada Satdik {{ sekolah }} untuk kelengkapan Administrasi dan keperluan pemeriksaan sesuai peraturan perundang-undangan. Apabila bukti-bukti tersebut tidak benar yang mengakibatkan kerugian daerah, saya bertanggungjawab sepenuhnya atas kerugian daerah dimaksud sesuai kewenangan saya berdasarkan ketentuan peraturan perundang-undangan. Demikian surat pernyataan ini dibuat dengan sebenarnya.</p>
    </template>

    <!-- ============ Rekapitulasi Pembelian BMD ============ -->
    <template v-if="props.jenis === 'bmd'">
      <table class="ident">
        <tr><td class="l">Nama Sekolah</td><td class="t">:</td><td>{{ sekolah }}</td></tr>
        <tr><td class="l">Desa/Kelurahan</td><td class="t">:</td><td>{{ props.profil.kelurahan }}</td></tr>
        <tr><td class="l">Kecamatan</td><td class="t">:</td><td>{{ props.profil.kecamatan }}</td></tr>
        <tr><td class="l">Kabupaten/Kota</td><td class="t">:</td><td>{{ besar(props.profil.kota) }}</td></tr>
        <tr><td class="l">Provinsi</td><td class="t">:</td><td>{{ besar(props.profil.provinsi) }}</td></tr>
        <tr><td class="l">Tahun Anggaran</td><td class="t">:</td><td>{{ props.tahun }}</td></tr>
      </table>
      <div class="judul"><div>REKAPITULASI PEMBELIAN BARANG MILIK DAERAH</div><div class="biasa">Periode : {{ periodeKecil }}</div></div>
      <table class="tabel">
        <thead>
          <tr><th style="width: 1cm">No.</th><th>NAMA BARANG MILIK DAERAH</th><th style="width: 2.2cm">JUMLAH UNIT</th><th style="width: 3cm">HARGA SATUAN (Rp)</th><th style="width: 3.2cm">JUMLAH (Rp)</th></tr>
          <tr class="nomor"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
        </thead>
        <tbody>
          <template v-for="(g, gi) in props.d.isi" :key="g.akun.kode">
            <tr class="tebal"><td></td><td>{{ g.akun.nama }}</td><td></td><td></td><td class="kanan">{{ uang(g.total) }}</td></tr>
            <tr v-for="(i, n) in g.item" :key="n">
              <td class="tengah">{{ props.d.isi.slice(0, gi).reduce((s, x) => s + x.item.length, 0) + n + 1 }}</td><td>{{ i.nama }}</td><td class="tengah">{{ i.volume }}</td><td class="kanan">{{ uang(i.harga) }}</td><td class="kanan">{{ uang(i.jumlah) }}</td>
            </tr>
          </template>
          <tr v-if="!props.d.isi.length"><td colspan="5" class="tengah"><i>Tidak ada pembelian barang milik daerah pada periode ini.</i></td></tr>
        </tbody>
        <tfoot><tr><td colspan="4" class="kanan"><b>Jumlah</b></td><td class="kanan"><b>{{ uang(props.d.total) }}</b></td></tr></tfoot>
      </table>
    </template>

    <!-- ============ Tanda tangan ============ -->
    <table v-if="props.jenis === 'lrpb' || props.jenis === 'sptjm'" class="ttd">
      <tr><td></td><td>
        <div>Makassar, {{ tglPanjang(props.tanggal) }}</div>
        <div>KEPALA {{ props.jenis === 'lrpb' ? 'SEKOLAH ' : '' }}{{ sekolah }}</div>
        <div class="ruang" />
        <div class="nama">{{ namaTtd(props.kepsek) }}</div>
        <div v-if="props.kepsek?.nip">{{ props.jenis === 'lrpb' ? 'NIP: ' : '' }}{{ props.kepsek.nip }}</div>
      </td></tr>
    </table>
    <table v-else class="ttd">
      <tr>
        <td>
          <div>Mengetahui{{ props.jenis === 'bku' || props.jenis === 'bmd' ? ',' : ':' }}</div>
          <div>KEPALA SEKOLAH</div>
          <div class="ruang" />
          <div class="nama">{{ namaTtd(props.kepsek) }}</div>
          <div v-if="props.kepsek?.nip && props.jenis !== 'bmd'">NIP: {{ props.kepsek.nip }}</div>
        </td>
        <td>
          <div>Makassar, {{ tglPanjang(props.tanggal) }}</div>
          <div>BENDAHARA DANA BOS</div>
          <div class="ruang" />
          <div class="nama">{{ namaTtd(props.bendahara) }}</div>
          <div v-if="props.bendahara?.nip && props.jenis !== 'bmd'">NIP: {{ props.bendahara.nip }}</div>
        </td>
      </tr>
    </table>
  </div>
</template>

<style scoped>
.smk { color: #000; font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; line-height: 1.22; }
.judul { text-align: center; font-weight: bold; margin: 0.1cm 0 0.4cm; }
.judul .biasa { font-weight: normal; }
.kiri-atas { margin-bottom: 0.3cm; }
.ident { border-collapse: collapse; margin-bottom: 0.35cm; font-weight: bold; }
.ident td { padding: 0 4px 0 0; vertical-align: top; }
.ident .l { width: 4.6cm; } .ident .t { width: 0.4cm; }
.smk-sptjm .ident { font-weight: normal; }
.smk-sptjm .ident .l { width: 6cm; }
.tabel { width: 100%; border-collapse: collapse; }
.tabel th, .tabel td { border: 0.6pt solid #000; padding: 1px 4px; vertical-align: top; }
.tabel th { font-weight: bold; text-align: center; vertical-align: middle; }
.tabel thead tr.nomor th { font-weight: normal; padding: 0 4px; }
.tabel.kecil { font-size: 9pt; }
.tabel.lrpb td { white-space: nowrap; } .tabel.lrpb td:nth-child(2) { white-space: normal; }
.tabel.lrpb { font-size: 8.5pt; }
.tabel tr.tebal td { font-weight: bold; }
.tabel tr.tanpa-garis td { border-top: none; border-bottom: none; }
.tabel td.kode { white-space: nowrap; font-family: inherit; font-size: 8.5pt; }
.tabel tbody tr.tanpa-garis:last-child td { border-bottom: 0.6pt solid #000; }
.tabel td.tgl, .tabel td.bukti { white-space: nowrap; font-size: 9pt; }
.tabel tr.kepala-nota td:nth-last-child(-n+4) { border-bottom: none; }
.tabel tr.kepala-nota td[rowspan] { border-bottom: 0.6pt solid #000; }
.tabel tr.dalam td { border-top: none; border-bottom: none; }
.tabel tbody tr.dalam:has(+ tr.kepala-nota) td, .tabel tbody tr.dalam:last-child td { border-bottom: 0.6pt solid #000; }
.tabel td.bawah { vertical-align: bottom; }
.tabel thead { display: table-header-group; }
.tabel tr { page-break-inside: avoid; break-inside: avoid; }
.kanan { text-align: right; white-space: nowrap; } .tengah { text-align: center; }
.jumlah-bku { width: 100%; border-collapse: collapse; margin-top: 0.3cm; font-weight: bold; }
.jumlah-bku td { padding: 1px 4px; }
.jumlah-bku td:nth-child(2), .jumlah-bku td:nth-child(3) { width: 2.9cm; }
.ba { margin-top: 0.3cm; }
.ba p { margin: 0.05cm 0; }
.rinci { border-collapse: collapse; margin-left: 0.2cm; }
.rinci td { padding: 0 6px; } .rinci td:first-child { width: 4cm; } .rinci td:last-child { width: 3.6cm; }
.teks { text-align: justify; margin: 0.25cm 0; }
.sptjm { border-collapse: collapse; margin: 0.2cm 0 0.3cm; width: 15cm; }
.sptjm td { padding: 1px 4px; } .sptjm td.i { width: 0.4cm; } .sptjm td.rp { width: 1cm; } .sptjm td.kanan { width: 4cm; }
.ttd { width: 100%; margin-top: 0.6cm; border-collapse: collapse; page-break-inside: avoid; }
.ttd td { width: 50%; text-align: center; vertical-align: top; padding: 0 0.5cm; }
.ttd .ruang { height: 2cm; }
.ttd .nama { font-weight: bold; }
</style>
