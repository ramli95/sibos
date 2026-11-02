<script setup>
// Impor Daftar Gaji resmi (PDF dari aplikasi gaji) sebagai pembanding & data awal.
// Cara baca: setiap NIP 18 digit menjadi patokan satu pegawai; angka rupiah sesudahnya (sampai NIP berikutnya)
// dicocokkan dengan komponen hitungan SIBOS. Gaji pokok dikenali dari tabel gaji (sekaligus menebak MKG).
// Gaji pokok & gaji bersih resmi bisa dikoreksi manual sebelum disimpan.
import InputAngka from '@/components/InputAngka.vue'
import { ref, computed } from 'vue'
import { useGaji, namaLengkap } from '@/stores/gaji'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanResmi, hapusResmi, simpanDasarMassal } from '@/services/gaji'
import { hitungGaji } from '@/utils/gaji'
import { gajiPokokTabel } from '@/config/tabelGaji'
import { KOMPONEN_SEMUA } from '@/config/gaji'
import { bacaTeksPdf } from '@/utils/bacaPdf'
import { rupiah, NAMA_BULAN } from '@/utils/format'
import { formatNip, hanyaAngka } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'

const gaji = useGaji()
const notif = useNotifikasi()
const masukan = ref(null)
const membaca = ref('')
const hasil = ref(null) // { berkas, periode, baris: [...], tanpaPegawai: [...] }
const menyimpan = ref(false)
const judulKomp = Object.fromEntries(KOMPONEN_SEMUA.map((k) => [k.kunci, k.singkat]))

const RE_NIP = /(?<!\d)(\d{8})\s?(\d{6})\s?(\d)\s?(\d{3})(?!\d)/g
const RE_ANGKA = /(?<![\d.,])\d{1,3}(?:[.,]\d{3})+(?![\d])|(?<![\d.,])\d{4,9}(?![\d.,])/g
const keAngka = (s) => Number(String(s).replace(/[.,]/g, ''))

function tebakPeriode(teks) {
  const m = teks.match(/bulan\s+([a-z]+)\s+(\d{4})/i) || teks.match(/(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i)
  if (!m) return gaji.periode
  const i = NAMA_BULAN.findIndex((b) => b.toLowerCase() === m[1].toLowerCase())
  return i >= 0 ? `${m[2]}-${String(i + 1).padStart(2, '0')}` : gaji.periode
}

async function pilih(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  membaca.value = 'Membaca PDF…'
  try {
    const { halaman } = await bacaTeksPdf(file, { kemajuan: (i, n) => (membaca.value = `Membaca halaman ${i} dari ${n}…`) })
    const teks = halaman.join('\n')
    const temuan = [...teks.matchAll(RE_NIP)].map((m) => ({ nip: m.slice(1, 5).join(''), i: m.index, akhir: m.index + m[0].length }))
    if (!temuan.length) throw new Error('Tidak ada NIP 18 digit di PDF ini. Pastikan PDF berisi teks (bukan hasil pindai/foto).')
    const baris = []
    const tanpaPegawai = []
    const sudah = new Set()
    temuan.forEach((t, k) => {
      if (sudah.has(t.nip)) return
      sudah.add(t.nip)
      const segmen = teks.slice(t.akhir, temuan[k + 1]?.i ?? teks.length)
      const angka = [...segmen.matchAll(RE_ANGKA)].map((m) => keAngka(m[0])).filter((n) => n >= 1000 && n < 100_000_000)
      const p = gaji.pegawaiAsn.find((x) => hanyaAngka(x.nip) === t.nip)
      if (!p) { tanpaPegawai.push({ nip: t.nip, contoh: segmen.slice(0, 60).replace(/\s+/g, ' ') }); return }
      const g = gaji.dasarDari(p)
      const h = hitungGaji(g, gaji.aturan)
      const ada = new Set(angka)
      // Gaji pokok: angka pertama yang ada di tabel golongan pegawai ini (sekaligus menebak MKG)
      let gp = null, mkg = null
      for (const n of angka) {
        for (let m = 0; m <= 33; m++) { const tb = gajiPokokTabel(p.status_kepegawaian, p.golongan, m); if (tb?.gaji_pokok === n) { gp = n; mkg = tb.mkg_tabel; break } }
        if (gp) break
      }
      const resmi = {}
      Object.keys(h).filter((k2) => typeof h[k2] === 'number' && h[k2] > 0 && k2 in judulKomp).forEach((k2) => { if (ada.has(h[k2])) resmi[k2] = h[k2] })
      if (gp) resmi.gaji_pokok = gp
      baris.push({ p, g, h, angka, resmi, gp, mkg, bersih: resmi.bersih ?? '', pakaiDasar: !!gp && gp !== g.gaji_pokok })
    })
    hasil.value = { berkas: file.name, periode: tebakPeriode(teks), baris, tanpaPegawai }
  } catch (err) { notif.kabari(err.message, 'galat') } finally { membaca.value = '' }
}

const belumAda = computed(() => hasil.value ? gaji.pegawaiAsn.filter((p) => !hasil.value.baris.some((b) => b.p.id === p.id)) : [])
async function simpan() {
  menyimpan.value = true
  try {
    const resmi = {}
    hasil.value.baris.forEach((b) => {
      const r = { ...b.resmi, nip: b.p.nip, nama: b.p.nama }
      if (b.bersih !== '' && b.bersih != null) r.bersih = Number(b.bersih)
      resmi[b.p.id] = r
    })
    await simpanResmi(hasil.value.periode, resmi, { nama: hasil.value.berkas })
    const awal = hasil.value.baris.filter((b) => b.pakaiDasar && b.gp).map((b) => ({ id_pegawai: b.p.id, data: { gaji_pokok: b.gp, mkg: b.mkg } }))
    if (awal.length) await simpanDasarMassal(awal, `Daftar Gaji resmi ${hasil.value.periode}`)
    notif.kabari(`Daftar Gaji resmi ${hasil.value.periode} tersimpan${awal.length ? `; ${awal.length} gaji pokok diperbarui` : ''}.`)
    hasil.value = null
    await gaji.segarkan()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus() {
  if (!confirm(`Hapus Daftar Gaji resmi ${gaji.periode}?`)) return
  try { await hapusResmi(gaji.periode); await gaji.muatUlangBulan() } catch (e) { notif.kabari(e.message, 'galat') }
}
const resmiBulanIni = computed(() => Object.keys(gaji.bulan?.resmi || {}).length)
</script>

<template>
  <div class="space-y-5">
    <section class="kartu space-y-4 p-5" data-tur="gaji-impor">
      <div class="flex flex-wrap items-center gap-3">
        <span class="grid h-11 w-11 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="FileUp" :ukuran="20" /></span>
        <div class="min-w-0 flex-1">
          <h3 class="font-bold">Impor Daftar Gaji resmi (PDF)</h3>
          <p class="text-xs text-slate-500">PDF dari aplikasi gaji: NIP dicocokkan ke Data Pegawai, angkanya dibandingkan dengan hitungan SIBOS.</p>
        </div>
        <input ref="masukan" type="file" accept="application/pdf,.pdf" class="hidden" @change="pilih" />
        <button class="tombol-utama" :disabled="!!membaca" @click="masukan.click()"><Ikon :nama="membaca ? 'RefreshCw' : 'Upload'" :ukuran="17" :class="membaca && 'animate-spin'" /> {{ membaca || 'Pilih PDF' }}</button>
      </div>
      <div v-if="resmiBulanIni" class="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Ikon nama="FileCheck" :ukuran="16" /> Bulan {{ gaji.periode }} sudah ada daftar resmi ({{ resmiBulanIni }} pegawai) dari "{{ gaji.bulan?.berkas?.nama }}".
        <button class="ml-auto text-xs font-semibold text-rose-600 hover:underline" @click="hapus">Hapus</button>
      </div>
      <ul class="grid gap-2 text-xs text-slate-600 sm:grid-cols-3 dark:text-slate-300">
        <li class="flex gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><Ikon nama="Hash" :ukuran="15" class="text-biru" /> Setiap NIP 18 digit menjadi patokan satu pegawai.</li>
        <li class="flex gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><Ikon nama="Table2" :ukuran="15" class="text-[#22A08D]" /> Gaji pokok dikenali dari tabel gaji, sekaligus menebak MKG.</li>
        <li class="flex gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><Ikon nama="Pencil" :ukuran="15" class="text-[#E3A414]" /> Gaji bersih resmi bisa diisi/dikoreksi sebelum disimpan.</li>
      </ul>
    </section>

    <section v-if="hasil" class="space-y-3">
      <div class="kartu flex flex-wrap items-center gap-3 p-3">
        <Ikon nama="FileCheck" :ukuran="18" class="text-emerald-600" />
        <p class="min-w-0 flex-1 text-sm"><b>{{ hasil.baris.length }}</b> pegawai dikenali dari <span class="truncate">"{{ hasil.berkas }}"</span></p>
        <label class="flex items-center gap-2 text-sm" for="im-per">Bulan <input id="im-per" v-model="hasil.periode" type="month" class="masukan w-auto" /></label>
      </div>
      <div class="kartu overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60">
            <tr><th class="p-3">Pegawai</th><th class="p-3 text-right">GP resmi</th><th class="p-3">Komponen cocok</th><th class="p-3 text-right">Bersih SIBOS</th><th class="p-3">Bersih resmi</th><th class="p-3">Data awal</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="b in hasil.baris" :key="b.p.id">
              <td class="p-3"><p class="font-semibold">{{ namaLengkap(b.p) }}</p><p class="kode text-xs text-slate-500">{{ formatNip(b.p.nip) }} · {{ b.p.golongan }}</p></td>
              <td class="angka p-3 text-right">{{ b.gp ? rupiah(b.gp, { tanpaRp: true }) : '—' }}<p v-if="b.mkg != null" class="text-[11px] text-slate-500">MKG {{ b.mkg }}</p></td>
              <td class="p-3"><div class="flex flex-wrap gap-1"><span v-for="k in Object.keys(b.resmi)" :key="k" class="lencana bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{{ judulKomp[k] || k }}</span><span v-if="!Object.keys(b.resmi).length" class="text-xs text-slate-400">tidak ada</span></div></td>
              <td class="angka p-3 text-right">{{ rupiah(b.h.bersih, { tanpaRp: true }) }}</td>
              <td class="p-3"><InputAngka v-model="b.bersih" class="masukan angka w-32 py-1.5 text-sm" :aria-label="`Gaji bersih resmi ${b.p.nama}`" /></td>
              <td class="p-3"><label v-if="b.gp && b.gp !== b.g.gaji_pokok" class="flex items-center gap-1.5 text-xs"><input v-model="b.pakaiDasar" type="checkbox" class="h-4 w-4 accent-[#22A08D]" /> Pakai GP & MKG ini</label><span v-else-if="b.gp" class="text-xs text-emerald-600">Sudah sama</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="hasil.tanpaPegawai.length || belumAda.length" class="kartu space-y-1 p-4 text-xs text-amber-700 dark:text-amber-300">
        <p v-if="hasil.tanpaPegawai.length"><Ikon nama="TriangleAlert" :ukuran="14" class="inline" /> NIP di PDF yang tidak ada di Data Pegawai: {{ hasil.tanpaPegawai.map((x) => formatNip(x.nip)).join(', ') }}</p>
        <p v-if="belumAda.length"><Ikon nama="CircleHelp" :ukuran="14" class="inline" /> Pegawai ASN yang tidak ada di PDF: {{ belumAda.map((p) => p.nama).join(', ') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="tombol-utama" :disabled="menyimpan || !hasil.baris.length" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan sebagai Daftar Gaji resmi {{ hasil.periode }}</button>
        <button class="tombol-garis" @click="hasil = null">Batal</button>
      </div>
    </section>
  </div>
</template>
