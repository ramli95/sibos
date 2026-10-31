// Asisten Pajak: menentukan pajak per transaksi dari tabel aturan (referensi/aturan_pajak).
// Aturan aktif disimpan di modul ini (pasangAturan) agar perhitungan belanja di mana pun memakai tarif terbaru.
//
// Ringkasan dasar hukum (rincian per baris ada di config/pajak.js):
//  • PPN: dipungut bendahara instansi pemerintah atas penyerahan PKP > Rp2 juta (PMK 59/2022), efektif 11% (PMK 131/2024).
//    Makanan/minuman restoran & jasa boga bukan objek PPN (objek pajak daerah).
//  • PPh 22: pembelian barang dengan Dana BOS dikecualikan (PMK 34/2017 jo. PMK 41/PMK.010/2022).
//  • PPh 23: sewa harta & jasa (PMK 141/2015) kepada badan; jasa oleh orang pribadi → PPh 21 bukan pegawai.
//  • PPh 21: PNS final PP 80/2010; pegawai/ tidak tetap TER; bukan pegawai 50% × Ps 17; peserta 100% × Ps 17 (PMK 168/2023).
//  • PPh 4(2): sewa tanah/bangunan, jasa konstruksi (final). Penyedia ber-Suket PP 55/2022: PPh final 0,5%.
import { ATURAN_PAJAK_AWAL, KATEGORI_TER, PASAL_17 } from '@/config/pajak'

let aktif = ATURAN_PAJAK_AWAL
export const salinAturan = (a) => JSON.parse(JSON.stringify(a))

/** Gabungkan aturan tersimpan dengan bawaan (baris baru di bawaan tetap muncul). Versi 1 (lama) diganti versi 2. */
export function rapikanAturan(a) {
  const awal = salinAturan(ATURAN_PAJAK_AWAL)
  if (!a || !a.ter_bulanan) return { ...awal, versi: Math.max(Number(a?.versi) || 0, awal.versi) } // skema lama (v1) → bawaan baru
  const tarif = awal.tarif.map((t) => ({ ...t, ...((a.tarif || []).find((x) => x.kunci === t.kunci) || {}), dasar: t.dasar }))
  ;(a.tarif || []).forEach((x) => { if (!tarif.some((t) => t.kunci === x.kunci)) tarif.push(x) })
  return { ...awal, ...a, batas: { ...awal.batas, ...(a.batas || {}) }, tarif, ter_bulanan: a.ter_bulanan || awal.ter_bulanan, pasal17: a.pasal17 || awal.pasal17 }
}
export function pasangAturan(a) { aktif = rapikanAturan(a) }
export const aturan = () => aktif
export const baris = (kunci, A = aktif) => A.tarif.find((t) => t.kunci === kunci && t.aktif !== false) || null

const kataKunci = (t) => String(t?.kata_kunci || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)
const cocok = (nama, t) => { const n = String(nama || '').toLowerCase(); return kataKunci(t).some((k) => n.includes(k)) }
const jumlah = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)
const rp = (n) => `Rp${Number(n).toLocaleString('id-ID')}`

/* ---------------- Tarif dasar PPh 21 ---------------- */

/** Pajak progresif Pasal 17 atas DPP (tanpa disetahunkan, sesuai PMK 168/2023 untuk bukan pegawai/peserta) */
export function pasal17(dpp, A = aktif) {
  const lapis = (A.pasal17 || PASAL_17).map((x) => ({ sampai: x.sampai == null ? Infinity : x.sampai, tarif: x.tarif }))
  let sisa = Math.max(0, dpp), bawah = 0, pajak = 0
  for (const l of lapis) {
    const lebar = Math.min(sisa, l.sampai - bawah)
    if (lebar <= 0) break
    pajak += lebar * l.tarif / 100
    sisa -= lebar
    bawah = l.sampai
  }
  return Math.floor(pajak)
}

/** Tarif TER bulanan (%) untuk bruto sebulan & status PTKP; null bila di atas tabel */
export function tarifTer(bruto, ptkp = 'TK/0', A = aktif) {
  const kat = KATEGORI_TER[ptkp] || 'A'
  const tabel = A.ter_bulanan?.[kat] || []
  const b = tabel.find((x) => bruto <= x.batas)
  return b ? b.tarif : null
}

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII']
export function golonganPns(gol) {
  const g = String(gol || '').toUpperCase().replace(/[^IVX/]/g, ' ').trim()
  if (/^IV/.test(g)) return 4
  if (/^III/.test(g)) return 3
  if (/^(I|II)\b/.test(g)) return 1
  return null
}
const asn = (p) => String(p.status_kepegawaian || '').toUpperCase()

/** Status PTKP dari data rahasia pegawai (status kawin & jumlah anak, maks. 3) */
export function ptkpDari(p) {
  if (p.ptkp) return p.ptkp
  const kawin = /^(k|kawin|menikah|nikah)/i.test(String(p.status_kawin || '').trim()) && !/belum/i.test(String(p.status_kawin || ''))
  const anak = Math.min(3, Number(p.anak) || 0)
  return `${kawin ? 'K' : 'TK'}/${anak}`
}

/** Kategori PPh 21 bawaan untuk seorang penerima pada jenis honor tertentu */
export function kategoriBawaan(p, jenisHonor) {
  if (jenisHonor === 'transpor') return 'bukan_objek'
  if (jenisHonor === 'uang_saku') return 'peserta_kegiatan'
  const st = asn(p)
  if (st === 'PNS' && golonganPns(p.golongan)) return 'pns_final'
  if (st === 'PNS') return 'pns_final'
  if (p.sumber === 'luar') return 'bukan_pegawai'
  if (st === 'PPPK') return 'pegawai_tetap'
  if (jenisHonor === 'honor_bulanan' || jenisHonor === 'honor') return 'tidak_tetap_bulanan'
  if (jenisHonor === 'narasumber') return 'bukan_pegawai'
  return 'tidak_tetap_harian'
}

/**
 * PPh 21 seorang penerima → { kategori, nilai, tarif (efektif %), alasan }
 * p.kategori_pph21 (pilihan manual) mengalahkan kategori bawaan.
 */
export function pph21Penerima(p, jenisHonor, bruto, A = aktif) {
  const kategori = p.kategori_pph21 || kategoriBawaan(p, jenisHonor)
  const npwp = !!(p.npwp || p.nik_npwp)
  const faktor = npwp ? 1 : (A.batas.faktor_tanpa_npwp_21 || 120) / 100
  const ptkp = ptkpDari(p)
  const hasil = (nilai, alasan) => ({ kategori, nilai: Math.round(nilai), tarif: bruto ? Math.round((nilai / bruto) * 10000) / 100 : 0, alasan })
  const tanpa = npwp ? '' : ' (tanpa NPWP/NIK valid: 120%)'

  if (!bruto) return hasil(0, 'Tanpa nilai')
  switch (kategori) {
    case 'bukan_objek': return hasil(0, 'Penggantian biaya transport/perjalanan — bukan objek PPh 21')
    case 'pns_final': {
      const g = golonganPns(p.golongan)
      const t = baris(g === 4 ? 'pph21_pns_gol4' : g === 3 ? 'pph21_pns_gol3' : 'pph21_pns_gol12', A)
      if (!g) return hasil(bruto * (baris('pph21_pns_gol3', A)?.tarif ?? 5) / 100, 'PNS tanpa golongan — dianggap gol. III, lengkapi golongan')
      return hasil(bruto * (t?.tarif ?? 0) / 100, `PNS gol. ${p.golongan}: final ${t?.tarif ?? 0}% (PP 80/2010)`)
    }
    case 'pegawai_tetap':
    case 'tidak_tetap_bulanan': {
      const gaji = Math.max(0, Number(p.gaji_bruto) || 0)
      const total = bruto + (kategori === 'pegawai_tetap' ? gaji : 0)
      const t = tarifTer(total, ptkp, A)
      if (t == null) return hasil(bruto * 0.05 * faktor, `Di atas tabel TER yang tersimpan — periksa manual`)
      let nilai = total * t / 100
      if (gaji) { const tg = tarifTer(gaji, ptkp, A) ?? t; nilai -= gaji * tg / 100 }
      return hasil(Math.max(0, nilai) * faktor, `TER kategori ${KATEGORI_TER[ptkp] || 'A'} (${ptkp}) ${t}% atas ${gaji ? 'gaji + honor' : 'bruto sebulan'} ${rp(total)}${tanpa}`)
    }
    case 'tidak_tetap_harian': {
      const hari = Math.max(1, Number(p.hari) || 1)
      const perHari = bruto / hari
      if (perHari <= A.batas.ter_harian_nol) return hasil(0, `Bruto sehari ${rp(Math.round(perHari))} ≤ ${rp(A.batas.ter_harian_nol)}: 0%`)
      if (perHari <= A.batas.ter_harian_atas) return hasil(bruto * (A.batas.tarif_ter_harian ?? 0.5) / 100 * faktor, `Bruto sehari ≤ ${rp(A.batas.ter_harian_atas)}: TER harian ${A.batas.tarif_ter_harian ?? 0.5}%${tanpa}`)
      return hasil(pasal17(bruto * 0.5, A) * faktor, `Bruto sehari > ${rp(A.batas.ter_harian_atas)}: 50% × Pasal 17${tanpa}`)
    }
    case 'peserta_kegiatan': {
      const t = baris('pph21_peserta', A)
      return hasil(pasal17(bruto * (t?.tarif ?? 100) / 100, A) * faktor, `Peserta kegiatan: ${t?.tarif ?? 100}% bruto × Pasal 17${tanpa}`)
    }
    case 'bukan_pegawai':
    default: {
      const t = baris('pph21_bukan_pegawai', A)
      return hasil(pasal17(bruto * (t?.tarif ?? 50) / 100, A) * faktor, `Bukan pegawai: ${t?.tarif ?? 50}% bruto × Pasal 17${tanpa}`)
    }
  }
}

/* ---------------- Pajak per transaksi ---------------- */

function butir(t, dasar, nilai, ket, extra = {}) {
  return { kunci: t.kunci, jenis: t.jenis, cara: t.cara, dasar: Math.round(dasar), tarif: extra.tarif ?? null, nilai: Math.round(nilai), kap: t.kap || '', kjs: t.kjs || '', ket, dasar_hukum: t.dasar || '' }
}
function persen(t, dasar, npwp, ket) {
  const tarif = npwp ? Number(t.tarif) : Number(t.tarif_tanpa_npwp ?? t.tarif)
  return butir(t, dasar, (dasar * tarif) / 100, ket, { tarif })
}

/**
 * Hasil: [{ kunci, jenis, cara, dasar, tarif, nilai, kap, kjs, ket, dasar_hukum }]
 * Harga dari penyedia PKP dianggap sudah termasuk PPN (DPP = harga × 100/111).
 * Item.jenis: barang | jasa | konsumsi | honor. Rekanan: bentuk_usaha, status_pkp, npwp, suket_umkm, jenis_usaha.
 */
export function hitungPajak(b, A = aktif) {
  if (b.jenis === 'honor') {
    const nilai = jumlah(b.penerima || [], (p) => p.pph21)
    if (!nilai) return []
    // dikelompokkan per perlakuan: final PNS (KJS 402) vs lainnya (KJS 100)
    const final = jumlah((b.penerima || []).filter((p) => p.kategori_pph21_hasil === 'pns_final'), (p) => p.pph21)
    const hasil = []
    if (final) hasil.push({ kunci: 'pph21_final', jenis: 'PPh 21', cara: 'potong', dasar: jumlah((b.penerima || []).filter((p) => p.kategori_pph21_hasil === 'pns_final' && p.pph21), (p) => p.bruto), tarif: null, nilai: final, kap: '411121', kjs: '402', ket: 'PPh 21 final PNS (PP 80/2010)', dasar_hukum: 'PP 80/2010' })
    if (nilai - final) hasil.push({ kunci: 'pph21', jenis: 'PPh 21', cara: 'potong', dasar: jumlah((b.penerima || []).filter((p) => p.kategori_pph21_hasil !== 'pns_final' && p.pph21), (p) => p.bruto), tarif: null, nilai: nilai - final, kap: '411121', kjs: '100', ket: 'PPh 21 dipotong dari penerima', dasar_hukum: 'PMK 168/2023' })
    return hasil
  }
  const item = b.item || []
  const r = b.rekanan || {}
  const pkp = !!r.status_pkp
  const npwp = !!r.npwp
  const badan = r.bentuk_usaha === 'badan'
  const umkm = !!r.suket_umkm && baris('pph_final_umkm', A)
  const restoran = r.jenis_usaha === 'rumah_makan'
  const tPpn = baris(b.cara === 'siplah' ? 'ppn_siplah' : 'ppn', A)
  const tarifPpn = tPpn ? Number(tPpn.tarif) : 11
  const dpp = (n) => (pkp ? Math.round((n * 100) / (100 + tarifPpn)) : n)
  const hasil = []

  if (b.cara === 'siplah') {
    const total = jumlah(item, (i) => i.jumlah)
    if (pkp && tPpn) hasil.push({ ...butir(tPpn, dpp(total), total - dpp(total), 'Dipungut & disetor mitra SIPLah', { tarif: tarifPpn }) })
    const t22 = baris('pph22_siplah', A)
    if (t22) hasil.push(persen(t22, dpp(total), true, 'Dipungut mitra SIPLah'))
    return hasil.filter((h) => h.nilai > 0)
  }

  const tSewa42 = baris('pph42_sewa', A)
  const tKons = baris('pph42_konstruksi', A)
  const tSewa23 = baris('pph23_sewa', A)
  const tJasa23 = baris('pph23_jasa', A)
  const t22 = baris('pph22', A)
  // Klasifikasi item
  const kel = { sewa42: [], konstruksi: [], sewa23: [], jasa: [], konsumsi: [], barang: [] }
  item.forEach((i) => {
    if (tSewa42 && cocok(i.nama, tSewa42)) kel.sewa42.push(i)
    else if (tKons && i.jenis === 'jasa' && cocok(i.nama, tKons)) kel.konstruksi.push(i)
    else if (tSewa23 && cocok(i.nama, tSewa23)) kel.sewa23.push(i)
    else if (i.jenis === 'jasa') kel.jasa.push(i)
    else if (i.jenis === 'konsumsi') kel.konsumsi.push(i)
    else kel.barang.push(i)
  })
  const n = Object.fromEntries(Object.entries(kel).map(([k, v]) => [k, jumlah(v, (i) => i.jumlah)]))

  // PPN: bukan untuk konsumsi (pajak daerah) & item yang dikecualikan kata kunci
  if (pkp && tPpn) {
    const kenaPpn = item.filter((i) => !kel.konsumsi.includes(i) && !cocok(i.nama, tPpn))
    const nilaiKena = jumlah(kenaPpn, (i) => i.jumlah)
    const dppKena = dpp(nilaiKena)
    if (dppKena > A.batas.ppn_instansi) hasil.push(butir(tPpn, dppKena, nilaiKena - dppKena, `PKP, pembayaran > ${rp(A.batas.ppn_instansi)} (PMK 59/2022)`, { tarif: tarifPpn }))
  }
  // PPh final UMKM menggantikan PPh 21 jasa OP / 22 / 23
  if (umkm) {
    const dasar = dpp(n.jasa + n.sewa23 + n.konsumsi * (restoran ? 0 : 1) + (t22 ? n.barang : 0))
    if (dasar > 0) hasil.push(persen(umkm, dasar, true, 'Penyedia ber-Suket PP 55/2022 — PPh final 0,5%'))
  } else {
    if (t22 && n.barang > A.batas.ppn_instansi) hasil.push(persen(t22, dpp(n.barang), npwp, 'Pembelian barang (sumber dana non-BOS)'))
    if (n.sewa23 && tSewa23) hasil.push(persen(tSewa23, dpp(n.sewa23), npwp, 'Sewa harta selain tanah/bangunan'))
    const jasaLain = n.jasa + (restoran ? 0 : n.konsumsi)
    if (jasaLain > 0) {
      const ketJasa = n.konsumsi && !restoran ? 'Jasa & katering/jasa boga' : 'Jasa'
      if (badan && tJasa23) hasil.push(persen(tJasa23, dpp(jasaLain), npwp, `${ketJasa} oleh badan usaha (PMK 141/2015)`))
      else if (!badan) {
        const t = baris('pph21_bukan_pegawai', A)
        if (t) {
          const dasar = dpp(jasaLain)
          const faktor = npwp ? 1 : (A.batas.faktor_tanpa_npwp_21 || 120) / 100
          const nilai = pasal17(dasar * (t.tarif ?? 50) / 100, A) * faktor
          hasil.push(butir(t, dasar, nilai, `${ketJasa} oleh orang pribadi — PPh 21 bukan pegawai (50% × Ps 17)`, { tarif: dasar ? Math.round((nilai / dasar) * 10000) / 100 : null }))
        }
      }
    }
  }
  if (n.sewa42 && tSewa42) hasil.push(persen(tSewa42, dpp(n.sewa42), true, 'Sewa tanah/bangunan (final)'))
  if (n.konstruksi && tKons) hasil.push(persen(tKons, dpp(n.konstruksi), true, 'Jasa konstruksi (final)'))
  return hasil.filter((h) => h.nilai > 0)
}

/** Catatan peringatan Asisten Pajak */
export function peringatanPajak(b, A = aktif) {
  const p = []
  if (b.jenis === 'honor') {
    ;(b.penerima || []).forEach((x) => {
      if (asn(x) === 'PNS' && !golonganPns(x.golongan)) p.push(`${x.nama}: golongan PNS belum diisi.`)
      if (x.kategori_pph21_hasil === 'pegawai_tetap' && !x.gaji_bruto) p.push(`${x.nama}: pegawai tetap (PPPK) — isi gaji bruto bulan ini agar TER dihitung atas gaji + honor, atau konfirmasi ke KPP.`)
    })
    return p
  }
  const r = b.rekanan || {}
  const total = jumlah(b.item || [], (i) => i.jumlah)
  if (b.cara !== 'siplah' && !r.status_pkp && total > A.batas.ppn_instansi && (b.item || []).some((i) => i.jenis !== 'konsumsi')) p.push(`Penyedia bukan PKP untuk belanja > ${rp(A.batas.ppn_instansi)} — PPN tidak dipungut; pastikan status PKP benar.`)
  if (!r.npwp && b.cara !== 'siplah') p.push('Penyedia belum ber-NPWP/NIK terdaftar: tarif PPh 23 +100%, PPh 21 +20%.')
  if ((b.item || []).some((i) => i.jenis === 'konsumsi') && !r.jenis_usaha) p.push('Konsumsi: tandai rekanan sebagai katering (PPh 23/21) atau rumah makan (pajak daerah) di data rekanan.')
  return p
}

/* ---------------- Kewajiban (dari belanja.pajak) ---------------- */

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '')
/** Id kewajiban deterministik: tidak berubah bila belanja disimpan ulang */
export const idPajak = (idBelanja, p) => `${idBelanja}_${slug(p.kunci || p.jenis)}`
/** Kewajiban yang tidak lewat rekening BOSP (SIPLah, atau ditanggung/disetor dari luar) */
export const luarBku = (p) => p.cara === 'mitra' || p.cara === 'luar'

/** Daftar kewajiban pajak tahun berjalan dari belanja Lunas + data setoran */
export function daftarKewajiban(belanja, setoran) {
  const peta = new Map()
  setoran.forEach((s) => (s.butir || []).forEach((x) => peta.set(x.id_pajak, { ...x, setoran: s })))
  const hasil = []
  belanja.forEach((b) => {
    if (b.status !== 'lunas') return
    ;(b.pajak || []).forEach((p) => {
      if (!p.nilai) return
      const id = idPajak(b.id, p)
      const st = peta.get(id)
      const cara = p.cara === 'luar' ? 'luar' : (p.cara === 'mitra' || (b.cara === 'siplah' && !p.cara)) ? 'mitra' : p.cara || (/PPN|PPh 22/.test(p.jenis) ? 'pungut' : 'potong')
      const mitra = cara === 'mitra'
      hasil.push({
        id, id_belanja: b.id, jenis: p.jenis, kunci: p.kunci || slug(p.jenis), cara,
        dasar: p.dasar || 0, tarif: p.tarif, nilai: p.nilai, kap: p.kap || '', kjs: p.kjs || '', ket: p.ket || '', dasar_hukum: p.dasar_hukum || '',
        tgl_pungut: b.tgl_lunas, bnu: Object.values(b.bnu || {})[0] || '', bnu_terima: p.bnu_terima || '',
        uraian: b.nama_pekerjaan, pihak: b.jenis === 'honor' ? `${(b.penerima || []).length} penerima` : b.rekanan?.nama_usaha || '',
        npwp: b.rekanan?.npwp || '', sumber: b.sumber || 'sibos',
        status: mitra || st ? 'disetor' : 'terutang',
        tgl_setor: mitra ? b.tgl_lunas : st?.setoran.tanggal || '', ntpn: st?.setoran.ntpn || '', kode_billing: st?.setoran.kode_billing || '',
        id_setoran: st?.setoran.id || null, bnu_setor: st?.setoran.bnu_jenis?.[p.jenis] || st?.setoran.bnu || '', no_bupot: st?.no_bupot || '',
      })
    })
  })
  return hasil.sort((a, b) => String(a.tgl_pungut).localeCompare(String(b.tgl_pungut)))
}

/** Tanggal jatuh tempo setor (PMK 81/2024): PPh tanggal 15 bulan berikutnya; PPN pungut akhir bulan berikutnya */
export function jatuhTempo(p) {
  const d = new Date(`${p.tgl_pungut}T00:00:00`)
  if (isNaN(d)) return ''
  const ppn = p.jenis === 'PPN'
  const t = ppn ? new Date(d.getFullYear(), d.getMonth() + 2, 0) : new Date(d.getFullYear(), d.getMonth() + 1, 15)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}
