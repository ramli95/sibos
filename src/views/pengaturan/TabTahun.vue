<script setup>
// Tahun anggaran aktif & arsip. Peralihan tahun: tahun lama otomatis menjadi arsip (tetap bisa dibuka),
// sisa saldo bank/tunai dapat dibawa sebagai saldo awal tahun baru (Permendagri 3/2023: sisa dana tetap di rekening).
import { ref, computed, onMounted } from 'vue'
import { useTahun } from '@/stores/tahun'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useNotifikasi } from '@/stores/notifikasi'
import { rupiah, tanggalPanjang } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import SalinTahun from './SalinTahun.vue'

const ta = useTahun()
const kas = useKas()
const belanja = useBelanja()
const notif = useNotifikasi()
const memuat = ref(true)
onMounted(async () => { await ta.muat({ segar: true }); await kas.muat({ tahun: ta.aktif }); memuat.value = false })

const baru = computed(() => ta.aktif + 1)
const bawaSaldo = ref(true)
const des = computed(() => kas.tutupBulan(`${ta.aktif}-12`))
const periksa = computed(() => [
  { judul: 'Semua transaksi Lunas', ok: !belanja.daftar.some((b) => b.status !== 'lunas'), ket: `${belanja.daftar.filter((b) => b.status !== 'lunas').length} transaksi belum lunas` },
  { judul: 'Pajak sudah disetor', ok: !kas.terutang.length, ket: kas.terutang.length ? `${kas.terutang.length} kewajiban ${rupiah(kas.totalTerutang)}` : 'Tidak ada pajak terutang' },
  { judul: 'Buku Desember ditutup', ok: des.value?.status === 'ditutup', ket: des.value?.status === 'ditutup' ? `Ditutup ${tanggalPanjang(des.value.ditutup_pada)}` : 'Belum ditutup (Buku Kas → Tutup Buku)' },
])
const saldoAwal = computed(() => [
  ...(kas.saldoBank ? [{ jenis: 'saldo_awal', sumber: 'bank', nilai: kas.saldoBank, uraian: `Saldo awal (sisa Dana BOSP TA ${ta.aktif}) — rekening bank` }] : []),
  ...(kas.saldoTunai ? [{ jenis: 'saldo_awal', sumber: 'tunai', nilai: kas.saldoTunai, uraian: `Saldo awal (sisa Dana BOSP TA ${ta.aktif}) — kas tunai` }] : []),
])
const menyimpan = ref(false)
async function alihkan() {
  const kurang = periksa.value.filter((p) => !p.ok).map((p) => `• ${p.judul}: ${p.ket}`)
  if (!confirm(`Alihkan tahun aktif ke TA ${baru.value}?\n\nTA ${ta.aktif} menjadi arsip (tetap bisa dibuka).${bawaSaldo.value && saldoAwal.value.length ? `\nSaldo awal TA ${baru.value}: ${saldoAwal.value.map((s) => `${s.sumber} ${rupiah(s.nilai)}`).join(', ')}` : ''}${kurang.length ? `\n\nMasih ada catatan:\n${kurang.join('\n')}` : ''}`)) return
  menyimpan.value = true
  try {
    await ta.alihkan(baru.value, { saldoAwal: bawaSaldo.value ? saldoAwal.value : [] })
    await kas.muat({ tahun: ta.aktif })
    notif.kabari(`Tahun aktif sekarang TA ${ta.aktif}. TA ${ta.aktif - 1} tersimpan sebagai arsip.`)
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function kembalikan(t) {
  if (!confirm(`Jadikan TA ${t} sebagai tahun aktif lagi? Tidak ada data yang dihapus.`)) return
  try { await ta.alihkan(t); await kas.muat({ tahun: t }); notif.kabari(`Tahun aktif dikembalikan ke TA ${t}.`) } catch (e) { notif.kabari(e.message, 'galat') }
}
</script>

<template>
  <div class="space-y-5">
    <section class="kartu flex flex-wrap items-center gap-4 p-5">
      <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl ikon-chip-tosca"><Ikon nama="CalendarRange" :ukuran="26" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-biru dark:text-blue-300">Tahun anggaran aktif</p>
        <p class="text-2xl font-extrabold">TA {{ ta.aktif }}</p>
        <p class="text-sm text-slate-500">Semua menu membuka tahun ini secara bawaan. Tahun sebelumnya otomatis menjadi arsip.</p>
      </div>
    </section>

    <section class="kartu p-5">
      <h3 class="mb-3 flex items-center gap-2 font-bold"><Ikon nama="Archive" :ukuran="18" class="text-biru" /> Daftar tahun</h3>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="t in ta.daftar" :key="t" class="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <span :class="['grid h-10 w-10 place-items-center rounded-xl', ta.statusTahun(t) === 'aktif' ? 'ikon-chip-sukses' : ta.statusTahun(t) === 'arsip' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : 'ikon-chip-kuning']">
            <Ikon :nama="ta.statusTahun(t) === 'aktif' ? 'BadgeCheck' : ta.statusTahun(t) === 'arsip' ? 'Archive' : 'CalendarPlus'" :ukuran="18" /></span>
          <div class="min-w-0 flex-1"><p class="font-bold">TA {{ t }}</p><p class="text-xs text-slate-500">{{ { aktif: 'Aktif', arsip: 'Arsip — bisa dibuka & dicetak', berikutnya: 'Berikutnya — untuk menyiapkan RKAS' }[ta.statusTahun(t)] }}</p></div>
          <button v-if="ta.statusTahun(t) === 'arsip'" class="tombol-garis px-2.5 py-1.5 text-xs" @click="kembalikan(t)"><Ikon nama="Undo2" :ukuran="14" class="text-biru" /> Aktifkan</button>
        </div>
      </div>
    </section>

    <SalinTahun :dari="ta.aktif" :ke="baru" :key="ta.aktif" />

    <section class="kartu space-y-4 p-5">
      <h3 class="flex items-center gap-2 font-bold"><Ikon nama="ArrowRight" :ukuran="18" class="text-[#22A08D]" /> Alihkan ke TA {{ baru }}</h3>
      <div v-if="memuat" class="text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memeriksa TA {{ ta.aktif }}…</div>
      <template v-else>
        <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <div v-for="p in periksa" :key="p.judul" class="flex items-center gap-3 p-3">
            <span :class="['grid h-8 w-8 place-items-center rounded-lg', p.ok ? 'ikon-chip-sukses' : 'ikon-chip-peringatan']"><Ikon :nama="p.ok ? 'CircleCheck' : 'TriangleAlert'" :ukuran="16" /></span>
            <div><p class="text-sm font-semibold">{{ p.judul }}</p><p class="text-xs text-slate-500">{{ p.ket }}</p></div>
          </div>
        </div>
        <label class="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <input v-model="bawaSaldo" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#1A56DB]" />
          <span>Catat sisa saldo TA {{ ta.aktif }} sebagai <b>saldo awal TA {{ baru }}</b> per 1 Januari:
            <span v-if="!saldoAwal.length" class="text-slate-500">(saldo nol)</span>
            <span v-for="s in saldoAwal" :key="s.sumber" class="block angka">{{ s.sumber === 'bank' ? 'Bank' : 'Tunai' }} {{ rupiah(s.nilai) }}</span></span>
        </label>
        <p class="text-xs text-slate-500">Peralihan tidak menghapus apa pun. RKAS, belanja, pajak dan buku kas TA {{ ta.aktif }} tetap tersimpan sebagai arsip dan bisa dibuka lewat pilihan tahun di setiap menu. Nomor surat/kwitansi TA {{ baru }} mulai dari 1.</p>
        <button class="tombol-utama" :disabled="menyimpan" @click="alihkan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'CalendarRange'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Alihkan ke TA {{ baru }}</button>
      </template>
    </section>

    <section v-if="ta.riwayat.length" class="kartu p-5">
      <h3 class="mb-2 flex items-center gap-2 font-bold"><Ikon nama="History" :ukuran="18" class="text-biru" /> Riwayat peralihan</h3>
      <p v-for="(r, i) in [...ta.riwayat].reverse()" :key="i" class="text-sm">TA {{ r.dari }} → TA {{ r.ke }} · {{ tanggalPanjang(r.waktu) }}</p>
    </section>
  </div>
</template>
