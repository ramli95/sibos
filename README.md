# SIBOS — Sistem Informasi Bantuan Operasional Sekolah

Aplikasi pengelolaan dana BOSP untuk **UPT SPF SMP Negeri 19 Makassar** (NPSN 40307324).
Input sekali → dokumen SPJ, panduan ARKAS & SIMAKDA, pajak, BKU, laporan, dan dokumen kepegawaian.

## Teknologi
Vue 3 + Vite · Vue Router · Pinia · Tailwind CSS 4 · Lucide · Firebase Auth + Firestore (Jakarta) ·
Google Drive lewat penghubung Apps Script · PWA · terbit di GitHub Pages.

## Menjalankan di komputer
```bash
npm install
cp .env.example .env.local   # isi konfigurasi Firebase
npm run dev
```
Tanpa `.env.local`, aplikasi berjalan dalam **Mode Pratinjau** (tanpa data).

## Terbit
Setiap push ke `main` otomatis dibangun dan diterbitkan oleh `.github/workflows/terbit.yml`.
Konfigurasi Firebase web ada di `.env.production` (kunci web Firebase memang publik; data dijaga `firestore.rules`).

## Struktur
- `src/config` — menu, peran, data awal sekolah
- `src/stores` — login, tema, notifikasi
- `src/views` — halaman (akun, dasbor, pengaturan, master data)
- `firestore.rules` — aturan akses per peran
