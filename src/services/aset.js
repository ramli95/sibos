// Barang & Aset (Fase 5).
//
// Susunan Firestore
//   aset/{id}            → satu baris inventaris (KIB atau ekstrakomptabel) — boleh berisi beberapa unit
//                          { tahun, jenis:'kib'|'ekstra', golongan, kode_barang, nama, merk, spesifikasi, bahan, ukuran,
//                            jumlah, satuan, harga_satuan, nilai, register_awal, register_akhir, tgl_perolehan,
//                            kode_rekening, kode_kegiatan, id_belanja, id_item, nama_pekerjaan, penyedia, asal,
//                            kondisi:'B'|'KB'|'RB', id_ruang, keterangan, id_bast, status:'aktif'|'dihapus' }
//   aset_ruang/{id}      → ruangan sekolah { kode, nama, jenis, penanggung_jawab, nip_penanggung_jawab }
//   bast_barang/{id}     → BAST Bendahara → Pengurus Barang { tahun, nomor, tanggal, id_aset[], butir[], catatan }
//   persediaan/{id}      → mutasi persediaan manual { tahun, jenis:'awal'|'keluar'|'opname', tanggal, butir[], penerima, keperluan }
//   barang_kelas/{tahun} → { peta: { 'idBelanja:idItem': 'kib'|'ekstra'|'persediaan'|'abaikan' } } — hanya pilihan yang diubah
// Bendahara & Pengurus Barang boleh menulis; BAST bernomor hanya Bendahara (memakai penghitung nomor surat).
import { collection, doc, getDoc, getDocs, query, where, writeBatch, runTransaction, serverTimestamp, setDoc, deleteField } from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { isiPola } from '@/utils/belanja'
import { muatPolaNomor } from './belanja'

const perangkat = () => navigator.userAgent.slice(0, 160)
const idAcak = () => Math.random().toString(36).slice(2, 11)
const bersih = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)))
const salin = (x) => JSON.parse(JSON.stringify(x))

function log(b, aksi, keterangan, koleksi, id, sebelum = null, sesudah = null) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi, id_dokumen: id, sebelum, sesudah, waktu: serverTimestamp(), perangkat: perangkat(),
  })
}

let contoh = null
let urutContoh = 40
const dataContoh = async () => (contoh ??= await import('./contohAset'))

/* ---------------- Referensi Barang Modal ARKAS (berkas statis, ±1.700 barang) ---------------- */
let refBarang = null
export async function muatRefBarangModal() {
  if (refBarang) return refBarang
  const r = await fetch(`${import.meta.env.BASE_URL}referensi/barang-modal-arkas-2025.json`)
  if (!r.ok) throw new Error('Referensi Barang Modal tidak dapat dimuat.')
  const j = await r.json()
  refBarang = j.butir.map(([kode_barang, nama, spesifikasi, satuan, harga, kode_rekening]) => ({ kode_barang, nama, spesifikasi, satuan, harga, kode_rekening }))
  return refBarang
}

/* ---------------- Aset / inventaris ---------------- */

export async function muatAset() {
  if (modePratinjau) return salin((await dataContoh()).aset)
  const s = await getDocs(collection(db, 'aset'))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

const rapikanAset = (a) => {
  const jumlah = Math.max(1, Math.round(Number(a.jumlah) || 1))
  const harga = Math.round(Number(a.harga_satuan) || 0)
  return bersih({
    ...a, jumlah, harga_satuan: harga, nilai: jumlah * harga,
    register_awal: Number(a.register_awal) || null, register_akhir: Number(a.register_akhir) || Number(a.register_awal) || null,
    tahun: Number(a.tahun) || Number(String(a.tgl_perolehan || '').slice(0, 4)) || new Date().getFullYear(),
    kondisi: a.kondisi || 'B', status: a.status || 'aktif', asal: a.asal || 'Dana BOSP',
  })
}

export async function simpanAset(id, data, keterangan) {
  const isi = rapikanAset(data)
  delete isi.id
  if (modePratinjau) {
    const c = await dataContoh()
    const baru = { ...isi, id: id || 'a' + idAcak() }
    const i = c.aset.findIndex((x) => x.id === id)
    if (i >= 0) c.aset[i] = baru; else c.aset.push(baru)
    return baru.id
  }
  const r = id ? doc(db, 'aset', id) : doc(collection(db, 'aset'))
  const b = writeBatch(db)
  b.set(r, { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, id ? 'ubah' : 'tambah', keterangan || `${id ? 'Mengubah' : 'Mencatat'} barang inventaris: ${isi.nama} (${isi.jumlah} ${isi.satuan || 'unit'})`, 'aset', r.id)
  await b.commit()
  return r.id
}

/** Catat banyak barang sekaligus (dari tab Barang dari Belanja) */
export async function simpanAsetMassal(daftar) {
  const isi = daftar.map(rapikanAset)
  if (modePratinjau) { const c = await dataContoh(); isi.forEach((a) => c.aset.push({ ...a, id: 'a' + idAcak() })); return }
  for (let i = 0; i < isi.length; i += 200) {
    const b = writeBatch(db)
    isi.slice(i, i + 200).forEach((a) => b.set(doc(collection(db, 'aset')), { ...a, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }))
    log(b, 'tambah', `Mencatat ${isi.slice(i, i + 200).length} barang ke inventaris dari belanja`, 'aset', null)
    await b.commit()
  }
}

export async function hapusAset(a) {
  if (modePratinjau) { const c = await dataContoh(); c.aset.splice(c.aset.findIndex((x) => x.id === a.id), 1); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'aset', a.id))
  log(b, 'hapus', `Menghapus catatan inventaris: ${a.nama} (${a.jumlah} ${a.satuan || 'unit'})`, 'aset', a.id, bersih(a))
  await b.commit()
}

/** Pindah ruang / ubah kondisi beberapa barang sekaligus */
export async function ubahAsetMassal(daftar, ubah, keterangan) {
  if (modePratinjau) { const c = await dataContoh(); daftar.forEach((a) => Object.assign(c.aset.find((x) => x.id === a.id) || {}, ubah)); return }
  const b = writeBatch(db)
  daftar.forEach((a) => b.update(doc(db, 'aset', a.id), { ...bersih(ubah), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }))
  log(b, 'ubah', `${keterangan} (${daftar.length} barang)`, 'aset', null)
  await b.commit()
}

/* ---------------- Ruangan ---------------- */

export async function muatRuang() {
  if (modePratinjau) return salin((await dataContoh()).ruang)
  const s = await getDocs(collection(db, 'aset_ruang'))
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }))
}

export async function simpanRuang(id, data) {
  const isi = bersih({ kode: data.kode || '', nama: data.nama || '', jenis: data.jenis || 'lainnya', penanggung_jawab: data.penanggung_jawab || '', nip_penanggung_jawab: data.nip_penanggung_jawab || '', keterangan: data.keterangan || '' })
  if (modePratinjau) {
    const c = await dataContoh()
    const baru = { ...isi, id: id || 'r' + idAcak() }
    const i = c.ruang.findIndex((x) => x.id === id)
    if (i >= 0) c.ruang[i] = baru; else c.ruang.push(baru)
    return baru.id
  }
  const r = id ? doc(db, 'aset_ruang', id) : doc(collection(db, 'aset_ruang'))
  const b = writeBatch(db)
  b.set(r, { ...isi, diperbarui: serverTimestamp() })
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Menambah'} ruangan ${isi.kode} ${isi.nama}`, 'aset_ruang', r.id)
  await b.commit()
  return r.id
}

export async function simpanRuangMassal(daftar) {
  if (modePratinjau) { const c = await dataContoh(); daftar.forEach((r) => c.ruang.push({ ...r, id: 'r' + idAcak() })); return }
  const b = writeBatch(db)
  daftar.forEach((r) => b.set(doc(collection(db, 'aset_ruang')), { ...bersih(r), diperbarui: serverTimestamp() }))
  log(b, 'tambah', `Menambah ${daftar.length} ruangan bawaan`, 'aset_ruang', null)
  await b.commit()
}

export async function hapusRuang(r) {
  if (modePratinjau) { const c = await dataContoh(); c.ruang.splice(c.ruang.findIndex((x) => x.id === r.id), 1); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'aset_ruang', r.id))
  log(b, 'hapus', `Menghapus ruangan ${r.kode} ${r.nama}`, 'aset_ruang', r.id, bersih(r))
  await b.commit()
}

/* ---------------- Kelas barang hasil belanja ---------------- */

export async function muatKelas(tahun) {
  if (modePratinjau) return { ...((await dataContoh()).kelas[tahun] || {}) }
  const s = await getDoc(doc(db, 'barang_kelas', String(tahun)))
  return s.exists() ? s.data().peta || {} : {}
}

/** ubah: { kunci: kelas | null } — null kembali ke kelas bawaan */
export async function simpanKelas(tahun, ubah) {
  if (modePratinjau) {
    const c = await dataContoh()
    const p = (c.kelas[tahun] ||= {})
    Object.entries(ubah).forEach(([k, v]) => { if (v) p[k] = v; else delete p[k] })
    return
  }
  const peta = Object.fromEntries(Object.entries(ubah).map(([k, v]) => [k, v || deleteField()]))
  await setDoc(doc(db, 'barang_kelas', String(tahun)), { tahun: Number(tahun), peta, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
}

/* ---------------- BAST Bendahara → Pengurus Barang ---------------- */

export async function muatBast(tahun) {
  if (modePratinjau) return salin((await dataContoh()).bast.filter((x) => x.tahun === Number(tahun)))
  const s = await getDocs(query(collection(db, 'bast_barang'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)))
}

/**
 * Simpan BAST. Nomor kosong diberi nomor surat otomatis (penghitung "surat" & Agenda Surat, satu transaksi).
 * id_bast dicatat pada setiap aset yang diserahkan.
 */
export async function simpanBast(id, data, sebelum = null) {
  const tahun = Number(String(data.tanggal).slice(0, 4))
  const isi = bersih({ ...data, tahun })
  const lepas = (sebelum?.id_aset || []).filter((x) => !isi.id_aset.includes(x))
  if (modePratinjau) {
    const c = await dataContoh()
    const idBaru = id || 'bb' + idAcak()
    if (!String(isi.nomor || '').trim()) { const pola = await muatPolaNomor(); urutContoh += 1; isi.nomor = isiPola(pola.surat, { urut: urutContoh, tanggal: isi.tanggal }) }
    const i = c.bast.findIndex((x) => x.id === idBaru)
    const baru = { ...isi, id: idBaru }
    if (i >= 0) c.bast[i] = baru; else c.bast.push(baru)
    c.aset.forEach((a) => { if (isi.id_aset.includes(a.id)) a.id_bast = idBaru; if (lepas.includes(a.id)) a.id_bast = null })
    return idBaru
  }
  const pola = await muatPolaNomor()
  const ref = id ? doc(db, 'bast_barang', id) : doc(collection(db, 'bast_barang'))
  await runTransaction(db, async (tx) => {
    const rh = doc(db, 'penomoran', `surat-${tahun}`)
    let urut = isi.nomor_urut || null
    if (!String(isi.nomor || '').trim()) {
      const s = await tx.get(rh)
      urut = (s.exists() ? s.data().terakhir || 0 : 0) + 1
      isi.nomor = isiPola(pola.surat, { urut, tanggal: isi.tanggal })
      isi.nomor_urut = urut
      tx.set(rh, { terakhir: urut, tahun, diperbarui: serverTimestamp() }, { merge: true })
    }
    tx.set(doc(db, 'agenda_surat', `${ref.id}_bast_barang`), {
      tahun, jenis: 'bast', nomor: isi.nomor, urut, tanggal: isi.tanggal, perihal: `BAST Barang kepada Pengurus Barang (${isi.id_aset.length} barang)`,
      tujuan: isi.pengurus?.nama || 'Pengurus Barang', id_belanja: null, sumber: 'otomatis', diperbarui: serverTimestamp(), uid: auth.currentUser.uid,
    })
    tx.set(ref, { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
    isi.id_aset.forEach((a) => tx.update(doc(db, 'aset', a), { id_bast: ref.id }))
    lepas.forEach((a) => tx.update(doc(db, 'aset', a), { id_bast: null }))
    tx.set(doc(collection(db, 'log_aktivitas')), {
      uid: auth.currentUser.uid, aksi: id ? 'ubah' : 'tambah', keterangan: `${id ? 'Mengubah' : 'Membuat'} BAST barang ${isi.nomor} kepada Pengurus Barang (${isi.id_aset.length} barang)`,
      koleksi: 'bast_barang', id_dokumen: ref.id, sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: perangkat(),
    })
  })
  return ref.id
}

export async function hapusBast(x) {
  if (modePratinjau) { const c = await dataContoh(); c.bast.splice(c.bast.findIndex((y) => y.id === x.id), 1); c.aset.forEach((a) => { if (a.id_bast === x.id) a.id_bast = null }); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'bast_barang', x.id))
  b.delete(doc(db, 'agenda_surat', `${x.id}_bast_barang`))
  ;(x.id_aset || []).forEach((a) => b.update(doc(db, 'aset', a), { id_bast: null }))
  log(b, 'hapus', `Menghapus BAST barang ${x.nomor} (nomor tidak dipakai ulang)`, 'bast_barang', x.id, { nomor: x.nomor, tanggal: x.tanggal })
  await b.commit()
}

/* ---------------- Persediaan ---------------- */

export async function muatPersediaan(tahun) {
  if (modePratinjau) return salin((await dataContoh()).persediaan.filter((x) => x.tahun === Number(tahun)))
  const s = await getDocs(query(collection(db, 'persediaan'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function simpanPersediaan(id, data) {
  const isi = bersih({ ...data, tahun: Number(String(data.tanggal).slice(0, 4)) })
  delete isi.id
  if (modePratinjau) {
    const c = await dataContoh()
    const baru = { ...isi, id: id || 'p' + idAcak() }
    const i = c.persediaan.findIndex((x) => x.id === id)
    if (i >= 0) c.persediaan[i] = baru; else c.persediaan.push(baru)
    return baru.id
  }
  const r = id ? doc(db, 'persediaan', id) : doc(collection(db, 'persediaan'))
  const b = writeBatch(db)
  b.set(r, { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  const label = { awal: 'saldo awal persediaan', keluar: 'pengeluaran barang', opname: 'stok opname' }[isi.jenis] || 'persediaan'
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Mencatat'} ${label} ${isi.tanggal} (${(isi.butir || []).length} barang)`, 'persediaan', r.id)
  await b.commit()
  return r.id
}

export async function hapusPersediaan(x) {
  if (modePratinjau) { const c = await dataContoh(); c.persediaan.splice(c.persediaan.findIndex((y) => y.id === x.id), 1); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'persediaan', x.id))
  log(b, 'hapus', `Menghapus catatan persediaan ${x.jenis} ${x.tanggal}`, 'persediaan', x.id, bersih(x))
  await b.commit()
}
