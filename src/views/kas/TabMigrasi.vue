<script setup>
// Migrasi transaksi tahun berjalan dari workbook Jurnal Dana BOS (.xlsx) → belanja Lunas + BNU + pajak + setoran + penerimaan dana.
import { ref, reactive, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanMigrasi, hapusMigrasi } from '@/services/kas'
import { bacaBerkas } from '@/utils/excel'
import { BIDANG_TRANSAKSI, BIDANG_PENERIMA, kenaliKolom, ambilBaris, susunMigrasi, angkaRingkasan, keIsoTanggal, keAngka } from '@/utils/migrasi'
import { TARGET_SEMESTER_1 } from '@/config/pajak'
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
const sumberPenerima = ref([])  // [{ lembar, baris, peta, aktif }]
const penerimaan = ref([
  { tanggal: '', uraian: `Penerimaan Dana BOSP Reguler Tahap I Tahun ${kas.tahun}`, nilai: 590_700_000, bnu: '', jenis: 'terima_dana' },
  { tanggal: '', uraian: `Penerimaan Dana BOSP Reguler Tahap II Tahun ${kas.tahun}`, nilai: 590_700_000, bnu: '', jenis: 'terima_dana' },
])
const opsi = reactive({ setorSama: true, siplahMitra: true, kaliVolume: true })
const acuan = ref(null)

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
    lembar.value = await bacaBerkas(f)
    namaBerkas.value = f.name
    trx.lembar = cariLembar(/db.?_?sampul/i) || cariLembar(/sampul/i) || lembar.value[0]?.nama || ''
    kenali(trx, BIDANG_TRANSAKSI)
    sumberPenerima.value = lembar.value.filter((l) => /db.?_?(trima|honor)/i.test(l.nama)).map((l) => { const s = { lembar: l.nama, baris: 0, peta: {}, aktif: true }; kenali(s, BIDANG_PENERIMA); return s })
    const xa = lembar.value.find((l) => /x\s*arkas/i.test(l.nama))
    const sm = lembar.value.find((l) => /simakda/i.test(l.nama))
    acuan.value = { arkas: xa ? angkaRingkasan(xa) : null, simakda: sm ? angkaRingkasan(sm) : null }
    if (acuan.value.arkas?.diterima && !penerimaan.value[0].tanggal) penerimaan.value[0].nilai = acuan.value.arkas.diterima
  } catch (err) { notif.kabari(err.message, 'galat') } finally { membaca.value = false }
}

const kolomPilihan = (target) => (lembarDari(target.lembar)?.baris[target.baris] || []).map((v, i) => ({ i, label: `${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''} · ${String(v ?? '').slice(0, 28) || '(kosong)'}` }))
const barisTrx = computed(() => (lembarDari(trx.lembar) ? ambilBaris(lembarDari(trx.lembar), trx.peta, trx.baris, BIDANG_TRANSAKSI) : []))
const barisPenerima = computed(() => sumberPenerima.value.filter((s) => s.aktif && lembarDari(s.lembar)).flatMap((s) => ambilBaris(lembarDari(s.lembar), s.peta, s.baris, BIDANG_PENERIMA)))
const wajibKurang = computed(() => BIDANG_TRANSAKSI.filter((b) => b.wajib && (trx.peta[b.kunci] == null || trx.peta[b.kunci] === '')).map((b) => b.judul))

const paket = computed(() => (barisTrx.value.length && !wajibKurang.value.length
  ? susunMigrasi({ transaksi: barisTrx.value, penerima: barisPenerima.value, penerimaan: penerimaan.value, tahun: kas.tahun, ada: belanja.daftar, opsi })
  : null))
const ringkas = computed(() => {
  if (!paket.value) return null
  const p = paket.value
  const perBulan = Array(12).fill(0)
  p.belanja.forEach((b) => { perBulan[Number(b.tgl_lunas.slice(5, 7)) - 1] += b.total })
  const s1Belanja = perBulan.slice(0, 6).reduce((s, v) => s + v, 0)
  const s1Terima = p.kas.filter((k) => k.tanggal < `${kas.tahun}-07-01`).reduce((s, k) => s + k.nilai, 0)
  const pajakS1Terutang = p.belanja.filter((b) => b.tgl_lunas < `${kas.tahun}-07-01`).flatMap((b) => b.pajak.filter((x) => x.cara !== 'mitra')).reduce((s, x) => s + x.nilai, 0)
    - p.setoran.filter((s) => s.tanggal < `${kas.tahun}-07-01`).reduce((s, x) => s + x.total, 0)
  return { perBulan, total: p.belanja.reduce((s, b) => s + b.total, 0), s1Belanja, s1Terima, s1Saldo: s1Terima - s1Belanja + pajakS1Terutang,
    pajak: p.belanja.reduce((s, b) => s + b.pajak.reduce((t, x) => t + x.nilai, 0), 0), honor: p.belanja.filter((b) => b.jenis === 'honor').length }
})

const menyimpan = ref(false)
const kemajuan = ref('')
async function simpan() {
  if (!paket.value) return
  const p = paket.value
  if (!p.kas.length && !confirm('Penerimaan dana belum diisi tanggalnya, jadi saldo akan minus. Tetap lanjut?')) return
  if (!confirm(`Simpan ${p.belanja.length} belanja, ${p.kas.length} baris kas dan ${p.setoran.length} setoran pajak hasil migrasi ke SIBOS?`)) return
  menyimpan.value = true
  try {
    await simpanMigrasi(p, { kemajuan: (a, b) => { kemajuan.value = `${a}/${b}` } })
    await kas.muat({ segar: true })
    notif.kabari('Migrasi tersimpan. Periksa hasilnya di tab Uji Paralel.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false; kemajuan.value = '' }
}
const jumlahMigrasi = computed(() => belanja.daftar.filter((b) => b.sumber === 'migrasi').length)
async function hapusSemua() {
  if (!confirm(`Hapus SEMUA data hasil migrasi tahun ${kas.tahun} (belanja, kas, setoran bertanda migrasi)? Data yang dicatat langsung di SIBOS tidak terhapus.`)) return
  try { const n = await hapusMigrasi(kas.tahun); await kas.muat({ segar: true }); notif.kabari(`Data migrasi dihapus${n ? ` (${n} dokumen)` : ''}.`) } catch (e) { notif.kabari(e.message, 'galat') }
}
const pratinjau = computed(() => barisTrx.value.slice(0, 6))
</script>

<template>
  <div class="space-y-5">
    <section class="kartu flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="DatabaseZap" :ukuran="24" /></span>
      <div class="min-w-0 flex-1">
        <h2 class="font-bold">Migrasi transaksi {{ kas.tahun }} dari Jurnal Dana BOS</h2>
        <p class="text-sm text-slate-500">Google Sheets → File → Download → Microsoft Excel (.xlsx), lalu pilih berkasnya di sini. Tidak ada yang tersimpan sebelum Bapak menekan “Simpan migrasi”.</p>
        <p v-if="jumlahMigrasi" class="mt-1 text-xs font-semibold text-[#167A6C] dark:text-[#5FD3C0]">{{ jumlahMigrasi }} belanja hasil migrasi sudah ada di SIBOS.</p>
      </div>
      <template v-if="auth.isAdmin">
        <input ref="masukan" type="file" accept=".xlsx,.csv" class="hidden" @change="pilihBerkas" />
        <button v-if="jumlahMigrasi" class="tombol-garis text-rose-600" @click="hapusSemua"><Ikon nama="Trash2" :ukuran="16" /> <span class="hidden sm:inline">Hapus migrasi</span></button>
        <button class="tombol-utama" :disabled="membaca" @click="masukan.click()"><Ikon :nama="membaca ? 'RefreshCw' : 'FileUp'" :ukuran="17" :class="membaca && 'animate-spin'" /> {{ namaBerkas ? 'Ganti berkas' : 'Pilih berkas .xlsx' }}</button>
      </template>
    </section>

    <template v-if="lembar.length">
      <!-- 1. Transaksi -->
      <section class="kartu space-y-3 p-4 sm:p-5">
        <h3 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip">1</span> Lembar transaksi (sampul/BKU)</h3>
        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <select v-model="trx.lembar" class="masukan" aria-label="Lembar transaksi" @change="kenali(trx, BIDANG_TRANSAKSI)"><option v-for="l in lembar" :key="l.nama" :value="l.nama">{{ l.nama }} ({{ l.baris.length }} baris)</option></select>
          <label class="text-xs text-slate-500">Baris judul<input v-model.number="trx.baris" type="number" min="0" class="masukan py-2" /></label>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <label v-for="b in BIDANG_TRANSAKSI" :key="b.kunci" class="text-xs text-slate-500">{{ b.judul }}<span v-if="b.wajib" class="text-merah"> *</span>
            <select v-model="trx.peta[b.kunci]" class="masukan py-1.5 text-sm"><option :value="undefined">— tidak ada —</option><option v-for="k in kolomPilihan(trx)" :key="k.i" :value="k.i">{{ k.label }}</option></select></label>
        </div>
        <p v-if="wajibKurang.length" class="text-sm font-semibold text-rose-600">Pilih kolom: {{ wajibKurang.join(', ') }}</p>
        <div v-else class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table class="w-full min-w-[560px] text-xs">
            <thead class="bg-slate-50 text-slate-500 dark:bg-slate-800/60"><tr><th class="p-2 text-left">Baris</th><th class="p-2 text-left">Tanggal</th><th class="p-2 text-left">BNU</th><th class="p-2 text-left">Kode</th><th class="p-2 text-left">Uraian</th><th class="p-2 text-right">Nilai</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="t in pratinjau" :key="t._baris"><td class="p-2">{{ t._baris }}</td><td class="p-2">{{ tanggalPendek(keIsoTanggal(t.tanggal)) || '?' }}</td><td class="kode p-2">{{ t.bnu }}</td><td class="kode p-2">{{ t.kode }}</td><td class="p-2">{{ String(t.uraian).slice(0, 70) }}</td><td class="angka p-2 text-right">{{ rupiah(keAngka(t.nilai)) }}</td></tr>
            </tbody>
          </table>
          <p class="bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-800/60">{{ barisTrx.length }} baris terbaca</p>
        </div>
      </section>

      <!-- 2. Penerima honor -->
      <section class="kartu space-y-3 p-4 sm:p-5">
        <h3 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning">2</span> Rincian penerima honor/transpor (untuk rekap per penerima & PPh 21)</h3>
        <p class="text-sm text-slate-500">Rincian dikaitkan ke transaksi dengan tanggal lunas sama dan jumlah bruto sama dengan nilai sampul.</p>
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
        <button class="tombol-garis" @click="sumberPenerima.push({ lembar: lembar[0].nama, baris: 0, peta: {}, aktif: true })"><Ikon nama="Plus" :ukuran="16" class="text-biru" /> Tambah lembar penerima</button>
        <select v-if="sumberPenerima.length && !sumberPenerima.at(-1).peta.nama" v-model="sumberPenerima.at(-1).lembar" class="masukan" @change="kenali(sumberPenerima.at(-1), BIDANG_PENERIMA)"><option v-for="l in lembar" :key="l.nama" :value="l.nama">{{ l.nama }}</option></select>
        <label class="flex items-center gap-2 text-sm"><input v-model="opsi.kaliVolume" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Bruto = besaran × volume (hapus centang bila kolom jumlah sudah total)</label>
      </section>

      <!-- 3. Penerimaan dana -->
      <section class="kartu space-y-3 p-4 sm:p-5">
        <h3 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca">3</span> Penerimaan dana & saldo awal</h3>
        <div v-for="(p, i) in penerimaan" :key="i" class="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[9rem_minmax(0,1fr)_10rem_7rem_auto] dark:border-slate-700">
          <input v-model="p.tanggal" type="date" class="masukan py-1.5" aria-label="Tanggal" />
          <input v-model="p.uraian" class="masukan py-1.5" aria-label="Uraian" />
          <input v-model.number="p.nilai" type="number" class="masukan angka py-1.5" aria-label="Nilai" />
          <input v-model="p.bnu" class="masukan kode py-1.5" placeholder="BNU" aria-label="BNU" />
          <select v-model="p.jenis" class="masukan py-1.5" aria-label="Jenis"><option value="terima_dana">Dana BOSP</option><option value="saldo_awal">Saldo awal</option><option value="bunga">Bunga</option><option value="pajak_bunga">Pajak bunga</option><option value="biaya_bank">Biaya bank</option></select>
        </div>
        <button class="tombol-garis" @click="penerimaan.push({ tanggal: '', uraian: '', nilai: 0, bnu: '', jenis: 'bunga' })"><Ikon nama="Plus" :ukuran="16" class="text-biru" /> Tambah baris (bunga, pajak bunga, saldo awal…)</button>
        <p class="text-xs text-slate-500">Baris tanpa tanggal tidak ikut disimpan. Bunga & pajak bunga juga bisa dicatat nanti dari rekening koran.</p>
      </section>

      <!-- 4. Ringkasan -->
      <section v-if="ringkas" class="kartu space-y-4 p-4 sm:p-5">
        <h3 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip">4</span> Pemeriksaan sebelum disimpan</h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div v-for="[l, v] in [['Belanja', paket.belanja.length + ' transaksi'], ['Nilai belanja', rupiah(ringkas.total)], ['Pajak', rupiah(ringkas.pajak)], ['Honor terkait penerima', ringkas.honor + ' transaksi']]" :key="l" class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">{{ l }}</p><p class="angka text-sm font-bold">{{ v }}</p></div>
        </div>
        <div :class="['rounded-2xl p-4', ringkas.s1Saldo === TARGET_SEMESTER_1 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-amber-50 dark:bg-amber-950/40']">
          <p class="text-sm font-bold">Perkiraan saldo bank 30 Juni: <span class="angka">{{ rupiah(ringkas.s1Saldo) }}</span></p>
          <p class="text-xs">Penerimaan Semester I {{ rupiah(ringkas.s1Terima) }} − belanja Semester I {{ rupiah(ringkas.s1Belanja) }} · target {{ rupiah(TARGET_SEMESTER_1) }}
            <b v-if="ringkas.s1Saldo !== TARGET_SEMESTER_1"> (selisih {{ rupiah(ringkas.s1Saldo - TARGET_SEMESTER_1) }})</b></p>
          <p v-if="acuan?.arkas" class="mt-1 text-xs">Lembar X ARKAS: diterima {{ rupiah(acuan.arkas.diterima) }}, belanja {{ rupiah(acuan.arkas.belanja) }}, sisa {{ rupiah(acuan.arkas.sisa) }}<b v-if="acuan.arkas.belanja !== ringkas.s1Belanja"> — belanja berbeda {{ rupiah(ringkas.s1Belanja - acuan.arkas.belanja) }}</b></p>
          <p v-if="acuan?.simakda" class="text-xs">Lembar SIMAKDA: diterima {{ rupiah(acuan.simakda.diterima) }}, belanja {{ rupiah(acuan.simakda.belanja) }}, sisa {{ rupiah(acuan.simakda.sisa) }}<b v-if="acuan.simakda.belanja !== ringkas.total"> — total belanja berbeda {{ rupiah(ringkas.total - acuan.simakda.belanja) }}</b></p>
        </div>
        <div class="grid grid-cols-4 gap-1 sm:grid-cols-6 xl:grid-cols-12">
          <div v-for="(v, i) in ringkas.perBulan" :key="i" class="rounded-lg bg-slate-50 p-1.5 text-center dark:bg-slate-800/50"><p class="text-[10px] text-slate-500">{{ NAMA_BULAN[i].slice(0, 3) }}</p><p class="angka text-[11px] font-semibold">{{ v ? (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : '-' }}</p></div>
        </div>
        <ul class="space-y-1 text-sm">
          <li v-if="paket.laporan.ganda.length" class="text-amber-700 dark:text-amber-300"><Ikon nama="CopyCheck" :ukuran="15" class="inline" /> {{ paket.laporan.ganda.length }} baris dilewati karena BNU-nya sudah tercatat di SIBOS ({{ paket.laporan.ganda.slice(0, 4).map((g) => g.bnu).join(', ') }}…).</li>
          <li v-if="paket.laporan.lewat.length" class="text-slate-500"><Ikon nama="SkipForward" :ukuran="15" class="inline" /> {{ paket.laporan.lewat.length }} baris dilewati (beda tahun/kosong): baris {{ paket.laporan.lewat.slice(0, 8).map((x) => x.baris).join(', ') }}…</li>
          <li v-if="paket.laporan.tanpaBnu" class="text-amber-700 dark:text-amber-300"><Ikon nama="Hash" :ukuran="15" class="inline" /> {{ paket.laporan.tanpaBnu }} transaksi tanpa BNU — bisa dilengkapi di Buku Kas.</li>
          <li v-if="paket.laporan.tanpaRekening" class="text-amber-700 dark:text-amber-300"><Ikon nama="ListTree" :ukuran="15" class="inline" /> {{ paket.laporan.tanpaRekening }} transaksi tanpa kode rekening 5.x lengkap (kode asli disimpan).</li>
          <li v-if="paket.laporan.honorLepas.length" class="text-slate-500"><Ikon nama="UsersRound" :ukuran="15" class="inline" /> {{ paket.laporan.honorLepas.length }} kelompok penerima tidak menemukan sampul yang cocok (tanggal/jumlah berbeda).</li>
        </ul>
        <div class="flex flex-wrap gap-3 text-sm">
          <label class="flex items-center gap-2"><input v-model="opsi.setorSama" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Pajak dianggap sudah disetor (tanggal setor = kolom tanggal setor, atau tanggal lunas)</label>
          <label class="flex items-center gap-2"><input v-model="opsi.siplahMitra" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Pajak transaksi SIPLah dipungut mitra (tidak masuk BKU)</label>
        </div>
        <div v-if="auth.isAdmin" class="flex flex-wrap items-center gap-2">
          <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan migrasi {{ kemajuan }}</button>
          <p class="text-xs text-slate-500">Migrasi ulang memperbarui data yang sama (id tetap per BNU), tidak menggandakan.</p>
        </div>
      </section>
    </template>
  </div>
</template>
