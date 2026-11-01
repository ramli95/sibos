import { WARNA_TINGKAT_ARKAS } from '@/config/kodeArkas'
// Ekspor RKAS ke Excel (F4, Times New Roman): baris induk (SNP/komponen/kegiatan) + uraian, dengan rencana bulanan.
import { eksporExcel } from '@/utils/excel'
import { bangunPohon, barisDatar } from '@/utils/rkasPohon'
import { KATEGORI } from '@/utils/arkas'
import { NAMA_BULAN } from '@/utils/format'

export async function eksporRkas(rkas, { bulan = 0, tahap = 0, kategori = 'semua', kolomBulan = null } = {}) {
  const nilai = (u) => (bulan ? u.bulan?.[bulan - 1] || 0 : tahap === 1 ? u.tahap1 : tahap === 2 ? u.tahap2 : u.jumlah)
  const ikut = (u) => kategori === 'semua' || u.kategori === kategori
  const pohon = bangunPohon(rkas.uraian, rkas.nama, { saring: (u) => ikut(u) && nilai(u) > 0 })
  const baris = barisDatar(pohon).map((b) => ({ ...b, nilaiPeriode: b.induk ? (bulan ? b.bulan[bulan - 1] : tahap === 1 ? b.tahap1 : tahap === 2 ? b.tahap2 : b.jumlah) : nilai(b) }))
  const adaBulan = rkas.uraian.every((u) => u.bulan)
  const kolom = [
    { judul: 'Kode Rekening', lebar: 20, nilai: (b) => (b.induk ? '' : b.kode_rekening) },
    { judul: 'Kode Program', lebar: 12, nilai: (b) => (b.induk ? b.kode : b.kode_kegiatan) },
    { judul: 'Uraian', lebar: 48, nilai: (b) => (b.induk ? b.nama.toUpperCase() : b.uraian) },
    { judul: 'Volume', lebar: 9, jenis: 'angka', nilai: (b) => (b.induk ? null : bulan ? nilai(b) / (b.harga || 1) : b.volume) },
    { judul: 'Satuan', lebar: 14, nilai: (b) => (b.induk ? '' : b.satuan) },
    { judul: 'Tarif Harga', lebar: 14, jenis: 'uang', nilai: (b) => (b.induk ? null : b.harga) },
    { judul: bulan ? `Jumlah ${NAMA_BULAN[bulan - 1]}` : tahap ? `Jumlah Tahap ${tahap}` : 'Jumlah', lebar: 16, jenis: 'uang', nilai: (b) => b.nilaiPeriode },
  ]
  if (kolomBulan) {
    // Kolom bulan terpilih (3/6 bulan): volume & jumlah per bulan
    kolomBulan.forEach((i) => kolom.push(
      { judul: `Vol ${NAMA_BULAN[i].slice(0, 3)}`, lebar: 8, jenis: 'angka', nilai: (b) => (b.induk ? null : (b.bulan?.[i] || 0) / (b.harga || 1) || null) },
      { judul: NAMA_BULAN[i], lebar: 14, jenis: 'uang', nilai: (b) => b.bulan?.[i] || 0 },
    ))
  } else if (!bulan && !tahap) {
    kolom.push({ judul: 'Tahap 1', lebar: 15, jenis: 'uang', nilai: (b) => b.tahap1 }, { judul: 'Tahap 2', lebar: 15, jenis: 'uang', nilai: (b) => b.tahap2 })
    kolom.push({ judul: 'Kategori', lebar: 16, nilai: (b) => (b.induk ? '' : KATEGORI[b.kategori]?.nama) })
    if (adaBulan) NAMA_BULAN.forEach((n, i) => kolom.push({ judul: n, lebar: 13, jenis: 'uang', nilai: (b) => b.bulan?.[i] || 0 }))
  }
  const periode = (kolomBulan ? `${NAMA_BULAN[kolomBulan[0]]}-${NAMA_BULAN[kolomBulan[kolomBulan.length - 1]]}` : bulan ? NAMA_BULAN[bulan - 1] : tahap ? `Tahap ${tahap}` : 'Tahap I dan II')
    + (kategori === 'semua' ? '' : ` ${KATEGORI[kategori]?.nama || kategori}`)
  await eksporExcel({ judul: `RKAS ${rkas.tahun} ${rkas.versi?.nama || ''} ${periode}`.slice(0, 120), kolom, baris, namaBerkas: `RKAS ${rkas.tahun} ${rkas.versi?.nama || ''} - ${periode}`,
    warnaBaris: (b) => (b.induk ? WARNA_TINGKAT_ARKAS[b.tingkat] || null : null) })
}
