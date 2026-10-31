<script setup>
// BAST Bendahara → Pengurus Barang: pilih barang inventaris yang belum diserahkan, beri nomor surat otomatis,
// cetak F4 dengan tanda tangan Pihak Kedua, Pihak Pertama, dan Kepala Sekolah.
import { ref, reactive, computed } from 'vue'
import { useAset } from '@/stores/aset'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { KONDISI } from '@/config/aset'
import { simpanBast, hapusBast } from '@/services/aset'
import { formatRegister } from '@/utils/aset'
import { rupiah, tanggalPanjang, tanggalPendek } from '@/utils/format'
import Ikon from '@/components/Ikon.vue'
import Laci from '@/components/Laci.vue'
import CetakSurat from '@/components/cetak/CetakSurat.vue'
import DokBastBarang from '@/components/cetak/DokBastBarang.vue'

const aset = useAset()
const auth = useAuth()
const notif = useNotifikasi()
const bolehUbah = computed(() => auth.isAdmin)

const belum = computed(() => aset.aktif.filter((a) => !a.id_bast))
const form = ref(null)
const f = reactive({ id: null, nomor: '', tanggal: '', catatan: '', pilih: new Set() })
const menyimpan = ref(false)
function buka(b) {
  Object.assign(f, { id: b?.id || null, nomor: b?.nomor || '', tanggal: b?.tanggal || new Date().toISOString().slice(0, 10), catatan: b?.catatan ?? 'Barang dalam keadaan baik dan lengkap.', pilih: new Set(b?.id_aset || []) })
  form.value = b || {}
}
const calon = computed(() => aset.aktif.filter((a) => !a.id_bast || a.id_bast === f.id).sort((a, b) => String(b.tgl_perolehan).localeCompare(String(a.tgl_perolehan))))
function alih(id) { const s = new Set(f.pilih); s.has(id) ? s.delete(id) : s.add(id); f.pilih = s }
const terpilih = computed(() => calon.value.filter((a) => f.pilih.has(a.id)))
async function simpan() {
  if (!terpilih.value.length || !f.tanggal) return
  menyimpan.value = true
  const data = {
    nomor: f.nomor.trim(), tanggal: f.tanggal, catatan: f.catatan, id_aset: terpilih.value.map((a) => a.id),
    butir: terpilih.value.map((a) => ({ id_aset: a.id, nama: a.nama, merk: [a.merk, a.spesifikasi].filter(Boolean).join(', '), kode_barang: a.kode_barang || '', register: formatRegister(a), jumlah: a.jumlah, satuan: a.satuan, nilai: a.nilai, kondisi: a.kondisi })),
    nomor_urut: form.value?.nomor_urut || null,
  }
  try { await simpanBast(f.id, data, form.value?.id ? form.value : null); notif.kabari('BAST disimpan.'); form.value = null; await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
}
async function hapus(b) {
  if (!confirm(`Hapus BAST ${b.nomor}? Barangnya kembali berstatus belum diserahkan; nomor tidak dipakai ulang.`)) return
  try { await hapusBast(b); form.value = null; await aset.segarkan() } catch (e) { notif.kabari(e.message, 'galat') }
}
const cetak = ref(null)
</script>

<template>
  <div class="space-y-5">
    <div class="kartu flex flex-wrap items-center gap-3 p-3">
      <span class="grid h-10 w-10 place-items-center rounded-xl ikon-chip"><Ikon nama="PackageCheck" :ukuran="19" /></span>
      <div class="min-w-0 flex-1"><p class="font-bold">{{ aset.bast.length }} BAST tahun {{ aset.tahun }}</p><p class="text-xs text-slate-500">{{ belum.length }} catatan barang belum diserahkan ke Pengurus Barang</p></div>
      <button v-if="bolehUbah" class="tombol-utama" :disabled="!belum.length" @click="buka()" data-tur="bast-baru"><Ikon nama="Plus" :ukuran="17" /> BAST baru</button>
    </div>
    <p v-if="!bolehUbah" class="kartu p-3 text-sm text-slate-500"><Ikon nama="Info" :ukuran="15" class="inline text-biru" /> BAST dibuat oleh Bendahara (memakai nomor surat sekolah). Pengurus Barang dapat melihat dan mencetaknya.</p>

    <div class="space-y-2">
      <div v-for="b in aset.bast" :key="b.id" class="kartu flex flex-wrap items-center gap-3 p-4">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl ikon-chip-tosca"><Ikon nama="FileSignature" :ukuran="20" /></span>
        <div class="min-w-0 flex-1">
          <p class="kode text-sm font-semibold">{{ b.nomor }}</p>
          <p class="text-xs text-slate-500">{{ tanggalPanjang(b.tanggal) }} · {{ (b.butir || []).length }} barang · {{ rupiah((b.butir || []).reduce((s, x) => s + (x.nilai || 0), 0)) }}</p>
          <p class="line-clamp-1 text-xs text-slate-500">{{ (b.butir || []).map((x) => x.nama).join(', ') }}</p>
        </div>
        <div class="flex gap-2">
          <button class="tombol-garis" @click="cetak = b"><Ikon nama="Printer" :ukuran="16" class="text-biru" /> Cetak</button>
          <button v-if="bolehUbah" class="tombol-garis" :aria-label="`Ubah ${b.nomor}`" @click="buka(b)"><Ikon nama="Pencil" :ukuran="16" /></button>
        </div>
      </div>
      <p v-if="!aset.bast.length" class="kartu p-8 text-center text-sm text-slate-500">Belum ada BAST barang tahun ini.</p>
    </div>

    <Laci v-if="form" :judul="f.id ? 'Ubah BAST barang' : 'BAST barang baru'" :subjudul="f.nomor || 'Nomor diberikan otomatis saat disimpan'" ikon="PackageCheck" @tutup="form = null">
      <div class="space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label class="label" for="bb-tgl">Tanggal serah terima</label><input id="bb-tgl" v-model="f.tanggal" type="date" class="masukan" /></div>
          <div><label class="label" for="bb-no">Nomor (kosongkan = otomatis)</label><input id="bb-no" v-model="f.nomor" class="masukan kode" placeholder="421/…/UPT.SPF.SMPN.19/…" /></div>
        </div>
        <div><label class="label" for="bb-cat">Catatan</label><input id="bb-cat" v-model="f.catatan" class="masukan" /></div>
        <div>
          <p class="label">Barang diserahkan ({{ terpilih.length }} dipilih · {{ rupiah(terpilih.reduce((s, a) => s + (a.nilai || 0), 0)) }})</p>
          <ul class="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            <li v-for="a in calon" :key="a.id">
              <label class="flex cursor-pointer items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input type="checkbox" :checked="f.pilih.has(a.id)" class="mt-1 h-4 w-4 accent-[#1A56DB]" @change="alih(a.id)" />
                <span class="min-w-0 flex-1"><span class="block text-sm font-semibold">{{ a.nama }}</span><span class="block text-xs text-slate-500">{{ a.kode_barang || 'Ekstrakomptabel' }} · Reg. {{ formatRegister(a) }} · {{ tanggalPendek(a.tgl_perolehan) }}</span></span>
                <span class="shrink-0 text-right text-xs"><b class="angka block">{{ rupiah(a.nilai) }}</b>{{ a.jumlah }} {{ a.satuan }} · <span :class="['lencana', KONDISI[a.kondisi]?.lencana]">{{ a.kondisi }}</span></span>
              </label>
            </li>
            <li v-if="!calon.length" class="p-4 text-center text-sm text-slate-500">Semua barang sudah diserahkan.</li>
          </ul>
        </div>
      </div>
      <template #kaki>
        <button v-if="f.id" class="tombol-garis text-rose-600" @click="hapus(form)"><Ikon nama="Trash2" :ukuran="16" /> Hapus</button>
        <button class="tombol-utama ml-auto" :disabled="!terpilih.length || !f.tanggal || menyimpan" @click="simpan"><Ikon :nama="menyimpan ? 'RefreshCw' : 'Save'" :ukuran="17" :class="menyimpan && 'animate-spin'" /> Simpan</button>
      </template>
    </Laci>

    <CetakSurat v-if="cetak" :judul="`BAST Barang ${cetak.nomor}`" @tutup="cetak = null">
      <template #default="{ profil, pejabat }">
        <DokBastBarang :profil="profil" :bast="cetak" :bendahara="pejabat('bendahara_bosp', cetak.tanggal)" :pengurus="pejabat('pengurus_barang', cetak.tanggal)" :kepsek="pejabat('kepala_sekolah', cetak.tanggal)" />
      </template>
    </CetakSurat>
  </div>
</template>
