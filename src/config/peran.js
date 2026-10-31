// Lima peran SIBOS. Satu pengguna boleh memiliki lebih dari satu peran.
export const PERAN = {
  bendahara: { label: 'Bendahara (Admin)', singkat: 'Bendahara', warna: 'bg-biru/10 text-biru dark:bg-biru/20 dark:text-blue-300', ikon: 'ShieldCheck' },
  tim_bos: { label: 'Tim BOS', singkat: 'Tim BOS', warna: 'bg-tosca/10 text-teal-700 dark:bg-tosca/20 dark:text-teal-300', ikon: 'UsersRound' },
  kepala_sekolah: { label: 'Kepala Sekolah', singkat: 'Kepsek', warna: 'bg-ungu/10 text-violet-700 dark:bg-ungu/20 dark:text-violet-300', ikon: 'Stamp' },
  komite: { label: 'Komite', singkat: 'Komite', warna: 'bg-kuning/15 text-amber-700 dark:bg-kuning/20 dark:text-amber-300', ikon: 'Handshake' },
  pengurus_barang: { label: 'Pengurus Barang', singkat: 'Pengurus Barang', warna: 'bg-merah/10 text-rose-700 dark:bg-merah/20 dark:text-rose-300', ikon: 'PackageCheck' },
}

export const SEMUA_PERAN = Object.keys(PERAN)
