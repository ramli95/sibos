<script setup>
// Versi RKAS (murni/pergeseran/perubahan), perbandingan antarversi, dan impor PDF dari ARKAS.
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRkas } from '@/stores/rkas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { modePratinjau } from '@/services/firebase'
import { JENIS_VERSI, simpanVersi, jadikanBerlaku, hapusVersi, muatUraian } from '@/services/rkas'
import { uraiKertasKerjaTahap, uraiKertasKerjaBulan, pasangBulanan, uraianDariBulanan, NAMA_BULAN_KECIL } from '@/utils/arkas'
import { bandingkanVersi } from '@/utils/rkasPohon'
import { rupiah, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const rkas = useRkas()
const auth = useAuth()
const notif = useNotifikasi()
const router = useRouter()

/* ---------- daftar versi ---------- */
async function berlaku(v) {
  if (modePratinjau) return notif.kabari('Mode Pratinjau: tidak disimpan.', 'info')
  try { await jadikanBerlaku(v, rkas.daftarVersi); await rkas.muat({ segar: true }); notif.kabari(`${v.nama} sekarang versi berlaku.`) } catch (e) { notif.kabari(e.message, 'galat') }
}
async function hapus(v) {
  if (!confirm(`Hapus RKAS ${v.tahun} versi ${v.nama}? Data uraiannya ikut terhapus (tercatat di log).`)) return
  if (modePratinjau) return notif.kabari('Mode Pratinjau: tidak disimpan.', 'info')
  try { await hapusVersi(v); await rkas.muat({ segar: true }); notif.kabari('Versi dihapus.') } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- perbandingan ---------- */
const idA = ref('')
const idB = ref('')
const banding = ref(null)
async function bandingkan() {
  if (!idA.value || !idB.value) return
  const [a, b] = await Promise.all([muatUraian(idA.value), muatUraian(idB.value)])
  banding.value = bandingkanVersi(a, b, rkas.nama).filter((x) => x.selisih !== 0 || x.nLama !== x.nBaru)
}
const namaVersi = (id) => rkas.daftarVersi.find((v) => v.id === id)?.nama || ''

/* ---------- impor ---------- */
const impor = ref(null) // { langkah, berkasTahap, berkasBulan, hasilTahap, hasilBulan, pasangan, meta, target }
const membaca = ref('')
const menyimpan = ref(false)

function mulaiImpor(untukVersi = null) {
  impor.value = {
    langkah: 1, berkasTahap: null, berkasBulan: null, hasilTahap: null, hasilBulan: null, pasangan: null,
    target: untukVersi ? untukVersi.id : 'baru', hanyaBulan: !!untukVersi,
    meta: { tahun: rkas.tahun, nama: '', jenis: 'perubahan', tanggal_dokumen: '', tanggal_dokumen_iso: '', berlaku: true, pagu: 0 },
  }
}

const BLN_ID = NAMA_BULAN_KECIL
function keIso(teks) {
  const m = String(teks || '').match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (!m) return ''
  const b = BLN_ID.indexOf(m[2].toLowerCase()) + 1
  return b ? `${m[3]}-${String(b).padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
}
function tebakJenis(nama, hasil) {
  const n = nama.toLowerCase()
  if (hasil?.draf || /murni|usulan|desember/.test(n)) return 'murni'
  if (/geser/.test(n)) return 'pergeseran'
  return 'perubahan'
}

async function bacaBerkas(jenis, e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  membaca.value = jenis
  try {
    const { bacaTeksPdf } = await import('@/utils/bacaPdf')
    const { halaman } = await bacaTeksPdf(file)
    const I = impor.value
    if (jenis === 'tahap') {
      const h = uraiKertasKerjaTahap(halaman)
      if (!h.uraian.length) throw new Error('Berkas ini bukan Kertas Kerja RKAS per Tahap dari ARKAS, atau teksnya tidak terbaca.')
      I.berkasTahap = file.name; I.hasilTahap = h
      I.meta.tahun = h.tahun || rkas.tahun
      I.meta.pagu = h.pagu || h.total_arkas || h.total
      I.meta.tanggal_dokumen = h.tanggal_dokumen || ''
      I.meta.tanggal_dokumen_iso = keIso(h.tanggal_dokumen)
      I.meta.jenis = tebakJenis(file.name, h)
      const bln = I.meta.tanggal_dokumen_iso ? NAMA_BULAN[Number(I.meta.tanggal_dokumen_iso.slice(5, 7)) - 1] + ' ' + I.meta.tanggal_dokumen_iso.slice(0, 4) : ''
      I.meta.nama = `${JENIS_VERSI[I.meta.jenis].nama}${bln ? ` (${bln})` : ''}`
      I.meta.berlaku = I.meta.jenis !== 'murni'
    } else {
      const h = uraiKertasKerjaBulan(halaman)
      if (!h.bulan.length) throw new Error('Berkas ini bukan Rincian Kertas Kerja Perbulan dari ARKAS, atau teksnya tidak terbaca.')
      I.berkasBulan = file.name; I.hasilBulan = h
    }
    await hitungPasangan()
  } catch (err) { notif.kabari(err.message, 'galat') } finally { membaca.value = '' }
}

async function hitungPasangan() {
  const I = impor.value
  if (!I.hasilBulan) { I.pasangan = null; return }
  let dasar = I.hasilTahap?.uraian
  if (!dasar && I.hanyaBulan) dasar = await muatUraian(I.target)
  I.pasangan = dasar ? pasangBulanan(dasar, I.hasilBulan) : { uraian: uraianDariBulanan(I.hasilBulan), tidakCocok: [], sisaBulan: [], lengkap: true, dariBulanan: true }
}

const uraianAkhir = computed(() => {
  const I = impor.value
  if (!I) return []
  if (I.pasangan) return I.pasangan.uraian
  return I.hasilTahap?.uraian || []
})
const ringkasImpor = computed(() => {
  const u = uraianAkhir.value
  return { n: u.length, total: u.reduce((s, x) => s + x.jumlah, 0), t1: u.reduce((s, x) => s + (x.tahap1 || 0), 0), t2: u.reduce((s, x) => s + (x.tahap2 || 0), 0) }
})
const pemeriksaan = computed(() => {
  const I = impor.value
  if (!I) return []
  const out = []
  const h = I.hasilTahap
  if (h) {
    out.push({ ok: h.total_arkas === h.total, teks: `Jumlah uraian terbaca ${rupiah(h.total)} ${h.total_arkas === h.total ? '=' : '≠'} baris "Jumlah" ARKAS ${rupiah(h.total_arkas)}` })
    out.push({ ok: h.tahap1_arkas == null || (h.tahap1_arkas === h.tahap1 && h.tahap2_arkas === h.tahap2), teks: `Tahap I ${rupiah(h.tahap1)} · Tahap II ${rupiah(h.tahap2)}` })
    if (h.pagu) out.push({ ok: h.pagu === h.total, teks: `Total ${h.pagu === h.total ? 'sama dengan' : 'berbeda dari'} pagu penerimaan ${rupiah(h.pagu)}` })
    out.push({ ok: h.selisih.length === 0, teks: h.selisih.length ? `${h.selisih.length} subtotal program/kegiatan tidak cocok` : `Semua subtotal ${h.induk.length} program/kegiatan cocok` })
    out.push({ ok: h.galat.length === 0, teks: h.galat.length ? `${h.galat.length} baris tidak terbaca` : `${h.uraian.length} uraian terbaca tanpa galat` })
  }
  if (I.hasilBulan) {
    const hb = I.hasilBulan
    const salah = hb.bulan.filter((b) => !b.cocok)
    out.push({ ok: salah.length === 0 && hb.galat.length === 0, teks: `Rincian per bulan: ${hb.bulan.length} bulan, total ${rupiah(hb.total)}${salah.length ? `, ${salah.length} bulan jumlahnya tidak cocok` : ''}` })
    if (I.pasangan && !I.pasangan.dariBulanan) out.push({ ok: I.pasangan.lengkap, teks: I.pasangan.lengkap ? 'Semua uraian mendapat rencana bulanan yang pas' : `${I.pasangan.tidakCocok.length} uraian belum pas dengan rincian bulanan (bisa dirapikan lewat Pergeseran)` })
  }
  return out
})
const siapSimpan = computed(() => {
  const I = impor.value
  if (!I || menyimpan.value) return false
  if (I.hanyaBulan) return !!I.pasangan
  return uraianAkhir.value.length > 0 && !!I.meta.nama.trim()
})

async function simpanImpor() {
  const I = impor.value
  if (modePratinjau) return notif.kabari('Mode Pratinjau: impor tidak disimpan.', 'info')
  menyimpan.value = true
  try {
    let uraian = uraianAkhir.value
    // Bulanan yang belum pas: simpan apa adanya hanya bila jumlahnya sama; selain itu kosongkan bulan agar tahap tetap benar
    if (I.pasangan && !I.pasangan.dariBulanan) {
      const salah = new Set(I.pasangan.tidakCocok.map((u) => u.no))
      uraian = uraian.map((u) => (salah.has(u.no) ? { ...u, bulan: sebarkanTahap(u) } : u))
    }
    const target = I.target === 'baru' ? null : I.target
    const meta = I.hanyaBulan ? { ...rkas.daftarVersi.find((v) => v.id === target), sumber_bulan: I.berkasBulan } : { ...I.meta, sumber_tahap: I.berkasTahap || null, sumber_bulan: I.berkasBulan || null }
    delete meta.id
    ;['total', 'tahap1', 'tahap2', 'jumlah_uraian', 'ada_bulanan', 'per_kategori', 'snp', 'dibuat', 'diperbarui', 'diperbarui_oleh'].forEach((k) => delete meta[k])
    const id = await simpanVersi({ id: target, meta, uraian, induk: I.hasilTahap?.induk || [], namaBerkas: [I.berkasTahap, I.berkasBulan].filter(Boolean).join(' + ') })
    await rkas.muat({ segar: true })
    await rkas.pilihVersi(id, { segar: true })
    notif.kabari(`RKAS ${meta.nama} tersimpan: ${uraian.length} uraian, ${rupiah(ringkasImpor.value.total)}.`)
    impor.value = { ...I, langkah: 3, idTersimpan: id }
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
// Untuk uraian yang belum pas: taruh Tahap I di Januari dan Tahap II di Juli (bisa digeser kemudian)
function sebarkanTahap(u) { const b = Array(12).fill(0); b[0] = u.tahap1 || 0; b[6] = u.tahap2 || 0; return b }

const pratinjau = computed(() => uraianAkhir.value.slice(0, 400))
const adaBulanDiPratinjau = computed(() => uraianAkhir.value.some((u) => u.bulan))
</script>

<template>
  <div class="space-y-5">
    <!-- Daftar versi -->
    <section class="kartu p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow"><Ikon nama="GitCompareArrows" :ukuran="19" /></span>
        <div class="flex-1">
          <h2 class="font-bold">Versi RKAS {{ rkas.tahun }}</h2>
          <p class="text-xs text-slate-500">Satu versi ditandai berlaku; dipakai Dasbor, belanja dan laporan. "Ajukan Pengesahan" tetap dilakukan di ARKAS.</p>
        </div>
        <button v-if="auth.isAdmin" class="tombol-utama" @click="mulaiImpor()"><Ikon nama="FileUp" :ukuran="17" /> Impor dari ARKAS</button>
      </div>
      <p v-if="!rkas.daftarVersi.length" class="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50">Belum ada versi. Mulai dengan mengimpor Kertas Kerja RKAS per Tahap.</p>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="v in rkas.daftarVersi" :key="v.id" :class="['rounded-2xl border p-4', v.berlaku ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700']">
          <div class="flex items-start gap-3">
            <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow', JENIS_VERSI[v.jenis]?.warna]"><Ikon :nama="JENIS_VERSI[v.jenis]?.ikon" :ukuran="18" /></span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold">{{ v.nama }}</p>
              <p class="text-xs text-slate-500">{{ v.tanggal_dokumen || 'Tanpa tanggal' }} · {{ v.jumlah_uraian }} uraian</p>
            </div>
            <span v-if="v.berlaku" class="lencana bg-emerald-600 text-white"><Ikon nama="BadgeCheck" :ukuran="12" /> Berlaku</span>
          </div>
          <p class="angka mt-3 text-xl font-extrabold">{{ rupiah(v.total) }}</p>
          <p class="angka text-xs text-slate-500">T1 {{ rupiah(v.tahap1) }} · T2 {{ rupiah(v.tahap2) }}</p>
          <div class="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span :class="['lencana', v.ada_bulanan ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300']">
              <Ikon :nama="v.ada_bulanan ? 'CalendarDays' : 'CalendarRange'" :ukuran="12" /> {{ v.ada_bulanan ? 'Rencana bulanan ada' : 'Belum ada rencana bulanan' }}
            </span>
            <span v-if="v.pagu && v.pagu === v.total" class="lencana bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><Ikon nama="CircleCheck" :ukuran="12" /> = Pagu ARKAS</span>
          </div>
          <div v-if="auth.isAdmin" class="mt-3 flex flex-wrap gap-2">
            <button v-if="!v.berlaku" class="tombol-garis px-3 py-1.5 text-xs" @click="berlaku(v)"><Ikon nama="BadgeCheck" :ukuran="14" class="text-emerald-600" /> Jadikan berlaku</button>
            <button class="tombol-garis px-3 py-1.5 text-xs" @click="mulaiImpor(v)"><Ikon nama="CalendarDays" :ukuran="14" class="text-tosca" /> {{ v.ada_bulanan ? 'Ganti' : 'Tambah' }} rincian bulanan</button>
            <button class="tombol-garis px-3 py-1.5 text-xs" @click="hapus(v)"><Ikon nama="Trash2" :ukuran="14" class="text-rose-500" /> Hapus</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Impor -->
    <section v-if="impor" class="kartu overflow-hidden">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-rose-50 p-5 dark:border-slate-800 dark:from-amber-950/30 dark:to-rose-950/20">
        <span class="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow"><Ikon nama="FileUp" :ukuran="20" /></span>
        <div class="flex-1">
          <h2 class="font-bold">{{ impor.hanyaBulan ? `Rincian per bulan untuk ${namaVersi(impor.target)}` : 'Impor RKAS dari PDF ARKAS' }}</h2>
          <p class="text-xs text-slate-600 dark:text-slate-300">Berkas dibaca di perangkat ini; tidak diunggah ke mana pun.</p>
        </div>
        <button class="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/60 dark:hover:bg-slate-800" aria-label="Tutup" @click="impor = null"><Ikon nama="X" :ukuran="19" /></button>
      </div>

      <div v-if="impor.langkah === 3" class="flex flex-col items-center gap-3 p-8 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow"><Ikon nama="CircleCheck" :ukuran="28" /></span>
        <p class="text-lg font-bold">RKAS tersimpan</p>
        <p class="text-sm text-slate-500">{{ ringkasImpor.n }} uraian · <b class="angka">{{ rupiah(ringkasImpor.total) }}</b>. Kode kegiatan & rekening ARKAS yang baru sudah ditambahkan ke Referensi Juknis.</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button class="tombol-utama" @click="router.replace('/rkas/kertas-kerja'); impor = null"><Ikon nama="ListTree" :ukuran="17" /> Lihat kertas kerja</button>
          <button class="tombol-garis" @click="router.push('/standar-harga?dari=rkas')"><Ikon nama="Tags" :ukuran="17" class="text-kuning" /> Perbarui Standar Harga</button>
        </div>
      </div>

      <div v-else class="space-y-5 p-5">
        <div class="grid gap-3 md:grid-cols-2">
          <label v-if="!impor.hanyaBulan" :class="['flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-4 transition hover:border-biru', impor.berkasTahap ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-300 dark:border-slate-600']">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white"><Ikon :nama="membaca === 'tahap' ? 'RefreshCw' : impor.berkasTahap ? 'CircleCheck' : 'Layers'" :ukuran="20" :class="membaca === 'tahap' && 'animate-spin'" /></span>
            <span class="min-w-0 flex-1"><b class="block text-sm">1. Kertas Kerja RKAS per Tahap <span class="text-rose-500">*</span></b><span class="block truncate text-xs text-slate-500">{{ impor.berkasTahap || 'PDF dari ARKAS → Cetak → Kertas Kerja per Tahap' }}</span></span>
            <input type="file" accept="application/pdf,.pdf" class="sr-only" @change="bacaBerkas('tahap', $event)" />
          </label>
          <label :class="['flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-4 transition hover:border-biru', impor.berkasBulan ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-300 dark:border-slate-600']">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white"><Ikon :nama="membaca === 'bulan' ? 'RefreshCw' : impor.berkasBulan ? 'CircleCheck' : 'CalendarDays'" :ukuran="20" :class="membaca === 'bulan' && 'animate-spin'" /></span>
            <span class="min-w-0 flex-1"><b class="block text-sm">{{ impor.hanyaBulan ? '' : '2. ' }}Rincian Kertas Kerja Perbulan <span class="font-normal text-slate-500">{{ impor.hanyaBulan ? '' : '(disarankan)' }}</span></b><span class="block truncate text-xs text-slate-500">{{ impor.berkasBulan || 'PDF dari ARKAS → Cetak → Rincian Kertas Kerja Perbulan' }}</span></span>
            <input type="file" accept="application/pdf,.pdf" class="sr-only" @change="bacaBerkas('bulan', $event)" />
          </label>
        </div>

        <ul v-if="pemeriksaan.length" class="grid gap-2 md:grid-cols-2">
          <li v-for="p in pemeriksaan" :key="p.teks" :class="['flex items-start gap-2 rounded-xl px-3 py-2 text-sm', p.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200']">
            <Ikon :nama="p.ok ? 'CircleCheck' : 'TriangleAlert'" :ukuran="16" class="mt-0.5" /> {{ p.teks }}
          </li>
        </ul>

        <details v-if="impor.hasilTahap?.selisih.length || impor.hasilTahap?.galat.length" class="rounded-xl border border-amber-200 p-3 text-sm dark:border-amber-800">
          <summary class="cursor-pointer font-semibold text-amber-700 dark:text-amber-300">Rincian yang perlu dicek</summary>
          <ul class="mt-2 space-y-1 text-xs">
            <li v-for="s in impor.hasilTahap.selisih" :key="s.kode"><span class="kode">{{ s.kode }}</span> {{ s.nama }}: ARKAS {{ rupiah(s.arkas) }}, terbaca {{ rupiah(s.terbaca) }}</li>
            <li v-for="g in impor.hasilTahap.galat" :key="g.galat">{{ g.galat }} — <span class="text-slate-500">{{ g.teks.slice(0, 140) }}</span></li>
          </ul>
        </details>

        <!-- Data versi -->
        <div v-if="impor.hasilTahap && !impor.hanyaBulan" class="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5 dark:bg-slate-800/40">
          <label class="lg:col-span-2"><span class="label">Nama versi</span><input v-model="impor.meta.nama" class="masukan" /></label>
          <label><span class="label">Jenis</span>
            <select v-model="impor.meta.jenis" class="masukan"><option v-for="(j, k) in JENIS_VERSI" :key="k" :value="k">{{ j.nama }}</option></select>
          </label>
          <label><span class="label">Simpan sebagai</span>
            <select v-model="impor.target" class="masukan"><option value="baru">Versi baru</option><option v-for="v in rkas.daftarVersi" :key="v.id" :value="v.id">Timpa: {{ v.nama }}</option></select>
          </label>
          <label class="flex items-end gap-2 pb-2.5 text-sm font-semibold"><input v-model="impor.meta.berlaku" type="checkbox" class="h-5 w-5 accent-emerald-600" /> Jadikan versi berlaku</label>
        </div>

        <!-- Pratinjau -->
        <div v-if="uraianAkhir.length" class="rounded-2xl border border-slate-200 dark:border-slate-700">
          <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
            <Ikon nama="Table2" class="text-biru" />
            <b>Pratinjau</b><span class="text-slate-500">{{ ringkasImpor.n }} uraian</span>
            <span class="ml-auto angka font-bold">{{ rupiah(ringkasImpor.total) }}</span>
          </div>
          <div class="max-h-[28rem] overflow-auto">
            <table class="w-full min-w-[900px] text-xs">
              <thead class="sticky top-0 bg-slate-50 text-left uppercase tracking-wide text-slate-500 dark:bg-slate-800">
                <tr><th class="px-3 py-2">No</th><th class="px-2 py-2">Kegiatan</th><th class="px-2 py-2">Rekening</th><th class="px-2 py-2">Uraian</th><th class="px-2 py-2 text-right">Vol</th><th class="px-2 py-2">Satuan</th><th class="px-2 py-2 text-right">Harga</th><th class="px-2 py-2 text-right">Jumlah</th><th class="px-2 py-2 text-right">T1</th><th class="px-2 py-2 text-right">T2</th><th v-if="adaBulanDiPratinjau" class="px-3 py-2">Bulan</th></tr>
              </thead>
              <tbody>
                <tr v-for="u in pratinjau" :key="u.no + u.uraian" :class="['border-t border-slate-100 dark:border-slate-800', u.peringatan && 'bg-amber-50 dark:bg-amber-950/30']">
                  <td class="px-3 py-1.5 text-slate-400">{{ u.no }}</td>
                  <td class="kode px-2 py-1.5">{{ u.kode_kegiatan }}</td>
                  <td class="kode px-2 py-1.5">{{ u.kode_rekening }}</td>
                  <td class="px-2 py-1.5">{{ u.uraian }}</td>
                  <td class="angka px-2 py-1.5 text-right">{{ u.volume }}</td>
                  <td class="px-2 py-1.5">{{ u.satuan }}</td>
                  <td class="angka px-2 py-1.5 text-right">{{ rupiah(u.harga, { tanpaRp: true }) }}</td>
                  <td class="angka px-2 py-1.5 text-right font-semibold">{{ rupiah(u.jumlah, { tanpaRp: true }) }}</td>
                  <td class="angka px-2 py-1.5 text-right">{{ rupiah(u.tahap1, { tanpaRp: true }) }}</td>
                  <td class="angka px-2 py-1.5 text-right">{{ rupiah(u.tahap2, { tanpaRp: true }) }}</td>
                  <td v-if="adaBulanDiPratinjau" class="px-3 py-1.5">
                    <div class="flex h-4 items-end gap-px" :title="u.bulan ? u.bulan.map((x, i) => `${NAMA_BULAN[i]}: ${rupiah(x)}`).join('\n') : ''">
                      <i v-for="(x, i) in (u.bulan || [])" :key="i" class="w-1.5 rounded-sm bg-teal-500" :style="{ height: x ? Math.max(15, (x / (u.jumlah || 1)) * 100) + '%' : '2px', opacity: x ? 1 : 0.25 }" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <button class="tombol-garis" @click="impor = null"><Ikon nama="X" :ukuran="17" /> Batal</button>
          <button class="tombol-utama" :disabled="!siapSimpan" @click="simpanImpor"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan ke SIBOS</button>
        </div>
      </div>
    </section>

    <!-- Bandingkan -->
    <section v-if="rkas.daftarVersi.length > 1" class="kartu p-5">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow"><Ikon nama="ArrowDownUp" :ukuran="19" /></span>
        <div class="flex-1"><h2 class="font-bold">Bandingkan versi</h2><p class="text-xs text-slate-500">Perbedaan anggaran per kegiatan, mis. Murni dibanding Perubahan.</p></div>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <label class="min-w-[12rem] flex-1"><span class="label">Versi awal</span><select v-model="idA" class="masukan"><option v-for="v in rkas.daftarVersi" :key="v.id" :value="v.id">{{ v.nama }}</option></select></label>
        <Ikon nama="MoveRight" class="mb-3 text-slate-400" />
        <label class="min-w-[12rem] flex-1"><span class="label">Versi pembanding</span><select v-model="idB" class="masukan"><option v-for="v in rkas.daftarVersi" :key="v.id" :value="v.id">{{ v.nama }}</option></select></label>
        <button class="tombol-utama" :disabled="!idA || !idB || idA === idB" @click="bandingkan"><Ikon nama="GitCompareArrows" :ukuran="17" /> Bandingkan</button>
      </div>
      <div v-if="banding" class="mt-4 overflow-x-auto">
        <p v-if="!banding.length" class="text-sm text-slate-500">Tidak ada perbedaan anggaran per kegiatan.</p>
        <table v-else class="w-full min-w-[640px] text-sm">
          <thead><tr class="text-left text-[11px] uppercase tracking-wide text-slate-500"><th class="py-2">Kegiatan</th><th class="py-2 text-right">{{ namaVersi(idA) }}</th><th class="py-2 text-right">{{ namaVersi(idB) }}</th><th class="py-2 text-right">Selisih</th></tr></thead>
          <tbody>
            <tr v-for="x in banding" :key="x.kode" class="border-t border-slate-100 dark:border-slate-800">
              <td class="py-2"><span class="kode mr-1.5 text-xs text-slate-500">{{ x.kode }}</span>{{ x.nama }}</td>
              <td class="angka py-2 text-right">{{ rupiah(x.lama) }}</td><td class="angka py-2 text-right">{{ rupiah(x.baru) }}</td>
              <td :class="['angka py-2 text-right font-semibold', x.selisih > 0 ? 'text-emerald-600' : 'text-rose-600']">
                <Ikon :nama="x.selisih > 0 ? 'TrendingUp' : 'TrendingDown'" :ukuran="13" class="mr-1 inline" />{{ x.selisih > 0 ? '+' : '' }}{{ rupiah(x.selisih) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
