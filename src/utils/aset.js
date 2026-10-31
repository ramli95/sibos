// Barang & Aset (Fase 5): klasifikasi barang hasil belanja, golongan KIB, nomor register,
// pencocokan Referensi Barang Modal ARKAS, rekap pembelian BMD, dan Buku Persediaan
// (masuk dari belanja, keluar dari bon, penyesuaian dari stok opname, nilai harga rata-rata).
import { KELAS_BARANG, GOLONGAN_KIB, POLA_TAHAN_LAMA, POLA_KONSUMSI, POLA_HABIS_PAKAI, BATAS_EKSTRA } from '@/config/aset'
import { tanggalRealisasi } from './belanja'

const rapi = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Kunci item belanja (stabil selama transaksi tidak dihapus) */
export const kunciItem = (b, i) => `${b.id}:${i.id}`

/** Kelas bawaan item belanja */
export function kelasBawaan(i, b = {}) {
  const r = String(i.kode_rekening || '')
  if (b.jenis === 'honor' || i.jenis === 'honor' || i.jenis === 'jasa') return 'abaikan'
  if (r.startsWith('5.2')) return 'kib'
  if (!r.startsWith('5.1.02.01')) return 'abaikan' // jasa, pemeliharaan, perjalanan
  if (POLA_KONSUMSI.test(i.nama) || r.endsWith('.0052')) return 'abaikan'
  if (POLA_TAHAN_LAMA.test(i.nama)) return 'ekstra'
  if (POLA_HABIS_PAKAI.test(i.nama)) return 'persediaan'
  if ((Number(i.harga) || 0) >= BATAS_EKSTRA && !/paket/i.test(i.satuan || '')) return 'ekstra'
  return 'persediaan'
}

/**
 * Semua item barang dari belanja Lunas beserta kelasnya.
 * kelas: peta { kunciItem: 'kib'|'ekstra'|'persediaan'|'abaikan' } hasil pilihan pengguna.
 * aset: daftar aset tercatat (untuk menandai item yang sudah masuk inventaris).
 */
export function itemBarang(belanja, kelas = {}, aset = []) {
  const tercatat = new Map()
  aset.forEach((a) => { if (a.id_belanja && a.id_item && a.status !== 'dihapus') tercatat.set(`${a.id_belanja}:${a.id_item}`, (tercatat.get(`${a.id_belanja}:${a.id_item}`) || 0) + (Number(a.jumlah) || 0)) })
  const out = []
  belanja.forEach((b) => {
    if (b.status !== 'lunas' || b.jenis === 'honor') return
    ;(b.item || []).forEach((i) => {
      const k = kunciItem(b, i)
      const bawaan = kelasBawaan(i, b)
      out.push({
        kunci: k, id_belanja: b.id, id_item: i.id, tanggal: b.tgl_terima || b.tgl_lunas || tanggalRealisasi(b), tgl_lunas: b.tgl_lunas,
        nama_pekerjaan: b.nama_pekerjaan, penyedia: b.rekanan?.nama_usaha || '', nomor_bast: b.nomor?.bast || b.siplah?.nomor_bast || '',
        nama: i.nama, spesifikasi: i.spesifikasi || '', volume: Number(i.volume) || 0, satuan: i.satuan || '', harga: i.harga || 0, jumlah: i.jumlah || 0,
        kode_kegiatan: i.kode_kegiatan, kode_rekening: i.kode_rekening, kelas: kelas[k] || bawaan, bawaan, diubah: !!kelas[k] && kelas[k] !== bawaan,
        tercatat: tercatat.get(k) || 0,
      })
    })
  })
  return out.sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)))
}

/** Golongan KIB dari kode barang (1.3.02 → B) atau rekening (5.2.02 → B) */
export function golongan(kodeBarang, kodeRekening) {
  const k = String(kodeBarang || ''), r = String(kodeRekening || '')
  for (const [g, x] of Object.entries(GOLONGAN_KIB)) if (k.startsWith(x.awalan) || r.startsWith(x.rekening)) return g
  return 'B'
}

/** Nomor register berikutnya untuk kode barang (4 digit, per kode barang, seluruh tahun) */
export function registerBerikut(aset, kodeBarang) {
  const kode = String(kodeBarang || '').trim() || '-'
  const maks = aset.filter((a) => (a.kode_barang || '-') === kode).reduce((m, a) => Math.max(m, Number(a.register_akhir || a.register_awal) || 0), 0)
  return maks + 1
}
export const formatRegister = (a) => {
  const p = (n) => String(n || 0).padStart(4, '0')
  if (!a.register_awal) return ''
  return Number(a.register_akhir) > Number(a.register_awal) ? `${p(a.register_awal)} s.d. ${p(a.register_akhir)}` : p(a.register_awal)
}

/** Usulan Referensi Barang Modal untuk item (rekening sama lebih diutamakan, lalu kemiripan nama) */
export function usulanRefBarang(ref, nama, kodeRekening, maks = 8) {
  const kata = rapi(nama).split(' ').filter((k) => k.length > 2)
  if (!kata.length && !kodeRekening) return []
  return ref
    .map((x) => {
      const t = rapi(`${x.nama} ${x.spesifikasi}`)
      const s = kata.reduce((n, k) => n + (t.includes(k) ? 2 : 0), 0) + (kodeRekening && x.kode_rekening === kodeRekening ? 3 : 0)
      return { x, s }
    })
    .filter((y) => y.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, maks)
    .map((y) => y.x)
}

/** Cari di referensi barang modal */
export function cariRefBarang(ref, teks, maks = 60) {
  const q = rapi(teks)
  if (!q) return ref.slice(0, maks)
  const kata = q.split(' ')
  return ref.filter((x) => { const t = rapi(`${x.kode_barang} ${x.nama} ${x.spesifikasi} ${x.kode_rekening}`); return kata.every((k) => t.includes(k)) }).slice(0, maks)
}

/** Rekapitulasi pembelian barang milik daerah pada bulan (0–11): KIB, ekstrakomptabel, persediaan */
export function rekapPembelianBmd(barang, bulan) {
  return barang
    .filter((x) => x.kelas !== 'abaikan' && x.tgl_lunas && Number(x.tgl_lunas.slice(5, 7)) - 1 === Number(bulan))
    .map((x) => ({ ...x, jenis_bmd: KELAS_BARANG[x.kelas]?.label || '' }))
    .sort((a, b) => String(a.tgl_lunas).localeCompare(String(b.tgl_lunas)) || a.kelas.localeCompare(b.kelas))
}

/* ---------------- Persediaan ---------------- */

export const kunciPersediaan = (nama, satuan) => `${rapi(nama)}|${rapi(satuan)}`

/**
 * Buku persediaan per barang.
 * barang: hasil itemBarang (kelas 'persediaan' dipakai sebagai barang masuk)
 * mutasi: dokumen persediaan { jenis: 'awal'|'keluar'|'opname', tanggal, butir:[{kunci, nama, satuan, jumlah|sisa_fisik, harga}] , penerima, keperluan }
 * Hasil: Map kunci → { kunci, nama, satuan, baris:[{tanggal, uraian, masuk, keluar, saldo, harga, nilai_saldo, jenis}], saldo, nilai, harga_rata, masuk, keluar }
 */
export function bukuPersediaan(barang, mutasi = []) {
  const peta = new Map()
  const ambil = (nama, satuan, kunci = kunciPersediaan(nama, satuan)) => {
    if (!peta.has(kunci)) peta.set(kunci, { kunci, nama, satuan, gerak: [] })
    return peta.get(kunci)
  }
  barang.filter((x) => x.kelas === 'persediaan').forEach((x) => {
    ambil(x.nama, x.satuan).gerak.push({ tanggal: x.tanggal || x.tgl_lunas, urut: 1, jenis: 'masuk', uraian: `${x.nama_pekerjaan}${x.penyedia ? ' — ' + x.penyedia : ''}`, jumlah: x.volume, harga: x.harga, ref: x.id_belanja })
  })
  mutasi.forEach((m) => (m.butir || []).forEach((u) => {
    const g = ambil(u.nama, u.satuan, u.kunci || kunciPersediaan(u.nama, u.satuan))
    if (m.jenis === 'awal') g.gerak.push({ tanggal: m.tanggal, urut: 0, jenis: 'awal', uraian: 'Saldo awal', jumlah: Number(u.jumlah) || 0, harga: Number(u.harga) || 0, ref: m.id })
    else if (m.jenis === 'keluar') g.gerak.push({ tanggal: m.tanggal, urut: 2, jenis: 'keluar', uraian: `Dikeluarkan${m.penerima ? ' kepada ' + m.penerima : ''}${m.keperluan ? ' — ' + m.keperluan : ''}`, jumlah: Number(u.jumlah) || 0, ref: m.id })
    else if (m.jenis === 'opname') g.gerak.push({ tanggal: m.tanggal, urut: 3, jenis: 'opname', uraian: `Stok opname${m.keterangan ? ' — ' + m.keterangan : ''}`, fisik: Number(u.sisa_fisik) || 0, ref: m.id })
  }))
  const hasil = new Map()
  peta.forEach((g) => {
    let saldo = 0, nilai = 0, masuk = 0, keluar = 0
    const baris = []
    g.gerak.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || a.urut - b.urut).forEach((x) => {
      const rata = saldo > 0 ? nilai / saldo : 0
      if (x.jenis === 'awal' || x.jenis === 'masuk') {
        saldo += x.jumlah; nilai += x.jumlah * x.harga; masuk += x.jenis === 'masuk' ? x.jumlah : 0
        baris.push({ ...x, masuk: x.jumlah, keluar: 0, saldo, harga: x.harga, nilai_saldo: Math.round(nilai) })
      } else if (x.jenis === 'keluar') {
        const k = Math.min(x.jumlah, saldo)
        saldo -= k; nilai -= k * rata; keluar += k
        baris.push({ ...x, masuk: 0, keluar: k, saldo, harga: Math.round(rata), nilai_saldo: Math.round(nilai), kurang: x.jumlah > k ? x.jumlah - k : 0 })
      } else {
        const selisih = saldo - x.fisik
        if (selisih > 0) { saldo -= selisih; nilai -= selisih * rata; keluar += selisih }
        else if (selisih < 0) { saldo -= selisih; nilai -= selisih * rata }
        baris.push({ ...x, uraian: `${x.uraian}${selisih > 0 ? ` (terpakai ${selisih})` : selisih < 0 ? ` (lebih ${-selisih})` : ' (sesuai)'}`, masuk: selisih < 0 ? -selisih : 0, keluar: selisih > 0 ? selisih : 0, saldo, harga: Math.round(rata), nilai_saldo: Math.round(nilai) })
      }
    })
    hasil.set(g.kunci, { kunci: g.kunci, nama: g.nama, satuan: g.satuan, baris, saldo, nilai: Math.round(nilai), harga_rata: saldo ? Math.round(nilai / saldo) : 0, masuk, keluar })
  })
  return hasil
}

/** Laporan persediaan per periode (iso dari–sampai): saldo awal, masuk, keluar, sisa, nilai */
export function laporanPersediaan(buku, dari, sampai) {
  return [...buku.values()].map((g) => {
    const sebelum = g.baris.filter((r) => r.tanggal < dari).at(-1)
    const dalam = g.baris.filter((r) => r.tanggal >= dari && r.tanggal <= sampai)
    const akhir = g.baris.filter((r) => r.tanggal <= sampai).at(-1)
    return {
      kunci: g.kunci, nama: g.nama, satuan: g.satuan,
      awal: sebelum?.saldo || 0, masuk: dalam.reduce((s, r) => s + r.masuk, 0), keluar: dalam.reduce((s, r) => s + r.keluar, 0),
      akhir: akhir?.saldo || 0, harga: akhir?.saldo ? Math.round((akhir.nilai_saldo || 0) / akhir.saldo) : 0, nilai: akhir?.nilai_saldo || 0,
    }
  }).filter((r) => r.awal || r.masuk || r.keluar || r.akhir).sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
}
