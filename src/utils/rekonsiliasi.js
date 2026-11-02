// Rekonsiliasi bulanan (Fase 8): saldo SIBOS (BKU) dibandingkan dengan saldo ARKAS, SIMAKDA, dan rekening koran,
// serta status input setiap transaksi lunas ke ARKAS & SIMAKDA. Modul murni.
import { ringkasanBulan } from './bku'
import { akhirBulanIso } from './laporan'

export const idBulan = (tahun, bulan) => `${tahun}-${String(bulan + 1).padStart(2, '0')}`

/** Transaksi lunas pada bulan (0–11) beserta status input */
export function transaksiBulan(belanja = [], tahun, bulan) {
  const id = idBulan(tahun, bulan)
  return belanja
    .filter((b) => b.status === 'lunas' && String(b.tgl_lunas || '').startsWith(id))
    .sort((a, b) => String(a.tgl_lunas).localeCompare(String(b.tgl_lunas)))
}

/**
 * Satu bulan: { id, saldo:{ bku, bank, tunai }, koran, arkas, simakda, selisih:{ arkas, simakda, koran }, cocok,
 *               transaksi, belumArkas, belumSimakda, status: 'cocok'|'selisih'|'belum' }
 * rekon = dokumen rekonsiliasi/{yyyy-mm} { saldo_arkas, saldo_simakda, catatan }
 */
export function rekonBulan({ baris = [], belanja = [], koran = [], rekon = null, tahun, bulan }) {
  const id = idBulan(tahun, bulan)
  const rb = ringkasanBulan(baris, bulan, tahun)
  const k = koran.find((x) => x.id === id || x.bulan === id) || null
  const ada = (v) => v !== '' && v != null && !Number.isNaN(Number(v))
  const arkas = ada(rekon?.saldo_arkas) ? Number(rekon.saldo_arkas) : null
  const simakda = ada(rekon?.saldo_simakda) ? Number(rekon.saldo_simakda) : null
  const saldoKoran = k ? Number(k.saldo_akhir) || 0 : null
  const selisih = {
    arkas: arkas == null ? null : arkas - rb.saldo_akhir,
    simakda: simakda == null ? null : simakda - rb.saldo_akhir,
    koran: saldoKoran == null ? null : saldoKoran - rb.saldo_bank,
  }
  const trx = transaksiBulan(belanja, tahun, bulan)
  const belumArkas = trx.filter((b) => !b.input_arkas).length
  const belumSimakda = trx.filter((b) => !b.input_simakda).length
  const nilaiAda = Object.values(selisih).filter((v) => v != null)
  const cocok = nilaiAda.length > 0 && nilaiAda.every((v) => v === 0) && !belumArkas && !belumSimakda
  return {
    id, tanggal: akhirBulanIso(tahun, bulan), saldo: { bku: rb.saldo_akhir, bank: rb.saldo_bank, tunai: rb.saldo_tunai }, ada_mutasi: rb.jumlah_baris > 0,
    koran: saldoKoran, arkas, simakda, selisih, transaksi: trx, belumArkas, belumSimakda, cocok,
    status: cocok ? 'cocok' : nilaiAda.some((v) => v !== 0) || (trx.length && (belumArkas || belumSimakda)) ? 'selisih' : 'belum',
  }
}
