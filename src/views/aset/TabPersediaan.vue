<script setup>
// Buku Persediaan barang habis pakai: masuk otomatis dari belanja (kelas Persediaan), keluar dari bon,
// penyesuaian dari stok opname (Juni & Desember), nilai harga rata-rata. Laporan persediaan per semester.
import InputAngka from '@/components/InputAngka.vue'
import { ref, reactive, computed } from 'vue'
import { useAset } from '@/stores/aset'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { JENIS_PERSEDIAAN } from '@/config/aset'
import { simpanPersediaan, hapusPersediaan } from '@/services/aset'
import { laporanPersediaan, kunciPersediaan } from '@/utils/aset'
import { rupiah, rupiahRingkas, tanggalPendek } from '@/utils/format'
import { eksporExcel } from '@/utils/excel'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import Laci from '@/components/Laci.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const aset = useAset()
const auth = useAuth()
const notif = useNotifikasi()
const bolehUbah = computed(() => auth.punyaPeran('bendahara', 'pengurus_barang'))

const barang = computed(() => [...aset.buku.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id')))
const cari = ref('')
const tampil = computed(() => { const q = cari.value.trim().toLowerCase(); return barang.value.filter((g) => !q || g.nama.toLowerCase().includes(q)) })
const statistik = computed(() => [
  { judul: 'Jenis barang', nilai: barang.value.length, sub: `${barang.value.filter((g) => g.saldo > 0).length} masih ada stok`, ikon: 'Package', nada: 'gelap' },
  { judul: 'Nilai persediaan', nilai: rupiahRingkas(barang.value.reduce((s, g) => s + g.nilai, 0)), sub: 'harga rata-rata', ikon: 'Warehouse', nada: 'primer', ringkas: true },
  { judul: 'Masuk dari belanja', nilai: rupiahRingkas(aset.barang.filter((x) => x.kelas === 'persediaan').reduce((s, x) => s + x.jumlah, 0)), sub: `TA ${aset.tahun}`, ikon: 'PackagePlus', nada: 'primer', ringkas: true },
  { judul: 'Catatan bon & opname', nilai: aset.persediaan.length, sub: `${aset.persediaan.filter((m) => m.jenis === 'opname').length} kali opname`, ikon: 'ClipboardCheck', nada: 'primer' },
])

// Formulir mutasi
const form = ref(null)
const f = reactive({ id: null, jenis: 'keluar', tanggal: '', penerima: '', keperluan: '', keterangan: '', butir: [] })
const menyimpan = ref(false)
const saldoPada = (kunci, tgl) => (aset.buku.get(kunci)?.baris.filter((r) => r.tanggal <= tgl).at(-1)?.saldo) || 0
function buka(jenis, m = null) {
  const hariIni = new Date().toISOString().slice(0, 10)
  Object.assign(f, { id: m?.id || null, jenis: m?.jenis || jenis, tanggal: m?.tanggal || (jenis === 'awal' ? `${aset.tahun}-01-01` : hariIni), penerima: m?.penerima || '', keperluan: m?.keperluan || '', keterangan: m?.keterangan || (jenis === 'opname' ? (new Date().getMonth() < 6 ? 'Semester I' : 'Semester II') : ''),
    butir: m ? JSON.parse(JSON.stringify(m.butir || [])) : jenis === 'opname' ? barang.value.map((g) => ({ kunci: g.kunci, nama: g.nama, satuan: g.satuan, sisa_fisik: saldoPada(g.kunci, hariIni), buku: saldoPada(g.kunci, hariIni) })) : [{ kunci: '', nama: '', satuan: '', jumlah: 1, harga: 0 }] })
  form.value = true
}
function pilihBarang(u, kunci) { const g = aset.buku.get(kunci); if (g) Object.assign(u, { kunci, nama: g.nama, satuan: g.satuan }) }
const sah = computed(() => f.tanggal && f.butir.some((u) => (u.nama || '').trim() && (f.jenis === 'opname' ? u.sisa_fisik !== '' && u.sisa_fisik != null : Number(u.jumlah) > 0)))
async function simpan() {
  menyimpan.value = true
  const butir = f.butir.filter((u) => (u.nama || '').trim()).map((u) => ({ kunci: u.kunci || kunciPersediaan(u.nama, u.satuan), nama: u.nama.trim(), satuan: (u.satuan || '').trim(),
    ...(f.jenis === 'opname' ? { sisa_fisik: Number(u.sisa_fisik) || 0 } : { jumlah: Number(u.jumlah) || 0 }), ...(f.jenis === 'awal' ? { harga: Math.round(Number(u.harga) || 0) } : {}) }))
  try {
    await simpanPersediaan(f.id, { jenis: f.jenis, tanggal: f.tanggal, penerima: f.penerima, keperluan: f.keperluan, keterangan: f.keterangan, butir })
    notif.kabari('Persediaan dicatat.'); form.value = null; await aset.segarkan()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus() {
  if (!confirm('Hapus catatan ini? Saldo persediaan dihitung ulang.')) return
  try { await hapusPersediaan({ id: f.id, jenis: f.jenis, tanggal: f.tanggal }); form.value = null; await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}

// Kartu & laporan
const kartu = ref(null)
const cetak = ref('')
const periode = ref('1')
const rentang = computed(() => (periode.value === '1' ? [`${aset.tahun}-01-01`, `${aset.tahun}-06-30`, 'Semester I'] : periode.value === '2' ? [`${aset.tahun}-07-01`, `${aset.tahun}-12-31`, 'Semester II'] : [`${aset.tahun}-01-01`, `${aset.tahun}-12-31`, 'Tahun']))
const laporan = computed(() => laporanPersediaan(aset.buku, rentang.value[0], rentang.value[1]))
const kolomLap = [
  { judul: 'Nama Barang', nilai: (r) => r.nama },
  { judul: 'Satuan', nilai: (r) => r.satuan, lebar: '1.8cm', rata: 'tengah' },
  { judul: 'Saldo Awal', nilai: (r) => r.awal, lebar: '1.8cm', rata: 'tengah' },
  { judul: 'Masuk', nilai: (r) => r.masuk, lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Keluar', nilai: (r) => r.keluar, lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Sisa', nilai: (r) => r.akhir, lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Harga Rata-rata', nilai: (r) => r.harga, lebar: '2.6cm', uang: true },
  { judul: 'Nilai Sisa (Rp)', nilai: (r) => r.nilai, lebar: '2.8cm', uang: true, jumlah: true },
]
const kolomKartu = [
  { judul: 'Tanggal', nilai: (r) => tanggalPendek(r.tanggal), lebar: '2cm', rata: 'tengah' },
  { judul: 'Uraian', nilai: (r) => r.uraian },
  { judul: 'Masuk', nilai: (r) => r.masuk || '', lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Keluar', nilai: (r) => r.keluar || '', lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Sisa', nilai: (r) => r.saldo, lebar: '1.6cm', rata: 'tengah' },
  { judul: 'Harga', nilai: (r) => r.harga, lebar: '2.4cm', uang: true },
  { judul: 'Nilai Sisa', nilai: (r) => r.nilai_saldo, lebar: '2.6cm', uang: true },
]
async function excel() {
  try {
    await eksporExcel({ judul: `Laporan Persediaan ${rentang.value[2]} ${aset.tahun}`, namaBerkas: `Laporan Persediaan ${rentang.value[2]} ${aset.tahun}`, baris: laporan.value,
      kolom: kolomLap.map((k) => ({ judul: k.judul, lebar: k.judul === 'Nama Barang' ? 45 : 15, nilai: k.nilai, jenis: k.uang ? 'uang' : ['Saldo Awal', 'Masuk', 'Keluar', 'Sisa'].includes(k.judul) ? 'angka' : 'teks' })) })
  } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="aset.memuat" :bisa-klik="false" />

    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="persediaan-aksi">
      <div class="relative min-w-[12rem] flex-1">
        <Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" type="search" class="masukan py-2 pl-9" placeholder="Cari barang persediaan" aria-label="Cari barang persediaan" />
      </div>
      <template v-if="bolehUbah">
        <button class="tombol-utama" @click="buka('keluar')"><Ikon nama="PackageMinus" :ukuran="17" /> Barang keluar</button>
        <button class="tombol-garis" @click="buka('opname')"><Ikon nama="ClipboardCheck" :ukuran="17" class="text-[#22A08D]" /> Stok opname</button>
        <button class="tombol-garis" @click="buka('awal')"><Ikon nama="PiggyBank" :ukuran="17" class="text-[#E3A414]" /> <span class="hidden sm:inline">Saldo awal</span></button>
      </template>
      <select v-model="periode" class="masukan w-auto py-2" aria-label="Periode laporan"><option value="1">Semester I</option><option value="2">Semester II</option><option value="t">Setahun</option></select>
      <button class="tombol-garis" @click="cetak = 'laporan'"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Laporan</span></button>
    </div>

    <div class="kartu flex items-start gap-3 p-4 text-sm text-slate-600 dark:text-slate-300">
      <Ikon nama="Lightbulb" class="mt-0.5 shrink-0 text-[#E3A414]" />
      <span>Barang masuk otomatis dari belanja yang dikelompokkan <b>Persediaan</b>. Catat <b>barang keluar</b> bila sempat; pada akhir Juni & Desember lakukan <b>stok opname</b> — selisih buku dan fisik dicatat sebagai pemakaian.</span>
    </div>

    <section class="kartu overflow-hidden" data-tur="persediaan-daftar">
      <div class="divide-y divide-slate-100 dark:divide-slate-800">
        <button v-for="g in tampil" :key="g.kunci" class="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="kartu = g">
          <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', g.saldo > 0 ? 'ikon-chip-kuning' : 'ikon-chip']"><Ikon nama="Package" :ukuran="18" /></span>
          <div class="min-w-0 flex-1"><p class="truncate font-semibold">{{ g.nama }}</p><p class="text-xs text-slate-500">Masuk {{ g.masuk }} · keluar {{ g.keluar }} · {{ g.baris.length }} catatan</p></div>
          <div class="shrink-0 text-right"><p class="angka font-bold">{{ g.saldo }} {{ g.satuan }}</p><p class="angka text-xs text-slate-500">{{ rupiah(g.nilai) }}</p></div>
        </button>
        <p v-if="!tampil.length" class="p-8 text-center text-sm text-slate-500">Belum ada barang persediaan. Kelompokkan barang belanja sebagai Persediaan di tab Barang dari Belanja.</p>
      </div>
    </section>

    <!-- Riwayat bon & opname -->
    <section v-if="aset.persediaan.length" class="kartu p-4">
      <h2 class="mb-2 flex items-center gap-2 font-bold"><Ikon nama="History" :ukuran="18" class="text-biru" /> Catatan bon, opname & saldo awal</h2>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="m in aset.persediaan.slice().sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)))" :key="m.id">
          <button class="flex w-full items-center gap-3 py-2 text-left" :disabled="!bolehUbah" @click="buka(m.jenis, m)">
            <Ikon :nama="JENIS_PERSEDIAAN[m.jenis].ikon" :ukuran="17" class="shrink-0 text-[#22A08D]" />
            <span class="min-w-0 flex-1"><span class="block text-sm font-semibold">{{ JENIS_PERSEDIAAN[m.jenis].label }} · {{ tanggalPendek(m.tanggal) }}</span>
              <span class="block truncate text-xs text-slate-500">{{ m.penerima || m.keterangan || '' }}{{ m.keperluan ? ' — ' + m.keperluan : '' }} · {{ (m.butir || []).length }} barang</span></span>
            <Ikon v-if="bolehUbah" nama="Pencil" :ukuran="15" class="text-slate-300" />
          </button>
        </li>
      </ul>
    </section>

    <!-- Formulir -->
    <Laci v-if="form" :judul="JENIS_PERSEDIAAN[f.jenis].label" :subjudul="f.id ? 'Ubah catatan' : 'Catatan baru'" :ikon="JENIS_PERSEDIAAN[f.jenis].ikon" @tutup="form = null">
      <div class="space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="ps-tgl">Tanggal</label><input id="ps-tgl" v-model="f.tanggal" type="date" class="masukan" /></div>
          <div v-if="f.jenis === 'keluar'"><label class="label" for="ps-pen">Diberikan kepada</label><input id="ps-pen" v-model="f.penerima" class="masukan" placeholder="Nama / unit (mis. Tata Usaha)" /></div>
          <div v-else><label class="label" for="ps-ket">Keterangan</label><input id="ps-ket" v-model="f.keterangan" class="masukan" /></div>
          <div v-if="f.jenis === 'keluar'" class="sm:col-span-2"><label class="label" for="ps-kep">Keperluan</label><input id="ps-kep" v-model="f.keperluan" class="masukan" /></div>
        </div>
        <div class="space-y-2">
          <p class="label">{{ f.jenis === 'opname' ? 'Sisa fisik hasil hitung' : 'Barang' }}</p>
          <div v-for="(u, i) in f.butir" :key="i" class="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
            <template v-if="f.jenis === 'opname'">
              <div class="min-w-0 flex-1"><p class="text-sm font-semibold">{{ u.nama }}</p><p class="text-xs text-slate-500">Menurut buku: {{ u.buku ?? saldoPada(u.kunci, f.tanggal) }} {{ u.satuan }}</p></div>
              <InputAngka v-model="u.sisa_fisik" class="masukan angka w-24" :aria-label="`Sisa fisik ${u.nama}`" />
            </template>
            <template v-else>
              <div class="min-w-[10rem] flex-1">
                <select v-if="f.jenis === 'keluar'" :value="u.kunci" class="masukan" :aria-label="`Barang baris ${i + 1}`" @change="pilihBarang(u, $event.target.value)">
                  <option value="">Pilih barang…</option><option v-for="g in barang" :key="g.kunci" :value="g.kunci">{{ g.nama }} (sisa {{ g.saldo }} {{ g.satuan }})</option>
                </select>
                <input v-else v-model="u.nama" class="masukan" placeholder="Nama barang" :aria-label="`Nama barang baris ${i + 1}`" />
              </div>
              <input v-if="f.jenis === 'awal'" v-model="u.satuan" class="masukan w-24" placeholder="Satuan" aria-label="Satuan" />
              <InputAngka v-model="u.jumlah" class="masukan angka w-20" aria-label="Jumlah" />
              <InputAngka v-if="f.jenis === 'awal'" v-model="u.harga" class="masukan angka w-32" placeholder="Harga" aria-label="Harga satuan" />
              <button class="grid h-10 w-10 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" aria-label="Hapus baris" @click="f.butir.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
            </template>
          </div>
          <button v-if="f.jenis !== 'opname'" class="tombol-garis text-sm" @click="f.butir.push({ kunci: '', nama: '', satuan: '', jumlah: 1, harga: 0 })"><Ikon nama="Plus" :ukuran="15" /> Baris</button>
        </div>
      </div>
      <template #kaki>
        <button v-if="f.id" class="tombol-garis text-rose-600" @click="hapus"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
        <button class="tombol-utama ml-auto" :disabled="!sah || menyimpan" @click="simpan"><Ikon nama="Save" :ukuran="17" /> Simpan</button>
      </template>
    </Laci>

    <CetakBuku v-if="kartu" judul="Kartu Persediaan Barang" :subjudul="`${kartu.nama} (${kartu.satuan})`" :kolom="kolomKartu" :baris="kartu.baris" :tanggal="new Date().toISOString().slice(0, 10)" orientasi="portrait"
               :ringkasan="[['Sisa', `${kartu.saldo} ${kartu.satuan}`], ['Nilai sisa', kartu.nilai]]"
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui, Kepala Sekolah' }" :ttd-kanan="{ jabatan: 'pengurus_barang', label: 'Pengurus Barang' }" @tutup="kartu = null" />
    <CetakBuku v-if="cetak === 'laporan'" :judul="`Laporan Persediaan Barang ${rentang[2]}`" :subjudul="`Tahun Anggaran ${aset.tahun} (keadaan ${tanggalPendek(rentang[1])})`" :kolom="kolomLap" :baris="laporan" :tanggal="rentang[1]" orientasi="portrait" excel
               :ttd-kiri="{ jabatan: 'kepala_sekolah', label: 'Mengetahui, Kepala Sekolah' }" :ttd-kanan="{ jabatan: 'pengurus_barang', label: 'Pengurus Barang' }" @excel="excel" @tutup="cetak = ''" />
  </div>
</template>
