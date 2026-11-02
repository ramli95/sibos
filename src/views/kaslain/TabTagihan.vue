<script setup>
// Tagihan per orang per periode (mis. Arisan November) dan setorannya. Setoran → kwitansi (F4, 2 rangkap),
// pemasukan pos tercatat otomatis, dan konfirmasi WhatsApp (belum lunas / setoran diterima / lunas).
import InputAngka from '@/components/InputAngka.vue'
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { pakaiKasLain } from './pakaiKasLain'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { STATUS, CARA_BAYAR, WARNA_POS, labelPeriode, jumlah, rincianWa } from '@/utils/kasLain'
import { rupiah, tanggalPendek, tanggalPanjang } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokKwitansiSetoran from '@/components/cetak/DokKwitansiSetoran.vue'
import Lembar from './Lembar.vue'
import KirimWaKas from './KirimWaKas.vue'

const route = useRoute()
const auth = useAuth()
const notif = useNotifikasi()
const kl = pakaiKasLain()
const { posUrut, posAktif, tagihan, orang, namaPos, cariPos, hariIni } = kl

const bulanIni = new Date().toISOString().slice(0, 7)
const saringPos = ref(route.query.pos || '')
const saringPeriode = ref('')
const saringStatus = ref('')
const cari = ref('')
const daftarPeriode = computed(() => [...new Set(tagihan.value.map((t) => t.periode))].sort().reverse())
const hasil = computed(() => tagihan.value
  .filter((t) => (!saringPos.value || t.pos_id === saringPos.value) && (!saringPeriode.value || t.periode === saringPeriode.value)
    && (!saringStatus.value || (saringStatus.value === 'belum-lunas' ? t.status !== 'lunas' : t.status === saringStatus.value))
    && (!cari.value || String(t.orang?.nama).toLowerCase().includes(cari.value.toLowerCase())))
  .sort((a, b) => String(b.periode).localeCompare(String(a.periode)) || namaPos(a.pos_id).localeCompare(namaPos(b.pos_id)) || String(a.orang?.nama).localeCompare(String(b.orang?.nama))))
const ringkas = computed(() => ({
  tagihan: jumlah(hasil.value, 'nominal'), terkumpul: jumlah(hasil.value, 'dibayar'), sisa: jumlah(hasil.value, 'sisa'),
  lunas: hasil.value.filter((t) => t.status === 'lunas').length, n: hasil.value.length,
}))
const persen = computed(() => (ringkas.value.tagihan ? Math.round((ringkas.value.terkumpul / ringkas.value.tagihan) * 100) : 0))
const noWa = (t) => t.orang?.no_wa || orang.value.find((o) => o.id === t.orang?.id)?.no_wa || ''

/* ---------- Buat tagihan massal ---------- */
const formBuat = ref(false)
const fb = reactive({ pos_id: '', periode: bulanIni, nominal: 0, jatuh_tempo: '', ket: '' })
const dipilih = ref({}) // id → nominal
const cariOrang = ref('')
const manual = ref([]) // [{ nama, no_wa, nominal }]
function bukaBuat() {
  const p = posAktif.value.find((x) => x.id === saringPos.value) || posAktif.value[0]
  Object.assign(fb, { pos_id: p?.id || '', periode: saringPeriode.value || bulanIni, nominal: p?.nominal || 0, jatuh_tempo: `${saringPeriode.value || bulanIni}-10`, ket: '' })
  dipilih.value = {}; manual.value = []; cariOrang.value = ''
  formBuat.value = true
}
watch(() => fb.pos_id, (id) => { const p = cariPos(id); if (p?.nominal) fb.nominal = p.nominal })
watch(() => fb.periode, (v) => { if (v) fb.jatuh_tempo = `${v}-10` })
const sudahAda = (o) => tagihan.value.some((t) => t.pos_id === fb.pos_id && t.periode === fb.periode && t.orang?.id === o.id)
const orangTampil = computed(() => orang.value.filter((o) => !cariOrang.value || o.nama.toLowerCase().includes(cariOrang.value.toLowerCase())))
function centang(o) { const d = { ...dipilih.value }; if (o.id in d) delete d[o.id]; else d[o.id] = ''; dipilih.value = d }
function semua(v) { dipilih.value = v ? Object.fromEntries(orangTampil.value.filter((o) => !sudahAda(o)).map((o) => [o.id, dipilih.value[o.id] ?? ''])) : {} }
const jumlahDipilih = computed(() => Object.keys(dipilih.value).length + manual.value.filter((m) => m.nama.trim()).length)
const menyimpan = ref(false)
async function buat() {
  if (!fb.pos_id || !fb.periode) return notif.kabari('Pilih pos dan periode.', 'galat')
  const daftar = [
    ...Object.entries(dipilih.value).map(([id, n]) => { const o = orang.value.find((x) => x.id === id); return { ...o, nominal: Number(n) > 0 ? Number(n) : Number(fb.nominal) } }),
    ...manual.value.filter((m) => m.nama.trim()).map((m) => ({ id: '', nama: m.nama.trim(), no_wa: m.no_wa, nominal: Number(m.nominal) > 0 ? Number(m.nominal) : Number(fb.nominal) })),
  ]
  if (!daftar.length) return notif.kabari('Pilih minimal satu orang.', 'galat')
  if (daftar.some((o) => !(o.nominal > 0))) return notif.kabari('Isi nominal tagihan.', 'galat')
  menyimpan.value = true
  try {
    const { n, lewat } = await kl.buatTagihanMassal({ ...fb, daftar })
    notif.kabari(`${n} tagihan dibuat${lewat ? `, ${lewat} dilewati (sudah ada)` : ''}.`)
    formBuat.value = false; saringPos.value = fb.pos_id; saringPeriode.value = fb.periode
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

/* ---------- Detail, setoran, kwitansi ---------- */
const detailId = ref(null)
const t = computed(() => tagihan.value.find((x) => x.id === detailId.value))
const fs = reactive({ tanggal: '', nilai: 0, cara: 'tunai', ket: '' })
const baru = ref(null) // setoran yang baru dicatat
const ubahT = ref(false)
const fu = reactive({ nominal: 0, jatuh_tempo: '', ket: '', no_wa: '' })
function buka(x) {
  detailId.value = x.id; baru.value = null; ubahT.value = false
  Object.assign(fs, { tanggal: hariIni(), nilai: x.sisa, cara: 'tunai', ket: '' })
  Object.assign(fu, { nominal: x.nominal, jatuh_tempo: x.jatuh_tempo || '', ket: x.ket || '', no_wa: x.orang?.no_wa || '' })
}
async function setor() {
  if (!(Number(fs.nilai) > 0)) return notif.kabari('Isi nilai setoran.', 'galat')
  if (Number(fs.nilai) > t.value.sisa && !confirm(`Setoran melebihi sisa tagihan (${rupiah(t.value.sisa)}). Tetap simpan?`)) return
  try {
    baru.value = await kl.catatSetoran(t.value, { ...fs })
    Object.assign(fs, { nilai: t.value.sisa, ket: '' })
    notif.kabari(`Setoran ${baru.value.no_kwitansi} tercatat.`)
  } catch (e) { notif.kabari(e.message, 'galat') }
}
async function batalSetor(s) {
  if (!confirm(`Batalkan setoran ${s.no_kwitansi} (${rupiah(s.nilai)})? Pemasukan pos ikut terhapus.`)) return
  try { await kl.hapusSetoran(t.value, s); if (baru.value?.id === s.id) baru.value = null } catch (e) { notif.kabari(e.message, 'galat') }
}
async function simpanUbah() {
  try { await kl.simpanTagihan(t.value.id, { nominal: fu.nominal, jatuh_tempo: fu.jatuh_tempo, ket: fu.ket, orang: { ...t.value.orang, no_wa: fu.no_wa } }); ubahT.value = false } catch (e) { notif.kabari(e.message, 'galat') }
}
async function hapus() {
  if (!confirm(`Hapus tagihan ${namaPos(t.value.pos_id)} ${labelPeriode(t.value.periode)} — ${t.value.orang?.nama}? Setorannya ikut terhapus.`)) return
  try { await kl.hapusTagihan(t.value); detailId.value = null } catch (e) { notif.kabari(e.message, 'galat') }
}

// Kwitansi
const kw = ref(null)
function cetakKw(x, s) {
  const sampai = (x.setoran || []).filter((y) => String(y.tanggal) < String(s.tanggal) || (y.tanggal === s.tanggal && (x.setoran || []).indexOf(y) <= (x.setoran || []).indexOf(s)))
  const dibayar = jumlah(sampai)
  kw.value = {
    no: s.no_kwitansi, tanggal: s.tanggal, dari: x.orang?.nama, nilai: s.nilai, cara: CARA_BAYAR[s.cara] || s.cara,
    untuk: `${namaPos(x.pos_id)} ${labelPeriode(x.periode)}${x.ket ? ` — ${x.ket}` : ''}`,
    tagihan: x.nominal, dibayar, sisa: Math.max(0, x.nominal - dibayar), lunas: dibayar >= x.nominal, ket: s.ket,
  }
}

// WhatsApp
const wa = ref(null)
function bukaWa(x, s = null) {
  const jenis = x.status === 'lunas' ? ['lunas', 'setoran', 'tagih'] : s ? ['setoran', 'tagih'] : ['tagih', 'setoran']
  const akhir = s || (x.setoran || []).at(-1)
  wa.value = {
    nama: x.orang?.nama, no: noWa(x), jenis, acuan: `tagihan:${x.id}`,
    data: () => ({
      nama: x.orang?.nama, pos: namaPos(x.pos_id), periode: labelPeriode(x.periode),
      rincian: rincianWa([x], namaPos), sisa: rupiah(tagihan.value.find((y) => y.id === x.id)?.sisa ?? x.sisa),
      nominal: rupiah(akhir && x.status !== 'lunas' ? akhir.nilai : x.nominal), tanggal: akhir ? tanggalPanjang(akhir.tanggal) : '', kwitansi: akhir?.no_kwitansi || '-',
    }),
  }
}

/* ---------- Cetak rekap & Excel ---------- */
const kolom = [
  { judul: 'Nama', nilai: (r) => r.orang?.nama },
  { judul: 'Pos', nilai: (r) => namaPos(r.pos_id), lebar: '3.2cm' },
  { judul: 'Periode', nilai: (r) => labelPeriode(r.periode), lebar: '2.8cm' },
  { judul: 'Tagihan', nilai: (r) => r.nominal, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Dibayar', nilai: (r) => r.dibayar, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Sisa', nilai: (r) => r.sisa, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Status', nilai: (r) => STATUS[r.status].label, lebar: '2.2cm', rata: 'tengah' },
]
const cetak = ref(false)
const judulRekap = computed(() => `Rekap Tagihan ${saringPos.value ? namaPos(saringPos.value) : 'Kas Lain'}`)
const subRekap = computed(() => [saringPeriode.value ? labelPeriode(saringPeriode.value) : 'Semua periode', saringStatus.value === 'belum-lunas' ? 'belum lunas' : saringStatus.value ? STATUS[saringStatus.value].label : ''].filter(Boolean).join(' · '))
async function excel() {
  try { await eksporExcel({ judul: `${judulRekap.value} — ${subRekap.value}`, namaBerkas: judulRekap.value, baris: hasil.value, kolom: kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : k.judul === 'Nama' ? 36 : 18, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Saring -->
    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="kaslain-saring">
      <select v-model="saringPos" class="masukan w-full py-2 sm:w-auto" aria-label="Pos"><option value="">Semua pos</option><option v-for="p in posUrut" :key="p.id" :value="p.id">{{ p.nama }}</option></select>
      <select v-model="saringPeriode" class="masukan w-[calc(50%-0.25rem)] py-2 sm:w-auto" aria-label="Periode"><option value="">Semua periode</option><option v-for="p in daftarPeriode" :key="p" :value="p">{{ labelPeriode(p) }}</option></select>
      <select v-model="saringStatus" class="masukan w-[calc(50%-0.25rem)] py-2 sm:w-auto" aria-label="Status"><option value="">Semua status</option><option value="belum-lunas">Belum lunas</option><option value="belum">Belum bayar</option><option value="sebagian">Sebagian</option><option value="lunas">Lunas</option></select>
      <div class="relative min-w-[9rem] flex-1"><Ikon nama="Search" :ukuran="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari nama" aria-label="Cari nama" /></div>
      <button class="tombol-garis" aria-label="Excel" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /></button>
      <button class="tombol-garis" aria-label="Cetak rekap" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /></button>
      <button v-if="auth.isAdmin" class="tombol-utama" :disabled="!posAktif.length" data-tur="kaslain-buat" @click="bukaBuat"><Ikon nama="Plus" :ukuran="17" /> Buat tagihan</button>
    </div>

    <!-- Ringkasan -->
    <div class="kartu p-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Terkumpul</p><p class="angka text-xl font-extrabold text-[#167A6B] dark:text-teal-300">{{ rupiah(ringkas.terkumpul) }}</p></div>
        <div class="text-right"><p class="text-xs text-slate-500">dari <span class="angka font-semibold">{{ rupiah(ringkas.tagihan) }}</span></p><p class="text-xs text-slate-500">sisa <span class="angka font-bold text-rose-600">{{ rupiah(ringkas.sisa) }}</span></p></div>
      </div>
      <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full bg-gradient-to-r from-[#22A08D] to-emerald-500 transition-all" :style="{ width: persen + '%' }" /></div>
      <p class="mt-1.5 text-xs text-slate-500">{{ persen }}% · {{ ringkas.lunas }} dari {{ ringkas.n }} tagihan lunas</p>
    </div>

    <!-- Daftar -->
    <section class="kartu overflow-hidden">
      <p v-if="!hasil.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="ListTodo" class="mx-auto mb-2 text-slate-400" /> Belum ada tagihan{{ saringPos || saringPeriode || saringStatus ? ' yang cocok' : '' }}.</p>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="x in hasil" :key="x.id" class="flex items-center gap-3 px-4 py-3">
          <button class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="buka(x)">
            <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl', (WARNA_POS[cariPos(x.pos_id)?.warna] || WARNA_POS.biru).chip]"><Ikon :nama="cariPos(x.pos_id)?.ikon || 'WalletCards'" :ukuran="16" /></span>
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 block text-sm font-semibold leading-snug">{{ x.orang?.nama }}</span>
              <span class="block truncate text-xs text-slate-500">{{ namaPos(x.pos_id) }} · {{ labelPeriode(x.periode) }}<template v-if="x.dibayar && x.status !== 'lunas'"> · dibayar {{ rupiah(x.dibayar) }}</template></span>
            </span>
            <span class="shrink-0 text-right">
              <span :class="['angka block text-sm font-bold', x.status === 'lunas' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100']">{{ rupiah(x.status === 'lunas' ? x.nominal : x.sisa) }}</span>
              <span :class="['lencana', x.lewat ? 'bg-rose-600 text-white' : STATUS[x.status].kelas]">{{ x.lewat ? 'Lewat tempo' : STATUS[x.status].label }}</span>
            </span>
          </button>
          <template v-if="auth.isAdmin">
            <button class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30" :aria-label="`WhatsApp ${x.orang?.nama}`" @click="bukaWa(x)"><Ikon nama="MessageCircle" :ukuran="17" /></button>
            <button v-if="x.status !== 'lunas'" class="hidden shrink-0 items-center gap-1 rounded-xl bg-biru px-3 py-2 text-xs font-semibold text-white sm:flex" @click="buka(x)"><Ikon nama="HandCoins" :ukuran="14" /> Setor</button>
          </template>
        </li>
      </ul>
    </section>

    <!-- Buat tagihan -->
    <Lembar v-if="formBuat" judul="Buat tagihan" sub="Untuk banyak orang sekaligus" ikon="ListTodo" chip="ikon-chip-kuning" lebar="max-w-2xl" @tutup="formBuat = false">
      <div class="grid gap-3 sm:grid-cols-2">
        <div><label class="label" for="b-pos">Pos</label><select id="b-pos" v-model="fb.pos_id" class="masukan"><option v-for="p in posAktif" :key="p.id" :value="p.id">{{ p.nama }}</option></select></div>
        <div><label class="label" for="b-per">Periode (bulan)</label><input id="b-per" v-model="fb.periode" type="month" class="masukan" /></div>
        <div><label class="label" for="b-nom">Nominal per orang</label><InputAngka id="b-nom" v-model="fb.nominal" class="masukan" :desimal="0" /></div>
        <div><label class="label" for="b-tempo">Jatuh tempo</label><input id="b-tempo" v-model="fb.jatuh_tempo" type="date" class="masukan" /></div>
      </div>
      <div><label class="label" for="b-ket">Keterangan (opsional)</label><input id="b-ket" v-model="fb.ket" class="masukan" placeholder="mis. Putaran ke-3, Tunjangan Profesi Triwulan III" /></div>

      <div class="rounded-2xl border border-slate-200 dark:border-slate-700">
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-2 dark:border-slate-800">
          <div class="relative min-w-[8rem] flex-1"><Ikon nama="Search" :ukuran="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cariOrang" class="masukan py-1.5 pl-9 text-sm" placeholder="Cari pegawai" aria-label="Cari pegawai" /></div>
          <button type="button" class="tombol-garis px-3 py-1.5 text-xs" @click="semua(true)"><Ikon nama="CheckCheck" :ukuran="14" /> Pilih semua</button>
          <button type="button" class="tombol-garis px-3 py-1.5 text-xs" @click="semua(false)">Kosongkan</button>
        </div>
        <ul class="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          <li v-for="o in orangTampil" :key="o.id" :class="['flex items-center gap-2 px-3 py-2', sudahAda(o) && 'opacity-50']">
            <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" class="h-4 w-4 shrink-0 accent-[#1A62E8]" :checked="o.id in dipilih" :disabled="sudahAda(o)" @change="centang(o)" />
              <span class="min-w-0 truncate">{{ o.nama }}</span>
              <span v-if="sudahAda(o)" class="lencana shrink-0 bg-slate-100 text-slate-500 dark:bg-slate-800">sudah ada</span>
            </label>
            <InputAngka v-if="o.id in dipilih" v-model="dipilih[o.id]" :desimal="0" class="masukan w-32 shrink-0 py-1 text-right text-sm" :placeholder="rupiah(fb.nominal, { tanpaRp: true })" :aria-label="`Nominal ${o.nama}`" />
          </li>
        </ul>
        <div class="space-y-2 border-t border-slate-100 p-2 dark:border-slate-800">
          <div v-for="(m, i) in manual" :key="i" class="flex flex-wrap items-center gap-2">
            <input v-model="m.nama" class="masukan min-w-[8rem] flex-1 py-1.5 text-sm" placeholder="Nama (bukan pegawai)" aria-label="Nama" />
            <input v-model="m.no_wa" class="masukan w-32 py-1.5 text-sm" inputmode="tel" placeholder="No. WA" aria-label="Nomor WA" />
            <InputAngka v-model="m.nominal" :desimal="0" class="masukan w-28 py-1.5 text-right text-sm" placeholder="nominal" aria-label="Nominal" />
            <button type="button" class="text-slate-400 hover:text-rose-600" aria-label="Hapus baris" @click="manual.splice(i, 1)"><Ikon nama="X" :ukuran="16" /></button>
          </div>
          <button type="button" class="flex items-center gap-1.5 text-xs font-semibold text-biru" @click="manual.push({ nama: '', no_wa: '', nominal: '' })"><Ikon nama="UserPlus" :ukuran="14" /> Tambah orang lain</button>
        </div>
      </div>
      <p class="text-xs text-slate-500">Nominal per orang boleh dikosongkan (memakai nominal di atas) atau diisi berbeda, mis. untuk potongan sertifikasi.</p>
      <template #kaki>
        <span class="mr-auto self-center text-sm text-slate-500">{{ jumlahDipilih }} orang</span>
        <button class="tombol-garis" @click="formBuat = false">Batal</button>
        <button class="tombol-utama" :disabled="menyimpan || !jumlahDipilih" @click="buat"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Buat {{ jumlahDipilih || '' }} tagihan</button>
      </template>
    </Lembar>

    <!-- Detail tagihan -->
    <Lembar v-if="t" :judul="t.orang?.nama" :sub="`${namaPos(t.pos_id)} · ${labelPeriode(t.periode)}${t.ket ? ' · ' + t.ket : ''}`" :ikon="cariPos(t.pos_id)?.ikon || 'ListTodo'" :chip="(WARNA_POS[cariPos(t.pos_id)?.warna] || WARNA_POS.biru).chip" @tutup="detailId = null">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div v-for="[l, n, c] in [['Tagihan', t.nominal, ''], ['Dibayar', t.dibayar, 'text-emerald-600'], ['Sisa', t.sisa, t.sisa ? 'text-rose-600' : 'text-emerald-600']]" :key="l" class="min-w-0 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
          <p class="text-[11px] font-semibold uppercase text-slate-500">{{ l }}</p><p :class="['angka truncate text-sm font-extrabold', c]">{{ rupiah(n) }}</p>
        </div>
      </div>
      <p class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span :class="['lencana', STATUS[t.status].kelas]"><Ikon :nama="STATUS[t.status].ikon" :ukuran="12" /> {{ STATUS[t.status].label }}</span>
        <span v-if="t.jatuh_tempo">Jatuh tempo {{ tanggalPendek(t.jatuh_tempo) }}</span>
        <span v-if="noWa(t)" class="kode">WA {{ noWa(t) }}</span>
      </p>

      <!-- Setoran baru tercatat -->
      <div v-if="baru" class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p class="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><Ikon nama="CircleCheck" :ukuran="17" /> Setoran {{ baru.no_kwitansi }} tercatat ({{ rupiah(baru.nilai) }})</p>
        <div class="flex flex-wrap gap-2">
          <button class="tombol-garis px-3 py-1.5 text-xs" @click="cetakKw(t, baru)"><Ikon nama="Printer" :ukuran="14" class="text-biru" /> Cetak kwitansi</button>
          <button class="tombol-garis px-3 py-1.5 text-xs" @click="bukaWa(t, baru)"><Ikon nama="MessageCircle" :ukuran="14" class="text-emerald-600" /> WA {{ t.status === 'lunas' ? 'lunas' : 'konfirmasi' }}</button>
        </div>
      </div>

      <!-- Catat setoran -->
      <div v-if="auth.isAdmin && t.status !== 'lunas'" class="space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700" data-tur="kaslain-setor">
        <p class="flex items-center gap-2 text-sm font-bold"><Ikon nama="HandCoins" :ukuran="16" class="text-biru" /> Catat setoran</p>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label" for="s-tgl">Tanggal</label><input id="s-tgl" v-model="fs.tanggal" type="date" class="masukan" /></div>
          <div><label class="label" for="s-nilai">Nilai (Rp)</label><InputAngka id="s-nilai" v-model="fs.nilai" class="masukan" :desimal="0" /></div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="(l, k) in CARA_BAYAR" :key="k" type="button" :class="['rounded-xl border px-3 py-1.5 text-xs font-semibold', fs.cara === k ? 'border-biru bg-biru/10 text-biru dark:text-blue-300' : 'border-slate-200 dark:border-slate-700']" @click="fs.cara = k">{{ l }}</button>
        </div>
        <input v-model="fs.ket" class="masukan" placeholder="Catatan (opsional)" aria-label="Catatan setoran" />
        <button class="tombol-utama w-full" @click="setor"><Ikon nama="Save" :ukuran="17" /> Simpan setoran</button>
      </div>

      <!-- Riwayat setoran -->
      <div>
        <p class="mb-1 flex items-center gap-2 text-sm font-bold"><Ikon nama="Receipt" :ukuran="16" class="text-[#E3A414]" /> Riwayat setoran</p>
        <p v-if="!(t.setoran || []).length" class="text-xs text-slate-500">Belum ada setoran.</p>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="s in t.setoran" :key="s.id" class="flex items-center gap-2 py-2 text-sm">
            <span class="min-w-0 flex-1"><b class="angka">{{ rupiah(s.nilai) }}</b> <span class="text-xs text-slate-500">· {{ tanggalPendek(s.tanggal) }} · {{ CARA_BAYAR[s.cara] || s.cara }}<br class="sm:hidden" /><span class="kode"> {{ s.no_kwitansi }}</span></span></span>
            <button class="text-slate-400 hover:text-biru" :aria-label="`Cetak kwitansi ${s.no_kwitansi}`" @click="cetakKw(t, s)"><Ikon nama="Printer" :ukuran="16" /></button>
            <button v-if="auth.isAdmin" class="text-slate-400 hover:text-rose-600" :aria-label="`Batalkan ${s.no_kwitansi}`" @click="batalSetor(s)"><Ikon nama="Trash2" :ukuran="16" /></button>
          </li>
        </ul>
      </div>

      <div v-if="ubahT" class="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label" for="u-nom">Nominal</label><InputAngka id="u-nom" v-model="fu.nominal" class="masukan" :desimal="0" /></div>
          <div><label class="label" for="u-tempo">Jatuh tempo</label><input id="u-tempo" v-model="fu.jatuh_tempo" type="date" class="masukan" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label" for="u-wa">No. WA</label><input id="u-wa" v-model="fu.no_wa" class="masukan kode" inputmode="tel" /></div>
          <div><label class="label" for="u-ket">Keterangan</label><input id="u-ket" v-model="fu.ket" class="masukan" /></div>
        </div>
        <div class="flex justify-end gap-2"><button class="tombol-garis" @click="ubahT = false">Batal</button><button class="tombol-utama" @click="simpanUbah"><Ikon nama="Save" :ukuran="16" /> Simpan</button></div>
      </div>

      <template v-if="auth.isAdmin" #kaki>
        <button class="tombol-garis mr-auto text-rose-600" aria-label="Hapus tagihan" @click="hapus"><Ikon nama="Trash2" :ukuran="16" /></button>
        <button class="tombol-garis" @click="ubahT = !ubahT"><Ikon nama="Pencil" :ukuran="16" class="text-biru" /> Ubah</button>
        <button class="tombol-utama !bg-emerald-600" @click="bukaWa(t)"><Ikon nama="MessageCircle" :ukuran="16" /> WhatsApp</button>
      </template>
    </Lembar>

    <KirimWaKas v-if="wa" :nama="wa.nama" :no="wa.no" :jenis="wa.jenis" :data="wa.data" :acuan="wa.acuan" @tutup="wa = null" />

    <CetakSurat v-if="kw" :judul="`Kwitansi Setoran ${kw.no}`" @tutup="kw = null">
      <template #default="{ profil, pejabat }"><DokKwitansiSetoran :profil="profil" :k="kw" :penerima="pejabat('bendahara_bosp', kw.tanggal)" label-penerima="Yang menerima, Bendahara" /></template>
    </CetakSurat>

    <CetakBuku v-if="cetak" :judul="judulRekap" :subjudul="`${subRekap} · di luar Dana BOSP`" :kolom="kolom" :baris="hasil" excel orientasi="portrait" kecil
               :ringkasan="[['Total tagihan', ringkas.tagihan], ['Terkumpul', ringkas.terkumpul], ['Belum dibayar', ringkas.sisa]]"
               :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Pengelola,' }" @excel="excel" @tutup="cetak = false" />
  </div>
</template>
