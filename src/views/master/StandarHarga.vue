<script setup>
// Standar Harga Satuan: katalog harga tetap (satu harga per item per tahun). Hanya Bendahara yang mengubah.
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { useRkas } from '@/stores/rkas'
import { modePratinjau } from '@/services/firebase'
import { muatStandarHarga, simpanHarga, hapusHarga, simpanHargaMassal, tebakKelompok } from '@/services/rkas'
import { KATEGORI } from '@/utils/arkas'
import { eksporExcel } from '@/utils/excel'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import KartuStat from '@/components/KartuStat.vue'
import CetakDaftar from '@/components/cetak/CetakDaftar.vue'
import FormHarga from './FormHarga.vue'

const route = useRoute()
const auth = useAuth()
const notif = useNotifikasi()
const rkas = useRkas()
const daftar = ref([])
const memuat = ref(true)
const cari = ref('')
const kelompok = ref('semua')
const terpilih = ref(null)
const menyimpan = ref(false)

async function muat() {
  memuat.value = true
  try { daftar.value = await muatStandarHarga() } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
}
onMounted(async () => {
  await muat()
  if (route.query.dari === 'rkas' && auth.isAdmin) siapkanDariRkas()
})

const WARNA = {
  Konsumsi: ['from-amber-400 via-orange-400 to-orange-600', 'shadow-orange-500/30', 'UtensilsCrossed'],
  Transpor: ['from-sky-400 via-sky-500 to-blue-600', 'shadow-sky-500/30', 'Bus'],
  Honor: ['from-rose-400 via-pink-500 to-fuchsia-600', 'shadow-pink-500/30', 'HeartHandshake'],
  Jasa: ['from-violet-500 via-purple-500 to-indigo-600', 'shadow-violet-500/30', 'Wrench'],
  ATK: ['from-emerald-400 via-teal-500 to-teal-600', 'shadow-teal-500/30', 'Pencil'],
}
const daftarKelompok = computed(() => [...new Set(daftar.value.map((h) => h.kelompok || 'Barang Lainnya'))].sort())
const statistik = computed(() => {
  const d = daftar.value
  const n = (k) => d.filter((h) => h.kelompok === k).length
  return [
    { judul: 'Item harga', nilai: d.length, ikon: 'Tags', warna: 'from-amber-400 via-orange-500 to-rose-500', bayangan: 'shadow-orange-500/30', k: 'semua', sub: `${daftarKelompok.value.length} kelompok · ${d.filter((h) => h.aktif !== false).length} aktif` },
    ...['Konsumsi', 'Honor', 'ATK'].map((k) => ({ judul: k, nilai: n(k), ikon: WARNA[k][2], warna: WARNA[k][0], bayangan: WARNA[k][1], k, sub: k === 'Konsumsi' ? 'Makan, snack, air' : k === 'Honor' ? 'Narasumber, panitia, tenaga' : 'Alat tulis kantor' })),
  ]
})
const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return daftar.value.filter((h) => (kelompok.value === 'semua' || h.kelompok === kelompok.value) &&
    (!q || [h.nama_item, h.spesifikasi, h.kode_item, h.kode_rekening, h.satuan].some((v) => String(v || '').toLowerCase().includes(q))))
})
const kelompokTampil = computed(() => {
  const m = new Map()
  hasil.value.forEach((h) => m.set(h.kelompok || 'Barang Lainnya', [...(m.get(h.kelompok || 'Barang Lainnya') || []), h]))
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})

function kodeBaru(isi) {
  const n = Math.max(0, ...isi.map((h) => Number(String(h.kode_item || '').replace(/\D/g, '')) || 0)) + 1
  return `SH-${String(n).padStart(4, '0')}`
}
async function simpan(data) {
  if (modePratinjau) { notif.kabari('Mode Pratinjau: data tidak disimpan.', 'info'); terpilih.value = null; return }
  menyimpan.value = true
  try {
    if (!data.kode_item) data.kode_item = kodeBaru(daftar.value)
    await simpanHarga(terpilih.value?.id || null, data, terpilih.value?.id ? terpilih.value : null)
    notif.kabari(`${data.nama_item} tersimpan.`); terpilih.value = null; await muat()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus() {
  if (!confirm(`Hapus ${terpilih.value.nama_item}? Sebaiknya nonaktifkan saja bila sudah dipakai di belanja.`)) return
  try { await hapusHarga(terpilih.value); notif.kabari('Item dihapus.'); terpilih.value = null; await muat() } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Ambil dari RKAS ---------- */
const usulan = ref(null)
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
async function siapkanDariRkas() {
  await rkas.muat()
  const versi = rkas.versiBerlaku
  if (!versi) { notif.kabari('Belum ada RKAS. Impor RKAS dulu.', 'galat'); return }
  if (rkas.idVersi !== versi.id) await rkas.pilihVersi(versi.id)
  // Satu item per (nama, satuan, harga). Nama sama dengan harga berbeda = varian (item terpisah).
  const peta = new Map()
  for (const u of rkas.uraian) {
    const k = `${norm(u.uraian)}|${norm(u.satuan)}|${u.harga}`
    if (!peta.has(k)) peta.set(k, { ...u, kegiatan: new Set() })
    peta.get(k).kegiatan.add(rkas.nama.kegiatan(u.kode_kegiatan) || u.kode_kegiatan)
  }
  const varian = new Map()
  for (const x of peta.values()) { const k = `${norm(x.uraian)}|${norm(x.satuan)}`; varian.set(k, (varian.get(k) || 0) + 1) }
  const ada = new Map(daftar.value.map((h) => [`${norm(h.nama_item)}|${norm(h.satuan)}|${h.harga}`, h]))
  const adaNama = new Map(); daftar.value.forEach((h) => { const k = `${norm(h.nama_item)}|${norm(h.satuan)}`; adaNama.set(k, [...(adaNama.get(k) || []), h]) })
  const baris = [...peta.values()].map((x) => {
    const kNama = `${norm(x.uraian)}|${norm(x.satuan)}`
    const sama = ada.get(`${kNama}|${x.harga}`)
    const lama = !sama && varian.get(kNama) === 1 && adaNama.get(kNama)?.length === 1 ? adaNama.get(kNama)[0] : null
    const status = sama ? 'sama' : lama ? 'berubah' : 'baru'
    const tebak = tebakKelompok(x)
    return {
      pilih: status !== 'sama', status, lama, sama, nama_item: x.uraian, satuan: x.satuan, harga: x.harga, kode_rekening: x.kode_rekening, kategori: x.kategori,
      ...tebak, varian: varian.get(kNama) > 1, kegiatan: [...x.kegiatan].slice(0, 3).join('; '),
    }
  }).sort((a, b) => ({ baru: 0, berubah: 1, sama: 2 }[a.status] - { baru: 0, berubah: 1, sama: 2 }[b.status]) || a.kelompok.localeCompare(b.kelompok) || a.nama_item.localeCompare(b.nama_item))
  usulan.value = { versi, baris }
}
const ringkasUsulan = computed(() => usulan.value ? ['baru', 'berubah', 'sama'].map((s) => [s, usulan.value.baris.filter((b) => b.status === s).length]) : [])
async function terapkanUsulan() {
  if (modePratinjau) { notif.kabari('Mode Pratinjau: data tidak disimpan.', 'info'); return }
  const pilih = usulan.value.baris.filter((b) => b.pilih && b.status !== 'sama')
  if (!pilih.length) return
  menyimpan.value = true
  try {
    const kumpulan = [...daftar.value]
    const tahun = usulan.value.versi.tahun
    const item = pilih.map((b) => {
      const sebelum = b.lama
      const kode = sebelum?.kode_item || kodeBaru(kumpulan)
      if (!sebelum) kumpulan.push({ kode_item: kode })
      return {
        id: sebelum?.id || null, sebelum,
        data: {
          ...(sebelum || {}), kode_item: kode, kelompok: sebelum?.kelompok || b.kelompok, nama_item: b.nama_item, spesifikasi: sebelum?.spesifikasi || (b.varian ? `Varian harga RKAS: ${b.kegiatan}` : ''),
          satuan: b.satuan, harga: b.harga, jenis: sebelum?.jenis || b.jenis, kode_rekening: b.kode_rekening, kategori: b.kategori, pajak_bawaan: sebelum?.pajak_bawaan ?? b.pajak_bawaan,
          tahun, aktif: true, sumber: `RKAS ${tahun} ${usulan.value.versi.nama}`,
        },
      }
    })
    const r = await simpanHargaMassal(item, `Standar harga dari RKAS ${tahun} ${usulan.value.versi.nama}`)
    notif.kabari(`${r.tambah} item baru, ${r.ubah} harga diperbarui.`)
    usulan.value = null
    await muat()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

/* ---------- Cetak & ekspor ---------- */
const cetakTerbuka = ref(false)
const kolomCetak = [
  { judul: 'Kode', nilai: (h) => h.kode_item, lebar: '1.8cm' },
  { judul: 'Kelompok', nilai: (h) => h.kelompok, lebar: '2.8cm' },
  { judul: 'Nama Item', nilai: (h) => h.nama_item + (h.spesifikasi ? ` (${h.spesifikasi})` : '') },
  { judul: 'Satuan', nilai: (h) => h.satuan, lebar: '2.6cm' },
  { judul: 'Harga (Rp)', nilai: (h) => rupiah(h.harga, { tanpaRp: true }), lebar: '2.6cm', rata: 'kanan' },
  { judul: 'Kode Rekening', nilai: (h) => h.kode_rekening, lebar: '3.3cm' },
  { judul: 'Kategori', nilai: (h) => KATEGORI[h.kategori]?.nama || '', lebar: '2.8cm' },
  { judul: 'Pajak', nilai: (h) => h.pajak_bawaan || '-', lebar: '1.8cm', rata: 'tengah' },
]
async function ekspor() {
  const kolom = [
    { kunci: 'kode_item', judul: 'Kode Item', lebar: 11 }, { kunci: 'kelompok', judul: 'Kelompok', lebar: 18 }, { kunci: 'nama_item', judul: 'Nama Item', lebar: 44 },
    { kunci: 'spesifikasi', judul: 'Spesifikasi', lebar: 26 }, { kunci: 'satuan', judul: 'Satuan', lebar: 14 }, { kunci: 'harga', judul: 'Harga', lebar: 14, jenis: 'uang' },
    { kunci: 'kode_rekening', judul: 'Kode Rekening', lebar: 20 }, { judul: 'Kategori', lebar: 18, nilai: (h) => KATEGORI[h.kategori]?.nama || '' },
    { kunci: 'pajak_bawaan', judul: 'Pajak Bawaan', lebar: 12 }, { kunci: 'tahun', judul: 'Tahun', lebar: 8 }, { kunci: 'aktif', judul: 'Aktif', lebar: 8 },
  ]
  try { await eksporExcel({ judul: 'Standar Harga Satuan', kolom, baris: hasil.value, namaBerkas: 'Standar Harga Satuan SIBOS' }) } catch (e) { notif.kabari(e.message, 'galat') }
}
const warnaKelompok = (k) => (WARNA[k] || ['from-slate-400 to-slate-600'])[0]
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KartuStat v-for="s in statistik" :key="s.judul" v-bind="s" :memuat="memuat" :aktif="kelompok === s.k && s.k !== 'semua'" @klik="kelompok = s.k" />
    </div>

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[14rem] flex-1">
        <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="cari" class="masukan pl-9" placeholder="Cari item, spesifikasi, kode rekening…" />
      </div>
      <select v-model="kelompok" class="masukan w-auto"><option value="semua">Semua kelompok</option><option v-for="k in daftarKelompok" :key="k" :value="k">{{ k }}</option></select>
      <div class="ml-auto flex flex-wrap gap-2">
        <button class="tombol-garis" @click="cetakTerbuka = true"><Ikon nama="Printer" :ukuran="17" class="text-merah" /> Cetak / Unduh</button>
        <template v-if="auth.isAdmin">
          <button class="tombol-garis" @click="siapkanDariRkas"><Ikon nama="ClipboardList" :ukuran="17" class="text-kuning" /> Ambil dari RKAS</button>
          <button class="tombol bg-orange-500 text-white hover:bg-orange-600" @click="terpilih = {}"><Ikon nama="Plus" :ukuran="17" /> Tambah</button>
        </template>
      </div>
    </div>

    <!-- Usulan dari RKAS -->
    <section v-if="usulan" class="kartu overflow-hidden">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-slate-800 dark:from-amber-950/30 dark:to-orange-950/20">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow"><Ikon nama="ClipboardList" :ukuran="19" /></span>
        <div class="flex-1">
          <h2 class="font-bold">Harga dari RKAS {{ usulan.versi.tahun }} · {{ usulan.versi.nama }}</h2>
          <p class="text-xs text-slate-600 dark:text-slate-300">Satu harga per item per tahun; nama sama dengan harga berbeda menjadi item varian. Centang yang akan disimpan.</p>
        </div>
        <div class="flex gap-1.5 text-xs">
          <span v-for="[s, n] in ringkasUsulan" :key="s" :class="['lencana', s === 'baru' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : s === 'berubah' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300']">{{ n }} {{ s }}</span>
        </div>
        <button class="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/60 dark:hover:bg-slate-800" aria-label="Tutup" @click="usulan = null"><Ikon nama="X" :ukuran="18" /></button>
      </div>
      <div class="max-h-[26rem] overflow-auto">
        <table class="w-full min-w-[820px] text-sm">
          <thead class="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr><th class="px-3 py-2"><input type="checkbox" class="h-4 w-4" :checked="usulan.baris.every((b) => b.pilih || b.status === 'sama')" @change="usulan.baris.forEach((b) => b.status !== 'sama' && (b.pilih = $event.target.checked))" /></th><th class="px-2 py-2">Status</th><th class="px-2 py-2">Kelompok</th><th class="px-2 py-2">Item</th><th class="px-2 py-2">Satuan</th><th class="px-2 py-2 text-right">Harga</th><th class="px-3 py-2">Rekening</th></tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in usulan.baris" :key="i" class="border-t border-slate-100 dark:border-slate-800">
              <td class="px-3 py-1.5"><input v-model="b.pilih" type="checkbox" class="h-4 w-4" :disabled="b.status === 'sama'" /></td>
              <td class="px-2 py-1.5"><span :class="['lencana', b.status === 'baru' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : b.status === 'berubah' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800']">{{ b.status }}</span></td>
              <td class="px-2 py-1.5"><input v-model="b.kelompok" class="w-32 rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700" /></td>
              <td class="px-2 py-1.5">{{ b.nama_item }}<span v-if="b.varian" class="lencana ml-1.5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">varian</span></td>
              <td class="px-2 py-1.5 text-slate-600 dark:text-slate-300">{{ b.satuan }}</td>
              <td class="angka px-2 py-1.5 text-right">{{ rupiah(b.harga, { tanpaRp: true }) }}<span v-if="b.lama" class="block text-[11px] text-slate-400 line-through">{{ rupiah(b.lama.harga, { tanpaRp: true }) }}</span></td>
              <td class="kode px-3 py-1.5 text-xs">{{ b.kode_rekening }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex justify-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <button class="tombol-garis" @click="usulan = null">Batal</button>
        <button class="tombol-utama" :disabled="menyimpan || !usulan.baris.some((b) => b.pilih && b.status !== 'sama')" @click="terapkanUsulan">
          <Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan {{ usulan.baris.filter((b) => b.pilih && b.status !== 'sama').length }} item
        </button>
      </div>
    </section>

    <div v-if="memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat standar harga…</div>
    <div v-else-if="!hasil.length" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white"><Ikon nama="Tags" :ukuran="26" /></span>
      <p class="font-semibold">{{ daftar.length ? 'Tidak ada yang cocok.' : 'Belum ada standar harga.' }}</p>
      <button v-if="!daftar.length && auth.isAdmin" class="tombol-utama" @click="siapkanDariRkas"><Ikon nama="ClipboardList" :ukuran="17" /> Ambil dari RKAS</button>
    </div>
    <section v-for="[k, isi] in kelompokTampil" v-else :key="k" class="kartu overflow-hidden">
      <div class="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span :class="['grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', warnaKelompok(k)]"><Ikon :nama="WARNA[k]?.[2] || 'Package'" :ukuran="17" /></span>
        <h3 class="flex-1 font-bold">{{ k }}</h3><span class="lencana bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ isi.length }} item</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <tbody>
            <tr v-for="h in isi" :key="h.id" :class="['cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40', h.aktif === false && 'opacity-50']" @click="terpilih = h">
              <td class="kode w-24 px-4 py-2.5 text-xs text-slate-500">{{ h.kode_item }}</td>
              <td class="px-2 py-2.5"><p class="font-medium">{{ h.nama_item }}</p><p v-if="h.spesifikasi" class="text-xs text-slate-500">{{ h.spesifikasi }}</p></td>
              <td class="w-36 px-2 py-2.5 text-slate-600 dark:text-slate-300">{{ h.satuan }}</td>
              <td class="angka w-32 px-2 py-2.5 text-right font-bold">{{ rupiah(h.harga) }}</td>
              <td class="w-28 px-2 py-2.5"><span :class="['lencana bg-gradient-to-r text-white', KATEGORI[h.kategori]?.warna]">{{ KATEGORI[h.kategori]?.nama }}</span></td>
              <td class="w-24 px-4 py-2.5 text-right text-xs text-slate-500">{{ h.pajak_bawaan || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <CetakDaftar v-if="cetakTerbuka" judul="Standar Harga Satuan" :subjudul="`Tahun Anggaran ${rkas.tahun}`" :kolom="kolomCetak" :baris="hasil" excel @tutup="cetakTerbuka = false" @excel="ekspor" />
    <FormHarga v-if="terpilih" :item="terpilih.id ? terpilih : null" :boleh-ubah="auth.isAdmin" :menyimpan="menyimpan" :kelompok="daftarKelompok" :semua="daftar"
               @tutup="terpilih = null" @simpan="simpan" @hapus="hapus" />
  </div>
</template>
