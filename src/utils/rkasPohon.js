// Pengolahan uraian RKAS: pohon 5 tingkat (SNP → Komponen → Kegiatan → Rekening → Uraian),
// ringkasan bulan/tahap/kategori, matriks SNP × komponen, dan proporsi juknis.
import { NAMA_KODE_ARKAS } from '@/config/kodeArkas'

const NOL12 = () => Array(12).fill(0)
const tambahBulan = (a, b) => { if (b) for (let i = 0; i < 12; i++) a[i] += b[i] || 0 }

/** Nilai uraian untuk bulan tertentu (1–12); null bila rencana bulanan belum ada */
export const nilaiBulan = (u, bulan) => (u.bulan ? u.bulan[bulan - 1] || 0 : null)
/** Nilai uraian untuk tahap 1/2 */
export const nilaiTahap = (u, tahap) => (tahap === 1 ? u.tahap1 : u.tahap2)

/** Buat fungsi pencari nama kode dari tabel referensi + cadangan bawaan */
export function pencariNama(refKegiatan = [], refRekening = []) {
  const keg = new Map(refKegiatan.map((k) => [k.kode, k.nama]))
  const rek = new Map(refRekening.map((k) => [k.kode, k.nama]))
  return {
    kegiatan: (kode) => keg.get(kode) || NAMA_KODE_ARKAS[kode] || '',
    rekening: (kode) => rek.get(kode) || '',
  }
}

function simpul(kode, nama, tingkat) {
  return { kode, nama, tingkat, jumlah: 0, tahap1: 0, tahap2: 0, bulan: NOL12(), anak: [], uraian: [], jumlahUraian: 0 }
}
function tambahkan(s, u) {
  s.jumlah += u.jumlah; s.tahap1 += u.tahap1; s.tahap2 += u.tahap2; s.jumlahUraian++
  tambahBulan(s.bulan, u.bulan)
}

/**
 * uraian → pohon. nilai(u) opsional untuk menyaring (mis. hanya bulan Maret: u => u.bulan[2]).
 * Uraian dengan nilai 0 pada saringan tidak dimasukkan.
 */
export function bangunPohon(uraian, nama, { saring } = {}) {
  const akar = new Map()
  for (const u of uraian) {
    if (saring && !saring(u)) continue
    const [s1, s2] = u.kode_kegiatan.split('.')
    const k1 = s1, k2 = `${s1}.${s2}`, k3 = u.kode_kegiatan
    if (!akar.has(k1)) akar.set(k1, simpul(k1, nama.kegiatan(k1), 1))
    const n1 = akar.get(k1)
    let n2 = n1.anak.find((x) => x.kode === k2)
    if (!n2) { n2 = simpul(k2, nama.kegiatan(k2), 2); n1.anak.push(n2) }
    let n3 = n2.anak.find((x) => x.kode === k3)
    if (!n3) { n3 = simpul(k3, nama.kegiatan(k3), 3); n2.anak.push(n3) }
    let n4 = n3.anak.find((x) => x.kode === u.kode_rekening)
    if (!n4) { n4 = simpul(u.kode_rekening, nama.rekening(u.kode_rekening), 4); n3.anak.push(n4) }
    n4.uraian.push(u)
    for (const n of [n1, n2, n3, n4]) tambahkan(n, u)
  }
  const urut = (arr) => arr.sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true })).forEach((x) => urut(x.anak))
  const hasil = [...akar.values()]
  urut(hasil)
  return hasil
}

/** Baris datar untuk tabel/cetak: induk (tingkat 1–3) diikuti uraiannya, mirip Kertas Kerja ARKAS */
export function barisDatar(pohon, { denganRekening = false } = {}) {
  const out = []
  const jalan = (n) => {
    if (n.tingkat <= 3 || denganRekening) out.push({ induk: true, ...n })
    if (n.tingkat === 4) n.uraian.forEach((u) => out.push({ induk: false, rekening: n.kode, ...u }))
    n.anak.forEach(jalan)
  }
  pohon.forEach(jalan)
  return out
}

export function ringkasan(uraian) {
  const r = { jumlah: 0, tahap1: 0, tahap2: 0, bulan: NOL12(), kategori: { operasional: 0, alat_mesin: 0, aset_lain: 0 }, adaBulanan: uraian.length > 0 && uraian.every((u) => u.bulan) }
  for (const u of uraian) {
    r.jumlah += u.jumlah; r.tahap1 += u.tahap1; r.tahap2 += u.tahap2
    r.kategori[u.kategori] = (r.kategori[u.kategori] || 0) + u.jumlah
    tambahBulan(r.bulan, u.bulan)
  }
  return r
}

/** Matriks SNP (baris) × komponen (kolom 01–12) */
export function matriksSnpKomponen(uraian) {
  const m = {}
  for (const u of uraian) {
    m[u.snp] ??= {}
    m[u.snp][u.komponen] = (m[u.snp][u.komponen] || 0) + u.jumlah
  }
  return m
}

/** Proporsi juknis BOSP (Permendikdasmen 8/2026 Pasal 42) terhadap pagu/alokasi */
export function proporsiJuknis(uraian, pagu, { negeri = true } = {}) {
  const jml = (f) => uraian.filter(f).reduce((s, u) => s + u.jumlah, 0)
  const buku = jml((u) => u.komponen === '02' && ['03', '04', '05'].includes(u.kode_kegiatan.split('.')[2]))
  const perpus = jml((u) => u.komponen === '02')
  const pemeliharaan = jml((u) => u.komponen === '08')
  const honor = jml((u) => u.komponen === '12')
  const persen = (n) => (pagu ? (n / pagu) * 100 : 0)
  const batasHonor = negeri ? 20 : 40
  return [
    { kunci: 'buku', judul: 'Penyediaan buku', pasal: 'Pasal 42 ayat (2)', jenis: 'min', batas: 10, nilai: buku, persen: persen(buku), ket: `Komponen perpustakaan seluruhnya ${persen(perpus).toFixed(2)}%`, ikon: 'BookCopy', warna: '#10b981' },
    { kunci: 'pemeliharaan', judul: 'Pemeliharaan sarana & prasarana', pasal: 'Pasal 42 ayat (3)', jenis: 'maks', batas: 20, nilai: pemeliharaan, persen: persen(pemeliharaan), ket: 'Komponen h (kode 08)', ikon: 'Wrench', warna: '#f97316' },
    { kunci: 'honor', judul: 'Pembayaran honor', pasal: 'Pasal 42 ayat (4)', jenis: 'maks', batas: batasHonor, nilai: honor, persen: persen(honor), ket: `Komponen l (kode 12), batas ${batasHonor}% sekolah ${negeri ? 'negeri' : 'swasta'}`, ikon: 'HeartHandshake', warna: '#e11d48' },
  ].map((p) => ({ ...p, aman: p.jenis === 'min' ? p.persen >= p.batas : p.persen <= p.batas }))
}

/** Bandingkan dua versi per kegiatan (tingkat 3) */
export function bandingkanVersi(lama, baru, nama) {
  const peta = new Map()
  const isi = (arr, k) => arr.forEach((u) => {
    const x = peta.get(u.kode_kegiatan) || { kode: u.kode_kegiatan, nama: nama.kegiatan(u.kode_kegiatan), lama: 0, baru: 0, nLama: 0, nBaru: 0 }
    x[k] += u.jumlah; x[k === 'lama' ? 'nLama' : 'nBaru']++
    peta.set(u.kode_kegiatan, x)
  })
  isi(lama, 'lama'); isi(baru, 'baru')
  return [...peta.values()].map((x) => ({ ...x, selisih: x.baru - x.lama })).sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true }))
}
