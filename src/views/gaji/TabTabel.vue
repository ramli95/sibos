<script setup>
// Tabel gaji pokok PNS & PPPK. Bawaan: PP 5/2024 dan Perpres 11/2024.
// Bendahara bisa mengubahnya (sel per sel, naik sekian persen, atau lewat Excel) bila terbit peraturan gaji baru;
// perhitungan Daftar Gaji, Dasar Gaji, dan KGB langsung memakai tabel yang disimpan.
import { ref, reactive, computed } from 'vue'
import { tabelAktif, keBaris, dariBaris, gajiPokokTabel, GAJI_PNS, GAJI_PPPK, DASAR_BAWAAN } from '@/config/tabelGaji'
import { simpanTabelGaji, simpanDasarMassal } from '@/services/gaji'
import { useGaji } from '@/stores/gaji'
import { useNotifikasi } from '@/stores/notifikasi'
import { eksporExcel, bacaBerkas } from '@/utils/excel'
import { rupiah, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'

const gaji = useGaji()
const notif = useNotifikasi()
const jenis = ref('PNS')
const kelompok = ref(0)
const KELOMPOK = { PNS: [['Gol. I', ['I/a', 'I/b', 'I/c', 'I/d']], ['Gol. II', ['II/a', 'II/b', 'II/c', 'II/d']], ['Gol. III', ['III/a', 'III/b', 'III/c', 'III/d']], ['Gol. IV', ['IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e']]],
  PPPK: [['I–IV', ['I', 'II', 'III', 'IV']], ['V–VIII', ['V', 'VI', 'VII', 'VIII']], ['IX–XII', ['IX', 'X', 'XI', 'XII']], ['XIII–XVII', ['XIII', 'XIV', 'XV', 'XVI', 'XVII']]] }

// Mode ubah memakai salinan (draf); tampilan biasa memakai tabel yang berlaku
const ubah = ref(false)
const draf = ref(null)
const info = reactive({ dasar_pns: '', dasar_pppk: '', berlaku: '' })
const salin = (t) => ({ PNS: JSON.parse(JSON.stringify(t.PNS)), PPPK: JSON.parse(JSON.stringify(t.PPPK)) })
function mulaiUbah() {
  const t = tabelAktif()
  draf.value = salin(t)
  Object.assign(info, { dasar_pns: t.dasar.PNS, dasar_pppk: t.dasar.PPPK, berlaku: t.dasar.berlaku || '' })
  ubah.value = true
}
const sumber = computed(() => (ubah.value ? draf.value : tabelAktif()))
const tabel = computed(() => sumber.value[jenis.value])
const gol = computed(() => KELOMPOK[jenis.value][kelompok.value][1])
const mkg = computed(() => [...new Set(gol.value.flatMap((g) => Object.keys(tabel.value[g] || {}).map(Number)).concat(tambahan.value))].sort((a, b) => a - b))
const tambahan = ref([])
const dipakai = computed(() => new Set(gaji.pegawaiAsn.filter((p) => p.status_kepegawaian === jenis.value).map((p) => `${p.golongan}|${gaji.dasarDari(p).mkg}`)))
const jumlahPegawai = (g) => gaji.pegawaiAsn.filter((p) => p.status_kepegawaian === jenis.value && p.golongan === g).length

function isiSel(g, m, v) {
  const t = draf.value[jenis.value]
  const n = Math.round(Number(String(v).replace(/\D/g, '')) || 0)
  if (!n) { if (t[g]) delete t[g][m] } else (t[g] ||= {})[m] = n
}
const mkgBaru = ref('')
function tambahMkg() { const m = Number(mkgBaru.value); if (mkgBaru.value === '' || m < 0) return; if (!tambahan.value.includes(m)) tambahan.value.push(m); mkgBaru.value = '' }

const persen = ref('')
const lingkup = ref('jenis')
function naikkan() {
  const p = Number(String(persen.value).replace(',', '.'))
  if (!p) return
  const daftar = lingkup.value === 'semua' ? ['PNS', 'PPPK'] : [jenis.value]
  if (!confirm(`Naikkan semua gaji pokok ${daftar.join(' & ')} sebesar ${p}% (dibulatkan ke ratusan rupiah)?`)) return
  daftar.forEach((j) => Object.values(draf.value[j]).forEach((isi) => Object.keys(isi).forEach((k) => { isi[k] = Math.round((isi[k] * (1 + p / 100)) / 100) * 100 })))
  persen.value = ''
}

const menyimpan = ref(false)
async function simpan() {
  menyimpan.value = true
  try {
    await simpanTabelGaji({ baris: keBaris(draf.value), dasar_pns: info.dasar_pns.trim() || DASAR_BAWAAN.PNS, dasar_pppk: info.dasar_pppk.trim() || DASAR_BAWAAN.PPPK, berlaku: info.berlaku })
    await gaji.segarkan(); ubah.value = false; tambahan.value = []
    notif.kabari('Tabel gaji pokok disimpan. Daftar Gaji & KGB memakai tabel baru.')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function bawaan() {
  if (!confirm('Kembalikan tabel ke bawaan (PP 5/2024 & Perpres 11/2024)? Tabel ubahan akan dihapus.')) return
  try { await simpanTabelGaji(null); await gaji.segarkan(); ubah.value = false; notif.kabari('Tabel kembali ke bawaan.') } catch (e) { notif.kabari(e.message, 'galat') }
}
function batal() { ubah.value = false; tambahan.value = []; draf.value = null }

/* ---------- Terapkan ke pegawai ---------- */
// Pegawai yang gaji pokok di Dasar Gaji-nya berbeda dengan tabel (pada MKG yang sama)
const beda = computed(() => gaji.pegawaiAsn.map((p) => ({ p, g: gaji.dasarDari(p) }))
  .map((x) => ({ ...x, t: x.g.mkg === '' ? null : gajiPokokTabel(x.p.status_kepegawaian, x.p.golongan, x.g.mkg) }))
  .filter((x) => x.t && x.g.gaji_pokok !== x.t.gaji_pokok))
async function terapkan() {
  if (!confirm(`Perbarui gaji pokok ${beda.value.length} pegawai sesuai tabel yang berlaku?`)) return
  try {
    await simpanDasarMassal(beda.value.map((x) => ({ id_pegawai: x.p.id, data: { gaji_pokok: x.t.gaji_pokok } })), 'tabel gaji pokok')
    await gaji.segarkan(); notif.kabari('Gaji pokok pegawai diperbarui.')
  } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Excel ---------- */
const KOLOM_X = [{ kunci: 'jenis', judul: 'Jenis (PNS/PPPK)', lebar: 16 }, { kunci: 'golongan', judul: 'Golongan', lebar: 12 }, { kunci: 'mkg', judul: 'MKG', lebar: 8, jenis: 'angka' }, { kunci: 'gaji_pokok', judul: 'Gaji Pokok', lebar: 16, jenis: 'uang' }]
const excel = () => eksporExcel({ judul: 'Tabel Gaji Pokok', namaBerkas: 'Tabel Gaji Pokok', kolom: KOLOM_X, baris: keBaris(sumber.value), landscape: false })
const masukan = ref(null)
async function imporExcel(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const lembar = await bacaBerkas(file)
    let baris = []
    for (const l of lembar) {
      const i = l.baris.findIndex((r) => r.some((c) => /golongan/i.test(String(c || ''))) && r.some((c) => /gaji\s*pokok/i.test(String(c || ''))))
      if (i < 0) continue
      const k = l.baris[i].map((c) => String(c || '').toLowerCase())
      const kol = (re) => k.findIndex((c) => re.test(c))
      const [kj, kg, km, kp] = [kol(/jenis/), kol(/golongan/), kol(/^mkg|masa kerja/), kol(/gaji\s*pokok/)]
      baris = l.baris.slice(i + 1).map((r) => ({ jenis: r[kj], golongan: String(r[kg] || '').trim(), mkg: r[km], gaji_pokok: Number(String(r[kp] ?? '').replace(/\D/g, '')) })).filter((b) => b.golongan && b.gaji_pokok)
      if (baris.length) break
    }
    if (!baris.length) throw new Error('Kolom Jenis, Golongan, MKG, dan Gaji Pokok tidak ditemukan. Gunakan berkas hasil tombol Excel.')
    if (!ubah.value) mulaiUbah()
    const t = dariBaris(baris)
    if (Object.keys(t.PNS).length) draf.value.PNS = t.PNS
    if (Object.keys(t.PPPK).length) draf.value.PPPK = t.PPPK
    notif.kabari(`${baris.length} baris tabel dibaca. Periksa lalu tekan Simpan.`)
  } catch (err) { notif.kabari(err.message, 'galat') }
}
const bedaBawaan = (g, m) => ubah.value && (jenis.value === 'PNS' ? GAJI_PNS : GAJI_PPPK)[g]?.[m] !== tabel.value[g]?.[m]
</script>

<template>
  <div class="space-y-4">
    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button v-for="j in ['PNS', 'PPPK']" :key="j" :class="['rounded-lg px-4 py-2 text-sm font-bold', jenis === j ? 'bg-white text-biru shadow dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500']" @click="jenis = j; kelompok = 0">{{ j }}</button>
      </div>
      <div class="flex gap-1 overflow-x-auto tanpa-penggulir">
        <button v-for="(k, i) in KELOMPOK[jenis]" :key="k[0]" :class="['shrink-0 rounded-lg px-3 py-2 text-sm font-semibold', kelompok === i ? 'bg-[#22A08D] text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800']" @click="kelompok = i">{{ k[0] }}</button>
      </div>
      <p class="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
        <Ikon nama="BookMarked" :ukuran="14" class="text-biru" /> {{ tabelAktif().dasar[jenis] }}<template v-if="tabelAktif().dasar.berlaku"> · berlaku {{ tanggalPanjang(tabelAktif().dasar.berlaku) }}</template>
        <span v-if="tabelAktif().ubahan" class="lencana bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Ubahan sekolah</span>
      </p>
    </div>

    <!-- Alat -->
    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="tabel-gaji-alat">
      <template v-if="!ubah">
        <button class="tombol-utama" @click="mulaiUbah"><Ikon nama="Pencil" :ukuran="16" /> Ubah tabel</button>
        <button class="tombol-garis" @click="excel"><Ikon nama="FileSpreadsheet" :ukuran="16" class="text-emerald-600" /> Excel</button>
        <button v-if="beda.length" class="tombol-garis" @click="terapkan"><Ikon nama="Users" :ukuran="16" class="text-[#E3A414]" /> Terapkan ke {{ beda.length }} pegawai</button>
        <button v-if="tabelAktif().ubahan" class="tombol-garis ml-auto text-rose-600" @click="bawaan"><Ikon nama="Undo2" :ukuran="16" /> Kembalikan bawaan</button>
      </template>
      <template v-else>
        <div class="flex items-center gap-1.5">
          <input v-model="persen" class="masukan w-20 py-2 text-sm angka" inputmode="decimal" placeholder="8" aria-label="Persen kenaikan" />
          <select v-model="lingkup" class="masukan w-auto py-2 text-sm" aria-label="Lingkup kenaikan"><option value="jenis">% untuk {{ jenis }}</option><option value="semua">% untuk PNS & PPPK</option></select>
          <button class="tombol-garis" :disabled="!persen" @click="naikkan"><Ikon nama="TrendingUp" :ukuran="16" class="text-[#22A08D]" /> Naikkan</button>
        </div>
        <div class="flex items-center gap-1.5">
          <input v-model="mkgBaru" type="number" min="0" class="masukan w-20 py-2 text-sm angka" placeholder="MKG" aria-label="MKG baru" />
          <button class="tombol-garis" @click="tambahMkg"><Ikon nama="Plus" :ukuran="16" /> Baris</button>
        </div>
        <input ref="masukan" type="file" accept=".xlsx,.csv" class="hidden" @change="imporExcel" />
        <button class="tombol-garis" @click="masukan.click()"><Ikon nama="Upload" :ukuran="16" class="text-emerald-600" /> Dari Excel</button>
        <div class="ml-auto flex gap-2">
          <button class="tombol-garis" @click="batal">Batal</button>
          <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="16" :class="menyimpan && 'animate-spin'" /> Simpan tabel</button>
        </div>
        <div class="grid w-full gap-2 sm:grid-cols-3">
          <div><label class="label" for="tb-pns">Dasar hukum PNS</label><input id="tb-pns" v-model="info.dasar_pns" class="masukan" placeholder="PP …/20…" /></div>
          <div><label class="label" for="tb-pppk">Dasar hukum PPPK</label><input id="tb-pppk" v-model="info.dasar_pppk" class="masukan" placeholder="Perpres …/20…" /></div>
          <div><label class="label" for="tb-tmt">Berlaku mulai</label><input id="tb-tmt" v-model="info.berlaku" type="date" class="masukan" /></div>
        </div>
      </template>
    </div>

    <div class="kartu overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60">
          <tr><th class="p-2.5 text-left">MKG</th><th v-for="g in gol" :key="g" class="p-2.5 text-right">{{ g }}<span v-if="jumlahPegawai(g)" class="ml-1 rounded-full bg-[#E3A414] px-1.5 text-[10px] text-white">{{ jumlahPegawai(g) }}</span></th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="m in mkg" :key="m">
            <td class="p-2.5 font-semibold">{{ m }} th</td>
            <td v-for="g in gol" :key="g" :class="['angka p-1.5 text-right', !ubah && dipakai.has(`${g}|${m}`) && 'bg-amber-50 font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200']">
              <input v-if="ubah" :value="tabel[g]?.[m] || ''" inputmode="numeric" :aria-label="`Gaji pokok ${g} MKG ${m}`"
                     :class="['masukan w-28 py-1 text-right text-sm angka', bedaBawaan(g, m) && 'border-amber-400 bg-amber-50 dark:bg-amber-900/30']" @change="isiSel(g, m, $event.target.value)" />
              <template v-else>{{ tabel[g]?.[m] ? rupiah(tabel[g][m], { tanpaRp: true }) : '' }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-slate-500">
      <template v-if="ubah"><span class="inline-block h-3 w-3 rounded border border-amber-400 bg-amber-50 align-middle" /> Sel berbingkai kuning = berbeda dengan tabel bawaan. Kosongkan sel untuk menghapusnya.</template>
      <template v-else><span class="inline-block h-3 w-3 rounded bg-amber-100 align-middle dark:bg-amber-900/40" /> Sel berwarna = dipakai pegawai sekolah saat ini. Gaji pokok pegawai yang sudah diisi manual di Dasar Gaji tidak berubah otomatis; kosongkan isiannya agar ikut tabel.</template>
    </p>
  </div>
</template>
