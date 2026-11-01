// Mengubah dokumen Firestore ⇄ baris Excel tanpa kehilangan bentuk data (round-trip).
//   • nilai biasa → satu kolom; objek → kolom bertitik ("angka.gaji_pokok")
//   • daftar objek (item, penerima, uraian…) → lembar anak, satu baris per butir (kolom _id induk + _urut)
//   • daftar nilai biasa (mis. rencana 12 bulan) → teks JSON "[…]"
//   • waktu (Timestamp) → tanggal-jam Excel; teks sangat panjang (logo base64) → dilewati & dipertahankan
// Jenis setiap kolom disimpan di lembar tersembunyi "_tipe" agar saat diimpor nilainya dikembalikan persis.

export const BATAS_SEL = 32000
const LEWATI = '⟪tidak diekspor⟫'

export const objekBiasa = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && typeof v.toDate !== 'function'
const waktu = (v) => v instanceof Date || (v && typeof v.toDate === 'function')

function tipeDari(v) {
  if (v === null || v === undefined || v === '') return null
  if (waktu(v)) return 'waktu'
  if (typeof v === 'number') return 'angka'
  if (typeof v === 'boolean') return 'benar'
  if (Array.isArray(v) || objekBiasa(v)) return 'json'
  const s = String(v)
  if (s.length > BATAS_SEL) return 'lewati'
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'tgl'
  if (/^\d{4}-\d{2}$/.test(s)) return 'bln'
  return 'teks'
}

/**
 * Meratakan satu dokumen. Hasil: { kolom: { kunci: nilai }, anak: { jalur: [objek…] } }
 * Daftar objek di mana pun (termasuk di dalam objek) dipisah ke `anak` dengan jalur bertitik.
 */
export function ratakan(data, awalan = '', hasil = { kolom: {}, anak: {} }, bolehAnak = true) {
  Object.entries(data || {}).forEach(([k, v]) => {
    const kunci = awalan ? `${awalan}.${k}` : k
    if (Array.isArray(v) && bolehAnak && v.length && v.every(objekBiasa)) hasil.anak[kunci] = v
    else if (objekBiasa(v) && Object.keys(v).length && !Object.keys(v).some((x) => x.includes('.'))) ratakan(v, kunci, hasil, bolehAnak)
    else hasil.kolom[kunci] = v
  })
  return hasil
}

/** Nilai untuk ditulis ke sel Excel */
export function keSel(v, tipe) {
  if (v === null || v === undefined) return null
  if (tipe === 'lewati' || (typeof v === 'string' && v.length > BATAS_SEL)) return LEWATI
  if (waktu(v)) return v instanceof Date ? v : v.toDate()
  if (Array.isArray(v) || objekBiasa(v)) { const j = JSON.stringify(v); return j.length > BATAS_SEL ? LEWATI : j }
  return v
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Nilai sel Excel → nilai Firestore menurut tipe kolom. buatWaktu: Date → Timestamp */
export function dariSel(v, tipe, buatWaktu = (d) => d) {
  const kosong = v === null || v === undefined || v === ''
  if (tipe === 'lewati' || v === LEWATI) return { lewati: true }
  if (kosong) return { nilai: null }
  switch (tipe) {
    case 'angka': { const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? { nilai: n } : { galat: `"${v}" bukan angka` } }
    case 'benar': return { nilai: v === true || /^(true|ya|benar|1|y)$/i.test(String(v).trim()) }
    case 'waktu': { const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? { galat: `"${v}" bukan tanggal` } : { nilai: buatWaktu(d) } }
    case 'tgl': return { nilai: v instanceof Date ? iso(v) : String(v).trim() }
    case 'bln': return { nilai: v instanceof Date ? iso(v).slice(0, 7) : String(v).trim() }
    case 'json': try { return { nilai: JSON.parse(String(v)) } } catch { return { galat: `isi JSON tidak sah: ${String(v).slice(0, 40)}…` } }
    case 'teks': return { nilai: v instanceof Date ? iso(v) : typeof v === 'number' ? String(v) : String(v) }
    default: return { nilai: v instanceof Date ? iso(v) : v } // campur: apa adanya
  }
}

/** Menaruh nilai di jalur bertitik */
export function taruh(obj, jalur, nilai) {
  const k = jalur.split('.')
  let o = obj
  k.slice(0, -1).forEach((x) => { if (!objekBiasa(o[x])) o[x] = {}; o = o[x] })
  o[k[k.length - 1]] = nilai
}
export function ambil(obj, jalur) {
  return jalur.split('.').reduce((o, x) => (o == null ? undefined : o[x]), obj)
}

/**
 * Menyusun lembar-lembar Excel untuk satu kelompok dokumen.
 * docs: [{ id, data }]; nama: nama lembar induk (mis. "pegawai" atau "rkas#bagian").
 * Hasil: [{ nama, jalur ('' = induk), kolom: [{ kunci, tipe }], baris: [[…]] }]
 */
export function susunLembar(nama, docs) {
  const induk = { nama, jalur: '', tipe: new Map(), baris: [] }
  const anak = new Map()
  const catatTipe = (peta, k, v) => {
    const t = tipeDari(v)
    if (!t) { if (!peta.has(k)) peta.set(k, null); return }
    const lama = peta.get(k)
    if (!lama) peta.set(k, t)
    else if (lama !== t && lama !== 'lewati') peta.set(k, t === 'lewati' ? 'lewati' : lama === 'teks' && (t === 'tgl' || t === 'bln') ? 'teks' : (lama === 'tgl' || lama === 'bln') && t === 'teks' ? 'teks' : 'campur')
  }
  docs.forEach(({ id, data }) => {
    const r = ratakan(data)
    Object.entries(r.kolom).forEach(([k, v]) => catatTipe(induk.tipe, k, v))
    induk.baris.push({ _id: id, ...r.kolom })
    Object.entries(r.anak).forEach(([jalur, isi]) => {
      if (!anak.has(jalur)) anak.set(jalur, { nama: `${nama}~${jalur}`, jalur, tipe: new Map(), baris: [] })
      const a = anak.get(jalur)
      isi.forEach((butir, i) => {
        const rb = ratakan(butir, '', { kolom: {}, anak: {} }, false)
        Object.entries(rb.kolom).forEach(([k, v]) => catatTipe(a.tipe, k, v))
        a.baris.push({ _id: id, _urut: i + 1, ...rb.kolom })
      })
    })
  })
  anak.forEach((_, jalur) => induk.tipe.delete(jalur))
  const jadi = (l, awal) => {
    const kolom = [...awal.map((k) => ({ kunci: k, tipe: k === '_urut' ? 'angka' : 'teks' })), ...[...l.tipe.entries()].map(([k, t]) => ({ kunci: k, tipe: t || 'teks' }))]
    return { nama: l.nama, jalur: l.jalur, kolom, baris: l.baris.map((b) => kolom.map((c) => keSel(b[c.kunci], c.tipe))) }
  }
  return [jadi(induk, ['_id']), ...[...anak.values()].map((a) => jadi(a, ['_id', '_urut']))]
}

/**
 * Membaca kembali lembar-lembar satu kelompok menjadi dokumen.
 * lembar: [{ jalur, kolom: [{kunci, tipe}], baris: [[…]] }] (urutan kolom sama dengan judul di berkas)
 * Hasil: { docs: Map(id → { data, lewati: [jalur…] }), baru: [{ data }], galat: [teks], tercakup: Set(kolom tingkat atas) }
 * Sel kosong = kolom itu dihapus dari dokumen (kecuali kolom teks: menjadi teks kosong).
 */
export function bacaKembali(lembar, buatWaktu) {
  const docs = new Map()
  const baru = []
  const galat = []
  const induk = lembar.find((l) => !l.jalur)
  if (!induk) return { docs, baru, galat: ['Lembar induk tidak ditemukan.'], tercakup: new Set() }
  const tercakup = new Set([...induk.kolom.map((c) => c.kunci), ...lembar.filter((l) => l.jalur).map((l) => l.jalur)].filter((k) => k !== '_id').map((k) => k.split('.')[0]))
  const iId = induk.kolom.findIndex((c) => c.kunci === '_id')
  induk.baris.forEach((r, n) => {
    if (r.every((v) => v === null || v === '' || v === undefined)) return
    const data = {}
    const lewati = []
    induk.kolom.forEach((c, i) => {
      if (c.kunci === '_id') return
      const h = dariSel(r[i], c.tipe, buatWaktu)
      if (h.lewati) lewati.push(c.kunci)
      else if (h.galat) galat.push(`${induk.nama} baris ${n + 2}, kolom ${c.kunci}: ${h.galat}`)
      else if (h.nilai !== null) taruh(data, c.kunci, h.nilai)
    })
    const id = String(r[iId] ?? '').trim()
    if (id) docs.set(id, { data, lewati, anak: new Set() })
    else baru.push({ data })
  })
  lembar.filter((l) => l.jalur).forEach((l) => {
    const iI = l.kolom.findIndex((c) => c.kunci === '_id')
    const iU = l.kolom.findIndex((c) => c.kunci === '_urut')
    const kelompok = new Map()
    l.baris.forEach((r, n) => {
      if (r.every((v) => v === null || v === '' || v === undefined)) return
      const id = String(r[iI] ?? '').trim()
      if (!docs.has(id)) { galat.push(`${l.nama} baris ${n + 2}: _id "${id}" tidak ada di lembar induk`); return }
      const butir = {}
      l.kolom.forEach((c, i) => {
        if (i === iI || i === iU) return
        const h = dariSel(r[i], c.tipe, buatWaktu)
        if (h.galat) galat.push(`${l.nama} baris ${n + 2}, kolom ${c.kunci}: ${h.galat}`)
        else if (!h.lewati && h.nilai !== null) taruh(butir, c.kunci, h.nilai)
      })
      if (!kelompok.has(id)) kelompok.set(id, [])
      kelompok.get(id).push({ urut: Number(r[iU]) || n, butir })
    })
    kelompok.forEach((isi, id) => {
      const d = docs.get(id)
      taruh(d.data, l.jalur, isi.sort((a, b) => a.urut - b.urut).map((x) => x.butir))
      d.anak.add(l.jalur)
    })
    // Dokumen yang tidak punya butir di lembar anak → daftar kosong (butir sengaja dihapus semua)
    docs.forEach((d) => { if (!d.anak.has(l.jalur) && ambil(d.data, l.jalur) === undefined) { taruh(d.data, l.jalur, []); d.anak.add(l.jalur) } })
  })
  return { docs, baru, galat, tercakup }
}

/**
 * Isi akhir dokumen: kolom yang ada di berkas mengikuti berkas (termasuk yang dikosongkan = dihapus);
 * kolom yang tidak ada di berkas (mis. ditambahkan setelah ekspor) dan kolom yang dilewati diambil dari dokumen lama.
 */
export function gabung(lama = {}, dariBerkas, lewati = [], tercakup = new Set()) {
  const hasil = {}
  Object.keys(lama).forEach((k) => { if (!tercakup.has(k)) hasil[k] = lama[k] })
  Object.assign(hasil, dariBerkas)
  // Sel kosong = kolom dihapus; tetapi nilai kosong lama ('' atau null) dibiarkan apa adanya
  tercakup.forEach((k) => {
    if (!(k in dariBerkas) && (lama[k] === '' || lama[k] === null)) hasil[k] = lama[k]
    // Lembar anak tanpa butir untuk dokumen ini: jangan menambah daftar kosong yang sebelumnya tidak ada
    if (Array.isArray(dariBerkas[k]) && !dariBerkas[k].length && !(k in lama)) delete hasil[k]
  })
  lewati.forEach((j) => { const v = ambil(lama, j); if (v !== undefined) taruh(hasil, j, v) })
  return hasil
}

/** Bentuk pembanding: tanpa kolom sistem, waktu → milidetik, kunci diurutkan, null/'' disamakan */
export function normal(v, sistem = []) {
  if (waktu(v)) return Math.round((v instanceof Date ? v : v.toDate()).getTime() / 1000) // Excel menyimpan sampai detik
  if (Array.isArray(v)) return v.map((x) => normal(x))
  if (objekBiasa(v)) {
    const o = {}
    Object.keys(v).sort().forEach((k) => { if (!sistem.includes(k)) { const x = normal(v[k]); if (!(x === null || x === undefined || x === '')) o[k] = x } })
    return o
  }
  return v === undefined || v === '' ? null : v
}
export const sama = (a, b, sistem) => JSON.stringify(normal(a, sistem)) === JSON.stringify(normal(b, sistem))
