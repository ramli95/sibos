<script setup>
// Kirim pesan WhatsApp siap kirim (wa.me): kelengkapan SPJ, konfirmasi transfer, pesan ke rekanan, pengingat KGB.
// "Kirim ke semua" membuka antrean: setiap ketukan membuka satu percakapan (aturan peramban: satu jendela per ketukan).
import { ref, computed, onMounted } from 'vue'
import { pakaiWa } from './pakaiWa'
import { useBelanja } from '@/stores/belanja'
import { useGaji, namaLengkap } from '@/stores/gaji'
import { useAuth } from '@/stores/auth'
import { muatBahan } from '@/services/bahanBelanja'
import { JENIS_WA, samarRekening, nomorWa } from '@/utils/wa'
import { kelengkapan, persenLengkap } from '@/utils/belanja'
import { rupiah, tanggalPanjang, keIso } from '@/utils/format'
import { formatWa } from '@/utils/validasi'
import Ikon from '@/components/Ikon.vue'

const wa = pakaiWa()
const belanja = useBelanja()
const gaji = useGaji()
const auth = useAuth()
const bahan = ref({ pegawai: [], rekanan: [], orangLuar: [] })
const jenis = ref('kelengkapan')
const memuat = ref(true)
const hariTransfer = ref(30)
const pesanRekanan = ref('Mohon kiriman nota/faktur asli dan foto barang untuk pesanan kami. Bila ada pertanyaan, silakan hubungi kami.')
onMounted(async () => {
  try {
    await Promise.all([wa.muat(), belanja.muat(), gaji.muat().catch(() => {})])
    bahan.value = await muatBahan({ segar: true, rahasia: true })
  } finally { memuat.value = false }
})

const dasar = computed(() => ({ bendahara: auth.pengguna?.nama || 'Bendahara', sekolah: 'UPT SPF SMP Negeri 19 Makassar' }))
// Yang ditransfer ke rekanan = total − pajak yang dipungut/dipotong sekolah (SIPLah: pajak diurus mitra)
const potongSekolah = (b, p) => (p.cara ? !['mitra', 'luar'].includes(p.cara) : b.cara !== 'siplah')
const cariPegawai = (id) => bahan.value.pegawai.find((p) => p.id === id)
const cariRekanan = (b) => bahan.value.rekanan.find((r) => r.id === b.id_rekanan) || b.rekanan || null
const nm = (p) => (p ? [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? `, ${p.gelar}` : '') : '')

// Pilihan tujuan manual per baris (kunci baris → { nama, no })
const ganti = ref({})
const opsiTujuan = computed(() => [
  ...bahan.value.pegawai.filter((p) => p.aktif !== false).map((p) => ({ k: `p:${p.id}`, label: `Pegawai: ${p.nama}`, nama: nm(p), no: p.no_wa })),
  ...bahan.value.rekanan.filter((r) => r.aktif !== false).map((r) => ({ k: `r:${r.id}`, label: `Rekanan: ${r.nama_usaha}`, nama: r.pemilik || r.nama_usaha, no: r.no_wa })),
])
function pilihTujuan(baris, k) { const o = opsiTujuan.value.find((x) => x.k === k); if (o) ganti.value = { ...ganti.value, [baris]: { nama: o.nama, no: o.no } } }

const daftar = computed(() => {
  const d = dasar.value
  if (jenis.value === 'kelengkapan') {
    return belanja.daftar.filter((b) => b.status === 'lunas').map((b) => {
      const c = kelengkapan(b)
      const persen = b.persen_lengkap ?? persenLengkap(c)
      if (persen >= 100) return null
      const r = b.jenis !== 'honor' ? cariRekanan(b) : null
      const pem = b.pemeriksa?.id ? cariPegawai(b.pemeriksa.id) : null
      const tujuan = ganti.value[b.id] || (r?.no_wa ? { nama: r.pemilik || r.nama_usaha, no: r.no_wa } : pem ? { nama: nm(pem), no: pem.no_wa } : { nama: r?.nama_usaha || '', no: '' })
      const kurang = c.filter((x) => !x.ok).map((x) => `• ${x.judul}${x.ket ? ` (${x.ket})` : ''}`).join('\n')
      return { kunci: b.id, judul: b.nama_pekerjaan, sub: `${persen}% lengkap · lunas ${tanggalPanjang(b.tgl_lunas)}`, ...tujuan, bisaGanti: true,
        pesan: wa.teks('kelengkapan', { ...d, nama: tujuan.nama || 'Bapak/Ibu', pekerjaan: b.nama_pekerjaan, tanggal: tanggalPanjang(b.tgl_lunas), nominal: rupiah(b.total), kekurangan: kurang }) }
    }).filter(Boolean)
  }
  if (jenis.value === 'transfer') {
    const batas = keIso(new Date(Date.now() - hariTransfer.value * 86400000))
    const out = []
    belanja.daftar.filter((b) => b.status === 'lunas' && b.cara_bayar !== 'tunai' && b.tgl_lunas >= batas).forEach((b) => {
      if (b.jenis === 'honor') {
        (b.penerima || []).forEach((p, i) => {
          const asal = p.sumber === 'luar' ? bahan.value.orangLuar.find((o) => o.id === p.id || o.nama === p.nama) : cariPegawai(p.id)
          out.push({ kunci: `${b.id}|${i}`, judul: `${p.nama} — ${b.nama_pekerjaan}`, sub: `${rupiah(p.diterima)} · ${tanggalPanjang(b.tgl_lunas)}`, nama: p.nama, no: asal?.no_wa || '',
            pesan: wa.teks('transfer', { ...d, nama: p.nama, pekerjaan: b.nama_pekerjaan, nominal: rupiah(p.diterima), tanggal: tanggalPanjang(b.tgl_lunas), bank: asal?.bank || '', rekening: samarRekening(asal?.no_rekening), atas_nama: asal?.atas_nama_rekening || p.nama }) })
        })
      } else {
        const r = cariRekanan(b)
        const neto = (b.total || 0) - (b.pajak || []).filter((p) => potongSekolah(b, p)).reduce((s, p) => s + (p.nilai || 0), 0)
        out.push({ kunci: b.id, judul: `${r?.nama_usaha || 'Rekanan'} — ${b.nama_pekerjaan}`, sub: `${rupiah(neto)} · ${tanggalPanjang(b.tgl_lunas)}`, nama: r?.pemilik || r?.nama_usaha || '', no: r?.no_wa || '',
          pesan: wa.teks('transfer', { ...d, nama: r?.pemilik || r?.nama_usaha || 'Bapak/Ibu', pekerjaan: b.nama_pekerjaan, nominal: rupiah(neto), tanggal: tanggalPanjang(b.tgl_lunas), bank: r?.bank || '', rekening: samarRekening(r?.no_rekening), atas_nama: r?.atas_nama_rekening || r?.nama_usaha || '' }) })
      }
    })
    return out.sort((a, b) => b.sub.localeCompare(a.sub))
  }
  if (jenis.value === 'rekanan') {
    return bahan.value.rekanan.filter((r) => r.aktif !== false).map((r) => ({ kunci: r.id, judul: r.nama_usaha, sub: r.pemilik || r.alamat || '', nama: r.pemilik || r.nama_usaha, no: r.no_wa,
      pesan: wa.teks('rekanan', { ...d, nama: r.pemilik || 'Bapak/Ibu', usaha: r.nama_usaha, pesan: pesanRekanan.value }) }))
  }
  return gaji.kgbH30.map((x) => ({ kunci: x.p.id, judul: namaLengkap(x.p), sub: `Jatuh tempo ${tanggalPanjang(x.jatuh_tempo)} · ${x.st.label}`, nama: namaLengkap(x.p), no: x.p.no_wa || cariPegawai(x.p.id)?.no_wa || '',
    pesan: wa.teks('kgb', { ...d, nama: namaLengkap(x.p), tmt: tanggalPanjang(x.jatuh_tempo), gaji_baru: x.gaji_pokok_baru ? rupiah(x.gaji_pokok_baru) : '' }) }))
})
const adaNomor = computed(() => daftar.value.filter((x) => nomorWa(x.no)))
const jumlahPer = computed(() => Object.fromEntries(Object.keys(JENIS_WA).map((k) => [k, k === jenis.value ? daftar.value.length : null])))

// Pratinjau & ubah pesan sebelum dikirim
const buka = ref(null)
const draf = ref('')
function lihat(x) { buka.value = x; draf.value = x.pesan }
async function kirimSatu(x, teks = x.pesan) { await wa.kirim({ jenis: jenis.value, nama: x.nama, no: x.no, pesan: teks, ref: x.kunci }) }

// Antrean kirim ke semua
const antrean = ref(null)
function mulaiAntrean() { antrean.value = { daftar: adaNomor.value, ke: 0 } }
async function kirimBerikut() {
  const a = antrean.value
  await kirimSatu(a.daftar[a.ke])
  if (a.ke + 1 >= a.daftar.length) antrean.value = null; else a.ke++
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-2 lg:grid-cols-4" role="radiogroup" aria-label="Jenis pesan" data-tur="wa-jenis">
      <button v-for="(j, k) in JENIS_WA" :key="k" role="radio" :aria-checked="jenis === k" @click="jenis = k"
              :class="['kartu flex items-center gap-3 p-3 text-left transition', jenis === k ? 'ring-2 ring-[#22A08D]' : 'hover:shadow-md']">
        <span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-xl', j.warna]"><Ikon :nama="j.ikon" :ukuran="19" /></span>
        <span class="min-w-0"><b class="block text-sm leading-tight">{{ j.judul }}</b><span class="text-xs text-slate-500">{{ jumlahPer[k] != null ? `${jumlahPer[k]} tujuan` : 'Lihat' }}</span></span>
      </button>
    </div>

    <div class="kartu flex flex-wrap items-center gap-3 p-3">
      <p class="min-w-[12rem] flex-1 text-sm text-slate-600 dark:text-slate-300">{{ JENIS_WA[jenis].ket }}</p>
      <label v-if="jenis === 'transfer'" class="flex items-center gap-2 text-sm">Lunas
        <select v-model.number="hariTransfer" class="masukan w-auto py-1.5"><option :value="7">7 hari</option><option :value="30">30 hari</option><option :value="90">90 hari</option><option :value="366">setahun</option></select> terakhir</label>
      <button class="tombol-utama" :disabled="!adaNomor.length" @click="mulaiAntrean"><Ikon nama="Send" :ukuran="17" /> Kirim ke semua ({{ adaNomor.length }})</button>
    </div>
    <div v-if="jenis === 'rekanan'" class="kartu p-3">
      <label class="label" for="pesan-rek">Isi pesan untuk {pesan}</label>
      <textarea id="pesan-rek" v-model="pesanRekanan" rows="2" class="masukan" />
    </div>

    <section class="kartu overflow-hidden" data-tur="wa-daftar">
      <p v-if="memuat" class="p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="mx-auto mb-2 animate-spin text-biru" /> Memuat…</p>
      <p v-else-if="!daftar.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="CircleCheck" class="mx-auto mb-2 text-emerald-500" /> Tidak ada yang perlu dikirimi pesan.</p>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="x in daftar" :key="x.kunci" class="flex flex-wrap items-center gap-3 px-4 py-3">
          <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-full', nomorWa(x.no) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800']"><Ikon :nama="nomorWa(x.no) ? 'MessageCircle' : 'Phone'" :ukuran="17" /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ x.judul }}</p>
            <p class="truncate text-xs text-slate-500">{{ x.sub }} · {{ x.nama || 'tanpa nama' }} {{ nomorWa(x.no) ? formatWa(nomorWa(x.no)) : '· nomor WA belum ada' }}</p>
          </div>
          <select v-if="x.bisaGanti" class="masukan w-auto max-w-[11rem] py-1 text-xs" :aria-label="`Ganti tujuan ${x.judul}`" @change="pilihTujuan(x.kunci, $event.target.value); $event.target.value = ''">
            <option value="">Ganti tujuan…</option><option v-for="o in opsiTujuan" :key="o.k" :value="o.k">{{ o.label }}</option>
          </select>
          <button class="tombol-garis px-2.5 py-1.5 text-xs" @click="lihat(x)"><Ikon nama="Eye" :ukuran="15" class="text-biru" /> Pesan</button>
          <button class="tombol bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700" @click="kirimSatu(x)"><Ikon nama="Send" :ukuran="15" /> Kirim</button>
        </li>
      </ul>
    </section>

    <!-- Pratinjau pesan -->
    <Teleport to="body">
      <div v-if="buka" class="fixed inset-0 z-[70] grid place-items-end bg-slate-900/40 p-0 sm:place-items-center sm:p-4" @click.self="buka = null">
        <div class="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl dark:bg-slate-900">
          <div class="mb-3 flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="MessageCircle" :ukuran="19" /></span>
            <div class="min-w-0 flex-1"><p class="truncate font-bold">{{ buka.nama || 'Pilih kontak di WhatsApp' }}</p><p class="text-xs text-slate-500">{{ nomorWa(buka.no) ? formatWa(nomorWa(buka.no)) : 'Nomor belum ada — WhatsApp akan meminta Bapak memilih kontak' }}</p></div>
            <button class="text-slate-400" aria-label="Tutup" @click="buka = null"><Ikon nama="X" :ukuran="20" /></button>
          </div>
          <textarea v-model="draf" rows="11" class="masukan text-sm" aria-label="Isi pesan" />
          <div class="mt-3 flex justify-end gap-2">
            <button class="tombol-garis" @click="buka = null">Batal</button>
            <button class="tombol bg-emerald-600 text-white hover:bg-emerald-700" @click="kirimSatu(buka, draf); buka = null"><Ikon nama="Send" :ukuran="17" /> Buka WhatsApp</button>
          </div>
        </div>
      </div>

      <!-- Antrean kirim ke semua -->
      <div v-if="antrean" class="fixed inset-0 z-[70] grid place-items-center bg-slate-900/40 p-4">
        <div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
          <p class="text-xs font-semibold uppercase tracking-wider text-[#167A6B]">Kirim ke semua</p>
          <p class="mt-1 text-3xl font-extrabold">{{ antrean.ke + 1 }} <span class="text-base font-semibold text-slate-400">/ {{ antrean.daftar.length }}</span></p>
          <p class="mt-2 truncate font-bold">{{ antrean.daftar[antrean.ke].nama }}</p>
          <p class="truncate text-xs text-slate-500">{{ antrean.daftar[antrean.ke].judul }}</p>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full bg-emerald-500 transition-all" :style="{ width: `${(antrean.ke / antrean.daftar.length) * 100}%` }" /></div>
          <p class="mt-3 text-xs text-slate-500">Tekan tombol, kirim di WhatsApp, lalu kembali ke SIBOS untuk tujuan berikutnya.</p>
          <div class="mt-4 flex justify-center gap-2">
            <button class="tombol-garis" @click="antrean = null">Berhenti</button>
            <button class="tombol bg-emerald-600 text-white hover:bg-emerald-700" @click="kirimBerikut"><Ikon nama="Send" :ukuran="17" /> Buka WhatsApp</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
