// Pejabat penanda tangan per periode. Dokumen memakai pejabat yang menjabat pada tanggal dokumen.
import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db, auth } from './firebase'

export const KOLOM_PEJABAT = ['jabatan', 'id_pegawai', 'nama', 'gelar', 'pangkat', 'nip', 'alamat', 'telepon', 'mulai', 'sampai', 'tanda_tangan']

export async function muatPejabat() {
  const s = await getDocs(collection(db, 'pejabat'))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Pejabat yang menjabat pada tanggal 'yyyy-mm-dd' (mulai/sampai kosong = tanpa batas) */
export function pejabatPada(daftar, jabatan, tanggal) {
  return daftar
    .filter((p) => p.jabatan === jabatan && (!p.mulai || p.mulai <= tanggal) && (!p.sampai || p.sampai >= tanggal))
    .sort((a, b) => String(b.mulai || '').localeCompare(String(a.mulai || '')))[0] || null
}

/** Periode yang tumpang tindih dengan data p pada jabatan yang sama */
export function tumpangTindih(daftar, p) {
  const awal = p.mulai || '0000-00-00', akhir = p.sampai || '9999-12-31'
  return daftar.filter((x) => x.id !== p.id && x.jabatan === p.jabatan && (x.mulai || '0000-00-00') <= akhir && (x.sampai || '9999-12-31') >= awal)
}

export const namaPejabat = (p) => (p ? `${p.nama}${p.gelar ? ', ' + p.gelar : ''}` : '')

function log(b, aksi, keterangan, id, sesudah = null) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi: 'pejabat', id_dokumen: id, sebelum: null, sesudah, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
}

export async function simpanPejabat(id, data, labelJabatan) {
  const b = writeBatch(db)
  const ref = id ? doc(db, 'pejabat', id) : doc(collection(db, 'pejabat'))
  const isi = Object.fromEntries(KOLOM_PEJABAT.map((k) => [k, data[k] === '' || data[k] === undefined ? null : data[k]]))
  b.set(ref, { ...isi, diperbarui: serverTimestamp() }, { merge: true })
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Menambah'} pejabat ${labelJabatan}: ${namaPejabat(data)} (${data.mulai || 'awal'} s.d. ${data.sampai || 'sekarang'})`, ref.id,
    { jabatan: data.jabatan, nama: data.nama, mulai: data.mulai || null, sampai: data.sampai || null })
  await b.commit()
}

export async function hapusPejabat(p, labelJabatan) {
  const b = writeBatch(db)
  b.delete(doc(db, 'pejabat', p.id))
  log(b, 'hapus', `Menghapus periode pejabat ${labelJabatan}: ${namaPejabat(p)}`, p.id)
  await b.commit()
}
