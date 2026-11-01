<script setup>
// Tautan publik tanpa login: Bendahara menerbitkan ringkasan angka (bukan data langsung) ke publik/bos.
// Orang tua & masyarakat membuka tautan/QR; angka hanya berubah saat diterbitkan ulang.
import { ref, computed, onMounted, watchEffect } from 'vue'
import QRCode from 'qrcode'
import { pakaiInformasi } from './pakaiInformasi'
import { dataPublik } from '@/utils/informasi'
import { muatSatu, muatPublik, terbitkanPublik, cabutPublik, URL_PUBLIK } from '@/services/catatan'
import { useNotifikasi } from '@/stores/notifikasi'
import { rupiah, persen, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const props = defineProps({ periode: { type: String, required: true } })
const notif = useNotifikasi()
const { kas, r, profil, kepsek } = pakaiInformasi(() => props.periode)
const terbit = ref(null)
const kontak = ref('')
const sibuk = ref(false)
const qr = ref('')
const url = URL_PUBLIK()
onMounted(async () => {
  const [pub, inf] = await Promise.all([muatPublik().catch(() => null), muatSatu('sekolah', 'informasi').catch(() => null)])
  terbit.value = pub; kontak.value = inf?.kontak || ''
})
watchEffect(async () => { qr.value = await QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M' }) })
const calon = computed(() => dataPublik({ r: r.value, tahun: kas.tahun, profil: profil.value, kepsek: kepsek.value, kontak: kontak.value }))

async function terbitkan() {
  if (!confirm(`Terbitkan ringkasan ${calon.value.judul_periode} TA ${kas.tahun} ke halaman publik?\n\nYang tampil hanya angka ringkasan (penerimaan, realisasi per komponen, sisa). Tanpa nama penerima, rekening, atau rincian transaksi.`)) return
  sibuk.value = true
  try { terbit.value = await terbitkanPublik(calon.value); notif.kabari('Halaman publik diperbarui.') } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = false }
}
async function cabut() {
  if (!confirm('Cabut halaman publik? Tautan & QR yang sudah tersebar akan menampilkan "belum diterbitkan".')) return
  try { await cabutPublik(); terbit.value = null; notif.kabari('Halaman publik dicabut.') } catch (e) { notif.kabari(e.message, 'galat') }
}
async function salin() { try { await navigator.clipboard.writeText(url); notif.kabari('Tautan disalin.') } catch { notif.kabari(url) } }
function unduhQr() { const a = document.createElement('a'); a.href = qr.value; a.download = 'QR Informasi Dana BOS.png'; a.click() }
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
    <section class="kartu space-y-4 p-4 sm:p-5" data-tur="publik-status">
      <div class="flex items-center gap-3">
        <span :class="['grid h-11 w-11 place-items-center rounded-xl', terbit ? 'ikon-chip-sukses' : 'ikon-chip-peringatan']"><Ikon :nama="terbit ? 'Globe' : 'EyeOff'" :ukuran="20" /></span>
        <div class="min-w-0 flex-1">
          <h2 class="font-bold">{{ terbit ? 'Halaman publik aktif' : 'Belum diterbitkan' }}</h2>
          <p class="text-xs text-slate-500">{{ terbit ? `TA ${terbit.tahun} · ${terbit.judul_periode} · diterbitkan ${tanggalPanjang(terbit.diterbitkan)}` : 'Tautan sudah bisa dibagikan; isinya muncul setelah diterbitkan.' }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <p class="mb-2 text-sm font-semibold">Yang akan diterbitkan ({{ calon.judul_periode }} TA {{ kas.tahun }})</p>
        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div class="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/30"><p class="text-slate-500">Tersedia</p><p class="angka font-bold text-biru">{{ rupiah(calon.dana_tersedia) }}</p></div>
          <div class="rounded-lg bg-teal-50 p-2 dark:bg-teal-950/30"><p class="text-slate-500">Digunakan</p><p class="angka font-bold text-[#167A6B] dark:text-teal-300">{{ rupiah(calon.realisasi) }}</p></div>
          <div class="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30"><p class="text-slate-500">Sisa</p><p class="angka font-bold text-[#9A6B00] dark:text-amber-300">{{ rupiah(calon.sisa) }}</p></div>
        </div>
        <p class="mt-2 text-xs text-slate-500">{{ calon.komponen.length }} komponen · capaian {{ persen(r.persen, 1) }}. Tanpa nama penerima, rekening, NIP, atau rincian transaksi.</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="tombol-utama" :disabled="sibuk" @click="terbitkan"><Ikon :nama="sibuk ? 'RefreshCw' : 'CloudUpload'" :ukuran="17" :class="sibuk && 'animate-spin'" /> {{ terbit ? 'Terbitkan ulang' : 'Terbitkan' }}</button>
        <a :href="url" target="_blank" rel="noopener" class="tombol-garis"><Ikon nama="ExternalLink" :ukuran="17" class="text-biru" /> Buka halaman</a>
        <button v-if="terbit" class="tombol-garis text-rose-600" @click="cabut"><Ikon nama="EyeOff" :ukuran="17" /> Cabut</button>
      </div>
      <p class="flex gap-2 text-xs text-slate-500"><Ikon nama="Info" :ukuran="14" class="mt-0.5 shrink-0" /> Angka publik tidak berubah sendiri. Terbitkan ulang setiap selesai tahap (atau setiap bulan bila ingin lebih sering).</p>
    </section>

    <section class="kartu flex flex-col items-center gap-3 p-4 text-center sm:p-5" data-tur="publik-qr">
      <img v-if="qr" :src="qr" alt="QR halaman publik" class="h-48 w-48 rounded-xl bg-white p-2" />
      <p class="kode break-all text-xs text-slate-500">{{ url }}</p>
      <div class="flex flex-wrap justify-center gap-2">
        <button class="tombol-garis" @click="salin"><Ikon nama="Copy" :ukuran="16" class="text-biru" /> Salin tautan</button>
        <button class="tombol-garis" @click="unduhQr"><Ikon nama="ImageDown" :ukuran="16" class="text-[#22A08D]" /> Unduh QR</button>
      </div>
      <p class="text-xs text-slate-500">QR ini juga tercetak di poster bila halaman sudah diterbitkan.</p>
    </section>
  </div>
</template>
