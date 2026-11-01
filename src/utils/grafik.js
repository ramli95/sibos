// Mengunduh grafik SVG sebagai gambar PNG (warna dari CSS ikut terbawa, latar mengikuti kartu).
import { unduhBlob } from './excel'

const SIFAT = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'fill-opacity', 'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline']

export async function unduhSvgPng(svg, namaBerkas, { skala = 3, latar = null } = {}) {
  const klon = svg.cloneNode(true)
  const asli = [svg, ...svg.querySelectorAll('*')]
  const salin = [klon, ...klon.querySelectorAll('*')]
  asli.forEach((el, i) => {
    const cs = getComputedStyle(el)
    SIFAT.forEach((p) => { const v = cs.getPropertyValue(p); if (v) salin[i].style.setProperty(p, v) })
  })
  const vb = svg.viewBox.baseVal
  const w = vb?.width || svg.clientWidth
  const h = vb?.height || svg.clientHeight
  klon.setAttribute('width', w); klon.setAttribute('height', h)
  klon.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const isi = new XMLSerializer().serializeToString(klon)
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(isi)
  await img.decode()
  const c = document.createElement('canvas')
  c.width = w * skala; c.height = h * skala
  const ctx = c.getContext('2d')
  ctx.fillStyle = latar || getComputedStyle(svg.closest('.kartu') || document.body).backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'))
  unduhBlob(blob, `${namaBerkas}.png`, 'image/png')
}
