// Bahan bersama dokumen SPJ: nama sekolah, pejabat penanda tangan per tanggal dokumen, penyedia.
import { pejabatPada } from '@/services/pejabat'
import { keIso } from './format'

const SINGKATAN = ['UPT', 'SPF', 'SMP', 'SD', 'SMA', 'SMK', 'SN', 'MTS', 'CV', 'PT', 'UD']
/** "UPT SPF SMP NEGERI 19 MAKASSAR" → "UPT SPF SMP Negeri 19 Makassar" */
export function hurufJudul(s) {
  return String(s || '').toLowerCase().split(/\s+/).map((k) => (SINGKATAN.includes(k.toUpperCase()) ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1))).join(' ')
}

export const namaOrang = (p) => (p ? [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? `, ${p.gelar}` : '') : '')

const LABEL = { kepala_sekolah: 'Kepala Sekolah', bendahara_bosp: 'Bendahara BOSP', ketua_komite: 'Ketua Komite', pengurus_barang: 'Pengurus Barang' }

/**
 * Konteks dokumen untuk satu transaksi.
 * bahan: { profil, pejabat, cetak }
 */
export function konteks(b, bahan) {
  const profil = bahan.profil || {}
  const sekolah = {
    nama: profil.nama_dokumen || hurufJudul(profil.nama_arkas || 'UPT SPF SMP Negeri 19 Makassar'),
    alamat: profil.alamat || '', telepon: profil.telepon || '', npwp: profil.npwp || '', kota: 'Makassar',
  }
  const pakaiGambar = bahan.cetak?.tanda_tangan === 'gambar'
  const pj = (jabatan, tgl) => {
    const p = pejabatPada(bahan.pejabat || [], jabatan, tgl || keIso())
    return { jabatan: jabatanPanjang(jabatan, sekolah), nama: namaOrang(p), nip: p?.nip || '', pangkat: p?.pangkat || '', ttd: pakaiGambar ? p?.tanda_tangan : null, ada: !!p }
  }
  const r = b.rekanan || {}
  const penyedia = {
    jabatan: `${r.jabatan_pemilik || 'Pemilik'} ${r.nama_usaha || ''}`.trim(), nama: r.pemilik || r.nama_usaha || '', usaha: r.nama_usaha || '',
    alamat: r.alamat || '', telepon: r.telepon || (r.no_wa ? '+' + r.no_wa : ''), npwp: r.npwp || '',
  }
  const pemeriksa = b.pemeriksa ? { jabatan: b.pemeriksa.jabatan || 'Pemeriksa Barang', nama: namaOrang(b.pemeriksa), nip: b.pemeriksa.nip || '' } : null
  return {
    sekolah, penyedia, pemeriksa, pakaiGambar, kodeSampul: bahan.cetak?.kode_sampul || 'rekening',
    ks: (t) => pj('kepala_sekolah', t),
    bendahara: (t) => pj('bendahara_bosp', t),
    komite: (t) => pj('ketua_komite', t),
    pengurusBarang: (t) => pj('pengurus_barang', t),
    pelaksana: (t) => pj(b.pelaksana || 'kepala_sekolah', t),
    pemeriksaPada: (t) => pemeriksa || { ...pj('pengurus_barang', t), jabatan: 'Pemeriksa Barang' },
    tempatTanggal: (tgl, f) => `${sekolah.kota}, ${f(tgl)}`,
  }
}

function jabatanPanjang(jabatan, sekolah) {
  if (jabatan === 'kepala_sekolah') return `Kepala ${sekolah.nama}`
  return LABEL[jabatan] || jabatan
}
