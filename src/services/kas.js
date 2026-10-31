// Pajak & Buku Kas (Fase 4).
//
// Susunan Firestore
//   referensi/aturan_pajak       → tabel tarif & batas pajak (diubah Bendahara)
//   setoran_pajak/{id}           → satu kode billing/NTPN untuk satu atau beberapa kewajiban pajak
//                                  { tahun, tanggal, kode_billing, ntpn, bnu, masa, jenis, total, butir:[{id_pajak, id_belanja, jenis, nilai, no_bupot}] }
//   kas/{id}                     → baris Buku Kas yang dicatat manual: penerimaan dana, bunga, pajak bunga,
//                                  tarik/setor tunai, saldo awal, koreksi { tahun, tanggal, jenis, bnu, uraian, nilai, sumber }
//   tutup_buku/{tahun-bulan}     → ringkasan bulan saat ditutup + angka rekonsiliasi ARKAS/SIMAKDA/rekening koran
//   rekening_koran/{tahun-bulan} → mutasi bank hasil impor PDF + pasangan baris BKU
// Kewajiban pajak TIDAK disimpan terpisah: dibentuk dari belanja.pajak (Lunas) + setoran_pajak,
// sehingga mengubah belanja otomatis mengubah pajaknya tanpa data ganda.
import { collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp, deleteField } from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { rapikanAturan, pasangAturan } from '@/utils/pajak'

const perangkat = () => navigator.userAgent.slice(0, 160)
const idAcak = () => Math.random().toString(36).slice(2, 11)
const bersih = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)))

function log(b, aksi, keterangan, koleksi, id, sebelum = null, sesudah = null) {
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: auth.currentUser.uid, aksi, keterangan, koleksi, id_dokumen: id, sebelum, sesudah, waktu: serverTimestamp(), perangkat: perangkat(),
  })
}

let contoh = null
const dataContoh = async () => (contoh ??= await import('./contohKas'))

/* ---------------- Aturan pajak ---------------- */

export async function muatAturanPajak() {
  let a = null
  if (modePratinjau) a = (await dataContoh()).aturan.isi
  else { const s = await getDoc(doc(db, 'referensi', 'aturan_pajak')).catch(() => null); a = s?.exists() ? s.data() : null }
  const hasil = rapikanAturan(a)
  pasangAturan(hasil)
  return hasil
}

export async function simpanAturanPajak(a, ringkas) {
  const data = bersih({ versi: (Number(a.versi) || 1) + 1, batas: a.batas, tarif: a.tarif, ter_bulanan: a.ter_bulanan, pasal17: a.pasal17 })
  pasangAturan(data)
  if (modePratinjau) { (await dataContoh()).aturan.isi = data; return }
  const b = writeBatch(db)
  b.set(doc(db, 'referensi', 'aturan_pajak'), { ...data, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, 'ubah', `Mengubah aturan tarif pajak${ringkas ? ': ' + ringkas : ''}`, 'referensi', 'aturan_pajak', null, data)
  await b.commit()
}

/* ---------------- Setoran pajak (kode billing, NTPN, e-Bupot) ---------------- */

export async function muatSetoran(tahun) {
  if (modePratinjau) return (await dataContoh()).setoran.filter((s) => s.tahun === Number(tahun)).map((s) => bersih(s))
  const s = await getDocs(query(collection(db, 'setoran_pajak'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function simpanSetoran(id, data) {
  const isi = bersih({ ...data, tahun: Number(String(data.tanggal || '').slice(0, 4)) || Number(data.tahun), total: (data.butir || []).reduce((s, x) => s + (Number(x.nilai) || 0), 0) })
  if (modePratinjau) {
    const c = await dataContoh()
    const i = c.setoran.findIndex((x) => x.id === id)
    const baru = { ...isi, id: id || 's' + idAcak() }
    if (i >= 0) c.setoran[i] = baru; else c.setoran.push(baru)
    return baru.id
  }
  const r = id ? doc(db, 'setoran_pajak', id) : doc(collection(db, 'setoran_pajak'))
  const b = writeBatch(db)
  b.set(r, { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Mencatat'} setoran pajak ${isi.kode_billing || ''} NTPN ${isi.ntpn || '-'} Rp ${isi.total.toLocaleString('id-ID')} (${isi.butir.length} kewajiban)`, 'setoran_pajak', r.id)
  await b.commit()
  return r.id
}

export async function hapusSetoran(s) {
  if (modePratinjau) { const c = await dataContoh(); c.setoran.splice(c.setoran.findIndex((x) => x.id === s.id), 1); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'setoran_pajak', s.id))
  log(b, 'hapus', `Menghapus setoran pajak ${s.kode_billing || ''} NTPN ${s.ntpn || '-'} Rp ${Number(s.total).toLocaleString('id-ID')} — kewajibannya kembali terutang`, 'setoran_pajak', s.id, bersih(s))
  await b.commit()
}

/* ---------------- Kas manual ---------------- */

export async function muatKas(tahun) {
  if (modePratinjau) return (await dataContoh()).kas.filter((k) => k.tahun === Number(tahun)).map((k) => ({ ...k }))
  const s = await getDocs(query(collection(db, 'kas'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function simpanKas(id, data) {
  const isi = bersih({ ...data, nilai: Math.round(Number(data.nilai) || 0), tahun: Number(String(data.tanggal).slice(0, 4)) })
  if (modePratinjau) {
    const c = await dataContoh()
    const baru = { ...isi, id: id || 'k' + idAcak() }
    const i = c.kas.findIndex((x) => x.id === id)
    if (i >= 0) c.kas[i] = baru; else c.kas.push(baru)
    return baru.id
  }
  const r = id ? doc(db, 'kas', id) : doc(collection(db, 'kas'))
  const b = writeBatch(db)
  b.set(r, { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, id ? 'ubah' : 'tambah', `${id ? 'Mengubah' : 'Mencatat'} buku kas: ${isi.uraian} Rp ${isi.nilai.toLocaleString('id-ID')}`, 'kas', r.id)
  await b.commit()
  return r.id
}

export async function hapusKas(k) {
  if (modePratinjau) { const c = await dataContoh(); c.kas.splice(c.kas.findIndex((x) => x.id === k.id), 1); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'kas', k.id))
  log(b, 'hapus', `Menghapus baris buku kas: ${k.uraian} Rp ${Number(k.nilai).toLocaleString('id-ID')}`, 'kas', k.id, bersih(k))
  await b.commit()
}

/* ---------------- Belanja: BNU, cara bayar, pajak ditetapkan ---------------- */

/** Ubah sebagian kolom belanja (BNU, cara bayar, pajak tetap, BNU pajak) + log */
export async function ubahBelanjaKas(belanja, ubah, keterangan) {
  if (modePratinjau) {
    const c = await import('./contohBelanja')
    const b = c.daftar.find((x) => x.id === belanja.id)
    if (b) Object.assign(b, bersih(ubah))
    return
  }
  const b = writeBatch(db)
  b.update(doc(db, 'belanja', belanja.id), { ...bersih(ubah), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, 'ubah', `${keterangan} — "${belanja.nama_pekerjaan}"`, 'belanja', belanja.id)
  await b.commit()
}

/* ---------------- Tutup buku ---------------- */

export async function muatTutupBuku(tahun) {
  if (modePratinjau) return (await dataContoh()).tutup.filter((t) => t.tahun === Number(tahun)).map((t) => bersih(t))
  const s = await getDocs(query(collection(db, 'tutup_buku'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Simpan angka rekonsiliasi / tutup / buka kembali. id = 'yyyy-mm' */
export async function simpanTutupBuku(id, data, keterangan) {
  const isi = bersih({ ...data, tahun: Number(id.slice(0, 4)), bulan: Number(id.slice(5, 7)) })
  if (modePratinjau) {
    const c = await dataContoh()
    const i = c.tutup.findIndex((x) => x.id === id)
    const baru = { ...(i >= 0 ? c.tutup[i] : {}), ...isi, id }
    if (i >= 0) c.tutup[i] = baru; else c.tutup.push(baru)
    return
  }
  const b = writeBatch(db)
  b.set(doc(db, 'tutup_buku', id), { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid }, { merge: true })
  log(b, data.status === 'ditutup' ? 'tutup_bulan' : data.status === 'dibuka' ? 'buka_bulan' : 'ubah', keterangan || `Memperbarui tutup buku ${id}`, 'tutup_buku', id, null, isi.ringkasan || null)
  await b.commit()
}

/* ---------------- Rekening koran ---------------- */

export async function muatKoran(tahun) {
  if (modePratinjau) return (await dataContoh()).koran.filter((k) => k.tahun === Number(tahun)).map((k) => bersih(k))
  const s = await getDocs(query(collection(db, 'rekening_koran'), where('tahun', '==', Number(tahun))))
  return s.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function simpanKoran(id, data, keterangan) {
  const isi = bersih({ ...data, tahun: Number(id.slice(0, 4)), bulan: Number(id.slice(5, 7)) })
  if (modePratinjau) {
    const c = await dataContoh()
    const i = c.koran.findIndex((x) => x.id === id)
    if (i >= 0) c.koran[i] = { ...isi, id }; else c.koran.push({ ...isi, id })
    return
  }
  const b = writeBatch(db)
  b.set(doc(db, 'rekening_koran', id), { ...isi, diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid })
  log(b, 'impor', keterangan || `Rekening koran ${id}: ${isi.mutasi.length} mutasi`, 'rekening_koran', id)
  await b.commit()
}

export async function hapusKoran(id) {
  if (modePratinjau) { const c = await dataContoh(); c.koran.splice(c.koran.findIndex((x) => x.id === id), 1); return }
  const b = writeBatch(db)
  b.delete(doc(db, 'rekening_koran', id))
  log(b, 'hapus', `Menghapus rekening koran ${id}`, 'rekening_koran', id)
  await b.commit()
}

/* ---------------- Migrasi dari Jurnal Dana BOS ---------------- */

/**
 * Menulis hasil migrasi bertahap (batch ≤ 400 tulis). Belanja migrasi memakai id tetap
 * `mig-<tahun>-<kunci>` sehingga migrasi ulang memperbarui, bukan menggandakan.
 * paket: { belanja: [], kas: [], setoran: [] }
 */
export async function simpanMigrasi(paket, { kemajuan } = {}) {
  const semua = [
    ...paket.belanja.map((x) => ['belanja', x]),
    ...paket.kas.map((x) => ['kas', x]),
    ...paket.setoran.map((x) => ['setoran_pajak', x]),
  ]
  if (modePratinjau) {
    const c = await dataContoh()
    const cb = await import('./contohBelanja')
    paket.belanja.forEach((x) => { const i = cb.daftar.findIndex((y) => y.id === x.id); if (i >= 0) cb.daftar[i] = x; else cb.daftar.push(x) })
    paket.kas.forEach((x) => { const i = c.kas.findIndex((y) => y.id === x.id); if (i >= 0) c.kas[i] = x; else c.kas.push(x) })
    paket.setoran.forEach((x) => { const i = c.setoran.findIndex((y) => y.id === x.id); if (i >= 0) c.setoran[i] = x; else c.setoran.push(x) })
    kemajuan?.(semua.length, semua.length)
    return
  }
  for (let i = 0; i < semua.length; i += 400) {
    const b = writeBatch(db)
    semua.slice(i, i + 400).forEach(([kol, x]) => {
      const { id, ...isi } = x
      b.set(doc(db, kol, id), { ...bersih(isi), diperbarui: serverTimestamp(), diperbarui_oleh: auth.currentUser.uid, ...(kol === 'belanja' ? { dibuat: serverTimestamp(), dibuat_oleh: auth.currentUser.uid } : {}) })
    })
    if (i === 0) log(b, 'impor', `Migrasi Jurnal Dana BOS: ${paket.belanja.length} belanja, ${paket.kas.length} baris kas, ${paket.setoran.length} setoran pajak`, 'belanja', 'migrasi')
    await b.commit()
    kemajuan?.(Math.min(i + 400, semua.length), semua.length)
  }
}

/** Hapus semua data hasil migrasi tahun tertentu (untuk mengulang migrasi) */
export async function hapusMigrasi(tahun) {
  if (modePratinjau) {
    const c = await dataContoh(); const cb = await import('./contohBelanja')
    // Mode Pratinjau: data contoh Fase 4 ikut dibersihkan agar migrasi data asli bisa diuji tanpa campuran
    const hapus = (x) => x.tahun === Number(tahun) && (x.sumber === 'migrasi' || x.sumber === 'contoh' || /^(k-|s-contoh)/.test(x.id))
    for (const arr of [cb.daftar, c.kas, c.setoran]) for (let i = arr.length - 1; i >= 0; i--) if (hapus(arr[i])) arr.splice(i, 1)
    c.tutup.splice(0, c.tutup.length); c.koran.splice(0, c.koran.length)
    return 0
  }
  let n = 0
  for (const kol of ['belanja', 'kas', 'setoran_pajak']) {
    const s = await getDocs(query(collection(db, kol), where('tahun', '==', Number(tahun)), where('sumber', '==', 'migrasi')))
    for (let i = 0; i < s.docs.length; i += 450) {
      const b = writeBatch(db)
      s.docs.slice(i, i + 450).forEach((d) => b.delete(d.ref))
      if (i === 0 && kol === 'belanja') log(b, 'hapus', `Menghapus data migrasi ${tahun} (untuk diulang)`, 'belanja', 'migrasi')
      await b.commit()
    }
    n += s.docs.length
  }
  return n
}

export { deleteField }
