// Layanan tingkat sistem: Penyiapan Awal (sekali) dan Serah Terima Bendahara (peralihan Admin).
import {
  doc, collection, writeBatch, getDoc, getDocs, query, where, serverTimestamp, arrayUnion,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { SEKOLAH_AWAL, PEJABAT_AWAL, PEMILIK_AWAL, ID_FOLDER_DRIVE_AWAL } from '@/config/sekolahAwal'

const kemarin = (yyyyMmDd) => {
  const d = new Date(`${yyyyMmDd}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Penyiapan Awal — dijalankan SEKALI oleh pemilik pertama (PEMILIK_AWAL.email).
 * Semua dokumen ditulis dalam satu batch; aturan Firestore hanya mengizinkannya
 * bila dokumen sistem/penyiapan belum ada dan ikut dibuat di batch yang sama.
 */
export async function jalankanPenyiapanAwal({ username, nama, gelar, nip }) {
  const user = auth.currentUser
  if (!user || user.email !== PEMILIK_AWAL.email) throw new Error('Hanya pemilik sistem yang dapat menjalankan Penyiapan Awal.')
  const u = username.trim().toLowerCase()
  const b = writeBatch(db)

  b.set(doc(db, 'pengguna', user.uid), {
    username: u, nama: `${nama}, ${gelar}`.replace(/,\s*$/, ''), email: user.email,
    peran: ['bendahara'], aktif: true, wajib_ganti_password: false, nip,
    dibuat: serverTimestamp(), dibuat_oleh: user.uid,
  })
  b.set(doc(db, 'akun_login', u), { email: user.email })
  b.set(doc(db, 'sekolah', 'profil'), { ...SEKOLAH_AWAL, diperbarui: serverTimestamp() })
  b.set(doc(db, 'sistem', 'penghubung'), { url_apps_script: '', id_folder_drive: ID_FOLDER_DRIVE_AWAL, diperbarui: serverTimestamp() })
  b.set(doc(db, 'sistem', 'pemilik'), {
    uid: user.uid, email: user.email, nama, sejak: serverTimestamp(),
    riwayat: [{ uid: user.uid, email: user.email, nama, mulai: new Date().toISOString().slice(0, 10), cara: 'penyiapan_awal' }],
  })
  for (const p of PEJABAT_AWAL) {
    b.set(doc(collection(db, 'pejabat')), { ...p, pangkat: p.pangkat || '', id_pengguna: p.nip === nip ? user.uid : null, dibuat: serverTimestamp() })
  }
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: user.uid, aksi: 'penyiapan_awal', keterangan: 'Penyiapan Awal SIBOS: akun Admin pertama, profil sekolah, pejabat',
    koleksi: 'sistem', id_dokumen: 'penyiapan', sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
  // Penanda terakhir: setelah ini, Penyiapan Awal terkunci selamanya
  b.set(doc(db, 'sistem', 'penyiapan'), { selesai: true, oleh: user.uid, email: user.email, waktu: serverTimestamp() })
  await b.commit()
}

/**
 * Serah Terima Bendahara — memindahkan peran Admin ke bendahara baru dalam SATU transaksi:
 *  1. bendahara baru mendapat peran 'bendahara'
 *  2. bendahara lama kehilangan peran itu (tetap sebagai Tim BOS selama masa transisi, atau dinonaktifkan)
 *  3. periode pejabat Bendahara BOSP/Gaji lama ditutup H-1, periode baru dibuka mulai tanggal serah terima
 *  4. pemilik sistem diperbarui + riwayat
 *  5. dokumen serah_terima dibuat (dasar Berita Acara) dan tercatat di log aktivitas
 * Bisa dijalankan Bendahara yang sedang menjabat, atau Kepala Sekolah bila bendahara berhalangan.
 */
export async function serahTerimaBendahara({ lama, baru, tanggal, jabatan, aksesLama, catatan, pejabatBaru }) {
  if (!baru?.uid) throw new Error('Pilih akun bendahara baru.')
  if (lama?.uid === baru.uid) throw new Error('Bendahara lama dan baru tidak boleh sama.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal serah terima belum diisi.')
  const pelaku = auth.currentUser.uid
  const b = writeBatch(db)

  // 1 & 2 — peran
  const peranBaru = [...new Set([...(baru.peran || []), 'bendahara'])]
  b.update(doc(db, 'pengguna', baru.uid), { peran: peranBaru, diubah: serverTimestamp(), diubah_oleh: pelaku })
  if (lama?.uid) {
    const sisa = (lama.peran || []).filter((p) => p !== 'bendahara')
    if (aksesLama === 'tim_bos' && !sisa.includes('tim_bos')) sisa.push('tim_bos')
    b.update(doc(db, 'pengguna', lama.uid), {
      peran: sisa, aktif: aksesLama !== 'nonaktif', diubah: serverTimestamp(), diubah_oleh: pelaku,
    })
  }

  // 3 — pejabat per periode
  for (const j of jabatan) {
    const aktif = await getDocs(query(collection(db, 'pejabat'), where('jabatan', '==', j), where('sampai', '==', null)))
    aktif.forEach((d) => b.update(d.ref, { sampai: kemarin(tanggal), diubah: serverTimestamp() }))
    b.set(doc(collection(db, 'pejabat')), {
      jabatan: j, nama: pejabatBaru.nama, gelar: pejabatBaru.gelar || '', pangkat: pejabatBaru.pangkat || '',
      nip: pejabatBaru.nip || '', alamat: '', telepon: '', tanda_tangan: null,
      id_pengguna: baru.uid, mulai: tanggal, sampai: null, dibuat: serverTimestamp(),
    })
  }

  // 4 — pemilik sistem
  b.update(doc(db, 'sistem', 'pemilik'), {
    uid: baru.uid, email: baru.email || '', nama: pejabatBaru.nama, sejak: serverTimestamp(),
    riwayat: arrayUnion({ uid: baru.uid, email: baru.email || '', nama: pejabatBaru.nama, mulai: tanggal, cara: 'serah_terima', dari: lama?.uid || null }),
  })

  // 5 — catatan serah terima & log
  const st = doc(collection(db, 'serah_terima'))
  b.set(st, {
    tanggal, jabatan, catatan: catatan || '', akses_lama: aksesLama,
    dari: lama ? { uid: lama.uid, nama: lama.nama, email: lama.email || '' } : null,
    ke: { uid: baru.uid, nama: pejabatBaru.nama, email: baru.email || '', nip: pejabatBaru.nip || '' },
    oleh: pelaku, waktu: serverTimestamp(),
  })
  b.set(doc(collection(db, 'log_aktivitas')), {
    uid: pelaku, aksi: 'serah_terima_bendahara',
    keterangan: `Serah terima Bendahara dari ${lama?.nama || '-'} kepada ${pejabatBaru.nama} mulai ${tanggal}`,
    koleksi: 'serah_terima', id_dokumen: st.id, sebelum: null, sesudah: null, waktu: serverTimestamp(), perangkat: navigator.userAgent.slice(0, 160),
  })
  await b.commit()
  return st.id
}

/** Pengaturan penghubung Drive (URL Apps Script & ID folder) — disimpan di Firestore agar bisa diganti tanpa ubah kode */
export async function bacaPenghubung() {
  const s = await getDoc(doc(db, 'sistem', 'penghubung'))
  return s.exists() ? s.data() : { url_apps_script: import.meta.env.VITE_PENGHUBUNG_DRIVE_URL || '', id_folder_drive: ID_FOLDER_DRIVE_AWAL }
}
