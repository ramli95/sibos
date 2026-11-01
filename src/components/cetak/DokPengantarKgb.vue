<script setup>
// Surat pengantar usulan Kenaikan Gaji Berkala (KGB) dari Kepala Sekolah ke Dinas Pendidikan, beserta lampiran
// "Daftar Nama Guru Kenaikan Gaji Berkala" (format sheet KGB Jurnal Dana BOS). F4, Times New Roman.
import { computed } from 'vue'
import KopSurat from './KopSurat.vue'
import BlokTandaTangan from './BlokTandaTangan.vue'
import { formatNip } from '@/utils/validasi'
import { rupiah, tanggalPanjang, kata } from '@/utils/format'

const props = defineProps({
  profil: { type: Object, required: true },
  u: { type: Object, required: true }, // { nomor, tanggal, tujuan, tujuan_cq, tempat_tujuan, pegawai: [...], lampiran_berkas: [...] }
  kepsek: Object,
})
const unit = computed(() => (props.profil.nama_arkas || 'UPT SPF SMP Negeri 19 Makassar').replace(/^UPT SPF SMP NEGERI/i, 'UPT SPF SMP Negeri').replace(/MAKASSAR$/i, 'Makassar'))
const jumlah = computed(() => props.u.pegawai?.length || 0)
const rp = (n) => (n ? rupiah(n, { tanpaRp: true }) : '-')
</script>

<template>
  <div class="kgb">
    <KopSurat :profil="props.profil" />
    <table class="kepala">
      <tr>
        <td>
          <table class="id">
            <tr><td class="l">Nomor</td><td class="t">:</td><td>{{ props.u.nomor || '……………………' }}</td></tr>
            <tr><td class="l">Lampiran</td><td class="t">:</td><td>1 (satu) berkas</td></tr>
            <tr><td class="l">Perihal</td><td class="t">:</td><td class="tebal">Usulan Kenaikan Gaji Berkala</td></tr>
          </table>
        </td>
        <td class="kanan-atas">Makassar, {{ tanggalPanjang(props.u.tanggal) }}</td>
      </tr>
    </table>
    <div class="tujuan">
      <div>Yth. {{ props.u.tujuan || 'Kepala Dinas Pendidikan Kota Makassar' }}</div>
      <div v-if="props.u.tujuan_cq">c.q. {{ props.u.tujuan_cq }}</div>
      <div>di {{ props.u.tempat_tujuan || 'Makassar' }}</div>
    </div>
    <p class="isi">Dengan hormat, bersama ini kami sampaikan usulan Kenaikan Gaji Berkala (KGB) bagi {{ jumlah }} ({{ kata(jumlah).toLowerCase() }}) orang pegawai {{ unit }} yang telah memenuhi masa kerja dan syarat-syarat lainnya, sebagaimana daftar terlampir, untuk dapat diterbitkan Surat Pemberitahuan Kenaikan Gaji Berkala.</p>
    <p class="isi">Sebagai bahan pertimbangan, bersama ini kami lampirkan:</p>
    <ol class="berkas">
      <li v-for="(b, i) in props.u.lampiran_berkas" :key="i">{{ b }}</li>
    </ol>
    <p class="isi">Demikian usulan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.</p>
    <BlokTandaTangan :kanan="{ label: 'Kepala Sekolah,', pejabat: props.kepsek }" :tanggal="props.u.tanggal" />

    <div class="lampiran">
      <div class="lampiran-kepala">Lampiran Surat Nomor: {{ props.u.nomor || '……………' }}<br />Tanggal: {{ tanggalPanjang(props.u.tanggal) }}</div>
      <div class="judul">DAFTAR NAMA PEGAWAI<br />KENAIKAN GAJI BERKALA (KGB)<br />{{ unit.toUpperCase() }}</div>
      <table class="tabel">
        <thead>
          <tr><th style="width: 0.8cm">No.</th><th>Nama / NIP</th><th style="width: 0.9cm">L/P</th><th style="width: 1.3cm">Gol</th><th style="width: 2.4cm">Gaji Pokok Lama</th><th style="width: 2.4cm">Gaji Pokok Baru</th><th style="width: 1.6cm">MKG Baru</th><th style="width: 2.6cm">TMT KGB</th></tr>
        </thead>
        <tbody>
          <tr v-for="(x, i) in props.u.pegawai" :key="x.id_pegawai || i">
            <td class="tengah">{{ i + 1 }}</td>
            <td><b>{{ x.nama }}</b><br /><span class="kecil">NIP {{ formatNip(x.nip) }}</span></td>
            <td class="tengah">{{ x.jenis_kelamin || '-' }}</td>
            <td class="tengah">{{ x.golongan }}</td>
            <td class="kanan">{{ rp(x.gaji_pokok_lama) }}</td>
            <td class="kanan">{{ rp(x.gaji_pokok_baru) }}</td>
            <td class="tengah">{{ x.mkg_baru != null ? `${x.mkg_baru} Thn` : '-' }}</td>
            <td class="tengah">{{ tanggalPanjang(x.jatuh_tempo) }}</td>
          </tr>
        </tbody>
      </table>
      <BlokTandaTangan :kanan="{ label: 'Kepala Sekolah,', pejabat: props.kepsek }" :tanggal="props.u.tanggal" />
    </div>
  </div>
</template>

<style scoped>
.kgb { color: #000; text-align: justify; }
.kgb :deep(table) { text-align: left; }
.kepala { width: 100%; border-collapse: collapse; margin-top: 0.3cm; }
.kepala > tr > td, .kepala td { vertical-align: top; }
.kanan-atas { text-align: right; white-space: nowrap; }
.id { border-collapse: collapse; }
.id td { padding: 0 4px 0 0; vertical-align: top; }
.id .l { width: 2.2cm; } .id .t { width: 0.3cm; }
.tujuan { margin: 0.35cm 0 0.3cm 2.5cm; }
.isi { text-indent: 1.25cm; margin: 0.15cm 0; }
.berkas { margin: 0.05cm 0 0.15cm 1.6cm; padding-left: 0.5cm; list-style: decimal; }
.lampiran { break-before: page; page-break-before: always; margin-top: 0.8cm; }
.lampiran-kepala { margin-left: 50%; font-size: 0.9em; margin-bottom: 0.3cm; text-align: left; }
.judul { text-align: center; font-weight: bold; margin-bottom: 0.3cm; }
.tabel { width: 100%; border-collapse: collapse; font-size: 0.88em; text-align: left; }
.tabel th, .tabel td { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; }
.tabel th { background: #f1f1f1; text-align: center; }
.tabel tr { page-break-inside: avoid; break-inside: avoid; }
.tengah { text-align: center; } .kanan { text-align: right; white-space: nowrap; } .tebal { font-weight: bold; }
.kecil { font-size: 0.85em; }
@media print { .tabel th { background: #f1f1f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
