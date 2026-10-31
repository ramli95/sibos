<script setup>
// Daftar penerimaan honor/transpor (mendatar): golongan, besaran, volume, PPh 21, diterima, tanda tangan zig-zag
import { computed } from 'vue'
import { rupiah, terbilang, tanggalPanjang, NAMA_HARI, dariIso } from '@/utils/format'
import { JENIS_HONOR } from '@/config/belanja'
import { formatNip } from '@/utils/validasi'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
const props = defineProps({ b: Object, k: Object, profil: Object, transpor: Boolean })
const tgl = computed(() => props.b.tgl_lunas || props.b.tgl_kegiatan)
const hari = computed(() => { const d = dariIso(props.b.tgl_kegiatan); return d ? NAMA_HARI[d.getDay()] : '' })
const p = computed(() => props.b.penerima || [])
const adaPph = computed(() => p.value.some((x) => x.pph21))
const j = (f) => p.value.reduce((s, x) => s + (x[f] || 0), 0)
const r = (n) => rupiah(n, { tanpaRp: true })
const judul = computed(() => (props.transpor ? 'Tanda Terima Uang Transpor' : `Daftar Penerimaan ${JENIS_HONOR[props.b.jenis_honor]?.label === 'Narasumber' ? 'Honorarium Narasumber' : 'Honorarium'}`))
const kode = computed(() => props.b.item?.[0] || props.b.uraian_honor || {})
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">{{ judul }}</div>
  <div class="nomor">&nbsp;</div>
  <table class="isian">
    <tr><td class="lb">Kegiatan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
    <tr><td class="lb">Hari/Tanggal</td><td class="tt">:</td><td>{{ hari }}, {{ tanggalPanjang(b.tgl_kegiatan) }}</td></tr>
    <tr><td class="lb">Kode Kegiatan/Rekening</td><td class="tt">:</td><td>{{ kode.kode_kegiatan }} / {{ kode.kode_rekening }}</td></tr>
  </table>
  <table class="tabel zig">
    <thead>
      <tr><th style="width: 0.8cm">No</th><th>Nama / NIP</th><th style="width: 1.6cm">Gol.</th><th style="width: 4cm">Jabatan/Instansi</th><th style="width: 2.5cm">Besaran (Rp)</th><th style="width: 1.9cm">Volume</th>
        <th style="width: 2.7cm">Jumlah (Rp)</th><th v-if="adaPph" style="width: 2.4cm">PPh 21 (Rp)</th><th style="width: 2.7cm">Diterima (Rp)</th><th style="width: 4.6cm">Tanda Tangan</th></tr>
    </thead>
    <tbody>
      <tr v-for="(x, i) in p" :key="i">
        <td class="tengah">{{ i + 1 }}</td><td>{{ x.nama }}<div v-if="x.nip" class="kecil">NIP {{ formatNip(x.nip) }}</div></td><td class="tengah">{{ x.golongan || '-' }}</td>
        <td>{{ [x.jabatan, x.instansi].filter(Boolean).join(', ') }}</td><td class="kanan">{{ r(x.besaran) }}</td><td class="tengah">{{ x.volume }} {{ x.satuan }}</td>
        <td class="kanan">{{ r(x.bruto) }}</td><td v-if="adaPph" class="kanan">{{ r(x.pph21) }}<div class="kecil">{{ String(x.tarif_efektif ?? x.tarif_pph21).replace('.', ',') }}%</div></td><td class="kanan">{{ r(x.diterima) }}</td>
        <td class="ttd-sel"><span :class="i % 2 ? 'ttd-kanan' : 'ttd-kiri'">{{ i + 1 }}.</span></td>
      </tr>
      <tr class="tebal"><td colspan="6" class="kanan">JUMLAH</td><td class="kanan">{{ r(j('bruto')) }}</td><td v-if="adaPph" class="kanan">{{ r(j('pph21')) }}</td><td class="kanan">{{ r(j('diterima')) }}</td><td></td></tr>
    </tbody>
  </table>
  <p class="miring">Terbilang: <b>{{ terbilang(j('bruto')) }}</b></p>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{ atas: 'Mengetahui/Setuju dibayar,', ...k.ks(tgl) }, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Lunas dibayar,', ...k.bendahara(tgl) }]" />
</template>
