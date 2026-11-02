<script setup>
// Rincian satu transaksi: status, dokumen (cetak satu per satu atau Paket SPJ sekali klik), foto dokumentasi,
// unggah PDF SIPLah & arsip bertanda tangan ke Drive, serta daftar kelengkapan.
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useRkas } from '@/stores/rkas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatBahan } from '@/services/bahanBelanja'
import { muatBelanja, muatFoto, tambahFoto, ubahFoto, hapusFoto, unggahArsip, hapusArsip, hapusBelanja } from '@/services/belanja'
import { NAMA_REKENING } from '@/services/rkas'
import { STATUS, DOKUMEN, DOKUMEN_SIPLAH, ARSIP, KATEGORI_LABEL, JENIS_HONOR, JENIS_NOMOR } from '@/config/belanja'
import { kelengkapan, persenLengkap, kelompokRekening } from '@/utils/belanja'
import { rupiah, tanggalPanjang, tanggalPendek } from '@/utils/format'
import { pilihanPaket, grupKwitansiBesar } from '@/components/spj/paket'
import Ikon from '@/components/Ikon.vue'
import PaketSpj from '@/components/spj/PaketSpj.vue'
import WaTransaksi from '@/components/WaTransaksi.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const rkas = useRkas()
const belanja = useBelanja()
const notif = useNotifikasi()

const b = ref(null)
const foto = ref([])
const bahan = ref(null)
const bukaWa = ref(false)
const memuat = ref(true)
const paket = ref(null) // null | { hanya: [kunci] | null }
const sibuk = ref('')

async function muat() {
  const id = route.params.id
  const [x, f, bh] = await Promise.all([muatBelanja(id), muatFoto(id).catch(() => []), muatBahan(), rkas.muat().catch(() => {}), belanja.muat().catch(() => {})])
  b.value = x
  foto.value = f
  bahan.value = bh
  if (x) belanja.ganti(x)
}
onMounted(async () => { try { await muat() } catch (e) { notif.kabari(e.message, 'galat') } finally { memuat.value = false } })

const honor = computed(() => b.value?.jenis === 'honor')
const siplah = computed(() => b.value?.cara === 'siplah')
const st = computed(() => STATUS[b.value?.status] || STATUS.draf)
const cek = computed(() => (b.value ? kelengkapan(b.value, { foto: foto.value.length }) : []))
const persen = computed(() => persenLengkap(cek.value))
const dokumen = computed(() => (b.value ? pilihanPaket(b.value, foto.value) : []))
const nomorDok = (k) => b.value?.nomor?.[k] || (['kwitansi_besar', 'sampul'].includes(k) ? Object.values(b.value?.bnu || {}).filter(Boolean).join(', ') : '')
const gabung = computed(() => (b.value ? grupKwitansiBesar(b.value, belanja.daftar).filter((g) => g.dari.size > 1) : []))
const namaRek = (k) => rkas.nama.rekening(k) || NAMA_REKENING[k] || ''
const namaKeg = (k) => rkas.nama.kegiatan(k)

const langkah = computed(() => {
  const x = b.value || {}
  if (honor.value) return [
    { judul: 'Kegiatan', tgl: x.tgl_kegiatan, ikon: 'CalendarDays' },
    { judul: 'Dibayar', tgl: x.tgl_lunas, ikon: 'BadgeCheck' },
    { judul: 'Lengkap', tgl: persen.value === 100 ? 'ok' : '', ikon: 'Archive' },
  ]
  return [
    { judul: 'Dipesan', tgl: x.tgl_pesanan, ikon: 'FileSignature' },
    { judul: 'Diterima', tgl: x.tgl_terima, ikon: 'PackageCheck' },
    { judul: 'Lunas', tgl: x.tgl_lunas, ikon: 'BadgeCheck' },
    { judul: 'Lengkap', tgl: persen.value === 100 ? 'ok' : '', ikon: 'Archive' },
  ]
})

/* ---------- Foto ---------- */
const masukanFoto = ref(null)
async function pilihFoto(e) {
  const berkas = [...e.target.files]
  e.target.value = ''
  if (!berkas.length) return
  sibuk.value = 'foto'
  let gagalDrive = ''
  try {
    for (const [i, f] of berkas.entries()) {
      const h = await tambahFoto(b.value, f, { keterangan: '', urutan: foto.value.length + i })
      if (h.galatDrive) gagalDrive = h.galatDrive
    }
    foto.value = await muatFoto(b.value.id)
    b.value.jumlah_foto = foto.value.length
    notif.kabari(gagalDrive ? `Foto tersimpan untuk dicetak, tetapi arsip Drive gagal: ${gagalDrive}` : `${berkas.length} foto ditambahkan${honor.value ? '' : ' dan diarsipkan ke Drive'}.`, gagalDrive ? 'peringatan' : 'sukses')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { sibuk.value = '' }
}
async function simpanKet(f) { try { await ubahFoto(b.value, f, { keterangan: f.keterangan }) } catch (e) { notif.kabari(e.message, 'galat') } }
async function buangFoto(f) {
  if (!confirm('Hapus foto ini dari dokumen? (Arsip di Drive tetap ada)')) return
  try { await hapusFoto(b.value, f); foto.value = foto.value.filter((x) => x.id !== f.id); b.value.jumlah_foto = foto.value.length } catch (e) { notif.kabari(e.message, 'galat') }
}
async function geserFoto(i, arah) {
  const j = i + arah
  if (j < 0 || j >= foto.value.length) return
  const a = foto.value[i], c = foto.value[j]
  foto.value.splice(i, 1, c); foto.value.splice(j, 1, a)
  try { await Promise.all(foto.value.map((f, n) => (f.urutan !== n ? ubahFoto(b.value, f, { urutan: (f.urutan = n) }) : null))) } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Arsip & SIPLah ---------- */
const masukanArsip = ref(null)
const targetArsip = ref(null)
function pilihArsip(kelompok, kunci) { targetArsip.value = { kelompok, kunci }; masukanArsip.value.click() }
async function unggah(e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f || !targetArsip.value) return
  sibuk.value = `arsip:${targetArsip.value.kunci}`
  try {
    await unggahArsip(b.value, targetArsip.value.kelompok, targetArsip.value.kunci, f)
    b.value = await muatBelanja(b.value.id)
    belanja.ganti(b.value)
    notif.kabari(`"${f.name}" diarsipkan ke Drive.`)
  } catch (err) { notif.kabari(err.message, 'galat') } finally { sibuk.value = '' }
}
async function lepas(kelompok, kunci, entri) {
  if (!confirm(`Lepas "${entri.nama}" dari transaksi ini? Berkas di Drive tidak dihapus.`)) return
  try { await hapusArsip(b.value, kelompok, kunci, entri); b.value = await muatBelanja(b.value.id); belanja.ganti(b.value) } catch (e) { notif.kabari(e.message, 'galat') }
}

async function hapus() {
  if (!confirm(`Hapus transaksi "${b.value.nama_pekerjaan}"? Nomor suratnya dihapus dari Agenda Surat dan tidak dipakai ulang.`)) return
  try { await hapusBelanja(b.value); belanja.buang(b.value.id); notif.kabari('Transaksi dihapus.'); router.replace(honor.value ? '/belanja/honor' : '/belanja/daftar') } catch (e) { notif.kabari(e.message, 'galat') }
}
const ubahKe = computed(() => (honor.value ? `/belanja/honor/ubah/${b.value?.id}` : `/belanja/ubah/${b.value?.id}`))
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <div v-if="memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat transaksi…</div>
    <div v-else-if="!b" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl ikon-chip-bahaya"><Ikon nama="SearchX" :ukuran="26" /></span>
      <p class="font-semibold">Transaksi tidak ditemukan.</p>
      <RouterLink to="/belanja/daftar" class="tombol-garis"><Ikon nama="ArrowLeft" :ukuran="17" /> Daftar belanja</RouterLink>
    </div>
    <template v-else>
      <!-- Kepala -->
      <div class="kartu p-4 sm:p-5">
        <div class="flex flex-wrap items-start gap-3">
          <button class="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Kembali" @click="router.push(honor ? '/belanja/honor' : '/belanja/daftar')"><Ikon nama="ArrowLeft" :ukuran="20" /></button>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span :class="['lencana', st.lencana]"><Ikon :nama="st.ikon" :ukuran="12" /> {{ st.label }}</span>
              <span v-if="siplah" class="lencana bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300"><Ikon nama="ShoppingBag" :ukuran="12" /> SIPLah · {{ b.mitra_siplah }}</span>
              <span v-else-if="honor" class="lencana bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300"><Ikon :nama="JENIS_HONOR[b.jenis_honor]?.ikon || 'Wallet'" :ukuran="12" /> {{ JENIS_HONOR[b.jenis_honor]?.label }}</span>
              <span class="lencana bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Ikon nama="Layers" :ukuran="12" /> {{ KATEGORI_LABEL[b.kategori] }}</span>
            </div>
            <h1 class="mt-1.5 text-lg font-extrabold leading-snug sm:text-xl">{{ b.nama_pekerjaan }}</h1>
            <p class="text-sm text-slate-500">{{ honor ? `${(b.penerima || []).length} penerima · ${b.tempat || ''}` : `${b.rekanan?.nama_usaha || '—'} · ${b.rekanan?.status_pkp ? 'PKP' : 'Non-PKP'}` }}</p>
          </div>
          <div class="flex w-full items-baseline justify-between gap-2 border-t border-slate-100 pt-2 sm:block sm:w-auto sm:border-0 sm:pt-0 sm:text-right dark:border-slate-800"><p class="text-xs text-slate-500">Jumlah</p><p class="angka text-xl font-extrabold">{{ rupiah(b.total) }}</p></div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="tombol-utama w-full sm:w-auto" @click="paket = { hanya: null }"><Ikon nama="Printer" :ukuran="17" /> Cetak Paket SPJ</button>
          <button class="tombol-garis" @click="bukaWa = true"><Ikon nama="MessageCircle" :ukuran="17" class="text-emerald-600" /> WhatsApp</button>
          <template v-if="auth.isAdmin">
            <RouterLink :to="ubahKe" class="tombol-garis"><Ikon nama="Pencil" :ukuran="17" class="text-biru" /> Ubah</RouterLink>

            <button class="tombol text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="hapus"><Ikon nama="Trash2" :ukuran="17" /> <span class="hidden sm:inline">Hapus</span></button>
          </template>
        </div>
        <!-- Langkah -->
        <ol class="mt-5 grid gap-2" :style="{ gridTemplateColumns: `repeat(${langkah.length}, minmax(0, 1fr))` }">
          <li v-for="(l, i) in langkah" :key="l.judul" class="flex flex-col items-center gap-1 text-center">
            <span :class="['grid h-9 w-9 place-items-center rounded-full', l.tgl ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800']"><Ikon :nama="l.tgl ? 'CircleCheck' : l.ikon" :ukuran="17" /></span>
            <span class="text-xs font-semibold">{{ l.judul }}</span>
            <span class="text-[11px] text-slate-500">{{ l.tgl === 'ok' ? `${persen}%` : l.tgl ? tanggalPendek(l.tgl) : i === langkah.length - 1 ? `${persen}%` : '—' }}</span>
          </li>
        </ol>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0 space-y-5">
          <!-- Item / penerima -->
          <section class="kartu p-4 sm:p-5">
            <h2 class="mb-3 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip"><Ikon :nama="honor ? 'Users' : 'Package'" :ukuran="17" /></span> {{ honor ? 'Penerima' : 'Item' }}</h2>
            <div v-if="honor" class="divide-y divide-slate-100 dark:divide-slate-800">
              <div v-for="(p, i) in b.penerima" :key="i" class="flex items-start gap-3 py-2.5">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">{{ i + 1 }}</span>
                <div class="min-w-0 flex-1"><p class="font-semibold">{{ p.nama }}</p><p class="text-xs text-slate-500">{{ [p.golongan, p.jabatan, p.instansi].filter(Boolean).join(' · ') }} · {{ p.volume }} {{ p.satuan }} × {{ rupiah(p.besaran) }}</p></div>
                <div class="text-right text-sm"><p class="angka font-bold">{{ rupiah(p.bruto) }}</p><p v-if="p.pph21" class="angka text-xs text-slate-500">PPh {{ rupiah(p.pph21) }}</p></div>
              </div>
            </div>
            <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
              <div v-for="it in b.item" :key="it.id" class="flex items-start gap-3 py-2.5">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg ikon-chip"><Ikon :nama="it.jenis === 'jasa' ? 'Wrench' : it.jenis === 'konsumsi' ? 'UtensilsCrossed' : 'Package'" :ukuran="15" /></span>
                <div class="min-w-0 flex-1"><p class="font-semibold leading-snug">{{ it.nama }}</p>
                  <p class="angka text-xs text-slate-500">{{ it.volume }} {{ it.satuan }} × {{ rupiah(it.harga) }}</p>
                  <p class="kode truncate text-[11px] text-slate-500">{{ it.kode_kegiatan }} · {{ it.kode_rekening }} · {{ it.uraian_rkas }}</p></div>
                <b class="angka">{{ rupiah(it.jumlah) }}</b>
              </div>
            </div>
            <div class="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <p v-for="g in kelompokRekening(b.item)" :key="g.kunci" class="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span><span class="kode">{{ g.kunci }}</span> <span class="text-slate-500">{{ namaRek(g.kode_rekening) }}</span></span>
                <span :class="['lencana', b.bnu?.[g.kunci] ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200']"><Ikon nama="BookOpenText" :ukuran="12" /> {{ b.bnu?.[g.kunci] || 'BNU belum diisi' }}</span>
              </p>
              <p v-for="p in b.pajak || []" :key="p.jenis" class="flex justify-between text-xs"><span class="text-slate-500">{{ p.jenis }} <template v-if="p.tarif">({{ p.tarif }}%)</template> — {{ p.ket }}</span><span class="angka">{{ rupiah(p.nilai) }}</span></p>
            </div>
            <div v-for="g in gabung" :key="g.bnu" class="mt-3 flex gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <Ikon nama="Link" :ukuran="15" /> {{ g.bnu }} digabung dengan {{ g.dari.size - 1 }} transaksi lain dalam satu kwitansi besar ({{ rupiah(g.baris.reduce((s, x) => s + x.jumlah, 0)) }}).
            </div>
          </section>

          <!-- Dokumen -->
          <section class="kartu p-4 sm:p-5">
            <div class="mb-3 flex items-center gap-2">
              <h2 class="flex flex-1 items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="FileStack" :ukuran="17" /></span> Dokumen ({{ dokumen.length }})</h2>
              <button class="tombol-garis py-2" @click="paket = { hanya: null }"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Paket</button>
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              <button v-for="d in dokumen" :key="d.kunci" type="button" class="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-biru dark:border-slate-700" @click="paket = { hanya: [d.kunci] }">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg ikon-chip"><Ikon :nama="d.ikon" :ukuran="17" /></span>
                <span class="min-w-0 flex-1"><b class="block truncate text-sm">{{ d.judul }}</b><span class="kode block truncate text-[11px] text-slate-500">{{ nomorDok(d.kunci) || (DOKUMEN[d.kunci].mendatar ? 'Kertas mendatar' : 'F4 tegak') }}</span></span>
                <Ikon nama="Printer" :ukuran="16" class="text-slate-400" />
              </button>
            </div>
            <p v-if="siplah" class="mt-3 text-xs text-slate-500">Surat pesanan, BAST dan invoice SIPLah memakai dokumen dari mitra — unggah PDF-nya di bawah.</p>
          </section>

          <!-- Foto -->
          <section class="kartu p-4 sm:p-5">
            <div class="mb-3 flex items-center gap-2">
              <h2 class="flex flex-1 items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="Image" :ukuran="17" /></span> Foto dokumentasi ({{ foto.length }})</h2>
              <template v-if="auth.isAdmin">
                <input ref="masukanFoto" type="file" accept="image/*" multiple class="hidden" @change="pilihFoto" />
                <button class="tombol-utama py-2" :disabled="sibuk === 'foto'" @click="masukanFoto.click()"><Ikon :nama="sibuk === 'foto' ? 'RefreshCw' : 'Camera'" :ukuran="16" :class="sibuk === 'foto' && 'animate-spin'" /> Tambah</button>
              </template>
            </div>
            <div v-if="!foto.length" class="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Belum ada foto. Foto diperkecil otomatis, tampil di lampiran cetak, dan aslinya diarsipkan ke Drive.</div>
            <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <figure v-for="(f, i) in foto" :key="f.id" class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <img :src="f.data" :alt="f.keterangan || `Foto ${i + 1}`" class="aspect-[4/3] w-full object-cover" />
                <figcaption class="space-y-1.5 p-2">
                  <input v-if="auth.isAdmin" v-model="f.keterangan" class="masukan px-2 py-1.5 text-xs" placeholder="Keterangan foto" @change="simpanKet(f)" />
                  <p v-else class="text-xs">{{ f.keterangan }}</p>
                  <div v-if="auth.isAdmin" class="flex items-center gap-1">
                    <button class="tombol px-1.5 py-1" :aria-label="`Geser foto ${i + 1} ke kiri`" @click="geserFoto(i, -1)"><Ikon nama="ChevronLeft" :ukuran="15" /></button>
                    <button class="tombol px-1.5 py-1" :aria-label="`Geser foto ${i + 1} ke kanan`" @click="geserFoto(i, 1)"><Ikon nama="ChevronRight" :ukuran="15" /></button>
                    <a v-if="f.tautan" :href="f.tautan" target="_blank" rel="noopener" class="tombol px-1.5 py-1 text-biru" aria-label="Buka arsip Drive"><Ikon nama="ExternalLink" :ukuran="15" /></a>
                    <button class="tombol ml-auto px-1.5 py-1 text-rose-600" :aria-label="`Hapus foto ${i + 1}`" @click="buangFoto(f)"><Ikon nama="Trash2" :ukuran="15" /></button>
                  </div>
                </figcaption>
              </figure>
            </div>
          </section>
        </div>

        <aside class="min-w-0 space-y-5">
          <!-- Kelengkapan -->
          <section class="kartu p-4 sm:p-5">
            <div class="mb-3 flex items-center gap-3">
              <span :class="['grid h-12 w-12 place-items-center rounded-2xl text-sm font-extrabold', persen === 100 ? 'ikon-chip-sukses' : persen >= 60 ? 'ikon-chip' : 'ikon-chip-peringatan']">{{ persen }}%</span>
              <div><h2 class="font-bold">Kelengkapan</h2><p class="text-xs text-slate-500">{{ cek.filter((c) => c.ok).length }} dari {{ cek.length }} terpenuhi</p></div>
            </div>
            <ul class="space-y-2">
              <li v-for="c in cek" :key="c.kunci" class="flex items-start gap-2 text-sm">
                <Ikon :nama="c.ok ? 'CircleCheck' : 'CircleAlert'" :ukuran="17" :class="c.ok ? 'text-emerald-500' : 'text-amber-500'" />
                <span :class="c.ok ? '' : 'font-semibold'">{{ c.judul }}<span v-if="c.ket" class="font-normal text-slate-500"> · {{ c.ket }}</span></span>
              </li>
            </ul>
          </section>

          <input ref="masukanArsip" type="file" accept="application/pdf,image/*" class="hidden" @change="unggah" />
          <!-- PDF SIPLah -->
          <section v-if="siplah" class="kartu p-4 sm:p-5">
            <h2 class="mb-3 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="ShoppingBag" :ukuran="17" /></span> Dokumen mitra SIPLah</h2>
            <p class="mb-2 text-xs text-slate-500">SP {{ b.siplah?.nomor_sp || '—' }} · BAST {{ b.siplah?.nomor_bast || '—' }} · Invoice {{ b.siplah?.nomor_invoice || '—' }}</p>
            <ul class="space-y-1.5">
              <li v-for="d in DOKUMEN_SIPLAH" :key="d.kunci" class="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-700">
                <Ikon :nama="b.siplah?.berkas?.[d.kunci] ? 'CircleCheck' : d.ikon" :ukuran="16" :class="b.siplah?.berkas?.[d.kunci] ? 'text-emerald-500' : 'text-slate-400'" />
                <span class="min-w-0 flex-1 truncate">{{ d.judul }}</span>
                <a v-if="b.siplah?.berkas?.[d.kunci]" :href="b.siplah.berkas[d.kunci].tautan" target="_blank" rel="noopener" class="text-biru" :aria-label="`Buka ${d.judul}`"><Ikon nama="ExternalLink" :ukuran="15" /></a>
                <button v-if="auth.isAdmin && b.siplah?.berkas?.[d.kunci]" class="text-rose-500" :aria-label="`Lepas ${d.judul}`" @click="lepas('siplah', d.kunci, b.siplah.berkas[d.kunci])"><Ikon nama="X" :ukuran="15" /></button>
                <button v-else-if="auth.isAdmin" class="tombol-garis px-2 py-1 text-xs" :disabled="sibuk === `arsip:${d.kunci}`" @click="pilihArsip('siplah', d.kunci)"><Ikon :nama="sibuk === `arsip:${d.kunci}` ? 'RefreshCw' : 'Upload'" :ukuran="13" :class="sibuk === `arsip:${d.kunci}` && 'animate-spin'" /> PDF</button>
              </li>
            </ul>
          </section>

          <!-- Arsip -->
          <section class="kartu p-4 sm:p-5">
            <h2 class="mb-1 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Archive" :ukuran="17" /></span> Arsip ke Drive</h2>
            <p class="mb-3 text-xs text-slate-500">Pindai/foto dokumen yang sudah ditandatangani & nota asli. Tersimpan di Drive SIBOS/{{ b.tahun }}/…/SPJ.</p>
            <div v-for="a in ARSIP" :key="a.kunci" class="mb-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
              <div class="flex items-center gap-2">
                <Ikon :nama="a.ikon" :ukuran="16" :class="(b.arsip?.[a.kunci] || []).length ? 'text-emerald-500' : 'text-biru'" />
                <span class="min-w-0 flex-1 text-sm font-semibold">{{ a.judul }}</span>
                <button v-if="auth.isAdmin" class="tombol-garis px-2 py-1 text-xs" :disabled="sibuk === `arsip:${a.kunci}`" @click="pilihArsip('arsip', a.kunci)"><Ikon :nama="sibuk === `arsip:${a.kunci}` ? 'RefreshCw' : 'Upload'" :ukuran="13" :class="sibuk === `arsip:${a.kunci}` && 'animate-spin'" /> Unggah</button>
              </div>
              <div v-for="(x, i) in b.arsip?.[a.kunci] || []" :key="i" class="mt-1.5 flex items-center gap-2 pl-6 text-xs">
                <a :href="x.tautan" target="_blank" rel="noopener" class="min-w-0 flex-1 truncate text-biru hover:underline">{{ x.nama }}</a>
                <button v-if="auth.isAdmin" class="text-rose-500" :aria-label="`Lepas ${x.nama}`" @click="lepas('arsip', a.kunci, x)"><Ikon nama="X" :ukuran="14" /></button>
              </div>
            </div>
          </section>

          <!-- Nomor -->
          <section v-if="!siplah && !honor" class="kartu p-4 sm:p-5">
            <h2 class="mb-3 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-kuning"><Ikon nama="Hash" :ukuran="17" /></span> Nomor dokumen</h2>
            <dl class="space-y-1.5 text-xs">
              <div v-for="(info, kunci) in JENIS_NOMOR" v-show="b.nomor?.[kunci]" :key="kunci" class="flex justify-between gap-2"><dt class="text-slate-500">{{ info.singkat }}</dt><dd class="kode text-right">{{ b.nomor?.[kunci] }}</dd></div>
            </dl>
            <RouterLink to="/agenda-surat/daftar" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-biru"><Ikon nama="Mailbox" :ukuran="14" /> Lihat di Agenda Surat</RouterLink>
          </section>
          <p class="text-center text-[11px] text-slate-400">Tanggal lunas {{ b.tgl_lunas ? tanggalPanjang(b.tgl_lunas) : 'belum diisi' }}</p>
        </aside>
      </div>

      <WaTransaksi v-if="bukaWa && b" :b="b" @ubah="b = $event" @tutup="bukaWa = false" />
      <PaketSpj v-if="paket && bahan" :b="b" :bahan="bahan" :foto="foto" :semua="belanja.daftar" :nama-keg="namaKeg" :nama-rek="namaRek" :hanya="paket.hanya" @tutup="paket = null" />
    </template>
  </div>
</template>
