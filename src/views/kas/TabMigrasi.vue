<script setup>
// Migrasi transaksi tahun berjalan dari workbook Jurnal Dana BOS (.xlsx):
// buku kas (SIMAKDA/X ARKAS) → belanja Lunas + penerimaan; 📈 TAX → pajak & setoran; dB_Trima/dB_Honor → penerima honor.
import { ref, reactive, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanMigrasi, hapusMigrasi } from '@/services/kas'
import { modePratinjau } from '@/services/firebase'
import { bacaBerkas } from '@/utils/excel'
import { BIDANG_TRANSAKSI, BIDANG_PAJAK, BIDANG_PENERIMA, kenaliKolom, ambilBaris, susunMigrasi, angkaRingkasan, keIsoTanggal, keAngka } from '@/utils/migrasi'
import { TARGET_SEMESTER_1, WARNA_PAJAK } from '@/config/pajak'
import { rupiah, tanggalPendek, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const kas = useKas()
const belanja = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()

const lembar = ref([])
const namaBerkas = ref('')
const membaca = ref(false)
const masukan = ref(null)
const trx = reactive({ lembar: '', baris: 0, peta: {} })
const pjk = reactive({ lembar: '', baris: 0, peta: {}, aktif: true })
const sumberPenerima = ref([])  // [{ lembar, baris, peta, aktif }]
const penerimaan = ref([])
const opsi = reactive({ setorSama: true })
const acuan = ref([])
const buka = reactive({ trx: false, pjk: false, pen: false })

const cariLembar = (re) => lembar.value.find((l) => re.test(l.nama))?.nama || ''
const lembarDari = (nama) => lembar.value.find((l) => l.nama === nama)
function kenali(target, bidang) {
  const l = lembarDari(target.lembar)
  if (!l) return
  const k = kenaliKolom(l.baris, bidang)
  target.baris = k.baris
  target.peta = { ...k.peta }
}
async function pilihBerkas(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  membaca.value = true
  try {
    lembar.value = await bacaBerkas(f, { tersembunyi: true })
    namaBerkas.value = f.name
    trx.lembar = cariLembar(/simakda/i) || cariLembar(/arkas/i) || cariLembar(/db.?_?sampul/i) || lembar.value[0]?.nama || ''
    kenali(trx, BIDANG_TRANSAKSI)
    pjk.lembar = cariLembar(/\btax\b|pajak/i)
    pjk.aktif = !!pjk.lembar
    if (pjk.lembar) kenali(pjk, BIDANG_PAJAK)
    sumberPenerima.value = lembar.value.filter((l) => /db.?_?(trima|honor)/i.test(l.nama)).map((l) => { const s = reactive({ lembar: l.nama, baris: 0, peta: {}, aktif: true }); kenali(s, BIDANG_PENERIMA); return s })
    acuan.value = lembar.value.filter((l) => /arkas|simakda/i.test(l.nama)).map((l) => ({ nama: l.nama, ...(angkaRingkasan(l) || {}) })).filter((a) => a.sisa != null)
  } catch (err) { notif.kabari(err.message, 'galat') } finally { membaca.value = false }
}

const kolomPilihan = (target) => (lembarDari(target.lembar)?.baris[target.baris] || []).map((v, i) => ({ i, label: `${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''} · ${String(v ?? '').replace(/\s+/g, ' ').slice(0, 28) || '(kosong)'}` }))
const barisTrx = computed(() => (lembarDari(trx.lembar) ? ambilBaris(lembarDari(trx.lembar), trx.peta, trx.baris, BIDANG_TRANSAKSI) : []))
const barisPajak = computed(() => (pjk.aktif && lembarDari(pjk.lembar) ? ambilBaris(lembarDari(pjk.lembar), pjk.peta, pjk.baris, BIDANG_PAJAK) : []))
const barisPenerima = computed(() => sumberPenerima.value.filter((s) => s.aktif && lembarDari(s.lembar))
  .map((s) => ({ nama: s.lembar, baris: ambilBaris(lembarDari(s.lembar), s.peta, s.baris, BIDANG_PENERIMA, { isiKebawah: ['tanggal', 'kegiatan', 'jenis', 'kode_transaksi'] }) })))
const wajibKurang = computed(() => BIDANG_TRANSAKSI.filter((b) => b.wajib && (trx.peta[b.kunci] == null || trx.peta[b.kunci] === '')).map((b) => b.judul))

const paket = computed(() => (barisTrx.value.length && !wajibKurang.value.length
  ? susunMigrasi({ transaksi: barisTrx.value, pajak: barisPajak.value, penerima: barisPenerima.value, penerimaan: penerimaan.value, tahun: kas.tahun, ada: belanja.daftar, opsi })
  : null))
const ringkas = computed(() => {
  if (!paket.value) return null
  const p = paket.value
  const perBulan = Array(12).fill(0)
  p.belanja.forEach((b) => { perBulan[Number(b.tgl_lunas.slice(5, 7)) - 1] += b.total })
  const batas = `${kas.tahun}-07-01`
  const s1Belanja = p.belanja.filter((b) => b.tgl_lunas < batas).reduce((s, b) => s + b.total, 0)
  const s1Terima = p.kas.filter((k) => k.tanggal < batas).reduce((s, k) => s + (['pajak_bunga', 'biaya_bank', 'lainnya_keluar'].includes(k.jenis) ? -k.nilai : k.nilai), 0)
  const pajakBank = p.belanja.filter((b) => b.tgl_lunas < batas).flatMap((b) => b.pajak.filter((x) => x.cara === 'pungut' || x.cara === 'potong')).reduce((s, x) => s + x.nilai, 0)
  const setorBank = p.setoran.filter((s) => s.dari !== 'luar' && s.tanggal < batas).reduce((s, x) => s + x.total, 0)
  const pajak = {}
  p.belanja.forEach((b) => b.pajak.forEach((x) => { const k = `${x.jenis}|${x.cara}`; pajak[k] = (pajak[k] || 0) + x.nilai }))
  return { perBulan, total: p.belanja.reduce((s, b) => s + b.total, 0), s1Belanja, s1Terima, s1Saldo: s1Terima - s1Belanja + pajakBank - setorBank,
    honor: p.belanja.filter((b) => b.jenis === 'honor').length, siplah: p.belanja.filter((b) => b.cara === 'siplah').length,
    pajak: Object.entries(pajak).map(([k, v]) => ({ jenis: k.split('|')[0], cara: k.split('|')[1], nilai: v })) }
})
const CARA_LABEL = { mitra: 'mitra SIPLah', luar: 'luar rekening', pungut: 'dipungut', potong: 'dipotong' }

const menyimpan = ref(false)
const kemajuan = ref('')
async function simpan() {
  if (!paket.value) return
  const p = paket.value
  if (!confirm(`Simpan ${p.belanja.length} belanja, ${p.kas.length} baris kas dan ${p.setoran.length} setoran pajak hasil migrasi ke SIBOS?`)) return
  menyimpan.value = true
  try {
    await simpanMigrasi(p, { kemajuan: (a, b) => { kemajuan.value = `${a}/${b}` } })
    await kas.muat({ segar: true })
    notif.kabari('Migrasi tersimpan. Lanjutkan ke Rekening Koran lalu Uji Paralel.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false; kemajuan.value = '' }
}
const jumlahMigrasi = computed(() => belanja.daftar.filter((b) => b.sumber === 'migrasi').length)
async function hapusSemua() {
  if (!confirm(`Hapus SEMUA data hasil migrasi tahun ${kas.tahun} (belanja, kas, setoran bertanda migrasi)? Data yang dicatat langsung di SIBOS tidak terhapus.`)) return
  try { const n = await hapusMigrasi(kas.tahun); await kas.muat({ segar: true }); notif.kabari(`Data migrasi dihapus${n ? ` (${n} dokumen)` : ''}.`) } catch (e) { notif.kabari(e.message, 'galat') }
}
const pratinjau = computed(() => barisTrx.value.slice(0, 5))
</script>

<template>
  <div class="space-y-5">
    <section class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="DatabaseZap" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <h2 class="font-bold">Migrasi transaksi {{ kas.tahun }} dari Jurnal Dana BOS</h2>
        <p class="text-sm text-slate-500">Google Sheets → File → Download → Microsoft Excel (.xlsx). Lembar tersembunyi (mis. X ARKAS) ikut terbaca. Tidak ada yang tersimpan sebelum Bapak menekan “Simpan migrasi”.</p>
        <p v-if="jumlahMigrasi" class="mt-1 text-xs font-semibold text-[#167A6C] dark:text-[#5FD3C0]">{{ jumlahMigrasi }} belanja hasil migrasi sudah ada di SIBOS.</p>
      </div>
      <template v-if="auth.isAdmin">
        <input ref="masukan" type="file" accept=".xlsx,.csv" class="hidden" @change="pilihBerkas" />
        <button v-if="jumlahMigrasi || modePratinjau" class="tombol-garis text-rose-600" @click="hapusSemua"><Ikon nama="Trash2" :ukuran="16" /> <span class="hidden sm:inline">Hapus migrasi</span></button>
        <button class="tombol-utama" :disabled="membaca" @click="masukan.click()"><Ikon :nama="membaca ? 'RefreshCw' : 'FileUp'" :ukuran="17" :class="membaca && 'animate-spin'" /> {{ membaca ? 'Membaca…' : namaBerkas ? 'Ganti berkas' : 'Pilih berkas .xlsx' }}</button>
      </template>
    </section>

    <template v-if="lembar.length">
      <!-- Sumber yang dipakai -->
      <section class="kartu divide-y divide-slate-100 dark:divide-slate-800">
        <div class="p-4">
          <button type="button" class="flex w-full items-center gap-3 text-left" @click="buka.trx = !buka.trx">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ikon-chip"><Ikon nama="BookOpenText" :ukuran="17" /></span>
            <span class="min-w-0 flex-1"><b class="block">1. Buku kas: {{ trx.lembar || '—' }}</b><span class="text-xs text-slate-500">{{ barisTrx.length }} baris · pemasukan menjadi penerimaan dana, pengeluaran menjadi belanja Lunas</span></span>
            <Ikon nama="ChevronDown" :ukuran="17" :class="['text-slate-400 transition', buka.trx && 'rotate-180']" />
          </button>
          <div v-if="buka.trx || wajibKurang.length" class="mt-3 space-y-3">
            <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <select v-model="trx.lembar" class="masukan" aria-label="Lembar buku kas" @change="kenali(trx, BIDANG_TRANSAKSI)"><option v-for="l in lembar" :key="l.nama" :value="l.nama">{{ l.nama }} ({{ l.baris.length }} baris)</option></select>
              <label class="text-xs text-slate-500">Baris judul<input v-model.number="trx.baris" type="number" min="0" class="masukan py-2" /></label>
            </div>
            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <label v-for="b in BIDANG_TRANSAKSI" :key="b.kunci" class="text-xs text-slate-500">{{ b.judul }}<span v-if="b.wajib" class="text-merah"> *</span>
                <select v-model="trx.peta[b.kunci]" class="masukan py-1.5 text-sm"><option :value="undefined">— tidak ada —</option><option v-for="k in kolomPilihan(trx)" :key="k.i" :value="k.i">{{ k.label }}</option></select></label>
            </div>
            <p v-if="wajibKurang.length" class="text-sm font-semibold text-rose-600">Pilih kolom: {{ wajibKurang.join(', ') }}</p>
            <div v-else class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table class="w-full min-w-[560px] text-xs">
                <thead class="bg-slate-50 text-slate-500 dark:bg-slate-800/60"><tr><th class="p-2 text-left">Baris</th><th class="p-2 text-left">Tanggal</th><th class="p-2 text-left">Uraian</th><th class="p-2 text-right">Masuk</th><th class="p-2 text-right">Keluar</th></tr></thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="t in pratinjau" :key="t._baris"><td class="p-2">{{ t._baris }}</td><td class="p-2">{{ tanggalPendek(keIsoTanggal(t.tanggal)) || '?' }}</td><td class="p-2">{{ String(t.uraian).slice(0, 80) }}</td><td class="angka p-2 text-right">{{ keAngka(t.pemasukan) ? rupiah(keAngka(t.pemasukan)) : '' }}</td><td class="angka p-2 text-right">{{ keAngka(t.nilai) ? rupiah(keAngka(t.nilai)) : '' }}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="p-4">
          <button type="button" class="flex w-full items-center gap-3 text-left" @click="buka.pjk = !buka.pjk">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="ReceiptText" :ukuran="17" /></span>
            <span class="min-w-0 flex-1"><b class="block">2. Pajak: {{ pjk.aktif && pjk.lembar ? pjk.lembar : 'tidak dipakai' }}</b><span class="text-xs text-slate-500">{{ barisPajak.length }} baris · dikaitkan ke transaksi dengan uraian mirip & tanggal ±10 hari</span></span>
            <Ikon nama="ChevronDown" :ukuran="17" :class="['text-slate-400 transition', buka.pjk && 'rotate-180']" />
          </button>
          <div v-if="buka.pjk" class="mt-3 space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <label class="flex items-center gap-2 text-sm"><input v-model="pjk.aktif" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Pakai lembar pajak</label>
              <select v-model="pjk.lembar" class="masukan w-auto flex-1" aria-label="Lembar pajak" @change="kenali(pjk, BIDANG_PAJAK)"><option value="">—</option><option v-for="l in lembar" :key="l.nama" :value="l.nama">{{ l.nama }}</option></select>
            </div>
            <div v-if="pjk.aktif" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <label v-for="b in BIDANG_PAJAK" :key="b.kunci" class="text-xs text-slate-500">{{ b.judul }}
                <select v-model="pjk.peta[b.kunci]" class="masukan py-1.5 text-sm"><option :value="undefined">— tidak ada —</option><option v-for="k in kolomPilihan(pjk)" :key="k.i" :value="k.i">{{ k.label }}</option></select></label>
            </div>
            <p class="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">Kolom keterangan menentukan perlakuan: <b>“Belanja SIPLAH”</b> → dipungut mitra (tidak lewat BKU); <b>“Dibayar Rekanan”</b> → dipungut/dipotong Bendahara dari pembayaran ke rekanan (lewat rekening BOSP); <b>“Dibayar Sekolah”</b> → disetor sekolah di luar rekening BOSP. Centang “Cek Up” = sudah disetor.</p>
          </div>
        </div>

        <div class="p-4">
          <button type="button" class="flex w-full items-center gap-3 text-left" @click="buka.pen = !buka.pen">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="UsersRound" :ukuran="17" /></span>
            <span class="min-w-0 flex-1"><b class="block">3. Rincian penerima: {{ sumberPenerima.filter((s) => s.aktif).map((s) => s.lembar).join(', ') || 'tidak dipakai' }}</b><span class="text-xs text-slate-500">{{ barisPenerima.reduce((s, x) => s + x.baris.length, 0) }} orang-baris · dikaitkan ke transaksi dengan jumlah bruto sama & tanggal ±7 hari</span></span>
            <Ikon nama="ChevronDown" :ukuran="17" :class="['text-slate-400 transition', buka.pen && 'rotate-180']" />
          </button>
          <div v-if="buka.pen" class="mt-3 space-y-3">
            <div v-for="(s, i) in sumberPenerima" :key="i" class="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div class="flex flex-wrap items-center gap-2">
                <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="s.aktif" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> {{ s.lembar }}</label>
                <label class="ml-auto text-xs text-slate-500">Baris judul <input v-model.number="s.baris" type="number" min="0" class="masukan inline w-16 py-1" /></label>
              </div>
              <div v-if="s.aktif" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <label v-for="b in BIDANG_PENERIMA" :key="b.kunci" class="text-xs text-slate-500">{{ b.judul }}<span v-if="b.wajib" class="text-merah"> *</span>
                  <select v-model="s.peta[b.kunci]" class="masukan py-1.5 text-sm"><option :value="undefined">— tidak ada —</option><option v-for="k in kolomPilihan(s)" :key="k.i" :value="k.i">{{ k.label }}</option></select></label>
              </div>
            </div>
            <p class="text-xs text-slate-500">Bruto = kolom “Jumlah bruto” bila ada; bila tidak, besaran per satuan × volume.</p>
          </div>
        </div>

        <div class="space-y-2 p-4">
          <p class="flex items-center gap-2 font-bold"><span class="grid h-9 w-9 place-items-center rounded-lg ikon-chip"><Ikon nama="Landmark" :ukuran="17" /></span> 4. Baris kas tambahan (opsional)</p>
          <p class="text-xs text-slate-500">Penerimaan dana diambil otomatis dari kolom Pemasukan. Tambahkan di sini saldo awal, bunga atau pajak bunga yang tidak ada di lembar.</p>
          <div v-for="(p, i) in penerimaan" :key="i" class="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[9rem_minmax(0,1fr)_10rem_7rem_9rem_auto] dark:border-slate-700">
            <input v-model="p.tanggal" type="date" class="masukan py-1.5" aria-label="Tanggal" />
            <input v-model="p.uraian" class="masukan py-1.5" aria-label="Uraian" />
            <input v-model.number="p.nilai" type="number" class="masukan angka py-1.5" aria-label="Nilai" />
            <input v-model="p.bnu" class="masukan kode py-1.5" placeholder="BNU" aria-label="BNU" />
            <select v-model="p.jenis" class="masukan py-1.5" aria-label="Jenis"><option value="saldo_awal">Saldo awal</option><option value="terima_dana">Dana BOSP</option><option value="bunga">Bunga</option><option value="pajak_bunga">Pajak bunga</option><option value="biaya_bank">Biaya bank</option></select>
            <button class="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" aria-label="Hapus baris" @click="penerimaan.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
          </div>
          <button class="tombol-garis" @click="penerimaan.push({ tanggal: '', uraian: '', nilai: 0, bnu: '', jenis: 'bunga' })"><Ikon nama="Plus" :ukuran="16" class="text-biru" /> Tambah baris</button>
        </div>
      </section>

      <!-- Ringkasan -->
      <section v-if="ringkas" class="kartu space-y-4 p-4 sm:p-5">
        <h3 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="ListChecks" :ukuran="17" /></span> Pemeriksaan sebelum disimpan</h3>
        <div :class="['rounded-2xl p-4', ringkas.s1Saldo === TARGET_SEMESTER_1 ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100']">
          <p class="flex items-center gap-2 text-sm font-bold"><Ikon :nama="ringkas.s1Saldo === TARGET_SEMESTER_1 ? 'BadgeCheck' : 'Target'" :ukuran="18" /> Perkiraan saldo bank 30 Juni: <span class="angka">{{ rupiah(ringkas.s1Saldo) }}</span></p>
          <p class="text-xs">Penerimaan Semester I {{ rupiah(ringkas.s1Terima) }} − belanja {{ rupiah(ringkas.s1Belanja) }} · target {{ rupiah(TARGET_SEMESTER_1) }}
            <b v-if="ringkas.s1Saldo !== TARGET_SEMESTER_1"> (selisih {{ rupiah(ringkas.s1Saldo - TARGET_SEMESTER_1) }})</b></p>
          <p v-for="a in acuan" :key="a.nama" class="mt-1 text-xs">Lembar {{ a.nama }}: diterima {{ rupiah(a.diterima) }}, belanja {{ rupiah(a.belanja) }}, sisa {{ rupiah(a.sisa) }}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div v-for="[l, v] in [['Belanja', paket.belanja.length + ' transaksi'], ['Nilai belanja', rupiah(ringkas.total)], ['Honor/transpor dgn penerima', ringkas.honor + ' transaksi'], ['Lewat SIPLah', ringkas.siplah + ' transaksi']]" :key="l" class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">{{ l }}</p><p class="angka text-sm font-bold">{{ v }}</p></div>
        </div>
        <div v-if="ringkas.pajak.length" class="flex flex-wrap gap-1.5">
          <span v-for="x in ringkas.pajak" :key="x.jenis + x.cara" :class="['lencana', WARNA_PAJAK[x.jenis]]">{{ x.jenis }} {{ CARA_LABEL[x.cara] || x.cara }} · {{ rupiah(x.nilai) }}</span>
        </div>
        <div class="grid grid-cols-4 gap-1 sm:grid-cols-6 xl:grid-cols-12">
          <div v-for="(v, i) in ringkas.perBulan" :key="i" class="rounded-lg bg-slate-50 p-1.5 text-center dark:bg-slate-800/50"><p class="text-[10px] text-slate-500">{{ NAMA_BULAN[i].slice(0, 3) }}</p><p class="angka text-[11px] font-semibold">{{ v ? (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : '-' }}</p></div>
        </div>
        <ul class="space-y-1 text-sm">
          <li v-if="paket.laporan.ganda.length" class="text-amber-700 dark:text-amber-300"><Ikon nama="CopyCheck" :ukuran="15" class="inline" /> {{ paket.laporan.ganda.length }} baris dilewati karena BNU-nya sudah tercatat di SIBOS.</li>
          <li v-if="paket.laporan.lewat.length" class="text-slate-500"><Ikon nama="SkipForward" :ukuran="15" class="inline" /> {{ paket.laporan.lewat.length }} baris dilewati (beda tahun/kosong).</li>
          <li v-if="paket.laporan.tanpaBnu" class="text-amber-700 dark:text-amber-300"><Ikon nama="Hash" :ukuran="15" class="inline" /> {{ paket.laporan.tanpaBnu }} transaksi belum ber-BNU — lengkapi di Buku Kas setelah migrasi.</li>
          <li v-if="paket.laporan.tanpaRekening" class="text-amber-700 dark:text-amber-300"><Ikon nama="ListTree" :ukuran="15" class="inline" /> {{ paket.laporan.tanpaRekening }} transaksi tanpa kode rekening belanja (bisa dilengkapi kemudian).</li>
          <li v-if="paket.laporan.pajakLepas.length" class="text-slate-500"><Ikon nama="ReceiptText" :ukuran="15" class="inline" /> {{ paket.laporan.pajakLepas.length }} baris pajak tidak menemukan transaksi: {{ paket.laporan.pajakLepas.slice(0, 3).map((x) => x.uraian.slice(0, 40)).join('; ') }}</li>
          <li v-if="paket.laporan.honorLepas.length" class="text-slate-500"><Ikon nama="UsersRound" :ukuran="15" class="inline" /> {{ paket.laporan.honorLepas.length }} kelompok penerima tidak menemukan transaksi (jumlah/tanggal berbeda), mis. {{ paket.laporan.honorLepas.slice(0, 2).map((x) => x.kegiatan.slice(0, 40)).join('; ') }}</li>
        </ul>
        <label class="flex items-center gap-2 text-sm"><input v-model="opsi.setorSama" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Pajak yang sudah ditandai disetor dicatat setor pada tanggal transaksi (NTPN dapat dilengkapi kemudian)</label>
        <div v-if="auth.isAdmin" class="flex flex-wrap items-center gap-2">
          <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan migrasi {{ kemajuan }}</button>
          <p class="text-xs text-slate-500">Migrasi ulang memperbarui data yang sama (id tetap per baris), tidak menggandakan.</p>
        </div>
      </section>
    </template>
  </div>
</template>
