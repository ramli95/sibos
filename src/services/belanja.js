// Belanja & Dokumen SPJ (Fase 3).
//
// Susunan Firestore
//   belanja/{id}                    → satu transaksi (pengadaan Non-SIPLah/SIPLah atau honor/transpor)
//   belanja/{id}/foto/{idFoto}      → foto dokumentasi versi cetak (data URL ±150 KB); aslinya diarsipkan di Drive
//   penomoran/{hitung}-{tahun}      → penghitung nomor (surat, kwitansi, invoice) — ditambah lewat transaksi
//   agenda_surat/{id}               → buku agenda: setiap nomor yang terpakai (otomatis dari belanja atau manual)
//   orang_luar/{id}                 → penerima honor/transpor dari luar sekolah (narasumber, pengawas, juri)
//   sekolah/penomoran               → pola nomor (bisa diubah Bendahara)
// Uang selalu bilangan bulat rupiah; tanggal disimpan 'yyyy-mm-dd'.
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch, runTransaction, serverTimestamp, setDoc, increment, orderBy,
} from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { unggahBerkas } from './penghubung'
import { POLA_NOMOR_AWAL, JENIS_NOMOR } from '@/config/belanja'
import { salin, rapikanItem, totalItem, kategoriBelanja, statusBelanja, kelengkapan, persenLengkap, dokumenTransaksi, isiPola, perkiraanPajak, rapikanPenerima } from '@/utils/belanja'
import { kecilkanGambar, dataUrlKeBerkas } from '@/utils/gambar'
import { NAMA_BULAN, dariIso } from '@/utils/format'

const perangkat = () => navigator.userAgent.slice(0, 160)
const idAcak = () => Math.random().toString(36).slice(2, 11)

function log(b, aksi, keterangan, koleksi, id, sebelum = null, sesudah = null) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi, id_dokumen: id, sebelum, sesudah, waktu: serverTimestamp(), perangkat: perangkat(),
  })
}

/* ---------------- Mode Pratinjau (data contoh di memori) ---------------- */
let contoh = null
async function dataContoh() {
  if (!contoh) { contoh = await import('./contohBelanja'); contoh.siapkanFotoContoh() }
  return contoh
}

/* ---------------- Pola nomor ---------------- */

export async function muatPolaNomor() {
  if (modePratinjau) return { ...POLA_NOMOR_AWAL, ...((await dataContoh()).pola) }
  const s = await getDoc(doc(db, 'sekolah', 'penomoran'))
  return { ...POLA_NOMOR_AWAL, ...(s.exists() ? s.data().pola : {}) }
}

export async function simpanPolaNomor(pola) {
  if (modePratinjau) { Object.assign((await dataContoh()).pola, pola); return }
  const b = writeBatch(db)
  b.set(doc(db, 'sekolah', 'penomoran'), { pola, diperbarui: serverTimestamp() }, { merge: true })
  log(b, 'ubah', 'Mengubah pola penomoran surat/kwitansi/invoice', 'sekolah', 'penomoran', null, pola)
  await b.commit()
}

/** Penghitung terakhir per jenis (untuk Agenda Surat) */
export async function muatPenghitung(tahun) {
  if (modePratinjau) return { ...(await dataContoh()).penghitung }
  const hasil = {}
  await Promise.all(['surat', 'kwitansi', 'invoice'].map(async (h) => {
    const s = await getDoc(doc(db, 'penomoran', `${h}-${tahun}`))
    hasil[h] = s.exists() ? s.data().terakhir || 0 : 0
  }))
  return hasil
}

/* ---------------- Baca ---------------- */

export async function muatDaftarBelanja(tahun) {
  if (modePratinjau) return (await dataContoh()).daftar.filter((b) => b.tahun === Number(tahun)).map((b) => salin(b))
  const s = await getDocs(query(collection(db, 'belanja'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function muatBelanja(id) {
  if (modePratinjau) { const b = (await dataContoh()).daftar.find((x) => x.id === id); return b ? salin(b) : null }
  const s = await getDoc(doc(db, 'belanja', id))
  return s.exists() ? { id: s.id, ...s.data() } : null
}

/* ---------------- Simpan (dengan penomoran otomatis) ---------------- */

// Tanggal yang menentukan bulan pada nomor tiap dokumen
const TANGGAL_NOMOR = {
  surat_pesanan: 'tgl_pesanan', negosiasi: 'tgl_pesanan', shp: 'tgl_terima', bast: 'tgl_terima',
  kwitansi_kecil: (b) => b.tgl_kwitansi || b.tgl_lunas, invoice: 'tgl_invoice', proforma: 'tgl_proforma',
}
const tglNomor = (b, jenis) => (typeof TANGGAL_NOMOR[jenis] === 'function' ? TANGGAL_NOMOR[jenis](b) : b[TANGGAL_NOMOR[jenis]])
const URUT_JENIS = ['negosiasi', 'surat_pesanan', 'shp', 'bast', 'proforma', 'invoice', 'kwitansi_kecil']

/** Rapikan data formulir menjadi dokumen belanja */
export function rapikanBelanja(f) {
  const honor = f.jenis === 'honor'
  const penerima = honor ? (f.penerima || []).map((p) => rapikanPenerima(p, f.jenis_honor)).filter((p) => p.nama) : []
  let item = (f.item || []).map(rapikanItem).filter((i) => i.nama)
  if (honor && f.uraian_honor) {
    // Item honor = satu baris per uraian RKAS: volume total × besaran (dipakai realisasi & kwitansi besar)
    const u = f.uraian_honor
    const bruto = penerima.reduce((s, p) => s + p.bruto, 0)
    const vol = penerima.reduce((s, p) => s + p.volume, 0)
    item = [rapikanItem({ ...u, id: 'honor', nama: f.nama_pekerjaan || u.uraian_rkas, volume: 1, harga: bruto, jenis: 'honor', volume_asli: vol })]
  }
  const b = {
    ...f,
    tahun: Number(f.tahun) || dariIso(f.tgl_pesanan || f.tgl_kegiatan || f.tgl_lunas)?.getFullYear() || new Date().getFullYear(),
    nama_pekerjaan: String(f.nama_pekerjaan || '').trim(),
    item, penerima,
  }
  b.total = totalItem(item)
  b.kategori = kategoriBelanja(item)
  b.status = statusBelanja(b)
  b.pajak = b.pajak_manual ? (b.pajak || []) : honor ? [{ jenis: 'PPh 21', dasar: b.total, tarif: null, nilai: penerima.reduce((s, p) => s + p.pph21, 0), ket: 'Dipotong dari penerima' }].filter((x) => x.nilai) : perkiraanPajak(b)
  b.persen_lengkap = persenLengkap(kelengkapan(b))
  return b
}

/**
 * Menyimpan belanja. Nomor dokumen yang masih kosong (dan tanggalnya sudah ada) diberi nomor otomatis
 * di dalam satu transaksi Firestore bersama penghitung & Agenda Surat, sehingga nomor tidak pernah ganda.
 */
export async function simpanBelanja(id, data, sebelum, pola) {
  const b = rapikanBelanja(data)
  b.nomor = { ...(b.nomor || {}) }
  b.nomor_manual = { ...(b.nomor_manual || {}) }
  const perlu = URUT_JENIS.filter((j) => dokumenTransaksi(b).includes(j) && !String(b.nomor[j] || '').trim() && tglNomor(b, j))
  if (b.cara === 'siplah' || b.jenis === 'honor') perlu.length = 0

  if (modePratinjau) {
    const c = await dataContoh()
    const idBaru = id || 'b' + idAcak()
    const pakai = (hitung) => (c.penghitung[hitung] = (c.penghitung[hitung] || 0) + 1)
    let urutInv = null
    perlu.forEach((j) => {
      const info = JENIS_NOMOR[j]
      const urut = info.hitung === 'invoice' ? (urutInv ??= pakai('invoice')) : pakai(info.hitung)
      b.nomor[j] = isiPola(pola[info.pola], { urut, tanggal: tglNomor(b, j), rekanan: b.rekanan?.nama_usaha })
      b.nomor_manual[j] = false
    })
    const simpan = { ...b, id: idBaru, diperbarui: new Date() }
    const i = c.daftar.findIndex((x) => x.id === idBaru)
    if (i >= 0) c.daftar[i] = simpan; else c.daftar.unshift(simpan)
    c.agendaDariBelanja(simpan)
    return idBaru
  }

  const ref = id ? doc(db, 'belanja', id) : doc(collection(db, 'belanja'))
  await runTransaction(db, async (tx) => {
    // 1. Baca penghitung yang diperlukan (semua baca sebelum tulis)
    const hitungPerlu = [...new Set(perlu.map((j) => JENIS_NOMOR[j].hitung))]
    const refHitung = Object.fromEntries(hitungPerlu.map((h) => [h, doc(db, 'penomoran', `${h}-${b.tahun}`)]))
    const nilai = {}
    for (const h of hitungPerlu) { const s = await tx.get(refHitung[h]); nilai[h] = s.exists() ? s.data().terakhir || 0 : 0 }
    // Nomor invoice ganda ditolak (nomor dari penyedia)
    // 2. Beri nomor
    let urutInv = null
    perlu.forEach((j) => {
      const info = JENIS_NOMOR[j]
      const urut = info.hitung === 'invoice' ? (urutInv ??= ++nilai.invoice) : ++nilai[info.hitung]
      b.nomor[j] = isiPola(pola[info.pola], { urut, tanggal: tglNomor(b, j), rekanan: b.rekanan?.nama_usaha })
      b.nomor_manual[j] = false
      b.nomor_urut = { ...(b.nomor_urut || {}), [j]: urut }
    })
    hitungPerlu.forEach((h) => tx.set(refHitung[h], { terakhir: nilai[h], tahun: b.tahun, diperbarui: serverTimestamp() }, { merge: true }))
    // 3. Agenda surat: satu entri per nomor (id tetap → diperbarui bila transaksi diubah)
    Object.keys(JENIS_NOMOR).forEach((j) => {
      const r = doc(db, 'agenda_surat', `${ref.id}_${j}`)
      if (b.nomor[j] && dokumenTransaksi(b).includes(j)) {
        tx.set(r, {
          tahun: b.tahun, jenis: j, nomor: b.nomor[j], urut: b.nomor_urut?.[j] || null, tanggal: tglNomor(b, j) || '',
          perihal: `${JENIS_NOMOR[j].judul} — ${b.nama_pekerjaan}`, tujuan: b.rekanan?.nama_usaha || '', id_belanja: ref.id,
          sumber: b.nomor_manual[j] ? 'manual' : 'otomatis', diperbarui: serverTimestamp(), uid: auth.currentUser.uid,
        })
      } else if (sebelum?.nomor?.[j]) tx.delete(r)
    })
    // 4. Transaksi
    const { id: _a, dibuat: _b, dibuat_oleh: _c, diperbarui: _d, diperbarui_oleh: _e, ...isi } = b
    tx.set(ref, {
      ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid,
      ...(id && sebelum?.dibuat ? { dibuat: sebelum.dibuat, dibuat_oleh: sebelum.dibuat_oleh || null } : { dibuat: serverTimestamp(), dibuat_oleh: auth.currentUser.uid }),
    })
    // 5. Log
    tx.set(doc(collection(db, 'log_aktivitas')), {
      uid: auth.currentUser.uid, aksi: id ? 'ubah' : 'tambah',
      keterangan: `${id ? 'Mengubah' : 'Menambah'} belanja "${b.nama_pekerjaan}" Rp ${b.total.toLocaleString('id-ID')}${perlu.length ? ` · nomor baru: ${perlu.map((j) => JENIS_NOMOR[j].singkat).join(', ')}` : ''}`,
      koleksi: 'belanja', id_dokumen: ref.id,
      sebelum: sebelum ? { total: sebelum.total, status: sebelum.status } : null, sesudah: { total: b.total, status: b.status },
      waktu: serverTimestamp(), perangkat: perangkat(),
    })
  })
  return ref.id
}

/** Nomor invoice/nomor penyedia yang sama sudah dipakai transaksi lain? */
export function nomorGanda(daftar, b) {
  const n = String(b.nomor?.invoice || '').trim().toLowerCase()
  if (!n) return null
  return daftar.find((x) => x.id !== b.id && String(x.nomor?.invoice || '').trim().toLowerCase() === n && (x.id_rekanan || '') === (b.id_rekanan || '')) || null
}

export async function hapusBelanja(b) {
  if (modePratinjau) { const c = await dataContoh(); c.daftar.splice(c.daftar.findIndex((x) => x.id === b.id), 1); c.agenda.splice(0, c.agenda.length, ...c.agenda.filter((a) => a.id_belanja !== b.id)); return }
  const foto = await getDocs(collection(db, 'belanja', b.id, 'foto'))
  const bt = writeBatch(db)
  foto.docs.forEach((f) => bt.delete(f.ref))
  Object.keys(JENIS_NOMOR).forEach((j) => { if (b.nomor?.[j]) bt.delete(doc(db, 'agenda_surat', `${b.id}_${j}`)) })
  bt.delete(doc(db, 'belanja', b.id))
  log(bt, 'hapus', `Menghapus belanja "${b.nama_pekerjaan}" Rp ${Number(b.total).toLocaleString('id-ID')} (nomor di Agenda Surat ikut dihapus; penghitung tidak mundur)`, 'belanja', b.id,
    { nama_pekerjaan: b.nama_pekerjaan, total: b.total, nomor: salin(b.nomor) || null })
  await bt.commit()
}

/* ---------------- Foto dokumentasi ---------------- */

const namaFolder = (b) => {
  const d = dariIso(b.tgl_terima || b.tgl_kegiatan || b.tgl_pesanan || b.tgl_lunas) || new Date()
  return [String(d.getFullYear()), `${String(d.getMonth() + 1).padStart(2, '0')} ${NAMA_BULAN[d.getMonth()]}`, 'SPJ',
    `${String(d.getDate()).padStart(2, '0')} ${b.nama_pekerjaan || 'Belanja'}`.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)]
}

export async function muatFoto(idBelanja) {
  if (modePratinjau) return ((await dataContoh()).foto[idBelanja] || []).map((f) => ({ ...f }))
  const s = await getDocs(query(collection(db, 'belanja', idBelanja, 'foto'), orderBy('urutan')))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Tambah foto: versi cetak (maks. 1000 px) disimpan di Firestore agar selalu bisa dicetak,
 * versi arsip (maks. 1600 px) diunggah ke Drive: SIBOS/2026/10 Oktober/SPJ/<transaksi>.
 */
export async function tambahFoto(b, file, { keterangan = '', urutan = 0, kelompok = 'bast' } = {}) {
  const cetak = await kecilkanGambar(file, { maks: 1000, format: 'image/jpeg', kualitas: 0.72, batasKb: 400 })
  if (modePratinjau) {
    const c = await dataContoh()
    ;(c.foto[b.id] ||= []).push({ id: 'f' + idAcak(), data: cetak, keterangan, urutan, kelompok })
    const x = c.daftar.find((y) => y.id === b.id); if (x) x.jumlah_foto = c.foto[b.id].length
    return { drive: false }
  }
  let drive = null
  try {
    const arsip = await kecilkanGambar(file, { maks: 1600, format: 'image/jpeg', kualitas: 0.85, batasKb: 2500 })
    drive = await unggahBerkas(dataUrlKeBerkas(arsip, `Foto ${urutan + 1} - ${keterangan || b.nama_pekerjaan}.jpg`), namaFolder(b))
  } catch (e) { drive = { galat: e.message } }
  const bt = writeBatch(db)
  const r = doc(collection(db, 'belanja', b.id, 'foto'))
  bt.set(r, { data: cetak, keterangan, urutan, kelompok, id_drive: drive?.id_berkas_drive || null, tautan: drive?.tautan || null, waktu: serverTimestamp(), uid: auth.currentUser.uid })
  bt.update(doc(db, 'belanja', b.id), { jumlah_foto: increment(1), diperbarui: serverTimestamp() })
  log(bt, 'unggah', `Menambah foto dokumentasi "${b.nama_pekerjaan}"${drive?.id_berkas_drive ? ' (arsip Drive)' : ''}`, 'belanja', b.id)
  await bt.commit()
  return { drive: !!drive?.id_berkas_drive, galatDrive: drive?.galat || '' }
}

export async function ubahFoto(b, foto, data) {
  if (modePratinjau) { const f = (await dataContoh()).foto[b.id]?.find((x) => x.id === foto.id); if (f) Object.assign(f, data); return }
  await setDoc(doc(db, 'belanja', b.id, 'foto', foto.id), data, { merge: true })
}

export async function hapusFoto(b, foto) {
  if (modePratinjau) { const c = await dataContoh(); c.foto[b.id] = (c.foto[b.id] || []).filter((x) => x.id !== foto.id); const x = c.daftar.find((y) => y.id === b.id); if (x) x.jumlah_foto = c.foto[b.id].length; return }
  const bt = writeBatch(db)
  bt.delete(doc(db, 'belanja', b.id, 'foto', foto.id))
  bt.update(doc(db, 'belanja', b.id), { jumlah_foto: increment(-1), diperbarui: serverTimestamp() })
  log(bt, 'hapus', `Menghapus foto dokumentasi "${b.nama_pekerjaan}" (arsip Drive tetap ada)`, 'belanja', b.id)
  await bt.commit()
}

/* ---------------- Arsip unggah (dokumen bertanda tangan, nota asli, PDF SIPLah) ---------------- */

/** kelompok: 'arsip' (kunci ARSIP) atau 'siplah' (kunci DOKUMEN_SIPLAH) */
export async function unggahArsip(b, kelompok, kunci, file) {
  if (modePratinjau) {
    const x = (await dataContoh()).daftar.find((y) => y.id === b.id)
    const entri = { nama: file.name, tautan: '#', id: 'contoh', waktu: new Date().toISOString() }
    if (kelompok === 'siplah') { x.siplah = x.siplah || {}; x.siplah.berkas = { ...(x.siplah.berkas || {}), [kunci]: entri } }
    else { x.arsip = x.arsip || {}; x.arsip[kunci] = [...(x.arsip[kunci] || []), entri] }
    x.persen_lengkap = persenLengkap(kelengkapan(x))
    return entri
  }
  const jalur = [...namaFolder(b), ...(kelompok === 'siplah' ? ['SIPLah'] : [])]
  const h = await unggahBerkas(file, jalur)
  const entri = { nama: h.nama, tautan: h.tautan, id: h.id_berkas_drive, waktu: new Date().toISOString() }
  const baru = salin(b)
  if (kelompok === 'siplah') { baru.siplah = baru.siplah || {}; baru.siplah.berkas = { ...(baru.siplah.berkas || {}), [kunci]: entri } }
  else { baru.arsip = baru.arsip || {}; baru.arsip[kunci] = [...(baru.arsip[kunci] || []), entri] }
  const bt = writeBatch(db)
  bt.update(doc(db, 'belanja', b.id), {
    ...(kelompok === 'siplah' ? { siplah: baru.siplah } : { arsip: baru.arsip }),
    persen_lengkap: persenLengkap(kelengkapan(baru)), diperbarui: serverTimestamp(),
  })
  log(bt, 'unggah', `Mengarsipkan "${h.nama}" untuk belanja "${b.nama_pekerjaan}" ke Drive`, 'belanja', b.id)
  await bt.commit()
  return entri
}

export async function hapusArsip(b, kelompok, kunci, entri) {
  const baru = salin(b)
  if (kelompok === 'siplah') delete baru.siplah.berkas[kunci]
  else baru.arsip[kunci] = (baru.arsip[kunci] || []).filter((x) => x.id !== entri.id || x.waktu !== entri.waktu)
  if (modePratinjau) { const x = (await dataContoh()).daftar.find((y) => y.id === b.id); Object.assign(x, { siplah: baru.siplah, arsip: baru.arsip }); x.persen_lengkap = persenLengkap(kelengkapan(x)); return }
  const bt = writeBatch(db)
  bt.update(doc(db, 'belanja', b.id), { ...(kelompok === 'siplah' ? { siplah: baru.siplah } : { arsip: baru.arsip }), persen_lengkap: persenLengkap(kelengkapan(baru)), diperbarui: serverTimestamp() })
  log(bt, 'hapus', `Melepas arsip "${entri.nama}" dari belanja "${b.nama_pekerjaan}" (berkas di Drive tidak dihapus)`, 'belanja', b.id)
  await bt.commit()
}

/* ---------------- Agenda Surat ---------------- */

export async function muatAgenda(tahun) {
  if (modePratinjau) return (await dataContoh()).agenda.filter((a) => a.tahun === Number(tahun)).map((a) => ({ ...a }))
  const s = await getDocs(query(collection(db, 'agenda_surat'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Surat manual (surat tugas, undangan, dll.) memakai penghitung surat yang sama */
export async function tambahSuratManual(data, pola) {
  const tahun = Number(String(data.tanggal).slice(0, 4))
  if (modePratinjau) {
    const c = await dataContoh()
    const urut = (c.penghitung.surat = (c.penghitung.surat || 0) + 1)
    const nomor = data.nomor?.trim() || isiPola(pola.surat, { urut, tanggal: data.tanggal })
    c.agenda.push({ id: 'a' + idAcak(), ...data, tahun, urut, nomor, sumber: 'manual' })
    return nomor
  }
  const ref = doc(collection(db, 'agenda_surat'))
  const refHitung = doc(db, 'penomoran', `surat-${tahun}`)
  let nomor = ''
  await runTransaction(db, async (tx) => {
    let urut = null
    if (!data.nomor?.trim()) {
      const s = await tx.get(refHitung)
      urut = (s.exists() ? s.data().terakhir || 0 : 0) + 1
      tx.set(refHitung, { terakhir: urut, tahun, diperbarui: serverTimestamp() }, { merge: true })
    }
    nomor = data.nomor?.trim() || isiPola(pola.surat, { urut, tanggal: data.tanggal })
    tx.set(ref, { tahun, jenis: data.jenis, nomor, urut, tanggal: data.tanggal, perihal: data.perihal, tujuan: data.tujuan || '', id_belanja: null, sumber: 'manual', diperbarui: serverTimestamp(), uid: auth.currentUser.uid })
    tx.set(doc(collection(db, 'log_aktivitas')), { uid: auth.currentUser.uid, aksi: 'tambah', keterangan: `Mengambil nomor surat ${nomor} — ${data.perihal}`, koleksi: 'agenda_surat', id_dokumen: ref.id, sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: perangkat() })
  })
  return nomor
}

export async function ubahAgendaManual(a, data) {
  if (modePratinjau) { Object.assign((await dataContoh()).agenda.find((x) => x.id === a.id), data); return }
  const bt = writeBatch(db)
  bt.set(doc(db, 'agenda_surat', a.id), { ...data, diperbarui: serverTimestamp() }, { merge: true })
  log(bt, 'ubah', `Mengubah agenda surat ${a.nomor}`, 'agenda_surat', a.id)
  await bt.commit()
}

export async function hapusAgendaManual(a) {
  if (modePratinjau) { const c = await dataContoh(); c.agenda.splice(c.agenda.findIndex((x) => x.id === a.id), 1); return }
  const bt = writeBatch(db)
  bt.delete(doc(db, 'agenda_surat', a.id))
  log(bt, 'hapus', `Menghapus agenda surat ${a.nomor} — ${a.perihal} (nomor tidak dipakai ulang)`, 'agenda_surat', a.id)
  await bt.commit()
}

/* ---------------- Orang luar (penerima honor/transpor) ---------------- */

export const KOLOM_ORANG_LUAR = ['nama', 'nip', 'golongan', 'jabatan', 'instansi', 'status_kepegawaian', 'npwp', 'no_wa']

export async function muatOrangLuar() {
  if (modePratinjau) return (await dataContoh()).orangLuar.map((o) => ({ ...o }))
  const s = await getDocs(query(collection(db, 'orang_luar'), orderBy('nama')))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Simpan otomatis penerima luar yang baru/berubah. Hasil: penerima dengan id terisi */
export async function simpanOrangLuar(daftarPenerima, semua) {
  const luar = daftarPenerima.filter((p) => p.sumber === 'luar' && p.nama?.trim())
  if (!luar.length) return daftarPenerima
  const isi = (p) => Object.fromEntries(KOLOM_ORANG_LUAR.map((k) => [k, String(p[k] ?? '').trim()]))
  if (modePratinjau) {
    const c = await dataContoh()
    luar.forEach((p) => { if (!p.id) { p.id = 'o' + idAcak(); c.orangLuar.push({ id: p.id, ...isi(p) }) } })
    return daftarPenerima
  }
  const bt = writeBatch(db)
  let n = 0
  luar.forEach((p) => {
    const lama = semua.find((o) => o.id === p.id) || semua.find((o) => o.nama.toLowerCase() === p.nama.trim().toLowerCase() && (o.instansi || '') === (p.instansi || ''))
    const data = isi(p)
    if (lama && JSON.stringify(isi(lama)) === JSON.stringify(data)) { p.id = lama.id; return }
    const r = lama ? doc(db, 'orang_luar', lama.id) : doc(collection(db, 'orang_luar'))
    bt.set(r, { ...data, diperbarui: serverTimestamp() }, { merge: true })
    p.id = r.id
    n++
  })
  if (n) { log(bt, 'tambah', `Menyimpan ${n} penerima luar sekolah (narasumber/pengawas)`, 'orang_luar', null); await bt.commit() }
  return daftarPenerima
}
