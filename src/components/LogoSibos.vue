<script setup>
// Logo Opsi A "Batang Tumbuh". `transparan` dipakai di atas latar navy (sidebar).
defineProps({ ukuran: { type: Number, default: 40 }, transparan: Boolean })
</script>

<template>
  <svg :width="ukuran" :height="ukuran" viewBox="0 0 64 64" aria-label="Logo SIBOS" role="img">
    <rect width="64" height="64" rx="15" :fill="transparan ? '#FFFFFF' : '#1E3A8A'" :fill-opacity="transparan ? 0.12 : 1" />
    <rect x="11" y="37" width="8" height="15" rx="4" fill="#F5B21B" />
    <rect x="22.5" y="30" width="8" height="22" rx="4" fill="#E8455A" />
    <rect x="34" y="22" width="8" height="30" rx="4" fill="#2BB5A0" />
    <rect x="45.5" y="13" width="8" height="39" rx="4" fill="#4F8BFF" />
    <circle cx="15" cy="28" r="4" fill="#FFFFFF" />
  </svg>
</template>
