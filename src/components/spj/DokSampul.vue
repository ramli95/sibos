<script setup>
// Sampul SPJ / kwitansi besar format sekolah (mengikuti sheet "Sampul" Jurnal Dana BOS):
// pita kiri bertuliskan instansi (tegak), KWITANSI, kode rekening, lunas tanggal, nomor buku kas (BNU ARKAS),
// banyaknya uang (kotak), untuk pembayaran "Pengembangan <SNP>, yaitu: …", tanda tangan KS, Bendahara, penerima.
import { computed } from 'vue'
import { rupiah, terbilang, tanggalPanjang } from '@/utils/format'
import { NAMA_KODE_ARKAS } from '@/config/kodeArkas'
import { formatNip } from '@/utils/validasi'

const props = defineProps({
  b: { type: Object, required: true }, k: { type: Object, required: true },
  grup: { type: Object, required: true }, // { bnu, baris: [{ uraian, kode_kegiatan, kode_rekening, jumlah }] }
  namaKeg: { type: Function, default: () => '' },
})
const total = computed(() => props.grup.baris.reduce((s, x) => s + x.jumlah, 0))
// Nomor Kode Rekening (Pengaturan → Cetak): kode rekening belanja RKAS (bawaan), kegiatan / rekening, kode kegiatan (program.komponen.kegiatan),
// atau format SNP Jurnal lama "1.<nomor SNP>" (mis. 1.5 = Sarana dan Prasarana)
const kodeSatu = (x) => {
  const snpNo = Number(String(x.kode_kegiatan || '').split('.')[0]) || ''
  switch (props.k.kodeSampul) {
    case 'kegiatan_rekening': return `${x.kode_kegiatan} / ${x.kode_rekening}`
    case 'kegiatan': return x.kode_kegiatan
    case 'snp': return snpNo ? `1.${snpNo}` : (props.b.kode_asli || '')
    default: return x.kode_rekening || props.b.kode_asli || ''
  }
}
const kode = computed(() => [...new Set(props.grup.baris.map(kodeSatu).filter(Boolean))].join('; '))
const tglLunas = computed(() => props.b.tgl_lunas || props.b.tgl_kwitansi)
const tglNota = computed(() => props.b.tgl_invoice || props.b.tgl_terima || props.b.tgl_kegiatan || props.b.tgl_kwitansi || props.b.tgl_lunas)
const snp = computed(() => {
  const s = String(props.grup.baris[0]?.kode_kegiatan || '').split('.')[0]
  const n = NAMA_KODE_ARKAS[s] || props.namaKeg(s) || ''
  return n ? `Pengembangan ${n}` : ''
})
const pembayaran = computed(() => {
  const teks = props.b.uraian_pembayaran || props.b.nama_pekerjaan
  if (props.grup.baris.length > 1) return props.grup.baris.map((x) => x.uraian)
  return [teks]
})
// "Dua juta tujuh ratus ribu rupiah" → "Dua Juta Tujuh Ratus Ribu Rupiah"
const uang = computed(() => terbilang(total.value).replace(/\b\w/g, (h) => h.toUpperCase()))
const sekolahPendek = computed(() => props.k.sekolah.nama.replace(/^UPT\s+SPF\s+/i, ''))
const besar = (p) => {
  const n = String(p?.nama || '')
  const i = n.indexOf(',')
  return i > 0 ? n.slice(0, i).toUpperCase() + n.slice(i) : n.toUpperCase()
}
const ks = computed(() => props.k.ks(tglLunas.value))
const bend = computed(() => props.k.bendahara(tglLunas.value))
const penerima = computed(() => {
  if (props.b.jenis !== 'honor') return { nama: props.k.penyedia.nama, sub: '' }
  const p = props.b.penerima || []
  return p.length === 1 ? { nama: p[0].nama, sub: p[0].nip ? `NIP. ${formatNip(p[0].nip)}` : '' } : { nama: 'Daftar terlampir', sub: `${p.length} penerima` }
})
</script>

<template>
  <table class="sampul">
    <tr>
      <td class="pita">
        <div class="pita-teks">PEMERINTAH KOTA MAKASSAR<br />BENDAHARA DANA BOS {{ sekolahPendek.toUpperCase() }}</div>
      </td>
      <td class="isi">
        <div class="judul-sampul">KWITANSI</div>
        <table class="isian lebar">
          <tr><td class="lb">Nomor Kode Rekening</td><td class="tt">:</td><td>{{ kode }}</td></tr>
          <tr><td class="lb">Lunas Tanggal</td><td class="tt">:</td><td>{{ tanggalPanjang(tglLunas) }}</td></tr>
          <tr><td class="lb">Nomor Buku Kas</td><td class="tt">:</td><td>{{ grup.bnu }}</td></tr>
          <tr><td class="lb">Sudah Terima Dari</td><td class="tt">:</td><td>Bendahara BOSP {{ k.sekolah.nama }}</td></tr>
          <tr class="jarak"><td class="lb" style="vertical-align: middle">Banyaknya Uang</td><td class="tt" style="vertical-align: middle">:</td><td><div class="kotak-uang miring">{{ uang }}</div></td></tr>
          <tr class="jarak"><td class="lb">Untuk Pembayaran</td><td class="tt">:</td>
            <td>
              <template v-if="snp">{{ snp }}, yaitu:<br /></template>
              <template v-for="(t, i) in pembayaran" :key="i">{{ pembayaran.length > 1 ? `${i + 1}. ` : '' }}{{ t }}<br /></template>
            </td>
          </tr>
        </table>

        <div class="blok-ttd" style="margin-top: 1.4cm">
          <div>Setuju Dibayar:</div>
          <div>Kepala {{ sekolahPendek }}</div>
          <div>Kota Makassar</div>
          <div class="ruang-ttd"><img v-if="k.pakaiGambar && ks.ttd" :src="ks.ttd" alt="" /></div>
          <div class="tebal">{{ besar(ks) }}</div>
          <div v-if="ks.pangkat">Pangkat: {{ ks.pangkat }}</div>
          <div v-if="ks.nip">NIP. {{ formatNip(ks.nip) }}</div>
        </div>

        <table class="dua-ttd">
          <tr>
            <td class="blok-ttd">
              <div>Bendahara BOSP</div>
              <div>{{ sekolahPendek }}</div>
              <div>Kota Makassar</div>
              <div class="ruang-ttd"><img v-if="k.pakaiGambar && bend.ttd" :src="bend.ttd" alt="" /></div>
              <div class="tebal">{{ besar(bend) }}</div>
              <div v-if="bend.nip">NIP. {{ formatNip(bend.nip) }}</div>
            </td>
            <td>
              <div>{{ k.sekolah.kota }}, {{ tanggalPanjang(tglNota) }}</div>
              <div>Yang Menerima,</div>
              <div>&nbsp;</div>
              <div class="ruang-ttd"><span v-if="b.jenis !== 'honor' && total > 5000000" class="meterai" style="position: absolute; left: 0; top: 0.3cm">Meterai<br />Rp 10.000</span></div>
              <div class="tebal">{{ penerima.nama.toUpperCase() }}</div>
              <div v-if="penerima.sub">{{ penerima.sub }}</div>
            </td>
          </tr>
        </table>

        <table class="terbilang-rp">
          <tr><td style="padding-right: 0.3cm">Terbilang Rp.</td><td><div class="kotak-rp tebal">{{ rupiah(total, { tanpaRp: true }) }},00</div></td></tr>
        </table>
      </td>
    </tr>
  </table>
</template>

<style scoped>
.sampul { width: 100%; height: 25cm; border-collapse: collapse; margin-top: 1cm; }
.pita { width: 2.4cm; border: 2px solid #000; position: relative; padding: 0; }
.pita-teks {
  position: absolute; left: 50%; top: 50%; width: 25cm; transform: translate(-50%, -50%) rotate(-90deg);
  text-align: center; font-weight: bold; font-size: 1.55em; line-height: 1.15; white-space: nowrap; letter-spacing: 0.01em;
}
.isi { vertical-align: top; padding: 0.3cm 0 0 0.6cm; }
.judul-sampul { text-align: center; font-weight: bold; font-size: 1.5em; margin: 0.2cm 0 0.7cm; }
.lebar { width: 100%; }
.lebar td { padding: 3px 3px; }
.lebar .lb { width: 4.2cm; }
.jarak td { padding-top: 0.35cm; }
.kotak-uang { border: 1px solid #000; padding: 0.3cm 0.2cm; }
/* Blok tanda tangan digeser ke kanan: ruang untuk stempel di sisi kiri tanda tangan */
.blok-ttd { padding-left: 1.6cm; }
.ruang-ttd { height: 2.1cm; position: relative; }
.ruang-ttd img { position: absolute; left: 0; top: 0.1cm; height: 1.9cm; object-fit: contain; }
.dua-ttd { width: 100%; border-collapse: collapse; margin-top: 1cm; }
.dua-ttd td { vertical-align: top; width: 50%; }
.dua-ttd td + td { padding-left: 1.2cm; }
.terbilang-rp { margin-top: 1cm; border-collapse: collapse; }
.terbilang-rp td { vertical-align: middle; }
.kotak-rp { border: 1px solid #000; background: #f1f1f1; padding: 0.3cm 0.25cm; min-width: 4.4cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
