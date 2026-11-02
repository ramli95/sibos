// Pusat Pengingat (Fase 8): daftar hal yang perlu ditindaklanjuti Bendahara, dihitung dari data SIBOS.
// Dipakai kartu "Perlu perhatian" di Dasbor dan notifikasi lonceng harian. Modul murni.
import { jatuhTempo, luarBku } from './pajak'
import { daftarTenggat } from './laporan'
import { tanggalPanjang, rupiah, NAMA_BULAN } from './format'
import { kunciUraian } from './belanja'

const hari = (a, b) => Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Hasil: [{ kunci, nada: 'bahaya'|'peringatan'|'info', ikon, judul, isi, ke }] urut dari yang paling mendesak.
 * opsi: { belanja, kewajiban, tutup (tutup_buku), uraian (RKAS berlaku), pemakaian (Map kunciUraian → { komitmen, bulan[] }), tahun, hariIni }
 */
export function daftarPengingat({ belanja = [], kewajiban = [], tutup = [], uraian = [], pemakaian = new Map(), tahun, hariIni = new Date() }) {
  const kini = iso(hariIni)
  const out = []

  // 1. Pajak terutang: lewat jatuh tempo / ≤ 5 hari lagi
  const terutang = kewajiban.filter((p) => p.status === 'terutang' && !luarBku(p))
  const lewat = terutang.filter((p) => jatuhTempo(p) && jatuhTempo(p) < kini)
  const dekat = terutang.filter((p) => jatuhTempo(p) && jatuhTempo(p) >= kini && hari(jatuhTempo(p), kini) <= 5)
  if (lewat.length) out.push({ kunci: 'pajak-lewat', nada: 'bahaya', ikon: 'ReceiptText', judul: `${lewat.length} pajak lewat jatuh tempo setor`, isi: `${rupiah(lewat.reduce((s, p) => s + p.nilai, 0))} — segera buat billing & setor.`, ke: '/pajak/terutang' })
  if (dekat.length) out.push({ kunci: 'pajak-dekat', nada: 'peringatan', ikon: 'CalendarClock', judul: `${dekat.length} pajak jatuh tempo ≤ 5 hari`, isi: `${rupiah(dekat.reduce((s, p) => s + p.nilai, 0))} · paling cepat ${tanggalPanjang(dekat.map(jatuhTempo).sort()[0])}.`, ke: '/pajak/terutang' })

  // 2. Tenggat laporan ≤ 7 hari
  daftarTenggat(tahun, hariIni).filter((t) => t.sisa >= 0 && t.sisa <= 7).forEach((t) => out.push({
    kunci: `tenggat-${t.kunci}`, nada: t.sisa <= 2 ? 'bahaya' : 'peringatan', ikon: 'CalendarClock', judul: `${t.judul} — ${t.sisa === 0 ? 'hari ini' : `${t.sisa} hari lagi`}`,
    isi: `Batas ${tanggalPanjang(t.tanggal)}.`, ke: t.jenis === 'bulanan' ? '/laporan/pemda' : '/laporan/tahunan',
  }))

  // 3. Buku bulan lalu belum ditutup (tahun berjalan, sampai 3 bulan ke belakang)
  if (Number(tahun) === hariIni.getFullYear()) {
    for (let m = Math.max(0, hariIni.getMonth() - 3); m < hariIni.getMonth(); m++) {
      const id = `${tahun}-${String(m + 1).padStart(2, '0')}`
      if (!tutup.some((t) => t.id === id && t.status === 'ditutup')) out.push({ kunci: `tutup-${id}`, nada: 'peringatan', ikon: 'CalendarCheck', judul: `Buku ${NAMA_BULAN[m]} belum ditutup`, isi: 'Tutup BKU & buku pembantu sebelum menyusun laporan bulanan.', ke: '/buku-kas/tutup' })
    }
  }

  // 4. Belum diinput ke ARKAS / SIMAKDA (lunas sebelum bulan ini)
  const awalBulan = `${iso(hariIni).slice(0, 7)}-01`
  const lama = belanja.filter((b) => b.status === 'lunas' && b.tgl_lunas && b.tgl_lunas < awalBulan)
  const bA = lama.filter((b) => !b.input_arkas).length
  const bS = lama.filter((b) => !b.input_simakda).length
  if (bA || bS) out.push({ kunci: 'input', nada: 'peringatan', ikon: 'GitCompareArrows', judul: 'Transaksi belum ditandai masuk ARKAS/SIMAKDA', isi: `Belum ARKAS ${bA} · belum SIMAKDA ${bS} (lunas sebelum bulan ini).`, ke: '/laporan/rekonsiliasi' })

  // 5. Uraian RKAS terlampaui
  const lebih = uraian.filter((u) => (pemakaian.get(kunciUraian(u))?.komitmen || 0) > (u.jumlah || 0) + 1)
  if (lebih.length) out.push({ kunci: 'lampaui', nada: 'bahaya', ikon: 'TriangleAlert', judul: `${lebih.length} uraian RKAS terlampaui`, isi: 'Belanja melebihi pagu uraian — lakukan pergeseran di ARKAS.', ke: '/rkas/pergeseran' })

  // 6. SPJ belum lengkap
  const kurang = belanja.filter((b) => b.status === 'lunas' && (b.persen_lengkap ?? 100) < 100).length
  if (kurang) out.push({ kunci: 'spj', nada: 'info', ikon: 'ListChecks', judul: `${kurang} SPJ belum lengkap`, isi: 'Unggah paket bertanda tangan, nota asli, atau foto.', ke: '/belanja/arsip' })

  // 7. Rencana RKAS bulan ini yang belum dibelanjakan
  if (Number(tahun) === hariIni.getFullYear()) {
    const m = hariIni.getMonth()
    const rencana = uraian.filter((u) => (u.bulan?.[m] || 0) > 0)
    const belum = rencana.filter((u) => !(pemakaian.get(kunciUraian(u))?.bulanKomitmen?.[m] > 0))
    if (belum.length) out.push({ kunci: `rencana-${m}`, nada: 'info', ikon: 'CalendarDays', judul: `${belum.length} rencana belanja ${NAMA_BULAN[m]} belum dilaksanakan`, isi: `Senilai ${rupiah(belum.reduce((s, u) => s + (u.bulan[m] || 0), 0))} menurut RKAS per bulan.`, ke: '/rkas/per-bulan' })
  }

  const urut = { bahaya: 0, peringatan: 1, info: 2 }
  return out.sort((a, b) => urut[a.nada] - urut[b.nada])
}
