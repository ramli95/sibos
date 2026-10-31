<script setup>
// Pajak Terutang: kewajiban dari belanja Lunas, centang beberapa → satu kode billing/NTPN.
import { ref, computed } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanSetoran, hapusSetoran } from '@/services/kas'
import { hitungPajak } from '@/utils/pajak'
import { WARNA_PAJAK, CARA_PAJAK } from '@/config/pajak'
import { rupiah, rupiahRingkas, tanggalPendek, NAMA_BULAN, keIso, dariIso } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import GridStat from '@/components/GridStat.vue'
import Laci from '@/components/Laci.vue'
import AsistenPajak from './AsistenPajak.vue'

const kas = useKas()
const belanja = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()

const status = ref('terutang')
const jenis = ref('')
const bulan = ref('')
const cari = ref('')
const hasil = computed(() => {
  const q = cari.value.trim().toLowerCase()
  return kas.kewajiban.filter((p) => (status.value === 'semua' || (status.value === 'mitra' ? p.cara === 'mitra' : p.status === status.value && (status.value !== 'disetor' || p.cara !== 'mitra')))
    && (!jenis.value || p.jenis === jenis.value) && (bulan.value === '' || dariIso(p.tgl_pungut)?.getMonth() === Number(bulan.value))
    && (!q || [p.uraian, p.pihak, p.ntpn, p.kode_billing].some((v) => String(v || '').toLowerCase().includes(q))))
})
const jml = (a) => a.reduce((s, p) => s + p.nilai, 0)

// Belanja lunas yang pajaknya berbeda dari aturan aktif (bukan manual/migrasi)
const perluPeriksa = computed(() => belanja.daftar.filter((b) => b.status === 'lunas' && !b.pajak_manual && b.sumber !== 'migrasi' && b.jenis !== 'honor'
  && JSON.stringify(hitungPajak(b).map((p) => [p.jenis, p.nilai])) !== JSON.stringify((b.pajak || []).filter((p) => p.nilai).map((p) => [p.jenis, p.nilai]))))
const tampilPeriksa = ref(false)

const statistik = computed(() => {
  const k = kas.kewajiban
  const disetor = k.filter((p) => p.status === 'disetor' && p.cara !== 'mitra')
  const mitra = k.filter((p) => p.cara === 'mitra')
  return [
    { judul: 'Belum disetor', nilai: rupiahRingkas(kas.totalTerutang), ikon: 'TriangleAlert', nada: kas.terutang.length ? 'peringatan' : 'sukses', sub: `${kas.terutang.length} kewajiban`, ringkas: true, kunci: 'terutang' },
    { judul: 'Sudah disetor', nilai: rupiahRingkas(jml(disetor)), ikon: 'BadgeCheck', nada: 'primer', sub: `${kas.setoran.length} kode billing`, ringkas: true, kunci: 'disetor' },
    { judul: 'Dipungut mitra SIPLah', nilai: rupiahRingkas(jml(mitra)), ikon: 'ShoppingBag', nada: 'primer', sub: `${mitra.length} kewajiban terima-setor`, ringkas: true, kunci: 'mitra' },
    { judul: 'Perlu diperiksa', nilai: perluPeriksa.value.length, ikon: 'Calculator', nada: perluPeriksa.value.length ? 'bahaya' : 'primer', sub: 'Pajak berbeda dari aturan', kunci: 'periksa' },
  ]
})
function klikStat(k) { if (k.kunci === 'periksa') tampilPeriksa.value = !tampilPeriksa.value; else { status.value = k.kunci; pilih.value = new Set() } }

/* ---------- Pilih & setor ---------- */
const pilih = ref(new Set())
const bisaPilih = (p) => auth.isAdmin && p.status === 'terutang' && p.cara !== 'mitra'
function toggle(p) { const s = new Set(pilih.value); s.has(p.id) ? s.delete(p.id) : s.add(p.id); pilih.value = s }
const terpilih = computed(() => kas.kewajiban.filter((p) => pilih.value.has(p.id)))
function pilihSemua() { pilih.value = new Set(hasil.value.filter(bisaPilih).map((p) => p.id)) }

const form = ref(null)
function setorBaru() {
  const t = terpilih.value
  const akhir = t.map((p) => p.tgl_pungut).sort().at(-1)
  form.value = { tanggal: keIso() < akhir ? akhir : keIso(), kode_billing: '', ntpn: '', bnu: '', masa: (akhir || keIso()).slice(0, 7), dari: 'bank', catatan: '',
    butir: t.map((p) => ({ id_pajak: p.id, id_belanja: p.id_belanja, jenis: p.jenis, nilai: p.nilai, no_bupot: '', uraian: p.uraian })) }
}
function ubahSetoran(s) {
  form.value = { ...JSON.parse(JSON.stringify(s)), butir: (s.butir || []).map((x) => ({ ...x, uraian: kas.kewajiban.find((p) => p.id === x.id_pajak)?.uraian || x.id_pajak })) }
}
const menyimpan = ref(false)
const totalForm = computed(() => jml(form.value?.butir || []))
const jenisForm = computed(() => [...new Set((form.value?.butir || []).map((x) => x.jenis))])
async function simpan() {
  const f = form.value
  if (!f.tanggal) { notif.kabari('Isi tanggal setor.', 'galat'); return }
  if (f.ntpn && f.ntpn.replace(/\s/g, '').length !== 16) { if (!confirm('NTPN biasanya 16 karakter. Tetap simpan?')) return }
  if (f.kode_billing && f.kode_billing.replace(/\D/g, '').length !== 15) { if (!confirm('Kode billing biasanya 15 digit. Tetap simpan?')) return }
  menyimpan.value = true
  try {
    const { id, uraian: _u, ...isi } = f
    isi.butir = f.butir.map(({ uraian: _x, ...b }) => b)
    isi.ntpn = String(f.ntpn || '').replace(/\s/g, '').toUpperCase()
    isi.kode_billing = String(f.kode_billing || '').replace(/\D/g, '')
    await simpanSetoran(id || null, isi)
    notif.kabari(id ? 'Setoran diperbarui.' : `Setoran ${rupiah(totalForm.value)} tercatat.`)
    form.value = null
    pilih.value = new Set()
    await kas.segarkan()
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus() {
  if (!confirm('Hapus setoran ini? Kewajibannya kembali berstatus terutang.')) return
  try { await hapusSetoran(form.value); form.value = null; await kas.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}

const asisten = ref(null)
const buka = (p) => { asisten.value = belanja.daftar.find((b) => b.id === p.id_belanja) || null }
const setoranUrut = computed(() => [...kas.setoran].sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal))))
</script>

<template>
  <div class="space-y-5">
    <GridStat :daftar="statistik" :memuat="kas.memuat" :aktif="(k) => k.kunci === status || (k.kunci === 'periksa' && tampilPeriksa)" @klik="klikStat" />

    <section v-if="tampilPeriksa" class="kartu p-4">
      <h2 class="mb-2 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-bahaya"><Ikon nama="Calculator" :ukuran="17" /></span> Pajak berbeda dari aturan tarif</h2>
      <p v-if="!perluPeriksa.length" class="text-sm text-slate-500">Semua transaksi sesuai aturan.</p>
      <button v-for="b in perluPeriksa" :key="b.id" class="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40" @click="asisten = b">
        <Ikon nama="Wand2" :ukuran="17" class="text-[#22A08D]" /><span class="min-w-0 flex-1 truncate text-sm">{{ b.nama_pekerjaan }}</span><span class="angka text-sm">{{ rupiah(b.total) }}</span>
      </button>
    </section>

    <div class="kartu flex flex-wrap items-center gap-2 p-3">
      <div class="relative min-w-[12rem] flex-1"><Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="cari" class="masukan pl-9" placeholder="Cari uraian, penyedia, NTPN…" /></div>
      <select v-model="status" class="masukan w-auto py-2.5" aria-label="Status"><option value="terutang">Terutang</option><option value="disetor">Sudah disetor</option><option value="mitra">Mitra SIPLah</option><option value="semua">Semua</option></select>
      <select v-model="jenis" class="masukan w-auto py-2.5" aria-label="Jenis pajak"><option value="">Semua jenis</option><option v-for="j in ['PPN', 'PPh 21', 'PPh 22', 'PPh 23', 'PPh 4(2)']" :key="j">{{ j }}</option></select>
      <select v-model="bulan" class="masukan w-auto py-2.5" aria-label="Bulan"><option value="">Semua bulan</option><option v-for="(n, i) in NAMA_BULAN" :key="n" :value="i">{{ n }}</option></select>
      <button v-if="auth.isAdmin && status === 'terutang' && hasil.some(bisaPilih)" class="tombol-garis" @click="pilihSemua"><Ikon nama="CopyCheck" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Pilih semua</span></button>
    </div>

    <div v-if="kas.memuat" class="kartu p-10 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat pajak…</div>
    <div v-else-if="!hasil.length" class="kartu flex flex-col items-center gap-3 p-10 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-2xl ikon-chip-sukses"><Ikon nama="BadgeCheck" :ukuran="26" /></span>
      <p class="font-semibold">{{ status === 'terutang' ? 'Tidak ada pajak terutang.' : 'Tidak ada data yang cocok.' }}</p>
    </div>
    <div v-else class="kartu divide-y divide-slate-100 dark:divide-slate-800">
      <div v-for="p in hasil" :key="p.id" class="flex items-start gap-3 p-3.5">
        <button v-if="bisaPilih(p)" type="button" :aria-label="`Pilih ${p.jenis} ${p.uraian}`" @click="toggle(p)"
                :class="['mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition', pilih.has(p.id) ? 'border-biru bg-biru text-white' : 'border-slate-300 dark:border-slate-600']">
          <Ikon v-if="pilih.has(p.id)" nama="Check" :ukuran="14" />
        </button>
        <span v-else :class="['mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', p.cara === 'mitra' ? 'ikon-chip-kuning' : 'ikon-chip-sukses']"><Ikon :nama="p.cara === 'mitra' ? 'ShoppingBag' : 'BadgeCheck'" :ukuran="15" /></span>
        <button type="button" class="min-w-0 flex-1 text-left" @click="buka(p)">
          <p class="flex flex-wrap items-center gap-1.5"><span :class="['lencana', WARNA_PAJAK[p.jenis]]">{{ p.jenis }}</span>
            <span class="text-xs text-slate-500">{{ CARA_PAJAK[p.cara]?.label }}<template v-if="p.tarif != null"> · {{ p.tarif }}%</template></span>
            <span v-if="p.sumber === 'migrasi'" class="lencana bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Migrasi</span></p>
          <p class="mt-0.5 line-clamp-2 text-sm font-semibold">{{ p.uraian }}</p>
          <p class="truncate text-xs text-slate-500">{{ tanggalPendek(p.tgl_pungut) }}<template v-if="p.pihak"> · {{ p.pihak }}</template>
            <template v-if="p.status === 'disetor' && p.cara !== 'mitra'"> · disetor {{ tanggalPendek(p.tgl_setor) }}<template v-if="p.ntpn"> · NTPN {{ p.ntpn }}</template></template></p>
        </button>
        <div class="shrink-0 text-right">
          <p class="angka font-bold">{{ rupiah(p.nilai) }}</p>
          <span :class="['lencana', p.status === 'terutang' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300']">{{ p.status === 'terutang' ? 'Terutang' : 'Disetor' }}</span>
        </div>
      </div>
    </div>

    <div v-if="pilih.size" class="sticky bottom-20 z-20 lg:bottom-4">
      <div class="kartu flex flex-wrap items-center gap-3 border-2 border-biru/30 p-3 shadow-xl">
        <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="Landmark" :ukuran="19" /></span>
        <div class="min-w-0 flex-1"><p class="text-sm font-bold">{{ pilih.size }} kewajiban dipilih</p><p class="angka text-xs text-slate-500">{{ rupiah(jml(terpilih)) }} · satu kode billing</p></div>
        <button class="tombol-garis" @click="pilih = new Set()">Batal</button>
        <button class="tombol-utama" @click="setorBaru"><Ikon nama="Landmark" :ukuran="17" /> Catat setoran</button>
      </div>
    </div>

    <section class="kartu p-4 sm:p-5">
      <h2 class="mb-3 flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Landmark" :ukuran="17" /></span> Riwayat setoran (kode billing & NTPN)</h2>
      <p v-if="!setoranUrut.length" class="text-sm text-slate-500">Belum ada setoran. Centang kewajiban terutang lalu “Catat setoran”.</p>
      <div v-else class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <button v-for="s in setoranUrut" :key="s.id" type="button" class="rounded-xl border border-slate-200 p-3 text-left transition hover:border-biru/40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40" @click="auth.isAdmin && ubahSetoran(s)">
          <div class="flex items-center justify-between gap-2"><span class="text-xs text-slate-500">{{ tanggalPendek(s.tanggal) }} · masa {{ s.masa }}</span><b class="angka text-sm">{{ rupiah(s.total) }}</b></div>
          <p class="kode mt-1 truncate text-sm font-bold">{{ s.ntpn || 'NTPN belum diisi' }}</p>
          <p class="kode truncate text-xs text-slate-500">Billing {{ s.kode_billing || '-' }}<template v-if="s.bnu"> · {{ s.bnu }}</template></p>
          <p class="mt-1 flex flex-wrap gap-1"><span v-for="j in [...new Set((s.butir || []).map((x) => x.jenis))]" :key="j" :class="['lencana', WARNA_PAJAK[j]]">{{ j }}</span><span class="text-xs text-slate-500">{{ (s.butir || []).length }} kewajiban</span></p>
        </button>
      </div>
    </section>

    <Laci v-if="form" :judul="form.id ? 'Ubah setoran pajak' : 'Catat setoran pajak'" :subjudul="`${form.butir.length} kewajiban · ${rupiah(totalForm)}`" ikon="Landmark" @tutup="form = null">
      <div class="space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="st-tgl">Tanggal setor</label><input id="st-tgl" v-model="form.tanggal" type="date" class="masukan" /></div>
          <div><label class="label" for="st-masa">Masa pajak</label><input id="st-masa" v-model="form.masa" type="month" class="masukan" /></div>
          <div><label class="label" for="st-bil">Kode billing (15 digit)</label><input id="st-bil" v-model="form.kode_billing" inputmode="numeric" class="masukan kode" placeholder="0xxxxxxxxxxxxxx" /></div>
          <div><label class="label" for="st-ntpn">NTPN (16 karakter)</label><input id="st-ntpn" v-model="form.ntpn" class="masukan kode uppercase" /></div>
          <div><label class="label" for="st-bnu">BNU ARKAS setor pajak</label><input id="st-bnu" v-model="form.bnu" class="masukan kode" placeholder="BNU …" />
            <p v-if="jenisForm.length > 1" class="mt-1 text-xs text-slate-500">Beberapa jenis pajak: BNU per jenis bisa diisi di bawah.</p></div>
          <div><label class="label" for="st-dari">Dibayar dari</label><select id="st-dari" v-model="form.dari" class="masukan"><option value="bank">Rekening bank BOSP</option><option value="tunai">Kas tunai</option></select></div>
        </div>
        <div v-if="jenisForm.length > 1" class="grid gap-2 sm:grid-cols-2">
          <label v-for="j in jenisForm" :key="j" class="text-xs text-slate-500">BNU {{ j }}<input :value="form.bnu_jenis?.[j] || ''" class="masukan kode py-1.5" @input="form.bnu_jenis = { ...(form.bnu_jenis || {}), [j]: $event.target.value }" /></label>
        </div>
        <div>
          <p class="label">Kewajiban dalam setoran ini</p>
          <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            <div v-for="(x, i) in form.butir" :key="x.id_pajak" class="space-y-1.5 p-2.5">
              <div class="flex items-center gap-2 text-sm"><span :class="['lencana', WARNA_PAJAK[x.jenis]]">{{ x.jenis }}</span><span class="min-w-0 flex-1 truncate">{{ x.uraian }}</span><b class="angka">{{ rupiah(x.nilai) }}</b>
                <button v-if="form.butir.length > 1" class="rounded p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" aria-label="Keluarkan" @click="form.butir.splice(i, 1)"><Ikon nama="X" :ukuran="15" /></button></div>
              <input v-if="x.jenis !== 'PPN' && x.jenis !== 'PPh 22'" v-model="x.no_bupot" class="masukan kode py-1.5 text-xs" placeholder="Nomor bukti potong e-Bupot (opsional)" />
            </div>
          </div>
        </div>
        <p class="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50">Satu kode billing boleh untuk beberapa kewajiban dengan KAP/KJS dan masa yang sama. Setoran tercatat di Buku Pembantu Pajak dan BKU (pengeluaran).</p>
      </div>
      <template #kaki>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan setoran</button>
        <button class="tombol-garis" @click="form = null">Batal</button>
        <button v-if="form.id" class="tombol ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="hapus"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
      </template>
    </Laci>

    <AsistenPajak v-if="asisten" :belanja="asisten" @tutup="asisten = null" />
  </div>
</template>
