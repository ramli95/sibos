<script setup>
// SKPG — Surat Keterangan Perincian Gaji untuk PNS, PPPK, dan Honorer.
// ASN: angka Daftar Gaji resmi bulan terpilih (bila sudah diimpor), selebihnya hitungan SIBOS.
// Honorer: honor bulanan dari menu Honor & Transpor (Dana BOSP) pada bulan terpilih.
import { ref, reactive, computed, watch } from 'vue'
import { useGaji, namaLengkap } from '@/stores/gaji'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { terbitkanSkpg, hapusSkpg, muatBulan } from '@/services/gaji'
import { KEPERLUAN_SKPG } from '@/config/gaji'
import { hitungGaji, angkaSkpg, honorBulanan, asn, hariIni } from '@/utils/gaji'
import { rupiah, tanggalPanjang, NAMA_BULAN } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokSkpg from '@/components/cetak/DokSkpg.vue'

const gaji = useGaji()
const belanja = useBelanja()
const notif = useNotifikasi()

const f = reactive({ id_pegawai: '', periode: gaji.periode, keperluan: 'bank', keperluan_lain: '', tanggal: hariIni(), nomor: '' })
const dataBulan = ref(null)
const memuatBulan = ref(false)
watch(() => f.periode, async (p) => {
  if (!p) return
  memuatBulan.value = true
  try {
    dataBulan.value = await muatBulan(p)
    const t = Number(p.slice(0, 4)); if (belanja.tahun !== t || !belanja.daftar.length) await belanja.muat({ tahun: t })
  } catch { dataBulan.value = null } finally { memuatBulan.value = false }
}, { immediate: true })

const pegawai = computed(() => gaji.aktif.find((p) => p.id === f.id_pegawai) || null)
const namaBulan = (p) => { const [y, m] = String(p || '').split('-'); return m ? `${NAMA_BULAN[Number(m) - 1]} ${y}` : '' }

/** Angka SKPG pegawai terpilih + sumbernya */
const hasil = computed(() => {
  const p = pegawai.value
  if (!p) return null
  if (asn(p)) {
    const simpan = dataBulan.value?.simpanan?.baris?.find((b) => b.id === p.id)
    const g = gaji.dasarDari(p)
    const hitung = simpan ? { ...hitungGaji(g, gaji.aturan), ...simpan } : hitungGaji(g, gaji.aturan)
    const resmi = dataBulan.value?.resmi?.[p.id] || null
    const a = angkaSkpg(hitung, resmi)
    return { angka: a, sumber: resmi ? 'resmi' : simpan ? 'simpanan' : 'hitung', lengkap: g.gaji_pokok > 0, g }
  }
  const h = honorBulanan(belanja.daftar, p.id, f.periode)
  const angka = { gaji_pokok: h.bruto, kotor: h.bruto, pot_pph: h.pph, potongan: h.pph, bersih: h.bersih, tj_kinerja: 0, tj_profesi: 0 }
  return { angka, sumber: 'honor', lengkap: h.bruto > 0, transaksi: h.transaksi, g: {} }
})
const SUMBER = {
  resmi: ['Daftar Gaji resmi', 'FileCheck', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'],
  simpanan: ['Daftar Gaji SIBOS (tersimpan)', 'Lock', 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'],
  hitung: ['Hitungan SIBOS', 'Calculator', 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'],
  honor: ['Honor bulanan BOSP', 'Wallet', 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'],
}

function isiSkpg() {
  const p = pegawai.value
  return {
    id_pegawai: p.id, nama: p.nama, nama_lengkap: namaLengkap(p), nip: p.nip || '', nik: p.nik || '', npwp: p.npwp || '',
    status: p.status_kepegawaian, golongan: p.golongan || '', pangkat: p.pangkat || '', jabatan: p.jabatan || '', tmt_tugas: hasil.value.g?.tmt_tugas || '',
    periode: f.periode, keperluan: f.keperluan, keperluan_lain: f.keperluan === 'lain' ? f.keperluan_lain.trim() : '', tanggal: f.tanggal,
    angka: hasil.value.angka, sumber: hasil.value.sumber, ket_potongan_lain: hasil.value.g?.ket_potongan_lain || '',
  }
}
const menyimpan = ref(false)
const cetak = ref(null)
async function terbitkan() {
  if (!pegawai.value || !hasil.value) return
  menyimpan.value = true
  try {
    const s = await terbitkanSkpg(isiSkpg(), { nomor: f.nomor })
    gaji.skpg.unshift(s); cetak.value = s; f.nomor = ''
    notif.kabari(`SKPG ${s.nomor} diterbitkan.`)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus(s) {
  if (!confirm(`Hapus SKPG ${s.nomor} a.n. ${s.nama}? Nomor tidak dipakai ulang.`)) return
  try { await hapusSkpg(s); gaji.skpg.splice(gaji.skpg.findIndex((x) => x.id === s.id), 1) } catch (e) { notif.kabari(e.message, 'galat') }
}
const rincian = ref(false)
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <section class="kartu space-y-4 p-5" data-tur="skpg-form">
      <h3 class="flex items-center gap-2 font-bold"><span class="grid h-9 w-9 place-items-center rounded-xl ikon-chip-kuning"><Ikon nama="FileSignature" :ukuran="18" /></span> Buat SKPG</h3>
      <div>
        <label class="label" for="sk-p">Pegawai</label>
        <select id="sk-p" v-model="f.id_pegawai" class="masukan">
          <option value="">— pilih pegawai —</option>
          <optgroup label="PNS & PPPK"><option v-for="p in gaji.pegawaiAsn" :key="p.id" :value="p.id">{{ namaLengkap(p) }} ({{ p.status_kepegawaian }} {{ p.golongan }})</option></optgroup>
          <optgroup label="Honorer"><option v-for="p in gaji.honorer" :key="p.id" :value="p.id">{{ namaLengkap(p) }}</option></optgroup>
        </select>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div><label class="label" for="sk-b">Bulan gaji</label><input id="sk-b" v-model="f.periode" type="month" class="masukan" /></div>
        <div><label class="label" for="sk-t">Tanggal surat</label><input id="sk-t" v-model="f.tanggal" type="date" class="masukan" /></div>
      </div>
      <div>
        <p class="label">Keperluan</p>
        <div class="grid grid-cols-2 gap-2">
          <label v-for="k in [...KEPERLUAN_SKPG, { kunci: 'lain', judul: 'Lainnya', ikon: 'Ellipsis' }]" :key="k.kunci"
                 :class="['flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold', f.keperluan === k.kunci ? 'border-[#E3A414] bg-[#E3A414]/10 text-[#9A6B06] dark:text-amber-300' : 'border-slate-300 dark:border-slate-600']">
            <input v-model="f.keperluan" type="radio" :value="k.kunci" class="sr-only" /><Ikon :nama="k.ikon" :ukuran="16" /> {{ k.judul }}
          </label>
        </div>
        <input v-if="f.keperluan === 'lain'" v-model="f.keperluan_lain" class="masukan mt-2" placeholder="mis. pengajuan beasiswa anak" aria-label="Keperluan lain" />
      </div>
      <div><label class="label" for="sk-n">Nomor (kosongkan = otomatis)</label><input id="sk-n" v-model="f.nomor" class="masukan kode" placeholder="421/…/UPT.SPF.SMPN.19/…" /></div>

      <div v-if="hasil" class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <div class="flex flex-wrap items-center gap-2">
          <span :class="['lencana', SUMBER[hasil.sumber][2]]"><Ikon :nama="SUMBER[hasil.sumber][1]" :ukuran="13" /> {{ SUMBER[hasil.sumber][0] }}</span>
          <span class="text-xs text-slate-500">{{ namaBulan(f.periode) }}</span>
          <button class="ml-auto text-xs font-semibold text-biru hover:underline" @click="rincian = !rincian">{{ rincian ? 'Sembunyikan' : 'Rincian' }}</button>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-xl bg-blue-50 p-2 dark:bg-blue-950/40"><p class="text-[11px] text-slate-500">Kotor</p><p class="angka text-sm font-bold">{{ rupiah(hasil.angka.kotor) }}</p></div>
          <div class="rounded-xl bg-rose-50 p-2 dark:bg-rose-950/40"><p class="text-[11px] text-slate-500">Potongan</p><p class="angka text-sm font-bold text-rose-600">{{ rupiah(hasil.angka.potongan) }}</p></div>
          <div class="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/40"><p class="text-[11px] text-slate-500">Bersih</p><p class="angka text-sm font-bold text-emerald-700 dark:text-emerald-300">{{ rupiah(hasil.angka.bersih) }}</p></div>
        </div>
        <p v-if="hasil.angka.tj_profesi" class="mt-2 text-xs text-slate-500">+ Tunjangan profesi {{ rupiah(hasil.angka.tj_profesi) }} (di luar daftar gaji)</p>
        <dl v-if="rincian" class="mt-3 grid grid-cols-2 gap-x-4 text-xs">
          <template v-for="[k, l] in [['gaji_pokok', 'Gaji/honor pokok'], ['tj_istri', 'Tj. istri/suami'], ['tj_anak', 'Tj. anak'], ['tj_fungsional', 'Tj. fungsional'], ['tj_beras', 'Tj. beras'], ['tj_pph', 'Tj. PPh'], ['bpjs', 'BPJS 4%'], ['jkk', 'JKK'], ['jkm', 'JKM'], ['pembulatan', 'Pembulatan'], ['pot_pph', 'Pot. PPh'], ['pot_bpjs', 'Pot. BPJS'], ['pot_iwp1', 'IWP 1%'], ['pot_iwp8', 'IWP 8%/JHT'], ['pot_taperum', 'Taperum'], ['pot_lain', 'Pot. lain']]" :key="k">
            <dt class="border-b border-dashed border-slate-200 py-0.5 dark:border-slate-700">{{ l }}</dt><dd class="angka border-b border-dashed border-slate-200 py-0.5 text-right dark:border-slate-700">{{ rupiah(hasil.angka[k] || 0, { tanpaRp: true }) }}</dd>
          </template>
        </dl>
        <p v-if="hasil.sumber === 'honor' && hasil.transaksi?.length" class="mt-2 text-xs text-slate-500">Dari: {{ hasil.transaksi.join('; ') }}</p>
        <p v-if="!hasil.lengkap" class="mt-2 flex gap-1 text-xs text-amber-600"><Ikon nama="TriangleAlert" :ukuran="14" /> {{ hasil.sumber === 'honor' ? 'Tidak ada honor bulanan pegawai ini di bulan tersebut (menu Honor & Transpor).' : 'Gaji pokok/MKG belum diisi di tab Dasar Gaji.' }}</p>
      </div>
      <p v-else class="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800/50">Pilih pegawai untuk melihat perincian gajinya.</p>

      <button class="tombol-utama w-full justify-center" :disabled="!hasil?.lengkap || menyimpan || memuatBulan" @click="terbitkan">
        <Ikon :nama="menyimpan ? 'RefreshCw' : 'Printer'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Terbitkan nomor & cetak
      </button>
    </section>

    <section class="space-y-2" data-tur="skpg-riwayat">
      <h3 class="flex items-center gap-2 px-1 font-bold"><Ikon nama="History" :ukuran="18" class="text-biru" /> SKPG diterbitkan <span class="lencana bg-slate-100 text-slate-600 dark:bg-slate-800">{{ gaji.skpg.length }}</span></h3>
      <div v-for="s in gaji.skpg" :key="s.id" class="kartu flex flex-wrap items-center gap-3 p-4">
        <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.status === 'Honorer' ? 'ikon-chip-tosca' : 'ikon-chip-kuning']"><Ikon nama="FileSignature" :ukuran="18" /></span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{{ s.nama }} <span class="text-xs font-normal text-slate-500">· {{ s.status }}</span></p>
          <p class="kode truncate text-xs text-slate-500">{{ s.nomor }}</p>
          <p class="text-xs text-slate-500">{{ tanggalPanjang(s.tanggal) }} · gaji {{ namaBulan(s.periode) }} · {{ (KEPERLUAN_SKPG.find((k) => k.kunci === s.keperluan)?.judul) || s.keperluan_lain || '-' }}</p>
        </div>
        <div class="flex gap-2">
          <button class="tombol-garis" @click="cetak = s"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button>
          <button class="tombol-garis text-rose-600" :aria-label="`Hapus ${s.nomor}`" @click="hapus(s)"><Ikon nama="Trash2" :ukuran="16" /></button>
        </div>
      </div>
      <p v-if="!gaji.skpg.length" class="kartu p-8 text-center text-sm text-slate-500">Belum ada SKPG yang diterbitkan.</p>
    </section>

    <CetakSurat v-if="cetak" :judul="`SKPG ${cetak.nama}`" :nama-berkas="`SKPG ${cetak.nama} ${cetak.periode}`" @tutup="cetak = null">
      <template #default="{ profil, pejabat }">
        <DokSkpg :profil="profil" :s="cetak" :kepsek="pejabat('kepala_sekolah', cetak.tanggal)" :bendahara="pejabat('bendahara_gaji', cetak.tanggal)" />
      </template>
    </CetakSurat>
  </div>
</template>
