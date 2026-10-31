<script setup>
// Kop surat resmi: logo Pemkot (kiri), baris instansi (tengah), logo Tut Wuri (kanan), garis ganda.
defineProps({ profil: { type: Object, required: true } })
</script>

<template>
  <div class="kop">
    <table>
      <tr>
        <td class="logo"><img v-if="profil.logo_pemkot" :src="profil.logo_pemkot" alt="Logo Pemerintah Kota Makassar" /></td>
        <td class="teks">
          <div v-for="(b, i) in profil.kop_baris" :key="i" :class="i === profil.kop_baris.length - 1 ? 'utama' : 'instansi'">{{ b }}</div>
          <div class="alamat">{{ profil.alamat }}{{ profil.telepon ? ` Telp. ${profil.telepon}` : '' }}</div>
          <div class="alamat">NPSN {{ profil.npsn }}{{ profil.email ? ` · Email: ${profil.email}` : '' }}</div>
        </td>
        <td class="logo"><img v-if="profil.logo_tutwuri" :src="profil.logo_tutwuri" alt="Logo Tut Wuri Handayani" /></td>
      </tr>
    </table>
    <div class="garis" />
  </div>
</template>

<style scoped>
.kop { font-family: 'Times New Roman', Times, serif; color: #000; }
table { width: 100%; border-collapse: collapse; }
td { vertical-align: middle; padding: 0; }
.logo { width: 2.1cm; text-align: center; }
.logo img { max-width: 2cm; max-height: 2.3cm; object-fit: contain; }
.teks { text-align: center; line-height: 1.2; padding: 0 0.1cm; white-space: nowrap; }
.instansi { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
.utama { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.02em; }
.alamat { font-size: 10pt; white-space: normal; }
.garis { margin-top: 0.15cm; border-top: 3px solid #000; border-bottom: 1px solid #000; height: 2px; }
</style>
