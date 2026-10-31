<script setup>
// Kepala surat penyedia (untuk proforma & invoice yang diterbitkan toko)
defineProps({ k: { type: Object, required: true } })
</script>

<template>
  <div style="border-bottom: 2px solid #000; padding-bottom: 0.15cm; margin-bottom: 0.2cm">
    <div class="tebal" style="font-size: 1.35em; text-transform: uppercase">{{ k.penyedia.usaha }}</div>
    <div class="kecil">{{ k.penyedia.alamat }}</div>
    <div class="kecil"><template v-if="k.penyedia.telepon">Telp. {{ k.penyedia.telepon }}</template><template v-if="k.penyedia.npwp"> · NPWP {{ k.penyedia.npwp }}</template></div>
  </div>
</template>
