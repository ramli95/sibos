<script setup>
// Poster Papan Informasi Dana BOSP (F4 tegak, Times New Roman) untuk papan pengumuman sekolah:
// dana diterima, dana digunakan, sisa, rencana vs realisasi per 12 komponen Juknis, per kategori belanja,
// saluran informasi & pengaduan (QR ke halaman publik), dan tanda tangan Kepala Sekolah & Bendahara.
import { ref, computed, watchEffect } from 'vue'
import QRCode from 'qrcode'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { rupiah, terbilang } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  r: { type: Object, required: true },        // hasil ringkasInformasi
  tahun: { type: Number, required: true },
  tanggal: { type: String, required: true },
  kepsek: Object,
  bendahara: Object,
  kontak: { type: String, default: '' },
  tautan: { type: String, default: '' },      // halaman publik (QR)
  semuaKomponen: Boolean,                      // tampilkan komponen tanpa anggaran
})

const qr = ref('')
watchEffect(async () => { qr.value = props.tautan ? await QRCode.toDataURL(props.tautan, { margin: 0, width: 240, errorCorrectionLevel: 'M' }) : '' })

const baris = computed(() => props.r.komponen.filter((g) => props.semuaKomponen || g.anggaran || g.realisasi))
const rp = (n) => rupiah(n, { tanpaRp: true })
const lebar = (g) => `${Math.max(0, Math.min(100, g.persen))}%`
const persen = (n) => `${(Number(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
const unit = computed(() => props.profil.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR')
const KATEGORI = [['operasional', 'Belanja Barang & Jasa (Operasional)', '#1A62E8'], ['alat_mesin', 'Belanja Modal Peralatan & Mesin', '#E3A414'], ['aset_lain', 'Belanja Modal Aset Tetap Lainnya (Buku)', '#22A08D']]
const totalKat = computed(() => KATEGORI.reduce((s, [k]) => s + (props.r.kategori[k] || 0), 0))
</script>

<template>
  <div class="poster">
    <KopSurat :profil="props.profil" />

    <div class="pita">
      <div class="pita-kecil">PAPAN INFORMASI</div>
      <div class="pita-besar">PENGGUNAAN DANA BOSP REGULER</div>
      <div class="pita-sub">{{ unit }} · Tahun Anggaran {{ props.tahun }} · {{ props.r.periode.judul }} ({{ props.r.periode.ket }})</div>
    </div>

    <!-- Tiga angka utama -->
    <table class="angka-utama">
      <tr>
        <td class="kotak biru">
          <div class="lbl">DANA TERSEDIA</div>
          <div class="nilai">Rp {{ rp(props.r.danaTersedia) }}</div>
          <div class="ket">
            <template v-if="props.r.saldoAwal">Sisa tahun lalu Rp {{ rp(props.r.saldoAwal) }}<br /></template>
            <template v-if="props.r.sisaSebelum">Sisa tahap sebelumnya Rp {{ rp(props.r.sisaSebelum) }}<br /></template>
            Diterima {{ props.r.periode.judul }} Rp {{ rp(props.r.terima) }}
          </div>
        </td>
        <td class="kotak tosca">
          <div class="lbl">DANA DIGUNAKAN</div>
          <div class="nilai">Rp {{ rp(props.r.realisasi) }}</div>
          <div class="ket">{{ persen(props.r.persen) }} dari dana tersedia</div>
        </td>
        <td class="kotak kuning">
          <div class="lbl">SISA DANA</div>
          <div class="nilai">Rp {{ rp(props.r.sisa) }}</div>
          <div class="ket">Tersimpan di rekening Dana BOSP sekolah</div>
        </td>
      </tr>
    </table>
    <p class="terbilang">Dana digunakan: <i>{{ terbilang(props.r.realisasi) }}</i></p>

    <!-- Per komponen -->
    <div class="judul-bagian">RENCANA DAN REALISASI PER KOMPONEN PENGGUNAAN DANA</div>
    <table class="tabel">
      <thead>
        <tr><th style="width: 0.9cm">No</th><th>Komponen</th><th style="width: 3.2cm">Rencana {{ props.r.periode.judul }}</th><th style="width: 3.2cm">Realisasi</th><th style="width: 3.6cm">Capaian</th></tr>
      </thead>
      <tbody>
        <tr v-for="g in baris" :key="g.kode">
          <td class="tengah"><span class="huruf" :style="{ background: g.warna }">{{ g.huruf }}</span></td>
          <td>{{ g.nama }}</td>
          <td class="kanan">{{ g.anggaran ? rp(g.anggaran) : '-' }}</td>
          <td class="kanan">{{ g.realisasi ? rp(g.realisasi) : '-' }}</td>
          <td>
            <div class="batang"><div class="isi" :style="{ width: lebar(g), background: g.warna }" /></div>
            <div class="pct">{{ g.anggaran ? persen(g.persen) : '' }}</div>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr><td colspan="2" class="kanan"><b>JUMLAH</b></td><td class="kanan"><b>{{ rp(props.r.anggaranPeriode) }}</b></td><td class="kanan"><b>{{ rp(props.r.realisasi) }}</b></td>
          <td class="tengah"><b>{{ props.r.anggaranPeriode ? persen(props.r.realisasi / props.r.anggaranPeriode * 100) : '' }}</b></td></tr>
      </tfoot>
    </table>
    <p class="catatan">Pagu RKAS setahun Rp {{ rp(props.r.pagu) }}. Realisasi = belanja yang telah dibayar lunas sesuai Buku Kas Umum.</p>

    <!-- Kategori + pengaduan -->
    <table class="bawah">
      <tr>
        <td style="width: 58%; padding-right: 0.3cm">
          <div class="judul-bagian kiri">JENIS BELANJA</div>
          <div v-for="[k, l, w] in KATEGORI" :key="k" class="kat">
            <span class="titik" :style="{ background: w }" /> <span class="kat-l">{{ l }}</span>
            <span class="kat-n">Rp {{ rp(props.r.kategori[k] || 0) }}</span>
            <div class="batang tipis"><div class="isi" :style="{ width: totalKat ? `${((props.r.kategori[k] || 0) / totalKat) * 100}%` : 0, background: w }" /></div>
          </div>
        </td>
        <td class="aduan">
          <div class="judul-bagian kiri">INFORMASI &amp; PENGADUAN</div>
          <table style="width: 100%"><tr>
            <td style="vertical-align: top">{{ props.kontak || 'Sampaikan pertanyaan atau pengaduan mengenai penggunaan Dana BOSP kepada Kepala Sekolah atau Komite Sekolah.' }}</td>
            <td v-if="qr" style="width: 2.6cm; text-align: right; vertical-align: top"><img :src="qr" alt="QR" class="qr" /><div class="qr-ket">Pindai untuk data terbaru</div></td>
          </tr></table>
        </td>
      </tr>
    </table>

    <BlokTandaTangan :kiri="{ label: `Mengetahui,\nKepala ${unit}`, pejabat: props.kepsek }" :kanan="{ label: 'Bendahara Dana BOSP', pejabat: props.bendahara }" :tanggal="props.tanggal" />
  </div>
</template>

<style scoped>
.poster { color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pita { margin: 0.3cm 0 0.35cm; background: #1E3A8A; color: #fff; text-align: center; padding: 0.3cm 0.4cm; border-radius: 6px; }
.pita-kecil { font-size: 0.85em; letter-spacing: 0.35em; color: #FCD34D; font-weight: bold; }
.pita-besar { font-size: 1.75em; font-weight: bold; letter-spacing: 0.04em; line-height: 1.15; }
.pita-sub { font-size: 0.9em; margin-top: 2px; }
.angka-utama { width: calc(100% + 0.4cm); border-collapse: separate; border-spacing: 0.2cm 0; margin: 0 -0.2cm; table-layout: fixed; }
.kotak { width: 33.3%; vertical-align: top; padding: 0.25cm 0.3cm; border-radius: 6px; border: 1.5px solid; }
.kotak .lbl { font-size: 0.8em; font-weight: bold; letter-spacing: 0.08em; }
.kotak .nilai { font-size: 1.35em; font-weight: bold; margin: 2px 0; white-space: nowrap; }
.kotak .ket { font-size: 0.78em; line-height: 1.25; }
.biru { border-color: #1A62E8; background: #EAF1FE; } .biru .lbl, .biru .nilai { color: #1A4FC0; }
.tosca { border-color: #22A08D; background: #E7F6F3; } .tosca .lbl, .tosca .nilai { color: #167A6B; }
.kuning { border-color: #E3A414; background: #FDF5E2; } .kuning .lbl, .kuning .nilai { color: #9A6B00; }
.terbilang { font-size: 0.82em; margin: 0.12cm 0 0.3cm; }
.judul-bagian { text-align: center; font-weight: bold; margin: 0.15cm 0; letter-spacing: 0.03em; }
.judul-bagian.kiri { text-align: left; }
.tabel { width: 100%; border-collapse: collapse; font-size: 0.92em; }
.tabel th, .tabel td { border: 1px solid #000; padding: 2px 5px; vertical-align: middle; }
.tabel th { background: #1E3A8A; color: #fff; text-align: center; }
.tabel tfoot td { background: #F1F5F9; }
.tengah { text-align: center; } .kanan { text-align: right; white-space: nowrap; }
.huruf { display: inline-block; width: 0.5cm; height: 0.5cm; line-height: 0.5cm; border-radius: 50%; color: #fff; font-weight: bold; text-align: center; font-size: 0.85em; }
.batang { height: 0.28cm; background: #E5E7EB; border-radius: 99px; overflow: hidden; }
.batang.tipis { height: 0.18cm; margin: 1px 0 4px 0.45cm; }
.batang .isi { height: 100%; border-radius: 99px; }
.pct { font-size: 0.78em; text-align: right; }
.catatan { font-size: 0.75em; font-style: italic; margin: 0.08cm 0 0.25cm; }
.bawah { width: 100%; border-collapse: collapse; }
.bawah > tr > td, .bawah td { vertical-align: top; }
.kat { font-size: 0.88em; }
.titik { display: inline-block; width: 0.25cm; height: 0.25cm; border-radius: 50%; vertical-align: middle; }
.kat-n { float: right; font-weight: bold; }
.aduan { border: 1.5px dashed #1A62E8; border-radius: 6px; padding: 0.15cm 0.25cm; font-size: 0.85em; }
.qr { width: 2.3cm; height: 2.3cm; }
.qr-ket { font-size: 0.7em; text-align: center; }
</style>
