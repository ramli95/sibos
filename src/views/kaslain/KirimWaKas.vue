<script setup>
// Lembar bawah WhatsApp untuk Kas Lain: tagihan belum lunas, setoran diterima, lunas, utang piutang.
// Pesan disusun dari template (bisa diubah di menu WhatsApp → Template) dan bisa disunting sebelum dikirim.
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { pakaiWa } from '@/views/whatsapp/pakaiWa'
import { useAuth } from '@/stores/auth'
import { SEMUA_JENIS_WA, nomorWa } from '@/utils/wa'
import Ikon from '@/components/Ikon.vue'

const props = defineProps({
  nama: { type: String, default: '' },
  no: { type: String, default: '' },
  jenis: { type: Array, required: true },      // kunci jenis yang boleh dipilih
  awal: { type: String, default: '' },          // jenis terpilih di awal
  data: { type: Function, required: true },     // (jenis) → isian template
  acuan: { type: String, default: '' },         // ref riwayat
})
const emit = defineEmits(['tutup'])
const wa = pakaiWa()
const auth = useAuth()
const pilih = ref(props.awal || props.jenis[0])
const no = ref(props.no)
const pesan = ref('')
const tambahan = ref('')

function susun() {
  pesan.value = wa.teks(pilih.value, { bendahara: auth.pengguna?.nama || 'Bendahara', sekolah: 'UPT SPF SMP Negeri 19 Makassar', pesan: tambahan.value, ...props.data(pilih.value) })
}
onMounted(async () => { document.body.style.overflow = 'hidden'; await wa.muat().catch(() => {}); susun() })
onBeforeUnmount(() => { document.body.style.overflow = '' })
watch([pilih, tambahan], susun)

async function kirim() {
  await wa.kirim({ jenis: pilih.value, nama: props.nama, no: no.value, pesan: pesan.value, ref: props.acuan })
  emit('tutup')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] grid place-items-end bg-slate-900/40 sm:place-items-center sm:p-4" @click.self="emit('tutup')">
      <div class="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-slate-900">
        <header class="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"><Ikon nama="MessageCircle" :ukuran="20" /></span>
          <div class="min-w-0 flex-1"><h2 class="font-bold">Kirim WhatsApp</h2><p class="truncate text-xs text-slate-500">{{ props.nama || 'Pilih kontak di WhatsApp' }}</p></div>
          <button class="text-slate-400" aria-label="Tutup" @click="emit('tutup')"><Ikon nama="X" :ukuran="20" /></button>
        </header>
        <div class="space-y-3 overflow-y-auto p-4">
          <div v-if="props.jenis.length > 1" class="flex flex-wrap gap-2">
            <button v-for="j in props.jenis" :key="j" type="button"
                    :class="['flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold', pilih === j ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700']"
                    @click="pilih = j"><Ikon :nama="SEMUA_JENIS_WA[j].ikon" :ukuran="14" /> {{ SEMUA_JENIS_WA[j].judul }}</button>
          </div>
          <div>
            <label class="label" for="wak-no">Nomor WhatsApp</label>
            <input id="wak-no" v-model="no" class="masukan kode" inputmode="tel" placeholder="0812… (kosongkan untuk memilih kontak)" />
            <p v-if="no && !nomorWa(no)" class="mt-1 text-xs text-rose-600">Nomor tampak belum lengkap.</p>
          </div>
          <div v-if="pilih === 'tagih' || pilih === 'utang'">
            <label class="label" for="wak-tambah">Catatan tambahan (opsional)</label>
            <input id="wak-tambah" v-model="tambahan" class="masukan" placeholder="mis. Bisa transfer ke rekening …" />
          </div>
          <div>
            <label class="label" for="wak-pesan">Pesan</label>
            <textarea id="wak-pesan" v-model="pesan" rows="10" class="masukan text-sm" />
          </div>
        </div>
        <footer class="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <button class="tombol-garis flex-1" @click="susun"><Ikon nama="RefreshCw" :ukuran="16" /> Susun ulang</button>
          <button class="tombol-utama flex-1 !bg-emerald-600" @click="kirim"><Ikon nama="Send" :ukuran="16" /> Buka WhatsApp</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
