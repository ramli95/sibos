<script setup>
// Kwitansi kecil (bukti pembayaran ke penyedia) — dipakai bila toko tidak menyiapkan kuitansi sendiri
import { computed } from 'vue'
import { rupiah, terbilang, tanggalPanjang } from '@/utils/format'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: { type: Object, required: true }, k: { type: Object, required: true } })
const tgl = computed(() => props.b.tgl_kwitansi || props.b.tgl_lunas)
const meterai = computed(() => props.b.total > 5_000_000)
</script>

<template>
  <div class="kwitansi" style="padding: 0.35cm 0.5cm">
    <div class="judul polos" style="letter-spacing: 0.3em; margin: 0">KWITANSI</div>
    <div class="nomor">No. {{ b.nomor?.kwitansi_kecil || '……………' }}</div>
    <table class="isian" style="width: 100%">
      <tr><td class="lb" style="width: 3.6cm">Sudah terima dari</td><td class="tt">:</td><td>Bendahara BOSP {{ k.sekolah.nama }}</td></tr>
      <tr><td class="lb">Uang sebanyak</td><td class="tt">:</td><td class="tebal miring">{{ terbilang(b.total) }}</td></tr>
      <tr><td class="lb">Untuk pembayaran</td><td class="tt">:</td><td>{{ b.uraian_pembayaran || `Pembayaran ${b.nama_pekerjaan}` }}</td></tr>
    </table>
    <table style="width: 100%; border-collapse: collapse; margin-top: 0.2cm">
      <tr>
        <td style="vertical-align: bottom; width: 50%"><span class="kotak-ganda tebal" style="font-size: 1.15em; display: inline-block">Rp {{ rupiah(b.total, { tanpaRp: true }) }},-</span></td>
        <td>
          <TtdKolom :kolom="[{ tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Yang menerima,', jabatan: k.penyedia.usaha, nama: k.penyedia.nama, meterai }]" />
        </td>
      </tr>
    </table>
  </div>
</template>
