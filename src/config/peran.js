// Lima peran SIBOS. Satu pengguna boleh memiliki lebih dari satu peran.
export const PERAN = {
  bendahara: { label: 'Bendahara (Admin)', singkat: 'Bendahara', warna: 'bg-biru/10 text-biru dark:bg-biru/20 dark:text-blue-300', ikon: 'ShieldCheck' },
  tim_bos: { label: 'Tim BOS', singkat: 'Tim BOS', warna: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', ikon: 'UsersRound' },
  kepala_sekolah: { label: 'Kepala Sekolah', singkat: 'Kepsek', warna: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', ikon: 'Stamp' },
  komite: { label: 'Komite', singkat: 'Komite', warna: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', ikon: 'Handshake' },
  pengurus_barang: { label: 'Pengurus Barang', singkat: 'Pengurus Barang', warna: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', ikon: 'PackageCheck' },
}

export const SEMUA_PERAN = Object.keys(PERAN)
