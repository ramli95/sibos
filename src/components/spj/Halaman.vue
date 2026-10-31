<script setup>
// Satu lembar dalam paket cetak. mendatar = kertas F4 landscape.
defineProps({ mendatar: Boolean, judul: String })
</script>

<template>
  <section :class="['halaman', mendatar && 'mendatar']" :data-arah="mendatar ? 'landscape' : 'portrait'" :data-judul="judul">
    <div class="isi-halaman spj"><slot /></div>
  </section>
</template>
