// Pembaca rekening koran (PDF dari bank, atau Excel/CSV). Bank berbeda-beda tata letaknya, jadi pembacaan
// bertumpu pada pola umum: baris diawali tanggal, diakhiri angka uang; arah debit/kredit ditentukan dari
// perubahan saldo (paling andal), lalu penanda DB/CR/D/K bila kolom saldo tidak ada.

const BLN = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 }
const RE_TGL = /^\s*(?:\d{1,4}\s+)?(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/
const RE_TGL_KATA = /^\s*(?:\d{1,4}\s+)?(\d{1,2})[\s\-]([A-Za-z]{3})[a-z]*[\s\-](\d{2,4})\b/
const RE_UANG = /(?<![\d/])-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?(?![\d/])|(?<![\d/.,])-?\d+[.,]\d{2}(?![\d/])/g
const RE_ARAH = /\b(DB|DR|D|DEBET|DEBIT|CR|K|KR|KREDIT|CREDIT)\b\.?/i

/** "1.234.567,00" / "1,234,567.00" / "1.234.567" → 1234567 */
export function uangKeAngka(s) {
  let t = String(s).trim()
  const neg = t.startsWith('-')
  t = t.replace(/^-/, '')
  const m = t.match(/[.,](\d{1,2})$/)
  let desimal = 0
  if (m && (t.match(/[.,]/g) || []).length >= 1 && !/[.,]\d{3}$/.test(t)) { desimal = Number(`0.${m[1]}`); t = t.slice(0, -m[0].length) }
  const n = Number(t.replace(/[.,]/g, '')) + desimal
  return Math.round(neg ? -n : n)
}

function tanggalDari(baris, tahun) {
  let m = baris.match(RE_TGL)
  if (m) {
    let [, d, b, y] = m
    y = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : tahun
    if (Number(b) > 12) return null
    return { iso: `${y}-${String(b).padStart(2, '0')}-${String(d).padStart(2, '0')}`, panjang: m[0].length }
  }
  m = baris.match(RE_TGL_KATA)
  if (m && BLN[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return { iso: `${y}-${String(BLN[m[2].toLowerCase()]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`, panjang: m[0].length }
  }
  return null
}

const RE_ABAIKAN = /^(halaman|page|tanggal\s+(transaksi|valuta)|tgl\b|no\.?\s*rek|nomor rekening|periode|mata uang|cabang|alamat|keterangan|uraian\s+transaksi|dicetak|printed)/i

/**
 * baris: array teks per baris (gabungan semua halaman). tahun: bawaan bila tanggal tanpa tahun.
 * Hasil: { mutasi:[{no,tanggal,uraian,debit,kredit,saldo}], saldo_awal, saldo_akhir, bulan, peringatan:[] }
 */
export function uraiKoran(baris, tahun) {
  const mutasi = []
  const peringatan = []
  let saldoAwal = null
  let saldoAkhir = null
  let prev = null
  for (const mentah of baris) {
    const s = String(mentah || '').replace(/\s+/g, ' ').trim()
    if (!s) continue
    const uang = (s.match(RE_UANG) || []).map(uangKeAngka)
    if (/saldo\s*(awal|sebelumnya)|opening|beginning|saldo\s*lalu/i.test(s) && uang.length) { if (saldoAwal == null) { saldoAwal = uang.at(-1); prev = saldoAwal } continue }
    if (/saldo\s*akhir|closing|ending|saldo\s*penutup/i.test(s) && uang.length) { saldoAkhir = uang.at(-1); continue }
    const tgl = tanggalDari(s, tahun)
    if (!tgl || !uang.length) {
      // lanjutan uraian baris sebelumnya
      if (mutasi.length && !uang.length && !RE_ABAIKAN.test(s) && s.length < 90) mutasi.at(-1).uraian = `${mutasi.at(-1).uraian} ${s}`.trim()
      continue
    }
    const sisa = s.slice(tgl.panjang)
    const posUang = sisa.search(RE_UANG)
    let uraian = (posUang >= 0 ? sisa.slice(0, posUang) : sisa).replace(RE_TGL, '').trim()
    const arahM = sisa.match(RE_ARAH)
    const arah = arahM ? (/^(DB|DR|D|DEBET|DEBIT)$/i.test(arahM[1]) ? 'D' : 'K') : null
    uraian = uraian.replace(/\s+(DB|CR|D|K)$/i, '').trim()
    let debit = 0, kredit = 0, saldo = null
    if (uang.length >= 2) {
      saldo = uang.at(-1)
      // tiga angka: debit kredit saldo (salah satu 0) — atau mutasi saldo
      const kandidat = uang.slice(0, -1).filter((x) => x !== 0)
      const nilai = Math.abs(kandidat.at(-1) ?? 0)
      if (prev != null && Math.abs(saldo - prev) === nilai) { if (saldo < prev) debit = nilai; else kredit = nilai }
      else if (prev != null && kandidat.length >= 1 && Math.abs(saldo - prev) !== nilai) {
        const d = saldo - prev
        if (d < 0) debit = -d; else kredit = d
        peringatan.push(`${tgl.iso}: nilai mutasi tidak sama dengan perubahan saldo — diambil dari perubahan saldo (${Math.abs(d).toLocaleString('id-ID')}).`)
      } else if (arah) { if (arah === 'D') debit = nilai; else kredit = nilai }
      else if (uang.length >= 3 && uang.at(-3) && !uang.at(-2)) debit = Math.abs(uang.at(-3))
      else if (uang.length >= 3 && !uang.at(-3) && uang.at(-2)) kredit = Math.abs(uang.at(-2))
      else { kredit = nilai; peringatan.push(`${tgl.iso}: arah mutasi tidak terbaca, dianggap kredit — periksa.`) }
      if (saldoAwal == null && mutasi.length === 0) saldoAwal = saldo - kredit + debit
    } else {
      const nilai = Math.abs(uang[0])
      if (arah === 'D' || uang[0] < 0) debit = nilai; else kredit = nilai
      if (!arah) peringatan.push(`${tgl.iso}: tanpa kolom saldo & penanda D/K — periksa arah mutasi.`)
      saldo = prev != null ? prev + kredit - debit : null
    }
    prev = saldo
    mutasi.push({ no: mutasi.length + 1, tanggal: tgl.iso, uraian: uraian || '(tanpa uraian)', debit, kredit, saldo })
  }
  if (saldoAkhir == null) saldoAkhir = mutasi.at(-1)?.saldo ?? saldoAwal
  // bulan terbanyak
  const hitung = {}
  mutasi.forEach((m) => { const k = m.tanggal.slice(0, 7); hitung[k] = (hitung[k] || 0) + 1 })
  const bulan = Object.entries(hitung).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  // pemeriksaan rantai saldo
  if (saldoAwal != null && saldoAkhir != null) {
    const hitungAkhir = mutasi.reduce((s, m) => s + m.kredit - m.debit, saldoAwal)
    if (hitungAkhir !== saldoAkhir) peringatan.push(`Saldo awal + mutasi = ${hitungAkhir.toLocaleString('id-ID')}, tetapi saldo akhir tertulis ${saldoAkhir.toLocaleString('id-ID')}.`)
  }
  return { mutasi, saldo_awal: saldoAwal ?? 0, saldo_akhir: saldoAkhir ?? 0, bulan, peringatan }
}

/** Berkas → array baris teks */
export async function bacaBerkasKoran(file) {
  if (/\.pdf$/i.test(file.name)) {
    const { bacaTeksPdf } = await import('./bacaPdf')
    const { halaman } = await bacaTeksPdf(file)
    return halaman.flatMap((h) => h.split('\n'))
  }
  const { bacaBerkas } = await import('./excel')
  const lembar = await bacaBerkas(file)
  return lembar.flatMap((l) => l.baris.map((r) => r.map((c) => (c instanceof Date ? `${c.getDate()}/${c.getMonth() + 1}/${c.getFullYear()}` : typeof c === 'number' ? (Number.isInteger(c) && Math.abs(c) < 10000 ? String(c) : c.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : String(c ?? ''))).join(' ')))
}
