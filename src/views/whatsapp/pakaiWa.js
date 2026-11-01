// Template & riwayat pesan WhatsApp bersama (dimuat sekali per sesi).
import { ref } from 'vue'
import { muatSemua, simpanSatu, hapusSatu } from '@/services/catatan'
import { TEMPLATE_AWAL, isiTemplate, tautanWa, nomorWa } from '@/utils/wa'

const template = ref({ ...TEMPLATE_AWAL })
const riwayat = ref([])
let dimuat = false

export function pakaiWa() {
  async function muat({ segar = false } = {}) {
    if (dimuat && !segar) return
    const [t, r] = await Promise.all([muatSemua('template_wa').catch(() => []), muatSemua('pesan_wa').catch(() => [])])
    template.value = { ...TEMPLATE_AWAL, ...Object.fromEntries(t.map((x) => [x.id, x.teks])) }
    riwayat.value = r.sort((a, b) => String(b.waktu).localeCompare(String(a.waktu)))
    dimuat = true
  }
  async function simpanTemplate(jenis, teks) {
    await simpanSatu('template_wa', jenis, { teks }, `Mengubah template WhatsApp "${jenis}"`)
    template.value = { ...template.value, [jenis]: teks }
  }
  const teks = (jenis, data) => isiTemplate(template.value[jenis], data)

  /** Buka WhatsApp dengan pesan siap kirim, lalu catat ke riwayat (pesan_wa) */
  async function kirim({ jenis, nama, no, pesan, ref: acuan = '' }) {
    window.open(tautanWa(no, pesan), '_blank', 'noopener')
    const catatan = { jenis, nama: nama || '', no: nomorWa(no), ringkas: pesan.slice(0, 400), ref: acuan, waktu: new Date().toISOString() }
    try {
      const id = await simpanSatu('pesan_wa', null, catatan)
      riwayat.value = [{ id, ...catatan }, ...riwayat.value]
    } catch { /* riwayat gagal dicatat tidak menghalangi pengiriman */ }
  }
  async function hapusRiwayat(x) { await hapusSatu('pesan_wa', x.id); riwayat.value = riwayat.value.filter((y) => y.id !== x.id) }
  return { template, riwayat, muat, simpanTemplate, teks, kirim, hapusRiwayat }
}
