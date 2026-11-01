<script setup>
// Pergeseran & Perubahan seperti ARKAS: draf salinan versi berlaku yang diedit per uraian lewat pop-up
// "Isi Detail Anggaran" (rencana per bulan). Draf dipakai untuk menyiapkan isian ARKAS; setelah disahkan
// di ARKAS, draf ditetapkan sebagai versi berlaku. Belanja "di luar RKAS" dan yang melebihi anggaran
// ditampilkan sebagai daftar yang perlu dimasukkan.
import { ref, computed, onMounted, watch } from 'vue'
import { useRkas } from '@/stores/rkas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { modePratinjau } from '@/services/firebase'
import { buatDraf, simpanUraianDraf, tetapkanDraf, muatUraian, muatPergeseran, JENIS_VERSI } from '@/services/rkas'
import { kunciUraian, tanggalRealisasi } from '@/utils/belanja'
import { KATEGORI } from '@/utils/arkas'
import { rupiah, NAMA_BULAN, formatWaktuRelatif, dariIso } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import DetailAnggaran from './DetailAnggaran.vue'

const rkas = useRkas()
const belanja = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()
onMounted(() => belanja.muat({ tahun: rkas.tahun }).catch(() => {}))

const draf = computed(() => (rkas.versi?.draf ? rkas.versi : null))
const drafLain = computed(() => rkas.daftarVersi.filter((v) => v.draf))
const sumber = ref([]) // uraian versi sumber draf (pembanding)
watch(() => draf.value?.id, async () => { sumber.value = draf.value?.id_sumber ? await muatUraian(draf.value.id_sumber).catch(() => []) : [] }, { immediate: true })

/* ---------- Mulai draf ---------- */
const jenisBaru = ref('pergeseran')
const namaBaru = ref('')
const membuat = ref(false)
const usulNama = computed(() => `${JENIS_VERSI[jenisBaru.value].nama} ${NAMA_BULAN[new Date().getMonth()]} ${rkas.tahun}`)
async function mulai() {
  const asal = rkas.versiBerlaku
  if (!asal) return notif.kabari('Belum ada versi berlaku.', 'galat')
  membuat.value = true
  try {
    const uraianAsal = await muatUraian(asal.id)
    const id = await buatDraf(asal, uraianAsal, { jenis: jenisBaru.value, nama: namaBaru.value.trim() || usulNama.value })
    await rkas.muatDaftar(); await rkas.pilihVersi(id)
    notif.kabari(modePratinjau ? 'Mode Pratinjau: draf hanya disimpan sementara (hilang saat dimuat ulang).' : 'Draf dibuat. Ubah uraian lewat tombol Edit atau Tambah Kegiatan.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { membuat.value = false }
}

/* ---------- Ringkasan seperti ARKAS ---------- */
const perKat = (daftar) => Object.fromEntries(Object.keys(KATEGORI).map((k) => [k, daftar.filter((u) => u.kategori === k).reduce((s, u) => s + u.jumlah, 0)]))
const katDraf = computed(() => perKat(rkas.uraian))
const katSumber = computed(() => perKat(sumber.value))
const total = computed(() => rkas.uraian.reduce((s, u) => s + u.jumlah, 0))
const pagu = computed(() => draf.value?.pagu || total.value)

/* ---------- Tabel per bulan ---------- */
const bulanAktif = ref(-1) // -1 = semua bulan
const saringKat = ref('semua')
const cari = ref('')
const sumberPeta = computed(() => new Map(sumber.value.map((u) => [u.id, u])))
const status = (u) => { const s = sumberPeta.value.get(u.id); if (!s) return 'baru'; return s.jumlah !== u.jumlah || s.harga !== u.harga || JSON.stringify(s.bulan) !== JSON.stringify(u.bulan) || s.uraian !== u.uraian ? 'ubah' : '' }
const baris = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return rkas.uraian.filter((u) => (saringKat.value === 'semua' || u.kategori === saringKat.value)
    && (bulanAktif.value < 0 || (u.bulan?.[bulanAktif.value] || 0) > 0)
    && (!q || [u.uraian, u.kode_kegiatan, u.kode_rekening, rkas.nama.kegiatan(u.kode_kegiatan)].some((x) => String(x || '').toLowerCase().includes(q))))
})
const volBln = (u) => (bulanAktif.value < 0 ? u.volume : Math.round(((u.bulan?.[bulanAktif.value] || 0) / (u.harga || 1)) * 100) / 100)
const nilaiBln = (u) => (bulanAktif.value < 0 ? u.jumlah : u.bulan?.[bulanAktif.value] || 0)

/* ---------- Pop-up detail ---------- */
const detail = ref(null) // { uraian, usulan }
const menyimpan = ref(false)
const pakaiUraian = (u) => [...(belanja.pemakaian.get(kunciUraian(u))?.bulanKomitmen || Array(12).fill(0))]
async function simpanDetail(baru) {
  menyimpan.value = true
  try {
    const hasil = await simpanUraianDraf(draf.value, rkas.uraian, detail.value.uraian, baru)
    rkas.pasangUraian(hasil); await rkas.muatDaftar(); detail.value = null
    notif.kabari('Draf diperbarui.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapusDetail() {
  if (!confirm(`Hapus uraian "${detail.value.uraian.uraian}" dari draf?`)) return
  await simpanDetail(null)
}

/* ---------- Belanja di luar RKAS & melebihi anggaran ---------- */
const luarRkas = computed(() => {
  const ada = new Set(rkas.uraian.map(kunciUraian))
  const peta = new Map()
  belanja.daftar.forEach((b) => {
    const m = dariIso(tanggalRealisasi(b))?.getMonth()
    ;(b.item || []).forEach((it) => {
      if (!it.kode_rekening || ada.has(kunciUraian(it))) return
      const k = kunciUraian(it)
      if (!peta.has(k)) peta.set(k, { kunci: k, kode_kegiatan: it.kode_kegiatan, kode_rekening: it.kode_rekening, uraian: it.uraian_rkas || it.nama, satuan: it.satuan || (/^5\.1\.02\.02\.01/.test(it.kode_rekening) ? 'orang/bulan' : ''), harga: it.harga, bulan: Array(12).fill(0), jumlah: 0, transaksi: new Set(), luar: !!it.luar_rkas })
      const x = peta.get(k)
      x.jumlah += it.jumlah; if (m != null) x.bulan[m] += it.jumlah; x.transaksi.add(b.nama_pekerjaan)
    })
  })
  return [...peta.values()]
})
const lewat = computed(() => rkas.uraian.map((u) => {
  const p = belanja.pemakaian.get(kunciUraian(u))
  const bln = (p?.bulanKomitmen || []).map((x, i) => Math.max(0, x - (u.bulan?.[i] || 0)))
  return { u, komitmen: p?.komitmen || 0, lebih: (p?.komitmen || 0) - u.jumlah, bulanLebih: bln.reduce((a, b) => a + b, 0) }
}).filter((x) => x.lebih > 0 || x.bulanLebih > 0))
function masukkanLuar(x) {
  const vol = (rp) => (x.harga ? rp / x.harga : 0)
  detail.value = { uraian: null, usulan: { kode_kegiatan: x.kode_kegiatan, kode_rekening: x.kode_rekening, uraian: x.uraian, satuan: x.satuan, harga: x.harga, bulan: x.bulan, volume: vol(x.jumlah) }, dibelanjakan: [...x.bulan] }
}

/* ---------- Perlu diinput di ARKAS (beda draf vs sumber) ---------- */
const beda = computed(() => {
  const ini = new Map(rkas.uraian.map((u) => [u.id, u]))
  const out = []
  rkas.uraian.forEach((u) => { const st = status(u); if (st) out.push({ jenis: st, u, lama: sumberPeta.value.get(u.id) }) })
  sumber.value.forEach((s) => { if (!ini.has(s.id)) out.push({ jenis: 'hapus', u: s, lama: s }) })
  return out
})
const bulanBeda = (a, b) => NAMA_BULAN.map((n, i) => ({ n: n.slice(0, 3), lama: a?.bulan?.[i] || 0, baru: b?.bulan?.[i] || 0 })).filter((x) => x.lama !== x.baru)

/* ---------- Tetapkan ---------- */
async function tetapkan() {
  if (!confirm(`Draf "${draf.value.nama}" sudah disahkan di ARKAS? Draf akan menjadi RKAS berlaku dan dipakai belanja & laporan.`)) return
  try { await tetapkanDraf(draf.value, rkas.daftarVersi); await rkas.muat({ segar: true }); notif.kabari('Draf ditetapkan sebagai RKAS berlaku.') } catch (e) { notif.kabari(e.message, 'galat') }
}

// Riwayat pergeseran lama (sebelum mode draf)
const riwayat = ref([])
onMounted(async () => { if (rkas.versiBerlaku) riwayat.value = await muatPergeseran(rkas.versiBerlaku.id).catch(() => []) })
</script>

<template>
  <div class="space-y-4">
    <!-- Belum memilih draf -->
    <template v-if="!draf">
      <div v-if="drafLain.length" class="kartu flex flex-wrap items-center gap-3 border-l-4 border-l-amber-500 p-4">
        <Ikon nama="FilePen" :ukuran="20" class="text-amber-500" />
        <p class="min-w-0 flex-1 text-sm">Ada draf yang belum ditetapkan: <b>{{ drafLain.map((v) => v.nama).join(', ') }}</b></p>
        <button v-for="v in drafLain" :key="v.id" class="tombol-utama" @click="rkas.pilihVersi(v.id)"><Ikon nama="FolderOpen" :ukuran="16" /> Buka {{ v.nama }}</button>
      </div>
      <section v-if="auth.isAdmin" class="kartu space-y-4 p-5">
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="ArrowRightLeft" :ukuran="20" /></span>
          <div><h3 class="font-bold">Mulai pergeseran / perubahan</h3><p class="text-xs text-slate-500">SIBOS menyalin versi berlaku ({{ rkas.versiBerlaku?.nama }}) menjadi draf. Ubah di sini dulu, lalu salin ke ARKAS.</p></div>
        </div>
        <div class="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
          <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button v-for="j in ['pergeseran', 'perubahan']" :key="j" :class="['flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold', jenisBaru === j ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']" @click="jenisBaru = j">
              <Ikon :nama="JENIS_VERSI[j].ikon" :ukuran="15" /> {{ JENIS_VERSI[j].nama }}
            </button>
          </div>
          <input v-model="namaBaru" class="masukan" :placeholder="usulNama" aria-label="Nama draf" />
          <button class="tombol-utama" :disabled="membuat || !rkas.versiBerlaku" @click="mulai"><Ikon :nama="membuat ? 'RefreshCw' : 'CirclePlus'" :ukuran="17" :class="membuat && 'animate-spin'" /> Buat draf</button>
        </div>
        <p class="text-xs text-slate-500"><b>Pergeseran</b>: total pagu tetap, anggaran dipindah antaruraian/bulan. <b>Perubahan</b>: pagu bisa berubah (mis. ada tambahan/pengurangan dana).</p>
      </section>
      <div v-if="luarRkas.length" class="kartu flex items-center gap-3 p-4 text-sm"><Ikon nama="ShoppingBag" :ukuran="18" class="text-amber-500" /> Ada {{ luarRkas.length }} item belanja di luar RKAS yang menunggu dimasukkan — buat draf untuk memasukkannya.</div>
      <section v-if="riwayat.length" class="kartu space-y-2 p-4">
        <h3 class="flex items-center gap-2 text-sm font-bold"><Ikon nama="History" :ukuran="16" class="text-biru" /> Riwayat pergeseran lama ({{ rkas.versiBerlaku?.nama }})</h3>
        <p v-for="r in riwayat" :key="r.id" class="text-xs text-slate-600 dark:text-slate-300">{{ formatWaktuRelatif(r.waktu?.toDate?.()) }} · {{ r.rincian?.length }} uraian · {{ rupiah(r.nilai) }}<template v-if="r.alasan"> — {{ r.alasan }}</template></p>
      </section>
    </template>

    <!-- Mode draf (seperti layar Pergeseran Kertas Kerja ARKAS) -->
    <template v-else>
      <div class="kartu flex flex-wrap items-center gap-2 p-4">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-wider text-amber-600">Draf {{ JENIS_VERSI[draf.jenis]?.nama }} · dari {{ draf.nama_sumber }}</p>
          <h3 class="text-xl font-extrabold">{{ draf.jenis === 'perubahan' ? 'Perubahan' : 'Pergeseran' }} Kertas Kerja</h3>
          <p class="text-xs text-slate-500">BOSP Reguler {{ rkas.tahun }} · {{ draf.nama }}</p>
        </div>
        <button v-if="auth.isAdmin" class="tombol-garis" @click="detail = { uraian: null, usulan: null, dibelanjakan: Array(12).fill(0) }"><Ikon nama="Plus" :ukuran="16" /> Tambah Kegiatan</button>
        <button v-if="auth.isAdmin" class="tombol-utama" @click="tetapkan"><Ikon nama="BadgeCheck" :ukuran="16" /> Sudah disahkan ARKAS</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <div v-for="(k, kk) in KATEGORI" :key="kk" class="kartu overflow-hidden">
          <p class="px-4 pt-3 text-xs text-slate-500">Total Anggaran {{ k.nama === 'Operasional' ? 'Dana Operasional' : k.nama === 'Alat & Mesin' ? 'Dana Alat dan Mesin' : 'Dana Aset' }}</p>
          <div class="px-4 pb-3 text-right">
            <p class="angka text-2xl font-bold text-biru dark:text-blue-300">{{ rupiah(katDraf[kk]) }}</p>
            <p :class="['angka text-sm', katDraf[kk] - katSumber[kk] === 0 ? 'text-emerald-600' : katDraf[kk] > katSumber[kk] ? 'text-emerald-600' : 'text-rose-600']">({{ katDraf[kk] - katSumber[kk] > 0 ? '+' : '' }}{{ rupiah(katDraf[kk] - katSumber[kk], { tanpaRp: true }) }})</p>
          </div>
          <p class="angka bg-slate-50 px-4 py-2 text-right text-sm font-semibold dark:bg-slate-800/60">{{ rupiah(katSumber[kk]) }}</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="kartu flex items-center justify-between gap-3 border border-biru/40 p-4"><span class="text-sm">Sudah Dianggarkan</span><b class="angka text-xl text-biru dark:text-blue-300">{{ rupiah(total) }}</b></div>
        <div :class="['kartu flex items-center justify-between gap-3 border p-4', pagu - total === 0 ? 'border-emerald-400' : 'border-rose-400']">
          <span class="text-sm">Belum Dianggarkan <span class="text-xs text-slate-500">(pagu {{ rupiah(pagu) }})</span></span>
          <b :class="['angka shrink-0 whitespace-nowrap text-xl', pagu - total === 0 ? 'text-emerald-600' : 'text-rose-600']">{{ rupiah(pagu - total) }}</b>
        </div>
      </div>

      <!-- Perlu dimasukkan -->
      <section v-if="luarRkas.length || lewat.length" class="kartu space-y-3 border-l-4 border-l-amber-500 p-4">
        <h3 class="flex items-center gap-2 font-bold"><Ikon nama="ShoppingBag" :ukuran="18" class="text-amber-500" /> Belanja yang perlu disesuaikan di anggaran</h3>
        <div v-for="x in luarRkas" :key="x.kunci" class="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50/70 p-3 text-sm dark:bg-amber-950/30">
          <span class="lencana bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">{{ x.luar ? 'Di luar RKAS' : 'Uraian tidak ada' }}</span>
          <div class="min-w-0 flex-1"><p class="font-semibold">{{ x.uraian }}</p><p class="kode truncate text-xs text-slate-500">{{ x.kode_kegiatan }} · {{ x.kode_rekening }} · {{ [...x.transaksi].join('; ') }}</p>
            <p class="text-xs text-slate-500">{{ x.bulan.map((v, i) => (v ? `${NAMA_BULAN[i].slice(0, 3)} ${rupiah(v)}` : '')).filter(Boolean).join(' · ') }}</p></div>
          <b class="angka">{{ rupiah(x.jumlah) }}</b>
          <button v-if="auth.isAdmin" class="tombol-utama" @click="masukkanLuar(x)"><Ikon nama="Plus" :ukuran="15" /> Masukkan ke draf</button>
        </div>
        <div v-for="x in lewat" :key="x.u.id" class="flex flex-wrap items-center gap-3 rounded-xl bg-rose-50/70 p-3 text-sm dark:bg-rose-950/30">
          <span class="lencana bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100">{{ x.lebih > 0 ? 'Melebihi pagu' : 'Melebihi rencana bulan' }}</span>
          <div class="min-w-0 flex-1"><p class="font-semibold">{{ x.u.uraian }}</p><p class="text-xs text-slate-500">Anggaran {{ rupiah(x.u.jumlah) }} · dibelanjakan {{ rupiah(x.komitmen) }}</p></div>
          <b class="angka text-rose-600">+{{ rupiah(Math.max(x.lebih, x.bulanLebih)) }}</b>
          <button v-if="auth.isAdmin" class="tombol-garis" @click="detail = { uraian: x.u, dibelanjakan: pakaiUraian(x.u) }"><Ikon nama="Pencil" :ukuran="15" /> Sesuaikan</button>
        </div>
      </section>

      <!-- Tabel per bulan -->
      <div class="kartu space-y-3 p-3">
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="saringKat" class="masukan w-auto" aria-label="Jenis belanja"><option value="semua">Semua Jenis Belanja</option><option v-for="(k, kk) in KATEGORI" :key="kk" :value="kk">{{ k.nama }}</option></select>
          <div class="relative min-w-[12rem] flex-1"><Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari uraian, kegiatan, rekening…" aria-label="Cari" /></div>
        </div>
        <div class="flex gap-1 overflow-x-auto border-b border-slate-200 tanpa-penggulir dark:border-slate-700" role="tablist">
          <button v-for="(n, i) in ['Semua', ...NAMA_BULAN]" :key="n" role="tab" :aria-selected="bulanAktif === i - 1" @click="bulanAktif = i - 1"
                  :class="['shrink-0 border-b-2 px-3 py-2 text-sm font-semibold', bulanAktif === i - 1 ? 'border-biru text-biru dark:text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-700']">{{ n }}</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-sm">
            <thead><tr class="text-left text-xs font-semibold text-slate-500"><th class="p-2">No</th><th class="p-2">Kegiatan</th><th class="p-2">Rekening Belanja</th><th class="p-2">Uraian</th><th class="p-2 text-right">Jumlah</th><th class="p-2">Satuan</th><th class="p-2 text-right">Harga Satuan</th><th class="p-2 text-right">Total</th><th class="p-2 text-center">Aksi</th></tr></thead>
            <tbody>
              <tr v-for="(u, i) in baris" :key="u.id" class="border-t border-slate-100 dark:border-slate-800">
                <td class="p-2 text-slate-500">{{ i + 1 }}</td>
                <td class="max-w-[13rem] p-2" style="background: rgb(219 234 254 / .5)"><p class="truncate">{{ rkas.nama.kegiatan(u.kode_kegiatan) || u.kode_kegiatan }}</p><p class="kode text-[11px] text-slate-500">{{ u.kode_kegiatan }}</p></td>
                <td class="max-w-[12rem] p-2" style="background: rgb(220 252 231 / .5)"><p class="truncate">{{ rkas.nama.rekening(u.kode_rekening) || u.kode_rekening }}</p><p class="kode text-[11px] text-slate-500">{{ u.kode_rekening }}</p></td>
                <td class="max-w-[14rem] p-2" style="background: rgb(254 249 195 / .45)"><p class="truncate">{{ u.uraian }}</p>
                  <span v-if="status(u) === 'baru'" class="lencana bg-emerald-100 text-emerald-700">Baru</span><span v-else-if="status(u) === 'ubah'" class="lencana bg-amber-100 text-amber-800">Diubah</span></td>
                <td class="angka p-2 text-right">{{ volBln(u).toLocaleString('id-ID') }}</td>
                <td class="p-2 text-slate-600 dark:text-slate-300">{{ u.satuan }}</td>
                <td class="angka p-2 text-right">{{ rupiah(u.harga) }}</td>
                <td class="angka p-2 text-right font-semibold">{{ rupiah(nilaiBln(u)) }}</td>
                <td class="p-2 text-center"><button class="tombol-garis px-2.5 py-1.5" :aria-label="`Edit ${u.uraian}`" @click="detail = { uraian: u, dibelanjakan: pakaiUraian(u) }"><Ikon :nama="auth.isAdmin ? 'Pencil' : 'Eye'" :ukuran="15" /></button></td>
              </tr>
              <tr v-if="!baris.length"><td colspan="9" class="p-6 text-center text-slate-500">Tidak ada uraian.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ringkasan untuk ARKAS -->
      <section class="kartu space-y-2 p-4">
        <h3 class="flex items-center gap-2 font-bold"><Ikon nama="ClipboardCheck" :ukuran="18" class="text-[#22A08D]" /> Yang perlu diinput di ARKAS <span class="lencana bg-slate-100 text-slate-600 dark:bg-slate-800">{{ beda.length }}</span></h3>
        <p v-if="!beda.length" class="text-sm text-slate-500">Belum ada perubahan dari {{ draf.nama_sumber }}.</p>
        <div v-for="(x, i) in beda" :key="i" class="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
          <div class="flex flex-wrap items-center gap-2">
            <span :class="['lencana', x.jenis === 'baru' ? 'bg-emerald-100 text-emerald-700' : x.jenis === 'hapus' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800']">{{ x.jenis === 'baru' ? 'Tambah uraian' : x.jenis === 'hapus' ? 'Hapus/nolkan' : 'Edit detail' }}</span>
            <b class="min-w-0 flex-1">{{ x.u.uraian }}</b>
            <span class="angka">{{ rupiah(x.lama?.jumlah || 0) }} → <b>{{ rupiah(x.jenis === 'hapus' ? 0 : x.u.jumlah) }}</b></span>
          </div>
          <p class="kode mt-0.5 text-xs text-slate-500">{{ x.u.kode_kegiatan }} · {{ x.u.kode_rekening }} · harga {{ rupiah(x.u.harga) }}/{{ x.u.satuan }}</p>
          <p v-if="x.jenis !== 'hapus'" class="mt-1 text-xs">{{ bulanBeda(x.jenis === 'baru' ? null : x.lama, x.u).map((b) => `${b.n}: ${rupiah(b.lama, { tanpaRp: true })} → ${rupiah(b.baru, { tanpaRp: true })}`).join(' · ') }}</p>
        </div>
      </section>
    </template>

    <DetailAnggaran v-if="detail" :uraian="detail.uraian" :usulan="detail.usulan" :dibelanjakan="detail.dibelanjakan" :boleh-ubah="!!draf && auth.isAdmin" :menyimpan="menyimpan"
                    @tutup="detail = null" @simpan="simpanDetail" @hapus="hapusDetail" />
  </div>
</template>
