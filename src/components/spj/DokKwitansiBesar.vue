<script setup>
// Kwitansi besar (sampul SPJ): memakai Nomor Buku Kas (BNU ARKAS), kode kegiatan & rekening.
// grup.baris: transaksi yang berbagi BNU yang sama (digabung dalam satu kwitansi).
import { computed } from 'vue'
import { rupiah, terbilang, tanggalPanjang } from '@/utils/format'
import TtdKolom from './TtdKolom.vue'

const props = defineProps({
  b: { type: Object, required: true }, k: { type: Object, required: true },
  grup: { type: Object, required: true }, // { bnu, baris: [{ uraian, kode_kegiatan, kode_rekening, jumlah }], pajak: [] }
  namaKeg: { type: Function, default: () => '' }, namaRek: { type: Function, default: () => '' }, tahun: Number,
})
const total = computed(() => props.grup.baris.reduce((s, x) => s + x.jumlah, 0))
const kodeKeg = computed(() => [...new Set(props.grup.baris.map((x) => x.kode_kegiatan))])
const kodeRek = computed(() => [...new Set(props.grup.baris.map((x) => x.kode_rekening))])
const tgl = computed(() => props.b.tgl_kwitansi || props.b.tgl_lunas || props.b.tgl_terima || props.b.tgl_kegiatan)
const honor = computed(() => props.b.jenis === 'honor')
const penerima = computed(() => {
  if (!honor.value) return { jabatan: 'Yang menerima,', nama: props.k.penyedia.nama, sub: props.k.penyedia.usaha }
  const p = props.b.penerima || []
  return p.length === 1 ? { jabatan: 'Yang menerima,', nama: p[0].nama, nip: p[0].nip } : { jabatan: 'Yang menerima,', nama: 'Daftar terlampir', sub: `${p.length} penerima` }
})
const pajak = computed(() => (props.grup.pajak || []).filter((p) => p.nilai))
const r = (n) => rupiah(n, { tanpaRp: true })
</script>

<template>
  <div class="kwitansi">
    <table style="width: 100%; border-collapse: collapse">
      <tr>
        <td style="vertical-align: top; width: 52%" class="tebal kecil">
          PEMERINTAH KOTA MAKASSAR<br />DINAS PENDIDIKAN<br />{{ k.sekolah.nama.toUpperCase() }}
        </td>
        <td style="vertical-align: top">
          <table class="isian kecil" style="margin-left: auto">
            <tr><td class="lb">Tahun Anggaran</td><td class="tt">:</td><td>{{ tahun || b.tahun }}</td></tr>
            <tr><td class="lb">Nomor Buku Kas</td><td class="tt">:</td><td class="tebal">{{ grup.bnu || '……………' }}</td></tr>
            <tr><td class="lb">Kode Kegiatan</td><td class="tt">:</td><td>{{ kodeKeg.join(', ') }}</td></tr>
            <tr><td class="lb">Kode Rekening</td><td class="tt">:</td><td>{{ kodeRek.join(', ') }}</td></tr>
            <tr><td class="lb">Sumber Dana</td><td class="tt">:</td><td>BOSP Reguler</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <div class="judul polos" style="font-size: 1.6em; letter-spacing: 0.35em; margin: 0.35cm 0 0.3cm">KWITANSI</div>
    <table class="isian" style="width: 100%">
      <tr><td class="lb" style="width: 3.6cm">Sudah terima dari</td><td class="tt">:</td><td>Bendahara BOSP {{ k.sekolah.nama }}</td></tr>
      <tr><td class="lb">Uang sebanyak</td><td class="tt">:</td><td><div class="kotak-ganda tebal miring">{{ terbilang(total) }}</div></td></tr>
      <tr><td class="lb">Untuk pembayaran</td><td class="tt">:</td>
        <td>
          {{ b.uraian_pembayaran || `Pembayaran ${b.nama_pekerjaan}` }}<template v-if="!honor && b.rekanan?.nama_usaha"> pada {{ b.rekanan.nama_usaha }}</template>
          <table v-if="grup.baris.length > 1" class="tabel rapat kecil" style="margin-top: 0.15cm">
            <tr v-for="(x, i) in grup.baris" :key="i"><td style="width: 0.6cm" class="tengah">{{ i + 1 }}</td><td>{{ x.uraian }}</td><td style="width: 2.6cm" class="kode">{{ x.kode_rekening }}</td><td style="width: 2.6cm" class="kanan">{{ r(x.jumlah) }}</td></tr>
          </table>
        </td>
      </tr>
      <tr><td class="lb">Kegiatan</td><td class="tt">:</td><td>{{ kodeKeg.map((x) => `${x} ${namaKeg(x)}`.trim()).join('; ') }}</td></tr>
      <tr><td class="lb">Rekening Belanja</td><td class="tt">:</td><td>{{ kodeRek.map((x) => `${x} ${namaRek(x)}`.trim()).join('; ') }}</td></tr>
    </table>
    <table style="width: 100%; margin-top: 0.3cm; border-collapse: collapse">
      <tr>
        <td style="vertical-align: middle; width: 45%"><span class="kotak-ganda tebal" style="font-size: 1.25em; display: inline-block">Rp {{ r(total) }},-</span></td>
        <td style="vertical-align: top" class="kecil">
          <template v-if="pajak.length">
            <div class="tebal">Pajak:</div>
            <div v-for="p in pajak" :key="p.jenis">{{ p.jenis }}<template v-if="p.tarif"> ({{ String(p.tarif).replace('.', ',') }}%)</template> : Rp {{ r(p.nilai) }}</div>
          </template>
        </td>
      </tr>
    </table>
    <TtdKolom :gambar="k.pakaiGambar" :kolom="[
      { atas: 'Setuju dibayar,', ...k.ks(tgl) },
      { atas: `Lunas dibayar tgl. ${tanggalPanjang(b.tgl_lunas || tgl)}`, ...k.bendahara(tgl) },
      { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: penerima.jabatan, jabatan: penerima.sub, nama: penerima.nama, nip: penerima.nip, meterai: !honor && total > 5000000 },
    ]" />
  </div>
</template>
