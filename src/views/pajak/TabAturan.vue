<script setup>
// Aturan Tarif: tabel tarif & batas pajak yang bisa diubah Bendahara (bukan konstanta di kode),
// lengkap dengan dasar hukum per baris, kategori PPh 21, tabel TER dan tarif Pasal 17.
import { ref, computed, watch } from 'vue'
import { useKas } from '@/stores/kas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanAturanPajak } from '@/services/kas'
import { salinAturan } from '@/utils/pajak'
import { ATURAN_PAJAK_AWAL, CARA_PAJAK, WARNA_PAJAK, KATEGORI_PPH21, KATEGORI_TER, JATUH_TEMPO } from '@/config/pajak'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const kas = useKas()
const auth = useAuth()
const notif = useNotifikasi()
const a = ref(salinAturan(kas.aturan))
watch(() => kas.aturan, (v) => { a.value = salinAturan(v) })
const berubah = computed(() => JSON.stringify(a.value) !== JSON.stringify(kas.aturan))
const menyimpan = ref(false)
const kelompok = ref('PPN')
const JENIS = ['PPN', 'PPh 21', 'PPh 22', 'PPh 23', 'PPh 4(2)', 'PPh Final UMKM']
const tarifTampil = computed(() => a.value.tarif.filter((t) => t.jenis === kelompok.value))

const BATAS = [
  ['ppn_instansi', 'Batas pemungutan PPN instansi pemerintah', 'PPN tidak dipungut bila pembayaran (belum termasuk PPN) ≤ batas & tidak dipecah — PMK 59/2022 Pasal 18', true],
  ['ter_harian_nol', 'TER harian: batas 0%', 'Bruto sehari ≤ batas tidak dipotong — PMK 168/2023', true],
  ['ter_harian_atas', 'TER harian: batas tarif 0,5%', 'Di atasnya 50% × Pasal 17', true],
  ['tarif_ter_harian', 'Tarif TER harian (%)', 'Lampiran PP 58/2023', false],
  ['faktor_tanpa_npwp_21', 'PPh 21 tanpa NPWP/NIK valid (%)', 'UU PPh Pasal 21 ayat (5a): 120% dari tarif', false],
  ['ptkp_tahun', 'PTKP setahun (pembanding rekap)', 'PTKP TK/0 — PMK 101/2016', true],
]
const TER = ['A', 'B', 'C']
const ptkpKategori = (k) => Object.entries(KATEGORI_TER).filter(([, v]) => v === k).map(([p]) => p).join(', ')

function ringkas() {
  const lama = kas.aturan
  const ubah = a.value.tarif.filter((t) => { const l = lama.tarif.find((x) => x.kunci === t.kunci); return !l || l.tarif !== t.tarif || l.tarif_tanpa_npwp !== t.tarif_tanpa_npwp || l.aktif !== t.aktif || l.kata_kunci !== t.kata_kunci })
  const b = BATAS.filter(([k]) => lama.batas[k] !== a.value.batas[k]).map(([, l]) => l)
  return [...ubah.map((t) => `${t.judul} ${t.tarif}%${t.aktif === false ? ' (nonaktif)' : ''}`), ...b].join('; ')
}
async function simpan() {
  menyimpan.value = true
  try {
    await simpanAturanPajak(a.value, ringkas())
    await kas.muat({ segar: true })
    notif.kabari('Aturan tarif tersimpan. Transaksi lama yang berbeda muncul di Pajak Terutang → Perlu diperiksa.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
function bawaan() { if (confirm('Kembalikan semua tarif ke nilai bawaan (dasar hukum terbaru)?')) a.value = { ...salinAturan(ATURAN_PAJAK_AWAL), versi: a.value.versi } }
</script>

<template>
  <div class="space-y-5">
    <section class="kartu space-y-3 p-4 sm:p-5">
      <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="BookMarked" :ukuran="17" /></span> Ringkasan kewajiban Bendahara BOSP</h2>
      <div class="grid gap-2 text-sm sm:grid-cols-2">
        <p class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><b>Memungut & menyetor pajak</b> adalah tugas Bendahara Dana BOS (Permendagri 3/2023 Pasal 10 huruf m). Buku Pembantu Pajak wajib ditutup tiap akhir bulan (Pasal 31).</p>
        <p class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><b>Batas setor</b> PPh potong/pungut: tanggal {{ JATUH_TEMPO.pph_setor }} bulan berikutnya; PPN yang dipungut: akhir bulan berikutnya sebelum SPT Masa PPN (PMK 81/2024). Bukti potong dibuat di Coretax (BP21, BPPU).</p>
        <p class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><b>PPh 22 Dana BOS dikecualikan</b> (PMK 34/2017 jo. PMK 41/PMK.010/2022). Pengadaan lewat SIPLah: pajak dipungut mitra (PMK 58/2022).</p>
        <p class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><b>PPh 23 vs PPh 21:</b> jasa oleh badan → PPh 23; jasa oleh orang pribadi → PPh 21 bukan pegawai. Sewa harta (selain tanah/bangunan) → PPh 23 untuk badan maupun orang pribadi.</p>
      </div>
    </section>

    <section class="kartu space-y-4 p-4 sm:p-5">
      <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="Scale" :ukuran="17" /></span> Batas nilai <span class="text-sm font-normal text-slate-500">· versi aturan {{ a.versi || 1 }}</span></h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="[k, l, ket, uang] in BATAS" :key="k">
          <label class="label" :for="`batas-${k}`">{{ l }}</label>
          <input :id="`batas-${k}`" v-model.number="a.batas[k]" type="number" step="any" class="masukan angka" :disabled="!auth.isAdmin" />
          <p class="mt-1 text-xs text-slate-500">{{ ket }}<template v-if="uang"> · {{ rupiah(a.batas[k]) }}</template></p>
        </div>
      </div>
    </section>

    <section class="kartu p-4 sm:p-5">
      <h2 class="mb-3 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Percent" :ukuran="17" /></span> Tabel tarif</h2>
      <div class="mb-3 flex gap-1 overflow-x-auto tanpa-penggulir">
        <button v-for="j in JENIS" :key="j" type="button" @click="kelompok = j" :class="['shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold', kelompok === j ? WARNA_PAJAK[j] + ' ring-1 ring-current' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800']">{{ j }}</button>
      </div>
      <div class="grid gap-3 lg:grid-cols-2">
        <div v-for="t in tarifTampil" :key="t.kunci" :class="['space-y-2 rounded-xl border p-3', t.aktif === false ? 'border-dashed border-slate-300 opacity-70 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700']">
          <div class="flex items-start gap-2">
            <span :class="['lencana shrink-0', WARNA_PAJAK[t.jenis]]">{{ t.jenis }}</span>
            <div class="min-w-0 flex-1"><p class="text-sm font-semibold">{{ t.judul }}</p><p class="text-xs text-slate-500">{{ CARA_PAJAK[t.cara]?.label }} · KAP {{ t.kap }}-{{ t.kjs }}</p></div>
            <label class="flex shrink-0 items-center gap-1.5 text-xs"><input v-model="t.aktif" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" :disabled="!auth.isAdmin" /> Aktif</label>
          </div>
          <div v-if="t.tarif !== null" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label class="text-[11px] text-slate-500">{{ /bukan pegawai|peserta/.test(t.judul) ? '% bruto' : 'Tarif %' }}<input v-model.number="t.tarif" type="number" step="any" class="masukan angka py-1.5" :disabled="!auth.isAdmin" /></label>
            <label class="text-[11px] text-slate-500">{{ t.kunci === 'pph42_konstruksi' ? 'Tanpa sertifikat %' : 'Tanpa NPWP %' }}<input v-model.number="t.tarif_tanpa_npwp" type="number" step="any" class="masukan angka py-1.5" :disabled="!auth.isAdmin" /></label>
            <label class="text-[11px] text-slate-500">KAP<input v-model="t.kap" class="masukan kode py-1.5" :disabled="!auth.isAdmin" /></label>
            <label class="text-[11px] text-slate-500">KJS<input v-model="t.kjs" class="masukan kode py-1.5" :disabled="!auth.isAdmin" /></label>
          </div>
          <label v-if="t.kata_kunci !== undefined" class="block text-[11px] text-slate-500">Kata kunci nama item (pisahkan koma)<input v-model="t.kata_kunci" class="masukan py-1.5" :disabled="!auth.isAdmin" /></label>
          <p class="text-xs text-slate-600 dark:text-slate-300">{{ t.ket }}</p>
          <p v-if="t.dasar" class="flex gap-1 text-[11px] italic text-slate-500"><Ikon nama="BookMarked" :ukuran="12" class="mt-0.5 shrink-0" /> {{ t.dasar }}</p>
        </div>
      </div>

      <template v-if="kelompok === 'PPh 21'">
        <h3 class="mb-2 mt-5 flex items-center gap-2 text-sm font-bold"><Ikon nama="UsersRound" :ukuran="16" class="text-[#22A08D]" /> Perlakuan per jenis penerima</h3>
        <div class="grid gap-2 sm:grid-cols-2">
          <div v-for="(k, kunci) in KATEGORI_PPH21" :key="kunci" class="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
            <p class="text-sm font-semibold">{{ k.label }}</p><p class="mt-0.5 text-slate-600 dark:text-slate-300">{{ k.ket }}</p><p class="mt-0.5 italic text-slate-500">{{ k.dasar }}</p>
          </div>
        </div>
        <h3 class="mb-2 mt-5 flex items-center gap-2 text-sm font-bold"><Ikon nama="Table2" :ukuran="16" class="text-biru" /> Tabel TER bulanan (Lampiran PP 58/2023)</h3>
        <div class="grid gap-3 lg:grid-cols-3">
          <div v-for="k in TER" :key="k" class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <p class="bg-slate-50 px-3 py-2 text-xs font-bold dark:bg-slate-800/60">Kategori {{ k }} · {{ ptkpKategori(k) }}</p>
            <table class="w-full text-xs"><tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="(r, i) in a.ter_bulanan[k]" :key="i"><td class="px-3 py-1 text-slate-500">s.d.</td><td class="angka px-1 py-1 text-right">{{ rupiah(r.batas, { tanpaRp: true }) }}</td>
                <td class="w-20 px-2 py-1"><input v-model.number="r.tarif" type="number" step="any" class="masukan angka py-0.5 text-right text-xs" :disabled="!auth.isAdmin" :aria-label="`Tarif TER ${k} sampai ${r.batas}`" /></td></tr>
            </tbody></table>
          </div>
        </div>
        <h3 class="mb-2 mt-5 flex items-center gap-2 text-sm font-bold"><Ikon nama="Layers" :ukuran="16" class="text-[#E3A414]" /> Tarif Pasal 17 ayat (1) huruf a UU PPh (UU HPP)</h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div v-for="(l, i) in a.pasal17" :key="i" class="rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
            <p class="text-slate-500">{{ l.sampai == null ? `> ${rupiah(a.pasal17[i - 1]?.sampai)}` : `s.d. ${rupiah(l.sampai)}` }}</p>
            <input v-model.number="l.tarif" type="number" class="masukan angka mt-1 py-1 text-sm" :disabled="!auth.isAdmin" :aria-label="`Tarif lapis ${i + 1}`" />
          </div>
        </div>
      </template>
    </section>

    <p class="text-xs text-slate-500">Rangkuman ini disusun dari peraturan dan penjelasan DJP; bukan nasihat pajak. Bila ragu atas perlakuan suatu transaksi, konfirmasikan ke KPP Pratama setempat, lalu sesuaikan tabel ini.</p>

    <div v-if="auth.isAdmin" class="sticky bottom-20 z-10 lg:bottom-4">
      <div class="kartu flex flex-wrap items-center gap-2 p-3 shadow-lg">
        <p class="min-w-0 flex-1 text-sm text-slate-500">{{ berubah ? 'Ada perubahan belum disimpan.' : 'Tarif sesuai yang tersimpan.' }}</p>
        <button class="tombol-garis" @click="bawaan"><Ikon nama="Undo2" :ukuran="16" class="text-biru" /> Bawaan</button>
        <button class="tombol-utama" :disabled="!berubah || menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan aturan</button>
      </div>
    </div>
  </div>
</template>
