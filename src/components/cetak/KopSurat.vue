<script setup>
// Kop surat dinas: logo Pemkot (kiri), baris-baris instansi (tengah), logo Tut Wuri (kanan).
import { computed, ref, onMounted, onUpdated, nextTick } from 'vue'
import { kopBawaan } from '@/config/sekolahAwal'

const props = defineProps({ profil: { type: Object, required: true } })
const kop = computed(() => {
  const k = props.profil.kop?.baris?.length ? props.profil.kop : kopBawaan(props.profil)
  return { ...k, garis: ['tunggal', 'ganda', 'tidak'].includes(k.garis) ? k.garis : 'tunggal', tebal_garis: k.tebal_garis || 0.5 }
})
// Garis bawah: satu garis setebal pilihan (bawaan 0,5 pt). Ganda: garis tebal di atas garis tipis.
const t = computed(() => kop.value.tebal_garis)
const gayaLuar = computed(() => (kop.value.garis === 'ganda' ? { borderBottom: `${t.value}pt solid #000`, paddingBottom: '1.5pt' } : {}))
const gayaDalam = computed(() => {
  if (kop.value.garis === 'tunggal') return { borderBottom: `${t.value}pt solid #000`, paddingBottom: '0.15cm' }
  if (kop.value.garis === 'ganda') return { borderBottom: `${Math.max(t.value * 3, 1.5)}pt solid #000`, paddingBottom: '0.15cm' }
  return {}
})

// Setiap baris kop dibuat satu baris: bila terlalu panjang, hurufnya dikecilkan sedikit demi sedikit (min. 6 pt)
const wadah = ref(null)
const ukuranPas = ref({})
async function paskan() {
  await nextTick()
  const el = wadah.value
  if (!el) return
  el.querySelectorAll('[data-baris]').forEach((d) => {
    const i = +d.dataset.baris
    let pt = kop.value.baris[i]?.ukuran || 11
    d.style.fontSize = pt + 'pt'
    while (d.scrollWidth > d.clientWidth + 1 && pt > 6) { pt -= 0.25; d.style.fontSize = pt + 'pt' }
    ukuranPas.value[i] = pt
  })
}
onMounted(() => { paskan(); document.fonts?.ready.then(paskan) })
onUpdated(paskan)
</script>

<template>
  <div class="kop" :style="{ fontFamily: `'${kop.huruf}', 'Times New Roman', Times, serif`, ...gayaLuar }">
   <div :style="gayaDalam">
    <table>
      <colgroup><col style="width: 2.6cm" /><col /><col style="width: 2.6cm" /></colgroup>
      <tr>
        <td class="logo"><img v-if="profil.logo_pemkot" :src="profil.logo_pemkot" alt="Logo Pemerintah Kota Makassar" crossorigin="anonymous" /></td>
        <td ref="wadah" class="teks">
          <div v-for="(b, i) in kop.baris" :key="i" :data-baris="i" class="baris" :style="{ fontSize: (ukuranPas[i] || b.ukuran) + 'pt', fontWeight: b.tebal ? 700 : 400, fontStyle: b.miring ? 'italic' : 'normal' }">{{ b.teks }}</div>
        </td>
        <td class="logo"><img v-if="profil.logo_tutwuri" :src="profil.logo_tutwuri" alt="Logo Tut Wuri Handayani" crossorigin="anonymous" /></td>
      </tr>
    </table>
   </div>
  </div>
</template>

<style scoped>
.kop { color: #000; }
/* Isi kop dibatasi ±17,5 cm dan diletakkan di tengah: logo tetap dekat dan seimbang dengan teks, juga saat mendatar */
table { width: 100%; max-width: 17.5cm; margin: 0 auto; border-collapse: collapse; table-layout: fixed; }
td { vertical-align: middle; padding: 0; }
.logo { width: 2.6cm; text-align: center; }
.logo img { width: 2.1cm; height: 2.4cm; object-fit: contain; display: block; margin: 0 auto; }
.teks { text-align: center; line-height: 1.18; padding: 0 0.15cm; }
.baris { white-space: nowrap; overflow: hidden; }
</style>
