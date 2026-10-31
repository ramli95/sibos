<script setup>
// Formulir belanja barang/jasa (Non-SIPLah & SIPLah). Satu formulir, boleh disimpan sebagian:
// status Draf → Dipesan → Diterima → Lunas ditentukan otomatis dari tanggal yang terisi.
import { reactive, ref, shallowRef, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRkas } from '@/stores/rkas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatBahan, namaGelar } from '@/services/bahanBelanja'
import { muatBelanja, simpanBelanja, nomorGanda, rapikanBelanja } from '@/services/belanja'
import { NAMA_REKENING } from '@/services/rkas'
import { pejabatPada } from '@/services/pejabat'
import { CARA, MITRA_SIPLAH, DOKUMEN, DOKUMEN_PILIHAN, JENIS_NOMOR, BATAS, KATEGORI_LABEL, STATUS } from '@/config/belanja'
import {
  rapikanItem, totalItem, kunciUraian, kelompokRekening, periksaUrutanTanggal, URUTAN_TANGGAL, perkiraanPajak, statusBelanja, dokumenTransaksi,
  salin,
} from '@/utils/belanja'
import { rupiah, keIso, dariIso, terbilang } from '@/utils/format'
import { hanyaAngka } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'
import PilihItem from './PilihItem.vue'

const route = useRoute()
const router = useRouter()
const rkas = useRkas()
const belanja = useBelanja()
const notif = useNotifikasi()

const idUbah = computed(() => route.params.id || null)
const bahan = ref(null)
const sebelum = shallowRef(null)
const memuat = ref(true)
const menyimpan = ref(false)

const hariIni = keIso()
const f = reactive({
  jenis: 'pengadaan', cara: 'non_siplah', mitra_siplah: '', nama_pekerjaan: '', uraian_pembayaran: '',
  id_rekanan: null, rekanan: null, item: [], pelaksana: 'kepala_sekolah', pemeriksa: null,
  tgl_pesanan: hariIni, tgl_terima: '', tgl_proforma: '', tgl_invoice: '', tgl_lunas: '', tgl_kwitansi: '',
  waktu_serah: '', lokasi_serah: 'UPT SPF SMP Negeri 19 Makassar', persyaratan: ['Identitas penyedia', 'NPWP'],
  nomor: {}, nomor_manual: {}, bnu: {}, dokumen: Object.fromEntries(DOKUMEN_PILIHAN.map((d) => [d.kunci, d.bawaan])),
  lampiran: { baris_hadir: 30, baris_konsumsi: 50, foto_per_halaman: 4, peserta_pegawai: true },
  pembanding: [], siplah: { nomor_sp: '', nomor_bast: '', nomor_invoice: '', berkas: {} }, catatan: '', notulen: '',
  arsip: {}, jumlah_foto: 0,
})

onMounted(async () => {
  try {
    const [b] = await Promise.all([muatBahan(), rkas.muat(), belanja.muat()])
    bahan.value = b
    if (idUbah.value) {
      const x = await muatBelanja(idUbah.value)
      if (!x) { notif.kabari('Transaksi tidak ditemukan.', 'galat'); router.replace('/belanja/daftar'); return }
      if (x.jenis === 'honor') { router.replace(`/belanja/honor/ubah/${x.id}`); return }
      sebelum.value = x
      Object.assign(f, salin(x))
    } else {
      const pb = pejabatPada(b.pejabat, 'pengurus_barang', hariIni)
      if (pb) f.pemeriksa = { nama: pb.nama, gelar: pb.gelar, nip: pb.nip, jabatan: 'Pengurus Barang' }
    }
  } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
})

/* ---------- Penyedia ---------- */
const cariRekanan = ref('')
const hasilRekanan = computed(() => {
  const q = cariRekanan.value.trim().toLowerCase()
  return (bahan.value?.rekanan || []).filter((r) => r.aktif !== false && (!q || [r.nama_usaha, r.pemilik, r.npwp].some((v) => String(v || '').toLowerCase().includes(q)))).slice(0, 8)
})
function pilihRekanan(r) { f.id_rekanan = r.id; f.rekanan = { ...r }; cariRekanan.value = '' }
const normNama = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')
const milikPegawai = computed(() => {
  const r = f.rekanan
  if (!r) return []
  return (bahan.value?.pegawai || []).filter((p) => (r.npwp && p.npwp && hanyaAngka(p.npwp) === hanyaAngka(r.npwp)) || (normNama(r.pemilik).length > 3 && normNama(p.nama) === normNama(r.pemilik)))
})

/* ---------- Item ---------- */
const itemDiubah = ref(null) // { indeks, item } ; indeks -1 = baru
const bulanTransaksi = computed(() => { const d = dariIso(f.tgl_lunas || f.tgl_terima || f.tgl_pesanan); return d ? d.getMonth() : null })
const pemakaianLain = computed(() => belanja.hitungPemakaian(idUbah.value))
function pakai(kunci, kecualiIndeks = itemDiubah.value?.indeks ?? -1) {
  const p = pemakaianLain.value.get(kunci) || { komitmen: 0, bulanKomitmen: Array(12).fill(0) }
  const x = { komitmen: p.komitmen, bulanKomitmen: [...p.bulanKomitmen] }
  f.item.forEach((it, i) => {
    if (i === kecualiIndeks || kunciUraian(it) !== kunci) return
    const j = rapikanItem(it).jumlah
    x.komitmen += j
    if (bulanTransaksi.value != null) x.bulanKomitmen[bulanTransaksi.value] += j
  })
  return x
}
function simpanItem(it) {
  const baru = rapikanItem(it)
  if (itemDiubah.value.indeks >= 0) f.item.splice(itemDiubah.value.indeks, 1, baru); else f.item.push(baru)
  if (!f.nama_pekerjaan) f.nama_pekerjaan = baru.nama.replace(/^Jasa\s+/i, (m) => m)
  itemDiubah.value = null
}
const hapusItem = (i) => f.item.splice(i, 1)
const items = computed(() => f.item.map(rapikanItem))
const total = computed(() => totalItem(items.value))
const kelompok = computed(() => kelompokRekening(items.value))
const adaKonsumsi = computed(() => items.value.some((i) => i.jenis === 'konsumsi'))
watch(adaKonsumsi, (v) => { if (v) { f.dokumen.daftar_hadir ??= true; f.dokumen.penerima_konsumsi ??= true } })

const namaRek = (k) => rkas.nama.rekening(k) || NAMA_REKENING[k] || ''
const namaKeg = (k) => rkas.nama.kegiatan(k)

// Peringatan per item: melebihi sisa pagu uraian
const lewatPagu = computed(() => items.value.map((it, i) => {
  const u = rkas.uraian.find((x) => kunciUraian(x) === kunciUraian(it))
  if (!u) return { tidakAda: true }
  const p = pakai(kunciUraian(it), i)
  return { sisa: u.jumlah - p.komitmen, lewat: it.jumlah > u.jumlah - p.komitmen }
}))

/* ---------- Tanggal, nomor, dokumen ---------- */
const siplah = computed(() => f.cara === 'siplah')
const tanggalTampil = computed(() => URUTAN_TANGGAL.filter(([k]) => !siplah.value || ['tgl_pesanan', 'tgl_terima', 'tgl_lunas'].includes(k)))
// Isi tanggal berikutnya otomatis (boleh diubah) agar urutan selalu benar
function isiTanggal(k) {
  const urut = URUTAN_TANGGAL.map(([x]) => x)
  const i = urut.indexOf(k)
  if (!f[k]) return
  urut.slice(i + 1).forEach((n) => { if (f[n] && f[n] < f[k]) f[n] = f[k] })
  if (k === 'tgl_lunas' && !f.tgl_kwitansi) f.tgl_kwitansi = f.tgl_lunas
  if (k === 'tgl_terima' && !f.tgl_proforma && f.dokumen.proforma) f.tgl_proforma = f.tgl_terima
}
const galatTanggal = computed(() => periksaUrutanTanggal(f))
const status = computed(() => statusBelanja(f))
const dokumen = computed(() => dokumenTransaksi({ ...f, item: items.value }))
const nomorTampil = computed(() => Object.entries(JENIS_NOMOR).filter(([k]) => dokumen.value.includes(k)))
function ketikNomor(k, v) { f.nomor[k] = v; f.nomor_manual[k] = !!v.trim() }
const ganda = computed(() => nomorGanda(belanja.daftar, { ...f, id: idUbah.value }))
const spk = computed(() => total.value > BATAS.spk)

const pajak = computed(() => perkiraanPajak({ ...f, item: items.value }))

/* ---------- Pemeriksa & pelaksana ---------- */
function pilihPemeriksa(id) {
  const p = (bahan.value?.pegawai || []).find((x) => x.id === id)
  f.pemeriksa = p ? { id: p.id, nama: p.nama, gelar: p.gelar || '', nip: p.nip || '', jabatan: p.jabatan || '' } : null
}

/* ---------- Pembanding ---------- */
const tambahPembanding = () => f.pembanding.push({ nama: '', alamat: '', harga: 0, keterangan: '' })

/* ---------- Simpan ---------- */
const galat = computed(() => {
  const g = []
  if (!f.nama_pekerjaan.trim()) g.push('Nama pekerjaan belum diisi.')
  if (!f.rekanan) g.push(siplah.value ? 'Pilih mitra/penyedia SIPLah (rekanan).' : 'Pilih penyedia (rekanan).')
  if (!items.value.length) g.push('Tambahkan minimal satu item.')
  if (items.value.some((i) => !i.kode_rekening)) g.push('Setiap item harus dikaitkan ke uraian RKAS.')
  if (siplah.value && !f.mitra_siplah) g.push('Pilih mitra SIPLah.')
  if (ganda.value) g.push(`Nomor invoice sudah dipakai di "${ganda.value.nama_pekerjaan}".`)
  return [...g, ...galatTanggal.value]
})
const peringatan = computed(() => {
  const w = []
  if (f.rekanan && !f.rekanan.status_pkp && total.value > BATAS.non_pkp && !siplah.value) w.push({ nada: 'peringatan', ikon: 'ReceiptText', teks: `Penyedia non-PKP untuk belanja di atas ${rupiah(BATAS.non_pkp)}. Pastikan tidak ada PPN di nota dan pajak dihitung benar.` })
  if (milikPegawai.value.length) w.push({ nada: 'info', ikon: 'Info', teks: `Usaha ini milik pegawai sekolah (${milikPegawai.value.map((p) => p.nama).join(', ')}). Tetap boleh; pastikan harga wajar dan dokumen lengkap.` })
  if (lewatPagu.value.some((x) => x.lewat)) w.push({ nada: 'bahaya', ikon: 'TriangleAlert', teks: 'Ada item yang melebihi sisa pagu uraian RKAS. Lakukan pergeseran di ARKAS sebelum dibayar.' })
  if (lewatPagu.value.some((x) => x.tidakAda) && rkas.uraian.length) w.push({ nada: 'peringatan', ikon: 'SearchX', teks: 'Ada item yang uraiannya tidak ditemukan di RKAS versi berlaku.' })
  if (spk.value && !siplah.value) w.push({ nada: 'peringatan', ikon: 'Scale', teks: 'Di atas Rp 50 juta: surat pesanan berbentuk SPK dan wajib pembandingan minimal 2 calon penyedia (Pasal 16).' })
  if (!siplah.value && total.value <= BATAS.perencanaan && f.dokumen.perencanaan) w.push({ nada: 'info', ikon: 'Info', teks: 'Belanja ≤ Rp 1 juta boleh tanpa Dokumen Perencanaan (Pasal 12 ayat 3).' })
  if (!f.pemeriksa && !siplah.value) w.push({ nada: 'peringatan', ikon: 'UserCheck', teks: 'Pemeriksa barang belum dipilih (SHP & BAST).' })
  return w
})

async function simpan() {
  if (galat.value.length) { notif.kabari(galat.value[0], 'galat'); return }
  menyimpan.value = true
  try {
    const data = { ...salin(f), item: items.value, tahun: dariIso(f.tgl_pesanan || f.tgl_lunas)?.getFullYear() || belanja.tahun }
    const id = await simpanBelanja(idUbah.value, data, sebelum.value, bahan.value.pola)
    const baru = await muatBelanja(id)
    if (baru) belanja.ganti(baru)
    notif.kabari(`Belanja "${f.nama_pekerjaan}" tersimpan.`)
    router.replace(`/belanja/lihat/${id}`)
  } catch (e) { notif.kabari('Gagal menyimpan: ' + e.message, 'galat') } finally { menyimpan.value = false }
}

const NADA = { bahaya: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200', peringatan: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', info: 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200' }
const pratinjau = computed(() => rapikanBelanja({ ...f, item: items.value }))
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <div class="flex items-center gap-3">
      <button class="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Kembali" @click="router.back()"><Ikon nama="ArrowLeft" :ukuran="20" /></button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-extrabold sm:text-xl">{{ idUbah ? 'Ubah belanja' : 'Belanja baru' }}</h1>
        <p class="text-xs text-slate-500">Isi seperlunya lalu simpan — dokumen & nomor dibuat otomatis.</p>
      </div>
      <span :class="['lencana', STATUS[status].lencana]"><Ikon :nama="STATUS[status].ikon" :ukuran="12" /> {{ STATUS[status].label }}</span>
    </div>

    <div v-if="memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Menyiapkan formulir…</div>
    <template v-else>
      <!-- 1. Cara & pekerjaan -->
      <section class="kartu space-y-4 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="ClipboardList" :ukuran="17" /></span> Pekerjaan</h2>
        <div class="grid grid-cols-2 gap-2">
          <label v-for="(c, k) in CARA" :key="k" :class="['cursor-pointer rounded-xl border p-3', f.cara === k ? 'border-biru bg-biru/5 dark:bg-blue-950/30' : 'border-slate-300 dark:border-slate-600']">
            <input v-model="f.cara" type="radio" :value="k" class="sr-only" />
            <span class="flex items-center gap-2 font-bold"><Ikon :nama="c.ikon" :ukuran="17" class="text-biru" /> {{ c.label }}</span>
            <span class="mt-0.5 block text-xs text-slate-500">{{ c.ket }}</span>
          </label>
        </div>
        <div v-if="siplah" class="grid gap-3 sm:grid-cols-4">
          <div><label class="label" for="mitra">Mitra SIPLah <span class="text-merah">*</span></label>
            <select id="mitra" v-model="f.mitra_siplah" class="masukan"><option value="">Pilih…</option><option v-for="m in MITRA_SIPLAH" :key="m">{{ m }}</option></select></div>
          <div><label class="label" for="s-sp">No. SP/PO mitra</label><input id="s-sp" v-model="f.siplah.nomor_sp" class="masukan kode" /></div>
          <div><label class="label" for="s-bast">No. BAST mitra</label><input id="s-bast" v-model="f.siplah.nomor_bast" class="masukan kode" /></div>
          <div><label class="label" for="s-inv">No. invoice mitra</label><input id="s-inv" v-model="f.siplah.nomor_invoice" class="masukan kode" /></div>
        </div>
        <div><label class="label" for="np">Nama pekerjaan <span class="text-merah">*</span></label>
          <input id="np" v-model="f.nama_pekerjaan" class="masukan" placeholder="Contoh: Service AC Ruang Kelas dan Kantor" /></div>
        <div><label class="label" for="up">Untuk pembayaran (kwitansi)</label>
          <textarea id="up" v-model="f.uraian_pembayaran" rows="2" class="masukan" :placeholder="`Pembayaran ${f.nama_pekerjaan ? f.nama_pekerjaan.toLowerCase() : '…'} UPT SPF SMP Negeri 19 Makassar`" /></div>
      </section>

      <!-- 2. Penyedia -->
      <section class="kartu space-y-3 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="Store" :ukuran="17" /></span> Penyedia</h2>
        <div v-if="f.rekanan" class="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ikon-chip"><Ikon :nama="f.rekanan.bentuk_usaha === 'badan' ? 'Building2' : 'Store'" :ukuran="19" /></span>
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-2 font-bold">{{ f.rekanan.nama_usaha }}
              <span :class="['lencana', f.rekanan.status_pkp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300']">{{ f.rekanan.status_pkp ? 'PKP' : 'Non-PKP' }}</span></p>
            <p class="text-xs text-slate-500">{{ f.rekanan.pemilik || '—' }} · NPWP <span class="kode">{{ f.rekanan.npwp || '—' }}</span></p>
            <p class="truncate text-xs text-slate-500">{{ f.rekanan.alamat }}</p>
          </div>
          <button type="button" class="tombol-garis px-3 py-1.5" @click="f.rekanan = null; f.id_rekanan = null"><Ikon nama="Repeat" :ukuran="15" /> Ganti</button>
        </div>
        <template v-else>
          <div class="relative">
            <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="cariRekanan" class="masukan pl-9" placeholder="Cari nama toko/penyedia…" />
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            <button v-for="r in hasilRekanan" :key="r.id" type="button" class="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 text-left text-sm hover:border-biru dark:border-slate-700" @click="pilihRekanan(r)">
              <Ikon :nama="r.bentuk_usaha === 'badan' ? 'Building2' : 'Store'" :ukuran="17" class="text-biru" />
              <span class="min-w-0 flex-1"><b class="block truncate">{{ r.nama_usaha }}</b><span class="text-xs text-slate-500">{{ r.status_pkp ? 'PKP' : 'Non-PKP' }} · {{ r.pemilik || '—' }}</span></span>
            </button>
          </div>
          <p class="text-xs text-slate-500">Penyedia belum ada? <RouterLink to="/rekanan" class="font-semibold text-biru">Tambahkan di Rekanan</RouterLink>.</p>
        </template>
      </section>

      <!-- 3. Item -->
      <section class="kartu space-y-3 p-4 sm:p-5">
        <div class="flex items-center gap-2">
          <h2 class="flex flex-1 items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="Package" :ukuran="17" /></span> Item belanja</h2>
          <button type="button" class="tombol-utama py-2" @click="itemDiubah = { indeks: -1, item: null }"><Ikon nama="Plus" :ukuran="17" /> Item</button>
        </div>
        <p v-if="!rkas.uraian.length" class="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><Ikon nama="TriangleAlert" :ukuran="17" /> RKAS belum diimpor — item tidak bisa dikaitkan ke uraian.</p>
        <div v-if="!items.length" class="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Belum ada item. Tekan <b>+ Item</b> untuk memilih dari Standar Harga.</div>
        <div v-for="(it, i) in items" :key="it.id" class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div class="flex items-start gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ikon-chip"><Ikon :nama="it.jenis === 'jasa' ? 'Wrench' : it.jenis === 'konsumsi' ? 'UtensilsCrossed' : 'Package'" :ukuran="17" /></span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold leading-snug">{{ it.nama }}</p>
              <p class="text-xs text-slate-500"><span class="angka">{{ it.volume }} {{ it.satuan }} × {{ rupiah(it.harga) }}</span><template v-if="it.harga_ssh"> · SSH <span :class="it.harga > it.harga_ssh ? 'text-rose-600' : ''">{{ rupiah(it.harga_ssh) }}</span></template></p>
              <p class="kode truncate text-[11px] text-slate-500">{{ it.kode_kegiatan }} · {{ it.kode_rekening }} · {{ it.uraian_rkas }}</p>
              <p v-if="lewatPagu[i]?.lewat" class="mt-1 text-xs font-semibold text-rose-600">Melebihi sisa pagu uraian ({{ rupiah(lewatPagu[i].sisa) }})</p>
            </div>
          </div>
          <div class="mt-2 flex items-center justify-end gap-1">
            <b class="angka mr-auto">{{ rupiah(it.jumlah) }}</b>
            <button type="button" class="tombol px-2.5 py-1.5 text-biru hover:bg-biru/10" @click="itemDiubah = { indeks: i, item: { ...f.item[i] } }"><Ikon nama="Pencil" :ukuran="15" /> Ubah</button>
            <button type="button" class="tombol px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="hapusItem(i)"><Ikon nama="Trash2" :ukuran="15" /> Hapus</button>
          </div>
        </div>
        <div v-if="items.length" class="flex items-center justify-between rounded-xl bg-navy px-4 py-3 text-white">
          <span class="text-sm">Total <span class="text-blue-200">· {{ KATEGORI_LABEL[pratinjau.kategori] }}</span></span><b class="angka text-lg">{{ rupiah(total) }}</b>
        </div>
        <p v-if="items.length" class="text-xs italic text-slate-500">Terbilang: {{ terbilang(total) }}</p>
      </section>

      <!-- 4. Tanggal & nomor -->
      <section class="kartu space-y-4 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="CalendarDays" :ukuran="17" /></span> Tanggal &amp; nomor</h2>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div v-for="([k, l], i) in tanggalTampil" :key="k">
            <label class="label text-xs" :for="k"><span class="mr-1 inline-grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[10px] dark:bg-slate-800">{{ i + 1 }}</span>{{ l }}</label>
            <input :id="k" v-model="f[k]" type="date" class="masukan" @change="isiTanggal(k)" />
          </div>
        </div>
        <p class="text-xs text-slate-500">Urutan dikunci: pesanan ≤ serah terima ≤ proforma ≤ invoice ≤ lunas ≤ kwitansi. Isi tanggal lunas bila sudah dibayar.</p>
        <div v-for="g in galatTanggal" :key="g" class="flex gap-2 rounded-xl bg-rose-50 p-2.5 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"><Ikon nama="CircleX" :ukuran="17" /> {{ g }}</div>

        <div v-if="!siplah" class="grid gap-3 sm:grid-cols-2">
          <div v-for="[k, info] in nomorTampil" :key="k">
            <label class="label text-xs" :for="`no-${k}`">No. {{ info.judul }}<span v-if="f.nomor_manual[k]" class="ml-1 text-amber-600">(manual)</span></label>
            <input :id="`no-${k}`" :value="f.nomor[k] || ''" class="masukan kode" :placeholder="k === 'invoice' ? 'Nomor dari penyedia, atau kosong = otomatis' : 'Otomatis saat disimpan'" @input="ketikNomor(k, $event.target.value)" />
          </div>
        </div>
        <div v-if="ganda" class="flex gap-2 rounded-xl bg-rose-50 p-2.5 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"><Ikon nama="CircleX" :ukuran="17" /> Nomor invoice ini sudah dipakai di “{{ ganda.nama_pekerjaan }}”.</div>

        <div v-if="kelompok.length" class="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p class="flex items-center gap-2 text-sm font-semibold"><Ikon nama="BookOpenText" :ukuran="16" class="text-biru" /> Nomor Buku Kas (BNU ARKAS) per kode rekening</p>
          <div v-for="g in kelompok" :key="g.kunci" class="grid items-center gap-2 sm:grid-cols-[1fr_12rem]">
            <p class="text-xs"><span class="kode">{{ g.kode_kegiatan }} · {{ g.kode_rekening }}</span> <span class="text-slate-500">— {{ rupiah(g.jumlah) }}</span><br /><span class="text-slate-500">{{ namaRek(g.kode_rekening) }}</span></p>
            <input v-model="f.bnu[g.kunci]" class="masukan kode py-2" placeholder="Mis. BNU 214 (isi setelah input ARKAS)" :aria-label="`BNU ${g.kunci}`" />
          </div>
          <p class="text-xs text-slate-500">Transaksi lain dengan BNU yang sama digabung dalam satu kwitansi besar.</p>
        </div>
      </section>

      <!-- 5. Pelaksana, pemeriksa, serah terima -->
      <section v-if="!siplah" class="kartu space-y-4 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="UserCheck" :ukuran="17" /></span> Penanda tangan &amp; serah terima</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="pl">Pelaksana (pemesan & penerima)</label>
            <select id="pl" v-model="f.pelaksana" class="masukan"><option value="kepala_sekolah">Kepala Sekolah</option><option value="bendahara_bosp">Bendahara BOSP</option></select>
            <p class="mt-1 text-xs text-slate-500">Nama diambil otomatis dari pejabat pada tanggal dokumen.</p></div>
          <div><label class="label" for="pm">Pemeriksa barang</label>
            <select id="pm" :value="f.pemeriksa?.id || ''" class="masukan" @change="pilihPemeriksa($event.target.value)">
              <option value="">{{ f.pemeriksa && !f.pemeriksa.id ? namaGelar(f.pemeriksa) + ' (pejabat)' : 'Pilih pegawai…' }}</option>
              <option v-for="p in bahan.pegawai.filter((x) => x.aktif !== false)" :key="p.id" :value="p.id">{{ namaGelar(p) }}{{ p.jabatan ? ' — ' + p.jabatan : '' }}</option>
            </select></div>
          <div><label class="label" for="ws">Waktu serah terima</label><input id="ws" v-model="f.waktu_serah" class="masukan" placeholder="Mis. 3 (tiga) hari kerja sejak surat pesanan" /></div>
          <div><label class="label" for="ls">Lokasi serah terima</label><input id="ls" v-model="f.lokasi_serah" class="masukan" /></div>
        </div>
      </section>

      <!-- 6. Dokumen -->
      <section class="kartu space-y-4 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="FileStack" :ukuran="17" /></span> Dokumen yang dibuat</h2>
        <div v-if="!siplah" class="flex flex-wrap gap-1.5">
          <span v-for="k in ['kwitansi_besar', 'surat_pesanan', 'shp', 'bast']" :key="k" class="lencana bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Ikon :nama="DOKUMEN[k].ikon" :ukuran="12" /> {{ k === 'surat_pesanan' && spk ? 'Surat Perintah Kerja' : DOKUMEN[k].judul }}</span>
        </div>
        <p v-else class="text-sm text-slate-500">SIPLah: SIBOS hanya membuat kwitansi besar (sampul) dan lampiran; enam dokumen mitra diunggah sebagai PDF di halaman rincian.</p>
        <div class="grid gap-2 sm:grid-cols-2">
          <label v-for="d in DOKUMEN_PILIHAN.filter((x) => !siplah || x.kunci === 'foto')" :key="d.kunci" class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input v-model="f.dokumen[d.kunci]" type="checkbox" class="mt-0.5 h-5 w-5 accent-biru" />
            <span><b class="flex items-center gap-1.5 text-sm"><Ikon :nama="DOKUMEN[d.kunci].ikon" :ukuran="15" class="text-biru" /> {{ DOKUMEN[d.kunci].judul }}</b><span class="text-xs text-slate-500">{{ d.ket }}</span></span>
          </label>
          <label v-for="k in ['daftar_hadir', 'penerima_konsumsi', 'notulen']" :key="k" class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input v-model="f.dokumen[k]" type="checkbox" class="mt-0.5 h-5 w-5 accent-biru" />
            <span><b class="flex items-center gap-1.5 text-sm"><Ikon :nama="DOKUMEN[k].ikon" :ukuran="15" class="text-biru" /> {{ DOKUMEN[k].judul }}</b>
              <span class="text-xs text-slate-500">{{ k === 'notulen' ? 'Laporan singkat kegiatan (opsional)' : adaKonsumsi ? 'Disarankan untuk belanja konsumsi' : 'Lampiran kegiatan' }}</span></span>
          </label>
        </div>
        <div v-if="f.dokumen.daftar_hadir || f.dokumen.penerima_konsumsi || f.dokumen.foto" class="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-4 dark:border-slate-700">
          <div v-if="f.dokumen.daftar_hadir"><label class="label text-xs" for="bh">Baris daftar hadir</label><input id="bh" v-model.number="f.lampiran.baris_hadir" type="number" min="1" class="masukan angka" /></div>
          <div v-if="f.dokumen.penerima_konsumsi"><label class="label text-xs" for="bk">Baris penerima konsumsi</label><input id="bk" v-model.number="f.lampiran.baris_konsumsi" type="number" min="1" class="masukan angka" /></div>
          <div v-if="f.dokumen.foto"><label class="label text-xs" for="fp">Foto per halaman</label><select id="fp" v-model.number="f.lampiran.foto_per_halaman" class="masukan"><option :value="2">2</option><option :value="4">4</option><option :value="6">6</option></select></div>
          <label v-if="f.dokumen.daftar_hadir" class="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm"><input v-model="f.lampiran.peserta_pegawai" type="checkbox" class="h-5 w-5 accent-biru" /> Nama dari data pegawai</label>
        </div>
        <div v-if="f.dokumen.notulen"><label class="label" for="nt">Isi notulen / laporan singkat</label><textarea id="nt" v-model="f.notulen" rows="4" class="masukan" /></div>

        <!-- Negosiasi -->
        <div v-if="f.dokumen.negosiasi && items.length && !siplah" class="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p class="flex items-center gap-2 text-sm font-semibold"><Ikon nama="Handshake" :ukuran="16" class="text-biru" /> Harga penawaran (sebelum negosiasi)</p>
          <div v-for="(it, i) in f.item" :key="it.id" class="grid items-center gap-2 sm:grid-cols-[1fr_10rem_10rem]">
            <span class="truncate text-sm">{{ it.nama }}</span>
            <input v-model.number="f.item[i].harga_penawaran" type="number" class="masukan angka py-2" :aria-label="`Harga penawaran ${it.nama}`" />
            <span class="angka text-right text-sm text-slate-500">nego {{ rupiah(items[i].harga) }}</span>
          </div>
        </div>
        <!-- Pembandingan -->
        <div v-if="f.dokumen.pembandingan && !siplah" class="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div class="flex items-center gap-2"><p class="flex flex-1 items-center gap-2 text-sm font-semibold"><Ikon nama="Scale" :ukuran="16" class="text-biru" /> Calon penyedia pembanding</p>
            <button type="button" class="tombol-garis py-1.5" @click="tambahPembanding"><Ikon nama="Plus" :ukuran="15" /> Pembanding</button></div>
          <div v-for="(p, i) in f.pembanding" :key="i" class="grid gap-2 sm:grid-cols-[1fr_1fr_9rem_auto]">
            <input v-model="p.nama" class="masukan py-2" placeholder="Nama calon penyedia" />
            <input v-model="p.alamat" class="masukan py-2" placeholder="Alamat" />
            <input v-model.number="p.harga" type="number" class="masukan angka py-2" placeholder="Total harga" />
            <button type="button" class="tombol px-2 text-rose-600" aria-label="Hapus pembanding" @click="f.pembanding.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
          </div>
          <p class="text-xs text-slate-500">Penyedia terpilih otomatis menjadi kolom pertama.</p>
        </div>
      </section>

      <!-- 7. Pajak -->
      <section class="kartu space-y-3 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="Percent" :ukuran="17" /></span> Perkiraan pajak</h2>
        <div v-if="!pajak.length" class="text-sm text-slate-500">Tidak ada pajak yang dipungut/dipotong.</div>
        <div v-for="p in pajak" :key="p.jenis" class="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <span class="lencana bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300">{{ p.jenis }}</span>
          <span class="min-w-0 flex-1 text-xs text-slate-500">{{ p.tarif }}% × {{ rupiah(p.dasar) }} — {{ p.ket }}</span>
          <b class="angka">{{ rupiah(p.nilai) }}</b>
        </div>
        <p class="text-xs text-slate-500">Hitungan sementara untuk daftar & kwitansi. Billing, NTPN dan setoran diatur di Fase 4 (Pajak).</p>
      </section>

      <!-- Peringatan & simpan -->
      <div v-for="(w, i) in peringatan" :key="i" :class="['flex gap-2 rounded-xl p-3 text-sm', NADA[w.nada]]"><Ikon :nama="w.ikon" :ukuran="17" class="mt-0.5 shrink-0" /> {{ w.teks }}</div>

      <div class="kartu sticky bottom-20 z-20 flex flex-wrap items-center gap-3 p-3 shadow-lg lg:bottom-4">
        <div class="min-w-0 flex-1">
          <p class="text-xs text-slate-500">{{ items.length }} item · {{ dokumen.length }} dokumen</p>
          <p class="angka text-lg font-extrabold">{{ rupiah(total) }}</p>
        </div>
        <p v-if="galat.length" class="hidden max-w-xs text-xs text-rose-600 sm:block">{{ galat[0] }}</p>
        <button class="tombol-garis" @click="router.back()">Batal</button>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
      </div>
    </template>

    <PilihItem v-if="itemDiubah" :item="itemDiubah.item" :harga="bahan?.harga || []" :uraian="rkas.uraian" :pakai="(k) => pakai(k)" :bulan="bulanTransaksi"
               :nama-rekening="namaRek" :nama-kegiatan="namaKeg" @tutup="itemDiubah = null" @simpan="simpanItem" />
  </div>
</template>
