// Standar Harga Satuan (SSH) pemerintah sebagai referensi harga tertinggi.
//
// Dua asal data:
//  1. Bawaan  — berkas statis public/ssh/{kunci}.json (diolah dari Perwali/Pergub), tidak memakai kuota.
//  2. Sekolah — tersimpan di Firestore, dapat diubah lewat SIBOS (SSH tahun baru, koreksi harga, dsb.):
//       ssh/{kunci}                 → info sumber { nama, singkat, dasar, tahun, wilayah, aktif, jumlah, jumlah_potong }
//       ssh/{kunci}/potong/{000…}   → { urutan, butir: [{ k, g, u, s, t, h }] }  (1.000 item per dokumen)
//     k = kode, g = kelompok, u = uraian, s = spesifikasi, t = satuan, h = harga (bilangan bulat rupiah)
// Bila SSH bawaan diubah, seluruh isinya disalin ke Firestore lalu dipakai sebagai pengganti berkas bawaan.
import { ref } from 'vue'
import { collection, doc, getDoc, getDocs, writeBatch, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { bacaBerkas, eksporExcel, unduhTemplat } from '@/utils/excel'

export const BAWAAN = [
  { kunci: 'makassar-2026', nama: 'SSH Pemkot Makassar 2026', singkat: 'Pemkot Makassar', tahun: 2026, wilayah: 'kota', dasar: 'Perwali Makassar No. 22 Tahun 2025 tentang SSH & Analisis Standar Belanja 2026', catatan: 'Dibaca dengan OCR dari dokumen pindaian; cocokkan dengan dokumen resmi.' },
  { kunci: 'sulsel-2026', nama: 'SSH Pemprov Sulsel 2026', singkat: 'Pemprov Sulsel', tahun: 2026, wilayah: 'provinsi', dasar: 'Pergub Sulsel No. 10 Tahun 2025 tentang SSH Pemerintah Daerah 2026' },
]
export const WILAYAH = {
  kota: { nama: 'Pemerintah kota', ikon: 'Landmark' },
  provinsi: { nama: 'Pemerintah provinsi', ikon: 'Building2' },
  lainnya: { nama: 'Lainnya', ikon: 'Library' },
}
/** Sama dengan BAWAAN, untuk kode lama */
export const SUMBER_SSH = BAWAAN
const PER_POTONG = 1000

/** Naik setiap kali isi/daftar SSH berubah — komponen pencarian memuat ulang */
export const versiSsh = ref(0)

const cacheIsi = new Map()
let cacheDaftar = null

const normal = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s./]/g, ' ').replace(/\s+/g, ' ').trim()
const bulat = (n) => Number(String(n ?? '').trim().replace(/[.,]\d{1,2}$/, '').replace(/\D/g, '')) || 0
const ikonWilayah = (w) => WILAYAH[w]?.ikon || 'Library'

function siapkanButir(kunci, arr) {
  return arr.map((b, i) => ({
    id: `${kunci}:${i}`, idx: i, sumber: kunci,
    kode: b.kode || '', kelompok: b.kelompok || '', uraian: b.uraian || '', spesifikasi: b.spesifikasi || '', satuan: b.satuan || '', harga: Math.round(Number(b.harga) || 0),
    _cari: normal(`${b.kode} ${b.uraian} ${b.spesifikasi} ${b.satuan} ${b.kelompok}`),
  }))
}

/** Daftar sumber SSH (bawaan + milik sekolah), terbaru lebih dulu */
export async function muatDaftarSumber({ segar = false } = {}) {
  if (cacheDaftar && !segar) return cacheDaftar
  const peta = new Map(BAWAAN.map((b) => [b.kunci, { ...b, bawaan: true, tersimpan: false, aktif: true, jumlah: null, ikon: ikonWilayah(b.wilayah) }]))
  if (!modePratinjau) {
    try {
      const s = await getDocs(collection(db, 'ssh'))
      s.docs.forEach((d) => {
        const x = d.data()
        const asal = peta.get(d.id)
        peta.set(d.id, { ...(asal || {}), ...x, kunci: d.id, bawaan: !!asal, tersimpan: (x.jumlah_potong || 0) > 0, aktif: x.aktif !== false, ikon: ikonWilayah(x.wilayah || asal?.wilayah) })
      })
    } catch (e) { console.warn('Daftar SSH:', e.message) }
  }
  cacheDaftar = [...peta.values()].sort((a, b) => (b.tahun || 0) - (a.tahun || 0) || a.nama.localeCompare(b.nama))
  return cacheDaftar
}

/** Isi satu sumber SSH: { ...info, butir } */
export async function muatSsh(kunci) {
  if (cacheIsi.has(kunci)) return cacheIsi.get(kunci)
  const janji = (async () => {
    const daftar = await muatDaftarSumber()
    const info = daftar.find((s) => s.kunci === kunci) || { kunci, nama: kunci }
    let arr
    if (info.tersimpan) {
      const s = await getDocs(query(collection(db, 'ssh', kunci, 'potong'), orderBy('urutan')))
      arr = s.docs.flatMap((d) => (d.data().butir || []).map((x) => ({ kode: x.k, kelompok: x.g, uraian: x.u, spesifikasi: x.s, satuan: x.t, harga: x.h })))
    } else if (info.bawaan) {
      const r = await fetch(`${import.meta.env.BASE_URL}ssh/${kunci}.json`)
      if (!r.ok) throw new Error(`Data ${info.nama} belum tersedia.`)
      const j = await r.json()
      arr = j.data.map(([kode, kelompok, uraian, spesifikasi, satuan, harga]) => ({ kode, kelompok, uraian, spesifikasi, satuan, harga }))
    } else arr = []
    return { ...info, butir: siapkanButir(kunci, arr) }
  })()
  cacheIsi.set(kunci, janji)
  try { return await janji } catch (e) { cacheIsi.delete(kunci); throw e }
}

/** Cari: semua kata kunci harus ada (urutan bebas). Uraian yang diawali kata pertama tampil lebih dulu. */
export function cariSsh(butir, q, { batas = 200 } = {}) {
  const kata = normal(q).split(' ').filter((k) => k.length > 0)
  if (!kata.length) return []
  const hasil = butir.filter((b) => kata.every((k) => b._cari.includes(k)))
  const awal = kata[0]
  hasil.sort((a, b) => (normal(b.uraian).startsWith(awal) - normal(a.uraian).startsWith(awal)) || a.uraian.length - b.uraian.length || a.harga - b.harga)
  return hasil.slice(0, batas)
}

export const namaSumber = (kunci) => cacheDaftar?.find((s) => s.kunci === kunci)?.singkat || BAWAAN.find((s) => s.kunci === kunci)?.singkat || kunci || ''

/* ---------------- penyimpanan ---------------- */

function log(b, aksi, keterangan, id, sesudah = null) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi: 'ssh', id_dokumen: id, sebelum: null, sesudah, waktu: serverTimestamp(),
    perangkat: navigator.userAgent.slice(0, 120),
  })
}
const metaBersih = (m) => ({
  nama: String(m.nama || '').trim(), singkat: String(m.singkat || m.nama || '').trim(), dasar: String(m.dasar || '').trim(),
  tahun: Number(m.tahun) || new Date().getFullYear(), wilayah: m.wilayah || 'lainnya', aktif: m.aktif !== false, catatan: m.catatan || '',
})
function segarkan(kunci) {
  if (kunci) cacheIsi.delete(kunci)
  cacheDaftar = null
  versiSsh.value++
}

/** Tulis seluruh isi satu sumber (menimpa). butir: [{kode, kelompok, uraian, spesifikasi, satuan, harga}] */
export async function simpanIsiSsh(meta, butir, keterangan) {
  const kunci = meta.kunci
  const rapi = butir.filter((b) => String(b.uraian || '').trim() && Number(b.harga) > 0).map((b) => ({
    k: String(b.kode || '').trim(), g: String(b.kelompok || '').trim(), u: String(b.uraian).trim(), s: String(b.spesifikasi || '').trim(), t: String(b.satuan || '').trim(), h: Math.round(Number(b.harga)),
  }))
  if (modePratinjau) {
    const info = { ...metaBersih(meta), kunci, bawaan: !!BAWAAN.find((x) => x.kunci === kunci), tersimpan: true, jumlah: rapi.length, ikon: ikonWilayah(meta.wilayah) }
    cacheIsi.set(kunci, Promise.resolve({ ...info, butir: siapkanButir(kunci, rapi.map((x) => ({ kode: x.k, kelompok: x.g, uraian: x.u, spesifikasi: x.s, satuan: x.t, harga: x.h }))) }))
    if (cacheDaftar) { cacheDaftar = cacheDaftar.filter((s) => s.kunci !== kunci).concat(info).sort((a, b) => b.tahun - a.tahun) }
    versiSsh.value++
    return { pratinjau: true, jumlah: rapi.length }
  }
  const lama = await getDoc(doc(db, 'ssh', kunci))
  const nLama = lama.exists() ? lama.data().jumlah_potong || 0 : 0
  const nBaru = Math.ceil(rapi.length / PER_POTONG)
  // Satu batch maksimal 500 operasi; tiap potong 1 operasi — cukup hingga ±490.000 item
  const b = writeBatch(db)
  for (let i = 0; i < nBaru; i++) {
    b.set(doc(db, 'ssh', kunci, 'potong', String(i).padStart(3, '0')), { urutan: i, butir: rapi.slice(i * PER_POTONG, (i + 1) * PER_POTONG) })
  }
  for (let i = nBaru; i < nLama; i++) b.delete(doc(db, 'ssh', kunci, 'potong', String(i).padStart(3, '0')))
  b.set(doc(db, 'ssh', kunci), {
    ...metaBersih(meta), jumlah: rapi.length, jumlah_potong: nBaru,
    diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid, ...(lama.exists() ? {} : { dibuat: serverTimestamp() }),
  }, { merge: true })
  log(b, lama.exists() ? 'ubah' : 'tambah', keterangan || `Simpan ${meta.nama}: ${rapi.length} item`, kunci, { jumlah: rapi.length })
  await b.commit()
  segarkan(kunci)
  return { jumlah: rapi.length }
}

/** Ubah info sumber saja (nama, dasar, aktif, …) tanpa menulis ulang isinya */
export async function simpanInfoSsh(meta) {
  if (modePratinjau) {
    const s = cacheDaftar?.find((x) => x.kunci === meta.kunci)
    if (s) Object.assign(s, metaBersih(meta))
    versiSsh.value++
    return
  }
  const b = writeBatch(db)
  b.set(doc(db, 'ssh', meta.kunci), { ...metaBersih(meta), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
  log(b, 'ubah', `Ubah info ${meta.nama}${meta.aktif === false ? ' (nonaktif)' : ''}`, meta.kunci)
  await b.commit()
  segarkan()
}

/** Hapus sumber milik sekolah. Untuk SSH bawaan: kembalikan ke isi berkas bawaan. */
export async function hapusSsh(sumber) {
  if (modePratinjau) { cacheIsi.delete(sumber.kunci); if (cacheDaftar) cacheDaftar = cacheDaftar.filter((s) => s.bawaan || s.kunci !== sumber.kunci); versiSsh.value++; return }
  const b = writeBatch(db)
  for (let i = 0; i < (sumber.jumlah_potong || 0); i++) b.delete(doc(db, 'ssh', sumber.kunci, 'potong', String(i).padStart(3, '0')))
  if (sumber.bawaan) b.set(doc(db, 'ssh', sumber.kunci), { jumlah_potong: 0, jumlah: null, diperbarui: serverTimestamp() }, { merge: true })
  else b.delete(doc(db, 'ssh', sumber.kunci))
  log(b, 'hapus', sumber.bawaan ? `Kembalikan ${sumber.nama} ke data bawaan` : `Hapus ${sumber.nama}`, sumber.kunci)
  await b.commit()
  segarkan(sumber.kunci)
}

/** Ubah / tambah (idx = null) / hapus (data = null) satu item */
export async function ubahItemSsh(kunci, idx, data) {
  const isi = await muatSsh(kunci)
  const arr = isi.butir.map(({ kode, kelompok, uraian, spesifikasi, satuan, harga }) => ({ kode, kelompok, uraian, spesifikasi, satuan, harga }))
  let ket
  if (data && idx == null) { arr.push(data); ket = `Tambah item SSH "${data.uraian}" Rp ${Number(data.harga).toLocaleString('id-ID')} (${isi.nama})` }
  else if (data) { const l = arr[idx]; arr[idx] = data; ket = `Ubah item SSH "${data.uraian}": Rp ${Number(l.harga).toLocaleString('id-ID')} → Rp ${Number(data.harga).toLocaleString('id-ID')} (${isi.nama})` }
  else { ket = `Hapus item SSH "${arr[idx].uraian}" (${isi.nama})`; arr.splice(idx, 1) }
  return simpanIsiSsh(isi, arr, ket)
}

export function kunciBaru(singkat, tahun, ada = []) {
  const dasar = `${normal(singkat).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ssh'}-${tahun}`
  let k = dasar, n = 2
  while (ada.includes(k)) k = `${dasar}-${n++}`
  return k
}

/* ---------------- Excel ---------------- */

const KOLOM_EXCEL = [
  { kunci: 'kode', judul: 'Kode', lebar: 18 },
  { kunci: 'kelompok', judul: 'Kelompok', lebar: 26 },
  { kunci: 'uraian', judul: 'Uraian', lebar: 40, wajib: true },
  { kunci: 'spesifikasi', judul: 'Spesifikasi', lebar: 34 },
  { kunci: 'satuan', judul: 'Satuan', lebar: 14, wajib: true },
  { kunci: 'harga', judul: 'Harga', lebar: 16, jenis: 'uang', wajib: true },
]

export function unduhTemplatSsh() {
  return unduhTemplat({
    jenis: 'SSH', kolom: KOLOM_EXCEL,
    contoh: [
      { kode: '1.1.12.01.03.0004.00001', kelompok: 'Konsumsi Makan dan Minum', uraian: 'Makan', spesifikasi: 'Rapat', satuan: 'Orang/Kali', harga: 40000 },
      { kode: '', kelompok: 'Alat Tulis Kantor', uraian: 'Kertas HVS', spesifikasi: 'A4 75 gsm', satuan: 'Rim', harga: 55000 },
    ],
    petunjuk: [
      'Satu baris = satu item SSH. Kolom Uraian, Satuan dan Harga wajib diisi.',
      'Harga ditulis angka saja tanpa "Rp" dan titik, mis. 40000.',
      'Kolom Kode dan Kelompok boleh kosong; Kelompok membantu pencarian (mis. "Konsumsi Makan dan Minum").',
      'Judul kolom boleh berbeda urutan; SIBOS mengenali kata Kode, Kelompok/Kategori, Uraian/Nama, Spesifikasi, Satuan, Harga.',
      'SSH dari dokumen PDF Perwali/Pergub: salin tabelnya ke Excel dengan susunan kolom di atas.',
    ],
  })
}

/** Baca Excel/CSV SSH → { butir, lewat } */
export async function bacaExcelSsh(file) {
  const lembar = await bacaBerkas(file)
  const cocok = (t, kata) => kata.some((k) => t.includes(k))
  for (const ws of lembar) {
    const ib = ws.baris.slice(0, 20).findIndex((r) => {
      const t = r.map((x) => normal(x))
      return t.some((x) => cocok(x, ['uraian', 'nama barang', 'nama item', 'nama'])) && t.some((x) => cocok(x, ['harga']))
    })
    if (ib < 0) continue
    const kepala = ws.baris[ib].map((x) => normal(x))
    const cari = (kata, kecuali = []) => kepala.findIndex((x) => cocok(x, kata) && !cocok(x, kecuali))
    const k = {
      kode: cari(['kode']), kelompok: cari(['kelompok', 'kategori', 'jenis', 'sub kelompok']), uraian: cari(['uraian', 'nama barang', 'nama item', 'nama'], ['kelompok']),
      spesifikasi: cari(['spesifikasi', 'spek']), satuan: cari(['satuan']), harga: cari(['harga']),
    }
    const butir = []
    let lewat = 0
    for (const r of ws.baris.slice(ib + 1)) {
      const ambil = (n) => (n >= 0 ? String(r[n] ?? '').trim() : '')
      const b = { kode: ambil(k.kode), kelompok: ambil(k.kelompok), uraian: ambil(k.uraian), spesifikasi: ambil(k.spesifikasi), satuan: ambil(k.satuan), harga: typeof r[k.harga] === 'number' ? Math.round(r[k.harga]) : bulat(r[k.harga]) }
      if (!b.uraian && !b.harga) continue
      if (!b.uraian || !b.satuan || b.harga <= 0) { lewat++; continue }
      butir.push(b)
    }
    return { butir, lewat, lembar: ws.nama }
  }
  throw new Error('Tidak menemukan baris judul berisi kolom "Uraian" dan "Harga". Gunakan templat SSH SIBOS.')
}

export async function eksporSsh(sumber) {
  const isi = await muatSsh(sumber.kunci)
  return eksporExcel({ judul: `${isi.nama}`, kolom: KOLOM_EXCEL, baris: isi.butir, namaBerkas: `${isi.nama} - SIBOS` })
}
