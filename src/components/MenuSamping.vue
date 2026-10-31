<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { MENU } from '@/config/menu'
import { useAuth } from '@/stores/auth'
import Ikon from './Ikon.vue'
import LogoSibos from './LogoSibos.vue'
import PilihTema from './PilihTema.vue'

const emit = defineEmits(['pilih'])
const route = useRoute()
const auth = useAuth()
const terbuka = ref({ Kepegawaian: true, 'Master Data': true })

const terlihat = (m) => !m.peran || auth.punyaPeran(...m.peran)
const aktif = (ke) => ke && route.path.startsWith(ke)
</script>

<template>
  <nav class="flex h-full flex-col bg-navy text-blue-50 dark:bg-[#0F1E4D]" aria-label="Menu utama">
    <div class="flex items-center gap-3 px-5 pb-5 pt-6">
      <LogoSibos :ukuran="42" transparan />
      <div class="leading-tight">
        <div class="text-lg font-extrabold tracking-wider">SIBOS</div>
        <div class="text-[11px] text-blue-200/80">UPT SPF SMP Negeri 19 Makassar</div>
      </div>
    </div>

    <div class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
      <template v-for="m in MENU" :key="m.judul">
        <template v-if="terlihat(m)">
          <!-- Menu langsung -->
          <RouterLink v-if="m.ke" :to="m.ke" @click="emit('pilih')"
                      :class="['group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                               aktif(m.ke) ? 'bg-biru text-white shadow-lg shadow-black/20' : 'text-blue-50/85 hover:bg-white/10 hover:text-white']">
            <span :class="['grid h-8 w-8 place-items-center rounded-lg', aktif(m.ke) ? 'bg-white/20 text-white' : 'bg-white/5 ' + m.warna]">
              <Ikon :nama="m.ikon" :ukuran="17" />
            </span>
            {{ m.judul }}
          </RouterLink>

          <!-- Grup dengan submenu -->
          <div v-else-if="m.anak">
            <button type="button" @click="terbuka[m.judul] = !terbuka[m.judul]" :aria-expanded="!!terbuka[m.judul]"
                    class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-50/85 transition hover:bg-white/10 hover:text-white">
              <span :class="['grid h-8 w-8 place-items-center rounded-lg bg-white/5', m.warna]"><Ikon :nama="m.ikon" :ukuran="17" /></span>
              <span class="flex-1 text-left">{{ m.judul }}</span>
              <Ikon nama="ChevronDown" :ukuran="16" :class="['transition', terbuka[m.judul] ? 'rotate-180' : '']" />
            </button>
            <div v-show="terbuka[m.judul]" class="ml-7 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
              <template v-for="a in m.anak" :key="a.judul">
                <RouterLink v-if="a.ke" :to="a.ke" @click="emit('pilih')"
                            :class="['flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition',
                                     aktif(a.ke) ? 'bg-biru font-semibold text-white' : 'text-blue-50/80 hover:bg-white/10 hover:text-white']">
                  <Ikon :nama="a.ikon" :ukuran="15" /> {{ a.judul }}
                </RouterLink>
                <div v-else class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-blue-50/40" :title="`Tersedia di Fase ${a.fase}`">
                  <Ikon :nama="a.ikon" :ukuran="15" /> <span class="flex-1">{{ a.judul }}</span>
                  <span class="rounded bg-white/10 px-1.5 text-[10px] font-semibold">F{{ a.fase }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Menu fase berikutnya -->
          <div v-else class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-blue-50/40" :title="`Tersedia di Fase ${m.fase}`">
            <span :class="['grid h-8 w-8 place-items-center rounded-lg bg-white/5 opacity-60', m.warna]"><Ikon :nama="m.ikon" :ukuran="17" /></span>
            <span class="flex-1">{{ m.judul }}</span>
            <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">Fase {{ m.fase }}</span>
          </div>
        </template>
      </template>
    </div>

    <div class="border-t border-white/10 p-4">
      <PilihTema gelap-latar />
    </div>
  </nav>
</template>
