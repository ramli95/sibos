<script setup>
// Berita Acara Serah Terima Bendahara: keadaan kas, pajak belum disetor, transaksi belum lunas/lengkap,
// dan arsip yang diserahkan per tanggal serah terima. Disimpan di ba_serah_terima, dicetak F4.
import InputAngka from '@/components/InputAngka.vue'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { modePratinjau } from '@/services/firebase'
import { muatPegawai } from '@/services/master'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { muatSemua, simpanSatu, hapusSatu } from '@/services/catatan'
import { PEJABAT_CONTOH } from '@/config/sekolahAwal'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { keadaanSerahTerima, ARSIP_BAWAAN } from '@/utils/serahTerima'
import { salin } from '@/utils/belanja'
import { rupiah, rupiahRingkas, tanggalPanjang, keIso } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokBaSerahTerima from '@/components/cetak/DokBaSerahTerima.vue'

const kas = useKas()
const belanja = useBelanja()
const rkas = useRkas()
const auth = useAuth()
const notif = useNotifikasi()

const pegawai = ref([])
const pejabat = ref([])
const riwayat = ref([])
const cetak = ref(false)
const menyimpan = ref(false)

const kosong = () => ({
  id: null, nomor: '', tanggal: keIso(), tempat: '', kota: 'Makassar', dasar: '', catatan: '', saldo_koran: 0,
  pihak1: { nama: '', gelar: '', nip: '', pangkat: '', jabatan: 'Bendahara Dana BOSP (lama)' },
  pihak2: { nama: '', gelar: '', nip: '', pangkat: '', jabatan: 'Bendahara Dana BOSP (baru)' },
  saksi: [{ nama: '', gelar: '', nip: '', jabatan: 'Anggota Tim BOS unsur guru' }, { nama: '', gelar: '', nip: '', jabatan: 'Anggota Tim BOS unsur Komite Sekolah' }],
  arsip: ARSIP_BAWAAN.map((a) => ({ ...a, ada: true })),
})
const f = reactive(kosong())
const tahun = computed(() => Number(String(f.tanggal).slice(0, 4)) || kas.tahun)

onMounted(async () => {
  const [pg, pj, rw] = await Promise.all([
    modePratinjau ? import('@/services/contohBelanja').then((m) => m.PEGAWAI) : muatPegawai({ denganRahasia: false }).catch(() => []),
    modePratinjau ? PEJABAT_CONTOH : muatPejabat().catch(() => []),
    muatSemua('ba_serah_terima').catch(() => []),
  ])
  pegawai.value = pg.filter((p) => p.aktif !== false); pejabat.value = pj
  riwayat.value = rw.sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)))
  isiPejabat()
})

// Data tahun sesuai tanggal serah terima
watch(tahun, async (t) => {
  await kas.muat({ tahun: t })
  if (rkas.tahun !== t) await rkas.gantiTahun(t); else await rkas.muat()
}, { immediate: true })

// Pihak pertama = Bendahara BOSP yang menjabat pada tanggal itu; Kepala Sekolah ikut tanggal
const kepsek = computed(() => pejabatPada(pejabat.value, 'kepala_sekolah', f.tanggal))
function isiPejabat() {
  const b = pejabatPada(pejabat.value, 'bendahara_bosp', f.tanggal)
  if (b && !f.pihak1.nama) Object.assign(f.pihak1, { nama: b.nama, gelar: b.gelar || '', nip: b.nip || '', pangkat: b.pangkat || '' })
}
watch(() => f.tanggal, isiPejabat)

function pilihPegawai(tujuan, id) {
  const p = pegawai.value.find((x) => x.id === id)
  if (!p) return
  Object.assign(tujuan, { nama: [p.gelar_depan, p.nama].filter(Boolean).join(' '), gelar: p.gelar || '', nip: p.nip || '', pangkat: [p.pangkat, p.golongan].filter(Boolean).join(' / ') })
}

const k = computed(() => keadaanSerahTerima({
  tanggal: f.tanggal, baris: kas.baris, kewajiban: kas.kewajiban, belanja: belanja.daftar, kas: kas.kas, uraian: rkas.uraian, pagu: rkas.versiBerlaku?.pagu,
}))
const statistik = computed(() => [
  { judul: 'Saldo bank (BKU)', nilai: rupiahRingkas(k.value.saldoBank), sub: rupiah(k.value.saldoBank), ikon: 'Landmark', nada: 'gelap' },
  { judul: 'Kas tunai', nilai: rupiahRingkas(k.value.saldoTunai), sub: rupiah(k.value.saldoTunai), ikon: 'Banknote', nada: 'primer' },
  { judul: 'Pajak belum disetor', nilai: rupiahRingkas(k.value.totalPajak), sub: `${k.value.pajak.length} kewajiban`, ikon: 'ReceiptText', nada: k.value.pajak.length ? 'peringatan' : 'sukses' },
  { judul: 'Belum lunas / belum lengkap', nilai: `${k.value.belumLunas.length} / ${k.value.belumLengkap.length}`, sub: `Belum lunas ${rupiah(k.value.totalBelumLunas)}`, ikon: 'ListChecks', nada: k.value.belumLunas.length || k.value.belumLengkap.length ? 'peringatan' : 'sukses' },
])
const selisihKoran = computed(() => (Number(f.saldo_koran) ? Number(f.saldo_koran) - k.value.saldoBank : 0))
const ba = computed(() => ({ ...salin(f), tahun: tahun.value, kepsek: kepsek.value }))

async function simpan() {
  if (!f.pihak2.nama) { notif.kabari('Isi nama bendahara baru (Pihak Kedua).', 'galat'); return }
  menyimpan.value = true
  try {
    const data = { ...salin(f), tahun: tahun.value, ringkas: { saldo_bank: k.value.saldoBank, saldo_tunai: k.value.saldoTunai, pajak: k.value.totalPajak, belum_lunas: k.value.belumLunas.length, belum_lengkap: k.value.belumLengkap.length } }
    f.id = await simpanSatu('ba_serah_terima', f.id, data, `Menyimpan Berita Acara serah terima bendahara ${f.pihak1.nama || '-'} → ${f.pihak2.nama} per ${f.tanggal}`)
    const i = riwayat.value.findIndex((x) => x.id === f.id)
    const baris = { ...data, id: f.id }
    if (i >= 0) riwayat.value[i] = baris; else riwayat.value.unshift(baris)
    notif.kabari('Berita Acara tersimpan.')
  } catch (e) { notif.kabari(e.code === 'permission-denied' ? 'Ditolak: perbarui Firestore Rules Fase 7 terlebih dahulu.' : e.message, 'galat') } finally { menyimpan.value = false }
}
function buka(x) { Object.assign(f, kosong(), salin(x)) }
function baru() { Object.assign(f, kosong()); isiPejabat() }
async function hapus(x) {
  if (!confirm(`Hapus Berita Acara per ${tanggalPanjang(x.tanggal)}?`)) return
  try { await hapusSatu('ba_serah_terima', x.id, `Menghapus Berita Acara serah terima per ${x.tanggal}`); riwayat.value = riwayat.value.filter((y) => y.id !== x.id); if (f.id === x.id) baru() } catch (e) { notif.kabari(e.message, 'galat') }
}
const tambahArsip = () => f.arsip.push({ nama: '', jumlah: '', ada: true })
</script>

<template>
  <div class="space-y-5">
    <!-- Riwayat -->
    <div v-if="riwayat.length" class="kartu flex flex-wrap items-center gap-2 p-3">
      <Ikon nama="History" :ukuran="17" class="text-biru" /><span class="text-sm font-semibold">Tersimpan:</span>
      <span v-for="x in riwayat" :key="x.id" :class="['flex items-center gap-1 rounded-xl border px-2 py-1 text-xs', f.id === x.id ? 'border-biru bg-biru/10' : 'border-slate-200 dark:border-slate-700']">
        <button class="font-semibold" @click="buka(x)">{{ tanggalPanjang(x.tanggal) }} · {{ x.pihak2?.nama }}</button>
        <button v-if="auth.isAdmin" class="text-slate-400 hover:text-rose-600" :aria-label="`Hapus BA ${x.tanggal}`" @click="hapus(x)"><Ikon nama="X" :ukuran="13" /></button>
      </span>
      <button class="tombol-garis ml-auto px-2.5 py-1.5 text-xs" @click="baru"><Ikon nama="Plus" :ukuran="14" class="text-biru" /> BA baru</button>
    </div>

    <GridStat :daftar="statistik" :memuat="kas.memuat" :bisa-klik="false" ringkas />

    <div class="grid gap-5 lg:grid-cols-2">
      <!-- Identitas -->
      <section class="kartu space-y-3 p-4 sm:p-5" data-tur="ba-identitas">
        <h2 class="flex items-center gap-2 font-bold"><Ikon nama="FileSignature" :ukuran="18" class="text-biru" /> Identitas berita acara</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="ba-tgl">Tanggal serah terima</label><input id="ba-tgl" v-model="f.tanggal" type="date" class="masukan" /></div>
          <div><label class="label" for="ba-no">Nomor</label><input id="ba-no" v-model="f.nomor" class="masukan" placeholder="400.3.11/…/UPT SPF SMP.19/XI/2026" /></div>
          <div class="sm:col-span-2"><label class="label" for="ba-dasar">Dasar (opsional)</label><input id="ba-dasar" v-model="f.dasar" class="masukan" placeholder="Surat Keputusan Kepala Sekolah Nomor … tanggal …" /></div>
          <div><label class="label" for="ba-tempat">Tempat</label><input id="ba-tempat" v-model="f.tempat" class="masukan" placeholder="UPT SPF SMP Negeri 19 Makassar" /></div>
          <div><label class="label" for="ba-koran">Saldo rekening koran (opsional)</label><InputAngka id="ba-koran" v-model="f.saldo_koran" class="masukan angka" /></div>
        </div>
        <p v-if="selisihKoran" class="flex gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <Ikon nama="TriangleAlert" :ukuran="15" class="shrink-0" /> Selisih dengan BKU {{ rupiah(selisihKoran) }} — jelaskan di catatan (mis. bunga/biaya bank belum dicatat).</p>
        <div><label class="label" for="ba-cat">Catatan</label><textarea id="ba-cat" v-model="f.catatan" rows="2" class="masukan" /></div>
      </section>

      <!-- Para pihak -->
      <section class="kartu space-y-3 p-4 sm:p-5" data-tur="ba-pihak">
        <h2 class="flex items-center gap-2 font-bold"><Ikon nama="UsersRound" :ukuran="18" class="text-[#22A08D]" /> Para pihak</h2>
        <div v-for="[judul, obj, ikon] in [['Pihak Pertama (bendahara lama)', f.pihak1, 'UserMinus'], ['Pihak Kedua (bendahara baru)', f.pihak2, 'UserPlus'], ['Saksi 1', f.saksi[0], 'UserCheck'], ['Saksi 2', f.saksi[1], 'UserCheck']]" :key="judul"
             class="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <Ikon :nama="ikon" :ukuran="16" class="text-slate-400" /><span class="flex-1 text-sm font-semibold">{{ judul }}</span>
            <select class="masukan w-auto py-1 text-xs" :aria-label="`Pilih pegawai untuk ${judul}`" @change="pilihPegawai(obj, $event.target.value); $event.target.value = ''">
              <option value="">Pilih pegawai…</option><option v-for="p in pegawai" :key="p.id" :value="p.id">{{ p.nama }}</option>
            </select>
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            <input v-model="obj.nama" class="masukan py-1.5" placeholder="Nama" :aria-label="`Nama ${judul}`" />
            <input v-model="obj.gelar" class="masukan py-1.5" placeholder="Gelar" :aria-label="`Gelar ${judul}`" />
            <input v-model="obj.nip" class="masukan kode py-1.5" placeholder="NIP" inputmode="numeric" maxlength="18" :aria-label="`NIP ${judul}`" />
            <input v-model="obj.jabatan" class="masukan py-1.5" placeholder="Jabatan" :aria-label="`Jabatan ${judul}`" />
          </div>
        </div>
        <p class="text-xs text-slate-500">Mengetahui: Kepala Sekolah pada tanggal itu — <b>{{ kepsek ? kepsek.nama + (kepsek.gelar ? ', ' + kepsek.gelar : '') : 'belum diatur di Pejabat per Periode' }}</b></p>
      </section>
    </div>

    <!-- Arsip -->
    <section class="kartu p-4 sm:p-5" data-tur="ba-arsip">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="flex flex-1 items-center gap-2 font-bold"><Ikon nama="Archive" :ukuran="18" class="text-[#E3A414]" /> Arsip & dokumen yang diserahkan</h2>
        <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="tambahArsip"><Ikon nama="Plus" :ukuran="14" class="text-biru" /> Tambah</button>
      </div>
      <div class="space-y-2">
        <div v-for="(a, i) in f.arsip" :key="i" class="flex flex-wrap items-center gap-2">
          <input v-model="a.ada" type="checkbox" class="h-4 w-4 accent-[#22A08D]" :aria-label="`Sertakan arsip ${i + 1}`" />
          <input v-model="a.nama" class="masukan min-w-[12rem] flex-1 py-1.5 text-sm" placeholder="Nama arsip" :aria-label="`Nama arsip ${i + 1}`" />
          <input v-model="a.jumlah" class="masukan w-32 py-1.5 text-sm" placeholder="Jumlah/ket." :aria-label="`Jumlah arsip ${i + 1}`" />
          <button class="text-slate-400 hover:text-rose-600" :aria-label="`Hapus arsip ${i + 1}`" @click="f.arsip.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
        </div>
      </div>
    </section>

    <!-- Rincian otomatis -->
    <section class="kartu p-4 sm:p-5">
      <h2 class="mb-2 flex items-center gap-2 font-bold"><Ikon nama="ListChecks" :ukuran="18" class="text-biru" /> Ikut tercetak otomatis per {{ tanggalPanjang(f.tanggal) }}</h2>
      <ul class="grid gap-2 text-sm sm:grid-cols-3">
        <li class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><b>{{ k.pajak.length }}</b> pajak belum disetor <span class="angka block text-xs text-slate-500">{{ rupiah(k.totalPajak) }}</span></li>
        <li class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><b>{{ k.belumLunas.length }}</b> transaksi belum lunas <span class="angka block text-xs text-slate-500">{{ rupiah(k.totalBelumLunas) }}</span></li>
        <li class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><b>{{ k.belumLengkap.length }}</b> SPJ belum lengkap <span class="block text-xs text-slate-500">dari transaksi lunas</span></li>
      </ul>
    </section>

    <div class="flex flex-wrap justify-end gap-2">
      <button v-if="auth.punyaPeran('bendahara', 'kepala_sekolah')" class="tombol-garis" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="['text-biru', menyimpan && 'animate-spin']" /> Simpan</button>
      <button class="tombol-utama" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" /> Pratinjau & cetak BA</button>
    </div>

    <CetakSurat v-if="cetak" :judul="`Berita Acara Serah Terima Bendahara ${tanggalPanjang(f.tanggal)}`" @tutup="cetak = false">
      <template #default="{ profil }"><DokBaSerahTerima :profil="profil" :ba="ba" :k="k" /></template>
    </CetakSurat>
  </div>
</template>
