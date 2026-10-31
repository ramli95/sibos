<script setup>
// Buku Kas Umum / Buku Bank / Kas Tunai: baris otomatis dari belanja, pajak, setoran + baris kas manual.
import { ref, computed, watch } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanKas, hapusKas, ubahBelanjaKas } from '@/services/kas'
import { ringkasanBulan, kolomExcel } from '@/utils/bku'
import { JENIS_KAS, JENIS_BKU } from '@/config/pajak'
import { rupiah, rupiahRingkas, tanggalPendek, NAMA_BULAN, dariIso, keIso } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import Laci from '@/components/Laci.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'
import AsistenPajak from '../pajak/AsistenPajak.vue'

const props = defineProps({ buku: { type: String, default: 'bku' } })
const kas = useKas()
const belanja = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()

const JUDUL = { bku: 'Buku Kas Umum', bank: 'Buku Pembantu Bank', tunai: 'Buku Pembantu Kas Tunai' }
const sekarang = new Date()
const bulan = ref(kas.tahun === sekarang.getFullYear() ? sekarang.getMonth() : '')
watch(() => kas.tahun, (t) => { bulan.value = t === sekarang.getFullYear() ? sekarang.getMonth() : '' })
const cari = ref('')

const semua = computed(() => kas[props.buku])
const awalBulan = computed(() => (bulan.value === '' ? null : `${kas.tahun}-${String(Number(bulan.value) + 1).padStart(2, '0')}-01`))
const saldoAwal = computed(() => { if (!awalBulan.value) return 0; const s = semua.value.filter((r) => r.tanggal < awalBulan.value); return s.at(-1)?.saldo || 0 })
const dalam = computed(() => (bulan.value === '' ? semua.value : semua.value.filter((r) => dariIso(r.tanggal)?.getMonth() === Number(bulan.value))))
const baris = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return q ? dalam.value.filter((r) => [r.uraian, r.bnu, r.kode_rekening, r.kode_kegiatan, r.pihak].some((v) => String(v || '').toLowerCase().includes(q))) : dalam.value
})
const jml = (k) => dalam.value.reduce((s, r) => s + (r[k] || 0), 0)
const saldoAkhir = computed(() => saldoAwal.value + jml('masuk') - jml('keluar'))
const tanpaBnu = computed(() => dalam.value.filter((r) => !r.bnu && (r.jenis === 'belanja' || r.jenis === 'terima_pajak' || r.jenis === 'setor_pajak')).length)
const statistik = computed(() => [
  { judul: 'Saldo awal', nilai: rupiahRingkas(saldoAwal.value), ikon: 'PiggyBank', nada: 'gelap', ringkas: true, sub: rupiah(saldoAwal.value) },
  { judul: 'Penerimaan', nilai: rupiahRingkas(jml('masuk')), ikon: 'ArrowDownLeft', nada: 'primer', ringkas: true, sub: `${rupiah(jml('masuk'))} · ${dalam.value.filter((r) => r.masuk).length} baris` },
  { judul: 'Pengeluaran', nilai: rupiahRingkas(jml('keluar')), ikon: 'ArrowUpRight', nada: 'primer', ringkas: true, sub: `${rupiah(jml('keluar'))} · ${dalam.value.filter((r) => r.keluar).length} baris` },
  { judul: 'Saldo akhir', nilai: rupiahRingkas(saldoAkhir.value), ikon: props.buku === 'tunai' ? 'Banknote' : 'Landmark', nada: 'primer', ringkas: true, sub: `${rupiah(saldoAkhir.value)}${tanpaBnu.value ? ` · ${tanpaBnu.value} belum ber-BNU` : ''}` },
])

const titik = (r) => (r.jenis === 'belanja' ? 'bg-biru' : r.jenis === 'terima_pajak' || r.jenis === 'setor_pajak' ? 'bg-[#E3A414]' : r.masuk ? 'bg-[#22A08D]' : 'bg-slate-400')

/* ---------- Detail baris ---------- */
const pilih = ref(null)
const belanjaPilih = computed(() => (pilih.value?.ref?.tipe === 'belanja' || pilih.value?.ref?.tipe === 'pajak') ? belanja.daftar.find((b) => b.id === (pilih.value.ref.id_belanja || pilih.value.ref.id)) : null)
const ubah = ref({})
function buka(r) {
  pilih.value = r
  if (r.ref.tipe === 'kas') ubah.value = { ...kas.kas.find((k) => k.id === r.ref.id) }
  else if (r.ref.tipe === 'belanja') { const b = belanja.daftar.find((x) => x.id === r.ref.id); ubah.value = { bnu: b?.bnu?.[r.ref.kunci] || '', cara_bayar: b?.cara_bayar || 'bank' } }
  else if (r.ref.tipe === 'pajak') ubah.value = { bnu_terima: r.bnu || '' }
  else ubah.value = {}
}
const menyimpan = ref(false)
async function simpanBaris() {
  const r = pilih.value
  menyimpan.value = true
  try {
    if (r.ref.tipe === 'belanja') {
      const b = belanjaPilih.value
      const isi = { bnu: { ...(b.bnu || {}), [r.ref.kunci]: String(ubah.value.bnu || '').trim() }, cara_bayar: ubah.value.cara_bayar }
      await ubahBelanjaKas(b, isi, `Mengubah BNU ${r.ref.kunci} menjadi ${isi.bnu[r.ref.kunci] || '-'} / dibayar ${isi.cara_bayar}`)
      belanja.ganti({ ...b, ...isi })
    } else if (r.ref.tipe === 'pajak') {
      const b = belanjaPilih.value
      const p = kas.kewajiban.find((x) => x.id === r.ref.id)
      const pajak = (b.pajak || []).map((x) => ((x.kunci || '') === p.kunci || x.jenis === p.jenis ? { ...x, bnu_terima: String(ubah.value.bnu_terima || '').trim() } : x))
      await ubahBelanjaKas(b, { pajak }, `Mengubah BNU penerimaan ${p.jenis}`)
      belanja.ganti({ ...b, pajak })
    } else if (r.ref.tipe === 'kas') {
      await simpanKas(r.ref.id, bersihKas(ubah.value))
      await kas.segarkan()
    }
    notif.kabari('Baris buku kas diperbarui.')
    pilih.value = null
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

/* ---------- Kas manual ---------- */
const formBaru = ref(null)
const jenisBoleh = computed(() => (props.buku === 'tunai' ? ['tarik_tunai', 'setor_tunai', 'lainnya_keluar', 'pengembalian'] : Object.keys(JENIS_KAS)))
function baru() {
  const j = props.buku === 'tunai' ? 'tarik_tunai' : 'terima_dana'
  formBaru.value = { tanggal: keIso(), jenis: j, bnu: '', uraian: '', nilai: '', sumber: props.buku === 'tunai' ? 'tunai' : 'bank', kode_kegiatan: '', kode_rekening: '' }
}
function bersihKas(f) {
  const { id: _i, diperbarui: _d, diperbarui_oleh: _o, ...isi } = f
  return { ...isi, uraian: String(f.uraian || '').trim() || JENIS_KAS[f.jenis]?.label, nilai: Math.round(Number(f.nilai) || 0) }
}
async function simpanBaru() {
  const f = formBaru.value
  if (!f.tanggal || !(Number(f.nilai) > 0)) { notif.kabari('Isi tanggal dan nilai.', 'galat'); return }
  if (!String(f.tanggal).startsWith(String(kas.tahun))) { notif.kabari(`Tanggal harus di tahun ${kas.tahun}.`, 'galat'); return }
  menyimpan.value = true
  try { await simpanKas(null, bersihKas(f)); notif.kabari('Baris kas tercatat.'); formBaru.value = null; await kas.segarkan() } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapusBaris() {
  if (!confirm('Hapus baris kas ini?')) return
  try { await hapusKas(kas.kas.find((k) => k.id === pilih.value.ref.id)); pilih.value = null; await kas.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}
const asisten = ref(null)

/* ---------- Cetak & Excel ---------- */
const periode = computed(() => (bulan.value === '' ? `Tahun Anggaran ${kas.tahun}` : `Bulan ${NAMA_BULAN[bulan.value]} ${kas.tahun}`))
const tglAkhir = computed(() => (bulan.value === '' ? `${kas.tahun}-12-31` : keIso(new Date(kas.tahun, Number(bulan.value) + 1, 0))))
const kolom = computed(() => [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2cm', rata: 'tengah' },
  ...(props.buku === 'bku' ? [{ judul: 'Kode Kegiatan', nilai: (r) => r.kode_kegiatan, lebar: '2.1cm', kode: true }, { judul: 'Kode Rekening', nilai: (r) => r.kode_rekening, lebar: '3.2cm', kode: true }] : []),
  { judul: 'No. Bukti', nilai: (r) => r.bnu, lebar: '2cm', kode: true },
  { judul: 'Uraian', nilai: (r) => r.uraian + (r.pindah ? ' (pemindahbukuan)' : '') },
  { judul: 'Penerimaan', nilai: (r) => r.masuk, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Pengeluaran', nilai: (r) => r.keluar, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (r) => r.saldo, lebar: '2.9cm', uang: true },
])
const ringkasCetak = computed(() => {
  const r = bulan.value === '' ? null : ringkasanBulan(kas.baris, Number(bulan.value), kas.tahun)
  return [['Saldo awal', saldoAwal.value], ['Jumlah penerimaan', jml('masuk')], ['Jumlah pengeluaran', jml('keluar')], ['Saldo akhir', saldoAkhir.value],
    ...(props.buku === 'bku' && r ? [['— terdiri dari saldo bank', r.saldo_bank], ['— terdiri dari saldo kas tunai', r.saldo_tunai]] : [])]
})
const cetak = ref(false)
async function excel() {
  try { await eksporExcel({ judul: `${JUDUL[props.buku]} ${periode.value}`.slice(0, 80), namaBerkas: `${JUDUL[props.buku]} ${periode.value}`, baris: baris.value, kolom: kolomExcel(kolom.value) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" />

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <select v-model="bulan" class="masukan w-auto py-2.5" aria-label="Bulan"><option value="">Setahun</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <div class="relative min-w-[11rem] flex-1"><Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari uraian, BNU, rekening…" /></div>
      <button class="tombol-garis" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /> <span class="hidden sm:inline">Excel</span></button>
      <button class="tombol-garis" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Cetak / PDF</span></button>
      <button v-if="auth.isAdmin" class="tombol-utama" @click="baru"><Ikon nama="CirclePlus" :ukuran="17" /> <span>{{ props.buku === 'tunai' ? 'Tarik/setor tunai' : 'Catat kas' }}</span></button>
    </div>

    <div class="kartu overflow-hidden">
      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60"><tr>
            <th class="px-3 py-2.5 text-left">Tanggal</th><th v-if="props.buku === 'bku'" class="px-3 py-2.5 text-left">Kode</th><th class="px-3 py-2.5 text-left">Bukti</th><th class="px-3 py-2.5 text-left">Uraian</th>
            <th class="px-3 py-2.5 text-right">Penerimaan</th><th class="px-3 py-2.5 text-right">Pengeluaran</th><th class="px-3 py-2.5 text-right">Saldo</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="bulan !== ''" class="bg-slate-50/60 dark:bg-slate-800/30"><td :colspan="props.buku === 'bku' ? 4 : 3" class="px-3 py-2 font-semibold">Saldo awal {{ NAMA_BULAN[bulan] }}</td><td /><td /><td class="angka px-3 py-2 text-right font-semibold">{{ rupiah(saldoAwal, { tanpaRp: true }) }}</td></tr>
            <tr v-for="r in baris" :key="r.id" class="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="buka(r)">
              <td class="whitespace-nowrap px-3 py-2">{{ tanggalPendek(r.tanggal) }}</td>
              <td v-if="props.buku === 'bku'" class="kode whitespace-nowrap px-3 py-2 text-xs text-slate-500">{{ r.kode_kegiatan }}<br />{{ r.kode_rekening }}</td>
              <td class="kode whitespace-nowrap px-3 py-2 text-xs"><span v-if="r.bnu">{{ r.bnu }}</span><span v-else-if="['belanja', 'terima_pajak', 'setor_pajak'].includes(r.jenis)" class="text-amber-600">belum</span></td>
              <td class="px-3 py-2"><span :class="['mr-1.5 inline-block h-2 w-2 rounded-full', titik(r)]" />{{ r.uraian }}<span v-if="r.pindah" class="ml-1 text-xs text-slate-400">(pemindahbukuan {{ rupiah(Math.abs(r.bank)) }})</span><span v-if="r.pihak" class="block text-xs text-slate-500">{{ r.pihak }}</span></td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ r.masuk ? rupiah(r.masuk, { tanpaRp: true }) : '' }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right">{{ r.keluar ? rupiah(r.keluar, { tanpaRp: true }) : '' }}</td>
              <td class="angka whitespace-nowrap px-3 py-2 text-right font-semibold">{{ rupiah(r.saldo, { tanpaRp: true }) }}</td>
            </tr>
            <tr v-if="!baris.length"><td colspan="7" class="px-3 py-8 text-center text-slate-500">Tidak ada transaksi pada periode ini.</td></tr>
          </tbody>
          <tfoot v-if="baris.length" class="bg-slate-50 font-bold dark:bg-slate-800/60"><tr>
            <td :colspan="props.buku === 'bku' ? 4 : 3" class="px-3 py-2.5">Jumlah</td><td class="angka px-3 py-2.5 text-right">{{ rupiah(jml('masuk'), { tanpaRp: true }) }}</td>
            <td class="angka px-3 py-2.5 text-right">{{ rupiah(jml('keluar'), { tanpaRp: true }) }}</td><td class="angka px-3 py-2.5 text-right">{{ rupiah(saldoAkhir, { tanpaRp: true }) }}</td></tr></tfoot>
        </table>
      </div>
      <div class="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        <button v-for="r in baris" :key="r.id" type="button" class="flex w-full items-start gap-3 p-3 text-left active:bg-slate-50 dark:active:bg-slate-800/40" @click="buka(r)">
          <span :class="['mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl', r.jenis === 'belanja' ? 'ikon-chip' : r.jenis.includes('pajak') ? 'ikon-chip-kuning' : 'ikon-chip-tosca']"><Ikon :nama="JENIS_BKU[r.jenis]?.ikon || 'Banknote'" :ukuran="17" /></span>
          <div class="min-w-0 flex-1">
            <p class="line-clamp-2 text-sm">{{ r.uraian }}</p>
            <p class="truncate text-xs text-slate-500">{{ tanggalPendek(r.tanggal) }} · <span :class="!r.bnu && ['belanja', 'terima_pajak', 'setor_pajak'].includes(r.jenis) && 'text-amber-600'">{{ r.bnu || (['belanja', 'terima_pajak', 'setor_pajak'].includes(r.jenis) ? 'BNU belum' : '-') }}</span> · saldo {{ rupiah(r.saldo) }}</p>
          </div>
          <b :class="['angka shrink-0 text-sm', r.masuk ? 'text-[#167A6C] dark:text-[#5FD3C0]' : '']">{{ r.pindah ? '⇄' : r.masuk ? '+' : '−' }}{{ rupiah(r.masuk || r.keluar || Math.abs(r.bank)) }}</b>
        </button>
        <p v-if="!baris.length" class="p-8 text-center text-sm text-slate-500">Tidak ada transaksi pada periode ini.</p>
      </div>
    </div>

    <!-- Detail / ubah baris -->
    <Laci v-if="pilih" :judul="JENIS_BKU[pilih.jenis]?.label || 'Baris kas'" :subjudul="`${tanggalPendek(pilih.tanggal)} · ${rupiah(pilih.masuk || pilih.keluar || Math.abs(pilih.bank))}`" :ikon="JENIS_BKU[pilih.jenis]?.ikon || 'Banknote'" @tutup="pilih = null">
      <div class="space-y-4 p-5">
        <p class="text-sm">{{ pilih.uraian }}</p>
        <template v-if="pilih.ref.tipe === 'belanja'">
          <p class="kode text-xs text-slate-500">{{ pilih.kode_kegiatan }} / {{ pilih.kode_rekening }}</p>
          <div><label class="label" for="ub-bnu">Nomor bukti (BNU ARKAS)</label><input id="ub-bnu" v-model="ubah.bnu" class="masukan kode" placeholder="BNU …" :disabled="!auth.isAdmin" /></div>
          <div><label class="label" for="ub-cara">Dibayar dari</label><select id="ub-cara" v-model="ubah.cara_bayar" class="masukan" :disabled="!auth.isAdmin"><option value="bank">Rekening bank (transfer/non-tunai)</option><option value="tunai">Kas tunai</option></select></div>
          <div class="flex flex-wrap gap-2">
            <RouterLink :to="`/belanja/lihat/${pilih.ref.id}`" class="tombol-garis"><Ikon nama="ExternalLink" :ukuran="16" class="text-biru" /> Buka transaksi</RouterLink>
            <button v-if="belanjaPilih" class="tombol-garis" @click="asisten = belanjaPilih"><Ikon nama="Calculator" :ukuran="16" class="text-[#22A08D]" /> Asisten Pajak</button>
          </div>
        </template>
        <template v-else-if="pilih.ref.tipe === 'pajak'">
          <div><label class="label" for="ub-bnut">BNU penerimaan pajak (ARKAS)</label><input id="ub-bnut" v-model="ubah.bnu_terima" class="masukan kode" :disabled="!auth.isAdmin" /></div>
          <button v-if="belanjaPilih" class="tombol-garis" @click="asisten = belanjaPilih"><Ikon nama="Calculator" :ukuran="16" class="text-[#22A08D]" /> Asisten Pajak</button>
        </template>
        <template v-else-if="pilih.ref.tipe === 'setoran'">
          <p class="text-sm text-slate-500">Setoran pajak diubah di menu Pajak (kode billing, NTPN, BNU).</p>
          <RouterLink to="/pajak/terutang" class="tombol-garis"><Ikon nama="ReceiptText" :ukuran="16" class="text-biru" /> Ke Pajak Terutang</RouterLink>
        </template>
        <template v-else-if="pilih.ref.tipe === 'kas'">
          <div class="grid gap-3 sm:grid-cols-2">
            <div><label class="label" for="uk-tgl">Tanggal</label><input id="uk-tgl" v-model="ubah.tanggal" type="date" class="masukan" :disabled="!auth.isAdmin" /></div>
            <div><label class="label" for="uk-jenis">Jenis</label><select id="uk-jenis" v-model="ubah.jenis" class="masukan" :disabled="!auth.isAdmin"><option v-for="(v, k) in JENIS_KAS" :key="k" :value="k">{{ v.label }}</option></select></div>
            <div><label class="label" for="uk-bnu">BNU</label><input id="uk-bnu" v-model="ubah.bnu" class="masukan kode" :disabled="!auth.isAdmin" /></div>
            <div><label class="label" for="uk-nilai">Nilai</label><input id="uk-nilai" v-model.number="ubah.nilai" type="number" class="masukan angka" :disabled="!auth.isAdmin" /></div>
          </div>
          <div><label class="label" for="uk-ur">Uraian</label><input id="uk-ur" v-model="ubah.uraian" class="masukan" :disabled="!auth.isAdmin" /></div>
        </template>
      </div>
      <template v-if="auth.isAdmin && pilih.ref.tipe !== 'setoran'" #kaki>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpanBaris"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
        <button class="tombol-garis" @click="pilih = null">Batal</button>
        <button v-if="pilih.ref.tipe === 'kas'" class="tombol ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="hapusBaris"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
      </template>
    </Laci>

    <Laci v-if="formBaru" judul="Catat baris kas" subjudul="Penerimaan dana, bunga, pajak bunga, tarik/setor tunai, koreksi" ikon="CirclePlus" @tutup="formBaru = null">
      <div class="space-y-4 p-5">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button v-for="k in jenisBoleh" :key="k" type="button" @click="formBaru.jenis = k; formBaru.sumber = JENIS_KAS[k].sumber"
                  :class="['flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left text-xs font-semibold transition', formBaru.jenis === k ? 'border-biru bg-biru/5 text-biru dark:bg-blue-400/10 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700']">
            <Ikon :nama="JENIS_KAS[k].ikon" :ukuran="17" /> {{ JENIS_KAS[k].label }}
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="kb-tgl">Tanggal</label><input id="kb-tgl" v-model="formBaru.tanggal" type="date" class="masukan" /></div>
          <div><label class="label" for="kb-nilai">Nilai (Rp)</label><input id="kb-nilai" v-model="formBaru.nilai" type="number" inputmode="numeric" class="masukan angka" /></div>
          <div><label class="label" for="kb-bnu">BNU ARKAS</label><input id="kb-bnu" v-model="formBaru.bnu" class="masukan kode" /></div>
          <div v-if="!['tarik_tunai', 'setor_tunai'].includes(formBaru.jenis)"><label class="label" for="kb-src">Kas</label><select id="kb-src" v-model="formBaru.sumber" class="masukan"><option value="bank">Bank</option><option value="tunai">Tunai</option></select></div>
        </div>
        <div><label class="label" for="kb-ur">Uraian</label><input id="kb-ur" v-model="formBaru.uraian" class="masukan" :placeholder="JENIS_KAS[formBaru.jenis].label" /></div>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpanBaru"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
        <button class="tombol-garis" @click="formBaru = null">Batal</button>
      </template>
    </Laci>

    <AsistenPajak v-if="asisten" :belanja="asisten" @tutup="asisten = null" />
    <CetakBuku v-if="cetak" :judul="JUDUL[props.buku]" :subjudul="periode" :kolom="kolom" :baris="baris" :ringkasan="ringkasCetak" :tanggal="tglAkhir" excel kecil @excel="excel" @tutup="cetak = false" />
  </div>
</template>
