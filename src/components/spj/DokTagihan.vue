<script setup>
// Proforma Invoice & Invoice — diterbitkan atas nama penyedia
import { computed } from 'vue'
import { tanggalPanjang } from '@/utils/format'
import KepalaPenyedia from './KepalaPenyedia.vue'
import TabelItem from './TabelItem.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, jenis: { type: String, default: 'invoice' } })
const proforma = computed(() => props.jenis === 'proforma')
const tgl = computed(() => (proforma.value ? props.b.tgl_proforma || props.b.tgl_terima : props.b.tgl_invoice || props.b.tgl_lunas))
const nomor = computed(() => props.b.nomor?.[props.jenis] || '……………')
const r = computed(() => props.b.rekanan || {})
</script>

<template>
  <KepalaPenyedia :k="k" />
  <div class="judul polos" style="font-size: 1.4em">{{ proforma ? 'Proforma Invoice' : 'Invoice' }}</div>
  <table style="width: 100%; border-collapse: collapse; margin: 0.25cm 0">
    <tr>
      <td style="vertical-align: top; width: 55%">
        Kepada Yth.<br /><b>Kepala {{ k.sekolah.nama }}</b><br />{{ k.sekolah.alamat }}
      </td>
      <td style="vertical-align: top">
        <table class="isian" style="margin-left: auto">
          <tr><td class="lb">Nomor</td><td class="tt">:</td><td class="tebal">{{ nomor }}</td></tr>
          <tr><td class="lb">Tanggal</td><td class="tt">:</td><td>{{ tanggalPanjang(tgl) }}</td></tr>
          <tr v-if="b.nomor?.surat_pesanan"><td class="lb">No. Pesanan</td><td class="tt">:</td><td>{{ b.nomor.surat_pesanan }}</td></tr>
        </table>
      </td>
    </tr>
  </table>
  <p v-if="b.nama_pekerjaan" style="margin-bottom: 0.1cm">Perihal: <b>{{ b.nama_pekerjaan }}</b></p>
  <TabelItem :item="b.item" :pkp="!!r.status_pkp" :spesifikasi="false" />
  <p class="paragraf" v-if="r.bank">Pembayaran mohon ditransfer ke rekening <b>{{ r.bank }} {{ r.no_rekening }}</b> a.n. {{ r.atas_nama_rekening || r.pemilik || r.nama_usaha }}.</p>
  <p class="paragraf" v-if="proforma">Proforma invoice ini merupakan tagihan sementara; invoice final diterbitkan setelah serah terima barang/jasa.</p>
  <p class="paragraf" v-else>Invoice ini sah sebagai tagihan atas pekerjaan yang telah diserahterimakan sesuai Berita Acara Serah Terima{{ b.nomor?.bast ? ` Nomor ${b.nomor.bast}` : '' }}.</p>
  <TtdKolom :kolom="[{}, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Hormat kami,', jabatan: k.penyedia.jabatan, nama: k.penyedia.nama }]" />
</template>
