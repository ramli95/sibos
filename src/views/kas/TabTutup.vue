<script setup>
// Tutup buku bulanan: daftar periksa → rekonsiliasi ARKAS–SIMAKDA–bank → tutup → cetak laporan F4 → arsip PDF ke Drive.
// Tanpa kunci periode: Bendahara tetap bisa membuka kembali; semuanya tercatat di Log Aktivitas.
import { ref, computed, watch } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanTutupBuku } from '@/services/kas'
import { muatCetak, buatPdfPaket } from '@/services/cetak'
import { unggahBerkas } from '@/services/penghubung'
import { ringkasanBulan, calonBank, cocokkanKoran } from '@/utils/bku'
import { rupiah, rupiahRingkas, tanggalPendek, tanggalPanjang, NAMA_BULAN, dariIso, keIso } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import CetakBuku from '@/components/cetak/CetakBuku.vue'

const kas = useKas()
const belanja = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()
const sekarang = new Date()
const bulan = ref(kas.tahun === sekarang.getFullYear() ? Math.max(0, sekarang.getMonth() - 1) : 0)
const id = computed(() => `${kas.tahun}-${String(bulan.value + 1).padStart(2, '0')}`)
const akhir = computed(() => keIso(new Date(kas.tahun, bulan.value + 1, 0)))
const awal = computed(() => `${id.value}-01`)

const ringkas = (m) => ringkasanBulan(kas.baris, m, kas.tahun)
const r = computed(() => ringkas(bulan.value))
const tb = computed(() => kas.tutupBulan(id.value) || {})

const isian = ref({ saldo_arkas: '', saldo_simakda: '', catatan: '' })
watch([id, () => kas.tutup], () => { const t = tb.value; isian.value = { saldo_arkas: t.saldo_arkas ?? '', saldo_simakda: t.saldo_simakda ?? '', catatan: t.catatan || '' } }, { immediate: true })

const dalamBulan = (iso) => iso && iso >= awal.value && iso <= akhir.value
const draf = computed(() => belanja.daftar.filter((b) => b.status !== 'lunas' && dalamBulan(b.tgl_pesanan || b.tgl_kegiatan || b.tgl_terima)))
const terutang = computed(() => kas.terutang.filter((p) => p.tgl_pungut <= akhir.value))
const koran = computed(() => kas.koran.find((k) => k.id === id.value) || null)
const cocok = computed(() => (koran.value ? cocokkanKoran(koran.value.mutasi || [], calonBank(kas.baris)) : []))
const belumCocok = computed(() => cocok.value.filter((m) => !m.pasangan && m.cara !== 'abaikan').length)
const angka = (v) => (v === '' || v == null ? null : Number(v))
const selisih = (v) => (angka(v) == null ? null : angka(v) - r.value.saldo_bank)

const periksa = computed(() => [
  { judul: 'Transaksi bulan ini sudah Lunas', ok: !draf.value.length, ket: draf.value.length ? `${draf.value.length} masih Draf/Dipesan/Diterima` : 'Tidak ada transaksi tertunda', ke: '/belanja/daftar', ikon: 'ListChecks' },
  { judul: 'Semua belanja ber-BNU ARKAS', ok: !r.value.tanpa_bnu, ket: r.value.tanpa_bnu ? `${r.value.tanpa_bnu} baris belum ber-BNU` : 'Lengkap', ke: '/buku-kas/bku', ikon: 'Hash' },
  { judul: 'Pajak sudah disetor', ok: !terutang.value.length, ket: terutang.value.length ? `${terutang.value.length} kewajiban ${rupiah(terutang.value.reduce((s, p) => s + p.nilai, 0))}` : 'Tidak ada pajak terutang', ke: '/pajak/terutang', ikon: 'ReceiptText' },
  { judul: 'Rekening koran dicocokkan', ok: !!koran.value && !belumCocok.value && koran.value.saldo_akhir === r.value.saldo_bank,
    ket: !koran.value ? 'Belum diimpor' : belumCocok.value ? `${belumCocok.value} mutasi belum berpasangan` : koran.value.saldo_akhir === r.value.saldo_bank ? 'Saldo koran = buku bank' : `Selisih ${rupiah(koran.value.saldo_akhir - r.value.saldo_bank)}`, ke: '/buku-kas/koran', ikon: 'FileSearch' },
  { judul: 'Saldo sama dengan ARKAS', ok: selisih(isian.value.saldo_arkas) === 0, ket: selisih(isian.value.saldo_arkas) == null ? 'Isi saldo ARKAS di bawah' : selisih(isian.value.saldo_arkas) === 0 ? 'Cocok' : `Selisih ${rupiah(selisih(isian.value.saldo_arkas))}`, ikon: 'ClipboardList' },
  { judul: 'Saldo sama dengan SIMAKDA', ok: selisih(isian.value.saldo_simakda) === 0, ket: selisih(isian.value.saldo_simakda) == null ? 'Isi saldo SIMAKDA di bawah' : selisih(isian.value.saldo_simakda) === 0 ? 'Cocok' : `Selisih ${rupiah(selisih(isian.value.saldo_simakda))}`, ikon: 'Landmark' },
])
const siap = computed(() => periksa.value.every((p) => p.ok))

const status = (m) => {
  const t = kas.tutupBulan(`${kas.tahun}-${String(m + 1).padStart(2, '0')}`)
  if (t?.status === 'ditutup') return 'ditutup'
  if (kas.tahun > sekarang.getFullYear() || (kas.tahun === sekarang.getFullYear() && m > sekarang.getMonth())) return 'nanti'
  return t?.status === 'dibuka' ? 'dibuka' : 'terbuka'
}
const GAYA = { ditutup: ['ikon-chip-sukses', 'Lock', 'Ditutup'], terbuka: ['ikon-chip-kuning', 'LockOpen', 'Terbuka'], dibuka: ['ikon-chip-peringatan', 'LockOpen', 'Dibuka kembali'], nanti: ['bg-slate-100 text-slate-400 dark:bg-slate-800', 'Clock', 'Belum'] }

const menyimpan = ref(false)
const dataIsian = () => ({ saldo_arkas: angka(isian.value.saldo_arkas), saldo_simakda: angka(isian.value.saldo_simakda), catatan: isian.value.catatan })
async function simpanIsian() {
  menyimpan.value = true
  try { await simpanTutupBuku(id.value, { ...dataIsian(), status: tb.value.status || 'terbuka' }, `Memperbarui rekonsiliasi ${NAMA_BULAN[bulan.value]} ${kas.tahun}`); await kas.segarkan(); notif.kabari('Rekonsiliasi tersimpan.') }
  catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function tutupBuku() {
  if (!siap.value && !confirm('Masih ada daftar periksa yang belum beres. Tetap tutup buku bulan ini?')) return
  menyimpan.value = true
  try {
    await simpanTutupBuku(id.value, { ...dataIsian(), status: 'ditutup', ringkasan: r.value, ditutup_pada: keIso(), peringatan: periksa.value.filter((p) => !p.ok).map((p) => `${p.judul}: ${p.ket}`) },
      `Menutup buku ${NAMA_BULAN[bulan.value]} ${kas.tahun}: saldo bank ${rupiah(r.value.saldo_bank)}`)
    await kas.segarkan()
    notif.kabari(`Buku ${NAMA_BULAN[bulan.value]} ditutup. Cetak laporan lalu arsipkan PDF-nya.`)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function bukaKembali() {
  const alasan = prompt('Alasan membuka kembali buku bulan ini (tercatat di log):')
  if (alasan == null) return
  try { await simpanTutupBuku(id.value, { status: 'dibuka', alasan_buka: alasan }, `Membuka kembali buku ${NAMA_BULAN[bulan.value]} ${kas.tahun}: ${alasan}`); await kas.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}

/* ---------- Laporan bulanan ---------- */
const cetak = ref(false)
const barisBulan = computed(() => kas.bku.filter((x) => dalamBulan(x.tanggal)))
const kolom = [
  { judul: 'Tanggal', nilai: (x) => tanggalPendek(x.tanggal), lebar: '2cm', rata: 'tengah' },
  { judul: 'Kode Kegiatan', nilai: (x) => x.kode_kegiatan, lebar: '2.1cm', kode: true },
  { judul: 'Kode Rekening', nilai: (x) => x.kode_rekening, lebar: '3.2cm', kode: true },
  { judul: 'No. Bukti', nilai: (x) => x.bnu, lebar: '2cm', kode: true },
  { judul: 'Uraian', nilai: (x) => x.uraian },
  { judul: 'Penerimaan', nilai: (x) => x.masuk, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Pengeluaran', nilai: (x) => x.keluar, lebar: '2.8cm', uang: true, jumlah: true },
  { judul: 'Saldo', nilai: (x) => x.saldo, lebar: '2.9cm', uang: true },
]
const judulLaporan = computed(() => `Laporan Penutupan Kas Bulan ${NAMA_BULAN[bulan.value]} ${kas.tahun}`)
const mengarsip = ref(false)
async function arsipkan() {
  const el = document.querySelector('.jendela-cetak .isi-dokumen')
  if (!el) return
  mengarsip.value = true
  try {
    const pengaturan = await muatCetak()
    const blob = await buatPdfPaket([{ el, orientasi: 'landscape' }], pengaturan, { namaBerkas: judulLaporan.value, kembalikan: true })
    const nama = `${judulLaporan.value}.pdf`
    const h = await unggahBerkas(new File([blob], nama, { type: 'application/pdf' }), [String(kas.tahun), `${String(bulan.value + 1).padStart(2, '0')} ${NAMA_BULAN[bulan.value]}`, 'Laporan'], nama)
    await simpanTutupBuku(id.value, { arsip_pdf: { nama, tautan: h.tautan, id: h.id_berkas_drive, waktu: new Date().toISOString() } }, `Mengarsipkan laporan penutupan kas ${NAMA_BULAN[bulan.value]} ke Drive`)
    await kas.segarkan()
    notif.kabari('PDF laporan tersimpan di Drive.')
  } catch (e) { notif.kabari('Arsip gagal: ' + e.message, 'galat') } finally { mengarsip.value = false }
}
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-12">
      <button v-for="(n, m) in NAMA_BULAN" :key="n" type="button" @click="bulan = m"
              :class="['kartu flex flex-col items-center gap-1 p-2.5 text-center transition', bulan === m ? 'ring-2 ring-biru' : 'hover:-translate-y-0.5']">
        <span :class="['grid h-8 w-8 place-items-center rounded-lg', GAYA[status(m)][0]]"><Ikon :nama="GAYA[status(m)][1]" :ukuran="16" /></span>
        <span class="text-xs font-bold">{{ n.slice(0, 3) }}</span>
        <span class="angka text-[10px] text-slate-500">{{ status(m) === 'nanti' ? GAYA.nanti[2] : rupiahRingkas(ringkas(m).saldo_bank).replace('Rp ', '') }}</span>
      </button>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <section class="kartu min-w-0 space-y-4 p-4 sm:p-5">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="flex flex-1 items-center gap-2 font-bold"><span :class="['grid h-9 w-9 place-items-center rounded-xl', GAYA[status(bulan)][0]]"><Ikon :nama="GAYA[status(bulan)][1]" :ukuran="18" /></span>
            {{ NAMA_BULAN[bulan] }} {{ kas.tahun }} <span class="hidden text-sm font-normal text-slate-500 sm:inline">· {{ GAYA[status(bulan)][2] }}</span></h2>
          <button class="tombol-garis" @click="cetak = true"><Ikon nama="Printer" :ukuran="17" class="text-biru" /> Laporan</button>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div v-for="[l, v] in [['Saldo awal', r.saldo_awal], ['Penerimaan', r.masuk], ['Pengeluaran', r.keluar], ['Saldo akhir', r.saldo_akhir]]" :key="l" class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <p class="text-[11px] text-slate-500">{{ l }}</p><p class="angka text-sm font-bold">{{ rupiah(v) }}</p></div>
        </div>
        <p class="text-xs text-slate-500">Saldo bank {{ rupiah(r.saldo_bank) }} · kas tunai {{ rupiah(r.saldo_tunai) }} · {{ r.jumlah_baris }} baris BKU</p>

        <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <component :is="p.ke ? 'RouterLink' : 'div'" v-for="p in periksa" :key="p.judul" :to="p.ke" class="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <span :class="['grid h-8 w-8 shrink-0 place-items-center rounded-lg', p.ok ? 'ikon-chip-sukses' : 'ikon-chip-peringatan']"><Ikon :nama="p.ok ? 'CircleCheck' : p.ikon" :ukuran="16" /></span>
            <div class="min-w-0 flex-1"><p class="text-sm font-semibold">{{ p.judul }}</p><p class="text-xs text-slate-500">{{ p.ket }}</p></div>
            <Ikon v-if="p.ke" nama="ChevronRight" :ukuran="16" class="text-slate-400" />
          </component>
        </div>
        <p v-if="tb.status === 'ditutup'" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Ditutup {{ tanggalPanjang(tb.ditutup_pada) }} dengan saldo bank {{ rupiah(tb.ringkasan?.saldo_bank) }}.
          <template v-if="tb.ringkasan && tb.ringkasan.saldo_bank !== r.saldo_bank"> <b>Perhatian:</b> saldo sekarang {{ rupiah(r.saldo_bank) }} (ada perubahan setelah ditutup).</template>
        </p>
        <p v-if="tb.alasan_buka && tb.status === 'dibuka'" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Dibuka kembali: {{ tb.alasan_buka }}</p>
      </section>

      <section class="kartu space-y-4 p-4 sm:p-5">
        <h3 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Scale" :ukuran="17" /></span> Rekonsiliasi akhir bulan</h3>
        <div><label class="label" for="tb-arkas">Saldo ARKAS per {{ tanggalPendek(akhir) }}</label><input id="tb-arkas" v-model="isian.saldo_arkas" type="number" class="masukan angka" :disabled="!auth.isAdmin" />
          <p v-if="selisih(isian.saldo_arkas) != null" :class="['mt-1 text-xs font-semibold', selisih(isian.saldo_arkas) ? 'text-rose-600' : 'text-emerald-600']">{{ selisih(isian.saldo_arkas) ? `Selisih ${rupiah(selisih(isian.saldo_arkas))}` : 'Sama dengan SIBOS' }}</p></div>
        <div><label class="label" for="tb-sim">Saldo SIMAKDA per {{ tanggalPendek(akhir) }}</label><input id="tb-sim" v-model="isian.saldo_simakda" type="number" class="masukan angka" :disabled="!auth.isAdmin" />
          <p v-if="selisih(isian.saldo_simakda) != null" :class="['mt-1 text-xs font-semibold', selisih(isian.saldo_simakda) ? 'text-rose-600' : 'text-emerald-600']">{{ selisih(isian.saldo_simakda) ? `Selisih ${rupiah(selisih(isian.saldo_simakda))}` : 'Sama dengan SIBOS' }}</p></div>
        <div class="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <p class="flex justify-between"><span class="text-slate-500">Saldo bank SIBOS</span><b class="angka">{{ rupiah(r.saldo_bank) }}</b></p>
          <p class="flex justify-between"><span class="text-slate-500">Saldo rekening koran</span><b class="angka">{{ koran ? rupiah(koran.saldo_akhir) : '—' }}</b></p>
        </div>
        <div><label class="label" for="tb-cat">Catatan</label><textarea id="tb-cat" v-model="isian.catatan" rows="2" class="masukan" :disabled="!auth.isAdmin" /></div>
        <p v-if="tb.arsip_pdf" class="flex items-center gap-2 text-xs"><Ikon nama="FileCheck" :ukuran="15" class="text-emerald-600" /><a :href="tb.arsip_pdf.tautan" target="_blank" rel="noopener" class="truncate text-biru underline">{{ tb.arsip_pdf.nama }}</a></p>
        <div v-if="auth.isAdmin" class="flex flex-wrap gap-2">
          <button class="tombol-garis" :disabled="menyimpan" @click="simpanIsian"><Ikon nama="Save" :ukuran="16" class="text-biru" /> Simpan</button>
          <button v-if="tb.status !== 'ditutup'" class="tombol-utama" :disabled="menyimpan || status(bulan) === 'nanti'" @click="tutupBuku"><Ikon nama="Lock" :ukuran="17" /> Tutup buku</button>
          <button v-else class="tombol-garis" @click="bukaKembali"><Ikon nama="LockOpen" :ukuran="16" class="text-amber-600" /> Buka kembali</button>
        </div>
      </section>
    </div>

    <CetakBuku v-if="cetak" :judul="judulLaporan" :subjudul="`Periode 1 – ${tanggalPanjang(akhir)}`" :kolom="kolom" :baris="barisBulan" :tanggal="akhir" kecil
               :ringkasan="[['Saldo awal bulan', r.saldo_awal], ['Jumlah penerimaan', r.masuk], ['Jumlah pengeluaran', r.keluar], ['Saldo akhir bulan', r.saldo_akhir], ['— saldo di bank', r.saldo_bank], ['— saldo kas tunai', r.saldo_tunai], ['Pajak belum disetor', terutang.reduce((s, p) => s + p.nilai, 0)],
                            ['Saldo menurut ARKAS', angka(isian.saldo_arkas) ?? '—'], ['Saldo menurut SIMAKDA', angka(isian.saldo_simakda) ?? '—'], ['Saldo menurut rekening koran', koran ? koran.saldo_akhir : '—']]"
               @tutup="cetak = false">
      <template #alat>
        <button v-if="auth.isAdmin" type="button" class="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700" :disabled="mengarsip" @click="arsipkan">
          <Ikon :nama="mengarsip ? 'RefreshCw' : 'CloudUpload'" :ukuran="16" :class="mengarsip && 'animate-spin'" /> <span class="hidden sm:inline">Arsip ke Drive</span></button>
      </template>
    </CetakBuku>
  </div>
</template>
