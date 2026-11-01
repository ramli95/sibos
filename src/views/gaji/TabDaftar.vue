<script setup>
// Daftar Gaji per bulan: hitungan SIBOS dari Dasar Gaji, dibandingkan dengan Daftar Gaji resmi (bila sudah diimpor).
// Bisa disimpan (dikunci) per bulan, diekspor ke Excel, dan dicetak F4 mendatar.
import { ref, computed } from 'vue'
import { useGaji } from '@/stores/gaji'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanDaftarBulan, lepasDaftarBulan } from '@/services/gaji'
import { KOMPONEN_PENGHASILAN, KOMPONEN_POTONGAN } from '@/config/gaji'
import { jumlahKomponen } from '@/utils/gaji'
import { rupiah, rupiahRingkas, NAMA_BULAN } from '@/utils/format'
import { formatNip } from '@/utils/validasi'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const gaji = useGaji()
const notif = useNotifikasi()
const cari = ref('')
const saring = ref('semua')
const buka = ref(null)
const cetak = ref(false)
const sibuk = ref(false)

const namaBulan = computed(() => { const [y, m] = gaji.periode.split('-'); return `${NAMA_BULAN[Number(m) - 1]} ${y}` })
const adaResmi = computed(() => !!gaji.bulan?.resmi && Object.keys(gaji.bulan.resmi).length > 0)
const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return gaji.baris.filter((b) => (saring.value === 'semua' || b.status === saring.value || (saring.value === 'selisih' && b.selisih?.length) || (saring.value === 'belum' && !b.lengkap))
    && (!q || [b.nama, b.nip, b.golongan].some((v) => String(v || '').toLowerCase().includes(q))))
})
const jml = computed(() => jumlahKomponen(gaji.baris))
const jmlSelisih = computed(() => gaji.baris.filter((b) => b.selisih?.length).length)
const statistik = computed(() => [
  { judul: 'Penerima gaji', nilai: gaji.baris.length, ikon: 'Users', nada: 'gelap', sub: `${gaji.baris.filter((b) => b.status === 'PNS').length} PNS · ${gaji.baris.filter((b) => b.status === 'PPPK').length} PPPK` },
  { judul: 'Gaji kotor', nilai: rupiahRingkas(jml.value.kotor), ikon: 'Banknote', sub: rupiah(jml.value.kotor) },
  { judul: 'Potongan', nilai: rupiahRingkas(jml.value.potongan), ikon: 'Scissors', sub: rupiah(jml.value.potongan) },
  { judul: 'Gaji bersih', nilai: rupiahRingkas(jml.value.bersih), ikon: 'Wallet', nada: 'sukses', sub: rupiah(jml.value.bersih) },
  ...(adaResmi.value ? [{ judul: 'Selisih vs resmi', nilai: jmlSelisih.value, ikon: jmlSelisih.value ? 'TriangleAlert' : 'CircleCheck', nada: jmlSelisih.value ? 'peringatan' : 'sukses', sub: jmlSelisih.value ? 'pegawai berbeda dengan daftar resmi' : 'Semua cocok dengan daftar resmi' }] : []),
])

const tunjangan = (b) => (b.tj_istri || 0) + (b.tj_anak || 0) + (b.tj_fungsional || 0) + (b.tj_beras || 0) + (b.tj_pph || 0)
const iuran = (b) => (b.bpjs || 0) + (b.jkk || 0) + (b.jkm || 0)
const judulKomp = Object.fromEntries([...KOMPONEN_PENGHASILAN, ...KOMPONEN_POTONGAN, { kunci: 'kotor', judul: 'Jumlah kotor' }, { kunci: 'potongan', judul: 'Jumlah potongan' }, { kunci: 'bersih', judul: 'Gaji bersih' }].map((k) => [k.kunci, k.judul]))

async function kunci() {
  if (!confirm(`Simpan Daftar Gaji ${namaBulan.value}? Angka bulan ini tidak berubah lagi walaupun dasar gaji diubah (bisa dibuka kembali).`)) return
  sibuk.value = true
  try {
    const isi = gaji.baris.map(({ resmi, selisih, ...x }) => x)
    await simpanDaftarBulan(gaji.periode, isi); await gaji.muatUlangBulan(); notif.kabari(`Daftar Gaji ${namaBulan.value} disimpan.`)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = false }
}
async function lepas() {
  if (!confirm('Buka kembali? Angka akan dihitung ulang dari Dasar Gaji saat ini.')) return
  sibuk.value = true
  try { await lepasDaftarBulan(gaji.periode); await gaji.muatUlangBulan() } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = false }
}

// Kolom cetak & Excel
const KOLOM = [
  ['gaji_pokok', 'Gaji Pokok'], ['tj_istri', 'Tj. Istri/ Suami'], ['tj_anak', 'Tj. Anak'], ['tj_fungsional', 'Tj. Fungsi- onal/Umum'], ['tj_beras', 'Tj. Beras'], ['tj_pph', 'Tj. PPh'],
  ['bpjs', 'BPJS 4%'], ['jkk', 'JKK'], ['jkm', 'JKM'], ['pembulatan', 'Pembu- latan'], ['kotor', 'Jumlah Kotor'],
  ['pot_pph', 'Pot. PPh'], ['pot_bpjs', 'Pot. BPJS'], ['pot_iwp1', 'IWP 1%'], ['pot_iwp8', 'IWP 8%/ JHT'], ['pot_taperum', 'Tape- rum'], ['pot_jkk', 'Pot. JKK'], ['pot_jkm', 'Pot. JKM'], ['pot_lain', 'Pot. Lain'],
  ['potongan', 'Jumlah Potongan'], ['bersih', 'Gaji Bersih'],
]
const kolomCetak = computed(() => [
  { judul: 'Nama', nilai: (r) => r.nama, lebar: '4cm' },
  { judul: 'NIP', nilai: (r) => r.nip, lebar: '2.9cm', kode: true },
  { judul: 'Gol/ MKG', nilai: (r) => `${r.golongan} / ${r.mkg ?? '-'}`, lebar: '1.4cm', rata: 'tengah' },
  { judul: 'K/A/J', nilai: (r) => `${r.kawin}/${r.anak}/${r.jiwa}`, lebar: '1.1cm', rata: 'tengah' },
  ...KOLOM.map(([k, j]) => ({ judul: j, nilai: (r) => r[k] || 0, uang: true, jumlah: true })),
])
const ringkasan = computed(() => [['Jumlah pegawai', `${gaji.baris.length} orang`], ['Jumlah gaji kotor', jml.value.kotor], ['Jumlah potongan', jml.value.potongan], ['Jumlah gaji bersih', jml.value.bersih]])
async function excel() {
  await eksporExcel({
    judul: `Daftar Gaji ${namaBulan.value}`, namaBerkas: `Daftar Gaji ${gaji.periode}`,
    kolom: [
      { kunci: 'nama', judul: 'Nama', lebar: 30 }, { kunci: 'nip', judul: 'NIP', lebar: 20, jenis: 'teks' }, { kunci: 'status', judul: 'Status', lebar: 8 },
      { kunci: 'golongan', judul: 'Gol', lebar: 7 }, { kunci: 'mkg', judul: 'MKG', lebar: 6, jenis: 'angka' }, { kunci: 'kawin', judul: 'K/TK', lebar: 6 }, { kunci: 'anak', judul: 'Anak', lebar: 6, jenis: 'angka' }, { kunci: 'jiwa', judul: 'Jiwa', lebar: 6, jenis: 'angka' },
      ...KOLOM.map(([k, j]) => ({ kunci: k, judul: j.replace(/- /g, ''), lebar: 13, jenis: 'uang' })),
    ],
    baris: gaji.baris,
  })
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-3" data-tur="gaji-periode">
      <label class="flex items-center gap-2 text-sm font-semibold" for="periode-gaji"><Ikon nama="CalendarDays" :ukuran="18" class="text-biru" /> Bulan</label>
      <input id="periode-gaji" type="month" class="masukan w-auto" :value="gaji.periode" @change="gaji.gantiPeriode($event.target.value)" />
      <span v-if="gaji.terkunci" class="lencana bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="Lock" :ukuran="13" /> Tersimpan</span>
      <span v-else class="lencana bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><Ikon nama="Calculator" :ukuran="13" /> Dihitung langsung</span>
      <span v-if="adaResmi" class="lencana bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Ikon nama="FileCheck" :ukuran="13" /> Ada daftar resmi</span>
      <div class="ml-auto flex flex-wrap gap-2">
        <button v-if="!gaji.terkunci" class="tombol-garis" :disabled="sibuk || !gaji.baris.length" @click="kunci"><Ikon nama="Lock" :ukuran="16" class="text-[#22A08D]" /> Simpan bulan ini</button>
        <button v-else class="tombol-garis" :disabled="sibuk" @click="lepas"><Ikon nama="LockOpen" :ukuran="16" class="text-amber-500" /> Buka kembali</button>
        <button class="tombol-garis" :disabled="!gaji.baris.length" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /> Excel</button>
        <button class="tombol-utama" :disabled="!gaji.baris.length" @click="cetak = true" data-tur="gaji-cetak"><Ikon nama="Printer" :ukuran="16" /> Cetak F4</button>
      </div>
    </div>

    <GridStat :daftar="statistik" ringkas :bisa-klik="false" />

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[12rem] flex-1">
        <Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" class="masukan pl-9" placeholder="Cari nama, NIP, golongan…" aria-label="Cari pegawai" />
      </div>
      <div class="flex gap-1 overflow-x-auto tanpa-penggulir">
        <button v-for="[k, l, ik] in [['semua', 'Semua', 'Users'], ['PNS', 'PNS', 'BadgeCheck'], ['PPPK', 'PPPK', 'Briefcase'], ['selisih', 'Selisih', 'TriangleAlert'], ['belum', 'Belum lengkap', 'CircleHelp']]" :key="k"
                :class="['flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold', saring === k ? 'bg-biru text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']" @click="saring = k">
          <Ikon :nama="ik" :ukuran="15" /> {{ l }}
        </button>
      </div>
    </div>

    <!-- Tabel (desktop) / kartu (HP) -->
    <div class="kartu overflow-hidden">
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
            <tr><th class="p-3">Pegawai</th><th class="p-3">Gol/MKG</th><th class="p-3 text-right">Gaji pokok</th><th class="p-3 text-right">Tunjangan</th><th class="p-3 text-right">Iuran 4%+JKK+JKM</th><th class="p-3 text-right">Kotor</th><th class="p-3 text-right">Potongan</th><th class="p-3 text-right">Bersih</th><th class="p-3" /></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <template v-for="b in hasil" :key="b.id">
              <tr class="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="buka = buka === b.id ? null : b.id">
                <td class="p-3"><p class="font-semibold">{{ b.nama }}</p><p class="kode text-xs text-slate-500">{{ formatNip(b.nip) }} · <span :class="b.status === 'PNS' ? 'text-biru' : 'text-[#22A08D]'">{{ b.status }}</span></p></td>
                <td class="p-3 text-xs">{{ b.golongan }} · {{ b.mkg === '' ? '?' : b.mkg + ' th' }}</td>
                <td class="angka p-3 text-right">{{ rupiah(b.gaji_pokok, { tanpaRp: true }) }}</td>
                <td class="angka p-3 text-right">{{ rupiah(tunjangan(b), { tanpaRp: true }) }}</td>
                <td class="angka p-3 text-right text-slate-500">{{ rupiah(iuran(b), { tanpaRp: true }) }}</td>
                <td class="angka p-3 text-right">{{ rupiah(b.kotor, { tanpaRp: true }) }}</td>
                <td class="angka p-3 text-right text-rose-600 dark:text-rose-400">{{ rupiah(b.potongan, { tanpaRp: true }) }}</td>
                <td class="angka p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">{{ rupiah(b.bersih, { tanpaRp: true }) }}</td>
                <td class="p-3">
                  <span v-if="!b.lengkap" class="lencana bg-slate-100 text-slate-600 dark:bg-slate-800" title="Isi MKG/gaji pokok di Dasar Gaji"><Ikon nama="CircleHelp" :ukuran="13" /> Belum</span>
                  <span v-else-if="b.selisih?.length" class="lencana bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Ikon nama="TriangleAlert" :ukuran="13" /> {{ b.selisih.length }}</span>
                  <span v-else-if="b.resmi" class="lencana bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="CircleCheck" :ukuran="13" /> Cocok</span>
                </td>
              </tr>
              <tr v-if="buka === b.id" class="bg-slate-50/70 dark:bg-slate-900/40">
                <td colspan="9" class="p-4">
                  <div class="grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                    <div v-for="(j, k) in judulKomp" :key="k" class="flex justify-between gap-3 border-b border-dashed border-slate-200 py-1 dark:border-slate-700">
                      <span>{{ k === 'pot_iwp8' ? b.label_iwp8 || j : j }}</span>
                      <span class="angka text-right">{{ rupiah(b[k] || 0, { tanpaRp: true }) }}<template v-if="b.resmi && typeof b.resmi[k] === 'number'"> · <b :class="Math.abs((b[k] || 0) - b.resmi[k]) > 1 ? 'text-amber-600' : 'text-emerald-600'">resmi {{ rupiah(b.resmi[k], { tanpaRp: true }) }}</b></template></span>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <ul class="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
        <li v-for="b in hasil" :key="b.id" class="p-3" @click="buka = buka === b.id ? null : b.id">
          <div class="flex items-start gap-3">
            <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold', b.status === 'PNS' ? 'ikon-chip' : 'ikon-chip-tosca']">{{ b.golongan }}</span>
            <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">{{ b.nama }}</p><p class="kode text-[11px] text-slate-500">{{ formatNip(b.nip) }}</p></div>
            <div class="text-right"><p class="angka text-sm font-bold text-emerald-700 dark:text-emerald-400">{{ rupiah(b.bersih) }}</p>
              <p v-if="b.selisih?.length" class="text-[11px] text-amber-600">{{ b.selisih.length }} selisih</p><p v-else-if="!b.lengkap" class="text-[11px] text-slate-500">belum lengkap</p></div>
          </div>
          <div v-if="buka === b.id" class="mt-2 grid grid-cols-2 gap-x-4 text-[11px]">
            <div v-for="(j, k) in judulKomp" :key="k" class="flex justify-between border-b border-dashed border-slate-200 py-0.5 dark:border-slate-700"><span>{{ j }}</span><span class="angka">{{ rupiah(b[k] || 0, { tanpaRp: true }) }}</span></div>
          </div>
        </li>
      </ul>
      <p v-if="!hasil.length" class="p-8 text-center text-sm text-slate-500">Tidak ada pegawai ASN yang cocok. Isi Data Pegawai (status PNS/PPPK) dan Dasar Gaji terlebih dahulu.</p>
      <div v-if="hasil.length" class="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
        <span>Kotor <b class="angka">{{ rupiah(jml.kotor) }}</b></span><span>Potongan <b class="angka text-rose-600">{{ rupiah(jml.potongan) }}</b></span><span>Bersih <b class="angka text-emerald-700 dark:text-emerald-400">{{ rupiah(jml.bersih) }}</b></span>
      </div>
    </div>

    <CetakBuku v-if="cetak" :judul="`Daftar Gaji Bulan ${namaBulan}`" :nama-berkas="`Daftar Gaji ${gaji.periode}`" :subjudul="'PNS dan PPPK'" :kolom="kolomCetak" :baris="gaji.baris"
               :ringkasan="ringkasan" :tanggal="`${gaji.periode}-01`" kecil excel
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui, Kepala Sekolah' }" :ttd-kanan="{ jabatan: 'bendahara_gaji', label: 'Bendahara Gaji' }"
               @tutup="cetak = false" @excel="excel" />
  </div>
</template>
