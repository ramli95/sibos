<script setup>
// Utang piutang (di luar Dana BOSP). Piutang = orang lain meminjam (kas/bendahara menagih);
// Utang = kas/bendahara meminjam dari pihak lain. Pembayaran bertahap, kwitansi, WhatsApp, cetak daftar.
import InputAngka from '@/components/InputAngka.vue'
import { ref, reactive, computed } from 'vue'
import { pakaiKasLain } from './pakaiKasLain'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { STATUS, jumlah } from '@/utils/kasLain'
import { rupiah, tanggalPendek, tanggalPanjang } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokKwitansiSetoran from '@/components/cetak/DokKwitansiSetoran.vue'
import Lembar from './Lembar.vue'
import KirimWaKas from './KirimWaKas.vue'

const auth = useAuth()
const notif = useNotifikasi()
const kl = pakaiKasLain()
const { utang, posUrut, orang, namaPos, hariIni } = kl

const ARAH = {
  piutang: { label: 'Piutang', ket: 'Orang lain meminjam — kita menagih', ikon: 'ArrowUpRight', chip: 'ikon-chip-tosca' },
  utang: { label: 'Utang', ket: 'Kita meminjam — kita membayar', ikon: 'ArrowDownLeft', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
}
const arah = ref('piutang')
const status = ref('berjalan')
const cari = ref('')
const hasil = computed(() => utang.value.filter((u) => u.arah === arah.value && (status.value === 'semua' || (status.value === 'lunas' ? u.status === 'lunas' : u.status !== 'lunas'))
  && (!cari.value || `${u.pihak?.nama} ${u.uraian}`.toLowerCase().includes(cari.value.toLowerCase())))
  .sort((a, b) => (a.status === 'lunas') - (b.status === 'lunas') || String(a.jatuh_tempo || '9').localeCompare(String(b.jatuh_tempo || '9'))))
const total = (a) => jumlah(utang.value.filter((u) => u.arah === a && u.status !== 'lunas'), 'sisa')
const noWa = (u) => u.pihak?.no_wa || orang.value.find((o) => o.id === u.pihak?.id)?.no_wa || ''

/* ---------- Form ---------- */
const form = ref(false)
const f = reactive({})
function bukaForm(u = null) {
  Object.assign(f, { id: null, arah: arah.value, nama: '', no_wa: '', pihak_id: '', tanggal: hariIni(), jatuh_tempo: '', nilai: 0, uraian: '', pos_id: '' },
    u ? { id: u.id, arah: u.arah, nama: u.pihak?.nama, no_wa: u.pihak?.no_wa || '', pihak_id: u.pihak?.id || '', tanggal: u.tanggal, jatuh_tempo: u.jatuh_tempo || '', nilai: u.nilai, uraian: u.uraian || '', pos_id: u.pos_id || '' } : {})
  form.value = true
}
function cocokkanNama() {
  const o = orang.value.find((x) => x.nama === f.nama)
  f.pihak_id = o?.id || ''
  if (o?.no_wa && !f.no_wa) f.no_wa = o.no_wa
}
async function simpan() {
  if (!f.nama.trim() || !(Number(f.nilai) > 0) || !f.tanggal) return notif.kabari('Isi nama, tanggal, dan nilai.', 'galat')
  try {
    await kl.simpanUtang(f.id, { arah: f.arah, pihak: { id: f.pihak_id, nama: f.nama.trim(), no_wa: f.no_wa }, tanggal: f.tanggal, jatuh_tempo: f.jatuh_tempo, nilai: f.nilai, uraian: f.uraian.trim(), pos_id: f.pos_id })
    form.value = false; arah.value = f.arah
  } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Detail & pembayaran ---------- */
const detailId = ref(null)
const u = computed(() => utang.value.find((x) => x.id === detailId.value))
const fb = reactive({ tanggal: '', nilai: 0, ket: '' })
function buka(x) { detailId.value = x.id; Object.assign(fb, { tanggal: hariIni(), nilai: x.sisa, ket: '' }) }
async function bayar() {
  if (!(Number(fb.nilai) > 0)) return notif.kabari('Isi nilai pembayaran.', 'galat')
  try { const b = await kl.catatBayarUtang(u.value, { ...fb }); notif.kabari(`Pembayaran ${b.no_kwitansi} tercatat.`); Object.assign(fb, { nilai: u.value.sisa, ket: '' }) } catch (e) { notif.kabari(e.message, 'galat') }
}
async function batalBayar(b) {
  if (!confirm(`Batalkan pembayaran ${rupiah(b.nilai)} tanggal ${tanggalPendek(b.tanggal)}?`)) return
  try { await kl.hapusBayarUtang(u.value, b) } catch (e) { notif.kabari(e.message, 'galat') }
}
async function hapus() {
  if (!confirm(`Hapus catatan ${u.value.arah} ${u.value.pihak?.nama}?`)) return
  try { await kl.hapusUtang(u.value); detailId.value = null } catch (e) { notif.kabari(e.message, 'galat') }
}

// Kwitansi pembayaran: piutang → orang menyetor ke bendahara; utang → bendahara membayar ke pihak
const kw = ref(null)
function cetakKw(x, b) {
  const urut = (x.bayar || []).slice(0, (x.bayar || []).indexOf(b) + 1)
  const dibayar = jumlah(urut)
  const piutang = x.arah === 'piutang'
  kw.value = {
    no: b.no_kwitansi || '', tanggal: b.tanggal, nilai: b.nilai, ket: b.ket,
    dari: piutang ? x.pihak?.nama : 'Bendahara UPT SPF SMP Negeri 19 Makassar',
    untuk: `${piutang ? 'Pembayaran pinjaman' : 'Pengembalian pinjaman'}${x.uraian ? ` — ${x.uraian}` : ''} (pinjaman ${tanggalPendek(x.tanggal)})`,
    tagihan: x.nilai, dibayar, sisa: Math.max(0, x.nilai - dibayar), lunas: dibayar >= x.nilai, piutang, pihak: x.pihak?.nama,
  }
}

const wa = ref(null)
function bukaWa(x) {
  const piutang = x.arah === 'piutang'
  wa.value = {
    nama: x.pihak?.nama, no: noWa(x), acuan: `utang:${x.id}`,
    data: () => {
      const y = utang.value.find((z) => z.id === x.id) || x
      return {
        nama: y.pihak?.nama, judul: y.status === 'lunas' ? (piutang ? 'Terima kasih, pinjaman telah LUNAS' : 'Konfirmasi pelunasan pinjaman') : (piutang ? 'Mengingatkan pinjaman' : 'Informasi pembayaran pinjaman'),
        uraian: y.uraian || 'pinjaman', tanggal: tanggalPanjang(y.tanggal), nominal: rupiah(y.nilai), dibayar: rupiah(y.dibayar), sisa: rupiah(y.sisa),
        tempo: y.jatuh_tempo && y.status !== 'lunas' ? `\nJatuh tempo: ${tanggalPanjang(y.jatuh_tempo)}` : '',
      }
    },
  }
}

/* ---------- Cetak & Excel ---------- */
const kolom = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Nama', nilai: (r) => r.pihak?.nama, lebar: '4.5cm' },
  { judul: 'Uraian', nilai: (r) => r.uraian + (r.pos_id ? ` [${namaPos(r.pos_id)}]` : '') },
  { judul: 'Jatuh tempo', nilai: (r) => tanggalPendek(r.jatuh_tempo), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Pinjaman', nilai: (r) => r.nilai, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Dibayar', nilai: (r) => r.dibayar, lebar: '2.6cm', uang: true, jumlah: true },
  { judul: 'Sisa', nilai: (r) => r.sisa, lebar: '2.6cm', uang: true, jumlah: true },
]
const cetak = ref(false)
async function excel() {
  try { await eksporExcel({ judul: `Daftar ${ARAH[arah.value].label}`, namaBerkas: `Daftar ${ARAH[arah.value].label}`, baris: hasil.value, kolom: kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : 24, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3" data-tur="kaslain-arah">
      <button v-for="(a, k) in ARAH" :key="k" :class="['kartu flex min-w-0 items-center gap-3 p-3 text-left transition sm:p-4', arah === k ? 'ring-2 ring-biru' : 'opacity-80 hover:opacity-100']" @click="arah = k">
        <span :class="['hidden h-10 w-10 shrink-0 place-items-center rounded-xl sm:grid', a.chip]"><Ikon :nama="a.ikon" :ukuran="19" /></span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5 text-sm font-bold"><Ikon :nama="a.ikon" :ukuran="15" class="sm:hidden" /> {{ a.label }}</span>
          <span class="angka block break-all text-[15px] font-extrabold leading-tight sm:text-lg">{{ rupiah(total(k)) }}</span>
          <span class="hidden text-xs text-slate-500 sm:block">{{ a.ket }}</span>
        </span>
      </button>
    </div>

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <select v-model="status" class="masukan w-auto py-2" aria-label="Status"><option value="berjalan">Belum lunas</option><option value="lunas">Lunas</option><option value="semua">Semua</option></select>
      <div class="relative min-w-[9rem] flex-1"><Ikon nama="Search" :ukuran="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari nama / uraian" aria-label="Cari" /></div>
      <button class="tombol-garis" aria-label="Excel" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /></button>
      <button class="tombol-garis" aria-label="Cetak" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /></button>
      <button v-if="auth.isAdmin" class="tombol-utama" @click="bukaForm()"><Ikon nama="Plus" :ukuran="17" /> Catat {{ ARAH[arah].label.toLowerCase() }}</button>
    </div>

    <section class="kartu overflow-hidden">
      <p v-if="!hasil.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="HandCoins" class="mx-auto mb-2 text-slate-400" /> Tidak ada {{ ARAH[arah].label.toLowerCase() }}{{ status === 'berjalan' ? ' yang belum lunas' : '' }}.</p>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="x in hasil" :key="x.id" class="flex items-center gap-3 px-4 py-3">
          <button class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="buka(x)">
            <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl', ARAH[x.arah].chip]"><Ikon :nama="ARAH[x.arah].ikon" :ukuran="16" /></span>
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 block text-sm font-semibold leading-snug">{{ x.pihak?.nama }}</span>
              <span class="block truncate text-xs text-slate-500">{{ x.uraian || 'Pinjaman' }} · {{ tanggalPendek(x.tanggal) }}{{ x.jatuh_tempo ? ` · tempo ${tanggalPendek(x.jatuh_tempo)}` : '' }}</span>
            </span>
            <span class="shrink-0 text-right">
              <span class="angka block text-sm font-bold">{{ rupiah(x.status === 'lunas' ? x.nilai : x.sisa) }}</span>
              <span :class="['lencana', x.lewat ? 'bg-rose-600 text-white' : STATUS[x.status].kelas]">{{ x.lewat ? 'Lewat tempo' : STATUS[x.status].label }}</span>
            </span>
          </button>
          <button v-if="auth.isAdmin" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30" :aria-label="`WhatsApp ${x.pihak?.nama}`" @click="bukaWa(x)"><Ikon nama="MessageCircle" :ukuran="17" /></button>
        </li>
      </ul>
    </section>

    <!-- Form -->
    <Lembar v-if="form" :judul="`${f.id ? 'Ubah' : 'Catat'} ${ARAH[f.arah].label.toLowerCase()}`" :sub="ARAH[f.arah].ket" :ikon="ARAH[f.arah].ikon" :chip="ARAH[f.arah].chip" @tutup="form = false">
      <div class="grid grid-cols-2 gap-2">
        <button v-for="(a, k) in ARAH" :key="k" type="button" :class="['flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold', f.arah === k ? 'border-biru bg-biru/10 text-biru dark:text-blue-300' : 'border-slate-200 dark:border-slate-700']" @click="f.arah = k"><Ikon :nama="a.ikon" :ukuran="15" /> {{ a.label }}</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2 sm:col-span-1"><label class="label" for="u-nama">{{ f.arah === 'piutang' ? 'Peminjam' : 'Pemberi pinjaman' }}</label><input id="u-nama" v-model="f.nama" class="masukan" list="kl-orang-u" @change="cocokkanNama" /></div>
        <div class="col-span-2 sm:col-span-1"><label class="label" for="u-wa">No. WA</label><input id="u-wa" v-model="f.no_wa" class="masukan kode" inputmode="tel" placeholder="0812…" /></div>
        <div><label class="label" for="u-tgl">Tanggal</label><input id="u-tgl" v-model="f.tanggal" type="date" class="masukan" /></div>
        <div><label class="label" for="u-tempo">Jatuh tempo</label><input id="u-tempo" v-model="f.jatuh_tempo" type="date" class="masukan" /></div>
        <div><label class="label" for="u-nilai">Nilai pinjaman</label><InputAngka id="u-nilai" v-model="f.nilai" class="masukan" :desimal="0" /></div>
        <div><label class="label" for="u-pos">Ambil/masuk ke pos</label><select id="u-pos" v-model="f.pos_id" class="masukan"><option value="">— tidak dicatat di pos —</option><option v-for="p in posUrut" :key="p.id" :value="p.id">{{ p.nama }}</option></select></div>
      </div>
      <div><label class="label" for="u-uraian">Uraian</label><input id="u-uraian" v-model="f.uraian" class="masukan" placeholder="mis. Pinjaman dari kas arisan, kasbon" /></div>
      <p v-if="f.pos_id" class="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">Pinjaman tercatat sebagai <b>{{ f.arah === 'piutang' ? 'pengeluaran' : 'pemasukan' }}</b> di buku {{ namaPos(f.pos_id) }}, dan setiap pembayaran sebagai <b>{{ f.arah === 'piutang' ? 'pemasukan' : 'pengeluaran' }}</b>.</p>
      <datalist id="kl-orang-u"><option v-for="o in orang" :key="o.id" :value="o.nama" /></datalist>
      <template #kaki><button class="tombol-garis" @click="form = false">Batal</button><button class="tombol-utama" @click="simpan"><Ikon nama="Save" :ukuran="17" /> Simpan</button></template>
    </Lembar>

    <!-- Detail -->
    <Lembar v-if="u" :judul="u.pihak?.nama" :sub="`${ARAH[u.arah].label} · ${u.uraian || 'Pinjaman'} · ${tanggalPendek(u.tanggal)}`" :ikon="ARAH[u.arah].ikon" :chip="ARAH[u.arah].chip" @tutup="detailId = null">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div v-for="[l, n, c] in [['Pinjaman', u.nilai, ''], ['Dibayar', u.dibayar, 'text-emerald-600'], ['Sisa', u.sisa, u.sisa ? 'text-rose-600' : 'text-emerald-600']]" :key="l" class="min-w-0 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
          <p class="text-[11px] font-semibold uppercase text-slate-500">{{ l }}</p><p :class="['angka truncate text-sm font-extrabold', c]">{{ rupiah(n) }}</p>
        </div>
      </div>
      <p class="flex flex-wrap gap-2 text-xs text-slate-500">
        <span :class="['lencana', STATUS[u.status].kelas]">{{ STATUS[u.status].label }}</span>
        <span v-if="u.jatuh_tempo">Jatuh tempo {{ tanggalPendek(u.jatuh_tempo) }}</span>
        <span v-if="u.pos_id">Pos: {{ namaPos(u.pos_id) }}</span>
      </p>
      <div v-if="auth.isAdmin && u.status !== 'lunas'" class="space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
        <p class="flex items-center gap-2 text-sm font-bold"><Ikon nama="HandCoins" :ukuran="16" class="text-biru" /> Catat pembayaran</p>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label" for="ub-tgl">Tanggal</label><input id="ub-tgl" v-model="fb.tanggal" type="date" class="masukan" /></div>
          <div><label class="label" for="ub-nilai">Nilai (Rp)</label><InputAngka id="ub-nilai" v-model="fb.nilai" class="masukan" :desimal="0" /></div>
        </div>
        <input v-model="fb.ket" class="masukan" placeholder="Keterangan (mis. Cicilan 2)" aria-label="Keterangan pembayaran" />
        <button class="tombol-utama w-full" @click="bayar"><Ikon nama="Save" :ukuran="17" /> Simpan pembayaran</button>
      </div>
      <div>
        <p class="mb-1 flex items-center gap-2 text-sm font-bold"><Ikon nama="Receipt" :ukuran="16" class="text-[#E3A414]" /> Riwayat pembayaran</p>
        <p v-if="!(u.bayar || []).length" class="text-xs text-slate-500">Belum ada pembayaran.</p>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="b in u.bayar" :key="b.id" class="flex items-center gap-2 py-2 text-sm">
            <span class="min-w-0 flex-1"><b class="angka">{{ rupiah(b.nilai) }}</b> <span class="text-xs text-slate-500">· {{ tanggalPendek(b.tanggal) }}{{ b.ket ? ` · ${b.ket}` : '' }} <span class="kode">{{ b.no_kwitansi }}</span></span></span>
            <button class="text-slate-400 hover:text-biru" aria-label="Cetak kwitansi" @click="cetakKw(u, b)"><Ikon nama="Printer" :ukuran="16" /></button>
            <button v-if="auth.isAdmin" class="text-slate-400 hover:text-rose-600" aria-label="Batalkan pembayaran" @click="batalBayar(b)"><Ikon nama="Trash2" :ukuran="16" /></button>
          </li>
        </ul>
      </div>
      <template v-if="auth.isAdmin" #kaki>
        <button class="tombol-garis mr-auto text-rose-600" aria-label="Hapus" @click="hapus"><Ikon nama="Trash2" :ukuran="16" /></button>
        <button class="tombol-garis" @click="bukaForm(u); detailId = null"><Ikon nama="Pencil" :ukuran="16" class="text-biru" /> Ubah</button>
        <button class="tombol-utama !bg-emerald-600" @click="bukaWa(u)"><Ikon nama="MessageCircle" :ukuran="16" /> WhatsApp</button>
      </template>
    </Lembar>

    <KirimWaKas v-if="wa" :nama="wa.nama" :no="wa.no" :jenis="['utang']" :data="wa.data" :acuan="wa.acuan" @tutup="wa = null" />

    <CetakSurat v-if="kw" :judul="`Kwitansi ${kw.no}`" @tutup="kw = null">
      <template #default="{ profil, pejabat }">
        <DokKwitansiSetoran :profil="profil" :k="kw" :penerima="kw.piutang ? pejabat('bendahara_bosp', kw.tanggal) : { nama: kw.pihak }" :label-penerima="kw.piutang ? 'Yang menerima, Bendahara' : 'Yang menerima,'" />
      </template>
    </CetakSurat>

    <CetakBuku v-if="cetak" :judul="`Daftar ${ARAH[arah].label}`" :subjudul="`${status === 'berjalan' ? 'Belum lunas' : status === 'lunas' ? 'Lunas' : 'Semua'} · per ${tanggalPanjang(hariIni())} · di luar Dana BOSP`" :kolom="kolom" :baris="hasil" excel orientasi="landscape" kecil
               :ringkasan="[['Total pinjaman', jumlah(hasil, 'nilai')], ['Telah dibayar', jumlah(hasil, 'dibayar')], ['Sisa', jumlah(hasil, 'sisa')]]"
               :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Pengelola,' }" @excel="excel" @tutup="cetak = false" />
  </div>
</template>
