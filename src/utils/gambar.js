// Mengecilkan gambar di peramban sebelum disimpan (logo, tanda tangan) agar ringan.
function gambarKeDataUrl(img, { maks, format, kualitas, batasKb }) {
  const skala = Math.min(1, maks / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
  const c = document.createElement('canvas')
  c.width = Math.round((img.naturalWidth || img.width) * skala)
  c.height = Math.round((img.naturalHeight || img.height) * skala)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  const url = c.toDataURL(format, kualitas) // gagal (SecurityError) bila gambar dari situs lain tanpa izin CORS
  if (url.length * 0.75 > batasKb * 1024) throw new Error(`Gambar masih terlalu besar (>${batasKb} KB). Gunakan gambar yang lebih sederhana.`)
  return url
}

const muatGambar = (src, cors) => new Promise((selesai, gagal) => {
  const img = new Image()
  if (cors) img.crossOrigin = 'anonymous'
  img.onload = () => selesai(img)
  img.onerror = () => gagal(new Error('Gambar tidak dapat dimuat dari tautan tersebut.'))
  img.src = src
})

export async function kecilkanGambar(file, { maks = 400, format = 'image/png', kualitas = 0.9, batasKb = 300 } = {}) {
  if (!/^image\//.test(file.type)) throw new Error('Pilih berkas gambar (PNG/JPG).')
  const src = URL.createObjectURL(file)
  try { return gambarKeDataUrl(await muatGambar(src), { maks, format, kualitas, batasKb }) } finally { URL.revokeObjectURL(src) }
}

/** Tautan Google Drive → tautan gambar langsung */
export function rapikanTautanGambar(url) {
  const u = url.trim()
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/)
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w600`
  return u
}

/**
 * Mengambil gambar dari tautan internet.
 * Hasil: { nilai, tersalin } — tersalin=true bila gambar berhasil disalin menjadi data (aman bila tautan mati),
 * false bila hanya tautannya yang bisa disimpan (situs asal tidak mengizinkan penyalinan).
 */
export async function gambarDariTautan(url, opsi = {}) {
  const src = rapikanTautanGambar(url)
  if (!/^https?:\/\//i.test(src)) throw new Error('Tautan harus diawali https://')
  const o = { maks: 400, format: 'image/png', kualitas: 0.9, batasKb: 300, ...opsi }
  try {
    const r = await fetch(src, { mode: 'cors' })
    if (r.ok) {
      const blob = await r.blob()
      if (/^image\//.test(blob.type)) return { nilai: await kecilkanGambar(new File([blob], 'logo', { type: blob.type }), o), tersalin: true }
    }
  } catch { /* coba cara berikutnya */ }
  try { return { nilai: gambarKeDataUrl(await muatGambar(src, true), o), tersalin: true } } catch { /* situs tidak mengizinkan */ }
  await muatGambar(src, false) // pastikan tautan memang gambar
  return { nilai: src, tersalin: false }
}

/** data URL → File (untuk diarsipkan ke Drive) */
export function dataUrlKeBerkas(url, nama) {
  const [kepala, isi] = url.split(',')
  const mime = kepala.match(/data:(.*?);/)[1]
  const biner = atob(isi)
  const arr = new Uint8Array(biner.length)
  for (let i = 0; i < biner.length; i++) arr[i] = biner.charCodeAt(i)
  return new File([arr], nama, { type: mime })
}
