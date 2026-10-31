<script setup>
// Kop surat dinas: logo Pemkot (kiri), baris-baris instansi (tengah), logo Tut Wuri (kanan).
import { computed, ref, onMounted, onUpdated, nextTick } from 'vue'
import { kopBawaan } from '@/config/sekolahAwal'

const props = defineProps({ profil: { type: Object, required: true } })
const kop = computed(() => (props.profil.kop?.baris?.length ? props.profil.kop : kopBawaan(props.profil)))

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
  <div :class="['kop', `garis-${kop.garis}`]" :style="{ fontFamily: `'${kop.huruf}', 'Times New Roman', Times, serif` }">
    <table>
      <tr>
        <td class="logo"><img v-if="profil.logo_pemkot" :src="profil.logo_pemkot" alt="Logo Pemerintah Kota Makassar" crossorigin="anonymous" /></td>
        <td ref="wadah" class="teks">
          <div v-for="(b, i) in kop.baris" :key="i" :data-baris="i" class="baris" :style="{ fontSize: (ukuranPas[i] || b.ukuran) + 'pt', fontWeight: b.tebal ? 700 : 400, fontStyle: b.miring ? 'italic' : 'normal' }">{{ b.teks }}</div>
        </td>
        <td class="logo"><img v-if="profil.logo_tutwuri" :src="profil.logo_tutwuri" alt="Logo Tut Wuri Handayani" crossorigin="anonymous" /></td>
      </tr>
    </table>
  </div>
</template>

<style scoped>
.kop { color: #000; }
table { width: 100%; border-collapse: collapse; }
td { vertical-align: middle; padding: 0; }
.logo { width: 2.5cm; text-align: center; }
.logo img { max-width: 2.2cm; max-height: 2.5cm; object-fit: contain; }
.teks { text-align: center; line-height: 1.18; padding: 0 0.1cm; max-width: 0; width: 100%; }
.baris { white-space: nowrap; overflow: hidden; }
.garis-bingkai { border: 1.5px solid #000; padding: 0.2cm 0.25cm; }
.garis-tunggal { border-bottom: 3px solid #000; padding-bottom: 0.15cm; }
.garis-ganda { border-bottom: 4px double #000; padding-bottom: 0.15cm; }
</style>
