<script setup>
// Kartu satu transaksi belanja/honor di daftar (ringkas di HP)
import { computed } from 'vue'
import { STATUS, CARA, JENIS_HONOR, KATEGORI_LABEL } from '@/config/belanja'
import { rupiah, tanggalPendek } from '@/utils/format'
import { tanggalRealisasi } from '@/utils/belanja'
import Ikon from '@/components/Ikon.vue'

const props = defineProps({ b: { type: Object, required: true } })
const emit = defineEmits(['wa'])
const st = computed(() => STATUS[props.b.status] || STATUS.draf)
const honor = computed(() => props.b.jenis === 'honor')
const ikon = computed(() => (honor.value ? JENIS_HONOR[props.b.jenis_honor]?.ikon || 'Wallet' : props.b.cara === 'siplah' ? 'ShoppingBag' : (props.b.item || []).some((i) => i.jenis === 'konsumsi') ? 'UtensilsCrossed' : (props.b.item || []).some((i) => i.jenis === 'jasa') ? 'Wrench' : 'Package'))
const sub = computed(() => (honor.value ? `${(props.b.penerima || []).length} penerima · ${JENIS_HONOR[props.b.jenis_honor]?.label || 'Honor'}` : props.b.rekanan?.nama_usaha || 'Penyedia belum dipilih'))
const lengkap = computed(() => props.b.persen_lengkap || 0)
</script>

<template>
  <RouterLink :to="`/belanja/lihat/${props.b.id}`" class="kartu flex flex-col gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
    <div class="flex items-start gap-3">
      <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-xl', st.chip]"><Ikon :nama="ikon" :ukuran="20" /></span>
      <div class="min-w-0 flex-1">
        <p class="line-clamp-2 font-bold leading-snug">{{ props.b.nama_pekerjaan || 'Tanpa nama' }}</p>
        <p class="truncate text-xs text-slate-500">{{ sub }}</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-1.5">
        <span :class="['lencana', st.lencana]"><Ikon :nama="st.ikon" :ukuran="12" /> {{ st.label }}</span>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40" :aria-label="`WhatsApp ${props.b.nama_pekerjaan}`" @click.prevent.stop="emit('wa', props.b)"><Ikon nama="MessageCircle" :ukuran="16" /></button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span class="flex items-center gap-1"><Ikon nama="CalendarDays" :ukuran="13" class="text-biru" /> {{ tanggalPendek(tanggalRealisasi(props.b)) || '—' }}</span>
      <span v-if="props.b.cara === 'siplah'" class="lencana bg-biru/10 text-biru dark:bg-blue-400/15 dark:text-blue-300"><Ikon nama="ShoppingBag" :ukuran="12" /> SIPLah</span>
      <span v-else-if="!honor" class="flex items-center gap-1"><Ikon :nama="CARA.non_siplah.ikon" :ukuran="13" class="text-slate-400" /> Non-SIPLah</span>
      <span class="flex items-center gap-1"><Ikon nama="Layers" :ukuran="13" class="text-slate-400" /> {{ KATEGORI_LABEL[props.b.kategori] || 'Operasional' }}</span>
    </div>
    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between text-[11px] text-slate-500"><span>Kelengkapan</span><b :class="lengkap === 100 ? 'text-emerald-600 dark:text-emerald-400' : ''">{{ lengkap }}%</b></div>
        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div :class="['h-full rounded-full transition-all', lengkap === 100 ? 'bg-emerald-500' : lengkap >= 60 ? 'bg-biru' : 'bg-amber-500']" :style="{ width: Math.max(lengkap, 4) + '%' }" />
        </div>
      </div>
      <b class="angka shrink-0 text-base">{{ rupiah(props.b.total) }}</b>
    </div>
  </RouterLink>
</template>
