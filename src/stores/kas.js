// Pajak & Buku Kas per tahun. Dimuat sekali per tahun (hemat baca Spark), dihitung di peramban.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBelanja } from './belanja'
import { muatAturanPajak, muatSetoran, muatKas, muatTutupBuku, muatKoran } from '@/services/kas'
import { daftarKewajiban } from '@/utils/pajak'
import { susunBaris, bukuDengan } from '@/utils/bku'
import { ATURAN_PAJAK_AWAL } from '@/config/pajak'

export const useKas = defineStore('kas', () => {
  const belanja = useBelanja()
  const aturan = ref(ATURAN_PAJAK_AWAL)
  const setoran = ref([])
  const kas = ref([])
  const tutup = ref([])
  const koran = ref([])
  const memuat = ref(false)
  const galat = ref('')
  let dimuat = null

  async function muat({ segar = false, tahun } = {}) {
    if (tahun) await belanja.muat({ tahun })
    else await belanja.muat()
    const t = belanja.tahun
    if (dimuat === t && !segar) return
    memuat.value = true
    galat.value = ''
    try {
      const [a, s, k, tb, kr] = await Promise.all([muatAturanPajak(), muatSetoran(t), muatKas(t), muatTutupBuku(t), muatKoran(t)])
      aturan.value = a; setoran.value = s; kas.value = k; tutup.value = tb; koran.value = kr
      if (segar) await belanja.muat({ segar: true })
      dimuat = t
    } catch (e) { galat.value = e.message } finally { memuat.value = false }
  }
  const segarkan = () => muat({ segar: true })

  const kewajiban = computed(() => daftarKewajiban(belanja.daftar, setoran.value))
  const terutang = computed(() => kewajiban.value.filter((p) => p.status === 'terutang'))
  const totalTerutang = computed(() => terutang.value.reduce((s, p) => s + p.nilai, 0))
  const baris = computed(() => susunBaris({ belanja: belanja.daftar, kewajiban: kewajiban.value, setoran: setoran.value, kas: kas.value }))
  const bku = computed(() => bukuDengan(baris.value, 'bku'))
  const bank = computed(() => bukuDengan(baris.value, 'bank'))
  const tunai = computed(() => bukuDengan(baris.value, 'tunai'))
  const saldoBank = computed(() => bank.value.at(-1)?.saldo || 0)
  const saldoTunai = computed(() => tunai.value.at(-1)?.saldo || 0)
  const tutupBulan = (id) => tutup.value.find((t) => t.id === id) || null

  return { tahun: computed(() => belanja.tahun), aturan, setoran, kas, tutup, koran, memuat, galat, muat, segarkan, kewajiban, terutang, totalTerutang, baris, bku, bank, tunai, saldoBank, saldoTunai, tutupBulan }
})
