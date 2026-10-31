<script setup>
// Formulir honor, narasumber, transpor & insentif: penerima dari data pegawai atau orang luar (tersimpan otomatis),
// besaran dari Standar Harga, PPh 21 dihitung, syarat honor Pasal 43 diperiksa untuk komponen pembayaran honor.
import { reactive, ref, shallowRef, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRkas } from '@/stores/rkas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatBahan, namaGelar } from '@/services/bahanBelanja'
import { muatBelanja, simpanBelanja, simpanOrangLuar, rapikanBelanja } from '@/services/belanja'
import { NAMA_REKENING } from '@/services/rkas'
import { JENIS_HONOR, DOKUMEN, STATUS } from '@/config/belanja'
import { salin, rapikanPenerima, syaratHonor, uraianHonorBulanan, kunciUraian, tarifPph21, periksaUrutanTanggal } from '@/utils/belanja'
import { rupiah, keIso, dariIso, terbilang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

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

const f = reactive({
  jenis: 'honor', jenis_honor: 'narasumber', nama_pekerjaan: '', uraian_pembayaran: '', tempat: 'UPT SPF SMP Negeri 19 Makassar',
  tgl_kegiatan: keIso(), tgl_lunas: '', tgl_kwitansi: '', uraian_honor: null, id_harga: null, penerima: [], bnu: {},
  dokumen: { penerimaan_honor: true, daftar_hadir: true, foto: true }, lampiran: { baris_hadir: 30, foto_per_halaman: 4, peserta_pegawai: true },
  notulen: '', arsip: {}, jumlah_foto: 0, item: [],
})

onMounted(async () => {
  try {
    const [b] = await Promise.all([muatBahan({ rahasia: true }), rkas.muat(), belanja.muat()])
    bahan.value = b
    if (idUbah.value) {
      const x = await muatBelanja(idUbah.value)
      if (!x) { router.replace('/belanja/honor'); return }
      sebelum.value = x
      Object.assign(f, salin(x))
    } else if (route.query.jenis && JENIS_HONOR[route.query.jenis]) gantiJenis(route.query.jenis)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false }
})

function gantiJenis(j) {
  f.jenis_honor = j
  f.dokumen = { ...Object.fromEntries(JENIS_HONOR[j].dokumen.map((k) => [k, true])) }
  f.penerima.forEach((p) => { p.tarif_pph21 = '' })
}

/* ---------- Uraian RKAS & besaran ---------- */
const POLA = { honor: /honor|tenaga|insentif/i, narasumber: /narasumber|honorarium/i, transpor: /transport|transpor|perjalanan/i, insentif: /./ }
const cariUraian = ref('')
const daftarUraian = computed(() => {
  const q = cariUraian.value.trim().toLowerCase()
  const pola = POLA[f.jenis_honor]
  return rkas.uraian.filter((u) => (q ? [u.uraian, u.kode_kegiatan, u.kode_rekening].some((v) => String(v).toLowerCase().includes(q)) : pola.test(u.uraian) || u.kode_rekening.startsWith('5.1.02.02.01.00') || u.kode_rekening.startsWith('5.1.02.04'))).slice(0, 40)
})
const uraianDipilih = computed(() => f.uraian_honor && rkas.uraian.find((u) => kunciUraian(u) === kunciUraian(f.uraian_honor)))
function pilihUraian(u) {
  f.uraian_honor = { kode_kegiatan: u.kode_kegiatan, kode_rekening: u.kode_rekening, uraian_rkas: u.uraian, harga_rkas: u.harga, kategori: u.kategori, satuan: u.satuan }
  cariUraian.value = ''
  f.penerima.forEach((p) => { if (!p.besaran) p.besaran = u.harga })
}
const hargaHonor = computed(() => (bahan.value?.harga || []).filter((h) => ['honor', 'transpor'].includes(h.jenis) && h.aktif !== false))
function pilihHarga(id) {
  f.id_harga = id || null
  const h = hargaHonor.value.find((x) => x.id === id)
  if (h) f.penerima.forEach((p) => { p.besaran = h.harga; p.satuan = h.satuan })
}
const besaranAwal = () => hargaHonor.value.find((h) => h.id === f.id_harga)?.harga || f.uraian_honor?.harga_rkas || 0
const satuanAwal = () => hargaHonor.value.find((h) => h.id === f.id_harga)?.satuan || f.uraian_honor?.satuan || (f.jenis_honor === 'narasumber' ? 'jam' : f.jenis_honor === 'transpor' ? 'hari' : 'bulan')

/* ---------- Penerima ---------- */
const pilihPegawai = ref(false)
const terpilih = ref([])
const cariPegawai = ref('')
const hasilPegawai = computed(() => {
  const q = cariPegawai.value.trim().toLowerCase()
  return (bahan.value?.pegawai || []).filter((p) => p.aktif !== false && (!q || [p.nama, p.jabatan, p.nip].some((v) => String(v || '').toLowerCase().includes(q))))
})
const sudahAda = (id) => f.penerima.some((p) => p.sumber === 'pegawai' && p.id === id)
function tambahPegawai() {
  terpilih.value.forEach((id) => {
    if (sudahAda(id)) return
    const p = bahan.value.pegawai.find((x) => x.id === id)
    f.penerima.push({ sumber: 'pegawai', id: p.id, nama: namaGelar(p), nip: p.nip || '', golongan: p.golongan || '', jabatan: p.jabatan || '', status_kepegawaian: p.status_kepegawaian || '', npwp: p.npwp || '', besaran: besaranAwal(), volume: 1, satuan: satuanAwal(), tarif_pph21: '' })
  })
  terpilih.value = []
  pilihPegawai.value = false
}
const luarBaru = ref(null)
function tambahLuar(o) {
  f.penerima.push({ sumber: 'luar', id: o?.id || null, nama: o?.nama || '', nip: o?.nip || '', golongan: o?.golongan || '', jabatan: o?.jabatan || '', instansi: o?.instansi || '', status_kepegawaian: o?.status_kepegawaian || '', npwp: o?.npwp || '', besaran: besaranAwal(), volume: 1, satuan: satuanAwal(), tarif_pph21: '' })
  luarBaru.value = null
}
const penerima = computed(() => f.penerima.map((p) => rapikanPenerima(p, f.jenis_honor)))
const jumlahBruto = computed(() => penerima.value.reduce((s, p) => s + p.bruto, 0))
const jumlahPph = computed(() => penerima.value.reduce((s, p) => s + p.pph21, 0))
const pegawaiAsli = (p) => p.sumber === 'pegawai' && bahan.value?.pegawai.find((x) => x.id === p.id)
const cekSyarat = computed(() => uraianHonorBulanan(f.uraian_honor || {}) ? f.penerima.map((p) => syaratHonor(pegawaiAsli(p) || p)) : [])

/* ---------- Validasi & simpan ---------- */
const sisa = computed(() => {
  const u = uraianDipilih.value
  if (!u) return null
  const p = belanja.hitungPemakaian(idUbah.value).get(kunciUraian(u))
  return u.jumlah - (p?.komitmen || 0)
})
const galat = computed(() => {
  const g = []
  if (!f.nama_pekerjaan.trim()) g.push('Nama kegiatan belum diisi.')
  if (!f.uraian_honor) g.push('Pilih uraian RKAS.')
  if (!penerima.value.length) g.push('Tambahkan minimal satu penerima.')
  if (penerima.value.some((p) => !p.bruto)) g.push('Besaran & volume setiap penerima harus diisi.')
  if (f.tgl_lunas && f.tgl_kegiatan && f.tgl_lunas < f.tgl_kegiatan) g.push('Tanggal bayar tidak boleh sebelum tanggal kegiatan.')
  return [...g, ...periksaUrutanTanggal({ tgl_lunas: f.tgl_lunas, tgl_kwitansi: f.tgl_kwitansi })]
})
const peringatan = computed(() => {
  const w = []
  if (sisa.value != null && jumlahBruto.value > sisa.value) w.push({ nada: 'bahaya', teks: `Melebihi sisa pagu uraian (${rupiah(sisa.value)}). Perlu pergeseran di ARKAS.` })
  const gagal = cekSyarat.value.map((s, i) => [penerima.value[i]?.nama, s.filter((x) => !x.ok)]).filter(([, x]) => x.length)
  if (gagal.length) w.push({ nada: 'peringatan', teks: `Syarat honor Pasal 43 belum terpenuhi: ${gagal.map(([n, x]) => `${n} (${x.map((y) => y.syarat.toLowerCase()).join(', ')})`).join('; ')}.` })
  return w
})

async function simpan() {
  if (galat.value.length) { notif.kabari(galat.value[0], 'galat'); return }
  menyimpan.value = true
  try {
    const data = salin(f)
    await simpanOrangLuar(data.penerima, bahan.value.orangLuar)
    data.tahun = dariIso(f.tgl_kegiatan || f.tgl_lunas)?.getFullYear() || belanja.tahun
    const id = await simpanBelanja(idUbah.value, data, sebelum.value, bahan.value.pola)
    const baru = await muatBelanja(id)
    if (baru) belanja.ganti(baru)
    notif.kabari(`"${f.nama_pekerjaan}" tersimpan.`)
    router.replace(`/belanja/lihat/${id}`)
  } catch (e) { notif.kabari('Gagal menyimpan: ' + e.message, 'galat') } finally { menyimpan.value = false }
}
const pratinjau = computed(() => rapikanBelanja({ ...f }))
const status = computed(() => pratinjau.value.status)
const kunciBnu = computed(() => (f.uraian_honor ? `${f.uraian_honor.kode_kegiatan} ${f.uraian_honor.kode_rekening}` : ''))
const NADA = { bahaya: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200', peringatan: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' }
const DOK_HONOR = ['penerimaan_honor', 'tanda_terima_transpor', 'daftar_hadir', 'foto', 'notulen']
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <div class="flex items-center gap-3">
      <button class="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Kembali" @click="router.back()"><Ikon nama="ArrowLeft" :ukuran="20" /></button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-extrabold sm:text-xl">{{ idUbah ? 'Ubah honor & transpor' : 'Honor & transpor baru' }}</h1>
        <p class="text-xs text-slate-500">Penerima dari data pegawai atau orang luar sekolah.</p>
      </div>
      <span :class="['lencana', STATUS[status].lencana]"><Ikon :nama="STATUS[status].ikon" :ukuran="12" /> {{ STATUS[status].label }}</span>
    </div>

    <div v-if="memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Menyiapkan formulir…</div>
    <template v-else>
      <section class="kartu space-y-4 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon nama="Wallet" :ukuran="17" /></span> Jenis &amp; kegiatan</h2>
        <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <button v-for="(j, k) in JENIS_HONOR" :key="k" type="button" @click="gantiJenis(k)"
                  :class="['rounded-xl border p-3 text-left', f.jenis_honor === k ? 'border-biru bg-biru/5 dark:bg-blue-950/30' : 'border-slate-300 dark:border-slate-600']">
            <span class="flex items-center gap-2 font-bold"><Ikon :nama="j.ikon" :ukuran="17" class="text-biru" /> {{ j.label }}</span>
            <span class="mt-0.5 block text-xs text-slate-500">{{ j.ket }}</span>
          </button>
        </div>
        <div><label class="label" for="nk">Nama kegiatan / pembayaran <span class="text-merah">*</span></label><input id="nk" v-model="f.nama_pekerjaan" class="masukan" placeholder="Contoh: Honor Narasumber Workshop Kurikulum" /></div>
        <div><label class="label" for="upb">Untuk pembayaran (kwitansi)</label><textarea id="upb" v-model="f.uraian_pembayaran" rows="2" class="masukan" /></div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div><label class="label" for="tk">Tanggal kegiatan</label><input id="tk" v-model="f.tgl_kegiatan" type="date" class="masukan" /></div>
          <div><label class="label" for="tl">Tanggal dibayar (lunas)</label><input id="tl" v-model="f.tgl_lunas" type="date" class="masukan" @change="f.tgl_kwitansi ||= f.tgl_lunas" /></div>
          <div><label class="label" for="tp">Tempat kegiatan</label><input id="tp" v-model="f.tempat" class="masukan" /></div>
        </div>
      </section>

      <section class="kartu space-y-3 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="ClipboardList" :ukuran="17" /></span> Uraian RKAS &amp; besaran</h2>
        <div v-if="f.uraian_honor" class="flex items-start gap-3 rounded-xl border border-biru/40 bg-biru/5 p-3 dark:bg-blue-950/30">
          <Ikon nama="BadgeCheck" :ukuran="18" class="mt-0.5 text-biru" />
          <div class="min-w-0 flex-1"><p class="font-semibold">{{ f.uraian_honor.uraian_rkas }}</p>
            <p class="kode text-[11px] text-slate-500">{{ f.uraian_honor.kode_kegiatan }} · {{ f.uraian_honor.kode_rekening }} · {{ rkas.nama.rekening(f.uraian_honor.kode_rekening) || NAMA_REKENING[f.uraian_honor.kode_rekening] }}</p>
            <p v-if="sisa != null" class="text-xs">Sisa pagu: <b :class="['angka', jumlahBruto > sisa ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400']">{{ rupiah(sisa) }}</b></p></div>
          <button type="button" class="tombol-garis px-3 py-1.5" @click="f.uraian_honor = null"><Ikon nama="Repeat" :ukuran="15" /> Ganti</button>
        </div>
        <template v-else>
          <div class="relative"><Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="cariUraian" class="masukan pl-9" placeholder="Cari uraian RKAS (honor, narasumber, transport…)" /></div>
          <div class="gulir-halus max-h-60 space-y-1.5 overflow-y-auto pr-1">
            <button v-for="u in daftarUraian" :key="u.id" type="button" class="w-full rounded-xl border border-slate-200 p-2.5 text-left text-sm hover:border-biru dark:border-slate-700" @click="pilihUraian(u)">
              <span class="flex justify-between gap-2"><b>{{ u.uraian }}</b><b class="angka">{{ rupiah(u.harga) }}</b></span>
              <span class="kode block text-[11px] text-slate-500">{{ u.kode_kegiatan }} · {{ u.kode_rekening }} · {{ u.volume }} {{ u.satuan }}</span>
            </button>
            <p v-if="!daftarUraian.length" class="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800/50">Tidak ditemukan.</p>
          </div>
        </template>
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="sh">Besaran dari Standar Harga</label>
            <select id="sh" :value="f.id_harga || ''" class="masukan" @change="pilihHarga($event.target.value)">
              <option value="">— pakai harga uraian RKAS —</option>
              <option v-for="h in hargaHonor" :key="h.id" :value="h.id">{{ h.nama_item }} · {{ rupiah(h.harga) }}/{{ h.satuan }}</option>
            </select></div>
          <div v-if="kunciBnu"><label class="label" for="bnu">Nomor Buku Kas (BNU ARKAS)</label><input id="bnu" v-model="f.bnu[kunciBnu]" class="masukan kode" placeholder="Mis. BNU 188" /></div>
        </div>
      </section>

      <section class="kartu space-y-3 p-4 sm:p-5">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="flex flex-1 items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Users" :ukuran="17" /></span> Penerima ({{ penerima.length }})</h2>
          <button type="button" class="tombol-garis py-2" @click="pilihPegawai = true"><Ikon nama="UserPlus" :ukuran="16" class="text-biru" /> Pegawai</button>
          <button type="button" class="tombol-utama py-2" @click="luarBaru = {}"><Ikon nama="UserRound" :ukuran="16" /> Orang luar</button>
        </div>
        <div v-if="!f.penerima.length" class="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Belum ada penerima.</div>
        <div v-for="(p, i) in f.penerima" :key="i" class="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div class="flex items-start gap-3">
            <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-lg', p.sumber === 'luar' ? 'ikon-chip-peringatan' : 'ikon-chip']"><Ikon :nama="p.sumber === 'luar' ? 'UserRound' : 'IdCard'" :ukuran="17" /></span>
            <div class="min-w-0 flex-1">
              <input v-if="p.sumber === 'luar'" v-model="p.nama" class="masukan py-1.5 font-semibold" placeholder="Nama lengkap & gelar" :aria-label="`Nama penerima ${i + 1}`" />
              <p v-else class="font-semibold">{{ p.nama }}</p>
              <p class="text-xs text-slate-500">{{ [p.status_kepegawaian, p.golongan, p.jabatan, p.instansi].filter(Boolean).join(' · ') || 'Lengkapi data' }}</p>
            </div>
            <button type="button" class="tombol px-2 text-rose-600" :aria-label="`Hapus ${p.nama}`" @click="f.penerima.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
          </div>
          <div v-if="p.sumber === 'luar'" class="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input v-model="p.nip" class="masukan kode py-1.5 text-xs" placeholder="NIP/NIK" />
            <select v-model="p.status_kepegawaian" class="masukan py-1.5 text-xs"><option value="">Status…</option><option>PNS</option><option>PPPK</option><option>Non-ASN</option></select>
            <input v-model="p.golongan" class="masukan py-1.5 text-xs" placeholder="Golongan" />
            <input v-model="p.jabatan" class="masukan py-1.5 text-xs" placeholder="Jabatan" />
            <input v-model="p.instansi" class="masukan py-1.5 text-xs" placeholder="Instansi" />
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <label class="text-[11px] text-slate-500">Besaran<input v-model.number="p.besaran" type="number" class="masukan angka py-1.5" /></label>
            <label class="text-[11px] text-slate-500">Volume<input v-model.number="p.volume" type="number" step="any" class="masukan angka py-1.5" /></label>
            <label class="text-[11px] text-slate-500">Satuan<input v-model="p.satuan" class="masukan py-1.5" /></label>
            <label class="text-[11px] text-slate-500">PPh 21 (%)<input v-model="p.tarif_pph21" type="number" step="any" class="masukan angka py-1.5" :placeholder="String(tarifPph21(p, f.jenis_honor))" /></label>
            <div class="col-span-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs sm:col-span-1 dark:bg-slate-800/50">
              <p class="flex justify-between"><span class="text-slate-500">Bruto</span><b class="angka">{{ rupiah(penerima[i].bruto) }}</b></p>
              <p class="flex justify-between"><span class="text-slate-500">PPh 21</span><span class="angka">{{ rupiah(penerima[i].pph21) }}</span></p>
              <p class="flex justify-between"><span class="text-slate-500">Diterima</span><b class="angka text-emerald-600 dark:text-emerald-400">{{ rupiah(penerima[i].diterima) }}</b></p>
            </div>
          </div>
          <div v-if="cekSyarat[i]?.length" class="flex flex-wrap gap-1.5">
            <span v-for="s in cekSyarat[i]" :key="s.syarat" :class="['lencana', s.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300']">
              <Ikon :nama="s.ok ? 'CircleCheck' : 'CircleX'" :ukuran="12" /> {{ s.syarat }}</span>
          </div>
        </div>
        <div v-if="penerima.length" class="grid grid-cols-3 gap-2 rounded-xl bg-navy p-3 text-white">
          <div><p class="text-[11px] text-blue-200">Bruto</p><p class="angka font-bold">{{ rupiah(jumlahBruto) }}</p></div>
          <div><p class="text-[11px] text-blue-200">PPh 21</p><p class="angka font-bold">{{ rupiah(jumlahPph) }}</p></div>
          <div><p class="text-[11px] text-blue-200">Diterima</p><p class="angka font-bold">{{ rupiah(jumlahBruto - jumlahPph) }}</p></div>
        </div>
        <p v-if="penerima.length" class="text-xs italic text-slate-500">Terbilang: {{ terbilang(jumlahBruto) }}</p>
        <p class="text-xs text-slate-500">PPh 21 perkiraan: ASN gol. III 5%, IV 15%, I–II 0%; bukan pegawai 50% × 5% (tanpa NPWP 3%); transpor 0%. Rincian lengkap di Fase 4.</p>
      </section>

      <section class="kartu space-y-3 p-4 sm:p-5">
        <h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="FileStack" :ukuran="17" /></span> Dokumen pendukung</h2>
        <div class="grid gap-2 sm:grid-cols-2">
          <span class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><Ikon nama="BookOpenText" :ukuran="16" /> Sampul &amp; Kwitansi Besar (selalu)</span>
          <label v-for="k in DOK_HONOR" :key="k" class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
            <input v-model="f.dokumen[k]" type="checkbox" class="h-5 w-5 accent-biru" /><Ikon :nama="DOKUMEN[k].ikon" :ukuran="16" class="text-biru" /> <b>{{ DOKUMEN[k].judul }}</b>
          </label>
        </div>
        <div v-if="f.dokumen.daftar_hadir" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div><label class="label text-xs" for="hb">Baris daftar hadir</label><input id="hb" v-model.number="f.lampiran.baris_hadir" type="number" min="1" class="masukan angka" /></div>
          <label class="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm"><input v-model="f.lampiran.peserta_pegawai" type="checkbox" class="h-5 w-5 accent-biru" /> Nama dari data pegawai</label>
        </div>
        <div v-if="f.dokumen.notulen"><label class="label" for="nth">Notulen / laporan singkat</label><textarea id="nth" v-model="f.notulen" rows="4" class="masukan" /></div>
      </section>

      <div v-for="(w, i) in peringatan" :key="i" :class="['flex gap-2 rounded-xl p-3 text-sm', NADA[w.nada]]"><Ikon nama="TriangleAlert" :ukuran="17" class="mt-0.5 shrink-0" /> {{ w.teks }}</div>

      <div class="kartu sticky bottom-20 z-20 flex flex-wrap items-center gap-3 p-3 shadow-lg lg:bottom-4">
        <div class="min-w-0 flex-1"><p class="text-xs text-slate-500">{{ penerima.length }} penerima</p><p class="angka text-lg font-extrabold">{{ rupiah(jumlahBruto) }}</p></div>
        <p v-if="galat.length" class="hidden max-w-xs text-xs text-rose-600 sm:block">{{ galat[0] }}</p>
        <button class="tombol-garis" @click="router.back()">Batal</button>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
      </div>
    </template>

    <!-- Pilih pegawai -->
    <Laci v-if="pilihPegawai" judul="Pilih pegawai" subjudul="Centang penerima" ikon="Users" @tutup="pilihPegawai = false">
      <div class="space-y-3 p-5">
        <div class="relative"><Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cariPegawai" class="masukan pl-9" placeholder="Cari nama/jabatan…" /></div>
        <label v-for="p in hasilPegawai" :key="p.id" :class="['flex cursor-pointer items-center gap-3 rounded-xl border p-2.5', sudahAda(p.id) ? 'opacity-50' : '', terpilih.includes(p.id) ? 'border-biru bg-biru/5 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700']">
          <input v-model="terpilih" type="checkbox" :value="p.id" :disabled="sudahAda(p.id)" class="h-5 w-5 accent-biru" />
          <span class="min-w-0 flex-1"><b class="block truncate text-sm">{{ namaGelar(p) }}</b><span class="text-xs text-slate-500">{{ [p.status_kepegawaian, p.golongan, p.jabatan].filter(Boolean).join(' · ') }}</span></span>
        </label>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="!terpilih.length" @click="tambahPegawai"><Ikon nama="UserPlus" :ukuran="17" /> Tambahkan {{ terpilih.length || '' }}</button>
        <button class="tombol-garis" @click="pilihPegawai = false">Batal</button>
      </template>
    </Laci>

    <!-- Orang luar -->
    <Laci v-if="luarBaru" judul="Penerima luar sekolah" subjudul="Narasumber, pengawas, juri tamu — tersimpan otomatis" ikon="UserRound" @tutup="luarBaru = null">
      <div class="space-y-3 p-5">
        <p class="text-sm font-semibold">Pernah dicatat</p>
        <button v-for="o in bahan.orangLuar" :key="o.id" type="button" class="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-2.5 text-left hover:border-biru dark:border-slate-700" @click="tambahLuar(o)">
          <Ikon nama="UserRound" :ukuran="17" class="text-biru" /><span class="min-w-0 flex-1"><b class="block truncate text-sm">{{ o.nama }}</b><span class="text-xs text-slate-500">{{ [o.jabatan, o.instansi].filter(Boolean).join(' · ') }}</span></span>
        </button>
        <p v-if="!bahan.orangLuar.length" class="text-xs text-slate-500">Belum ada. Penerima baru akan tersimpan otomatis saat transaksi disimpan.</p>
      </div>
      <template #kaki>
        <button class="tombol-utama" @click="tambahLuar(null)"><Ikon nama="Plus" :ukuran="17" /> Penerima baru</button>
        <button class="tombol-garis" @click="luarBaru = null">Tutup</button>
      </template>
    </Laci>
  </div>
</template>
