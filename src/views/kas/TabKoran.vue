<script setup>
// Cocokkan rekening koran: impor mutasi (PDF bank / Excel), setiap mutasi dipasangkan ke transaksi bank SIBOS.
// Bunga, pajak bunga & biaya bank tanpa pasangan bisa langsung dicatat ke Buku Kas; selisih ditandai.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanKoran, hapusKoran, simpanKas } from '@/services/kas'
import { calonBank, cocokkanKoran, tebakJenisMutasi, saldoSampai } from '@/utils/bku'
import { uraiKoran, bacaBerkasKoran } from '@/utils/koran'
import { JENIS_KAS } from '@/config/pajak'
import { rupiah, tanggalPendek, NAMA_BULAN, keIso } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import Laci from '@/components/Laci.vue'

const kas = useKas()
const auth = useAuth()
const notif = useNotifikasi()
const sekarang = new Date()
const bulan = ref(kas.tahun === sekarang.getFullYear() ? Math.max(0, sekarang.getMonth() - 1) : 0)
const id = computed(() => `${kas.tahun}-${String(bulan.value + 1).padStart(2, '0')}`)
const akhir = computed(() => keIso(new Date(kas.tahun, bulan.value + 1, 0)))
const koran = computed(() => kas.koran.find((k) => k.id === id.value) || null)
const calon = computed(() => calonBank(kas.baris))
const hasil = computed(() => (koran.value ? cocokkanKoran(koran.value.mutasi || [], calon.value) : []))
const belum = computed(() => hasil.value.filter((m) => !m.pasangan && m.cara !== 'abaikan'))
const saldoBuku = computed(() => saldoSampai(kas.baris, akhir.value, 'bank'))
// Transaksi bank SIBOS bulan ini yang tidak muncul di koran
const terpakai = computed(() => new Set(hasil.value.flatMap((m) => m.pasangan?.baris || [])))
const tidakDiKoran = computed(() => (koran.value ? calon.value.filter((c) => !c.cadangan && c.tanggal >= `${id.value}-01` && c.tanggal <= akhir.value && !c.baris.some((x) => terpakai.value.has(x))) : []))

const statistik = computed(() => [
  { judul: 'Saldo koran', nilai: koran.value ? rupiah(koran.value.saldo_akhir) : '—', ikon: 'FileSearch', nada: 'gelap', ringkas: true, sub: koran.value ? `${(koran.value.mutasi || []).length} mutasi` : 'Belum diimpor' },
  { judul: 'Saldo buku bank', nilai: rupiah(saldoBuku.value), ikon: 'Landmark', nada: 'primer', ringkas: true, sub: `per ${tanggalPendek(akhir.value)}` },
  { judul: 'Selisih', nilai: koran.value ? rupiah(koran.value.saldo_akhir - saldoBuku.value) : '—', ikon: 'Scale', nada: !koran.value ? 'primer' : koran.value.saldo_akhir === saldoBuku.value ? 'sukses' : 'bahaya', ringkas: true },
  { judul: 'Belum berpasangan', nilai: belum.value.length, ikon: 'Unlink', nada: belum.value.length ? 'peringatan' : 'sukses', sub: `${tidakDiKoran.value.length} transaksi SIBOS tak ada di koran` },
])

/* ---------- Impor ---------- */
const masukan = ref(null)
const pratinjau = ref(null)
const membaca = ref(false)
async function pilihBerkas(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  membaca.value = true
  try {
    const hasilBaca = uraiKoran(await bacaBerkasKoran(f), kas.tahun)
    if (!hasilBaca.mutasi.length) throw new Error('Tidak ada baris mutasi yang terbaca. Pastikan PDF berisi teks (bukan hasil pindai).')
    const bln = hasilBaca.bulan && hasilBaca.bulan.startsWith(String(kas.tahun)) ? Number(hasilBaca.bulan.slice(5, 7)) - 1 : bulan.value
    pratinjau.value = { ...hasilBaca, nama_berkas: f.name, bulan: bln }
  } catch (err) { notif.kabari(err.message, 'galat') } finally { membaca.value = false }
}
async function simpanImpor() {
  const p = pratinjau.value
  const idb = `${kas.tahun}-${String(p.bulan + 1).padStart(2, '0')}`
  if (kas.koran.some((k) => k.id === idb) && !confirm(`Rekening koran ${NAMA_BULAN[p.bulan]} sudah ada. Ganti?`)) return
  try {
    await simpanKoran(idb, { nama_berkas: p.nama_berkas, saldo_awal: Number(p.saldo_awal) || 0, saldo_akhir: Number(p.saldo_akhir) || 0, mutasi: p.mutasi.map((m, i) => ({ ...m, no: i + 1 })) },
      `Impor rekening koran ${NAMA_BULAN[p.bulan]} ${kas.tahun}: ${p.mutasi.length} mutasi`)
    bulan.value = p.bulan
    pratinjau.value = null
    await kas.segarkan()
    notif.kabari('Rekening koran tersimpan dan dicocokkan.')
  } catch (e) { notif.kabari(e.message, 'galat') }
}
async function hapus() {
  if (!confirm(`Hapus rekening koran ${NAMA_BULAN[bulan.value]}?`)) return
  try { await hapusKoran(id.value); await kas.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Tindak lanjut mutasi ---------- */
const aksi = ref(null)
function buka(m) {
  if (!auth.isAdmin) return
  const nilai = m.kredit ? m.kredit : -m.debit
  aksi.value = { m, jenis: tebakJenisMutasi(m), bnu: '', uraian: m.uraian, pilihan: calon.value.filter((c) => c.bank === nilai).slice(0, 12), pasangan: m.id_bku || '' }
}
async function perbaruiMutasi(no, ubah, ket) {
  const mutasi = koran.value.mutasi.map((x) => (x.no === no ? { ...x, ...ubah } : x))
  await simpanKoran(id.value, { ...koran.value, mutasi }, ket)
  await kas.segarkan()
}
async function catatKeKas() {
  const a = aksi.value
  const info = JENIS_KAS[a.jenis]
  try {
    await simpanKas(null, { tanggal: a.m.tanggal, jenis: a.jenis, bnu: a.bnu, uraian: a.uraian || info.label, nilai: a.m.kredit || a.m.debit, sumber: 'bank', sumber_data: 'koran' })
    await kas.segarkan()
    notif.kabari(`Dicatat sebagai ${info.label}.`)
    aksi.value = null
  } catch (e) { notif.kabari(e.message, 'galat') }
}
async function pasangkan() {
  try { await perbaruiMutasi(aksi.value.m.no, { id_bku: aksi.value.pasangan || null, abaikan: false }, 'Memasangkan mutasi koran secara manual'); aksi.value = null } catch (e) { notif.kabari(e.message, 'galat') }
}
async function abaikan() {
  const alasan = prompt('Alasan mengabaikan mutasi ini (mis. koreksi bank):')
  if (alasan == null) return
  try { await perbaruiMutasi(aksi.value.m.no, { abaikan: true, alasan_abaikan: alasan, id_bku: null }, `Mengabaikan mutasi koran: ${alasan}`); aksi.value = null } catch (e) { notif.kabari(e.message, 'galat') }
}
async function lepas() {
  try { await perbaruiMutasi(aksi.value.m.no, { abaikan: false, id_bku: null }, 'Melepas pasangan mutasi koran'); aksi.value = null } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <select v-model="bulan" class="masukan w-auto py-2.5" aria-label="Bulan"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }} {{ kas.tahun }}</option></select>
      <p class="min-w-0 flex-1 truncate text-sm text-slate-500"><template v-if="koran"><Ikon nama="FileCheck" :ukuran="15" class="inline text-emerald-600" /> {{ koran.nama_berkas }}</template><template v-else>Belum ada rekening koran bulan ini.</template></p>
      <template v-if="auth.isAdmin">
        <input ref="masukan" type="file" accept=".pdf,.xlsx,.csv" class="hidden" @change="pilihBerkas" />
        <button v-if="koran" class="tombol-garis text-rose-600" @click="hapus"><Ikon nama="Trash2" :ukuran="16" /></button>
        <button class="tombol-utama" :disabled="membaca" @click="masukan.click()"><Ikon :nama="membaca ? 'RefreshCw' : 'FileUp'" :ukuran="17" :class="membaca && 'animate-spin'" /> Impor PDF/Excel</button>
      </template>
    </div>
    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" />

    <div v-if="!koran" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="FileSearch" :ukuran="26" /></span>
      <p class="font-semibold">Impor rekening koran Bank Sulselbar {{ NAMA_BULAN[bulan] }} {{ kas.tahun }}</p>
      <p class="max-w-md text-sm text-slate-500">SIBOS membaca tanggal, uraian, debit/kredit dan saldo, lalu mencocokkan setiap mutasi dengan transaksi bank (pembayaran neto, setoran pajak, penerimaan dana).</p>
    </div>
    <template v-else>
      <div class="kartu divide-y divide-slate-100 dark:divide-slate-800">
        <div class="flex items-center gap-2 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800/60"><Ikon nama="FileSearch" :ukuran="15" /> Mutasi rekening koran · saldo awal {{ rupiah(koran.saldo_awal) }}</div>
        <button v-for="m in hasil" :key="m.no" type="button" class="flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="buka(m)">
          <span :class="['mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', m.pasangan ? 'ikon-chip-sukses' : m.cara === 'abaikan' ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' : 'ikon-chip-peringatan']"><Ikon :nama="m.pasangan ? 'Link' : m.cara === 'abaikan' ? 'Ban' : 'Unlink'" :ukuran="15" /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ m.uraian }}</p>
            <p class="truncate text-xs text-slate-500">{{ tanggalPendek(m.tanggal) }} · saldo {{ rupiah(m.saldo) }}</p>
            <p v-if="m.pasangan" class="truncate text-xs text-emerald-700 dark:text-emerald-300">↔ {{ m.pasangan.uraian }}<template v-if="m.pasangan.bnu"> · {{ m.pasangan.bnu }}</template><template v-if="m.cara === 'manual'"> (manual)</template></p>
            <p v-else-if="m.cara === 'abaikan'" class="text-xs text-slate-500">Diabaikan: {{ m.alasan_abaikan }}</p>
            <p v-else class="text-xs font-semibold text-amber-600">Belum ada pasangan — ketuk untuk menindaklanjuti</p>
          </div>
          <b :class="['angka shrink-0 text-sm', m.kredit ? 'text-[#167A6C] dark:text-[#5FD3C0]' : '']">{{ m.kredit ? '+' + rupiah(m.kredit) : '−' + rupiah(m.debit) }}</b>
        </button>
      </div>
      <section v-if="tidakDiKoran.length" class="kartu p-4">
        <h3 class="mb-2 flex items-center gap-2 text-sm font-bold"><span class="grid h-7 w-7 place-items-center rounded-lg ikon-chip-peringatan"><Ikon nama="SearchX" :ukuran="15" /></span> Transaksi bank SIBOS yang tidak ada di koran</h3>
        <p v-for="c in tidakDiKoran" :key="c.id" class="flex justify-between gap-2 py-1 text-sm"><span class="truncate">{{ tanggalPendek(c.tanggal) }} · {{ c.uraian }}</span><b class="angka shrink-0">{{ rupiah(c.bank) }}</b></p>
        <p class="mt-1 text-xs text-slate-500">Periksa tanggal/nilai di SIBOS, atau transaksi memang belum dibukukan bank.</p>
      </section>
    </template>

    <Laci v-if="pratinjau" judul="Pratinjau rekening koran" :subjudul="`${pratinjau.nama_berkas} · ${pratinjau.mutasi.length} mutasi`" ikon="FileSearch" lebar="max-w-3xl" @tutup="pratinjau = null">
      <div class="space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-3">
          <div><label class="label" for="pk-bln">Bulan</label><select id="pk-bln" v-model.number="pratinjau.bulan" class="masukan"><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }} {{ kas.tahun }}</option></select></div>
          <div><label class="label" for="pk-awal">Saldo awal</label><input id="pk-awal" v-model.number="pratinjau.saldo_awal" type="number" class="masukan angka" /></div>
          <div><label class="label" for="pk-akhir">Saldo akhir</label><input id="pk-akhir" v-model.number="pratinjau.saldo_akhir" type="number" class="masukan angka" /></div>
        </div>
        <div v-for="w in pratinjau.peringatan.slice(0, 6)" :key="w" class="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><Ikon nama="TriangleAlert" :ukuran="15" class="shrink-0" /> {{ w }}</div>
        <div class="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <div v-for="(m, i) in pratinjau.mutasi" :key="i" class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2 p-2 text-sm">
            <span class="text-xs text-slate-500">{{ tanggalPendek(m.tanggal) }}</span>
            <input v-model="m.uraian" class="masukan py-1 text-xs" :aria-label="`Uraian mutasi ${i + 1}`" />
            <span :class="['angka text-right text-xs font-semibold', m.kredit ? 'text-[#167A6C]' : '']">{{ m.kredit ? '+' + rupiah(m.kredit, { tanpaRp: true }) : '−' + rupiah(m.debit, { tanpaRp: true }) }}</span>
          </div>
        </div>
      </div>
      <template #kaki>
        <button class="tombol-utama" @click="simpanImpor"><Ikon nama="Save" :ukuran="17" /> Simpan & cocokkan</button>
        <button class="tombol-garis" @click="pratinjau = null">Batal</button>
      </template>
    </Laci>

    <Laci v-if="aksi" judul="Tindak lanjut mutasi" :subjudul="`${tanggalPendek(aksi.m.tanggal)} · ${aksi.m.kredit ? '+' + rupiah(aksi.m.kredit) : '−' + rupiah(aksi.m.debit)}`" ikon="Link" @tutup="aksi = null">
      <div class="space-y-5 p-5">
        <p class="text-sm">{{ aksi.m.uraian }}</p>
        <section class="space-y-2">
          <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="CirclePlus" :ukuran="16" class="text-[#22A08D]" /> Catat ke Buku Kas</h3>
          <select v-model="aksi.jenis" class="masukan" aria-label="Jenis baris kas"><option v-for="(v, k) in JENIS_KAS" :key="k" :value="k">{{ v.label }}</option></select>
          <div class="grid gap-2 sm:grid-cols-2"><input v-model="aksi.bnu" class="masukan kode" placeholder="BNU ARKAS" aria-label="BNU" /><input v-model="aksi.uraian" class="masukan" aria-label="Uraian" /></div>
          <button class="tombol-utama" @click="catatKeKas"><Ikon nama="Save" :ukuran="16" /> Catat</button>
        </section>
        <section class="space-y-2">
          <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="Link" :ukuran="16" class="text-biru" /> Pasangkan dengan transaksi SIBOS</h3>
          <select v-model="aksi.pasangan" class="masukan" aria-label="Transaksi pasangan">
            <option value="">— pilih transaksi bernilai sama —</option>
            <option v-for="c in aksi.pilihan" :key="c.id" :value="c.id">{{ tanggalPendek(c.tanggal) }} · {{ c.uraian.slice(0, 60) }} {{ c.bnu ? '· ' + c.bnu : '' }}</option>
          </select>
          <p v-if="!aksi.pilihan.length" class="text-xs text-slate-500">Tidak ada transaksi SIBOS dengan nilai yang sama — kemungkinan nilai di SIBOS berbeda (selisih).</p>
          <button class="tombol-garis" :disabled="!aksi.pasangan" @click="pasangkan"><Ikon nama="Link" :ukuran="16" class="text-biru" /> Pasangkan</button>
        </section>
      </div>
      <template #kaki>
        <button class="tombol-garis" @click="abaikan"><Ikon nama="Ban" :ukuran="16" class="text-slate-500" /> Abaikan</button>
        <button v-if="aksi.m.id_bku || aksi.m.abaikan" class="tombol-garis" @click="lepas"><Ikon nama="Unlink" :ukuran="16" class="text-amber-600" /> Lepas</button>
        <button class="tombol-garis ml-auto" @click="aksi = null">Tutup</button>
      </template>
    </Laci>
  </div>
</template>
