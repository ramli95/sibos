<script setup>
// Pencarian Standar Harga Satuan pemerintah.
// mode 'jendela': dibuka dari formulir untuk memilih satu harga referensi.
// mode 'halaman': ditampilkan langsung di halaman Standar Harga (Bendahara dapat mengubah item).
import { ref, computed, watch, onMounted } from 'vue'
import { muatDaftarSumber, muatSsh, cariSsh, versiSsh } from '@/services/ssh'
import { rupiah } from '@/utils/format'
import Ikon from './Ikon.vue'

const props = defineProps({
  mode: { type: String, default: 'jendela' },
  awal: { type: String, default: '' },
  bolehPakai: { type: Boolean, default: true },
  bolehUbah: Boolean,
})
const emit = defineEmits(['pilih', 'tutup', 'ubah', 'tambah', 'kelola'])
const daftar = ref([])
const sumber = ref('')
const q = ref(props.awal)
const data = ref(null)
const memuat = ref(false)
const galat = ref('')
const hasil = computed(() => (data.value && q.value.trim().length >= 2 ? cariSsh(data.value.butir, q.value) : []))
const info = computed(() => daftar.value.find((s) => s.kunci === sumber.value))

async function muatDaftar() {
  daftar.value = (await muatDaftarSumber()).filter((s) => s.aktif)
  if (!daftar.value.find((s) => s.kunci === sumber.value)) sumber.value = daftar.value[0]?.kunci || ''
}
async function muat() {
  if (!sumber.value) { data.value = null; return }
  memuat.value = true; galat.value = ''
  try { data.value = await muatSsh(sumber.value) } catch (e) { galat.value = e.message; data.value = null } finally { memuat.value = false }
}
onMounted(async () => { await muatDaftar(); await muat() })
watch(sumber, muat)
watch(versiSsh, async () => { await muatDaftar(); await muat() })
</script>

<template>
  <Teleport to="body" :disabled="props.mode !== 'jendela'">
    <div :class="props.mode === 'jendela' ? 'fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6' : ''" @click.self="emit('tutup')">
      <section :class="['flex flex-col overflow-hidden bg-white dark:bg-[#161D2B]', props.mode === 'jendela' ? 'max-h-[92dvh] w-full max-w-3xl rounded-t-3xl shadow-2xl sm:rounded-3xl' : 'kartu']"
               role="dialog" aria-label="Cari Standar Harga Satuan pemerintah">
        <header class="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl ikon-chip"><Ikon nama="Landmark" :ukuran="19" /></span>
            <div class="min-w-0 flex-1">
              <h2 class="font-bold">Referensi SSH pemerintah</h2>
              <p class="truncate text-xs text-slate-500">{{ info?.dasar }}<template v-if="data"> · {{ data.butir.length.toLocaleString('id-ID') }} item · harga tertinggi</template></p>
            </div>
            <button v-if="props.bolehUbah && props.mode === 'halaman'" aria-label="Kelola SSH" class="tombol-garis px-3 py-2 text-xs" @click="emit('kelola')"><Ikon nama="Settings" :ukuran="15" class="text-biru" /> <span class="hidden sm:inline">Kelola SSH</span></button>
            <button v-if="props.mode === 'jendela'" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="19" /></button>
          </div>
          <div class="tanpa-penggulir flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button v-for="s in daftar" :key="s.kunci" type="button" @click="sumber = s.kunci"
                    :class="['flex min-w-max flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm',
                             sumber === s.kunci ? 'bg-biru text-white shadow' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700']">
              <Ikon :nama="s.ikon" :ukuran="15" /> {{ s.singkat }} <span class="opacity-75">{{ s.tahun }}</span>
            </button>
          </div>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Ikon nama="Search" :ukuran="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input v-model="q" class="masukan pl-9" placeholder="Ketik nama barang/jasa, mis. kertas hvs, konsumsi rapat…" autofocus />
            </div>
            <button v-if="props.bolehUbah && info" class="tombol-garis shrink-0 px-3" :title="`Tambah item ke ${info.nama}`" @click="emit('tambah', info)"><Ikon nama="Plus" :ukuran="17" class="text-biru" /> <span class="hidden sm:inline">Item</span></button>
          </div>
          <p v-if="info?.catatan" class="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300"><Ikon nama="Info" :ukuran="14" class="mt-px" /> {{ info.catatan }}</p>
        </header>

        <div :class="['gulir-halus overflow-y-auto', props.mode === 'jendela' ? 'flex-1' : 'max-h-[34rem]']">
          <p v-if="memuat" class="p-8 text-center text-sm text-slate-500"><Ikon nama="RefreshCw" class="inline animate-spin" /> Memuat {{ info?.nama }}…</p>
          <p v-else-if="galat" class="flex items-center gap-2 p-6 text-sm text-rose-600"><Ikon nama="CircleAlert" /> {{ galat }}</p>
          <p v-else-if="!daftar.length" class="p-8 text-center text-sm text-slate-500">Belum ada SSH yang aktif.</p>
          <p v-else-if="q.trim().length < 2" class="p-8 text-center text-sm text-slate-500"><Ikon nama="Search" class="mr-1 inline" /> Ketik minimal 2 huruf untuk mencari.</p>
          <p v-else-if="!hasil.length" class="p-8 text-center text-sm text-slate-500"><Ikon nama="SearchX" class="mr-1 inline" /> Tidak ditemukan. Coba kata lain atau sumber SSH lainnya.</p>
          <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
            <li v-for="b in hasil" :key="b.id" class="flex items-start gap-3 px-4 py-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold leading-snug">{{ b.uraian }}</p>
                <p v-if="b.spesifikasi" class="text-xs text-slate-600 dark:text-slate-300">{{ b.spesifikasi }}</p>
                <p class="mt-0.5 text-[11px] text-slate-400"><span class="kode">{{ b.kode }}</span><template v-if="b.kelompok"><template v-if="b.kode"> · </template>{{ b.kelompok }}</template></p>
              </div>
              <div class="shrink-0 text-right">
                <p class="angka text-sm font-bold">{{ rupiah(b.harga) }}</p>
                <p class="text-xs text-slate-500">per {{ b.satuan }}</p>
                <div class="mt-1.5 flex justify-end gap-1">
                  <button v-if="props.bolehUbah" class="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-biru dark:hover:bg-slate-800" :aria-label="`Ubah ${b.uraian}`" @click="emit('ubah', b, info)">
                    <Ikon nama="Pencil" :ukuran="14" />
                  </button>
                  <button v-if="props.bolehPakai" class="inline-flex items-center gap-1 rounded-lg bg-biru/10 px-2.5 py-1 text-xs font-semibold text-biru hover:bg-biru hover:text-white dark:text-blue-300"
                          @click="emit('pilih', b)">
                    <Ikon nama="Plus" :ukuran="13" /> {{ props.mode === 'jendela' ? 'Pilih' : 'Pakai' }}
                  </button>
                </div>
              </div>
            </li>
          </ul>
          <p v-if="hasil.length >= 200" class="p-3 text-center text-xs text-slate-500">Menampilkan 200 hasil teratas. Perjelas kata kunci untuk mempersempit.</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>
