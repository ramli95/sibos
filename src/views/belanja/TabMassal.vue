<script setup>
// Cetak Massal Paket SPJ (Fase 7): pilih beberapa transaksi atau satu bulan, lalu gabungkan semua dokumennya
// menjadi satu berkas cetak / satu PDF F4 (urut tanggal lunas, lalu BNU).
import { ref, computed } from 'vue'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatBahan } from '@/services/bahanBelanja'
import { muatFoto } from '@/services/belanja'
import { NAMA_REKENING } from '@/services/rkas'
import { tanggalRealisasi } from '@/utils/belanja'
import { rupiah, tanggalPendek, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import PaketSpj from '@/components/spj/PaketSpj.vue'

const belanja = useBelanja()
const rkas = useRkas()
const notif = useNotifikasi()
rkas.muat().catch(() => {})

const bulan = ref(new Date().getMonth())
const jenis = ref('semua')
const hanyaLunas = ref(true)
const pilih = ref(new Set())
const bulanDari = (b) => { const t = tanggalRealisasi(b); return t ? Number(t.slice(5, 7)) - 1 : null }
const bnuAwal = (b) => { const x = String(Object.values(b.bnu || {})[0] || '').match(/(\d+)\s*$/); return x ? Number(x[1]) : 1e9 }

const daftar = computed(() => belanja.daftar
  .filter((b) => (bulan.value === -1 || bulanDari(b) === bulan.value) && (!hanyaLunas.value || b.status === 'lunas'))
  .filter((b) => jenis.value === 'semua' || (jenis.value === 'honor' ? b.jenis === 'honor' : jenis.value === 'siplah' ? b.cara === 'siplah' && b.jenis !== 'honor' : b.jenis !== 'honor' && b.cara !== 'siplah'))
  .sort((a, b) => String(tanggalRealisasi(a)).localeCompare(String(tanggalRealisasi(b))) || bnuAwal(a) - bnuAwal(b)))
const terpilih = computed(() => daftar.value.filter((b) => pilih.value.has(b.id)))
const total = computed(() => terpilih.value.reduce((s, b) => s + (b.total || 0), 0))
const semuaTerpilih = computed(() => daftar.value.length > 0 && daftar.value.every((b) => pilih.value.has(b.id)))
function alih(id) { const s = new Set(pilih.value); s.has(id) ? s.delete(id) : s.add(id); pilih.value = s }
function alihSemua() { pilih.value = semuaTerpilih.value ? new Set() : new Set(daftar.value.map((b) => b.id)) }

const paket = ref(null)
const bahan = ref(null)
const memuat = ref(false)
async function buka() {
  if (!terpilih.value.length) return
  if (terpilih.value.length > 40 && !confirm(`${terpilih.value.length} transaksi akan menjadi berkas yang sangat panjang. Unduh PDF bisa lama di HP. Lanjutkan?`)) return
  memuat.value = true
  try {
    bahan.value = await muatBahan()
    const foto = await Promise.all(terpilih.value.map((b) => muatFoto(b.id).catch(() => [])))
    paket.value = terpilih.value.map((b, i) => ({ b, foto: foto[i] }))
  } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
}
const namaRek = (k) => rkas.nama.rekening(k) || NAMA_REKENING[k] || ''
const namaKeg = (k) => rkas.nama.kegiatan(k)
const judulBerkas = computed(() => `${bulan.value === -1 ? `TA ${belanja.tahun}` : `${NAMA_BULAN[bulan.value]} ${belanja.tahun}`} (${terpilih.value.length} transaksi)`)
const STATUS = { lunas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', diterima: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dipesan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', draf: 'bg-slate-100 text-slate-600 dark:bg-slate-800' }
</script>

<template>
  <div class="space-y-4">
    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="massal-saring">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Files" :ukuran="19" /></span>
      <select v-model.number="bulan" class="masukan w-auto py-2" aria-label="Bulan"><option :value="-1">Setahun</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <select v-model="jenis" class="masukan w-auto py-2" aria-label="Jenis transaksi">
        <option value="semua">Semua jenis</option><option value="nonsiplah">Belanja Non-SIPLah</option><option value="siplah">Belanja SIPLah</option><option value="honor">Honor & transpor</option>
      </select>
      <label class="flex items-center gap-2 px-1 text-sm"><input v-model="hanyaLunas" type="checkbox" class="h-4 w-4 accent-[#22A08D]" /> Hanya lunas</label>
      <button class="tombol-garis ml-auto px-3 py-2 text-sm" :disabled="!daftar.length" @click="alihSemua"><Ikon :nama="semuaTerpilih ? 'Square' : 'SquareCheck'" :ukuran="16" class="text-biru" /> {{ semuaTerpilih ? 'Batalkan semua' : 'Pilih semua' }}</button>
    </div>

    <section class="kartu overflow-hidden">
      <p v-if="!daftar.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="SearchX" class="mx-auto mb-2 text-slate-400" />Tidak ada transaksi pada pilihan ini.</p>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="b in daftar" :key="b.id">
          <label class="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <input type="checkbox" :checked="pilih.has(b.id)" class="h-4 w-4 accent-[#1A62E8]" @change="alih(b.id)" />
            <Ikon :nama="b.jenis === 'honor' ? 'HandCoins' : b.cara === 'siplah' ? 'ShoppingBag' : 'ShoppingCart'" :ukuran="17" :class="b.jenis === 'honor' ? 'text-rose-500' : b.cara === 'siplah' ? 'text-[#22A08D]' : 'text-biru'" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{{ b.nama_pekerjaan }}</p>
              <p class="truncate text-xs text-slate-500">{{ tanggalPendek(tanggalRealisasi(b)) }} · {{ Object.values(b.bnu || {}).filter(Boolean).join(', ') || 'BNU belum diisi' }}</p>
            </div>
            <span :class="['lencana hidden sm:inline-flex', STATUS[b.status] || STATUS.draf]">{{ b.status }}</span>
            <span class="angka text-sm font-bold">{{ rupiah(b.total) }}</span>
          </label>
        </li>
      </ul>
    </section>

    <!-- Bilah aksi -->
    <div class="kartu sticky bottom-20 z-10 flex flex-wrap items-center gap-3 p-3 shadow-lg lg:bottom-4">
      <div class="min-w-0 flex-1 text-sm"><b>{{ terpilih.length }}</b> transaksi · <span class="angka font-bold">{{ rupiah(total) }}</span>
        <span class="block text-xs text-slate-500">Satu berkas F4: sampul, kwitansi, dokumen pengadaan, BAST, foto, daftar penerimaan.</span></div>
      <button class="tombol-utama" :disabled="!terpilih.length || memuat" @click="buka"><Ikon :nama="memuat ? 'RefreshCw' : 'Printer'" :ukuran="17" :class="memuat && 'animate-spin'" /> Gabungkan & cetak</button>
    </div>

    <PaketSpj v-if="paket && bahan" :massal="paket" :judul-massal="judulBerkas" :bahan="bahan" :semua="belanja.daftar" :nama-keg="namaKeg" :nama-rek="namaRek" @tutup="paket = null" />
  </div>
</template>
