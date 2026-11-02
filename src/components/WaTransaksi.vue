<script setup>
// WhatsApp dari satu transaksi belanja/honor: kirim ke pengguna anggaran, rekanan, pemeriksa, penerima honor,
// atau nomor lain — kekurangan laporan, progres, dana sudah ditransfer, minta nota, atau pesan bebas.
// Pesan bisa diubah sebelum dibuka di WhatsApp; setiap pesan tercatat di riwayat transaksi.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { pakaiWa } from '@/views/whatsapp/pakaiWa'
import { useAuth } from '@/stores/auth'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { muatBahan } from '@/services/bahanBelanja'
import { simpanPenggunaAnggaran } from '@/services/belanja'
import { SEMUA_JENIS_WA, samarRekening, nomorWa } from '@/utils/wa'
import { kelengkapan } from '@/utils/belanja'
import { rupiah, tanggalPanjang, formatWaktuRelatif } from '@/utils/format'
import { formatWa } from '@/utils/validasi'
import Ikon from './Ikon.vue'

const props = defineProps({ b: { type: Object, required: true } })
const emit = defineEmits(['tutup', 'ubah'])
const wa = pakaiWa()
const auth = useAuth()
const belanja = useBelanja()
const notif = useNotifikasi()
const bahan = ref({ pegawai: [], rekanan: [], orangLuar: [] })
onMounted(async () => {
  document.body.style.overflow = 'hidden'
  await wa.muat().catch(() => {})
  bahan.value = await muatBahan({ rahasia: auth.isAdmin }).catch(() => bahan.value)
})
onBeforeUnmount(() => { document.body.style.overflow = '' })

const nm = (p) => (p ? [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? `, ${p.gelar}` : '') : '')
const peg = (id) => bahan.value.pegawai.find((p) => p.id === id)
const rek = computed(() => bahan.value.rekanan.find((r) => r.id === props.b.id_rekanan) || props.b.rekanan || null)

// Daftar tujuan untuk transaksi ini
const tujuan = computed(() => {
  const t = []
  const pa = props.b.pengguna_anggaran
  if (pa?.nama) { const p = pa.id ? peg(pa.id) : null; t.push({ k: 'pa', peran: 'Pengguna anggaran', nama: pa.nama, no: p?.no_wa || pa.no_wa, ikon: 'UserCheck', data: p }) }
  if (rek.value && props.b.jenis !== 'honor') t.push({ k: 'rek', peran: 'Rekanan', nama: rek.value.pemilik || rek.value.nama_usaha, usaha: rek.value.nama_usaha, no: rek.value.no_wa, ikon: 'Store', data: rek.value })
  if (props.b.pemeriksa?.nama) { const p = props.b.pemeriksa.id ? peg(props.b.pemeriksa.id) : null; t.push({ k: 'pem', peran: 'Pemeriksa barang', nama: nm(props.b.pemeriksa), no: p?.no_wa, ikon: 'ClipboardCheck', data: p }) }
  ;(props.b.penerima || []).forEach((x, i) => {
    const p = x.sumber === 'luar' ? bahan.value.orangLuar.find((o) => o.id === x.id || o.nama === x.nama) : peg(x.id)
    t.push({ k: `pn${i}`, peran: 'Penerima', nama: x.nama, no: p?.no_wa, ikon: 'HandCoins', data: p, penerima: x })
  })
  return t
})
const pilih = ref('')
const manual = ref({ nama: '', no: '' })
watch(tujuan, (t) => { if (!pilih.value && t.length) pilih.value = t[0].k; if (!t.length) pilih.value = 'lain' }, { immediate: true })
const tj = computed(() => (pilih.value === 'lain' ? { k: 'lain', peran: 'Nomor lain', nama: manual.value.nama, no: manual.value.no } : tujuan.value.find((x) => x.k === pilih.value) || null))

// Pengguna anggaran (disimpan ke transaksi)
const ubahPa = ref(false)
async function setPa(id) {
  const p = peg(id)
  try {
    const baru = await simpanPenggunaAnggaran(props.b, p ? { id: p.id, nama: nm(p), no_wa: p.no_wa, jabatan: p.jabatan } : null)
    belanja.ganti(baru); emit('ubah', baru); ubahPa.value = false; pilih.value = 'pa'
  } catch (e) { notif.kabari(e.message, 'galat') }
}

// Jenis pesan yang cocok dengan transaksi
const kurang = computed(() => kelengkapan(props.b).filter((x) => !x.ok))
const jenisPilihan = computed(() => [
  ...(kurang.value.length ? ['kelengkapan'] : []), 'progres',
  ...(props.b.status === 'lunas' ? ['transfer'] : []),
  ...(props.b.jenis !== 'honor' ? ['nota'] : []), 'bebas',
])
const jenis = ref('')
watch(jenisPilihan, (j) => { if (!j.includes(jenis.value)) jenis.value = j[0] }, { immediate: true })
const tambahan = ref('')

const progres = computed(() => {
  const b = props.b
  const baris = []
  if (b.tgl_pesanan) baris.push(`• Dipesan: ${tanggalPanjang(b.tgl_pesanan)}`)
  if (b.tgl_terima) baris.push(`• Diterima/BAST: ${tanggalPanjang(b.tgl_terima)}`)
  if (b.tgl_kegiatan) baris.push(`• Kegiatan: ${tanggalPanjang(b.tgl_kegiatan)}`)
  baris.push(b.tgl_lunas ? `• Dibayar: ${tanggalPanjang(b.tgl_lunas)}` : '• Pembayaran: belum')
  baris.push(kurang.value.length ? `• Dokumen yang masih kurang: ${kurang.value.map((x) => x.judul).join(', ')}` : '• Dokumen SPJ: lengkap')
  return baris.join('\n')
})
const nominalTransfer = computed(() => {
  const b = props.b
  if (tj.value?.penerima) return tj.value.penerima.diterima
  const potong = (b.pajak || []).filter((p) => (p.cara ? !['mitra', 'luar'].includes(p.cara) : b.cara !== 'siplah')).reduce((s, p) => s + (p.nilai || 0), 0)
  return (b.total || 0) - potong
})
const pesanOtomatis = computed(() => {
  const b = props.b
  const t = tj.value || {}
  const d = t.data || {}
  return wa.teks(jenis.value, {
    nama: t.nama || 'Bapak/Ibu', usaha: t.usaha || rek.value?.nama_usaha || '', pekerjaan: b.nama_pekerjaan, nominal: rupiah(jenis.value === 'transfer' ? nominalTransfer.value : b.total),
    tanggal: tanggalPanjang(b.tgl_lunas || b.tgl_terima || b.tgl_pesanan), kekurangan: kurang.value.map((x) => `• ${x.judul}${x.ket ? ` (${x.ket})` : ''}`).join('\n') || '• (tidak ada)',
    progres: progres.value, pesan: tambahan.value, bank: d.bank || '', rekening: samarRekening(d.no_rekening), atas_nama: d.atas_nama_rekening || t.nama || '',
    bendahara: auth.pengguna?.nama || 'Bendahara', sekolah: 'UPT SPF SMP Negeri 19 Makassar',
  })
})
const draf = ref('')
const diubah = ref(false)
watch(pesanOtomatis, (v) => { if (!diubah.value) draf.value = v }, { immediate: true })
function kembalikan() { diubah.value = false; draf.value = pesanOtomatis.value }

async function kirim() {
  await wa.kirim({ jenis: jenis.value, nama: tj.value?.nama, no: tj.value?.no, pesan: draf.value, ref: props.b.id })
  diubah.value = false
}
const riwayat = computed(() => wa.riwayat.value.filter((x) => String(x.ref || '').split('|')[0] === props.b.id).slice(0, 10))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-end bg-slate-900/45 sm:items-center sm:justify-center sm:p-4" @click.self="emit('tutup')">
      <div class="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-label="Kirim WhatsApp">
        <!-- Kepala -->
        <div class="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="MessageCircle" :ukuran="20" /></span>
          <div class="min-w-0 flex-1"><p class="font-bold">WhatsApp transaksi</p><p class="truncate text-xs text-slate-500">{{ props.b.nama_pekerjaan }} · {{ rupiah(props.b.total) }}</p></div>
          <button class="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="20" /></button>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          <!-- Tujuan -->
          <section>
            <p class="label">Kirim kepada</p>
            <div class="grid gap-2">
              <label v-for="t in tujuan" :key="t.k" :class="['flex cursor-pointer items-center gap-3 rounded-xl border p-2.5', pilih === t.k ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700']">
                <input v-model="pilih" type="radio" :value="t.k" class="sr-only" />
                <Ikon :nama="t.ikon" :ukuran="17" :class="pilih === t.k ? 'text-emerald-600' : 'text-slate-400'" />
                <span class="min-w-0 flex-1"><b class="block truncate text-sm">{{ t.nama || '—' }}</b><span class="text-xs text-slate-500">{{ t.peran }} · {{ nomorWa(t.no) ? formatWa(nomorWa(t.no)) : 'nomor WA belum ada' }}</span></span>
              </label>
              <label :class="['flex cursor-pointer items-center gap-3 rounded-xl border p-2.5', pilih === 'lain' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700']">
                <input v-model="pilih" type="radio" value="lain" class="sr-only" /><Ikon nama="Phone" :ukuran="17" class="text-slate-400" /><span class="text-sm font-semibold">Nomor lain</span>
              </label>
              <div v-if="pilih === 'lain'" class="grid grid-cols-2 gap-2">
                <input v-model="manual.nama" class="masukan py-2" placeholder="Nama" aria-label="Nama penerima" />
                <input v-model="manual.no" class="masukan kode py-2" inputmode="tel" placeholder="08…" aria-label="Nomor WhatsApp" />
              </div>
            </div>
            <div v-if="auth.isAdmin" class="mt-2">
              <button v-if="!ubahPa" class="text-xs font-semibold text-biru hover:underline" @click="ubahPa = true"><Ikon nama="UserCheck" :ukuran="13" class="inline" /> {{ props.b.pengguna_anggaran?.nama ? 'Ganti pengguna anggaran' : 'Tetapkan pengguna anggaran (penanggung jawab kegiatan)' }}</button>
              <select v-else class="masukan py-2 text-sm" aria-label="Pengguna anggaran" @change="setPa($event.target.value)">
                <option value="">Pilih pegawai…</option><option v-for="p in bahan.pegawai.filter((x) => x.aktif !== false)" :key="p.id" :value="p.id">{{ p.nama }}{{ p.jabatan ? ` — ${p.jabatan}` : '' }}</option>
              </select>
            </div>
          </section>

          <!-- Jenis -->
          <section>
            <p class="label">Isi pesan</p>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="j in jenisPilihan" :key="j" @click="jenis = j; diubah = false"
                      :class="['flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold', jenis === j ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300']">
                <Ikon :nama="SEMUA_JENIS_WA[j].ikon" :ukuran="14" /> {{ SEMUA_JENIS_WA[j].judul }}
              </button>
            </div>
            <input v-if="['progres', 'bebas'].includes(jenis)" v-model="tambahan" class="masukan mt-2 py-2 text-sm" :placeholder="jenis === 'bebas' ? 'Tulis pesan…' : 'Catatan tambahan (opsional)'" aria-label="Pesan tambahan" />
            <textarea v-model="draf" rows="9" class="masukan mt-2 text-sm" aria-label="Pratinjau pesan" @input="diubah = true" />
            <button v-if="diubah" class="mt-1 text-xs font-semibold text-slate-500 hover:underline" @click="kembalikan"><Ikon nama="Undo2" :ukuran="13" class="inline" /> Kembalikan pesan otomatis</button>
          </section>

          <!-- Riwayat -->
          <section v-if="riwayat.length">
            <p class="label">Riwayat pesan transaksi ini</p>
            <ul class="space-y-1.5">
              <li v-for="x in riwayat" :key="x.id" class="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-800/50">
                <Ikon :nama="SEMUA_JENIS_WA[x.jenis]?.ikon || 'MessageCircle'" :ukuran="13" class="text-emerald-600" />
                <span class="min-w-0 flex-1 truncate"><b>{{ x.nama || '—' }}</b> · {{ SEMUA_JENIS_WA[x.jenis]?.judul }}</span>
                <span class="shrink-0 text-slate-400">{{ formatWaktuRelatif(x.waktu) }}</span>
              </li>
            </ul>
          </section>
        </div>

        <div class="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <button class="tombol-garis flex-1" @click="emit('tutup')">Tutup</button>
          <button class="tombol flex-[2] bg-emerald-600 text-white hover:bg-emerald-700" :disabled="!draf.trim() || (pilih === 'lain' && !nomorWa(manual.no))" @click="kirim"><Ikon nama="Send" :ukuran="17" /> Buka WhatsApp</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
