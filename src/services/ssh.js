// Standar Harga Satuan (SSH) pemerintah sebagai referensi harga tertinggi.
// Data diambil dari Perwali/Pergub (PDF) lalu disimpan sebagai berkas statis di public/ssh/,
// dimuat hanya saat dibutuhkan (tidak memakai kuota Firestore).
// Format berkas: { judul, dasar, tahun, kolom: [...], data: [[kode, kelompok, uraian, spesifikasi, satuan, harga], ...] }

export const SUMBER_SSH = [
  { kunci: 'makassar-2026', nama: 'SSH Pemkot Makassar 2026', singkat: 'Pemkot Makassar', dasar: 'Perwali Makassar No. 22 Tahun 2025 tentang SSH & Analisis Standar Belanja 2026', ikon: 'Landmark', warna: 'from-sky-400 to-blue-600' },
  { kunci: 'sulsel-2026', nama: 'SSH Pemprov Sulsel 2026', singkat: 'Pemprov Sulsel', dasar: 'Pergub Sulsel No. 10 Tahun 2025 tentang SSH Pemerintah Daerah 2026', ikon: 'Building2', warna: 'from-emerald-400 to-teal-600' },
]

const cache = new Map()

export async function muatSsh(kunci) {
  if (cache.has(kunci)) return cache.get(kunci)
  const janji = (async () => {
    const r = await fetch(`${import.meta.env.BASE_URL}ssh/${kunci}.json`)
    if (!r.ok) throw new Error(`Data ${kunci} belum tersedia.`)
    const j = await r.json()
    const butir = j.data.map(([kode, kelompok, uraian, spesifikasi, satuan, harga], i) => ({
      id: `${kunci}:${i}`, sumber: kunci, kode, kelompok, uraian, spesifikasi, satuan, harga,
      _cari: normal(`${kode} ${kelompok} ${uraian} ${spesifikasi} ${satuan}`),
    }))
    return { ...j, butir }
  })()
  cache.set(kunci, janji)
  try { return await janji } catch (e) { cache.delete(kunci); throw e }
}

const normal = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s./]/g, ' ').replace(/\s+/g, ' ').trim()

/** Cari: semua kata kunci harus ada (urutan bebas). Hasil diurutkan: uraian diawali kata pertama lebih dulu. */
export function cariSsh(butir, q, { batas = 200 } = {}) {
  const kata = normal(q).split(' ').filter((k) => k.length > 0)
  if (!kata.length) return []
  const hasil = []
  for (const b of butir) {
    if (kata.every((k) => b._cari.includes(k))) hasil.push(b)
  }
  const awal = kata[0]
  hasil.sort((a, b) => (normal(b.uraian).startsWith(awal) - normal(a.uraian).startsWith(awal)) || a.uraian.length - b.uraian.length || a.harga - b.harga)
  return hasil.slice(0, batas)
}

export const namaSumber = (kunci) => SUMBER_SSH.find((s) => s.kunci === kunci)?.singkat || kunci || ''
