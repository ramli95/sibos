// Data contoh Fase 4 (Mode Pratinjau): penerimaan dana, setoran pajak, tutup buku Jan–Mei, rekening koran Juni.
// Pajak Semester I disetor di bulan yang sama sehingga saldo bank 30 Juni = Rp 145.951.380.
import { daftar as belanja } from './contohBelanja'
import { daftarKewajiban } from '@/utils/pajak'
import { susunBaris, calonBank, ringkasanBulan } from '@/utils/bku'

export const aturan = { isi: null }

export const kas = [
  { id: 'k-tahap1', tahun: 2026, tanggal: '2026-01-27', jenis: 'terima_dana', bnu: 'BNU 00', uraian: 'Penerimaan Dana BOSP Reguler Tahap I Tahun 2026', nilai: 590_700_000, sumber: 'bank' },
  { id: 'k-tahap2', tahun: 2026, tanggal: '2026-07-21', jenis: 'terima_dana', bnu: 'BNU 41', uraian: 'Penerimaan Dana BOSP Reguler Tahap II Tahun 2026', nilai: 590_700_000, sumber: 'bank' },
  { id: 'k-bunga7', tahun: 2026, tanggal: '2026-07-31', jenis: 'bunga', bnu: 'BNU 42', uraian: 'Jasa giro bulan Juli 2026', nilai: 186_420, sumber: 'bank' },
  { id: 'k-pbunga7', tahun: 2026, tanggal: '2026-07-31', jenis: 'pajak_bunga', bnu: 'BNU 43', uraian: 'Pajak jasa giro bulan Juli 2026', nilai: 37_284, sumber: 'bank' },
]

// Setoran: semua kewajiban Januari–Juni disetor (satu kode billing per bulan per jenis)
export const setoran = (() => {
  const kw = daftarKewajiban(belanja, []).filter((p) => p.cara !== 'mitra' && p.tgl_pungut < '2026-07-01')
  const grup = new Map()
  kw.forEach((p) => { const k = `${p.tgl_pungut.slice(0, 7)}|${p.jenis}`; if (!grup.has(k)) grup.set(k, []); grup.get(k).push(p) })
  let n = 0
  return [...grup.entries()].map(([k, arr]) => {
    const [bln, jenis] = k.split('|')
    const tgl = arr.map((p) => p.tgl_pungut).sort().at(-1)
    n++
    return {
      id: `s-contoh-${n}`, tahun: 2026, tanggal: tgl, kode_billing: `0${(712000000000000 + n * 1371).toString()}`, ntpn: `CTH${bln.replace('-', '')}${String(n).padStart(4, '0')}`,
      masa: bln, jenis, bnu: `BNU S${String(n).padStart(2, '0')}`, total: arr.reduce((s, p) => s + p.nilai, 0),
      butir: arr.map((p) => ({ id_pajak: p.id, id_belanja: p.id_belanja, jenis: p.jenis, nilai: p.nilai, no_bupot: p.jenis === 'PPh 23' || p.jenis === 'PPh 21' ? `BP-${bln}-${n}` : '' })),
    }
  })
})()

const baris = susunBaris({ belanja, kewajiban: daftarKewajiban(belanja, setoran), setoran, kas })

export const tutup = [0, 1, 2, 3, 4].map((m) => {
  const r = ringkasanBulan(baris, m, 2026)
  const id = `2026-${String(m + 1).padStart(2, '0')}`
  return { id, tahun: 2026, bulan: m + 1, status: 'ditutup', ringkasan: r, saldo_arkas: r.saldo_bank, saldo_simakda: r.saldo_bank, ditutup_pada: `${id}-28`, catatan: 'Contoh: cocok dengan ARKAS & SIMAKDA' }
}).concat([{ id: '2026-06', tahun: 2026, bulan: 6, status: 'terbuka', saldo_arkas: 145_951_380, saldo_simakda: 145_951_380, catatan: '' }])

// Rekening koran Juni dibentuk dari transaksi bank Juni (neto) → semua cocok otomatis
export const koran = (() => {
  const calon = calonBank(baris).filter((c) => !c.cadangan && c.tanggal >= '2026-06-01' && c.tanggal <= '2026-06-30')
  const awal = baris.filter((r) => r.tanggal < '2026-06-01').reduce((s, r) => s + r.bank, 0)
  let saldo = awal
  const mutasi = calon.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((c, i) => {
    saldo += c.bank
    return { no: i + 1, tanggal: c.tanggal, uraian: c.bank < 0 ? `TRF KE ${c.uraian.slice(0, 28).toUpperCase()}` : `TRF MASUK ${c.uraian.slice(0, 24).toUpperCase()}`, debit: c.bank < 0 ? -c.bank : 0, kredit: c.bank > 0 ? c.bank : 0, saldo }
  })
  return [{ id: '2026-06', tahun: 2026, bulan: 6, nama_berkas: 'Rekening Koran Juni 2026 (contoh).pdf', saldo_awal: awal, saldo_akhir: saldo, mutasi }]
})()
