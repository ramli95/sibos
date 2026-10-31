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

const RE_ABAIKAN = /^(halaman|page|tanggal\s+(transaksi|valuta)|tgl\b|no\.?\s*rek|nomor rekening|nama\s*:|periode|mata uang|cabang|alamat|keterangan|uraian\s+transaksi|dicetak|printed|no\s+tanggal|rekening koran)/i
// Awal blok uraian (Bank Sulselbar/CMS: "000004.1302.2288.0126|NAMA|...", "VA@...", "SPAN ...", "Payment MPN@...")
const RE_AWAL_BLOK = /^(\d{6}\.\d{4}\.\d{4}\.\d{4}\||VA@|SPAN\b|Payment\b|PEMBAYARAN\b|TRF\b|TRANSFER\b|SETOR\b|SETORAN\b|BUNGA\b|PAJAK\b|BIAYA ADM|ADM\b|INTEREST\b|TAX\b|KREDIT BUNGA|TARIK\b|PB\b|RTGS\b|SKN\b|BI-?FAST\b)/i
const RE_JAM = /^\s*\d{1,2}[.:]\d{2}(?:[.:]\d{2})?\b/

/**
 * baris: array teks per baris (gabungan semua halaman). tahun: bawaan bila tanggal tanpa tahun.
 * Hasil: { mutasi:[{no,tanggal,uraian,debit,kredit,saldo}], saldo_awal, saldo_akhir, bulan, peringatan:[] }
 */
export function uraiKoran(baris, tahun) {
  const mutasi = []
  const peringatan = []
  let saldoAwalTertulis = null
  let saldoAkhir = null
  let prev = null
  const potongan = [] // urutan teks uraian: { teks } atau { baris: indeks mutasi, teks }
  for (const mentah of baris) {
    const s = String(mentah || '').replace(/\s+/g, ' ').trim()
    if (!s) continue
    const uang = (s.match(RE_UANG) || []).map(uangKeAngka)
    if (/saldo\s*(awal|sebelumnya)|opening|beginning|saldo\s*lalu/i.test(s) && uang.length && !tanggalDari(s, tahun)) { if (saldoAwalTertulis == null) saldoAwalTertulis = uang.at(-1); continue }
    if (/saldo\s*akhir|closing|ending|saldo\s*penutup/i.test(s) && uang.length && !tanggalDari(s, tahun)) { saldoAkhir = uang.at(-1); continue }
    const tgl = tanggalDari(s, tahun)
    if (!tgl || !uang.length) {
      if (!uang.length && !RE_ABAIKAN.test(s) && s.length < 120 && !/^[A-Z]+ \d{4}$/.test(s) === false) potongan.push({ teks: s })
      else if (!uang.length && !RE_ABAIKAN.test(s) && s.length < 120) potongan.push({ teks: s })
      continue
    }
    let sisa = s.slice(tgl.panjang).replace(RE_JAM, '')
    const posUang = sisa.search(RE_UANG)
    let uraian = (posUang >= 0 ? sisa.slice(0, posUang) : sisa).trim()
    const arahM = sisa.match(RE_ARAH)
    const arah = arahM ? (/^(DB|DR|D|DEBET|DEBIT)$/i.test(arahM[1]) ? 'D' : 'K') : null
    uraian = uraian.replace(/\s+(DB|CR|D|K)$/i, '').trim()
    // angka sesudah uraian saja (bukan angka di dalam uraian)
    const angka = ((posUang >= 0 ? sisa.slice(posUang) : '').match(RE_UANG) || []).map(uangKeAngka)
    const u = angka.length ? angka : uang
    let debit = 0, kredit = 0, saldo = null
    if (u.length >= 3 && (u.at(-3) === 0) !== (u.at(-2) === 0)) {
      // kolom Debet | Kredit | Saldo (salah satu nol) — paling andal
      debit = Math.abs(u.at(-3)); kredit = Math.abs(u.at(-2)); saldo = u.at(-1)
      if (prev != null && prev + kredit - debit !== saldo) peringatan.push(`${tgl.iso}: saldo tertulis ${saldo.toLocaleString('id-ID')} tidak sama dengan saldo sebelumnya ± mutasi.`)
    } else if (u.length >= 2) {
      saldo = u.at(-1)
      const nilai = Math.abs(u.slice(0, -1).filter((x) => x !== 0).at(-1) ?? 0)
      if (prev != null && Math.abs(saldo - prev) === nilai) { if (saldo < prev) debit = nilai; else kredit = nilai }
      else if (arah) { if (arah === 'D') debit = nilai; else kredit = nilai }
      else if (prev != null) {
        const d = saldo - prev
        if (d < 0) debit = -d; else kredit = d
        peringatan.push(`${tgl.iso}: nilai mutasi tidak sama dengan perubahan saldo — diambil dari perubahan saldo (${Math.abs(d).toLocaleString('id-ID')}).`)
      } else { kredit = nilai; peringatan.push(`${tgl.iso}: arah mutasi tidak terbaca, dianggap kredit — periksa.`) }
    } else {
      const nilai = Math.abs(u[0])
      if (arah === 'D' || u[0] < 0) debit = nilai; else kredit = nilai
      if (!arah) peringatan.push(`${tgl.iso}: tanpa kolom saldo & penanda D/K — periksa arah mutasi.`)
      saldo = prev != null ? prev + kredit - debit : null
    }
    prev = saldo
    potongan.push({ baris: mutasi.length, teks: uraian })
    mutasi.push({ no: mutasi.length + 1, tanggal: tgl.iso, uraian, debit, kredit, saldo })
  }

  // Uraian: bila awal setiap uraian dikenali (pola bank), bagi teks menjadi blok berurutan → satu blok per mutasi.
  const blok = []
  potongan.forEach((x) => {
    if (!x.teks) return
    if (!blok.length || RE_AWAL_BLOK.test(x.teks)) blok.push([x.teks]); else blok.at(-1).push(x.teks)
  })
  if (blok.length === mutasi.length && mutasi.length) blok.forEach((b, i) => { mutasi[i].uraian = b.join(' ').replace(/\s+/g, ' ').trim() })
  else {
    // cadangan: uraian baris tanggal + baris lanjutan sesudahnya
    let aktif = -1
    potongan.forEach((x) => { if (x.baris != null) aktif = x.baris; else if (aktif >= 0) mutasi[aktif].uraian = `${mutasi[aktif].uraian} ${x.teks}`.trim() })
  }
  mutasi.forEach((m) => { if (!m.uraian) m.uraian = '(tanpa uraian)' })

  // Saldo awal: dihitung dari mutasi pertama; header dipakai hanya bila cocok
  const turunan = mutasi.length && mutasi[0].saldo != null ? mutasi[0].saldo - mutasi[0].kredit + mutasi[0].debit : null
  let saldoAwal = turunan ?? saldoAwalTertulis ?? 0
  if (saldoAwalTertulis != null && turunan != null && saldoAwalTertulis !== turunan) peringatan.push(`Saldo awal tertulis ${saldoAwalTertulis.toLocaleString('id-ID')}, tetapi dari mutasi pertama ${turunan.toLocaleString('id-ID')} — dipakai yang dari mutasi.`)
  if (saldoAkhir == null) saldoAkhir = mutasi.at(-1)?.saldo ?? saldoAwal
  const hitung = {}
  mutasi.forEach((m) => { const k = m.tanggal.slice(0, 7); hitung[k] = (hitung[k] || 0) + 1 })
  const bulan = Object.entries(hitung).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  const hitungAkhir = mutasi.reduce((t, m) => t + m.kredit - m.debit, saldoAwal)
  if (hitungAkhir !== saldoAkhir) peringatan.push(`Saldo awal + mutasi = ${hitungAkhir.toLocaleString('id-ID')}, tetapi saldo akhir tertulis ${saldoAkhir.toLocaleString('id-ID')}.`)
  return { mutasi, saldo_awal: saldoAwal, saldo_akhir: saldoAkhir, bulan, peringatan }
}

/** Pecah hasil impor per bulan (rekening koran beberapa bulan sekaligus) */
export function pecahPerBulan(hasil) {
  const per = new Map()
  let saldo = hasil.saldo_awal
  hasil.mutasi.forEach((m) => {
    const k = m.tanggal.slice(0, 7)
    if (!per.has(k)) per.set(k, { bulan: k, saldo_awal: saldo, mutasi: [] })
    per.get(k).mutasi.push({ ...m, no: per.get(k).mutasi.length + 1 })
    saldo = m.saldo ?? saldo + m.kredit - m.debit
    per.get(k).saldo_akhir = saldo
  })
  return [...per.values()]
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
