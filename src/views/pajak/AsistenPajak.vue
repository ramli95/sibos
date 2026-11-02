<script setup>
// Asisten Pajak: menjelaskan pajak satu transaksi menurut tabel aturan, lalu Bendahara menetapkan
// (ikut aturan) atau menyesuaikan nilainya secara manual.
import InputAngka from '@/components/InputAngka.vue'
import { ref, computed } from 'vue'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { ubahBelanjaKas } from '@/services/kas'
import { hitungPajak, peringatanPajak, aturan } from '@/utils/pajak'
import { salin } from '@/utils/belanja'
import { CARA_PAJAK, WARNA_PAJAK } from '@/config/pajak'
import { rupiah, tanggalPanjang } from '@/utils/format'
import Laci from '@/components/Laci.vue'
import Ikon from '@/components/Ikon.vue'

const props = defineProps({ belanja: { type: Object, required: true } })
const emit = defineEmits(['tutup', 'berubah'])
const belanjaStore = useBelanja()
const auth = useAuth()
const notif = useNotifikasi()

const b = computed(() => props.belanja)
const usulan = computed(() => hitungPajak(b.value))
const peringatan = computed(() => peringatanPajak(b.value))
const tersimpan = computed(() => b.value.pajak || [])
const sama = computed(() => JSON.stringify(usulan.value.map((p) => [p.jenis, p.nilai])) === JSON.stringify(tersimpan.value.filter((p) => p.nilai).map((p) => [p.jenis, p.nilai])))
const manual = ref(salin(tersimpan.value.length ? tersimpan.value : usulan.value))
const ubahManual = ref(false)
const menyimpan = ref(false)

async function simpan(pajak, pajak_manual, ket) {
  menyimpan.value = true
  try {
    const rapi = pajak.map((p) => ({ ...p, dasar: Math.round(Number(p.dasar) || 0), nilai: Math.round(Number(p.nilai) || 0), tarif: p.tarif === '' || p.tarif == null ? null : Number(p.tarif) })).filter((p) => p.nilai > 0)
    await ubahBelanjaKas(b.value, { pajak: rapi, pajak_manual }, ket)
    belanjaStore.ganti({ ...b.value, pajak: rapi, pajak_manual })
    notif.kabari('Pajak transaksi ditetapkan.')
    emit('berubah')
    emit('tutup')
  } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
const tetapkan = () => simpan(usulan.value, false, 'Menetapkan pajak sesuai aturan tarif')
const simpanManual = () => simpan(manual.value, true, 'Menyesuaikan pajak secara manual')
function tambahBaris() { manual.value.push({ kunci: 'manual' + manual.value.length, jenis: 'PPh 21', cara: 'potong', dasar: 0, tarif: '', nilai: 0, ket: 'Manual' }) }
const hitungUlang = (p) => { if (p.tarif !== '' && p.tarif != null) p.nilai = Math.round((Number(p.dasar) || 0) * Number(p.tarif) / 100) }
</script>

<template>
  <Laci judul="Asisten Pajak" :subjudul="b.nama_pekerjaan" ikon="Calculator" lebar="max-w-2xl" @tutup="emit('tutup')">
    <div class="space-y-5 p-4 sm:p-5">
      <div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Nilai</p><p class="angka font-bold">{{ rupiah(b.total) }}</p></div>
        <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Cara</p><p class="font-bold">{{ b.jenis === 'honor' ? 'Honor/transpor' : b.cara === 'siplah' ? 'SIPLah' : 'Non-SIPLah' }}</p></div>
        <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Penyedia</p><p class="truncate font-bold">{{ b.jenis === 'honor' ? `${(b.penerima || []).length} orang` : b.rekanan?.nama_usaha || '-' }}</p></div>
        <div class="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50"><p class="text-[11px] text-slate-500">Status penyedia</p>
          <p class="text-xs font-bold">{{ b.jenis === 'honor' ? '—' : `${b.rekanan?.status_pkp ? 'PKP' : 'Non-PKP'} · ${b.rekanan?.npwp ? 'ber-NPWP' : 'tanpa NPWP'} · ${b.rekanan?.bentuk_usaha === 'badan' ? 'badan' : 'orang pribadi'}` }}</p></div>
      </div>

      <div v-for="w in peringatan" :key="w" class="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><Ikon nama="TriangleAlert" :ukuran="17" class="mt-0.5 shrink-0" /> {{ w }}</div>

      <section>
        <h3 class="mb-2 flex items-center gap-2 text-sm font-bold"><span class="grid h-7 w-7 place-items-center rounded-lg ikon-chip-tosca"><Ikon nama="Wand2" :ukuran="15" /></span> Menurut aturan tarif (versi {{ aturan().versi || 1 }})</h3>
        <p v-if="!usulan.length" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Tidak ada pajak yang dipungut/dipotong untuk transaksi ini.</p>
        <div v-else class="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <div v-for="p in usulan" :key="p.kunci" class="flex items-start gap-3 p-3">
            <span :class="['lencana shrink-0', WARNA_PAJAK[p.jenis]]">{{ p.jenis }}</span>
            <div class="min-w-0 flex-1 text-sm">
              <p class="font-semibold">{{ p.ket }}</p>
              <p class="text-xs text-slate-500">{{ CARA_PAJAK[p.cara]?.label }} · DPP {{ rupiah(p.dasar) }}<template v-if="p.tarif != null"> × {{ p.tarif }}%</template><template v-if="p.kap"> · KAP {{ p.kap }}-{{ p.kjs }}</template></p>
            </div>
            <b class="angka shrink-0">{{ rupiah(p.nilai) }}</b>
          </div>
        </div>
        <div v-if="b.jenis === 'honor'" class="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
          <p v-for="(p, i) in b.penerima || []" :key="i" class="flex justify-between gap-2"><span class="truncate">{{ p.nama }} — {{ p.alasan_pph21 || `tarif ${p.tarif_pph21}%` }}</span><span class="angka shrink-0">{{ rupiah(p.bruto) }} → {{ rupiah(p.pph21) }}</span></p>
        </div>
      </section>

      <section>
        <h3 class="mb-2 flex items-center gap-2 text-sm font-bold"><span class="grid h-7 w-7 place-items-center rounded-lg ikon-chip"><Ikon nama="ReceiptText" :ukuran="15" /></span> Tersimpan di transaksi
          <span v-if="b.pajak_manual" class="lencana bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Manual</span>
          <span v-else-if="sama" class="lencana bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Sesuai aturan</span>
          <span v-else class="lencana bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Berbeda</span></h3>
        <p v-if="!tersimpan.length" class="text-sm text-slate-500">Belum ada pajak tersimpan.</p>
        <p v-for="p in tersimpan" :key="p.jenis + p.nilai" class="flex justify-between text-sm"><span>{{ p.jenis }} <span class="text-xs text-slate-500">{{ p.ket }}</span></span><b class="angka">{{ rupiah(p.nilai) }}</b></p>
      </section>

      <section v-if="auth.isAdmin && ubahManual" class="space-y-2">
        <h3 class="text-sm font-bold">Sesuaikan manual</h3>
        <div v-for="(p, i) in manual" :key="i" class="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[7rem_minmax(0,1fr)_5rem_minmax(0,1fr)_auto] dark:border-slate-700">
          <select v-model="p.jenis" class="masukan py-1.5" aria-label="Jenis pajak"><option v-for="j in ['PPN', 'PPh 21', 'PPh 22', 'PPh 23', 'PPh 4(2)']" :key="j">{{ j }}</option></select>
          <label class="text-[11px] text-slate-500">DPP<InputAngka v-model="p.dasar" class="masukan angka py-1.5" @update:model-value="hitungUlang(p)" /></label>
          <label class="text-[11px] text-slate-500">Tarif %<input v-model="p.tarif" type="number" step="any" class="masukan angka py-1.5" @input="hitungUlang(p)" /></label>
          <label class="text-[11px] text-slate-500">Nilai<InputAngka v-model="p.nilai" class="masukan angka py-1.5" /></label>
          <button class="self-end rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" aria-label="Hapus baris" @click="manual.splice(i, 1)"><Ikon nama="Trash2" :ukuran="16" /></button>
        </div>
        <button class="tombol-garis" @click="tambahBaris"><Ikon nama="Plus" :ukuran="16" class="text-biru" /> Tambah pajak</button>
      </section>
      <p class="text-xs text-slate-500">Lunas {{ tanggalPanjang(b.tgl_lunas) }}. Pajak dicatat terutang sejak tanggal lunas sampai disetor (kode billing & NTPN).</p>
    </div>
    <template v-if="auth.isAdmin" #kaki>
      <template v-if="!ubahManual">
        <button class="tombol-utama" :disabled="menyimpan" @click="tetapkan"><Ikon nama="BadgeCheck" :ukuran="17" /> Tetapkan sesuai aturan</button>
        <button class="tombol-garis" @click="ubahManual = true"><Ikon nama="Pencil" :ukuran="16" class="text-biru" /> Sesuaikan manual</button>
      </template>
      <template v-else>
        <button class="tombol-utama" :disabled="menyimpan" @click="simpanManual"><Ikon nama="Save" :ukuran="17" /> Simpan manual</button>
        <button class="tombol-garis" @click="ubahManual = false">Batal</button>
      </template>
      <RouterLink :to="`/belanja/lihat/${b.id}`" class="tombol ml-auto text-biru"><Ikon nama="ExternalLink" :ukuran="16" /> Transaksi</RouterLink>
    </template>
  </Laci>
</template>
