<script setup>
// Laporan lain (Fase 7): daftar transaksi Non-SIPLah, rekap per kategori belanja dipisah SIPLah/Non-SIPLah,
// matriks SNP × 12 komponen (anggaran atau realisasi), dan SK Tim BOS (Permendikdasmen 8/2026 Pasal 65).
import { ref, reactive, computed, onMounted } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { PERIODE_BUKU } from '@/config/laporan'
import { KOMPONEN_ARKAS, NAMA_KODE_ARKAS, WARNA_SNP } from '@/config/kodeArkas'
import { PEJABAT_CONTOH } from '@/config/sekolahAwal'
import { modePratinjau } from '@/services/firebase'
import { muatPegawai } from '@/services/master'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { muatSatu, simpanSatu } from '@/services/catatan'
import { tanggalRealisasi } from '@/utils/belanja'
import { itemLunas, akhirBulanIso } from '@/utils/laporan'
import { kolomExcel } from '@/utils/bku'
import { rupiah, rupiahRingkas, tanggalPendek, keIso } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokSkTimBos from '@/components/cetak/DokSkTimBos.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const auth = useAuth()
const notif = useNotifikasi()

const kunciP = ref('tahun')
const per = computed(() => PERIODE_BUKU.find((p) => p[0] === kunciP.value))
const dalam = (iso) => { const m = iso ? Number(iso.slice(5, 7)) - 1 : -1; return m >= per.value[2] && m <= per.value[3] }
const tglAkhir = computed(() => akhirBulanIso(kas.tahun, per.value[3]))
const sub = computed(() => `${per.value[1]} Tahun Anggaran ${kas.tahun}`)
const cetak = ref('')

/* ---------- 1. Non-SIPLah ---------- */
const nonSiplah = computed(() => belanja.daftar
  .filter((b) => b.jenis !== 'honor' && b.cara !== 'siplah' && dalam(tanggalRealisasi(b)))
  .map((b) => ({ id: b.id, tanggal: tanggalRealisasi(b), pekerjaan: b.nama_pekerjaan, penyedia: b.rekanan?.nama_usaha || '', npwp: b.rekanan?.npwp || '',
    sp: b.nomor?.surat_pesanan || '', bast: b.nomor?.bast || '', bnu: Object.values(b.bnu || {}).filter(Boolean).join(', '), status: b.status, nilai: b.total || 0,
    pajak: (b.pajak || []).filter((p) => p.cara !== 'luar').reduce((s, p) => s + (p.nilai || 0), 0) }))
  .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal))))
const kolomNon = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2cm', rata: 'tengah' },
  { judul: 'Nama Pekerjaan', nilai: (r) => r.pekerjaan },
  { judul: 'Penyedia', nilai: (r) => r.penyedia, lebar: '4cm' },
  { judul: 'NPWP', nilai: (r) => r.npwp, lebar: '3.4cm', kode: true },
  { judul: 'No. Surat Pesanan', nilai: (r) => r.sp, lebar: '3.6cm' },
  { judul: 'BNU', nilai: (r) => r.bnu, lebar: '2cm', rata: 'tengah' },
  { judul: 'Status', nilai: (r) => r.status, lebar: '1.7cm', rata: 'tengah' },
  { judul: 'Nilai', nilai: (r) => r.nilai, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Pajak', nilai: (r) => r.pajak, lebar: '2.4cm', uang: true, jumlah: true },
]

/* ---------- 2. Rekap kategori SIPLah / Non-SIPLah ---------- */
const KATEGORI = [['operasional', 'Belanja Barang dan Jasa (Operasional)'], ['alat_mesin', 'Belanja Modal Peralatan dan Mesin'], ['aset_lain', 'Belanja Modal Aset Tetap Lainnya']]
const rekapKat = computed(() => {
  const r = Object.fromEntries(KATEGORI.map(([k, l]) => [k, { kategori: l, siplah: 0, non: 0, honor: 0, ns: new Set(), nn: new Set() }]))
  const peta = new Map(belanja.daftar.map((b) => [b.id, b]))
  itemLunas(belanja.daftar).filter((i) => i.bulan >= per.value[2] && i.bulan <= per.value[3]).forEach((i) => {
    const b = peta.get(i.id_belanja)
    const g = r[i.kategori] || r.operasional
    if (b.jenis === 'honor') g.honor += i.jumlah || 0
    else if (b.cara === 'siplah') { g.siplah += i.jumlah || 0; g.ns.add(b.id) } else { g.non += i.jumlah || 0; g.nn.add(b.id) }
  })
  return Object.values(r).map((g, i) => ({ id: i, ...g, tx_siplah: g.ns.size, tx_non: g.nn.size, jumlah: g.siplah + g.non + g.honor }))
})
const kolomKat = [
  { judul: 'Kategori Belanja', nilai: (r) => r.kategori },
  { judul: 'SIPLah', nilai: (r) => r.siplah, lebar: '3.2cm', uang: true, jumlah: true },
  { judul: 'Trx', nilai: (r) => r.tx_siplah, lebar: '1.2cm', rata: 'tengah' },
  { judul: 'Non-SIPLah', nilai: (r) => r.non, lebar: '3.2cm', uang: true, jumlah: true },
  { judul: 'Trx', nilai: (r) => r.tx_non, lebar: '1.2cm', rata: 'tengah' },
  { judul: 'Honor & Transpor', nilai: (r) => r.honor, lebar: '3.2cm', uang: true, jumlah: true },
  { judul: 'Jumlah', nilai: (r) => r.jumlah, lebar: '3.4cm', uang: true, jumlah: true },
]
const totKat = computed(() => ['siplah', 'non', 'honor', 'jumlah'].reduce((o, k) => ({ ...o, [k]: rekapKat.value.reduce((s, r) => s + r[k], 0) }), {}))

/* ---------- 3. Matriks SNP × 12 komponen ---------- */
const isiMatriks = ref('anggaran')
const KOMP = Object.keys(KOMPONEN_ARKAS)
const matriks = computed(() => {
  const m = {}
  const tambah = (snp, komp, n) => { m[snp] ??= {}; m[snp][komp] = (m[snp][komp] || 0) + n }
  if (isiMatriks.value === 'anggaran') rkas.uraian.forEach((u) => tambah(u.snp, u.komponen, u.jumlah || 0))
  else itemLunas(belanja.daftar).filter((i) => i.bulan >= per.value[2] && i.bulan <= per.value[3]).forEach((i) => { const s = String(i.kode_kegiatan || '').split('.'); tambah(s[0] || '-', s[1] || '-', i.jumlah || 0) })
  return Object.keys(m).sort().map((snp) => ({ id: snp, snp, nama: rkas.nama.kegiatan?.(snp) || NAMA_KODE_ARKAS[snp] || `SNP ${snp}`, ...Object.fromEntries(KOMP.map((k) => [k, m[snp][k] || 0])), total: KOMP.reduce((s, k) => s + (m[snp][k] || 0), 0) }))
})
const kolomMatriks = computed(() => [
  { judul: 'SNP', nilai: (r) => `${r.snp} ${r.nama}`, lebar: '4.6cm' },
  ...KOMP.map((k) => ({ judul: `${KOMPONEN_ARKAS[k].huruf}`, nilai: (r) => r[k], lebar: '1.75cm', uang: true, jumlah: true })),
  { judul: 'Jumlah', nilai: (r) => r.total, lebar: '2.3cm', uang: true, jumlah: true },
])
const totKomp = computed(() => Object.fromEntries(KOMP.map((k) => [k, matriks.value.reduce((s, r) => s + r[k], 0)])))
const totMatriks = computed(() => matriks.value.reduce((s, r) => s + r.total, 0))
const sel = (n, maks) => (n ? `rgba(26, 98, 232, ${0.08 + 0.5 * (n / (maks || 1))})` : 'transparent')
const maksSel = computed(() => Math.max(1, ...matriks.value.flatMap((r) => KOMP.map((k) => r[k]))))

/* ---------- 4. SK Tim BOS ---------- */
const pegawai = ref([])
const pejabat = ref([])
const sk = reactive({ nomor: '', tanggal: `${kas.tahun}-01-02`, tahun: kas.tahun, kota: 'Makassar', anggota: [], tembusan: ['Kepala Dinas Pendidikan Kota Makassar', 'Komite Sekolah', 'Yang bersangkutan untuk dilaksanakan'] })
const kepsekSk = computed(() => pejabatPada(pejabat.value, 'kepala_sekolah', sk.tanggal))
function susunAwal() {
  const nm = (p) => (p ? p.nama + (p.gelar ? ', ' + p.gelar : '') : '')
  const bend = pejabatPada(pejabat.value, 'bendahara_bosp', sk.tanggal)
  sk.anggota = [
    { peran: 'Penanggung Jawab', nama: nm(kepsekSk.value), nip: kepsekSk.value?.nip || '', unsur: 'Kepala Sekolah' },
    { peran: 'Bendahara', nama: nm(bend), nip: bend?.nip || '', unsur: 'Bendahara Dana BOSP' },
    { peran: 'Anggota', nama: '', nip: '', unsur: 'Unsur guru' },
    { peran: 'Anggota', nama: '', nip: '', unsur: 'Unsur Komite Sekolah' },
    { peran: 'Anggota', nama: '', nip: '', unsur: 'Unsur orang tua/wali murid (selain Komite)' },
  ]
}
onMounted(async () => {
  const [pg, pj, simpan] = await Promise.all([
    modePratinjau ? import('@/services/contohBelanja').then((m) => m.PEGAWAI) : muatPegawai({ denganRahasia: false }).catch(() => []),
    modePratinjau ? PEJABAT_CONTOH : muatPejabat().catch(() => []),
    muatSatu('sekolah', `sk_tim_bos_${kas.tahun}`).catch(() => null),
  ])
  pegawai.value = pg.filter((p) => p.aktif !== false); pejabat.value = pj
  if (simpan) Object.assign(sk, simpan); else susunAwal()
})
function pilihPegawai(a, id) { const p = pegawai.value.find((x) => x.id === id); if (p) Object.assign(a, { nama: [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? ', ' + p.gelar : ''), nip: p.nip || '' }) }
async function simpanSk() {
  try { const { id, ...isi } = { ...sk }; await simpanSatu('sekolah', `sk_tim_bos_${sk.tahun}`, JSON.parse(JSON.stringify(isi)), `Menyimpan SK Tim BOS TA ${sk.tahun}`); notif.kabari('SK Tim BOS disimpan.') } catch (e) { notif.kabari(e.message, 'galat') }
}

async function excel(jenis) {
  try {
    if (jenis === 'non') await eksporExcel({ judul: `Daftar Transaksi Non-SIPLah ${sub.value}`, namaBerkas: `Transaksi Non-SIPLah ${sub.value}`, baris: nonSiplah.value, kolom: kolomExcel(kolomNon) })
    if (jenis === 'kat') await eksporExcel({ judul: `Rekap Kategori Belanja SIPLah & Non-SIPLah ${sub.value}`, namaBerkas: `Rekap Kategori SIPLah ${sub.value}`, baris: rekapKat.value, kolom: kolomExcel(kolomKat) })
    if (jenis === 'matriks') await eksporExcel({ judul: `Matriks SNP x Komponen (${isiMatriks.value}) ${isiMatriks.value === 'anggaran' ? `TA ${kas.tahun}` : sub.value}`, namaBerkas: `Matriks SNP Komponen ${kas.tahun}`, baris: matriks.value,
      kolom: kolomMatriks.value.map((k, i) => ({ judul: i === 0 ? 'SNP' : i <= KOMP.length ? `${KOMPONEN_ARKAS[KOMP[i - 1]].huruf}. ${KOMPONEN_ARKAS[KOMP[i - 1]].nama}` : 'Jumlah', lebar: i === 0 ? 40 : 16, nilai: k.nilai, jenis: i === 0 ? 'teks' : 'uang' })) })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-3">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="CalendarRange" :ukuran="19" /></span>
      <select v-model="kunciP" class="masukan w-auto py-2" aria-label="Periode"><option v-for="p in PERIODE_BUKU" :key="p[0]" :value="p[0]">{{ p[1] }}</option></select>
      <span class="text-xs text-slate-500">Berlaku untuk daftar Non-SIPLah, rekap kategori, dan matriks realisasi.</span>
    </div>

    <!-- Kartu dokumen -->
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tur="rekaplain-dokumen">
      <div class="kartu flex flex-col p-4">
        <div class="flex items-start gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ikon-chip"><Ikon nama="ShoppingCart" :ukuran="21" /></span>
          <div><h3 class="font-bold leading-tight">Transaksi Non-SIPLah</h3><p class="mt-1 text-xs text-slate-500">{{ nonSiplah.length }} transaksi · {{ rupiahRingkas(nonSiplah.reduce((s, r) => s + r.nilai, 0)) }}</p></div></div>
        <div class="mt-auto flex gap-2 pt-3"><button class="tombol-garis flex-1" @click="cetak = 'non'"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button><button class="tombol-garis" aria-label="Excel Non-SIPLah" @click="excel('non')"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /></button></div>
      </div>
      <div class="kartu flex flex-col p-4">
        <div class="flex items-start gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="Split" :ukuran="21" /></span>
          <div><h3 class="font-bold leading-tight">Rekap Kategori SIPLah / Non</h3><p class="mt-1 text-xs text-slate-500">SIPLah {{ rupiahRingkas(totKat.siplah) }} · Non {{ rupiahRingkas(totKat.non) }}</p></div></div>
        <div class="mt-auto flex gap-2 pt-3"><button class="tombol-garis flex-1" @click="cetak = 'kat'"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button><button class="tombol-garis" aria-label="Excel rekap kategori" @click="excel('kat')"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /></button></div>
      </div>
      <div class="kartu flex flex-col p-4">
        <div class="flex items-start gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="Grid3x3" :ukuran="21" /></span>
          <div><h3 class="font-bold leading-tight">Matriks SNP × Komponen</h3><p class="mt-1 text-xs text-slate-500">{{ matriks.length }} SNP × 12 komponen</p></div></div>
        <div class="mt-auto flex gap-2 pt-3"><button class="tombol-garis flex-1" @click="cetak = 'matriks'"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button><button class="tombol-garis" aria-label="Excel matriks" @click="excel('matriks')"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /></button></div>
      </div>
      <div class="kartu flex flex-col p-4">
        <div class="flex items-start gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ikon-chip-sukses"><Ikon nama="FileSignature" :ukuran="21" /></span>
          <div><h3 class="font-bold leading-tight">SK Tim BOS</h3><p class="mt-1 text-xs text-slate-500">Pasal 65: Kepsek, bendahara, guru, Komite, orang tua.</p></div></div>
        <div class="mt-auto flex gap-2 pt-3"><button class="tombol-garis flex-1" @click="cetak = 'sk'"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak SK</button></div>
      </div>
    </div>

    <!-- Matriks -->
    <section class="kartu overflow-hidden" data-tur="rekaplain-matriks">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="Grid3x3" :ukuran="19" /></span>
        <div class="flex-1"><h2 class="font-bold">Matriks SNP × 12 komponen</h2><p class="text-xs text-slate-500">{{ isiMatriks === 'anggaran' ? `Anggaran RKAS ${rkas.versiBerlaku?.nama || ''}` : `Realisasi lunas · ${sub}` }}</p></div>
        <div class="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button v-for="[v, l] in [['anggaran', 'Anggaran'], ['realisasi', 'Realisasi']]" :key="v" @click="isiMatriks = v" :class="['rounded-lg px-3 py-1.5 text-xs font-semibold', isiMatriks === v ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500']">{{ l }}</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-xs">
          <thead class="bg-slate-50 text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-2 py-2 text-left">SNP</th>
            <th v-for="k in KOMP" :key="k" class="px-1 py-2 text-center" :title="KOMPONEN_ARKAS[k].nama"><span class="inline-grid h-5 w-5 place-items-center rounded-full font-bold text-white" :style="{ background: KOMPONEN_ARKAS[k].warna }">{{ KOMPONEN_ARKAS[k].huruf }}</span></th>
            <th class="px-2 py-2 text-right">Jumlah</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="r in matriks" :key="r.snp">
              <td class="px-2 py-1.5"><span class="mr-1 inline-block h-2.5 w-2.5 rounded-full" :style="{ background: WARNA_SNP[r.snp] || '#64748b' }" /><b>{{ r.snp }}</b> <span class="text-slate-500">{{ r.nama }}</span></td>
              <td v-for="k in KOMP" :key="k" class="angka px-1 py-1.5 text-right" :style="{ background: sel(r[k], maksSel) }">{{ r[k] ? rupiahRingkas(r[k]) : '' }}</td>
              <td class="angka px-2 py-1.5 text-right font-bold">{{ rupiahRingkas(r.total) }}</td>
            </tr>
          </tbody>
          <tfoot class="bg-slate-50 font-bold dark:bg-slate-800/60"><tr>
            <td class="px-2 py-2">Jumlah</td><td v-for="k in KOMP" :key="k" class="angka px-1 py-2 text-right">{{ totKomp[k] ? rupiahRingkas(totKomp[k]) : '' }}</td><td class="angka px-2 py-2 text-right">{{ rupiahRingkas(totMatriks) }}</td>
          </tr></tfoot>
        </table>
      </div>
    </section>

    <!-- SK Tim BOS -->
    <section class="kartu space-y-3 p-4 sm:p-5" data-tur="rekaplain-sk">
      <h2 class="flex items-center gap-2 font-bold"><Ikon nama="UsersRound" :ukuran="18" class="text-[#22A08D]" /> Susunan Tim BOS TA {{ sk.tahun }}</h2>
      <div class="grid gap-2 sm:grid-cols-3">
        <input v-model="sk.nomor" class="masukan py-1.5" placeholder="Nomor SK" aria-label="Nomor SK" />
        <input v-model="sk.tanggal" type="date" class="masukan py-1.5" aria-label="Tanggal SK" />
        <input v-model.number="sk.tahun" type="number" class="masukan py-1.5" aria-label="Tahun anggaran SK" />
      </div>
      <div v-for="(a, i) in sk.anggota" :key="i" class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
        <span class="lencana bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{{ a.peran }}</span>
        <input v-model="a.nama" class="masukan min-w-[10rem] flex-1 py-1.5 text-sm" placeholder="Nama & gelar" :aria-label="`Nama anggota ${i + 1}`" />
        <input v-model="a.nip" class="masukan kode w-44 py-1.5 text-xs" placeholder="NIP (bila ada)" :aria-label="`NIP anggota ${i + 1}`" />
        <input v-model="a.unsur" class="masukan w-56 py-1.5 text-xs" placeholder="Unsur" :aria-label="`Unsur anggota ${i + 1}`" />
        <select class="masukan w-auto py-1 text-xs" :aria-label="`Pilih pegawai anggota ${i + 1}`" @change="pilihPegawai(a, $event.target.value); $event.target.value = ''"><option value="">Pegawai…</option><option v-for="p in pegawai" :key="p.id" :value="p.id">{{ p.nama }}</option></select>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="sk.anggota.push({ peran: 'Anggota', nama: '', nip: '', unsur: '' })"><Ikon nama="Plus" :ukuran="14" class="text-biru" /> Anggota</button>
        <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="susunAwal"><Ikon nama="Undo2" :ukuran="14" class="text-slate-500" /> Susunan bawaan</button>
        <button v-if="auth.isAdmin" class="tombol-garis ml-auto px-3 py-1.5 text-sm" @click="simpanSk"><Ikon nama="Save" :ukuran="16" class="text-biru" /> Simpan</button>
        <button class="tombol-utama px-3 py-1.5 text-sm" @click="cetak = 'sk'"><Ikon nama="Printer" :ukuran="16" /> Cetak SK</button>
      </div>
    </section>

    <CetakBuku v-if="cetak === 'non'" judul="Daftar Transaksi Belanja Non-SIPLah" :subjudul="`Dana BOSP Reguler — ${sub}`" :kolom="kolomNon" :baris="nonSiplah" :tanggal="tglAkhir" excel kecil @excel="excel('non')" @tutup="cetak = ''" />
    <CetakBuku v-if="cetak === 'kat'" judul="Rekapitulasi Belanja per Kategori — SIPLah dan Non-SIPLah" :subjudul="`Dana BOSP Reguler — ${sub}`" :kolom="kolomKat" :baris="rekapKat" :tanggal="tglAkhir" excel @excel="excel('kat')" @tutup="cetak = ''"
               :ringkasan="[['Melalui SIPLah', totKat.siplah], ['Di luar SIPLah', totKat.non], ['Honor & transpor', totKat.honor], ['Jumlah realisasi', totKat.jumlah]]" />
    <CetakBuku v-if="cetak === 'matriks'" :judul="`Matriks SNP × Komponen Penggunaan Dana (${isiMatriks === 'anggaran' ? 'Anggaran' : 'Realisasi'})`" :subjudul="isiMatriks === 'anggaran' ? `RKAS ${rkas.versiBerlaku?.nama || ''} TA ${kas.tahun}` : sub"
               :kolom="kolomMatriks" :baris="matriks" :tanggal="tglAkhir" kecil excel :nomor="false" @excel="excel('matriks')" @tutup="cetak = ''"
               :ringkasan="KOMP.map((k) => [`${KOMPONEN_ARKAS[k].huruf}. ${KOMPONEN_ARKAS[k].nama}`, totKomp[k]])" />
    <CetakSurat v-if="cetak === 'sk'" :judul="`SK Tim BOS TA ${sk.tahun}`" @tutup="cetak = ''">
      <template #default="{ profil }"><DokSkTimBos :profil="profil" :sk="sk" :kepsek="kepsekSk" /></template>
    </CetakSurat>
  </div>
</template>
