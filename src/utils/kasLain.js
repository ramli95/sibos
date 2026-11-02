// Kas Lain & Iuran (di luar Dana BOSP): pos kas (Arisan, Dana Sosial, Zakat Profesi, Potongan Sertifikasi,
// Komite, …), tagihan per orang dan setorannya, serta utang–piutang. Fungsi murni untuk hitung & label.
import { NAMA_BULAN, rupiah, tanggalPendek, romawi } from './format'

export const JENIS_POS = {
  iuran: { label: 'Iuran rutin', ikon: 'Repeat' },
  sosial: { label: 'Dana sosial', ikon: 'HandHeart' },
  potongan: { label: 'Potongan gaji/tunjangan', ikon: 'BadgeDollarSign' },
  titipan: { label: 'Dana titipan', ikon: 'Vault' },
  lainnya: { label: 'Lainnya', ikon: 'WalletCards' },
}

// Warna pos: kelas chip + warna garis (bergiliran biru–tosca–kuning ARKAS, ditambah ungu & merah muda)
export const WARNA_POS = {
  biru: { chip: 'bg-blue-100 text-[#1A62E8] dark:bg-blue-900/40 dark:text-blue-300', garis: '#1A62E8' },
  tosca: { chip: 'bg-teal-100 text-[#167A6B] dark:bg-teal-900/40 dark:text-teal-300', garis: '#22A08D' },
  kuning: { chip: 'bg-amber-100 text-[#9A6B00] dark:bg-amber-900/40 dark:text-amber-300', garis: '#E3A414' },
  ungu: { chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', garis: '#7C5CFA' },
  rose: { chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', garis: '#E11D48' },
  hijau: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', garis: '#059669' },
}

export const IKON_POS = ['Gift', 'HandHeart', 'HandHelping', 'BadgeDollarSign', 'Users', 'Vault', 'PiggyBank', 'Coins', 'WalletCards', 'Landmark', 'HeartHandshake', 'Banknote']

export const POS_BAWAAN = [
  { nama: 'Uang Arisan', jenis: 'iuran', ikon: 'Gift', warna: 'kuning', periode: 'bulanan', nominal: 100000, ket: 'Arisan bulanan pegawai.' },
  { nama: 'Dana Sosial', jenis: 'sosial', ikon: 'HandHeart', warna: 'rose', periode: 'bulanan', nominal: 20000, ket: 'Duka, sakit, pernikahan, kelahiran, dan kegiatan sosial lain.' },
  { nama: 'Zakat Profesi', jenis: 'potongan', ikon: 'HandHelping', warna: 'hijau', periode: 'bulanan', nominal: 0, ket: '2,5% dari penghasilan; disalurkan ke BAZNAS/UPZ.' },
  { nama: 'Potongan Sertifikasi', jenis: 'potongan', ikon: 'BadgeDollarSign', warna: 'biru', periode: 'sekali', nominal: 0, ket: 'Potongan dari Tunjangan Profesi Guru sesuai kesepakatan.' },
  { nama: 'Komite', jenis: 'titipan', ikon: 'Users', warna: 'tosca', periode: 'sekali', nominal: 0, ket: 'Dana komite yang dititipkan/dicatat bendahara.' },
]

export const CARA_BAYAR = { tunai: 'Tunai', transfer: 'Transfer', potong: 'Potong gaji/tunjangan' }

export const idAcak = () => Math.random().toString(36).slice(2, 10)
export const jumlah = (arr, k = 'nilai') => (arr || []).reduce((s, x) => s + (Number(x[k]) || 0), 0)

/** Label periode: '2026-11' → 'November 2026'; teks lain apa adanya */
export function labelPeriode(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(p || ''))
  return m ? `${NAMA_BULAN[Number(m[2]) - 1]} ${m[1]}` : String(p || '')
}

/** Ringkasan satu tagihan: dibayar, sisa, status */
export function hitungTagihan(t) {
  const dibayar = jumlah(t.setoran)
  const nominal = Number(t.nominal) || 0
  const sisa = Math.max(0, nominal - dibayar)
  const status = nominal > 0 && sisa === 0 ? 'lunas' : dibayar > 0 ? 'sebagian' : 'belum'
  const lewat = status !== 'lunas' && t.jatuh_tempo && t.jatuh_tempo < new Date().toISOString().slice(0, 10)
  return { ...t, dibayar, sisa, status, lewat }
}

/** Ringkasan satu utang/piutang */
export function hitungUtang(u) {
  const dibayar = jumlah(u.bayar)
  const nilai = Number(u.nilai) || 0
  const sisa = Math.max(0, nilai - dibayar)
  const status = sisa === 0 ? 'lunas' : dibayar > 0 ? 'sebagian' : 'belum'
  const lewat = status !== 'lunas' && u.jatuh_tempo && u.jatuh_tempo < new Date().toISOString().slice(0, 10)
  return { ...u, dibayar, sisa, status, lewat }
}

export const STATUS = {
  lunas: { label: 'Lunas', kelas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', ikon: 'CheckCheck' },
  sebagian: { label: 'Sebagian', kelas: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', ikon: 'Hourglass' },
  belum: { label: 'Belum bayar', kelas: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', ikon: 'CircleAlert' },
}

/** Saldo pos per tanggal (inklusif). transaksi = semua baris kas_lain_transaksi */
export function saldoPos(pos, transaksi, sampai = '9999-12-31') {
  let s = Number(pos.saldo_awal) || 0
  for (const t of transaksi) if (t.pos_id === pos.id && String(t.tanggal) <= sampai) s += (t.jenis === 'masuk' ? 1 : -1) * (Number(t.nilai) || 0)
  return s
}

/** Buku satu pos untuk rentang [dari, sampai]: saldo awal, baris dengan saldo berjalan, total */
export function bukuPos(pos, transaksi, dari, sampai) {
  const milik = transaksi.filter((t) => t.pos_id === pos.id)
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.dibuat || '').localeCompare(String(b.dibuat || '')))
  let saldo = (Number(pos.saldo_awal) || 0) + milik.filter((t) => t.tanggal < dari).reduce((s, t) => s + (t.jenis === 'masuk' ? 1 : -1) * (Number(t.nilai) || 0), 0)
  const awal = saldo
  const baris = milik.filter((t) => t.tanggal >= dari && t.tanggal <= sampai).map((t) => {
    const masuk = t.jenis === 'masuk' ? Number(t.nilai) || 0 : 0
    const keluar = t.jenis === 'keluar' ? Number(t.nilai) || 0 : 0
    saldo += masuk - keluar
    return { ...t, masuk, keluar, saldo }
  })
  return { awal, baris, masuk: jumlah(baris, 'masuk'), keluar: jumlah(baris, 'keluar'), akhir: saldo }
}

/** Nomor kwitansi berikutnya: KS-0007/XI/2026 (urut per tahun dari semua setoran & pembayaran utang) */
export function nomorKwitansi(tagihan, utang, tanggal) {
  const th = String(tanggal).slice(0, 4)
  const semua = [...tagihan.flatMap((t) => t.setoran || []), ...utang.flatMap((u) => u.bayar || [])].filter((s) => String(s.tanggal).startsWith(th))
  const maks = semua.reduce((m, s) => Math.max(m, Number(/KS-(\d+)/.exec(s.no_kwitansi || '')?.[1]) || 0), 0)
  return `KS-${String(Math.max(maks, semua.length) + 1).padStart(4, '0')}/${romawi(Number(String(tanggal).slice(5, 7)))}/${th}`
}

/** Teks rincian tagihan belum lunas untuk pesan WA */
export const rincianWa = (daftar, namaPos) => daftar.map((t, i) => `${i + 1}. ${namaPos(t.pos_id)} ${labelPeriode(t.periode)}: ${rupiah(t.sisa)}${t.jatuh_tempo ? ` (tempo ${tanggalPendek(t.jatuh_tempo)})` : ''}`).join('\n')

/** Rentang tanggal dari pilihan laporan */
export function rentang(jenis, tahun, bulan) {
  if (jenis === 'bulan') {
    const b = String(bulan).padStart(2, '0')
    const akhir = new Date(Number(tahun), Number(bulan), 0).getDate()
    return { dari: `${tahun}-${b}-01`, sampai: `${tahun}-${b}-${akhir}`, judul: `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}` }
  }
  return { dari: `${tahun}-01-01`, sampai: `${tahun}-12-31`, judul: `Tahun ${tahun}` }
}
