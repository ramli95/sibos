// Mengecilkan gambar di peramban sebelum disimpan (logo, tanda tangan) agar ringan.
export function kecilkanGambar(file, { maks = 400, format = 'image/png', kualitas = 0.9, batasKb = 300 } = {}) {
  return new Promise((selesai, gagal) => {
    if (!/^image\//.test(file.type)) return gagal(new Error('Pilih berkas gambar (PNG/JPG).'))
    const img = new Image()
    img.onload = () => {
      const skala = Math.min(1, maks / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * skala)
      c.height = Math.round(img.height * skala)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      const url = c.toDataURL(format, kualitas)
      URL.revokeObjectURL(img.src)
      if (url.length * 0.75 > batasKb * 1024) return gagal(new Error(`Gambar masih terlalu besar (>${batasKb} KB). Gunakan gambar yang lebih sederhana.`))
      selesai(url)
    }
    img.onerror = () => gagal(new Error('Gambar tidak dapat dibaca.'))
    img.src = URL.createObjectURL(file)
  })
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
