<script setup>
// Siapkan tahun anggaran baru (Fase 7): salin RKAS versi berlaku sebagai rancangan (draf) TA baru dan
// bawa Standar Harga ke TA baru. Data master (pegawai, rekanan, pejabat, referensi) berlaku lintas tahun.
import { ref, computed, onMounted } from 'vue'
import { useNotifikasi } from '@/stores/notifikasi'
import { useRkas } from '@/stores/rkas'
import { modePratinjau } from '@/services/firebase'
import { muatDaftarVersi, muatUraian, buatDraf, muatStandarHarga, simpanHargaMassal } from '@/services/rkas'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const props = defineProps({ dari: { type: Number, required: true }, ke: { type: Number, required: true } })
const notif = useNotifikasi()
const rkas = useRkas()
const versiDari = ref([])
const versiKe = ref([])
const harga = ref([])
const sibuk = ref('')
async function muat() {
  const [a, b, h] = await Promise.all([muatDaftarVersi(props.dari).catch(() => []), muatDaftarVersi(props.ke).catch(() => []), muatStandarHarga().catch(() => [])])
  versiDari.value = a; versiKe.value = b; harga.value = h
}
onMounted(muat)
const sumber = computed(() => versiDari.value.find((v) => v.berlaku) || versiDari.value.filter((v) => !v.draf).slice(-1)[0] || null)
const hargaDari = computed(() => harga.value.filter((h) => Number(h.tahun) === props.dari && h.aktif !== false))
const hargaKe = computed(() => harga.value.filter((h) => Number(h.tahun) === props.ke))

async function salinRkas() {
  if (!sumber.value) return
  if (!confirm(`Salin RKAS TA ${props.dari} versi "${sumber.value.nama}" menjadi rancangan (draf) TA ${props.ke}?\n\nDraf tidak memengaruhi belanja & laporan. Setelah RKAS TA ${props.ke} disahkan di ARKAS, impor versi resminya atau tandai draf "Sudah disahkan ARKAS".`)) return
  sibuk.value = 'rkas'
  try {
    const uraian = await muatUraian(sumber.value.id)
    await buatDraf(sumber.value, uraian, { jenis: 'murni', nama: `Rancangan TA ${props.ke} (salinan ${sumber.value.nama} TA ${props.dari})`, tahun: props.ke })
    await muat()
    if (rkas.tahun === props.ke) await rkas.muat({ segar: true })
    notif.kabari(`Rancangan RKAS TA ${props.ke} dibuat (${uraian.length} uraian). Buka RKAS → Pergeseran & Perubahan untuk menyesuaikan.`)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
async function bawaHarga() {
  if (!hargaDari.value.length) return
  if (!confirm(`Bawa ${hargaDari.value.length} item Standar Harga TA ${props.dari} ke TA ${props.ke}?\n\nHarga tetap sama dan riwayatnya tersimpan; ubah harga yang naik di menu Standar Harga.`)) return
  sibuk.value = 'harga'
  try {
    if (modePratinjau) { notif.kabari(`Mode Pratinjau: ${hargaDari.value.length} item akan dibawa ke TA ${props.ke}.`); return }
    // sebelum.harga = null → riwayat mendapat baris baru "TA baru, harga sama" (jejak per tahun)
    const r = await simpanHargaMassal(hargaDari.value.map((h) => ({ id: h.id, data: { ...h, tahun: props.ke }, sebelum: { riwayat: h.riwayat || [], harga: null } })), `Membawa Standar Harga TA ${props.dari} ke TA ${props.ke}`)
    await muat()
    notif.kabari(`${r.ubah + r.tambah} item Standar Harga kini berlaku untuk TA ${props.ke}.`)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
</script>

<template>
  <section class="kartu space-y-4 p-5" data-tur="tahun-salin">
    <h3 class="flex items-center gap-2 font-bold"><Ikon nama="CopyPlus" :ukuran="18" class="text-[#E3A414]" /> Siapkan TA {{ props.ke }}</h3>
    <div class="grid gap-3 md:grid-cols-3">
      <div class="flex flex-col rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div class="flex items-center gap-2"><span class="grid h-9 w-9 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="ClipboardList" :ukuran="17" /></span><b class="text-sm">RKAS</b></div>
        <p class="mt-2 flex-1 text-xs text-slate-500">
          <template v-if="sumber">Sumber: {{ sumber.nama }} · {{ rupiah(sumber.total || sumber.pagu) }}.</template><template v-else>TA {{ props.dari }} belum punya RKAS.</template>
          <template v-if="versiKe.length"><br />TA {{ props.ke }} sudah punya {{ versiKe.length }} versi/draf.</template>
        </p>
        <button class="tombol-garis mt-2 text-sm" :disabled="!sumber || !!sibuk" @click="salinRkas"><Ikon :nama="sibuk === 'rkas' ? 'RefreshCw' : 'Copy'" :ukuran="16" :class="['text-biru', sibuk === 'rkas' && 'animate-spin']" /> Salin sebagai draf</button>
      </div>
      <div class="flex flex-col rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div class="flex items-center gap-2"><span class="grid h-9 w-9 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Tags" :ukuran="17" /></span><b class="text-sm">Standar Harga</b></div>
        <p class="mt-2 flex-1 text-xs text-slate-500">{{ hargaDari.length }} item TA {{ props.dari }}<template v-if="hargaKe.length"> · {{ hargaKe.length }} item sudah TA {{ props.ke }}</template>. Harga dibawa apa adanya, riwayat tetap tersimpan.</p>
        <button class="tombol-garis mt-2 text-sm" :disabled="!hargaDari.length || !!sibuk" @click="bawaHarga"><Ikon :nama="sibuk === 'harga' ? 'RefreshCw' : 'CalendarSync'" :ukuran="16" :class="['text-[#22A08D]', sibuk === 'harga' && 'animate-spin']" /> Bawa ke TA {{ props.ke }}</button>
      </div>
      <div class="flex flex-col rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div class="flex items-center gap-2"><span class="grid h-9 w-9 place-items-center rounded-lg ikon-chip"><Ikon nama="Database" :ukuran="17" /></span><b class="text-sm">Data master</b></div>
        <p class="mt-2 flex-1 text-xs text-slate-500">Pegawai, rekanan, penerima luar, pejabat per periode, referensi Juknis & aturan pajak berlaku lintas tahun — <b>tidak perlu disalin</b>. Cukup perbarui yang berubah.</p>
        <span class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><Ikon nama="CircleCheck" :ukuran="15" /> Otomatis ikut</span>
      </div>
    </div>
  </section>
</template>
