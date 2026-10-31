<script setup>
// Cetak RKAS bergaya Kertas Kerja ARKAS: per tahap, per bulan, atau rekap 12 bulan per kegiatan.
// F4 mendatar, Times New Roman, kop sekolah, tanda tangan Kepala Sekolah · Komite · Bendahara.
import { ref, computed, onMounted } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { PEJABAT_AWAL } from '@/config/sekolahAwal'
import { useRkas } from '@/stores/rkas'
import { bangunPohon, barisDatar } from '@/utils/rkasPohon'
import { rupiah, NAMA_BULAN } from '@/utils/format'
import JendelaCetak from '@/components/cetak/JendelaCetak.vue'
import KopSurat from '@/components/cetak/KopSurat.vue'
import BlokTandaTangan from '@/components/cetak/BlokTandaTangan.vue'

const props = defineProps({
  mode: { type: String, default: 'tahap' }, // tahap | bulan | rekap
  bulan: { type: Number, default: 1 },
  tahap: { type: Number, default: 0 }, // 0 = Tahap I & II
})
const emit = defineEmits(['tutup', 'excel'])
const rkas = useRkas()
const profil = ref(null)
const pejabat = ref([])
const pakaiKop = ref(true)
const pakaiTtd = ref(true)

onMounted(async () => {
  profil.value = await muatProfilSekolah()
  pejabat.value = modePratinjau ? PEJABAT_AWAL : await muatPejabat().catch(() => [])
})

const v = computed(() => rkas.versi)
const n = (x) => rupiah(x, { tanpaRp: true })
const nilai = (u) => (props.mode === 'bulan' ? (u.bulan?.[props.bulan - 1] || 0) : props.tahap === 1 ? u.tahap1 : props.tahap === 2 ? u.tahap2 : u.jumlah)
const pohon = computed(() => bangunPohon(rkas.uraian, rkas.nama, { saring: (u) => nilai(u) > 0 }))
const baris = computed(() => barisDatar(pohon.value))
const nilaiInduk = (b) => (props.mode === 'bulan' ? b.bulan[props.bulan - 1] : props.tahap === 1 ? b.tahap1 : props.tahap === 2 ? b.tahap2 : b.jumlah)
const total = computed(() => pohon.value.reduce((s, x) => s + nilaiInduk(x), 0))
const totalT1 = computed(() => pohon.value.reduce((s, x) => s + x.tahap1, 0))
const totalT2 = computed(() => pohon.value.reduce((s, x) => s + x.tahap2, 0))
const volumeBulan = (u) => { const x = nilai(u) / (u.harga || 1); return Number.isInteger(x) ? x : x.toLocaleString('id-ID', { maximumFractionDigits: 2 }) }

const judul = computed(() => props.mode === 'bulan' ? 'Rincian Kertas Kerja RKAS per Bulan'
  : props.mode === 'rekap' ? 'Rekapitulasi Rencana Bulanan RKAS' : 'Kertas Kerja RKAS per Tahap')
const sub = computed(() => props.mode === 'bulan' ? `${NAMA_BULAN[props.bulan - 1]} ${rkas.tahun}`
  : props.mode === 'rekap' ? `Januari – Desember ${rkas.tahun}` : props.tahap ? `Tahap ${props.tahap === 1 ? 'I (Januari – Juni)' : 'II (Juli – Desember)'}` : 'Tahap I dan II')
// Rekap: satu baris per kegiatan (tingkat 3) dengan subtotal SNP
const rekap = computed(() => {
  const out = []
  for (const s of pohon.value) {
    out.push({ jenis: 'snp', kode: s.kode, nama: s.nama, bulan: s.bulan, jumlah: s.jumlah })
    s.anak.forEach((k) => k.anak.forEach((g) => out.push({ jenis: 'keg', kode: g.kode, nama: g.nama, bulan: g.bulan, jumlah: g.jumlah })))
  }
  return out
})
const totalBulan = computed(() => pohon.value.reduce((a, s) => a.map((x, i) => x + s.bulan[i]), Array(12).fill(0)))
const tglDok = computed(() => v.value?.tanggal_dokumen_iso || new Date().toISOString().slice(0, 10))
const ttd = computed(() => ({
  kiri: { label: 'Kepala Sekolah', pejabat: pejabatPada(pejabat.value, 'kepala_sekolah', tglDok.value) },
  tengah: { label: 'Komite Sekolah', pejabat: pejabatPada(pejabat.value, 'ketua_komite', tglDok.value) },
  kanan: { label: 'Bendahara Sekolah', pejabat: pejabatPada(pejabat.value, 'bendahara_bosp', tglDok.value) },
}))
const namaBerkas = computed(() => `RKAS ${rkas.tahun} ${v.value?.nama || ''} - ${judul.value}${props.mode === 'bulan' ? ' ' + NAMA_BULAN[props.bulan - 1] : ''}`)
</script>

<template>
  <JendelaCetak :judul="`${judul} · ${sub}`" :nama-berkas="namaBerkas" orientasi="landscape" excel @tutup="emit('tutup')" @excel="emit('excel')">
    <template #alat>
      <button type="button" @click="pakaiKop = !pakaiKop" :class="['rounded-xl px-3 py-2 text-sm font-semibold', pakaiKop ? 'bg-white text-arang' : 'bg-white/10 text-white/80 hover:text-white']">{{ pakaiKop ? '✓ ' : '' }}Kop</button>
      <button type="button" @click="pakaiTtd = !pakaiTtd" :class="['rounded-xl px-3 py-2 text-sm font-semibold', pakaiTtd ? 'bg-white text-arang' : 'bg-white/10 text-white/80 hover:text-white']">{{ pakaiTtd ? '✓ ' : '' }}Tanda tangan</button>
    </template>
    <div v-if="profil" class="dok-rkas">
      <KopSurat v-if="pakaiKop" :profil="profil" />
      <div class="judul">{{ judul }}</div>
      <div class="sub">Tahun Anggaran {{ rkas.tahun }} · {{ sub }}</div>
      <table class="identitas">
        <tr><td>Nama Sekolah</td><td>:</td><td>{{ profil.nama_arkas || 'UPT SPF SMP NEGERI 19 MAKASSAR' }}</td><td class="kanan">NPSN : {{ profil.npsn || '40307324' }}</td></tr>
        <tr><td>Versi RKAS</td><td>:</td><td>{{ v?.nama }}<template v-if="v?.tanggal_dokumen"> ({{ v.tanggal_dokumen }})</template></td><td class="kanan">Sumber Dana : BOSP Reguler</td></tr>
        <tr><td>Penerimaan</td><td>:</td><td>4.3.1.01. BOSP Reguler — Rp {{ n(v?.pagu || 0) }}</td><td></td></tr>
      </table>

      <!-- Rekap 12 bulan -->
      <table v-if="mode === 'rekap'" class="tabel kecil">
        <thead>
          <tr><th style="width:1.3cm">Kode</th><th>Kegiatan</th><th v-for="b in NAMA_BULAN" :key="b">{{ b.slice(0, 3) }}</th><th>Jumlah</th></tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in rekap" :key="i" :class="b.jenis === 'snp' && 'tebal'">
            <td class="tengah">{{ b.kode }}</td><td>{{ b.nama }}</td>
            <td v-for="(x, m) in b.bulan" :key="m" class="kanan">{{ x ? n(x) : '-' }}</td>
            <td class="kanan">{{ n(b.jumlah) }}</td>
          </tr>
          <tr class="tebal"><td colspan="2" class="tengah">Jumlah</td><td v-for="(x, m) in totalBulan" :key="m" class="kanan">{{ n(x) }}</td><td class="kanan">{{ n(totalBulan.reduce((a, c) => a + c, 0)) }}</td></tr>
        </tbody>
      </table>

      <!-- Per tahap / per bulan -->
      <table v-else class="tabel">
        <thead>
          <tr>
            <th rowspan="2" style="width:0.9cm">No.</th>
            <th rowspan="2" style="width:2.6cm">Kode Rekening</th>
            <th rowspan="2" style="width:1.7cm">Kode Program</th>
            <th rowspan="2">Uraian</th>
            <th colspan="3">Rincian Perhitungan</th>
            <th rowspan="2" style="width:2.4cm">Jumlah</th>
            <th v-if="mode === 'tahap' && !tahap" colspan="2">Tahap</th>
          </tr>
          <tr>
            <th style="width:1.4cm">Volume</th><th style="width:2cm">Satuan</th><th style="width:2.2cm">Tarif Harga</th>
            <template v-if="mode === 'tahap' && !tahap"><th style="width:2.3cm">1</th><th style="width:2.3cm">2</th></template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in baris" :key="i" :class="b.induk && 'tebal'">
            <td class="tengah">{{ i + 1 }}.</td>
            <template v-if="b.induk">
              <td></td><td>{{ b.kode }}.</td><td>{{ b.nama }}</td><td></td><td></td><td></td>
              <td class="kanan">{{ n(nilaiInduk(b)) }}</td>
              <template v-if="mode === 'tahap' && !tahap"><td class="kanan">{{ n(b.tahap1) }}</td><td class="kanan">{{ n(b.tahap2) }}</td></template>
            </template>
            <template v-else>
              <td>{{ b.kode_rekening }}</td><td>{{ b.kode_kegiatan }}.</td><td>{{ b.uraian }}</td>
              <td class="tengah">{{ mode === 'tahap' && !tahap ? b.volume.toLocaleString('id-ID') : volumeBulan(b) }}</td>
              <td>{{ b.satuan }}</td><td class="kanan">{{ n(b.harga) }}</td>
              <td class="kanan">{{ n(nilai(b)) }}</td>
              <template v-if="mode === 'tahap' && !tahap"><td class="kanan">{{ n(b.tahap1) }}</td><td class="kanan">{{ n(b.tahap2) }}</td></template>
            </template>
          </tr>
          <tr v-if="!baris.length"><td :colspan="mode === 'tahap' && !tahap ? 10 : 8" class="tengah">Tidak ada rencana pada periode ini.</td></tr>
          <tr class="tebal">
            <td colspan="7" class="tengah">Jumlah</td>
            <td class="kanan">{{ n(total) }}</td>
            <template v-if="mode === 'tahap' && !tahap"><td class="kanan">{{ n(totalT1) }}</td><td class="kanan">{{ n(totalT2) }}</td></template>
          </tr>
        </tbody>
      </table>
      <BlokTandaTangan v-if="pakaiTtd" v-bind="ttd" :tanggal="tglDok" tempat="Kec. Manggala" />
    </div>
  </JendelaCetak>
</template>

<style scoped>
.dok-rkas { color: #000; }
.judul { margin-top: 0.35cm; text-align: center; font-weight: bold; font-size: 1.1em; text-transform: uppercase; }
.sub { text-align: center; margin-bottom: 0.25cm; }
.identitas { margin-bottom: 0.2cm; font-size: 0.9em; width: 100%; }
.identitas td { padding: 0 4px 0 0; vertical-align: top; }
.identitas td:first-child { width: 3cm; }
.identitas td:nth-child(2) { width: 0.3cm; }
.tabel { width: 100%; border-collapse: collapse; font-size: 0.78em; }
.tabel.kecil { font-size: 0.66em; }
.tabel th, .tabel td { border: 1px solid #000; padding: 1.5px 3px; vertical-align: top; }
.tabel th { background: #eee; text-align: center; font-weight: bold; vertical-align: middle; }
.tabel thead { display: table-header-group; }
.tabel tr { page-break-inside: avoid; break-inside: avoid; }
.tebal td { font-weight: bold; }
.tengah { text-align: center; }
.kanan { text-align: right; white-space: nowrap; }
@media print { .tabel th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
