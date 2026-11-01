// Kepegawaian & Gaji: pegawai (dengan data rahasia), dasar gaji, data per bulan, KGB, SKPG.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { muatSemuaGaji, muatBulan } from '@/services/gaji'
import { dasarGaji, hitungGaji, selisih, infoKgb, asn, hariIni } from '@/utils/gaji'
import { statusKgb } from '@/config/gaji'
import { pasangTabelGaji } from '@/config/tabelGaji'

const bulanIni = () => hariIni().slice(0, 7)

export const useGaji = defineStore('gaji', () => {
  const pegawai = ref([])
  const dasar = ref({})
  const kgb = ref([])
  const skpg = ref([])
  const aturan = ref({})
  const tabel = ref(null) // dok sekolah/tabel_gaji (null = bawaan)
  const periode = ref(bulanIni())
  const bulan = ref(null) // isi gaji/{periode}
  const memuat = ref(false)
  const galat = ref('')
  let dimuat = false

  async function muat({ segar = false } = {}) {
    if (dimuat && !segar) return
    memuat.value = true
    galat.value = ''
    try {
      const x = await muatSemuaGaji()
      pasangTabelGaji(x.tabel); tabel.value = x.tabel
      pegawai.value = x.pegawai; dasar.value = x.dasar; kgb.value = x.kgb; skpg.value = x.skpg; aturan.value = x.aturan
      bulan.value = await muatBulan(periode.value)
      dimuat = true
    } catch (e) { galat.value = e.message } finally { memuat.value = false }
  }
  const segarkan = () => muat({ segar: true })
  async function gantiPeriode(p) { periode.value = p; bulan.value = await muatBulan(p).catch(() => null) }
  async function muatUlangBulan() { bulan.value = await muatBulan(periode.value).catch(() => null) }

  const aktif = computed(() => pegawai.value.filter((p) => p.aktif !== false))
  const pegawaiAsn = computed(() => aktif.value.filter(asn).sort(urutGaji))
  const honorer = computed(() => aktif.value.filter((p) => p.status_kepegawaian === 'Honorer'))
  const dasarDari = (p) => dasarGaji(p, dasar.value[p.id] || {})

  /** Baris Daftar Gaji bulan aktif: simpanan (bila dikunci) atau hitungan langsung */
  const baris = computed(() => {
    const resmi = bulan.value?.resmi || {}
    const simpan = bulan.value?.simpanan?.baris
    if (simpan?.length) return simpan.map((b) => ({ ...b, resmi: resmi[b.id] || null, selisih: selisih(b, resmi[b.id]) }))
    return pegawaiAsn.value.map((p) => {
      const g = dasarDari(p)
      // Gaji pokok belum ada (MKG kosong): semua komponen 0 agar tidak ikut menjumlah tunjangan beras saja
      const h = g.gaji_pokok > 0 ? hitungGaji(g, aturan.value) : Object.fromEntries(Object.entries(hitungGaji(g, aturan.value)).map(([k, v]) => [k, typeof v === 'number' ? 0 : v]))
      return {
        id: p.id, nama: namaLengkap(p), nip: p.nip, status: p.status_kepegawaian, golongan: p.golongan, mkg: g.mkg, jabatan: p.jabatan || '',
        kawin: g.tunj_pasangan ? 'K' : 'TK', anak: g.anak_tunjangan, jiwa: g.jiwa_beras, ...h,
        lengkap: g.gaji_pokok > 0, resmi: resmi[p.id] || null, selisih: selisih(h, resmi[p.id]),
      }
    })
  })
  const terkunci = computed(() => !!bulan.value?.simpanan?.baris?.length)

  /** KGB semua ASN, urut dari yang paling dekat jatuh tempo */
  const daftarKgb = computed(() => pegawaiAsn.value.map((p) => {
    const g = dasarDari(p)
    const i = infoKgb(p, g)
    return { p, g, ...i, st: statusKgb(i.sisa) }
  }).sort((a, b) => (a.sisa ?? 99999) - (b.sisa ?? 99999)))
  const kgbH30 = computed(() => daftarKgb.value.filter((x) => x.sisa != null && x.sisa <= 30))

  return {
    pegawai, dasar, kgb, skpg, aturan, tabel, periode, bulan, memuat, galat, muat, segarkan, gantiPeriode, muatUlangBulan,
    aktif, pegawaiAsn, honorer, dasarDari, baris, terkunci, daftarKgb, kgbH30,
  }
})

export const namaLengkap = (p) => [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? `, ${p.gelar}` : '')

// Urutan daftar gaji: PNS dulu (golongan tertinggi), lalu PPPK, lalu nama
const ROM = { I: 1, II: 2, III: 3, IV: 4 }
const PPPK = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII']
function nilaiGol(p) {
  if (p.status_kepegawaian === 'PNS') { const [r, h] = String(p.golongan || '').split('/'); return 100 + (ROM[r] || 0) * 10 + (h ? h.charCodeAt(0) - 96 : 0) }
  return PPPK.indexOf(p.golongan) + 1
}
function urutGaji(a, b) { return nilaiGol(b) - nilaiGol(a) || String(a.nama).localeCompare(String(b.nama)) }
