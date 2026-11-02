<script setup>
// Buku kas per pos: kelola pos (nama, ikon, warna, nominal bawaan, saldo awal) dan catat pemasukan/pengeluaran.
// Setoran tagihan & utang piutang yang terhubung tercatat otomatis (ikon gembok, diubah dari menunya).
import InputAngka from '@/components/InputAngka.vue'
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pakaiKasLain } from './pakaiKasLain'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { useTahun } from '@/stores/tahun'
import { JENIS_POS, WARNA_POS, IKON_POS, bukuPos } from '@/utils/kasLain'
import { rupiah, rupiahRingkas, tanggalPendek } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import Lembar from './Lembar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const notif = useNotifikasi()
const ta = useTahun()
const kl = pakaiKasLain()
const { posUrut, transaksi, hariIni } = kl

const pilih = ref(route.query.pos || '')
watch(posUrut, (d) => { if (!d.some((p) => p.id === pilih.value)) pilih.value = d[0]?.id || '' }, { immediate: true })
watch(pilih, (v) => router.replace({ query: v ? { pos: v } : {} }))
const p = computed(() => posUrut.value.find((x) => x.id === pilih.value))
const w = computed(() => WARNA_POS[p.value?.warna] || WARNA_POS.biru)

const tahun = ref(ta.aktif || new Date().getFullYear())
const daftarTahun = computed(() => [...new Set([...(ta.daftar || []), new Date().getFullYear(), ...transaksi.value.map((t) => Number(String(t.tanggal).slice(0, 4)))])].filter(Boolean).sort((a, b) => b - a))
const buku = computed(() => (p.value ? bukuPos(p.value, transaksi.value, `${tahun.value}-01-01`, `${tahun.value}-12-31`) : null))
const cari = ref('')
const tampil = computed(() => (buku.value ? [...buku.value.baris].reverse().filter((x) => !cari.value || `${x.uraian} ${x.pihak || ''} ${x.no_bukti || ''}`.toLowerCase().includes(cari.value.toLowerCase())) : []))
const otomatis = (x) => !!(x.tagihan_id || x.utang_id)

/* ---------- Form pos ---------- */
const formPos = ref(false)
const fp = reactive({})
function bukaPos(x = null) {
  Object.assign(fp, { id: null, nama: '', jenis: 'iuran', ikon: 'WalletCards', warna: 'biru', periode: 'bulanan', nominal: 0, saldo_awal: 0, ket: '', aktif: true, urut: posUrut.value.length }, x ? { ...x } : {})
  formPos.value = true
}
async function simpanPos() {
  if (!fp.nama.trim()) return notif.kabari('Isi nama pos.', 'galat')
  const { id, ...data } = fp
  try {
    const k = await kl.simpanPos(id, { ...data, nama: data.nama.trim(), nominal: Math.round(Number(data.nominal) || 0), saldo_awal: Math.round(Number(data.saldo_awal) || 0) })
    pilih.value = k; formPos.value = false; notif.kabari('Pos disimpan.')
  } catch (e) { notif.kabari(e.message, 'galat') }
}
async function hapusPos() {
  if (!confirm(`Hapus pos "${fp.nama}"?`)) return
  try { await kl.hapusPos(fp); formPos.value = false } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Form transaksi ---------- */
const formT = ref(false)
const ft = reactive({})
function bukaT(jenis = 'masuk', x = null) {
  Object.assign(ft, { id: null, jenis, tanggal: hariIni(), nilai: 0, uraian: '', pihak: '', no_bukti: '' }, x ? { ...x } : {})
  formT.value = true
}
async function simpanT() {
  if (!ft.uraian.trim() || !ft.tanggal || !(Number(ft.nilai) > 0)) return notif.kabari('Isi tanggal, uraian, dan nilai.', 'galat')
  const { id, masuk, keluar, saldo, ...data } = ft
  try { await kl.simpanTransaksi(id, { ...data, pos_id: p.value.id, uraian: data.uraian.trim() }); formT.value = false } catch (e) { notif.kabari(e.message, 'galat') }
}
async function hapusT(x) {
  if (!confirm(`Hapus "${x.uraian}"?`)) return
  try { await kl.hapusTransaksi(x) } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Cetak & Excel ---------- */
const kolom = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'No. Bukti', nilai: (r) => r.no_bukti || '', lebar: '3cm' },
  { judul: 'Uraian', nilai: (r) => r.uraian },
  { judul: 'Masuk', nilai: (r) => r.masuk, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Keluar', nilai: (r) => r.keluar, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (r) => r.saldo, lebar: '2.9cm', uang: true },
]
const cetak = ref(false)
async function excel() {
  try { await eksporExcel({ judul: `Buku Kas ${p.value.nama} ${tahun.value}`, namaBerkas: `Buku Kas ${p.value.nama} ${tahun.value}`, baris: buku.value.baris, kolom: kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : k.judul === 'Uraian' ? 50 : 14, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Pilih pos -->
    <div class="kartu flex gap-2 overflow-x-auto p-2 tanpa-penggulir" data-tur="kaslain-pilih-pos">
      <button v-for="x in posUrut" :key="x.id" :class="['flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition', pilih === x.id ? 'bg-biru/10 text-biru ring-1 ring-biru/30 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800', x.aktif === false && 'opacity-50']"
              @click="pilih = x.id">
        <span :class="['grid h-7 w-7 place-items-center rounded-lg', (WARNA_POS[x.warna] || WARNA_POS.biru).chip]"><Ikon :nama="x.ikon || 'WalletCards'" :ukuran="15" /></span>{{ x.nama }}
      </button>
      <button v-if="auth.isAdmin" class="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 hover:border-biru hover:text-biru dark:border-slate-600" @click="bukaPos()"><Ikon nama="Plus" :ukuran="16" /> Pos baru</button>
    </div>

    <p v-if="!p" class="kartu p-8 text-center text-sm text-slate-500">Belum ada pos. {{ auth.isAdmin ? 'Tekan "Pos baru" atau pasang pos bawaan di tab Ringkasan.' : '' }}</p>
    <template v-else>
      <section class="kartu overflow-hidden">
        <div class="h-1.5" :style="{ background: w.garis }" />
        <div class="flex flex-wrap items-center gap-3 p-4">
          <span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-2xl', w.chip]"><Ikon :nama="p.ikon || 'WalletCards'" :ukuran="23" /></span>
          <div class="min-w-0 flex-1">
            <h2 class="font-extrabold">{{ p.nama }} <span v-if="p.aktif === false" class="lencana bg-slate-100 text-slate-500 dark:bg-slate-800">Nonaktif</span></h2>
            <p class="text-xs text-slate-500">{{ JENIS_POS[p.jenis]?.label }}{{ p.nominal ? ` · ${rupiah(p.nominal)}/orang ${p.periode === 'bulanan' ? 'per bulan' : ''}` : '' }}{{ p.ket ? ` · ${p.ket}` : '' }}</p>
          </div>
          <button v-if="auth.isAdmin" class="tombol-garis" @click="bukaPos(p)"><Ikon nama="Settings" :ukuran="16" class="text-biru" /> Atur pos</button>
        </div>
        <div class="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
          <div v-for="[l, n, c] in [['Saldo awal ' + tahun, buku.awal, ''], ['Masuk', buku.masuk, 'text-emerald-600'], ['Keluar', buku.keluar, 'text-rose-600'], ['Saldo akhir', buku.akhir, 'text-biru dark:text-blue-300']]" :key="l" class="min-w-0 bg-white p-3 dark:bg-slate-900">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ l }}</p>
            <p :class="['angka truncate font-extrabold', c]" :title="rupiah(n)">{{ rupiah(n) }}</p>
          </div>
        </div>
      </section>

      <div class="kartu flex flex-wrap items-center gap-2 p-3">
        <select v-model.number="tahun" class="masukan w-auto py-2" aria-label="Tahun"><option v-for="t in daftarTahun" :key="t" :value="t">{{ t }}</option></select>
        <div class="relative min-w-[10rem] flex-1"><Ikon nama="Search" :ukuran="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari uraian / pihak" aria-label="Cari" /></div>
        <button class="tombol-garis" aria-label="Excel" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /></button>
        <button class="tombol-garis" aria-label="Cetak" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /></button>
        <template v-if="auth.isAdmin">
          <button class="tombol-garis" data-tur="kaslain-keluar" @click="bukaT('keluar')"><Ikon nama="ArrowUpRight" :ukuran="17" class="text-rose-600" /> Keluar</button>
          <button class="tombol-utama" @click="bukaT('masuk')"><Ikon nama="ArrowDownLeft" :ukuran="17" /> Masuk</button>
        </template>
      </div>

      <section class="kartu overflow-hidden">
        <p v-if="!tampil.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="NotebookTabs" class="mx-auto mb-2 text-slate-400" /> Belum ada transaksi tahun {{ tahun }}.</p>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="x in tampil" :key="x.id" class="flex items-center gap-3 px-4 py-3">
            <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl', x.jenis === 'masuk' ? 'ikon-chip-sukses' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300']"><Ikon :nama="x.jenis === 'masuk' ? 'ArrowDownLeft' : 'ArrowUpRight'" :ukuran="16" /></span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold leading-snug">{{ x.uraian }}</p>
              <p class="truncate text-xs text-slate-500">{{ tanggalPendek(x.tanggal) }}{{ x.no_bukti ? ` · ${x.no_bukti}` : '' }}{{ x.pihak && !x.uraian.includes(x.pihak) ? ` · ${x.pihak}` : '' }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p :class="['angka text-sm font-bold', x.masuk ? 'text-emerald-600' : 'text-rose-600']">{{ x.masuk ? '+' : '−' }}{{ rupiah(x.masuk || x.keluar) }}</p>
              <p class="angka text-[11px] text-slate-400">saldo {{ rupiahRingkas(x.saldo) }}</p>
            </div>
            <span v-if="otomatis(x)" class="shrink-0 text-slate-300" :title="x.tagihan_id ? 'Dari setoran tagihan' : 'Dari utang piutang'"><Ikon nama="Lock" :ukuran="15" /></span>
            <template v-else-if="auth.isAdmin">
              <button class="shrink-0 text-slate-400 hover:text-biru" :aria-label="`Ubah ${x.uraian}`" @click="bukaT(x.jenis, x)"><Ikon nama="Pencil" :ukuran="16" /></button>
              <button class="shrink-0 text-slate-400 hover:text-rose-600" :aria-label="`Hapus ${x.uraian}`" @click="hapusT(x)"><Ikon nama="Trash2" :ukuran="16" /></button>
            </template>
          </li>
        </ul>
      </section>
    </template>

    <!-- Form transaksi -->
    <Lembar v-if="formT" :judul="`${ft.id ? 'Ubah' : 'Catat'} ${ft.jenis === 'masuk' ? 'pemasukan' : 'pengeluaran'}`" :sub="p?.nama" :ikon="ft.jenis === 'masuk' ? 'ArrowDownLeft' : 'ArrowUpRight'" :chip="ft.jenis === 'masuk' ? 'ikon-chip-sukses' : 'bg-rose-100 text-rose-600'" @tutup="formT = false">
      <div class="grid grid-cols-2 gap-2">
        <button v-for="[k, l, i] in [['masuk', 'Masuk', 'ArrowDownLeft'], ['keluar', 'Keluar', 'ArrowUpRight']]" :key="k" type="button" :class="['flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold', ft.jenis === k ? (k === 'masuk' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/30') : 'border-slate-200 dark:border-slate-700']" @click="ft.jenis = k"><Ikon :nama="i" :ukuran="15" /> {{ l }}</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="t-tgl">Tanggal</label><input id="t-tgl" v-model="ft.tanggal" type="date" class="masukan" /></div>
        <div><label class="label" for="t-nilai">Nilai (Rp)</label><InputAngka id="t-nilai" v-model="ft.nilai" class="masukan" :desimal="0" /></div>
      </div>
      <div><label class="label" for="t-uraian">Uraian</label><input id="t-uraian" v-model="ft.uraian" class="masukan" :placeholder="ft.jenis === 'masuk' ? 'mis. Setoran tanpa tagihan, sumbangan' : 'mis. Santunan duka, penyaluran zakat ke BAZNAS'" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="t-pihak">{{ ft.jenis === 'masuk' ? 'Dari' : 'Kepada' }}</label><input id="t-pihak" v-model="ft.pihak" class="masukan" list="kl-orang" placeholder="opsional" /></div>
        <div><label class="label" for="t-bukti">No. bukti</label><input id="t-bukti" v-model="ft.no_bukti" class="masukan" placeholder="opsional" /></div>
      </div>
      <datalist id="kl-orang"><option v-for="o in kl.orang.value" :key="o.id" :value="o.nama" /></datalist>
      <template #kaki><button class="tombol-garis" @click="formT = false">Batal</button><button class="tombol-utama" @click="simpanT"><Ikon nama="Save" :ukuran="17" /> Simpan</button></template>
    </Lembar>

    <!-- Form pos -->
    <Lembar v-if="formPos" :judul="fp.id ? 'Atur pos' : 'Pos baru'" sub="Pos kas di luar Dana BOSP" ikon="WalletCards" :chip="(WARNA_POS[fp.warna] || WARNA_POS.biru).chip" @tutup="formPos = false">
      <div><label class="label" for="p-nama">Nama pos</label><input id="p-nama" v-model="fp.nama" class="masukan" placeholder="mis. Uang Arisan" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="p-jenis">Jenis</label><select id="p-jenis" v-model="fp.jenis" class="masukan"><option v-for="(j, k) in JENIS_POS" :key="k" :value="k">{{ j.label }}</option></select></div>
        <div><label class="label" for="p-per">Penagihan</label><select id="p-per" v-model="fp.periode" class="masukan"><option value="bulanan">Bulanan</option><option value="sekali">Sekali / tidak tentu</option></select></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label" for="p-nom">Nominal bawaan / orang</label><InputAngka id="p-nom" v-model="fp.nominal" class="masukan" :desimal="0" /></div>
        <div><label class="label" for="p-saldo">Saldo awal</label><InputAngka id="p-saldo" v-model="fp.saldo_awal" class="masukan" :desimal="0" /></div>
      </div>
      <div>
        <p class="label">Warna</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="(x, k) in WARNA_POS" :key="k" type="button" :aria-label="k" :class="['h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-slate-900', fp.warna === k && 'ring-2 ring-slate-500']" :style="{ background: x.garis }" @click="fp.warna = k" />
        </div>
      </div>
      <div>
        <p class="label">Ikon</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="i in IKON_POS" :key="i" type="button" :aria-label="i" :class="['grid h-9 w-9 place-items-center rounded-xl border', fp.ikon === i ? 'border-biru bg-biru/10 text-biru' : 'border-slate-200 text-slate-500 dark:border-slate-700']" @click="fp.ikon = i"><Ikon :nama="i" :ukuran="17" /></button>
        </div>
      </div>
      <div><label class="label" for="p-ket">Keterangan</label><input id="p-ket" v-model="fp.ket" class="masukan" placeholder="opsional" /></div>
      <label class="flex items-center gap-2 text-sm"><input v-model="fp.aktif" type="checkbox" class="h-4 w-4 accent-[#1A62E8]" /> Pos aktif (tampil saat membuat tagihan)</label>
      <template #kaki>
        <button v-if="fp.id" class="tombol-garis mr-auto text-rose-600" @click="hapusPos"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
        <button class="tombol-garis" @click="formPos = false">Batal</button><button class="tombol-utama" @click="simpanPos"><Ikon nama="Save" :ukuran="17" /> Simpan</button>
      </template>
    </Lembar>

    <CetakBuku v-if="cetak && p" :judul="`Buku Kas ${p.nama}`" :subjudul="`Tahun ${tahun} · di luar Dana BOSP`" :kolom="kolom" :baris="buku.baris" excel orientasi="portrait" kecil
               :ringkasan="[['Saldo awal', buku.awal], ['Masuk', buku.masuk], ['Keluar', buku.keluar], ['Saldo akhir', buku.akhir]]"
               :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Pengelola,' }" @excel="excel" @tutup="cetak = false" />
  </div>
</template>
