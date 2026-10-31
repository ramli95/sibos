// Master data: Pegawai & Rekanan.
// Data sensitif pegawai (NIK, NPWP pribadi, status keluarga, alamat, rekening) disimpan terpisah di
// pegawai/{id}/rahasia/data, yang hanya bisa dibaca Bendahara (lihat firestore.rules).
import {
  collection, doc, getDocs, getDoc, writeBatch, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db, auth } from './firebase'

export const KOLOM_PEGAWAI_UMUM = [
  'nip', 'nuptk', 'nama', 'gelar_depan', 'gelar', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
  'golongan', 'pangkat', 'jabatan', 'status_kepegawaian', 'status_dapodik', 'sk_penugasan',
  'tmt_kgb_terakhir', 'terima_tpg', 'no_wa', 'email', 'aktif',
]
export const KOLOM_PEGAWAI_RAHASIA = [
  'nik', 'npwp', 'status_kawin', 'anak', 'jiwa', 'alamat', 'bank', 'no_rekening', 'atas_nama_rekening',
]
export const KOLOM_REKANAN = [
  'nama_usaha', 'pemilik', 'jabatan_pemilik', 'alamat', 'telepon', 'no_wa', 'npwp', 'status_pkp',
  'bentuk_usaha', 'bank', 'no_rekening', 'atas_nama_rekening', 'aktif', 'suket_umkm', 'jenis_usaha',
]

const ambil = (obj, kolom) => Object.fromEntries(kolom.map((k) => [k, obj[k] ?? (k === 'aktif' ? true : k === 'terima_tpg' || k === 'status_pkp' || k === 'suket_umkm' ? false : '')]))
const beda = (a = {}, b = {}, kolom) => kolom.filter((k) => JSON.stringify(a[k] ?? '') !== JSON.stringify(b[k] ?? ''))
const perangkat = () => navigator.userAgent.slice(0, 160)

function log(b, aksi, keterangan, koleksi, id, sebelum = null, sesudah = null) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi, id_dokumen: id, sebelum, sesudah, waktu: serverTimestamp(), perangkat: perangkat(),
  })
}

/* ---------------- Pegawai ---------------- */

export async function muatPegawai({ denganRahasia }) {
  const s = await getDocs(query(collection(db, 'pegawai'), orderBy('nama')))
  const daftar = s.docs.map((d) => ({ id: d.id, ...d.data() }))
  daftar.forEach((p) => { if (p.status_kepegawaian === 'PTT') p.status_kepegawaian = 'Honorer' })
  if (denganRahasia) {
    await Promise.all(daftar.map(async (p) => {
      const r = await getDoc(doc(db, 'pegawai', p.id, 'rahasia', 'data'))
      if (r.exists()) Object.assign(p, ambil(r.data(), KOLOM_PEGAWAI_RAHASIA))
    }))
  }
  return daftar
}

function tulisPegawai(b, id, data, denganRahasia) {
  const ref = id ? doc(db, 'pegawai', id) : doc(collection(db, 'pegawai'))
  b.set(ref, { ...ambil(data, KOLOM_PEGAWAI_UMUM), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
  if (denganRahasia) b.set(doc(db, 'pegawai', ref.id, 'rahasia', 'data'), { ...ambil(data, KOLOM_PEGAWAI_RAHASIA), diperbarui: serverTimestamp() }, { merge: true })
  return ref.id
}

export async function simpanPegawai(id, data, sebelum) {
  const b = writeBatch(db)
  const idBaru = tulisPegawai(b, id, data, true)
  const ubahUmum = beda(sebelum, data, KOLOM_PEGAWAI_UMUM)
  const ubahRahasia = beda(sebelum, data, KOLOM_PEGAWAI_RAHASIA)
  // Nilai data rahasia tidak ditulis ke log (log bisa dibaca Kepala Sekolah) — hanya nama kolomnya
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Menambah'} pegawai ${data.nama}${id && (ubahUmum.length || ubahRahasia.length) ? ': ' + [...ubahUmum, ...ubahRahasia].join(', ') : ''}`,
    'pegawai', idBaru,
    id ? Object.fromEntries(ubahUmum.map((k) => [k, sebelum?.[k] ?? null])) : null,
    { ...Object.fromEntries(ubahUmum.map((k) => [k, data[k] ?? null])), ...(ubahRahasia.length ? { data_rahasia_diubah: ubahRahasia } : {}) })
  await b.commit()
  return idBaru
}

export async function hapusPegawai(p) {
  const b = writeBatch(db)
  b.delete(doc(db, 'pegawai', p.id, 'rahasia', 'data'))
  b.delete(doc(db, 'pegawai', p.id))
  log(b, 'hapus', `Menghapus pegawai ${p.nama}${p.nip ? ' (NIP ' + p.nip + ')' : ''}`, 'pegawai', p.id, ambil(p, ['nama', 'nip', 'status_kepegawaian', 'jabatan']))
  await b.commit()
}

/* ---------------- Rekanan ---------------- */

export async function muatRekanan() {
  const s = await getDocs(query(collection(db, 'rekanan'), orderBy('nama_usaha')))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

function tulisRekanan(b, id, data) {
  const ref = id ? doc(db, 'rekanan', id) : doc(collection(db, 'rekanan'))
  b.set(ref, { ...ambil(data, KOLOM_REKANAN), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
  return ref.id
}

export async function simpanRekanan(id, data, sebelum) {
  const b = writeBatch(db)
  const idBaru = tulisRekanan(b, id, data)
  const ubah = beda(sebelum, data, KOLOM_REKANAN)
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Menambah'} rekanan ${data.nama_usaha}${id && ubah.length ? ': ' + ubah.join(', ') : ''}`, 'rekanan', idBaru,
    id ? Object.fromEntries(ubah.map((k) => [k, sebelum?.[k] ?? null])) : null, Object.fromEntries(ubah.map((k) => [k, data[k] ?? null])))
  await b.commit()
  return idBaru
}

export async function hapusRekanan(r) {
  const b = writeBatch(db)
  b.delete(doc(db, 'rekanan', r.id))
  log(b, 'hapus', `Menghapus rekanan ${r.nama_usaha}`, 'rekanan', r.id, ambil(r, ['nama_usaha', 'pemilik', 'npwp']))
  await b.commit()
}

/* ---------------- Impor massal ---------------- */

/** daftar: [{ id (null = baru), data }]. Ditulis per 200 baris (pegawai = 2 dokumen per baris). */
export async function simpanMassal(jenis, daftar, namaBerkas) {
  const PER = 200
  let tambah = 0, ubah = 0
  for (let i = 0; i < daftar.length; i += PER) {
    const b = writeBatch(db)
    daftar.slice(i, i + PER).forEach(({ id, data }) => {
      if (jenis === 'pegawai') tulisPegawai(b, id, data, true)
      else tulisRekanan(b, id, data)
      id ? ubah++ : tambah++
    })
    await b.commit()
  }
  const b = writeBatch(db)
  log(b, 'impor', `Impor ${jenis} dari "${namaBerkas}": ${tambah} baru, ${ubah} diperbarui`, jenis, null, null, { tambah, ubah })
  await b.commit()
  return { tambah, ubah }
}
