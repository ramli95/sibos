<script setup>
// Dasar Gaji Pegawai: MKG, gaji pokok (tabel PP 5/2024 & Perpres 11/2024), tunjangan & potongan tetap.
// Bisa diisi satu per satu atau diimpor dari sheet "dB-SKPG" (Jurnal Dana BOS).
import { ref, reactive, computed } from 'vue'
import { useGaji, namaLengkap } from '@/stores/gaji'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanDasar, simpanDasarMassal, simpanAturanGaji, KOLOM_DASAR } from '@/services/gaji'
import { hitungGaji } from '@/utils/gaji'
import { gajiPokokTabel } from '@/config/tabelGaji'
import { ATURAN_GAJI_AWAL } from '@/config/gaji'
import { bacaBerkas } from '@/utils/excel'
import { hanyaAngka, formatNip, normalTanggal, normalGolongan } from '@/utils/validasi'
import { rupiah } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'

const gaji = useGaji()
const notif = useNotifikasi()
const cari = ref('')

const daftar = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return gaji.pegawaiAsn.filter((p) => !q || [p.nama, p.nip, p.golongan].some((v) => String(v || '').toLowerCase().includes(q)))
    .map((p) => ({ p, g: gaji.dasarDari(p) }))
})
const belum = computed(() => daftar.value.filter((x) => !x.g.gaji_pokok).length)

/* ---------- Formulir ---------- */
const form = ref(null)
const f = reactive({})
const menyimpan = ref(false)
function bukaForm(x) {
  const d = gaji.dasar[x.p.id] || {}
  Object.keys(f).forEach((k) => delete f[k])
  Object.assign(f, Object.fromEntries(KOLOM_DASAR.map((k) => [k, d[k] ?? ''])))
  // nilai bawaan ditampilkan sebagai isian awal agar mudah diperiksa
  ;['tunj_pasangan', 'anak_tunjangan', 'jiwa_beras', 'tj_fungsional', 'tarif_pph_tpg'].forEach((k) => { if (f[k] === '' || f[k] == null) f[k] = x.g[k] })
  form.value = x
}
const tabel = computed(() => form.value && f.mkg !== '' ? gajiPokokTabel(form.value.p.status_kepegawaian, form.value.p.golongan, f.mkg) : null)
const pratinjau = computed(() => form.value ? hitungGaji({ ...form.value.g, ...normal(f), gaji_pokok: Number(f.gaji_pokok) || tabel.value?.gaji_pokok || 0 }, gaji.aturan) : null)
function normal(x) {
  const n = (v) => (v === '' || v == null ? null : Number(v))
  return { ...x, mkg: n(x.mkg), mkg_bulan: n(x.mkg_bulan) ?? 0, gaji_pokok: n(x.gaji_pokok), anak_tunjangan: n(x.anak_tunjangan), jiwa_beras: n(x.jiwa_beras),
    tj_fungsional: n(x.tj_fungsional), tj_pph: n(x.tj_pph), taperum: n(x.taperum), potongan_lain: n(x.potongan_lain), tj_kinerja: n(x.tj_kinerja), tarif_pph_tpg: n(x.tarif_pph_tpg), tunj_pasangan: !!x.tunj_pasangan }
}
async function simpan() {
  menyimpan.value = true
  try {
    const data = normal(f)
    if (data.gaji_pokok == null && tabel.value) data.gaji_pokok = tabel.value.gaji_pokok
    await simpanDasar(form.value.p.id, data, form.value.p.nama)
    await gaji.segarkan(); notif.kabari('Dasar gaji tersimpan.'); form.value = null
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

/* ---------- Impor dB-SKPG ---------- */
const impor = ref(null) // { berkas, baris: [{ p, data, nama, nip, cocok }] }
const masukan = ref(null)
const angka = (v) => { const n = Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null }
async function pilihBerkas(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const lembar = await bacaBerkas(file, { tersembunyi: true })
    let hasil = null
    for (const l of lembar) {
      const iJudul = l.baris.findIndex((r) => r.some((c) => /^nip$/i.test(String(c || '').trim())) && r.some((c) => /gaji\s*pokok/i.test(String(c || ''))))
      if (iJudul < 0) continue
      const kepala = l.baris[iJudul].map((c) => String(c || '').trim().toLowerCase())
      const kol = (re) => kepala.findIndex((c) => re.test(c))
      const k = { nip: kol(/^nip$/), nama: kol(/nama/), gol: kol(/^gol/), tmt: kol(/^tmt/), mkg: kol(/^mkg|masa kerja/), kawin: kol(/kawin/), anak: kol(/^anak/), jiwa: kol(/^jiwa/), gp: kol(/gaji\s*pokok/), tf: kol(/fungsional|tun\.?\s*f/) }
      hasil = l.baris.slice(iJudul + 1).filter((r) => hanyaAngka(r[k.nip]).length === 18).map((r) => {
        const nip = hanyaAngka(r[k.nip])
        const p = gaji.pegawaiAsn.find((x) => hanyaAngka(x.nip) === nip)
        const data = {
          mkg: parseInt(String(r[k.mkg] ?? '')) || 0,
          gaji_pokok: angka(r[k.gp]),
          tj_fungsional: k.tf >= 0 ? angka(r[k.tf]) : null,
          tunj_pasangan: k.kawin >= 0 ? /^k$/i.test(String(r[k.kawin] || '').trim()) : null,
          anak_tunjangan: k.anak >= 0 ? Math.min(2, Number(r[k.anak]) || 0) : null,
          jiwa_beras: k.jiwa >= 0 ? Number(r[k.jiwa]) || null : null,
          ...(k.tmt >= 0 && normalTanggal(r[k.tmt]) ? { tmt_tugas: normalTanggal(r[k.tmt]) } : {}),
        }
        const gol = normalGolongan(String(r[k.gol] || '').replace('.', '/'))
        const tab = p ? gajiPokokTabel(p.status_kepegawaian, p.golongan, data.mkg) : null
        // MKG di sheet bisa belum diperbarui: cari MKG yang gaji pokoknya sama dengan angka sheet
        let saran = null
        if (p && tab && data.gaji_pokok && tab.gaji_pokok !== data.gaji_pokok) {
          for (let m = 0; m <= 33; m++) { const t = gajiPokokTabel(p.status_kepegawaian, p.golongan, m); if (t?.gaji_pokok === data.gaji_pokok) { saran = t.mkg_tabel; break } }
          if (saran != null) data.mkg = saran
        }
        return { p, data, nama: String(r[k.nama] || ''), nip, gol, golBeda: p && gol && gol !== p.golongan, saran }
      })
      if (hasil.length) break
    }
    if (!hasil?.length) throw new Error('Kolom NIP dan Gaji Pokok tidak ditemukan. Gunakan sheet dB-SKPG (unduh Jurnal Dana BOS sebagai .xlsx).')
    impor.value = { berkas: file.name, baris: hasil }
  } catch (err) { notif.kabari(err.message, 'galat') }
}
const siapImpor = computed(() => impor.value?.baris.filter((x) => x.p) || [])
async function jalankanImpor() {
  menyimpan.value = true
  try {
    await simpanDasarMassal(siapImpor.value.map((x) => ({ id_pegawai: x.p.id, data: Object.fromEntries(Object.entries(x.data).filter(([, v]) => v !== null)) })), `"${impor.value.berkas}"`)
    notif.kabari(`${siapImpor.value.length} dasar gaji diimpor.`); impor.value = null; await gaji.segarkan()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

/* ---------- Aturan ---------- */
const aturanBuka = ref(false)
const at = reactive({})
function bukaAturan() { Object.assign(at, { ...ATURAN_GAJI_AWAL, ...gaji.aturan }); aturanBuka.value = true }
async function simpanAturan() {
  try { await simpanAturanGaji(Object.fromEntries(Object.entries(at).map(([k, v]) => [k, Number(v)]))); await gaji.segarkan(); aturanBuka.value = false; notif.kabari('Aturan gaji tersimpan.') } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-3" data-tur="gaji-dasar-alat">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="Calculator" :ukuran="19" /></span>
      <div class="min-w-0 flex-1"><p class="font-bold">{{ daftar.length }} pegawai ASN</p><p class="text-xs text-slate-500">{{ belum ? `${belum} belum ada gaji pokok/MKG` : 'Semua dasar gaji lengkap' }} · beras Rp{{ rupiah(gaji.aturan.harga_beras, { tanpaRp: true }) }}/kg</p></div>
      <input ref="masukan" type="file" accept=".xlsx,.csv" class="hidden" @change="pilihBerkas" />
      <button class="tombol-garis" @click="masukan.click()"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /> Impor dB-SKPG</button>
      <button class="tombol-garis" @click="bukaAturan"><Ikon nama="Percent" :ukuran="16" class="text-biru" /> Aturan</button>
    </div>
    <div class="kartu relative p-3">
      <Ikon nama="Search" :ukuran="16" class="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
      <input v-model="cari" class="masukan pl-9" placeholder="Cari nama, NIP, golongan…" aria-label="Cari pegawai" />
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <button v-for="x in daftar" :key="x.p.id" class="kartu flex items-start gap-3 p-4 text-left transition hover:shadow-md" @click="bukaForm(x)">
        <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold', x.p.status_kepegawaian === 'PNS' ? 'ikon-chip' : 'ikon-chip-tosca']">{{ x.p.golongan || '?' }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold">{{ namaLengkap(x.p) }}</p>
          <p class="kode truncate text-xs text-slate-500">{{ formatNip(x.p.nip) }}</p>
          <p class="mt-1 flex flex-wrap gap-x-3 text-xs">
            <span>MKG <b>{{ x.g.mkg === '' ? '—' : x.g.mkg + ' th' }}</b></span>
            <span>GP <b class="angka">{{ x.g.gaji_pokok ? rupiah(x.g.gaji_pokok) : '—' }}</b></span>
            <span>{{ x.g.tunj_pasangan ? 'K' : 'TK' }}/{{ x.g.anak_tunjangan }} · {{ x.g.jiwa_beras }} jiwa</span>
          </p>
          <p v-if="x.g.gaji_pokok_tabel && x.g.gaji_pokok && x.g.gaji_pokok !== x.g.gaji_pokok_tabel" class="mt-1 text-[11px] text-amber-600"><Ikon nama="TriangleAlert" :ukuran="12" class="inline" /> Beda dengan tabel ({{ rupiah(x.g.gaji_pokok_tabel) }})</p>
        </div>
        <Ikon :nama="x.g.gaji_pokok ? 'CircleCheck' : 'CircleHelp'" :ukuran="18" :class="x.g.gaji_pokok ? 'text-emerald-500' : 'text-slate-300'" />
      </button>
    </div>
    <p v-if="!daftar.length" class="kartu p-8 text-center text-sm text-slate-500">Belum ada pegawai PNS/PPPK aktif di Data Pegawai.</p>

    <!-- Formulir dasar gaji -->
    <Laci v-if="form" judul="Dasar gaji" :subjudul="`${namaLengkap(form.p)} · ${form.p.status_kepegawaian} ${form.p.golongan}`" ikon="Calculator" @tutup="form = null">
      <div class="space-y-4 p-5">
        <p v-if="!form.p.golongan" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"><Ikon nama="TriangleAlert" :ukuran="15" class="inline" /> Golongan belum diisi di Data Pegawai — gaji pokok tidak bisa diambil dari tabel.</p>
        <div class="grid gap-3 sm:grid-cols-3">
          <div><label class="label" for="dg-mkg">MKG (tahun)</label><input id="dg-mkg" v-model="f.mkg" type="number" min="0" max="40" class="masukan angka" /></div>
          <div class="sm:col-span-2">
            <label class="label" for="dg-gp">Gaji pokok <span class="font-normal text-slate-400">(kosong = ikut tabel)</span></label>
            <input id="dg-gp" v-model="f.gaji_pokok" type="number" min="0" class="masukan angka" :placeholder="tabel ? String(tabel.gaji_pokok) : ''" />
            <p v-if="tabel" class="mt-1 text-xs" :class="f.gaji_pokok && Number(f.gaji_pokok) !== tabel.gaji_pokok ? 'text-amber-600' : 'text-emerald-600'">Tabel {{ form.p.status_kepegawaian === 'PNS' ? 'PP 5/2024' : 'Perpres 11/2024' }} MKG {{ tabel.mkg_tabel }}: {{ rupiah(tabel.gaji_pokok) }}</p>
          </div>
        </div>
        <fieldset class="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-3 dark:border-slate-700">
          <legend class="px-1 text-xs font-semibold text-slate-500">Tunjangan keluarga & beras</legend>
          <label class="flex cursor-pointer items-center gap-2 text-sm sm:col-span-3"><input v-model="f.tunj_pasangan" type="checkbox" class="h-4 w-4 accent-[#1A56DB]" /> Mendapat tunjangan istri/suami (10%)</label>
          <div><label class="label" for="dg-an">Anak ditunjang (maks. 2)</label><input id="dg-an" v-model="f.anak_tunjangan" type="number" min="0" max="2" class="masukan angka" /></div>
          <div><label class="label" for="dg-jw">Jiwa (beras)</label><input id="dg-jw" v-model="f.jiwa_beras" type="number" min="1" class="masukan angka" /></div>
          <div><label class="label" for="dg-tf">Tunj. fungsional/umum</label><input id="dg-tf" v-model="f.tj_fungsional" type="number" min="0" class="masukan angka" /></div>
        </fieldset>
        <fieldset class="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-3 dark:border-slate-700">
          <legend class="px-1 text-xs font-semibold text-slate-500">Pajak & potongan tetap</legend>
          <div><label class="label" for="dg-pph">Tunj. khusus pajak (PPh 21)</label><input id="dg-pph" v-model="f.tj_pph" type="number" min="0" class="masukan angka" /></div>
          <div><label class="label" for="dg-tp">Taperum</label><input id="dg-tp" v-model="f.taperum" type="number" min="0" class="masukan angka" /></div>
          <div><label class="label" for="dg-pl">Potongan lain</label><input id="dg-pl" v-model="f.potongan_lain" type="number" min="0" class="masukan angka" /></div>
          <div class="sm:col-span-3"><label class="label" for="dg-kpl">Keterangan potongan lain</label><input id="dg-kpl" v-model="f.ket_potongan_lain" class="masukan" placeholder="mis. Korpri, Askes tambahan" /></div>
        </fieldset>
        <fieldset class="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-3 dark:border-slate-700">
          <legend class="px-1 text-xs font-semibold text-slate-500">Untuk SKPG</legend>
          <div><label class="label" for="dg-tmt">TMT tugas di sekolah</label><input id="dg-tmt" v-model="f.tmt_tugas" type="date" class="masukan" /></div>
          <div><label class="label" for="dg-tk">Tunj. kinerja</label><input id="dg-tk" v-model="f.tj_kinerja" type="number" min="0" class="masukan angka" /></div>
          <div><label class="label" for="dg-tpg">PPh TPG (%)</label><input id="dg-tpg" v-model="f.tarif_pph_tpg" type="number" min="0" max="15" step="0.5" class="masukan angka" :disabled="!form.p.terima_tpg" /></div>
          <p class="text-xs text-slate-500 sm:col-span-3">{{ form.p.terima_tpg ? 'Penerima TPG: tunjangan profesi = gaji pokok − PPh (gol. III 5%, gol. IV 15%).' : 'Tidak menerima TPG (ubah di Data Pegawai).' }}</p>
        </fieldset>

        <div v-if="pratinjau" class="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-sm dark:from-emerald-950/40 dark:to-teal-950/30">
          <p class="mb-2 flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300"><Ikon nama="Sigma" :ukuran="16" /> Perkiraan per bulan</p>
          <div class="grid grid-cols-2 gap-x-6 gap-y-1">
            <span>Gaji kotor</span><b class="angka text-right">{{ rupiah(pratinjau.kotor) }}</b>
            <span>Potongan</span><b class="angka text-right text-rose-600">{{ rupiah(pratinjau.potongan) }}</b>
            <span>Gaji bersih</span><b class="angka text-right text-emerald-700 dark:text-emerald-300">{{ rupiah(pratinjau.bersih) }}</b>
            <span>+ Tunj. profesi</span><b class="angka text-right">{{ rupiah(pratinjau.tj_profesi) }}</b>
          </div>
        </div>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
        <button class="tombol-garis" @click="form = null">Batal</button>
      </template>
    </Laci>

    <!-- Pratinjau impor -->
    <Laci v-if="impor" judul="Impor dasar gaji" :subjudul="impor.berkas" ikon="FileSpreadsheet" lebar="max-w-3xl" @tutup="impor = null">
      <div class="space-y-3 p-5">
        <p class="text-sm text-slate-600 dark:text-slate-300">{{ siapImpor.length }} dari {{ impor.baris.length }} baris cocok dengan Data Pegawai (berdasarkan NIP). Yang diimpor: MKG, gaji pokok, tunjangan fungsional, status kawin, anak, jiwa, dan TMT.</p>
        <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
          <li v-for="x in impor.baris" :key="x.nip" class="flex items-start gap-3 p-3">
            <Ikon :nama="x.p ? 'CircleCheck' : 'CircleX'" :ukuran="17" :class="x.p ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-rose-500'" />
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ x.p ? namaLengkap(x.p) : x.nama }}</p>
              <p class="kode text-xs text-slate-500">{{ formatNip(x.nip) }} · {{ x.gol }} · MKG {{ x.data.mkg }} · GP {{ rupiah(x.data.gaji_pokok) }}</p>
              <p v-if="!x.p" class="text-xs text-rose-600">NIP tidak ada di Data Pegawai (atau bukan PNS/PPPK aktif)</p>
              <p v-if="x.saran != null" class="text-xs text-amber-600">MKG di sheet belum sesuai gaji pokok — dipakai MKG {{ x.saran }} menurut tabel</p>
              <p v-if="x.golBeda" class="text-xs text-amber-600">Golongan sheet {{ x.gol }} ≠ Data Pegawai {{ x.p.golongan }}</p>
            </div>
          </li>
        </ul>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="!siapImpor.length || menyimpan" @click="jalankanImpor"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Download'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Impor {{ siapImpor.length }} pegawai</button>
        <button class="tombol-garis" @click="impor = null">Batal</button>
      </template>
    </Laci>

    <!-- Aturan -->
    <Laci v-if="aturanBuka" judul="Aturan perhitungan gaji" subjudul="Berlaku untuk semua pegawai" ikon="Percent" lebar="max-w-xl" @tutup="aturanBuka = false">
      <div class="grid gap-3 p-5 sm:grid-cols-2">
        <div><label class="label" for="at-br">Harga beras per kg</label><input id="at-br" v-model="at.harga_beras" type="number" class="masukan angka" /></div>
        <div><label class="label" for="at-kg">Kg per jiwa</label><input id="at-kg" v-model="at.kg_per_jiwa" type="number" class="masukan angka" /></div>
        <div><label class="label" for="at-is">Tunj. istri/suami (%)</label><input id="at-is" v-model="at.istri" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-ak">Tunj. anak per anak (%)</label><input id="at-ak" v-model="at.anak" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-bp">BPJS pemberi kerja (%)</label><input id="at-bp" v-model="at.bpjs" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-i1">IWP (%)</label><input id="at-i1" v-model="at.iwp1" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-i8">IWP PNS (%)</label><input id="at-i8" v-model="at.iwp8" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-jh">JHT PPPK (%)</label><input id="at-jh" v-model="at.jht_pppk" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-jk">JKK (%)</label><input id="at-jk" v-model="at.jkk" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-jm">JKM (%)</label><input id="at-jm" v-model="at.jkm" type="number" step="0.01" class="masukan angka" /></div>
        <div><label class="label" for="at-bl">Pembulatan ke atas (Rp)</label><input id="at-bl" v-model="at.bulat" type="number" class="masukan angka" /></div>
      </div>
      <template #kaki>
        <button class="tombol-utama" @click="simpanAturan"><Ikon nama="Save" :ukuran="17" /> Simpan</button>
        <button class="tombol-garis" @click="aturanBuka = false">Batal</button>
      </template>
    </Laci>
  </div>
</template>
