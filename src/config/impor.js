// Definisi kolom impor: nama di SIBOS, judul templat, sinonim judul kolom yang dikenali otomatis,
// dan cara menormalkan nilainya.
import {
  hanyaAngka, normalTanggal, normalJk, normalStatus, normalBool, normalGolongan, normalWa, formatNpwp,
  normalBentukUsaha, periksaNip, periksaNik, periksaNpwp, PANGKAT_PNS, pisahGelar,
} from '@/utils/validasi'

const teks = (v) => (v instanceof Date ? normalTanggal(v) : String(v ?? '').replace(/\s+/g, ' ').trim())
const angka = (v) => { const n = hanyaAngka(v); return n === '' ? '' : Number(n) }
// Nilai panjang (NIP/NIK/rekening) yang tersimpan sebagai angka di Excel sudah kehilangan digit terakhirnya
const digitPanjang = (v) => (typeof v === 'number' && v > 1e15 ? `!${v}` : hanyaAngka(v))

export const JENIS_IMPOR = {
  pegawai: {
    judul: 'Pegawai', ikon: 'Users', warna: 'from-sky-400 to-blue-600',
    sumber: 'Templat SIBOS, sheet dB-SKPG (Jurnal Dana BOS 2026), atau ekspor Dapodik',
    kunciGanda: 'NIP, lalu NIK, lalu nama',
    kolom: [
      { kunci: 'nama', judul: 'Nama', wajib: true, sinonim: ['nama', 'nama pegawai', 'nama lengkap', 'nama guru', 'nama ptk', 'nama tanpa gelar'], normal: teks },
      { kunci: 'gelar_depan', judul: 'Gelar Depan', sinonim: ['gelar depan'], normal: teks },
      { kunci: 'gelar', judul: 'Gelar Belakang', sinonim: ['gelar', 'gelar belakang'], normal: teks },
      { kunci: 'nip', judul: 'NIP', sinonim: ['nip', 'nip baru', 'nip/niptt', 'nomor induk pegawai'], normal: digitPanjang },
      { kunci: 'nik', judul: 'NIK', sinonim: ['nik', 'no ktp', 'nomor ktp', 'nomor induk kependudukan'], normal: digitPanjang, rahasia: true },
      { kunci: 'npwp', judul: 'NPWP', sinonim: ['npwp', 'no npwp', 'nomor npwp'], normal: (v) => formatNpwp(v), rahasia: true },
      { kunci: 'nuptk', judul: 'NUPTK', sinonim: ['nuptk'], normal: digitPanjang },
      { kunci: 'jenis_kelamin', judul: 'Jenis Kelamin (L/P)', sinonim: ['jk', 'l/p', 'jenis kelamin', 'kelamin', 'gender'], normal: normalJk },
      { kunci: 'tempat_lahir', judul: 'Tempat Lahir', sinonim: ['tempat lahir', 'tmp lahir'], normal: teks },
      { kunci: 'tanggal_lahir', judul: 'Tanggal Lahir', sinonim: ['tanggal lahir', 'tgl lahir', 'tgl. lahir', 'tanggal kelahiran'], normal: normalTanggal },
      { kunci: 'status_kepegawaian', judul: 'Status (PNS/PPPK/Honorer)', sinonim: ['status', 'status kepegawaian', 'status pegawai', 'jenis ptk', 'kepegawaian'], normal: normalStatus },
      { kunci: 'golongan', judul: 'Golongan', sinonim: ['gol', 'golongan', 'gol/ruang', 'gol ruang', 'golongan ruang'], normal: normalGolongan },
      { kunci: 'pangkat', judul: 'Pangkat', sinonim: ['pangkat'], normal: teks },
      { kunci: 'jabatan', judul: 'Jabatan', sinonim: ['jabatan', 'tugas', 'jabatan/tugas', 'mapel', 'tugas mengajar'], normal: teks },
      { kunci: 'status_dapodik', judul: 'Status Dapodik', sinonim: ['dapodik', 'status dapodik'], normal: teks },
      { kunci: 'sk_penugasan', judul: 'SK Penugasan', sinonim: ['sk', 'no sk', 'sk penugasan', 'nomor sk'], normal: teks },
      { kunci: 'tmt_kgb_terakhir', judul: 'TMT KGB Terakhir', sinonim: ['tmt kgb', 'kgb terakhir', 'tmt kgb terakhir'], normal: normalTanggal },
      { kunci: 'status_kawin', judul: 'Status Kawin', sinonim: ['status kawin', 'status perkawinan', 'kawin', 'stat kawin'], normal: teks, rahasia: true },
      { kunci: 'anak', judul: 'Jumlah Anak', sinonim: ['anak', 'jumlah anak', 'jml anak'], normal: angka, rahasia: true },
      { kunci: 'jiwa', judul: 'Jumlah Jiwa', sinonim: ['jiwa', 'jumlah jiwa', 'jml jiwa'], normal: angka, rahasia: true },
      { kunci: 'terima_tpg', judul: 'Terima TPG (Ya/Tidak)', sinonim: ['tpg', 'terima tpg', 'sertifikasi', 'tunjangan profesi'], normal: normalBool },
      { kunci: 'no_wa', judul: 'No. WA', sinonim: ['wa', 'no wa', 'whatsapp', 'no hp', 'hp', 'no telp', 'telepon', 'nomor hp'], normal: normalWa },
      { kunci: 'email', judul: 'Email', sinonim: ['email', 'e-mail', 'surel'], normal: teks },
      { kunci: 'alamat', judul: 'Alamat', sinonim: ['alamat', 'alamat rumah'], normal: teks, rahasia: true },
      { kunci: 'bank', judul: 'Bank', sinonim: ['bank', 'nama bank'], normal: teks, rahasia: true },
      { kunci: 'no_rekening', judul: 'No. Rekening', sinonim: ['rekening', 'no rekening', 'no rek', 'nomor rekening', 'no. rek'], normal: digitPanjang, rahasia: true },
      { kunci: 'atas_nama_rekening', judul: 'Atas Nama Rekening', sinonim: ['atas nama', 'a.n', 'an', 'nama rekening', 'nama pemilik rekening'], normal: teks, rahasia: true },
    ],
    // Pemeriksaan & pelengkapan per baris → { galat[], peringatan[] }
    periksa(d) {
      const galat = [], peringatan = []
      for (const k of ['nip', 'nik', 'nuptk', 'no_rekening']) if (String(d[k]).startsWith('!')) { galat.push(`${k.toUpperCase()} tersimpan sebagai angka di Excel sehingga digit terakhirnya hilang. Ubah kolom menjadi Teks lalu ketik ulang.`); d[k] = '' }
      if (!d.nama) galat.push('Nama kosong.')
      // "Ramli, S.Pd., M.Pd." dalam satu kolom → nama & gelar dipisah
      if (d.nama && !d.gelar && !d.gelar_depan) Object.assign(d, pisahGelar(d.nama))
      const nip = periksaNip(d.nip, { tanggalLahir: d.tanggal_lahir, jenisKelamin: d.jenis_kelamin })
      if (!nip.sah) galat.push(...nip.galat)
      else if (!nip.kosong) { d.tanggal_lahir ||= nip.tanggal_lahir; d.jenis_kelamin ||= nip.jenis_kelamin }
      const nik = periksaNik(d.nik); if (nik) peringatan.push(nik)
      const npwp = periksaNpwp(d.npwp); if (npwp) peringatan.push(npwp)
      if (!d.status_kepegawaian) d.status_kepegawaian = d.nip ? (nip.pppk ? 'PPPK' : 'PNS') : 'Honorer'
      if (d.status_kepegawaian === 'PNS' && !d.pangkat && PANGKAT_PNS[d.golongan]) d.pangkat = PANGKAT_PNS[d.golongan]
      if (d.status_kepegawaian === 'Honorer') {
        const kurang = ['nik', 'npwp', 'no_rekening'].filter((k) => !d[k])
        if (kurang.length) peringatan.push(`Honorer belum lengkap: ${kurang.join(', ').toUpperCase()}.`)
      }
      if (d.terima_tpg === '') d.terima_tpg = false
      return { galat, peringatan }
    },
    // Mencari data yang sudah ada (untuk "perbarui" / "lewati")
    cocokkan(d, ada) {
      if (d.nip) return ada.find((p) => hanyaAngka(p.nip) === d.nip)
      if (d.nik) return ada.find((p) => hanyaAngka(p.nik) === d.nik)
      const nm = d.nama.toLowerCase()
      return ada.find((p) => !p.nip && p.nama?.toLowerCase() === nm)
    },
    label: (d) => d.nama,
    sub: (d) => d.nip || d.status_kepegawaian,
  },

  rekanan: {
    judul: 'Rekanan', ikon: 'Store', warna: 'from-amber-400 to-orange-500',
    sumber: 'Templat SIBOS atau sheet db_Rekanan (Jurnal Dana BOS 2026)',
    kunciGanda: 'nama usaha + NPWP',
    kolom: [
      { kunci: 'nama_usaha', judul: 'Nama Usaha', wajib: true, sinonim: ['nama usaha', 'nama toko', 'toko', 'rekanan', 'nama rekanan', 'penyedia', 'nama penyedia', 'perusahaan', 'nama perusahaan', 'usaha'], normal: teks },
      { kunci: 'pemilik', judul: 'Nama Pemilik', sinonim: ['pemilik', 'nama pemilik', 'direktur', 'penanggung jawab', 'pimpinan'], normal: teks },
      { kunci: 'jabatan_pemilik', judul: 'Jabatan Pemilik', sinonim: ['jabatan', 'jabatan pemilik'], normal: teks },
      { kunci: 'bentuk_usaha', judul: 'Bentuk Usaha (Orang Pribadi/Badan)', sinonim: ['bentuk usaha', 'jenis usaha', 'badan/perorangan', 'bentuk'], normal: normalBentukUsaha },
      { kunci: 'npwp', judul: 'NPWP', sinonim: ['npwp', 'no npwp', 'nomor npwp'], normal: (v) => formatNpwp(v) },
      { kunci: 'status_pkp', judul: 'PKP (Ya/Tidak)', sinonim: ['pkp', 'status pkp'], normal: normalBool },
      { kunci: 'alamat', judul: 'Alamat', sinonim: ['alamat', 'alamat usaha', 'alamat toko'], normal: teks },
      { kunci: 'telepon', judul: 'Telepon', sinonim: ['telepon', 'telp', 'no telp', 'no telepon'], normal: teks },
      { kunci: 'no_wa', judul: 'No. WA', sinonim: ['wa', 'no wa', 'whatsapp', 'hp', 'no hp'], normal: normalWa },
      { kunci: 'bank', judul: 'Bank', sinonim: ['bank', 'nama bank'], normal: teks },
      { kunci: 'no_rekening', judul: 'No. Rekening', sinonim: ['rekening', 'no rekening', 'no rek', 'nomor rekening'], normal: digitPanjang },
      { kunci: 'atas_nama_rekening', judul: 'Atas Nama Rekening', sinonim: ['atas nama', 'a.n', 'nama rekening'], normal: teks },
    ],
    periksa(d) {
      const galat = [], peringatan = []
      if (String(d.no_rekening).startsWith('!')) { galat.push('No. rekening tersimpan sebagai angka di Excel sehingga digitnya hilang. Ubah kolom menjadi Teks.'); d.no_rekening = '' }
      if (!d.nama_usaha) galat.push('Nama usaha kosong.')
      const npwp = periksaNpwp(d.npwp); if (npwp) peringatan.push(npwp)
      if (!d.bentuk_usaha) d.bentuk_usaha = /^(cv|pt|ud|kop)/i.test(d.nama_usaha) ? 'badan' : 'orang_pribadi'
      if (d.status_pkp === '') d.status_pkp = false
      return { galat, peringatan }
    },
    cocokkan(d, ada) {
      const nm = d.nama_usaha.toLowerCase()
      return ada.find((r) => r.nama_usaha?.toLowerCase() === nm && hanyaAngka(r.npwp) === hanyaAngka(d.npwp))
    },
    label: (d) => d.nama_usaha,
    sub: (d) => d.npwp || d.pemilik,
  },
  standar_harga: {
    judul: 'Standar Harga', ikon: 'Tags', warna: 'from-rose-400 to-red-500',
    sumber: 'Templat SIBOS, SSH Pemkot Makassar, atau sheet harga Jurnal Dana BOS',
    kunciGanda: 'nama item + satuan + harga',
    ke: '/standar-harga',
    kolom: [
      { kunci: 'nama_item', judul: 'Nama Item', wajib: true, sinonim: ['nama item', 'nama barang', 'uraian', 'nama barang/jasa', 'barang', 'item', 'nama', 'uraian barang', 'jenis barang'], normal: teks },
      { kunci: 'spesifikasi', judul: 'Spesifikasi', sinonim: ['spesifikasi', 'spek', 'keterangan', 'merk/tipe', 'deskripsi'], normal: teks },
      { kunci: 'satuan', judul: 'Satuan', wajib: true, sinonim: ['satuan', 'sat', 'unit'], normal: teks },
      { kunci: 'harga', judul: 'Harga Satuan', wajib: true, sinonim: ['harga', 'harga satuan', 'tarif', 'tarif harga', 'harga (rp)', 'nilai', 'ssh'], normal: (v) => (typeof v === 'number' ? Math.round(v) : angka(String(v).split(',')[0])) },
      { kunci: 'kelompok', judul: 'Kelompok', sinonim: ['kelompok', 'golongan barang', 'kategori barang', 'jenis belanja'], normal: teks },
      { kunci: 'kode_item', judul: 'Kode Item', sinonim: ['kode item', 'kode barang', 'kode ssh', 'kode'], normal: teks },
      { kunci: 'kode_rekening', judul: 'Kode Rekening', sinonim: ['kode rekening', 'rekening', 'akun', 'kode akun'], normal: teks },
      { kunci: 'pajak_bawaan', judul: 'Pajak Bawaan', sinonim: ['pajak', 'pajak bawaan', 'jenis pajak'], normal: teks },
      { kunci: 'tahun', judul: 'Tahun', sinonim: ['tahun', 'ta', 'tahun anggaran'], normal: angka },
    ],
    periksa(d) {
      const galat = [], peringatan = []
      if (!d.nama_item) galat.push('Nama item kosong.')
      if (!d.satuan) galat.push('Satuan kosong.')
      if (!(Number(d.harga) > 0)) galat.push('Harga harus lebih dari 0.')
      if (d.kode_rekening && !/^5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(d.kode_rekening)) peringatan.push('Kode rekening bukan format ARKAS (5.1.02.01.01.0012).')
      d.kategori = /^5\.2\.02/.test(d.kode_rekening) ? 'alat_mesin' : /^5\.2\.05/.test(d.kode_rekening) ? 'aset_lain' : 'operasional'
      d.tahun ||= new Date().getFullYear()
      d.kelompok ||= 'Barang Lainnya'
      d.jenis = 'barang'
      d.aktif = true
      d.sumber = 'Impor Excel'
      return { galat, peringatan }
    },
    kunci: (d) => `${d.nama_item.toLowerCase()}|${d.satuan.toLowerCase()}|${d.harga}`,
    cocokkan(d, ada) {
      const nm = d.nama_item.toLowerCase(), st = d.satuan.toLowerCase()
      return ada.find((h) => h.nama_item?.toLowerCase() === nm && h.satuan?.toLowerCase() === st && (Number(h.harga) === Number(d.harga) || (d.kode_item && h.kode_item === d.kode_item)))
        || (d.kode_item ? ada.find((h) => h.kode_item === d.kode_item) : null)
    },
    label: (d) => d.nama_item,
    sub: (d) => `${d.satuan} · Rp ${Number(d.harga || 0).toLocaleString('id-ID')}`,
    contoh: [{ nama_item: 'Kertas HVS F4 75 gsm', spesifikasi: 'isi 500 lembar', satuan: 'rim', harga: 73000, kelompok: 'ATK', kode_rekening: '5.1.02.01.01.0012', pajak_bawaan: 'PPN', tahun: 2026 }],
    petunjuk: ['• Satu baris = satu item harga (satu harga per item per tahun).', '• Harga ditulis angka saja, mis. 73000.', '• Kode rekening mengikuti ARKAS, mis. 5.1.02.01.01.0012; kategori anggaran terisi otomatis dari kode rekening.', '• Item yang sudah ada dicocokkan lewat nama + satuan + harga (atau kode item); harga baru dicatat di riwayat harga.'],
  },
}

export const normalJudul = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim()

/** Menebak kolom SIBOS untuk tiap judul kolom berkas */
export function tebakPemetaan(judulBerkas, jenis, simpanan = {}) {
  const kolom = JENIS_IMPOR[jenis].kolom
  const terpakai = new Set()
  const hasil = judulBerkas.map((j) => {
    const n = normalJudul(j)
    if (simpanan[n] && !terpakai.has(simpanan[n])) { terpakai.add(simpanan[n]); return simpanan[n] }
    const persis = kolom.find((k) => !terpakai.has(k.kunci) && k.sinonim.some((s) => normalJudul(s) === n))
    if (persis) { terpakai.add(persis.kunci); return persis.kunci }
    return ''
  })
  // Putaran kedua: judul yang mengandung sinonim (mis. "NIP Pegawai")
  return hasil.map((h, i) => {
    if (h) return h
    const n = normalJudul(judulBerkas[i])
    if (!n || n.length < 2) return ''
    const mirip = kolom.find((k) => !terpakai.has(k.kunci) && k.sinonim.some((s) => normalJudul(s).length > 2 && n.includes(normalJudul(s))))
    if (mirip) { terpakai.add(mirip.kunci); return mirip.kunci }
    return ''
  })
}

/** Baris judul = baris (dalam 15 baris pertama) yang paling banyak cocok dengan sinonim */
export function cariBarisJudul(baris, jenis) {
  let terbaik = 0, skor = -1
  baris.slice(0, 15).forEach((b, i) => {
    const s = tebakPemetaan(b.map(String), jenis).filter(Boolean).length
    if (s > skor) { skor = s; terbaik = i }
  })
  return terbaik
}
