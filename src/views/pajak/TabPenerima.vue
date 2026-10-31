<script setup>
// Rekap per penerima: honor, transpor, PPh 21 per orang setahun (cek PTKP) dan rekap per rekanan.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { rekapPenerima, rekapRekanan, kolomExcel } from '@/utils/bku'
import { WARNA_PAJAK } from '@/config/pajak'
import { rupiah, rupiahRingkas, tanggalPendek, NAMA_BULAN } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import Laci from '@/components/Laci.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const kas = useKas()
const belanja = useBelanja()
const notif = useNotifikasi()
const mode = ref('orang')
const cari = ref('')
const orang = computed(() => rekapPenerima(belanja.daftar, kas.tahun))
const rekanan = computed(() => rekapRekanan(belanja.daftar, kas.kewajiban, kas.tahun))
const ptkp = computed(() => kas.aturan.batas.ptkp_tahun)
const lewat = (o) => !['PNS', 'PPPK'].includes(String(o.status || '').toUpperCase()) && o.sumber !== 'luar' && o.honor > ptkp.value
const q = computed(() => cari.value.trim().toLowerCase())
const hasilOrang = computed(() => orang.value.filter((o) => !q.value || [o.nama, o.nip].some((v) => String(v || '').toLowerCase().includes(q.value))))
const hasilRekanan = computed(() => rekanan.value.filter((o) => !q.value || [o.nama, o.npwp].some((v) => String(v || '').toLowerCase().includes(q.value))))
const jml = (a, k) => a.reduce((s, x) => s + (x[k] || 0), 0)

const statistik = computed(() => mode.value === 'orang' ? [
  { judul: 'Penerima', nilai: orang.value.length, ikon: 'UsersRound', nada: 'gelap', sub: `Tahun ${kas.tahun}` },
  { judul: 'Total honor', nilai: rupiahRingkas(jml(orang.value, 'honor')), ikon: 'Wallet', nada: 'primer', ringkas: true },
  { judul: 'Total transpor', nilai: rupiahRingkas(jml(orang.value, 'transpor')), ikon: 'Bus', nada: 'primer', ringkas: true },
  { judul: 'PPh 21 dipotong', nilai: rupiahRingkas(jml(orang.value, 'pph21')), ikon: 'ReceiptText', nada: 'primer', ringkas: true, sub: `${orang.value.filter(lewat).length} honorer > PTKP setahun` },
] : [
  { judul: 'Rekanan', nilai: rekanan.value.length, ikon: 'Store', nada: 'gelap', sub: `Tahun ${kas.tahun}` },
  { judul: 'Nilai belanja', nilai: rupiahRingkas(jml(rekanan.value, 'total')), ikon: 'ShoppingCart', nada: 'primer', ringkas: true },
  { judul: 'Transaksi', nilai: jml(rekanan.value, 'kali'), ikon: 'ListChecks', nada: 'primer' },
  { judul: 'Lewat SIPLah', nilai: jml(rekanan.value, 'siplah'), ikon: 'ShoppingBag', nada: 'primer', sub: 'transaksi' },
])

const rinci = ref(null)
const cetak = ref(false)
const kolomOrang = [
  { judul: 'Nama', nilai: (o) => o.nama },
  { judul: 'NIP', nilai: (o) => o.nip || '-', lebar: '3.8cm', kode: true },
  { judul: 'Status/Gol.', nilai: (o) => [o.status, o.golongan].filter(Boolean).join(' ') || (o.sumber === 'luar' ? 'Luar sekolah' : '-'), lebar: '2.6cm' },
  { judul: 'Kali', nilai: (o) => o.kali, lebar: '1.1cm', rata: 'tengah' },
  { judul: 'Honor', nilai: (o) => o.honor, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Transpor', nilai: (o) => o.transpor, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'PPh 21', nilai: (o) => o.pph21, lebar: '2.4cm', uang: true, jumlah: true },
  { judul: 'Diterima', nilai: (o) => o.diterima, lebar: '2.8cm', uang: true, jumlah: true },
]
const kolomRekanan = [
  { judul: 'Rekanan', nilai: (o) => o.nama },
  { judul: 'NPWP', nilai: (o) => o.npwp || '-', lebar: '4cm', kode: true },
  { judul: 'PKP', nilai: (o) => (o.pkp ? 'Ya' : 'Tidak'), lebar: '1.3cm', rata: 'tengah' },
  { judul: 'Transaksi', nilai: (o) => o.kali, lebar: '1.8cm', rata: 'tengah' },
  { judul: 'Nilai belanja', nilai: (o) => o.total, lebar: '3cm', uang: true, jumlah: true },
  ...['PPN', 'PPh 22', 'PPh 23', 'PPh 21'].map((j) => ({ judul: j, nilai: (o) => o.pajak[j] || 0, lebar: '2.4cm', uang: true, jumlah: true })),
]
const kolom = computed(() => (mode.value === 'orang' ? kolomOrang : kolomRekanan))
const baris = computed(() => (mode.value === 'orang' ? hasilOrang.value : hasilRekanan.value))
const judul = computed(() => (mode.value === 'orang' ? 'Rekap Honor, Transpor dan PPh 21 per Penerima' : 'Rekap Belanja dan Pajak per Rekanan'))
/* ---------- Bahan bukti potong (Coretax) per masa ---------- */
const masa = ref(new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1)
const KATEGORI_LABEL = { pns_final: 'PNS final (PP 80/2010)', pegawai_tetap: 'Pegawai tetap (TER)', tidak_tetap_bulanan: 'Tidak tetap bulanan (TER)', tidak_tetap_harian: 'Tidak tetap harian', bukan_pegawai: 'Bukan pegawai', peserta_kegiatan: 'Peserta kegiatan', bukan_objek: 'Bukan objek' }
const bahanBupot = computed(() => {
  const awal = `${kas.tahun}-${String(masa.value + 1).padStart(2, '0')}`
  const hasil = []
  belanja.daftar.filter((b) => b.status === 'lunas' && String(b.tgl_lunas).startsWith(awal)).forEach((b) => {
    if (b.jenis === 'honor') {
      ;(b.penerima || []).filter((p) => p.bruto && (p.kategori_pph21_hasil || '') !== 'bukan_objek').forEach((p) => hasil.push({
        dokumen: 'BP21', tanggal: b.tgl_lunas, nama: p.nama, identitas: p.nip || p.npwp || '', status: [p.status_kepegawaian, p.golongan].filter(Boolean).join(' '),
        perlakuan: KATEGORI_LABEL[p.kategori_pph21_hasil] || '', kegiatan: b.nama_pekerjaan, bruto: p.bruto, tarif: p.tarif_efektif ?? p.tarif_pph21, pajak: p.pph21 || 0,
        kap: p.kategori_pph21_hasil === 'pns_final' ? '411121-402' : '411121-100',
      }))
    } else {
      kas.kewajiban.filter((k) => k.id_belanja === b.id && ['PPh 21', 'PPh 23', 'PPh 4(2)', 'PPh Final UMKM'].includes(k.jenis) && k.cara !== 'mitra').forEach((k) => hasil.push({
        dokumen: k.jenis === 'PPh 21' ? 'BP21' : 'BPPU', tanggal: b.tgl_lunas, nama: b.rekanan?.nama_usaha || '', identitas: b.rekanan?.npwp || '', status: b.rekanan?.bentuk_usaha === 'badan' ? 'Badan' : 'Orang pribadi',
        perlakuan: `${k.jenis}${k.ket ? ' — ' + k.ket : ''}`, kegiatan: b.nama_pekerjaan, bruto: k.dasar, tarif: k.tarif, pajak: k.nilai, kap: `${k.kap}-${k.kjs}`,
      }))
    }
  })
  return hasil.sort((a, b) => a.dokumen.localeCompare(b.dokumen) || String(a.tanggal).localeCompare(String(b.tanggal)))
})
async function excelBupot() {
  try {
    await eksporExcel({ judul: `Bahan Bukti Potong ${NAMA_BULAN[masa.value]} ${kas.tahun}`, namaBerkas: `Bahan Bukti Potong ${NAMA_BULAN[masa.value]} ${kas.tahun}`, baris: bahanBupot.value, kolom: [
      { kunci: 'dokumen', judul: 'Dokumen', lebar: 9 }, { judul: 'Tanggal', lebar: 12, nilai: (r) => tanggalPendek(r.tanggal) }, { kunci: 'nama', judul: 'Nama penerima', lebar: 30 },
      { kunci: 'identitas', judul: 'NIP/NPWP/NIK', lebar: 22 }, { kunci: 'status', judul: 'Status', lebar: 14 }, { kunci: 'perlakuan', judul: 'Perlakuan', lebar: 30 },
      { kunci: 'kegiatan', judul: 'Kegiatan', lebar: 45 }, { kunci: 'bruto', judul: 'Bruto/DPP', lebar: 15, jenis: 'uang' }, { kunci: 'tarif', judul: 'Tarif %', lebar: 9 },
      { kunci: 'pajak', judul: 'Pajak dipotong', lebar: 15, jenis: 'uang' }, { kunci: 'kap', judul: 'KAP-KJS', lebar: 13 },
    ] })
  } catch (e) { notif.kabari(e.message, 'galat') }
}

async function excel() {
  try { await eksporExcel({ judul: `${judul.value} ${kas.tahun}`.slice(0, 80), namaBerkas: `${judul.value} ${kas.tahun}`, baris: baris.value, kolom: kolomExcel(kolom.value) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button v-for="[k, l, i] in [['orang', 'Per orang', 'UsersRound'], ['rekanan', 'Per rekanan', 'Store']]" :key="k" @click="mode = k"
                :class="['flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold', mode === k ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']"><Ikon :nama="i" :ukuran="16" /> {{ l }}</button>
      </div>
      <div class="relative min-w-[12rem] flex-1"><Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari nama, NIP, NPWP…" /></div>
      <button class="tombol-garis" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> <span class="hidden sm:inline">Excel</span></button>
      <button class="tombol-garis" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Cetak</span></button>
    </div>
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <span class="grid h-9 w-9 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="FileCheck" :ukuran="17" /></span>
      <div class="min-w-[12rem] flex-1"><p class="text-sm font-semibold">Bahan bukti potong Coretax (BP21 & BPPU)</p><p class="text-xs text-slate-500">{{ bahanBupot.length }} baris pada masa terpilih — untuk mengisi e-Bupot di Coretax</p></div>
      <select v-model.number="masa" class="masukan w-auto flex-1 py-2 sm:flex-none" aria-label="Masa pajak"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <button class="tombol-garis" :disabled="!bahanBupot.length" @click="excelBupot"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> Excel</button>
    </div>
    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" />

    <div v-if="mode === 'orang'" class="kartu divide-y divide-slate-100 dark:divide-slate-800">
      <button v-for="o in hasilOrang" :key="o.kunci" type="button" class="flex w-full items-start gap-3 p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="rinci = o">
        <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', lewat(o) ? 'ikon-chip-peringatan' : o.sumber === 'luar' ? 'ikon-chip-kuning' : 'ikon-chip-tosca']"><Ikon :nama="o.sumber === 'luar' ? 'Briefcase' : 'UserRound'" :ukuran="18" /></span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold">{{ o.nama }}</p>
          <p class="truncate text-xs text-slate-500">{{ o.nip || (o.sumber === 'luar' ? 'Luar sekolah' : 'Tanpa NIP') }} · {{ o.status || '-' }} {{ o.golongan }} · {{ o.kali }} kali</p>
          <p v-if="lewat(o)" class="mt-0.5 text-xs font-semibold text-amber-600">Honor setahun melewati PTKP {{ rupiah(ptkp) }} — periksa PPh 21</p>
        </div>
        <div class="shrink-0 text-right text-sm"><p class="angka font-bold">{{ rupiah(o.honor + o.transpor) }}</p><p class="angka text-xs text-slate-500">PPh 21 {{ rupiah(o.pph21) }}</p></div>
      </button>
      <p v-if="!hasilOrang.length" class="p-8 text-center text-sm text-slate-500">Belum ada honor/transpor lunas tahun ini.</p>
    </div>
    <div v-else class="kartu divide-y divide-slate-100 dark:divide-slate-800">
      <div v-for="o in hasilRekanan" :key="o.kunci" class="flex items-start gap-3 p-3.5">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ikon-chip"><Ikon nama="Store" :ukuran="18" /></span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold">{{ o.nama }}</p>
          <p class="truncate text-xs text-slate-500">{{ o.npwp || 'Tanpa NPWP' }} · {{ o.pkp ? 'PKP' : 'Non-PKP' }} · {{ o.kali }} transaksi<template v-if="o.siplah"> · {{ o.siplah }} SIPLah</template></p>
          <p class="mt-1 flex flex-wrap gap-1"><span v-for="(v, j) in o.pajak" :key="j" :class="['lencana', WARNA_PAJAK[j]]">{{ j }} {{ rupiahRingkas(v) }}</span></p>
        </div>
        <b class="angka shrink-0 text-sm">{{ rupiah(o.total) }}</b>
      </div>
      <p v-if="!hasilRekanan.length" class="p-8 text-center text-sm text-slate-500">Belum ada belanja lunas tahun ini.</p>
    </div>

    <Laci v-if="rinci" :judul="rinci.nama" :subjudul="`${rinci.nip || 'Tanpa NIP'} · rekap ${kas.tahun} (bahan bukti potong tahunan)`" ikon="UserRound" @tutup="rinci = null">
      <div class="space-y-4 p-5">
        <div class="grid grid-cols-3 gap-2 text-sm">
          <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Honor</p><p class="angka font-bold">{{ rupiah(rinci.honor) }}</p></div>
          <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Transpor</p><p class="angka font-bold">{{ rupiah(rinci.transpor) }}</p></div>
          <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">PPh 21</p><p class="angka font-bold">{{ rupiah(rinci.pph21) }}</p></div>
        </div>
        <div class="grid grid-cols-6 gap-1 sm:grid-cols-12">
          <div v-for="(v, i) in rinci.bulan" :key="i" class="rounded-lg bg-slate-50 p-1.5 text-center dark:bg-slate-800/50"><p class="text-[10px] text-slate-500">{{ NAMA_BULAN[i].slice(0, 3) }}</p><p class="angka text-[11px] font-semibold">{{ v ? rupiahRingkas(v).replace('Rp ', '') : '-' }}</p></div>
        </div>
        <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <RouterLink v-for="(x, i) in rinci.rincian" :key="i" :to="`/belanja/lihat/${x.id_belanja}`" class="block p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <p class="flex justify-between gap-2 text-sm"><span class="truncate">{{ x.kegiatan }}</span><b class="angka shrink-0">{{ rupiah(x.bruto) }}</b></p>
            <p class="text-xs text-slate-500">{{ tanggalPendek(x.tanggal) }} · {{ x.jenis }} · PPh 21 {{ rupiah(x.pph21) }}<template v-if="x.alasan"> ({{ x.alasan }})</template></p>
          </RouterLink>
        </div>
      </div>
    </Laci>

    <CetakBuku v-if="cetak" :judul="judul" :subjudul="`Tahun Anggaran ${kas.tahun}`" :kolom="kolom" :baris="baris" :tanggal="`${kas.tahun}-12-31`" excel @excel="excel" @tutup="cetak = false" />
  </div>
</template>
