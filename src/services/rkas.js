// RKAS: versi (murni / pergeseran / perubahan), uraian per SNP, pergeseran, dan Standar Harga.
//
// Susunan Firestore
//   rkas/{idVersi}                     → ringkasan versi (tahun, jenis, total, tahap, berlaku, …)
//   rkas/{idVersi}/bagian/{snp}        → { snp, butir: [uraian…] } — satu dokumen per SNP (≤ 1 MB, hemat baca)
//   rkas_pergeseran/{id}               → catatan setiap pergeseran (sebelum/sesudah)
//   standar_harga/{id}                 → katalog harga satuan
// Semua angka uang disimpan sebagai bilangan bulat rupiah.
import {
  collection, doc, getDoc, getDocs, writeBatch, serverTimestamp, query, where, orderBy,
} from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { muatReferensi, simpanReferensi } from './referensi'
import { kategoriRekening, pecahKode } from '@/utils/arkas'

export const JENIS_VERSI = {
  murni: { nama: 'Murni', ikon: 'FileCheck', warna: 'from-sky-400 to-blue-600', lencana: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  pergeseran: { nama: 'Pergeseran', ikon: 'ArrowRightLeft', warna: 'from-amber-400 to-orange-500', lencana: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  perubahan: { nama: 'Perubahan', ikon: 'FilePen', warna: 'from-emerald-400 to-teal-600', lencana: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

const jumlahkan = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)
const idAcak = () => Math.random().toString(36).slice(2, 10)
const perangkat = () => navigator.userAgent.slice(0, 160)

function log(b, aksi, keterangan, koleksi, id, sebelum = null, sesudah = null) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi, id_dokumen: id, sebelum, sesudah, waktu: serverTimestamp(), perangkat: perangkat(),
  })
}

/** Lengkapi satu uraian: kode turunan, kategori, jumlah = volume × harga, tahap dari bulan */
export function rapikanUraian(u) {
  const { snp, komponen } = pecahKode(u.kode_kegiatan)
  const bulan = Array.isArray(u.bulan) && u.bulan.length === 12 ? u.bulan.map((n) => Math.round(Number(n) || 0)) : null
  const jumlah = Math.round(Number(u.jumlah ?? (Number(u.volume) || 0) * (Number(u.harga) || 0)))
  return {
    id: u.id || idAcak(),
    no: u.no ?? null,
    kode_kegiatan: u.kode_kegiatan,
    snp, komponen,
    kode_rekening: u.kode_rekening,
    kategori: u.kategori || kategoriRekening(u.kode_rekening),
    uraian: String(u.uraian || '').trim(),
    volume: Number(u.volume) || 0,
    satuan: String(u.satuan || '').trim(),
    harga: Math.round(Number(u.harga) || 0),
    jumlah,
    tahap1: bulan ? jumlahkan(bulan.slice(0, 6), (x) => x) : Math.round(Number(u.tahap1) || 0),
    tahap2: bulan ? jumlahkan(bulan.slice(6), (x) => x) : Math.round(Number(u.tahap2) || 0),
    bulan,
    id_harga: u.id_harga || null,
  }
}

export function ringkasVersi(uraian) {
  return {
    total: jumlahkan(uraian, (u) => u.jumlah),
    tahap1: jumlahkan(uraian, (u) => u.tahap1),
    tahap2: jumlahkan(uraian, (u) => u.tahap2),
    jumlah_uraian: uraian.length,
    ada_bulanan: uraian.length > 0 && uraian.every((u) => Array.isArray(u.bulan)),
    per_kategori: ['operasional', 'alat_mesin', 'aset_lain'].reduce((o, k) => ({ ...o, [k]: jumlahkan(uraian.filter((u) => u.kategori === k), (u) => u.jumlah) }), {}),
  }
}

/* ---------------- Baca ---------------- */

export async function muatDaftarVersi(tahun) {
  if (modePratinjau) return (await import('./contohRkas')).versiContoh(tahun)
  const q = tahun ? query(collection(db, 'rkas'), where('tahun', '==', Number(tahun))) : collection(db, 'rkas')
  const s = await getDocs(q)
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.tanggal_dokumen_iso || '').localeCompare(String(b.tanggal_dokumen_iso || '')))
}

const cacheUraian = new Map()
export async function muatUraian(idVersi, { segar = false } = {}) {
  if (!segar && cacheUraian.has(idVersi)) return cacheUraian.get(idVersi)
  let hasil
  if (modePratinjau) hasil = (await import('./contohRkas')).uraianContoh(idVersi)
  else {
    const s = await getDocs(collection(db, 'rkas', idVersi, 'bagian'))
    hasil = s.docs.flatMap((d) => d.data().butir || [])
  }
  hasil.sort((a, b) => (a.no ?? 1e9) - (b.no ?? 1e9) || a.kode_kegiatan.localeCompare(b.kode_kegiatan))
  cacheUraian.set(idVersi, hasil)
  return hasil
}
export const lupakanUraian = (idVersi) => (idVersi ? cacheUraian.delete(idVersi) : cacheUraian.clear())

/* ---------------- Simpan versi (impor) ---------------- */

function tulisBagian(b, idVersi, uraian) {
  const per = new Map()
  uraian.forEach((u) => per.set(u.snp, [...(per.get(u.snp) || []), u]))
  for (const [snp, butir] of per) b.set(doc(db, 'rkas', idVersi, 'bagian', snp || 'lain'), { snp, butir })
  return [...per.keys()]
}

/**
 * Simpan RKAS hasil impor sebagai versi baru (atau timpa versi yang ada).
 * meta: { tahun, nama, jenis, tanggal_dokumen, tanggal_dokumen_iso, pagu, berlaku, sumber }
 */
export async function simpanVersi({ id, meta, uraian, induk = [], namaBerkas }) {
  const butir = uraian.map(rapikanUraian)
  const ringkas = ringkasVersi(butir)
  const ref = id ? doc(db, 'rkas', id) : doc(collection(db, 'rkas'))
  // Bersihkan bagian lama (bila menimpa)
  if (id) {
    const lama = await getDocs(collection(db, 'rkas', id, 'bagian'))
    if (!lama.empty) { const bh = writeBatch(db); lama.docs.forEach((d) => bh.delete(d.ref)); await bh.commit() }
  }
  const b = writeBatch(db)
  const snp = tulisBagian(b, ref.id, butir)
  if (meta.berlaku) {
    const semua = await getDocs(query(collection(db, 'rkas'), where('tahun', '==', Number(meta.tahun))))
    semua.docs.filter((d) => d.id !== ref.id && d.data().berlaku).forEach((d) => b.update(d.ref, { berlaku: false }))
  }
  b.set(ref, {
    ...meta, tahun: Number(meta.tahun), ...ringkas, snp,
    diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid, ...(id ? {} : { dibuat: serverTimestamp() }),
  }, { merge: true })
  log(b, 'impor', `Impor RKAS ${meta.tahun} versi ${meta.nama} dari "${namaBerkas || '-'}": ${butir.length} uraian, total Rp ${ringkas.total.toLocaleString('id-ID')}`,
    'rkas', ref.id, null, { total: ringkas.total, tahap1: ringkas.tahap1, tahap2: ringkas.tahap2, jumlah_uraian: butir.length })
  await b.commit()
  lupakanUraian(ref.id)
  await isiReferensiArkas(induk, butir)
  return ref.id
}

/** Tambahkan kode kegiatan & rekening ARKAS yang belum ada di tabel referensi */
export async function isiReferensiArkas(induk, uraian) {
  const [keg, rek] = await Promise.all([muatReferensi('kegiatan_arkas', { segar: true }), muatReferensi('rekening_arkas', { segar: true })])
  const kegBaru = [...keg.butir]
  let nKeg = 0, nRek = 0
  for (const r of induk) {
    const ada = kegBaru.find((k) => k.kode === r.kode)
    const { snp, komponen } = pecahKode(r.kode)
    if (!ada) { kegBaru.push({ kode: r.kode, nama: r.nama, snp, komponen: r.tingkat >= 2 ? komponen : '', tingkat: r.tingkat }); nKeg++ }
    else if (!ada.nama && r.nama) ada.nama = r.nama
  }
  kegBaru.sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true }))
  const rekBaru = [...rek.butir]
  for (const u of uraian) {
    if (!rekBaru.find((k) => k.kode === u.kode_rekening)) { rekBaru.push({ kode: u.kode_rekening, nama: NAMA_REKENING[u.kode_rekening] || '', kategori: u.kategori }); nRek++ }
  }
  rekBaru.sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true }))
  if (nKeg) await simpanReferensi('kegiatan_arkas', kegBaru, `Menambah ${nKeg} kode kegiatan ARKAS dari impor RKAS`)
  if (nRek) await simpanReferensi('rekening_arkas', rekBaru, `Menambah ${nRek} kode rekening ARKAS dari impor RKAS`)
  return { nKeg, nRek }
}

export async function jadikanBerlaku(versi, semua) {
  const b = writeBatch(db)
  semua.filter((v) => v.tahun === versi.tahun && v.berlaku && v.id !== versi.id).forEach((v) => b.update(doc(db, 'rkas', v.id), { berlaku: false }))
  b.update(doc(db, 'rkas', versi.id), { berlaku: true, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, 'ubah', `Menetapkan RKAS ${versi.tahun} versi ${versi.nama} sebagai versi berlaku`, 'rkas', versi.id)
  await b.commit()
}

export async function hapusVersi(versi) {
  const bagian = await getDocs(collection(db, 'rkas', versi.id, 'bagian'))
  const b = writeBatch(db)
  bagian.docs.forEach((d) => b.delete(d.ref))
  b.delete(doc(db, 'rkas', versi.id))
  log(b, 'hapus', `Menghapus RKAS ${versi.tahun} versi ${versi.nama} (total Rp ${Number(versi.total || 0).toLocaleString('id-ID')})`, 'rkas', versi.id)
  await b.commit()
  lupakanUraian(versi.id)
}

/* ---------------- Pergeseran ---------------- */

/**
 * perubahan: [{ sebelum: uraian | null (baru), sesudah: uraian }]
 * Total versi harus tetap (selisih 0). Semua dicatat ke rkas_pergeseran + log aktivitas.
 */
export async function simpanPergeseran(versi, semuaUraian, perubahan, alasan) {
  const selisih = jumlahkan(perubahan, (p) => p.sesudah.jumlah - (p.sebelum?.jumlah || 0))
  if (selisih !== 0) throw new Error(`Total RKAS harus tetap. Selisih masih Rp ${selisih.toLocaleString('id-ID')}.`)
  const peta = new Map(semuaUraian.map((u) => [u.id, u]))
  perubahan.forEach((p) => peta.set(p.sesudah.id, rapikanUraian(p.sesudah)))
  const baru = [...peta.values()]
  const snpBerubah = new Set(perubahan.map((p) => pecahKode(p.sesudah.kode_kegiatan).snp))
  const b = writeBatch(db)
  for (const snp of snpBerubah) b.set(doc(db, 'rkas', versi.id, 'bagian', snp), { snp, butir: baru.filter((u) => u.snp === snp) })
  const ringkas = ringkasVersi(baru)
  b.update(doc(db, 'rkas', versi.id), { ...ringkas, snp: [...new Set(baru.map((u) => u.snp))], diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  const ref = doc(collection(db, 'rkas_pergeseran'))
  const ringkasP = (u) => (u ? { id: u.id, kode_kegiatan: u.kode_kegiatan, kode_rekening: u.kode_rekening, uraian: u.uraian, volume: u.volume, harga: u.harga, jumlah: u.jumlah, bulan: u.bulan } : null)
  b.set(ref, {
    id_versi: versi.id, tahun: versi.tahun, alasan: alasan || '', uid: auth.currentUser.uid, waktu: serverTimestamp(),
    rincian: perubahan.map((p) => ({ sebelum: ringkasP(p.sebelum), sesudah: ringkasP(rapikanUraian(p.sesudah)) })),
    nilai: jumlahkan(perubahan, (p) => Math.max(0, (p.sebelum?.jumlah || 0) - p.sesudah.jumlah)),
  })
  log(b, 'pergeseran', `Pergeseran RKAS ${versi.tahun} (${versi.nama}): ${perubahan.length} uraian${alasan ? ' — ' + alasan : ''}`, 'rkas', versi.id,
    null, { id_pergeseran: ref.id, uraian: perubahan.map((p) => p.sesudah.uraian).slice(0, 10) })
  await b.commit()
  cacheUraian.set(versi.id, baru.sort((a, c) => (a.no ?? 1e9) - (c.no ?? 1e9)))
  return ref.id
}

export async function muatPergeseran(idVersi) {
  if (modePratinjau) return []
  const s = await getDocs(query(collection(db, 'rkas_pergeseran'), where('id_versi', '==', idVersi)))
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.waktu?.seconds || 0) - (a.waktu?.seconds || 0))
}

/* ---------------- Standar Harga ---------------- */

export const KOLOM_HARGA = ['kode_item', 'kelompok', 'nama_item', 'spesifikasi', 'satuan', 'harga', 'jenis', 'kode_rekening', 'kategori', 'pajak_bawaan', 'tahun', 'aktif', 'sumber', 'sumber_ssh', 'kode_ssh', 'uraian_ssh', 'harga_ssh']

export async function muatStandarHarga() {
  if (modePratinjau) return (await import('./contohRkas')).hargaContoh()
  const s = await getDocs(query(collection(db, 'standar_harga'), orderBy('nama_item')))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

const ambilHarga = (x) => Object.fromEntries(KOLOM_HARGA.map((k) => [k, x[k] ?? (k === 'aktif' ? true : k === 'harga' || k === 'tahun' || k === 'harga_ssh' ? 0 : '')]))

export async function simpanHarga(id, data, sebelum) {
  const ref = id ? doc(db, 'standar_harga', id) : doc(collection(db, 'standar_harga'))
  const isi = ambilHarga(data)
  isi.harga = Math.round(Number(isi.harga) || 0)
  isi.tahun = Number(isi.tahun) || new Date().getFullYear()
  const riwayat = [...(sebelum?.riwayat || [])]
  if (!sebelum || sebelum.harga !== isi.harga || sebelum.tahun !== isi.tahun) riwayat.push({ tahun: isi.tahun, harga: isi.harga, tanggal: new Date().toISOString().slice(0, 10) })
  const b = writeBatch(db)
  b.set(ref, { ...isi, riwayat, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
  const ubah = sebelum ? KOLOM_HARGA.filter((k) => String(sebelum[k] ?? '') !== String(isi[k] ?? '')) : []
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Menambah'} standar harga ${isi.nama_item}${sebelum && sebelum.harga !== isi.harga ? `: Rp ${sebelum.harga.toLocaleString('id-ID')} → Rp ${isi.harga.toLocaleString('id-ID')}` : ''}`,
    'standar_harga', ref.id, sebelum ? Object.fromEntries(ubah.map((k) => [k, sebelum[k] ?? null])) : null, Object.fromEntries(ubah.map((k) => [k, isi[k] ?? null])))
  await b.commit()
  return ref.id
}

export async function hapusHarga(h) {
  const b = writeBatch(db)
  b.delete(doc(db, 'standar_harga', h.id))
  log(b, 'hapus', `Menghapus standar harga ${h.nama_item} (Rp ${Number(h.harga).toLocaleString('id-ID')})`, 'standar_harga', h.id)
  await b.commit()
}

/** Simpan banyak item sekaligus (impor dari RKAS / Excel). daftar: [{ id|null, data }] */
export async function simpanHargaMassal(daftar, keterangan) {
  const PER = 400
  let tambah = 0, ubah = 0
  for (let i = 0; i < daftar.length; i += PER) {
    const b = writeBatch(db)
    daftar.slice(i, i + PER).forEach(({ id, data, sebelum }) => {
      const ref = id ? doc(db, 'standar_harga', id) : doc(collection(db, 'standar_harga'))
      const isi = ambilHarga(data)
      const riwayat = [...(sebelum?.riwayat || [])]
      if (!sebelum || sebelum.harga !== isi.harga) riwayat.push({ tahun: isi.tahun, harga: isi.harga, tanggal: new Date().toISOString().slice(0, 10) })
      b.set(ref, { ...isi, riwayat, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
      id ? ubah++ : tambah++
    })
    await b.commit()
  }
  const b = writeBatch(db)
  log(b, 'impor', `${keterangan}: ${tambah} item baru, ${ubah} diperbarui`, 'standar_harga', null, null, { tambah, ubah })
  await b.commit()
  return { tambah, ubah }
}

/** Kelompok & jenis item ditebak dari kode rekening dan nama uraian */
export function tebakKelompok(u) {
  const n = u.uraian.toLowerCase()
  const r = u.kode_rekening
  if (/konsumsi|makan|snack|kudapan|air gelas|bosara/.test(n) || r.endsWith('.0052')) return { kelompok: 'Konsumsi', jenis: 'konsumsi', pajak_bawaan: 'PPh 23' }
  if (/transport|transpor/.test(n) || r.startsWith('5.1.02.04')) return { kelompok: 'Transpor', jenis: 'transpor', pajak_bawaan: '' }
  if (/honor|narasumber|insentif|tenaga (kebersihan|keamanan|administrasi)|pengawas|panitia/.test(n) || r.endsWith('.0013') || r === '5.1.02.02.01.0003') return { kelompok: 'Honor', jenis: 'honor', pajak_bawaan: 'PPh 21' }
  if (/^jasa|sewa|service|servis|tukang|pekerja|pasang|rias|pelatih|cetak|foto/.test(n)) return { kelompok: 'Jasa', jenis: 'jasa', pajak_bawaan: 'PPh 23' }
  if (/listrik|internet|langganan|retribusi|surat kabar|majalah/.test(n)) return { kelompok: 'Langganan', jenis: 'langganan', pajak_bawaan: '' }
  if (/admin|materai|meterai/.test(n)) return { kelompok: 'Administrasi', jenis: 'administrasi', pajak_bawaan: '' }
  if (/buku|splash|mahir|matematika|bahasa|ilmu pengetahuan|pancasila|seni budaya|interactive/.test(n) && r.includes('05.02') === false && /^5\.2\.05/.test(r)) return { kelompok: 'Buku', jenis: 'barang', pajak_bawaan: 'PPN' }
  if (/^5\.2\.05/.test(r)) return { kelompok: 'Buku', jenis: 'barang', pajak_bawaan: 'PPN' }
  if (/^5\.2\.02/.test(r)) return { kelompok: 'Peralatan & Mesin', jenis: 'barang', pajak_bawaan: 'PPN' }
  if (r.endsWith('.0024') || r.endsWith('.0025') || /kertas|map|spidol|pulpen|bolpoin|stapler|staples|lakban|binder|tinta|amplop|stempel|sticky|stabilo|penghapus/.test(n)) return { kelompok: 'ATK', jenis: 'barang', pajak_bawaan: 'PPN' }
  if (r.endsWith('.0001') || /semen|pasir|besi|baja|spandek|kanal|triplek|cat |gypsum|seng|baut|dinabol|keramik|tanah/.test(n)) return { kelompok: 'Bahan Bangunan', jenis: 'barang', pajak_bawaan: 'PPN' }
  if (r.endsWith('.0030') || /sapu|pel|sabun|pembersih|kemoceng|tissu|kamper|sikat|obat nyamuk|kantong sampah/.test(n)) return { kelompok: 'Kebersihan', jenis: 'barang', pajak_bawaan: 'PPN' }
  if (r.endsWith('.0031') || /lampu|kabel|baterai|stop kontak|steker|fitting/.test(n)) return { kelompok: 'Alat Listrik', jenis: 'barang', pajak_bawaan: 'PPN' }
  if (r.endsWith('.0029') || /mouse|keyboard|hardisk|ram|sparepart|printer/.test(n)) return { kelompok: 'Bahan Komputer', jenis: 'barang', pajak_bawaan: 'PPN' }
  return { kelompok: 'Barang Lainnya', jenis: 'barang', pajak_bawaan: 'PPN' }
}

/** Nama rekening belanja yang dipakai ARKAS (dapat dilengkapi/diubah di Referensi Juknis) */
export const NAMA_REKENING = {
  '5.1.02.01.01.0001': 'Belanja Bahan-Bahan Bangunan dan Konstruksi',
  '5.1.02.01.01.0012': 'Belanja Bahan-Bahan Lainnya',
  '5.1.02.01.01.0024': 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor',
  '5.1.02.01.01.0025': 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover',
  '5.1.02.01.01.0027': 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos',
  '5.1.02.01.01.0029': 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer',
  '5.1.02.01.01.0030': 'Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor',
  '5.1.02.01.01.0031': 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Listrik',
  '5.1.02.01.01.0052': 'Belanja Makanan dan Minuman Rapat',
  '5.1.02.02.01.0003': 'Honorarium Narasumber atau Pembahas, Moderator, Pembawa Acara, dan Panitia',
  '5.1.02.02.01.0013': 'Belanja Jasa Tenaga Administrasi',
  '5.1.02.02.01.0061': 'Belanja Tagihan Listrik',
  '5.1.02.02.01.0063': 'Belanja Kawat/Faksimili/Internet/TV Berlangganan',
  '5.1.02.04.01.0003': 'Belanja Perjalanan Dinas Dalam Kota',
}
