<script setup>
// Buku catatan sederhana (Fase 7) untuk Catatan Kas Sekolah dan Catatan Pribadi Bendahara.
// Setiap jenis punya efek +1 / −1 / 0 terhadap saldo; daftar per tahun, cari, ubah, hapus, Excel, cetak.
import { ref, reactive, computed, onMounted } from 'vue'
import { muatSemua, simpanSatu, hapusSatu, muatCatatanPribadi, simpanCatatanPribadi, hapusCatatanPribadi } from '@/services/catatan'
import { useNotifikasi } from '@/stores/notifikasi'
import { useTahun } from '@/stores/tahun'
import { rupiah, rupiahRingkas, tanggalPendek, keIso } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const props = defineProps({
  koleksi: { type: String, required: true },   // catatan_kas_sekolah | catatan_pribadi
  judul: { type: String, required: true },
  jenis: { type: Object, required: true },     // { kunci: { label, efek, ikon, warna } }
  labelSaldo: { type: String, default: 'Saldo' },
  bisaUbah: { type: Boolean, default: true },
  pribadi: Boolean,                            // hanya pemilik (uid) — tanpa log aktivitas
  bisaCetak: { type: Boolean, default: true },
})
const notif = useNotifikasi()
const ta = useTahun()
const tahun = ref(ta.aktif)
const semua = ref([])
const memuat = ref(true)
const cari = ref('')
onMounted(async () => {
  try { semua.value = await (props.pribadi ? muatCatatanPribadi() : muatSemua(props.koleksi)) } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
})
const urut = (a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.dibuat || '').localeCompare(String(b.dibuat || ''))
const efek = (x) => (props.jenis[x.jenis]?.efek || 0) * (Number(x.nilai) || 0)
const saldoAwal = computed(() => semua.value.filter((x) => String(x.tanggal).slice(0, 4) < String(tahun.value)).reduce((s, x) => s + efek(x), 0))
const baris = computed(() => {
  let saldo = saldoAwal.value
  return semua.value.filter((x) => String(x.tanggal).startsWith(String(tahun.value))).sort(urut)
    .map((x) => { saldo += efek(x); return { ...x, masuk: efek(x) > 0 ? efek(x) : 0, keluar: efek(x) < 0 ? -efek(x) : 0, saldo } })
})
const tampil = computed(() => [...baris.value].reverse().filter((x) => !cari.value || `${x.uraian} ${x.kategori || ''} ${x.keterangan || ''}`.toLowerCase().includes(cari.value.toLowerCase())))
const total = (k) => baris.value.reduce((s, x) => s + x[k], 0)
const saldoAkhir = computed(() => saldoAwal.value + total('masuk') - total('keluar'))
const statistik = computed(() => [
  { judul: props.labelSaldo, nilai: rupiahRingkas(saldoAkhir.value), sub: rupiah(saldoAkhir.value), ikon: 'Wallet', nada: 'gelap' },
  { judul: `${Object.values(props.jenis).find((j) => j.efek > 0)?.label || 'Masuk'} ${tahun.value}`, nilai: rupiahRingkas(total('masuk')), sub: rupiah(total('masuk')), ikon: 'ArrowDownLeft', nada: 'primer' },
  { judul: `${Object.values(props.jenis).find((j) => j.efek < 0)?.label || 'Keluar'} ${tahun.value}`, nilai: rupiahRingkas(total('keluar')), sub: rupiah(total('keluar')), ikon: 'ArrowUpRight', nada: 'primer' },
  { judul: 'Catatan', nilai: String(baris.value.length), sub: `Saldo awal ${rupiah(saldoAwal.value)}`, ikon: 'NotebookPen', nada: 'primer' },
])

const kunciPertama = Object.keys(props.jenis)[0]
const kosong = () => ({ id: null, tanggal: keIso(), jenis: kunciPertama, uraian: '', kategori: '', nilai: 0, keterangan: '' })
const f = reactive(kosong())
const form = ref(false)
function baru() { Object.assign(f, kosong()); form.value = true }
function ubah(x) { Object.assign(f, kosong(), { id: x.id, tanggal: x.tanggal, jenis: x.jenis, uraian: x.uraian, kategori: x.kategori || '', nilai: x.nilai, keterangan: x.keterangan || '' }); form.value = true }
async function simpan() {
  if (!f.uraian.trim() || !f.tanggal) { notif.kabari('Isi tanggal dan uraian.', 'galat'); return }
  const data = { tanggal: f.tanggal, jenis: f.jenis, uraian: f.uraian.trim(), kategori: f.kategori.trim(), nilai: Math.round(Number(f.nilai) || 0), keterangan: f.keterangan.trim(), dibuat: semua.value.find((x) => x.id === f.id)?.dibuat || new Date().toISOString() }
  try {
    const id = props.pribadi ? await simpanCatatanPribadi(f.id, data) : await simpanSatu(props.koleksi, f.id, data, `${f.id ? 'Mengubah' : 'Mencatat'} ${props.judul}: ${data.uraian} (${rupiah(data.nilai)})`)
    const i = semua.value.findIndex((x) => x.id === id)
    if (i >= 0) semua.value[i] = { id, ...data }; else semua.value.push({ id, ...data })
    form.value = false
  } catch (e) { notif.kabari(e.code === 'permission-denied' ? 'Ditolak: perbarui Firestore Rules Fase 7 terlebih dahulu.' : e.message, 'galat') }
}
async function hapus(x) {
  if (!confirm(`Hapus catatan "${x.uraian}"?`)) return
  try { props.pribadi ? await hapusCatatanPribadi(x.id) : await hapusSatu(props.koleksi, x.id, `Menghapus ${props.judul}: ${x.uraian}`); semua.value = semua.value.filter((y) => y.id !== x.id) } catch (e) { notif.kabari(e.message, 'galat') }
}

const kolom = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2.2cm', rata: 'tengah' },
  { judul: 'Jenis', nilai: (r) => props.jenis[r.jenis]?.label || r.jenis, lebar: '3cm' },
  { judul: 'Uraian', nilai: (r) => r.uraian + (r.keterangan ? ` — ${r.keterangan}` : '') },
  { judul: 'Kategori', nilai: (r) => r.kategori, lebar: '3cm' },
  { judul: 'Masuk', nilai: (r) => r.masuk, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Keluar', nilai: (r) => r.keluar, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (r) => r.saldo, lebar: '2.9cm', uang: true },
]
const cetak = ref(false)
async function excel() {
  try { await eksporExcel({ judul: `${props.judul} ${tahun.value}`, namaBerkas: `${props.judul} ${tahun.value}`, baris: baris.value, kolom: kolom.map((k) => ({ judul: k.judul, lebar: k.uang ? 16 : k.judul === 'Uraian' ? 50 : 16, nilai: k.nilai, jenis: k.uang ? 'uang' : 'teks' })) }) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-4">
    <GridStat :daftar="statistik" :memuat="memuat" :bisa-klik="false" ringkas />

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <select v-model.number="tahun" class="masukan w-auto py-2" aria-label="Tahun"><option v-for="t in ta.daftar" :key="t" :value="t">{{ t }}</option></select>
      <div class="relative min-w-[10rem] flex-1"><Ikon nama="Search" :ukuran="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari uraian" aria-label="Cari catatan" /></div>
      <button class="tombol-garis" aria-label="Excel" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="17" class="text-emerald-600" /></button>
      <button v-if="props.bisaCetak" class="tombol-garis" aria-label="Cetak" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /></button>
      <button v-if="props.bisaUbah" class="tombol-utama" @click="baru"><Ikon nama="Plus" :ukuran="17" /> Catat</button>
    </div>

    <section class="kartu overflow-hidden">
      <p v-if="!memuat && !tampil.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="NotebookPen" class="mx-auto mb-2 text-slate-400" /> Belum ada catatan tahun {{ tahun }}.</p>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="x in tampil" :key="x.id" class="flex items-center gap-3 px-4 py-3">
          <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-xl', props.jenis[x.jenis]?.warna || 'ikon-chip']"><Ikon :nama="props.jenis[x.jenis]?.ikon || 'NotebookPen'" :ukuran="16" /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ x.uraian }}</p>
            <p class="truncate text-xs text-slate-500">{{ tanggalPendek(x.tanggal) }} · {{ props.jenis[x.jenis]?.label }}{{ x.kategori ? ` · ${x.kategori}` : '' }}{{ x.keterangan ? ` · ${x.keterangan}` : '' }}</p>
          </div>
          <div class="text-right">
            <p :class="['angka text-sm font-bold', x.masuk ? 'text-emerald-600' : x.keluar ? 'text-rose-600' : 'text-slate-500']">{{ x.masuk ? '+' : x.keluar ? '−' : '' }}{{ rupiah(x.masuk || x.keluar || x.nilai) }}</p>
            <p class="angka text-[11px] text-slate-400">saldo {{ rupiahRingkas(x.saldo) }}</p>
          </div>
          <template v-if="props.bisaUbah">
            <button class="text-slate-400 hover:text-biru" :aria-label="`Ubah ${x.uraian}`" @click="ubah(x)"><Ikon nama="Pencil" :ukuran="16" /></button>
            <button class="text-slate-400 hover:text-rose-600" :aria-label="`Hapus ${x.uraian}`" @click="hapus(x)"><Ikon nama="Trash2" :ukuran="16" /></button>
          </template>
        </li>
      </ul>
    </section>

    <Teleport to="body">
      <div v-if="form" class="fixed inset-0 z-[70] grid place-items-end bg-slate-900/40 sm:place-items-center sm:p-4" @click.self="form = false">
        <form class="w-full max-w-md space-y-3 rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl dark:bg-slate-900" @submit.prevent="simpan">
          <div class="flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon :nama="f.id ? 'Pencil' : 'NotebookPen'" :ukuran="19" /></span>
            <h2 class="flex-1 font-bold">{{ f.id ? 'Ubah' : 'Catat' }} — {{ props.judul }}</h2>
            <button type="button" class="text-slate-400" aria-label="Tutup" @click="form = false"><Ikon nama="X" :ukuran="20" /></button>
          </div>
          <div class="flex flex-wrap gap-2">
            <label v-for="(j, k) in props.jenis" :key="k" :class="['flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold', f.jenis === k ? 'border-biru bg-biru/10 text-biru dark:text-blue-300' : 'border-slate-200 dark:border-slate-700']">
              <input v-model="f.jenis" type="radio" :value="k" class="sr-only" /><Ikon :nama="j.ikon" :ukuran="15" /> {{ j.label }}
            </label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label" for="c-tgl">Tanggal</label><input id="c-tgl" v-model="f.tanggal" type="date" class="masukan" required /></div>
            <div><label class="label" for="c-nilai">Nilai (Rp)</label><input id="c-nilai" v-model.number="f.nilai" type="number" min="0" class="masukan angka" /></div>
          </div>
          <div><label class="label" for="c-uraian">Uraian</label><input id="c-uraian" v-model="f.uraian" class="masukan" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label" for="c-kat">Kategori</label><input id="c-kat" v-model="f.kategori" class="masukan" placeholder="opsional" /></div>
            <div><label class="label" for="c-ket">Keterangan</label><input id="c-ket" v-model="f.keterangan" class="masukan" placeholder="opsional" /></div>
          </div>
          <div class="flex justify-end gap-2 pt-1"><button type="button" class="tombol-garis" @click="form = false">Batal</button><button class="tombol-utama"><Ikon nama="Save" :ukuran="17" /> Simpan</button></div>
        </form>
      </div>
    </Teleport>

    <CetakBuku v-if="cetak" :judul="props.judul" :subjudul="`Tahun ${tahun}`" :kolom="kolom" :baris="baris" excel orientasi="portrait" kecil
               :ringkasan="[['Saldo awal', saldoAwal], ['Masuk', total('masuk')], ['Keluar', total('keluar')], ['Saldo akhir', saldoAkhir]]"
               :ttd-kanan="{ jabatan: 'bendahara_bosp', label: 'Bendahara' }" @excel="excel" @tutup="cetak = false" />
  </div>
</template>
