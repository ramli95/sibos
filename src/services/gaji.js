// Kepegawaian & Gaji (Fase 6). Semua data gaji hanya untuk Bendahara (lihat firestore.rules).
//
// Susunan Firestore
//   gaji_dasar/{idPegawai}   → dasar perhitungan: MKG, gaji pokok, tunjangan, potongan tetap, TMT tugas
//   gaji/{yyyy-mm}           → per bulan: daftar resmi hasil impor PDF (pembanding) + simpanan Daftar Gaji SIBOS
//   kgb/{id}                 → riwayat KGB: usulan (surat pengantar) & SK/pemberitahuan yang sudah terbit
//   skpg/{id}                → SKPG yang sudah diterbitkan (nomor, pegawai, bulan, keperluan) untuk cetak ulang
//   sekolah/aturan_gaji      → harga beras & persentase iuran (bisa diubah Bendahara)
// Log aktivitas tidak memuat nominal gaji (log dapat dibaca Kepala Sekolah).
import { collection, doc, getDoc, getDocs, writeBatch, runTransaction, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { muatPegawai } from './master'
import { muatPolaNomor } from './belanja'
import { ATURAN_GAJI_AWAL } from '@/config/gaji'
import { isiPola, salin } from '@/utils/belanja'

const perangkat = () => navigator.userAgent.slice(0, 160)
const idAcak = () => Math.random().toString(36).slice(2, 11)
const bersih = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)))

function log(b, aksi, keterangan, koleksi, id) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi, id_dokumen: id, sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: perangkat(),
  })
}

let contoh = null
const dataContoh = async () => (contoh ||= { ...(await import('./contohGaji')) })

/* ---------------- Muat semua ---------------- */

export async function muatSemuaGaji() {
  if (modePratinjau) {
    const c = await dataContoh()
    return { pegawai: salin(c.pegawai), dasar: salin(c.dasar), kgb: salin(c.kgb), skpg: salin(c.skpg), aturan: { ...ATURAN_GAJI_AWAL } }
  }
  const [pegawai, sd, sk, ss, sa] = await Promise.all([
    muatPegawai({ denganRahasia: true }),
    getDocs(collection(db, 'gaji_dasar')),
    getDocs(collection(db, 'kgb')),
    getDocs(query(collection(db, 'skpg'), orderBy('tanggal', 'desc'))),
    getDoc(doc(db, 'sekolah', 'aturan_gaji')),
  ])
  return {
    pegawai,
    dasar: Object.fromEntries(sd.docs.map((d) => [d.id, d.data()])),
    kgb: sk.docs.map((d) => ({ id: d.id, ...d.data() })),
    skpg: ss.docs.map((d) => ({ id: d.id, ...d.data() })),
    aturan: { ...ATURAN_GAJI_AWAL, ...(sa.exists() ? sa.data() : {}) },
  }
}

/* ---------------- Aturan ---------------- */

export async function simpanAturanGaji(aturan) {
  if (modePratinjau) return
  const b = writeBatch(db)
  b.set(doc(db, 'sekolah', 'aturan_gaji'), { ...aturan, diperbarui: serverTimestamp() }, { merge: true })
  log(b, 'ubah', 'Mengubah aturan perhitungan gaji (harga beras/persentase iuran)', 'sekolah', 'aturan_gaji')
  await b.commit()
}

/* ---------------- Dasar gaji ---------------- */

export const KOLOM_DASAR = ['mkg', 'mkg_bulan', 'gaji_pokok', 'tunj_pasangan', 'anak_tunjangan', 'jiwa_beras', 'tj_fungsional', 'tj_pph', 'taperum',
  'potongan_lain', 'ket_potongan_lain', 'tj_kinerja', 'tarif_pph_tpg', 'tmt_tugas']

export async function simpanDasar(idPegawai, data, namaPegawai) {
  const isi = Object.fromEntries(KOLOM_DASAR.map((k) => [k, data[k] === undefined ? null : data[k]]))
  if (modePratinjau) { (await dataContoh()).dasar[idPegawai] = { ...isi, diperbarui: new Date() }; return }
  const b = writeBatch(db)
  b.set(doc(db, 'gaji_dasar', idPegawai), { ...bersih(isi), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, 'ubah', `Memperbarui dasar gaji ${namaPegawai}`, 'gaji_dasar', idPegawai)
  await b.commit()
}

/** daftar: [{ id_pegawai, data }] — impor massal dari dB-SKPG / PDF (merge) */
export async function simpanDasarMassal(daftar, sumber) {
  if (modePratinjau) { const c = await dataContoh(); daftar.forEach((x) => { c.dasar[x.id_pegawai] = { ...(c.dasar[x.id_pegawai] || {}), ...x.data, diperbarui: new Date() } }); return }
  for (let i = 0; i < daftar.length; i += 400) {
    const b = writeBatch(db)
    daftar.slice(i, i + 400).forEach((x) => b.set(doc(db, 'gaji_dasar', x.id_pegawai), { ...bersih(x.data), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true }))
    await b.commit()
  }
  const b = writeBatch(db)
  log(b, 'impor', `Impor dasar gaji ${daftar.length} pegawai dari ${sumber}`, 'gaji_dasar', null)
  await b.commit()
}

/* ---------------- Per bulan: daftar resmi & simpanan ---------------- */

export async function muatBulan(periode) {
  if (modePratinjau) return salin((await dataContoh()).bulan[periode] || null)
  const s = await getDoc(doc(db, 'gaji', periode))
  return s.exists() ? s.data() : null
}

/** resmi: { idPegawai: { nip, nama, gaji_pokok, …, bersih } } */
export async function simpanResmi(periode, resmi, berkas) {
  const isi = { periode, resmi: bersih(resmi), berkas: bersih(berkas || null), diimpor: modePratinjau ? new Date() : serverTimestamp() }
  if (modePratinjau) { const c = await dataContoh(); c.bulan[periode] = { ...(c.bulan[periode] || {}), ...isi }; return }
  const b = writeBatch(db)
  b.set(doc(db, 'gaji', periode), isi, { merge: true })
  log(b, 'impor', `Impor Daftar Gaji resmi ${periode} (${Object.keys(resmi).length} pegawai) dari "${berkas?.nama || 'berkas'}"`, 'gaji', periode)
  await b.commit()
}

export async function hapusResmi(periode) {
  if (modePratinjau) { const c = await dataContoh(); if (c.bulan[periode]) delete c.bulan[periode].resmi; return }
  const b = writeBatch(db)
  b.set(doc(db, 'gaji', periode), { resmi: null, berkas: null }, { merge: true })
  log(b, 'hapus', `Menghapus Daftar Gaji resmi ${periode}`, 'gaji', periode)
  await b.commit()
}

/** Simpan Daftar Gaji SIBOS bulan ini apa adanya (agar tidak berubah bila dasar gaji diubah kemudian) */
export async function simpanDaftarBulan(periode, baris) {
  if (modePratinjau) { const c = await dataContoh(); c.bulan[periode] = { ...(c.bulan[periode] || {}), simpanan: { baris: salin(baris), waktu: new Date() } }; return }
  const b = writeBatch(db)
  b.set(doc(db, 'gaji', periode), { periode, simpanan: { baris: bersih(baris), waktu: serverTimestamp(), oleh: auth.currentUser.uid } }, { merge: true })
  log(b, 'tambah', `Menyimpan Daftar Gaji ${periode} (${baris.length} pegawai)`, 'gaji', periode)
  await b.commit()
}

export async function lepasDaftarBulan(periode) {
  if (modePratinjau) { const c = await dataContoh(); if (c.bulan[periode]) delete c.bulan[periode].simpanan; return }
  const b = writeBatch(db)
  b.set(doc(db, 'gaji', periode), { simpanan: null }, { merge: true })
  log(b, 'ubah', `Membuka kembali Daftar Gaji ${periode} (dihitung ulang dari dasar gaji)`, 'gaji', periode)
  await b.commit()
}

/* ---------------- Nomor surat (Agenda Surat) ---------------- */

/**
 * Mengambil nomor surat berikutnya (penghitung "surat" per tahun) dan mencatatnya di Agenda Surat,
 * lalu menulis dokumen tambahan (SKPG/KGB) dalam satu transaksi.
 */
async function nomorDanSimpan({ tanggal, nomor, jenis, perihal, tujuan, koleksi, id, isi, keterangan }) {
  const tahun = Number(String(tanggal).slice(0, 4))
  const pola = await muatPolaNomor()
  if (modePratinjau) {
    const c = await dataContoh()
    c.urut += 1
    const n = nomor?.trim() || isiPola(pola.surat, { urut: c.urut, tanggal })
    const baru = { id: id || 'x' + idAcak(), ...isi, nomor: n }
    const daftar = c[koleksi]
    const i = daftar.findIndex((x) => x.id === baru.id)
    if (i >= 0) daftar[i] = baru; else daftar.unshift(baru)
    return baru
  }
  const ref = id ? doc(db, koleksi, id) : doc(collection(db, koleksi))
  let hasil = null
  await runTransaction(db, async (tx) => {
    const rh = doc(db, 'penomoran', `surat-${tahun}`)
    let urut = isi.nomor_urut || null
    let n = nomor?.trim()
    if (!n) {
      const s = await tx.get(rh)
      urut = (s.exists() ? s.data().terakhir || 0 : 0) + 1
      n = isiPola(pola.surat, { urut, tanggal })
      tx.set(rh, { terakhir: urut, tahun, diperbarui: serverTimestamp() }, { merge: true })
    }
    tx.set(doc(db, 'agenda_surat', `${ref.id}_${koleksi}`), {
      tahun, jenis, nomor: n, urut, tanggal, perihal, tujuan, id_belanja: null, sumber: 'otomatis', diperbarui: serverTimestamp(), uid: auth.currentUser.uid,
    })
    hasil = { ...isi, nomor: n, nomor_urut: urut }
    tx.set(ref, { ...bersih(hasil), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
    tx.set(doc(collection(db, 'log_aktivitas')), {
      uid: auth.currentUser.uid, aksi: id ? 'ubah' : 'tambah', keterangan: `${keterangan} — nomor ${n}`, koleksi, id_dokumen: ref.id, sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: perangkat(),
    })
  })
  return { id: ref.id, ...hasil }
}

/* ---------------- SKPG ---------------- */

/** isi: { id_pegawai, nama, nip, status, periode, keperluan, tanggal, angka{…}, sumber } */
export async function terbitkanSkpg(isi, { id = null, nomor = '' } = {}) {
  return nomorDanSimpan({
    tanggal: isi.tanggal, nomor, jenis: 'skpg', koleksi: 'skpg', id, isi,
    perihal: `Surat Keterangan Perincian Gaji a.n. ${isi.nama}`, tujuan: isi.nama,
    keterangan: `${id ? 'Memperbarui' : 'Menerbitkan'} SKPG a.n. ${isi.nama} (${isi.periode})`,
  })
}

export async function hapusSkpg(x) {
  if (modePratinjau) { const c = await dataContoh(); c.skpg = c.skpg.filter((y) => y.id !== x.id); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'skpg', x.id))
  b.delete(doc(db, 'agenda_surat', `${x.id}_skpg`))
  log(b, 'hapus', `Menghapus SKPG ${x.nomor} a.n. ${x.nama} (nomor tidak dipakai ulang)`, 'skpg', x.id)
  await b.commit()
}

/* ---------------- KGB ---------------- */

/** Surat pengantar usulan KGB (satu surat untuk satu atau beberapa pegawai). isi: { tanggal, bulan_kgb, pegawai: [...], tujuan } */
export async function simpanUsulanKgb(isi, { id = null, nomor = '' } = {}) {
  return nomorDanSimpan({
    tanggal: isi.tanggal, nomor, jenis: 'kgb', koleksi: 'kgb', id, isi: { ...isi, jenis: 'usulan' },
    perihal: `Usulan Kenaikan Gaji Berkala (${isi.pegawai.length} pegawai)`, tujuan: isi.tujuan,
    keterangan: `${id ? 'Memperbarui' : 'Membuat'} surat pengantar usulan KGB ${isi.pegawai.length} pegawai`,
  })
}

/**
 * Mencatat SK/Surat Pemberitahuan KGB yang sudah terbit: TMT KGB terakhir di Data Pegawai diganti,
 * gaji pokok & MKG di dasar gaji diperbarui.
 */
export async function catatSkKgb(p, sk) {
  const isi = bersih({
    jenis: 'sk', id_pegawai: p.id, nama: p.nama, nip: p.nip || '', golongan: p.golongan || '',
    nomor_sk: sk.nomor_sk, tanggal_sk: sk.tanggal_sk, pejabat_sk: sk.pejabat_sk || '', tmt: sk.tmt,
    gaji_pokok_lama: Number(sk.gaji_pokok_lama) || 0, gaji_pokok_baru: Number(sk.gaji_pokok_baru) || 0,
    mkg_lama: sk.mkg_lama ?? null, mkg_baru: Number(sk.mkg_baru), tmt_lama: p.tmt_kgb_terakhir || null, id_usulan: sk.id_usulan || null,
  })
  if (modePratinjau) {
    const c = await dataContoh()
    c.kgb.unshift({ id: 'k' + idAcak(), ...isi })
    const x = c.pegawai.find((y) => y.id === p.id); if (x) x.tmt_kgb_terakhir = sk.tmt
    c.dasar[p.id] = { ...(c.dasar[p.id] || {}), gaji_pokok: isi.gaji_pokok_baru, mkg: isi.mkg_baru, diperbarui: new Date() }
    return
  }
  const b = writeBatch(db)
  const ref = doc(collection(db, 'kgb'))
  b.set(ref, { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  b.set(doc(db, 'pegawai', p.id), { tmt_kgb_terakhir: sk.tmt, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
  b.set(doc(db, 'gaji_dasar', p.id), { gaji_pokok: isi.gaji_pokok_baru, mkg: isi.mkg_baru, mkg_bulan: 0, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
  log(b, 'tambah', `Mencatat KGB ${p.nama}: SK ${sk.nomor_sk || '-'}, TMT ${sk.tmt} (TMT KGB & gaji pokok diperbarui)`, 'kgb', ref.id)
  await b.commit()
}

export async function hapusKgb(x) {
  if (modePratinjau) { const c = await dataContoh(); c.kgb = c.kgb.filter((y) => y.id !== x.id); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'kgb', x.id))
  if (x.jenis === 'usulan') b.delete(doc(db, 'agenda_surat', `${x.id}_kgb`))
  log(b, 'hapus', x.jenis === 'usulan' ? `Menghapus surat pengantar KGB ${x.nomor} (nomor tidak dipakai ulang)` : `Menghapus catatan SK KGB ${x.nama} (TMT KGB & gaji pokok tidak dikembalikan otomatis)`, 'kgb', x.id)
  await b.commit()
}
