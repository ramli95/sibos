<script setup>
// KGB — Kenaikan Gaji Berkala: jatuh tempo = TMT KGB terakhir + 2 tahun, pengingat H-30,
// surat pengantar usulan ke Dinas (dengan lampiran daftar), dan pencatatan SK/Surat Pemberitahuan yang terbit
// (TMT KGB & gaji pokok diperbarui otomatis).
import { ref, reactive, computed } from 'vue'
import { useGaji, namaLengkap } from '@/stores/gaji'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanUsulanKgb, catatSkKgb, hapusKgb } from '@/services/gaji'
import { panggilPenghubung } from '@/services/penghubung'
import { modePratinjau } from '@/services/firebase'
import { hariIni } from '@/utils/gaji'
import { rupiah, tanggalPanjang } from '@/utils/format'
import { formatNip } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'
import GridStat from '@/components/GridStat.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokPengantarKgb from '@/components/cetak/DokPengantarKgb.vue'

const gaji = useGaji()
const notif = useNotifikasi()
const saring = ref('semua')
const pilih = ref(new Set())

const hitung = (k) => gaji.daftarKgb.filter((x) => x.st.kunci === k).length
const statistik = computed(() => [
  { judul: 'Jatuh tempo ≤ 30 hari', nilai: hitung('h30'), ikon: 'BellRing', nada: hitung('h30') ? 'peringatan' : 'sukses', sub: 'Segera kirim usulan', saring: 'h30' },
  { judul: 'Sudah lewat', nilai: hitung('lewat'), ikon: 'CircleAlert', nada: hitung('lewat') ? 'bahaya' : 'sukses', sub: 'Belum dicatat SK-nya', saring: 'lewat' },
  { judul: '1–3 bulan lagi', nilai: hitung('dekat'), ikon: 'CalendarClock', sub: 'Siapkan berkas', saring: 'dekat' },
  { judul: 'TMT belum diisi', nilai: hitung('kosong'), ikon: 'CircleHelp', nada: 'gelap', sub: 'Isi di Data Pegawai', saring: 'kosong' },
])
const daftar = computed(() => gaji.daftarKgb.filter((x) => saring.value === 'semua' || x.st.kunci === saring.value))
function alih(id) { const s = new Set(pilih.value); s.has(id) ? s.delete(id) : s.add(id); pilih.value = s }
function pilihH30() { pilih.value = new Set(gaji.daftarKgb.filter((x) => ['h30', 'lewat', 'dekat'].includes(x.st.kunci)).map((x) => x.p.id)) }
const terpilih = computed(() => gaji.daftarKgb.filter((x) => pilih.value.has(x.p.id)))

/* ---------- Surat pengantar ---------- */
const BERKAS = [
  'Fotokopi SK/Surat Pemberitahuan KGB terakhir',
  'Fotokopi SK Kenaikan Pangkat terakhir',
  'Fotokopi SK CPNS dan SK PNS (PPPK: perjanjian kerja)',
  'Fotokopi Sasaran Kinerja Pegawai (SKP) 2 tahun terakhir',
]
const usulan = ref(null)
const u = reactive({ tanggal: '', tujuan: '', tujuan_cq: '', tempat_tujuan: '', nomor: '', berkas: '' })
function bukaUsulan() {
  Object.assign(u, { tanggal: hariIni(), tujuan: 'Kepala Dinas Pendidikan Kota Makassar', tujuan_cq: 'Kepala Sub Bagian Umum dan Kepegawaian', tempat_tujuan: 'Makassar', nomor: '', berkas: BERKAS.join('\n') })
  usulan.value = true
}
const menyimpan = ref(false)
const cetak = ref(null)
async function simpanUsulan() {
  menyimpan.value = true
  try {
    const isi = {
      tanggal: u.tanggal, tujuan: u.tujuan.trim(), tujuan_cq: u.tujuan_cq.trim(), tempat_tujuan: u.tempat_tujuan.trim(),
      lampiran_berkas: u.berkas.split('\n').map((x) => x.trim()).filter(Boolean),
      pegawai: terpilih.value.map((x) => ({
        id_pegawai: x.p.id, nama: namaLengkap(x.p), nip: x.p.nip, jenis_kelamin: x.p.jenis_kelamin || '', golongan: x.p.golongan, status: x.p.status_kepegawaian,
        tmt_lama: x.p.tmt_kgb_terakhir || '', jatuh_tempo: x.jatuh_tempo, gaji_pokok_lama: x.gaji_pokok_lama, gaji_pokok_baru: x.gaji_pokok_baru, mkg_baru: x.mkg_baru,
      })),
    }
    const hasil = await simpanUsulanKgb(isi, { nomor: u.nomor })
    gaji.kgb.unshift(hasil); usulan.value = null; pilih.value = new Set(); cetak.value = hasil
    notif.kabari(`Surat pengantar KGB ${hasil.nomor} dibuat.`)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}

/* ---------- Catat SK terbit ---------- */
const sk = ref(null)
const s = reactive({})
function bukaSk(x) {
  Object.assign(s, { nomor_sk: '', tanggal_sk: hariIni(), pejabat_sk: 'Kepala Dinas Pendidikan Kota Makassar', tmt: x.jatuh_tempo || hariIni(),
    gaji_pokok_lama: x.gaji_pokok_lama || '', gaji_pokok_baru: x.gaji_pokok_baru || '', mkg_lama: x.g.mkg, mkg_baru: x.mkg_baru ?? '' })
  sk.value = x
}
async function simpanSk() {
  menyimpan.value = true
  try { await catatSkKgb(sk.value.p, { ...s }); notif.kabari(`KGB ${sk.value.p.nama} dicatat; TMT KGB & gaji pokok diperbarui.`); sk.value = null; await gaji.segarkan() }
  catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus(x) {
  if (!confirm(x.jenis === 'usulan' ? `Hapus surat pengantar ${x.nomor}? Nomor tidak dipakai ulang.` : `Hapus catatan SK KGB ${x.nama}? TMT KGB dan gaji pokok TIDAK dikembalikan otomatis.`)) return
  try { await hapusKgb(x); gaji.kgb.splice(gaji.kgb.findIndex((y) => y.id === x.id), 1) } catch (e) { notif.kabari(e.message, 'galat') }
}
// Uji pengingat: Apps Script v7 mengirim notifikasi KGB sekarang juga (tanpa menunggu pukul 07.00)
const menguji = ref(false)
async function ujiPengingat() {
  if (modePratinjau) return notif.kabari('Mode Pratinjau: pengingat tidak dikirim.', 'info')
  menguji.value = true
  try {
    const r = await panggilPenghubung('cek_kgb')
    notif.kabari(r.hasil?.jumlah ? `Pengingat KGB dikirim (${r.hasil.jumlah} pegawai).` : 'Tidak ada KGB yang jatuh tempo ≤ 30 hari.')
  } catch (e) { notif.kabari(`Pengingat gagal: ${e.message}. Pastikan Apps Script sudah versi 7.`, 'galat') } finally { menguji.value = false }
}
const riwayat = computed(() => [...gaji.kgb].sort((a, b) => String(b.tanggal || b.tanggal_sk).localeCompare(String(a.tanggal || a.tanggal_sk))))
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :aktif="(k) => saring === k.saring" @klik="(k) => (saring = saring === k.saring ? 'semua' : k.saring)" />

    <div class="kartu flex flex-wrap items-center gap-2 p-3" data-tur="kgb-alat">
      <span class="text-sm text-slate-600 dark:text-slate-300"><b>{{ pilih.size }}</b> dipilih</span>
      <button class="tombol-garis" @click="pilihH30"><Ikon nama="CopyCheck" :ukuran="16" class="text-biru" /> Pilih yang ≤ 3 bulan</button>
      <button v-if="saring !== 'semua'" class="tombol-garis" @click="saring = 'semua'"><Ikon nama="X" :ukuran="16" /> Semua</button>
      <button class="tombol-garis" :disabled="menguji" title="Kirim notifikasi KGB sekarang lewat Apps Script" @click="ujiPengingat"><Ikon :nama="menguji ? 'RefreshCw' : 'BellRing'" :ukuran="16" :class="['text-amber-500', menguji && 'animate-spin']" /> Uji pengingat</button>
      <button class="tombol-utama ml-auto" :disabled="!pilih.size" @click="bukaUsulan"><Ikon nama="FileText" :ukuran="16" /> Surat pengantar usulan</button>
    </div>

    <div class="space-y-2">
      <div v-for="x in daftar" :key="x.p.id" class="kartu flex flex-wrap items-center gap-3 p-4">
        <input type="checkbox" :checked="pilih.has(x.p.id)" class="h-5 w-5 accent-[#E3A414]" :aria-label="`Pilih ${x.p.nama}`" :disabled="!x.jatuh_tempo" @change="alih(x.p.id)" />
        <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold', x.p.status_kepegawaian === 'PNS' ? 'ikon-chip' : 'ikon-chip-tosca']">{{ x.p.golongan }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold">{{ namaLengkap(x.p) }}</p>
          <p class="kode truncate text-xs text-slate-500">{{ formatNip(x.p.nip) }}</p>
          <p class="text-xs text-slate-500">TMT terakhir {{ x.p.tmt_kgb_terakhir ? tanggalPanjang(x.p.tmt_kgb_terakhir) : '—' }} · <b>jatuh tempo {{ x.jatuh_tempo ? tanggalPanjang(x.jatuh_tempo) : '—' }}</b></p>
          <p v-if="x.gaji_pokok_baru" class="text-xs">GP <span class="angka">{{ rupiah(x.gaji_pokok_lama) }}</span> → <b class="angka text-emerald-700 dark:text-emerald-400">{{ rupiah(x.gaji_pokok_baru) }}</b> <span class="text-slate-500">(MKG {{ x.mkg_baru }})</span></p>
        </div>
        <span :class="['lencana', x.st.lencana]"><Ikon :nama="x.st.ikon" :ukuran="13" /> {{ x.st.label }}</span>
        <button class="tombol-garis" :disabled="!x.p.golongan" @click="bukaSk(x)"><Ikon nama="BadgeCheck" :ukuran="16" class="text-[#22A08D]" /> Catat SK</button>
      </div>
      <p v-if="!daftar.length" class="kartu p-8 text-center text-sm text-slate-500">Tidak ada pegawai pada saringan ini.</p>
    </div>

    <section v-if="riwayat.length" class="space-y-2">
      <h3 class="flex items-center gap-2 px-1 font-bold"><Ikon nama="History" :ukuran="18" class="text-biru" /> Riwayat KGB</h3>
      <div v-for="x in riwayat" :key="x.id" class="kartu flex flex-wrap items-center gap-3 p-4">
        <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', x.jenis === 'usulan' ? 'ikon-chip-kuning' : 'ikon-chip-sukses']"><Ikon :nama="x.jenis === 'usulan' ? 'FileText' : 'BadgeCheck'" :ukuran="18" /></span>
        <div class="min-w-0 flex-1">
          <template v-if="x.jenis === 'usulan'">
            <p class="text-sm font-semibold">Surat pengantar usulan · {{ x.pegawai?.length }} pegawai</p>
            <p class="kode truncate text-xs text-slate-500">{{ x.nomor }} · {{ tanggalPanjang(x.tanggal) }}</p>
            <p class="truncate text-xs text-slate-500">{{ (x.pegawai || []).map((y) => y.nama).join(', ') }}</p>
          </template>
          <template v-else>
            <p class="text-sm font-semibold">SK KGB {{ x.nama }}</p>
            <p class="text-xs text-slate-500">{{ x.nomor_sk || 'tanpa nomor' }} · TMT {{ tanggalPanjang(x.tmt) }} · GP <span class="angka">{{ rupiah(x.gaji_pokok_baru) }}</span> (MKG {{ x.mkg_baru }})</p>
          </template>
        </div>
        <button v-if="x.jenis === 'usulan'" class="tombol-garis" @click="cetak = x"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button>
        <button class="tombol-garis text-rose-600" aria-label="Hapus" @click="hapus(x)"><Ikon nama="Trash2" :ukuran="16" /></button>
      </div>
    </section>

    <!-- Surat pengantar -->
    <Laci v-if="usulan" judul="Surat pengantar usulan KGB" :subjudul="`${terpilih.length} pegawai`" ikon="FileText" @tutup="usulan = null">
      <div class="space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="kg-t">Tanggal surat</label><input id="kg-t" v-model="u.tanggal" type="date" class="masukan" /></div>
          <div><label class="label" for="kg-n">Nomor (kosongkan = otomatis)</label><input id="kg-n" v-model="u.nomor" class="masukan kode" /></div>
        </div>
        <div><label class="label" for="kg-y">Kepada Yth.</label><input id="kg-y" v-model="u.tujuan" class="masukan" /></div>
        <div class="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <div><label class="label" for="kg-c">c.q.</label><input id="kg-c" v-model="u.tujuan_cq" class="masukan" /></div>
          <div><label class="label" for="kg-d">di</label><input id="kg-d" v-model="u.tempat_tujuan" class="masukan" /></div>
        </div>
        <div><label class="label" for="kg-b">Berkas yang dilampirkan (satu per baris)</label><textarea id="kg-b" v-model="u.berkas" rows="4" class="masukan text-sm" /></div>
        <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
          <li v-for="x in terpilih" :key="x.p.id" class="flex justify-between gap-3 p-2.5"><span>{{ namaLengkap(x.p) }} <span class="text-xs text-slate-500">{{ x.p.golongan }}</span></span><span class="text-xs">{{ tanggalPanjang(x.jatuh_tempo) }}</span></li>
        </ul>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="menyimpan || !u.tanggal" @click="simpanUsulan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Printer'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan & cetak</button>
        <button class="tombol-garis" @click="usulan = null">Batal</button>
      </template>
    </Laci>

    <!-- Catat SK -->
    <Laci v-if="sk" judul="Catat SK/Pemberitahuan KGB" :subjudul="`${namaLengkap(sk.p)} · ${sk.p.golongan}`" ikon="BadgeCheck" lebar="max-w-xl" @tutup="sk = null">
      <div class="space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2"><label class="label" for="sk-no">Nomor surat pemberitahuan/SK</label><input id="sk-no" v-model="s.nomor_sk" class="masukan kode" placeholder="PN.822.3/…/DP/…" /></div>
          <div><label class="label" for="sk-tg">Tanggal surat</label><input id="sk-tg" v-model="s.tanggal_sk" type="date" class="masukan" /></div>
          <div><label class="label" for="sk-tmt">TMT KGB baru</label><input id="sk-tmt" v-model="s.tmt" type="date" class="masukan" /></div>
          <div class="sm:col-span-2"><label class="label" for="sk-pj">Ditandatangani oleh</label><input id="sk-pj" v-model="s.pejabat_sk" class="masukan" /></div>
          <div><label class="label" for="sk-gl">Gaji pokok lama</label><input id="sk-gl" v-model="s.gaji_pokok_lama" type="number" class="masukan angka" /></div>
          <div><label class="label" for="sk-gb">Gaji pokok baru</label><input id="sk-gb" v-model="s.gaji_pokok_baru" type="number" class="masukan angka" /></div>
          <div><label class="label" for="sk-mk">MKG baru (tahun)</label><input id="sk-mk" v-model="s.mkg_baru" type="number" class="masukan angka" /></div>
        </div>
        <p class="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"><Ikon nama="Info" :ukuran="15" /> Setelah disimpan: TMT KGB terakhir di Data Pegawai menjadi {{ tanggalPanjang(s.tmt) }}, gaji pokok & MKG di Dasar Gaji diperbarui, dan KGB berikutnya dijadwalkan {{ tanggalPanjang(s.tmt ? String(Number(s.tmt.slice(0, 4)) + 2) + s.tmt.slice(4) : '') }}.</p>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="menyimpan || !s.tmt || !s.gaji_pokok_baru || s.mkg_baru === ''" @click="simpanSk"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
        <button class="tombol-garis" @click="sk = null">Batal</button>
      </template>
    </Laci>

    <CetakSurat v-if="cetak" :judul="`Usulan KGB ${cetak.nomor}`" :nama-berkas="`Usulan KGB ${cetak.tanggal}`" @tutup="cetak = null">
      <template #default="{ profil, pejabat }">
        <DokPengantarKgb :profil="profil" :u="cetak" :kepsek="pejabat('kepala_sekolah', cetak.tanggal)" />
      </template>
    </CetakSurat>
  </div>
</template>
