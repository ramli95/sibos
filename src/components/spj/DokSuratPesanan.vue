<script setup>
// Surat Pesanan (≤ Rp 50 juta) / Surat Perintah Kerja (> Rp 50 juta) — Pasal 25 & Gambar 5
import { computed } from 'vue'
import { tanggalPanjang } from '@/utils/format'
import { BATAS } from '@/config/belanja'
import KopSurat from '@/components/cetak/KopSurat.vue'
import TtdKolom from './TtdKolom.vue'
import TabelItem from './TabelItem.vue'
const props = defineProps({ b: Object, k: Object, profil: Object })
const tgl = computed(() => props.b.tgl_pesanan)
const spk = computed(() => props.b.total > BATAS.spk)
</script>

<template>
  <KopSurat :profil="profil" />
  <div class="judul">{{ spk ? 'Surat Perintah Kerja (SPK)' : 'Surat Pesanan' }}</div>
  <div class="nomor">Nomor: {{ b.nomor?.surat_pesanan || '……………' }}</div>
  <table class="isian">
    <tr><td class="lb">Kepada Yth.</td><td class="tt">:</td><td><b>{{ k.penyedia.usaha }}</b></td></tr>
    <tr><td class="lb">Alamat</td><td class="tt">:</td><td>{{ k.penyedia.alamat || '-' }}</td></tr>
    <tr><td class="lb">Paket Pekerjaan</td><td class="tt">:</td><td>{{ b.nama_pekerjaan }}</td></tr>
  </table>
  <p class="paragraf">Dengan hormat, sehubungan dengan kebutuhan {{ k.sekolah.nama }} yang dibiayai dari Dana BOSP Tahun Anggaran {{ b.tahun }}, bersama ini kami memesan barang/jasa dengan rincian sebagai berikut:</p>
  <TabelItem :item="b.item" :pkp="!!b.rekanan?.status_pkp" />
  <table class="isian">
    <tr><td class="lb">Waktu pelaksanaan</td><td class="tt">:</td><td>{{ b.waktu_serah || `Paling lambat ${tanggalPanjang(b.tgl_terima || tgl)}` }}</td></tr>
    <tr><td class="lb">Lokasi serah terima</td><td class="tt">:</td><td>{{ b.lokasi_serah || k.sekolah.nama }}</td></tr>
  </table>
  <p class="paragraf"><b>Instruksi kepada penyedia:</b> penagihan hanya dapat dilakukan setelah penyelesaian pekerjaan yang diperintahkan dalam {{ spk ? 'SPK' : 'surat pesanan' }} ini dan dibuktikan dengan Surat Hasil Pemeriksaan serta Berita Acara Serah Terima.</p>
  <TtdKolom :gambar="k.pakaiGambar" :kolom="[{ atas: 'Penyedia,', jabatan: k.penyedia.usaha, nama: k.penyedia.nama }, { tanggal: `${k.sekolah.kota}, ${tanggalPanjang(tgl)}`, atas: 'Pelaksana/Pemesan,', ...k.pelaksana(tgl) }]" />
</template>
