// Bahan formulir & dokumen belanja: rekanan, pegawai, standar harga, pejabat, orang luar, profil sekolah.
// Dimuat sekali per sesi (bisa disegarkan); Mode Pratinjau memakai data contoh.
import { modePratinjau } from './firebase'
import { muatRekanan, muatPegawai } from './master'
import { muatStandarHarga } from './rkas'
import { muatPejabat } from './pejabat'
import { muatProfilSekolah } from './cetak'
import { muatOrangLuar, muatPolaNomor } from './belanja'
import { PEJABAT_AWAL } from '@/config/sekolahAwal'

let cache = null
export async function muatBahan({ segar = false, rahasia = false } = {}) {
  if (cache && !segar) return cache
  if (modePratinjau) {
    const c = await import('./contohBelanja')
    cache = {
      rekanan: c.REKANAN, pegawai: c.PEGAWAI, harga: await muatStandarHarga(), orangLuar: c.orangLuar,
      pejabat: [...PEJABAT_AWAL, { jabatan: 'pengurus_barang', nama: 'Contoh Pengurus Barang', gelar: 'S.E.', nip: '198702142019022001', mulai: null, sampai: null },
        { jabatan: 'ketua_komite', nama: 'Ismail', gelar: '', nip: '', mulai: null, sampai: null }],
      profil: await muatProfilSekolah(), pola: await muatPolaNomor(),
    }
    return cache
  }
  const aman = (p, awal) => p.catch(() => awal)
  const [rekanan, pegawai, harga, pejabat, orangLuar, profil, pola] = await Promise.all([
    aman(muatRekanan(), []), aman(muatPegawai({ denganRahasia: rahasia }), []), aman(muatStandarHarga(), []), aman(muatPejabat(), []),
    aman(muatOrangLuar(), []), muatProfilSekolah(), muatPolaNomor(),
  ])
  cache = { rekanan, pegawai, harga, pejabat, orangLuar, profil, pola }
  return cache
}
export const lupakanBahan = () => { cache = null }

export const namaGelar = (p) => (p ? [p.gelar_depan, p.nama].filter(Boolean).join(' ') + (p.gelar ? `, ${p.gelar}` : '') : '')
