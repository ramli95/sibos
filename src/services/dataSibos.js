// Ekspor seluruh data SIBOS ke satu berkas Excel dan impor kembali hasil perbaikannya (khusus Bendahara).
// Susunan berkas: lembar "Petunjuk", satu lembar per koleksi (+ lembar anak "~"), dan lembar tersembunyi
// _lembar (peta lembar → koleksi), _tipe (jenis kolom), _info (versi & waktu ekspor).
import { collection, doc, getDoc, getDocs, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, auth, modePratinjau } from './firebase'
import { KOLEKSI_DATA, DEF_KOLEKSI, KOLOM_SISTEM, VERSI_FORMAT } from '@/config/dataSibos'
import { susunLembar, bacaKembali, gabung, sama, objekBiasa } from '@/utils/dataSibos'
import { unduhBlob } from '@/utils/excel'
import { tanggalPanjang } from '@/utils/format'

const muatExcel = async () => (await import('exceljs')).default
const SUB = '#'

/* ---------------- Membaca Firestore ---------------- */

/** Kelompok dokumen satu koleksi: [{ nama, koleksi, sub, docs: [{ id, data }] }] */
async function muatKoleksi(id) {
  const def = DEF_KOLEKSI[id]
  const s = await getDocs(collection(db, id))
  const docs = s.docs.map((d) => ({ id: d.id, data: d.data() }))
  if (def.rahasia) {
    await Promise.all(docs.map(async (d) => {
      const r = await getDoc(doc(db, id, d.id, 'rahasia', 'data'))
      if (r.exists()) d.data.rahasia = r.data()
    }))
  }
  const hasil = [{ nama: id, koleksi: id, sub: '', docs }]
  for (const sub of def.sub || []) {
    const isi = []
    for (const d of docs) {
      const ss = await getDocs(collection(db, id, d.id, sub))
      ss.docs.forEach((x) => isi.push({ id: `${d.id}/${x.id}`, data: x.data() }))
    }
    hasil.push({ nama: `${id}${SUB}${sub}`, koleksi: id, sub, docs: isi })
  }
  return hasil
}

/* ---------------- Ekspor ---------------- */

const PETUNJUK = [
  'EKSPOR DATA SIBOS — boleh diperbaiki di Excel lalu diimpor kembali lewat menu Ekspor & Impor.',
  '',
  '1. Kolom _id adalah kunci data. JANGAN diubah. Baris baru: kosongkan _id (SIBOS membuat kunci baru), atau isi kunci buatan sendiri bila baris itu punya rincian di lembar anak.',
  '2. Lembar "<nama>~<kolom>" berisi rincian (item belanja, penerima honor, uraian RKAS, butir referensi, baris tabel gaji…). Kolom _id menunjuk baris induknya; _urut = urutan.',
  '3. Menghapus baris di lembar anak = menghapus butir itu. Menghapus baris di lembar induk = data dihapus HANYA bila Anda mencentang "hapus yang tidak ada di berkas" saat impor.',
  '4. Sel kosong = isian dihapus. Kolom bertitik (mis. angka.gaji_pokok) adalah bagian dari satu isian.',
  '5. Tanggal ditulis 2026-10-31. Kolom NIP/NIK/rekening sudah berformat teks — jangan diubah menjadi angka.',
  '6. Isian bertanda ⟪tidak diekspor⟫ (logo/tanda tangan bergambar) tidak berubah saat diimpor.',
  '7. Isian berawalan [ atau { adalah daftar/objek (JSON) — ubah dengan hati-hati, tanda kurung & koma harus lengkap.',
  '8. Jangan menghapus atau mengganti nama lembar; lembar tersembunyi _lembar, _tipe, _info wajib tetap ada.',
]

/** pilihan: [idKoleksi]; kemajuan(teks) */
export async function eksporData(pilihan, { kemajuan } = {}) {
  if (modePratinjau) throw new Error('Mode Pratinjau tidak terhubung ke database.')
  const semua = []
  for (const id of pilihan) {
    kemajuan?.(`Membaca ${DEF_KOLEKSI[id].judul}…`)
    semua.push(...(await muatKoleksi(id)))
  }
  kemajuan?.('Menyusun berkas…')
  const wb = await susunBuku(semua, { pilihan, oleh: auth.currentUser?.email || '' })
  const isi = await wb.xlsx.writeBuffer()
  const tgl = new Date().toISOString().slice(0, 10)
  unduhBlob(isi, `SIBOS Data ${tgl}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  return semua.map((k) => `${k.nama}: ${k.docs.length} data`)
}

/** Buku Excel dari kelompok dokumen [{ nama, koleksi, sub, docs }] (dipisah agar bisa diuji tanpa database) */
export async function susunBuku(semua, { pilihan = [], oleh = '' } = {}) {
  const ExcelJS = await muatExcel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIBOS'
  const pet = wb.addWorksheet('Petunjuk', { properties: { tabColor: { argb: 'FFE3A414' } } })
  pet.getColumn(1).width = 150
  PETUNJUK.forEach((t, i) => { const c = pet.getCell(i + 1, 1); c.value = t; c.alignment = { wrapText: true }; if (i === 0) c.font = { bold: true, size: 13 } })

  const petaLembar = []
  const petaTipe = []
  const namaDipakai = new Set(['Petunjuk', '_lembar', '_tipe', '_info'])
  const namaUnik = (n) => {
    let x = n.replace(/[\\/?*[\]:]/g, '_').slice(0, 31)
    let i = 2
    while (namaDipakai.has(x)) x = `${n.slice(0, 27)}_${i++}`
    namaDipakai.add(x)
    return x
  }

  {
    for (const k of semua) {
      const lembar = susunLembar(k.nama, k.docs)
      lembar.forEach((l) => {
        const nama = namaUnik(l.nama)
        const ws = wb.addWorksheet(nama, { views: [{ state: 'frozen', ySplit: 1, xSplit: 1 }], properties: { tabColor: { argb: l.jalur ? 'FF22A08D' : 'FF1A62E8' } } })
        ws.addRow(l.kolom.map((c) => c.kunci))
        l.baris.forEach((r) => ws.addRow(r))
        l.kolom.forEach((c, i) => {
          const col = ws.getColumn(i + 1)
          col.width = c.kunci.startsWith('_') ? 22 : Math.min(40, Math.max(12, c.kunci.length + 2))
          if (c.tipe === 'teks' || c.tipe === 'tgl' || c.tipe === 'bln' || c.kunci === '_id') col.numFmt = '@'
          if (c.tipe === 'waktu') col.numFmt = 'dd/mm/yyyy hh:mm'
          petaTipe.push([nama, c.kunci, c.tipe])
        })
        const h = ws.getRow(1)
        h.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        h.eachCell((c, i) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: l.kolom[i - 1]?.kunci.startsWith('_') ? 'FF64748B' : l.jalur ? 'FF22A08D' : 'FF1A62E8' } } })
        petaLembar.push([nama, k.nama, l.jalur, k.koleksi, k.sub])
      })
    }
  }
  const tambahTersembunyi = (nama, judul, baris) => {
    const ws = wb.addWorksheet(nama, { state: 'veryHidden' })
    ws.addRow(judul); baris.forEach((r) => ws.addRow(r))
  }
  tambahTersembunyi('_lembar', ['lembar', 'kelompok', 'jalur', 'koleksi', 'sub'], petaLembar)
  tambahTersembunyi('_tipe', ['lembar', 'kolom', 'tipe'], petaTipe)
  tambahTersembunyi('_info', ['kunci', 'nilai'], [['format', 'SIBOS'], ['versi', VERSI_FORMAT], ['waktu', new Date().toISOString()], ['oleh', oleh], ['koleksi', pilihan.join(',')]])
  return wb
}

/* ---------------- Impor kembali: baca berkas ---------------- */

function nilaiSel(v) {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    if ('result' in v) return nilaiSel(v.result)
    if (v.richText) return v.richText.map((t) => t.text).join('')
    if ('text' in v) return v.text
    if (v.error) return null
  }
  return v
}
const lembarKeArray = (ws) => {
  const baris = []
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const r = []
    for (let c = 1; c <= ws.columnCount; c++) r.push(nilaiSel(row.getCell(c).value))
    baris[n - 1] = r
  })
  return Array.from(baris, (r) => r || [])
}

/** Membaca berkas ekspor SIBOS → { info, kelompok: [{ nama, koleksi, sub, lembar: [{ nama, jalur, kolom, baris }] }] } */
export async function bacaBerkasData(file) {
  const ExcelJS = await muatExcel()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ambil = (n) => wb.getWorksheet(n)
  if (!ambil('_lembar') || !ambil('_tipe')) throw new Error('Ini bukan berkas hasil Ekspor Data SIBOS (lembar tersembunyi _lembar/_tipe tidak ada). Untuk berkas dari sumber lain gunakan "Impor dari format lain".')
  const info = Object.fromEntries(lembarKeArray(ambil('_info') || { eachRow() {}, columnCount: 0 }).slice(1).map((r) => [r[0], r[1]]))
  const tipe = new Map()
  lembarKeArray(ambil('_tipe')).slice(1).forEach(([l, k, t]) => tipe.set(`${l}|${k}`, t))
  const kelompok = new Map()
  lembarKeArray(ambil('_lembar')).slice(1).forEach(([nama, kel, jalur, koleksi, sub]) => {
    if (!nama || !DEF_KOLEKSI[koleksi]) return
    const ws = ambil(nama)
    if (!ws) throw new Error(`Lembar "${nama}" hilang dari berkas. Jangan menghapus/mengganti nama lembar.`)
    const arr = lembarKeArray(ws)
    const judul = (arr[0] || []).map((x) => String(x ?? '').trim())
    const kolom = judul.map((k) => ({ kunci: k, tipe: tipe.get(`${nama}|${k}`) || 'campur' }))
    if (!judul.includes('_id')) throw new Error(`Kolom _id di lembar "${nama}" hilang.`)
    // kolom tanpa judul diabaikan
    const pakai = kolom.map((k, i) => (k.kunci ? i : -1)).filter((i) => i >= 0)
    if (!kelompok.has(kel)) kelompok.set(kel, { nama: kel, koleksi, sub: sub || '', lembar: [] })
    kelompok.get(kel).lembar.push({ nama, jalur: jalur || '', kolom: pakai.map((i) => kolom[i]), baris: arr.slice(1).map((r) => pakai.map((i) => r[i] ?? null)) })
  })
  return { info, kelompok: [...kelompok.values()] }
}

/* ---------------- Impor kembali: rencana perubahan ---------------- */

const buatWaktu = (d) => Timestamp.fromDate(d)
const labelDok = (koleksi, id, data) => { const f = DEF_KOLEKSI[koleksi]?.label; try { return (f && f(data)) || id } catch { return id } }

/**
 * Membandingkan berkas dengan database. Hasil per kelompok:
 * { nama, koleksi, sub, def, baru: [{id?, data, label}], ubah: [{id, data, lama, label}], sama: n, hilang: [{id, label}], galat: [] }
 */
export async function rencanakan(berkas) {
  const hasil = []
  for (const k of berkas.kelompok) {
    const def = DEF_KOLEKSI[k.koleksi]
    const r = bacaKembali(k.lembar, buatWaktu)
    const lama = new Map()
    if (k.sub) {
      const s = await getDocs(collection(db, k.koleksi))
      for (const d of s.docs) (await getDocs(collection(db, k.koleksi, d.id, k.sub))).docs.forEach((x) => lama.set(`${d.id}/${x.id}`, x.data()))
    } else {
      (await getDocs(collection(db, k.koleksi))).docs.forEach((d) => lama.set(d.id, d.data()))
      if (def.rahasia) await Promise.all([...lama.keys()].map(async (id) => { const x = await getDoc(doc(db, k.koleksi, id, 'rahasia', 'data')); if (x.exists()) lama.get(id).rahasia = x.data() }))
    }
    const p = { nama: k.nama, koleksi: k.koleksi, sub: k.sub, def, baru: [], ubah: [], sama: 0, hilang: [], galat: [...r.galat] }
    r.docs.forEach((x, id) => {
      const l = lama.get(id)
      if (k.sub && !lama.has(id) && !id.includes('/')) { p.galat.push(`_id "${id}" harus berbentuk "versi/kode"`); return }
      const akhir = gabung(l || {}, x.data, x.lewati, r.tercakup)
      if (!l) p.baru.push({ id, data: akhir, label: labelDok(k.koleksi, id, akhir) })
      else if (!sama(l, akhir, KOLOM_SISTEM)) p.ubah.push({ id, data: akhir, lama: l, label: labelDok(k.koleksi, id, akhir) })
      else p.sama++
    })
    r.baru.forEach((x) => p.baru.push({ id: null, data: x.data, label: labelDok(k.koleksi, '(baru)', x.data) }))
    lama.forEach((d, id) => { if (!r.docs.has(id)) p.hilang.push({ id, label: labelDok(k.koleksi, id, d) }) })
    if (def.hanyaTambah && p.ubah.length) { p.galat.push(`${p.ubah.length} catatan ${def.judul} tidak boleh diubah — perubahannya diabaikan`); p.sama += p.ubah.length; p.ubah = [] }
    hasil.push(p)
  }
  return hasil
}

/* ---------------- Impor kembali: terapkan ---------------- */

/** rencana: hasil rencanakan(); pilihan: { [nama]: { pakai, hapus } } */
export async function terapkan(rencana, pilihan, namaBerkas, { kemajuan } = {}) {
  const uid = auth.currentUser.uid
  const ops = []
  const ringkas = []
  rencana.forEach((p) => {
    const o = pilihan[p.nama]
    if (!o?.pakai || p.galat.length && p.galat.some((g) => !/diabaikan/.test(g))) return
    const ref = (id) => (p.sub ? doc(db, p.koleksi, id.split('/')[0], p.sub, id.split('/').slice(1).join('/')) : id ? doc(db, p.koleksi, id) : doc(collection(db, p.koleksi)))
    const tulis = (id, data) => {
      const { rahasia, ...umum } = data
      const r = ref(id)
      const isi = { ...umum, diperbarui: serverTimestamp(), diperbarui_oleh: uid }
      if (p.koleksi === 'rkas_pergeseran') isi.uid = uid
      ops.push((b) => b.set(r, isi))
      if (p.def.rahasia && objekBiasa(rahasia)) ops.push((b) => b.set(doc(db, p.koleksi, r.id, 'rahasia', 'data'), { ...rahasia, diperbarui: serverTimestamp() }))
    }
    p.baru.forEach((x) => tulis(x.id, x.data))
    if (!p.def.hanyaTambah) p.ubah.forEach((x) => tulis(x.id, x.data))
    const hapus = o.hapus && p.def.hapus !== false && !p.sub ? p.hilang : []
    hapus.forEach((x) => {
      if (p.def.rahasia) ops.push((b) => b.delete(doc(db, p.koleksi, x.id, 'rahasia', 'data')))
      ops.push((b) => b.delete(doc(db, p.koleksi, x.id)))
    })
    const ket = `Impor kembali ${p.nama} dari "${namaBerkas}": ${p.baru.length} baru, ${p.def.hanyaTambah ? 0 : p.ubah.length} diubah, ${hapus.length} dihapus`
    ops.push((b) => b.set(doc(collection(db, 'log_aktivitas')), { uid, aksi: 'impor', keterangan: ket, koleksi: p.koleksi, id_dokumen: null, sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160) }))
    ringkas.push(ket.replace(` dari "${namaBerkas}"`, ''))
  })
  for (let i = 0; i < ops.length; i += 400) {
    kemajuan?.(`Menyimpan ${Math.min(i + 400, ops.length)} dari ${ops.length} perubahan…`)
    const b = writeBatch(db)
    ops.slice(i, i + 400).forEach((f) => f(b))
    await b.commit()
  }
  return ringkas
}

export const RINGKAS_KOLEKSI = KOLEKSI_DATA
export const waktuInfo = (info) => (info?.waktu ? tanggalPanjang(String(info.waktu).slice(0, 10)) : '')
