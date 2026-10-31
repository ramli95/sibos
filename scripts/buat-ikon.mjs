// Membuat ikon PWA dari logo Opsi A "Batang Tumbuh"
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/logo.svg')
// Versi maskable: logo diperkecil di tengah latar navy penuh (zona aman 80%)
const maskable = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#1E3A8A"/><g transform="translate(8 8)">${svg.toString().replace(/<\/?svg[^>]*>/g, '')}</g></svg>`)

const daftar = [
  ['pwa-192.png', svg, 192],
  ['pwa-512.png', svg, 512],
  ['maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', maskable, 180],
  ['favicon-32.png', svg, 32],
]
for (const [nama, sumber, ukuran] of daftar) {
  await sharp(sumber, { density: 600 }).resize(ukuran, ukuran).png().toFile(`public/${nama}`)
  console.log('✓', nama)
}
