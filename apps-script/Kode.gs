/**
 * SIBOS Penghubung — Google Apps Script
 * Dipasang di akun Bendahara (pemilik proyek Firebase sibos19 dan folder Drive SIBOS).
 * Tugas: unggah berkas ke Drive, reset password pengguna tanpa email, cadangan otomatis,
 * notifikasi push (Firebase Cloud Messaging), penghapusan log aktivitas lebih dari 6 bulan,
 * dan pengingat KGB H-30 setiap pagi (v7, Fase 6).
 */
const KONFIG = {
  PROYEK: 'sibos19',
  API_KEY: 'AIzaSyAmo_jbCD_o9Uvijyo8PCl3BNyHqCicwvw',
  FOLDER_INDUK: '12G033COl3Cny9yenJOvxgQ16ilwaeM7p',
  ZONA: 'Asia/Makassar',
  SIMPAN_JSON: 12,
  SIMPAN_LOG_BULAN: 6,
};
const VERSI = 7;
const FS = 'https://firestore.googleapis.com/v1/projects/' + KONFIG.PROYEK + '/databases/(default)/documents';
const SUBKOLEKSI = ['rahasia', 'item', 'penerima', 'dokumen', 'uraian', 'bagian', 'potong', 'foto'];

/* ======================= PINTU MASUK ======================= */

function doGet() {
  return balas({ ok: true, layanan: 'SIBOS Penghubung', versi: VERSI });
}

function doPost(e) {
  try {
    const m = JSON.parse(e.postData.contents);
    const p = periksaToken(m.idToken);
    switch (m.aksi) {
      case 'ping':
        return balas({
          ok: true,
          folder: DriveApp.getFolderById(KONFIG.FOLDER_INDUK).getName(),
          pemilik: Session.getEffectiveUser().getEmail(),
          pengguna: p.nama,
          versi: VERSI,
        });
      case 'unggah':
        return balas(unggah(m, p));
      case 'cadangkan':
        wajibAdmin(p);
        return balas(cadangkan('manual', p.email));
      case 'reset_password':
        wajibAdmin(p);
        return balas(resetPassword(m.uid, p));
      case 'cek_kgb':
        wajibAdmin(p);
        return balas({ ok: true, hasil: pengingatKgb(true) });
      case 'uji_push':
        return balas({ ok: true, terkirim: kirimPush(p.uid, 'Uji notifikasi SIBOS', 'Notifikasi push berhasil diterima di perangkat ini.') });
      default:
        throw new Error('Aksi tidak dikenal: ' + m.aksi);
    }
  } catch (err) {
    return balas({ ok: false, pesan: String((err && err.message) || err) });
  }
}

function balas(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ======================= KEAMANAN ======================= */

// Memastikan permintaan berasal dari pengguna SIBOS yang sedang login dan aktif
function periksaToken(idToken) {
  if (!idToken) throw new Error('Belum login.');
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + KONFIG.API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) throw new Error('Sesi login tidak sah atau kedaluwarsa. Silakan masuk ulang.');
  const u = JSON.parse(r.getContentText()).users[0];
  const prof = bacaDok('pengguna/' + u.localId);
  if (!prof || prof.aktif !== true) throw new Error('Akun tidak aktif.');
  return { uid: u.localId, email: u.email, nama: prof.nama, peran: prof.peran || [] };
}

function wajibAdmin(p) {
  if (p.peran.indexOf('bendahara') < 0) throw new Error('Hanya Bendahara (Admin) yang dapat melakukan ini.');
}

/* ======================= UNGGAH BERKAS ======================= */

function unggah(m, p) {
  const boleh = ['bendahara', 'tim_bos', 'pengurus_barang'];
  if (!p.peran.some(function (x) { return boleh.indexOf(x) >= 0; })) throw new Error('Peran Anda tidak diizinkan mengunggah berkas.');
  if (!m.base64 || !m.nama) throw new Error('Berkas kosong.');
  const jalur = (m.jalur || []).map(function (s) { return String(s).replace(/[\\/]/g, '-').trim(); }).filter(String);

  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  let folder;
  try {
    folder = DriveApp.getFolderById(KONFIG.FOLDER_INDUK);
    jalur.forEach(function (n) { folder = ambilFolder(folder, n); });
  } finally {
    kunci.releaseLock();
  }
  const blob = Utilities.newBlob(Utilities.base64Decode(m.base64), m.mime || 'application/octet-stream', m.nama);
  const f = folder.createFile(blob);
  f.setDescription('Diunggah lewat SIBOS oleh ' + p.nama + ' (' + p.email + ')');
  return { ok: true, id_berkas_drive: f.getId(), tautan: f.getUrl(), nama: f.getName(), folder: jalur.join('/') };
}

function ambilFolder(induk, nama) {
  const it = induk.getFoldersByName(nama);
  return it.hasNext() ? it.next() : induk.createFolder(nama);
}

/* ======================= RESET PASSWORD ======================= */

function resetPassword(uid, p) {
  if (!uid) throw new Error('Pengguna belum dipilih.');
  if (uid === p.uid) throw new Error('Gunakan menu Ganti password untuk akun sendiri.');
  const target = bacaDok('pengguna/' + uid);
  if (!target) throw new Error('Pengguna tidak ditemukan.');
  const sandi = buatSandi();
  panggilGoogle('https://identitytoolkit.googleapis.com/v1/projects/' + KONFIG.PROYEK + '/accounts:update', 'post', { localId: uid, password: sandi });
  tulisDok('pengguna/' + uid, { wajib_ganti_password: true, diubah: new Date(), diubah_oleh: p.uid });
  tambahLog(p.uid, 'reset_password', 'Reset password ' + target.nama + ' (password sementara)', 'pengguna', uid);
  return { ok: true, username: target.username, password: sandi };
}

function buatSandi() {
  const h = 'abcdefghjkmnpqrstuvwxyz';
  const acak = function (s) { return s.charAt(Math.floor(Math.random() * s.length)); };
  return acak(h).toUpperCase() + acak(h) + acak(h) + ('000' + Math.floor(Math.random() * 10000)).slice(-4) + acak(h);
}

/* ======================= CADANGAN ======================= */

function cadanganHarian() {
  const minggu = Number(Utilities.formatDate(new Date(), KONFIG.ZONA, 'u')) === 7;
  cadangkan(minggu ? 'mingguan' : 'harian', 'otomatis');
  // Setelah data tercadang, log aktivitas yang lebih tua dari 6 bulan dihapus
  try { hapusLogLama(); } catch (e) { kabariAdmin('Pembersihan log gagal', String(e.message || e)); }
}

/* ======================= PENGINGAT KGB (v7) ======================= */

// Dijalankan setiap pagi. KGB jatuh tempo = TMT KGB terakhir + 2 tahun (data Kepegawaian).
// Pegawai yang jatuh temponya 0–30 hari lagi (atau sudah lewat ≤ 60 hari) dikabarkan sekali per jatuh tempo
// kepada semua Bendahara (lonceng SIBOS + push). Catatan yang sudah dikabarkan disimpan di sistem/kgb.
function pengingatHarian() {
  try { pengingatKgb(false); } catch (e) { kabariAdmin('Pengingat KGB gagal', String(e.message || e)); }
}

function pengingatKgb(paksa) {
  const hariIni = Utilities.formatDate(new Date(), KONFIG.ZONA, 'yyyy-MM-dd');
  const status = bacaDok('sistem/kgb') || {};
  const sudah = status.dikabari || {};
  const docs = (panggilGoogle(FS + ':runQuery', 'post', { structuredQuery: { from: [{ collectionId: 'pegawai' }] } }) || [])
    .filter(function (x) { return x.document; })
    .map(function (x) { const d = dariFs(x.document.fields || {}); d.id = x.document.name.split('/').pop(); return d; });
  const daftar = [];
  docs.forEach(function (p) {
    if (p.aktif === false || ['PNS', 'PPPK'].indexOf(p.status_kepegawaian) < 0 || !p.tmt_kgb_terakhir) return;
    const t = String(p.tmt_kgb_terakhir).slice(0, 10).split('-');
    if (t.length !== 3) return;
    const jatuh = (Number(t[0]) + 2) + '-' + t[1] + '-' + t[2];
    const sisa = Math.round((new Date(jatuh + 'T00:00:00Z') - new Date(hariIni + 'T00:00:00Z')) / 864e5);
    if (sisa > 30 || sisa < -60) return;
    if (!paksa && sudah[p.id] === jatuh) return;
    daftar.push({ id: p.id, nama: p.nama, jatuh: jatuh, sisa: sisa });
  });
  if (daftar.length) {
    daftar.sort(function (a, b) { return a.sisa - b.sisa; });
    const teks = daftar.slice(0, 5).map(function (x) {
      return x.nama + ' (' + (x.sisa > 0 ? 'H-' + x.sisa : x.sisa === 0 ? 'hari ini' : 'lewat ' + (-x.sisa) + ' hari') + ')';
    }).join(', ') + (daftar.length > 5 ? ', dan ' + (daftar.length - 5) + ' lainnya' : '');
    kabariAdmin('KGB jatuh tempo: ' + daftar.length + ' pegawai', teks + '. Siapkan surat pengantar usulan KGB.',
      { jenis: 'peringatan', ikon: 'TrendingUp', tautan: '/gaji/kgb' });
    daftar.forEach(function (x) { sudah[x.id] = x.jatuh; });
  }
  tulisDok('sistem/kgb', { dikabari: sudah, terakhir_dicek: new Date(), jumlah_terakhir: daftar.length });
  Logger.log('Pengingat KGB: ' + daftar.length + ' pegawai');
  return { jumlah: daftar.length, pegawai: daftar };
}

/* ======================= PEMBERSIHAN LOG ======================= */

// Menghapus log_aktivitas yang waktunya lebih lama dari KONFIG.SIMPAN_LOG_BULAN bulan
function hapusLogLama() {
  const batas = new Date();
  batas.setMonth(batas.getMonth() - KONFIG.SIMPAN_LOG_BULAN);
  let total = 0;
  for (let putaran = 0; putaran < 50; putaran++) {
    const q = { structuredQuery: {
      from: [{ collectionId: 'log_aktivitas' }],
      where: { fieldFilter: { field: { fieldPath: 'waktu' }, op: 'LESS_THAN', value: { timestampValue: batas.toISOString() } } },
      limit: 400,
    } };
    const docs = (panggilGoogle(FS + ':runQuery', 'post', q) || []).filter(function (x) { return x.document; });
    if (!docs.length) break;
    panggilGoogle(FS + ':commit', 'post', { writes: docs.map(function (x) { return { delete: x.document.name }; }) });
    total += docs.length;
    if (docs.length < 400) break;
  }
  tulisDok('sistem/cadangan', { log_dihapus_terakhir: total, log_dibersihkan: new Date(), log_batas: batas });
  Logger.log('Log dihapus: ' + total + ' (sebelum ' + batas.toISOString() + ')');
  return total;
}

function cadangkan(jenis, oleh) {
  const mulai = new Date();
  try {
    const induk = DriveApp.getFolderById(KONFIG.FOLDER_INDUK);
    const folderCadangan = ambilFolder(induk, 'Cadangan');
    const tahun = Utilities.formatDate(mulai, KONFIG.ZONA, 'yyyy');
    const ss = ambilSpreadsheet(folderCadangan, 'SIBOS Cadangan ' + tahun);

    const koleksi = daftarKoleksi();
    const semua = {};
    let jumlah = 0;
    koleksi.forEach(function (id) {
      let docs = ambilSemua(id);
      if (!docs.length) return;
      // Foto belanja: gambarnya sudah diarsipkan di Drive, cadangan cukup keterangan & tautan (tanpa isi gambar)
      if (id === 'foto') docs = docs.map(function (d) { const x = {}; Object.keys(d.data).forEach(function (k) { if (k !== 'data') x[k] = d.data[k]; }); return { jalur: d.jalur, data: x, diperbarui: d.diperbarui }; });
      semua[id] = docs;
      jumlah += docs.length;
      // RKAS disimpan per SNP (rkas/{versi}/bagian/{snp}.butir) → di Sheets satu baris per uraian
      if (id === 'bagian') tulisLembar(ss, 'rkas_uraian', ratakanButir(docs));
      // SSH disimpan per potong (ssh/{sumber}/potong/{n}.butir) → di Sheets satu baris per item
      else if (id === 'potong') tulisLembar(ss, 'ssh_item', ratakanButir(docs));
      else if (id === 'foto') tulisLembar(ss, 'belanja_foto', docs);
      else tulisLembar(ss, id, docs);
    });
    tulisRingkasan(ss, semua, mulai, jenis, oleh);

    let tautanJson = '';
    if (jenis === 'mingguan' || jenis === 'manual') tautanJson = simpanJson(folderCadangan, semua, mulai);

    const hasil = {
      terakhir: new Date(), status: 'berhasil', jenis: jenis, oleh: oleh, pesan: '',
      jumlah_dokumen: jumlah, jumlah_koleksi: Object.keys(semua).length, tautan_sheet: ss.getUrl(), tautan_json: tautanJson,
    };
    tulisDok('sistem/cadangan', hasil);
    return { ok: true, terakhir: hasil.terakhir, jumlah_dokumen: jumlah, tautan_sheet: hasil.tautan_sheet };
  } catch (err) {
    const pesan = String((err && err.message) || err);
    try {
      tulisDok('sistem/cadangan', { terakhir_gagal: new Date(), status: 'gagal', jenis: jenis, oleh: oleh, pesan: pesan });
      kabariAdmin('Cadangan SIBOS gagal', pesan);
    } catch (e2) { /* abaikan */ }
    if (oleh === 'otomatis') {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'SIBOS: cadangan otomatis gagal', 'Cadangan ' + jenis + ' gagal pada ' + mulai + '.\n\nPesan: ' + pesan);
    }
    throw err;
  }
}

function daftarKoleksi() {
  const ids = [];
  let token = '';
  do {
    const r = panggilGoogle(FS + ':listCollectionIds', 'post', { pageSize: 100, pageToken: token || undefined }) || {};
    (r.collectionIds || []).forEach(function (x) { ids.push(x); });
    token = r.nextPageToken || '';
  } while (token);
  SUBKOLEKSI.forEach(function (x) { if (ids.indexOf(x) < 0) ids.push(x); });
  return ids;
}

// Semua dokumen satu koleksi (termasuk subkoleksi bernama sama), 500 per halaman
function ambilSemua(idKoleksi) {
  const hasil = [];
  let setelah = null;
  while (true) {
    const q = { structuredQuery: {
      from: [{ collectionId: idKoleksi, allDescendants: true }],
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      limit: 500,
    } };
    if (setelah) q.structuredQuery.startAt = { values: [{ referenceValue: setelah }], before: false };
    const r = panggilGoogle(FS + ':runQuery', 'post', q) || [];
    const docs = r.filter(function (x) { return x.document; }).map(function (x) { return x.document; });
    docs.forEach(function (d) {
      hasil.push({ jalur: d.name.split('/documents/')[1], data: dariFs(d.fields || {}), diperbarui: d.updateTime });
    });
    if (docs.length < 500) break;
    setelah = docs[docs.length - 1].name;
  }
  return hasil;
}

function ambilSpreadsheet(folder, nama) {
  const it = folder.getFilesByName(nama);
  if (it.hasNext()) return SpreadsheetApp.openById(it.next().getId());
  const ss = SpreadsheetApp.create(nama);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

function tulisLembar(ss, nama, docs) {
  let sh = ss.getSheetByName(nama);
  if (!sh) sh = ss.insertSheet(nama);
  sh.clear();
  const kolom = [];
  docs.forEach(function (d) { Object.keys(d.data).forEach(function (k) { if (kolom.indexOf(k) < 0) kolom.push(k); }); });
  const header = ['jalur', 'diperbarui'].concat(kolom);
  const baris = docs.map(function (d) {
    return [d.jalur, d.diperbarui].concat(kolom.map(function (k) { return keSel(d.data[k]); }));
  });
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#1E3A8A').setFontColor('#FFFFFF');
  if (baris.length) sh.getRange(2, 1, baris.length, header.length).setNumberFormat('@').setValues(baris);
  sh.setFrozenRows(1);
}

function ratakanButir(docs) {
  const hasil = [];
  docs.forEach(function (d) {
    (d.data.butir || []).forEach(function (b, i) { hasil.push({ jalur: d.jalur + '#' + (i + 1), data: b, diperbarui: d.diperbarui }); });
  });
  return hasil;
}

function keSel(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, KONFIG.ZONA, 'yyyy-MM-dd HH:mm:ss');
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 49000);
  return String(v);
}

function tulisRingkasan(ss, semua, waktu, jenis, oleh) {
  let sh = ss.getSheetByName('Ringkasan');
  if (!sh) sh = ss.insertSheet('Ringkasan', 0);
  sh.clear();
  const baris = [['Koleksi', 'Jumlah dokumen']].concat(Object.keys(semua).map(function (k) { return [k, semua[k].length]; }));
  sh.getRange(1, 1).setValue('Cadangan SIBOS — ' + Utilities.formatDate(waktu, KONFIG.ZONA, 'dd/MM/yyyy HH:mm') + ' WITA (' + jenis + ', ' + oleh + ')').setFontWeight('bold');
  sh.getRange(3, 1, baris.length, 2).setValues(baris);
  sh.getRange(3, 1, 1, 2).setFontWeight('bold').setBackground('#1E3A8A').setFontColor('#FFFFFF');
  const awal = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
  if (awal && ss.getSheets().length > 1) ss.deleteSheet(awal);
}

function simpanJson(folderCadangan, semua, waktu) {
  const folder = ambilFolder(folderCadangan, 'JSON');
  const nama = 'SIBOS-cadangan-' + Utilities.formatDate(waktu, KONFIG.ZONA, 'yyyy-MM-dd-HHmm') + '.json';
  const f = folder.createFile(nama, JSON.stringify({ dibuat: waktu, proyek: KONFIG.PROYEK, data: semua }), 'application/json');
  // Simpan 12 versi terakhir; yang lebih lama dipindah ke Sampah (masih bisa dipulihkan 30 hari)
  const daftar = [];
  const it = folder.getFiles();
  while (it.hasNext()) daftar.push(it.next());
  daftar.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  daftar.slice(KONFIG.SIMPAN_JSON).forEach(function (x) { x.setTrashed(true); });
  return f.getUrl();
}

/* ======================= PENYIAPAN (jalankan sekali) ======================= */

function siapkan() {
  const induk = DriveApp.getFolderById(KONFIG.FOLDER_INDUK);
  const tahun = Utilities.formatDate(new Date(), KONFIG.ZONA, 'yyyy');
  ambilFolder(induk, 'Kepegawaian');
  ambilFolder(induk, 'Cadangan');
  ambilFolder(ambilFolder(induk, tahun), 'Pajak');
  const sekolah = bacaDok('sekolah/profil');
  if (!sekolah) throw new Error('Profil sekolah belum ada di Firestore. Jalankan Penyiapan Awal di SIBOS dulu.');
  pasangPemicu();
  const h = cadangkan('manual', 'siapkan');
  Logger.log('BERHASIL. Sekolah: ' + sekolah.nama_arkas + ' | ' + h.jumlah_dokumen + ' dokumen dicadangkan | ' + h.tautan_sheet);
}

function pasangPemicu() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cadanganHarian').timeBased().everyDays(1).atHour(23).nearMinute(0).inTimezone(KONFIG.ZONA).create();
  ScriptApp.newTrigger('pengingatHarian').timeBased().everyDays(1).atHour(7).nearMinute(0).inTimezone(KONFIG.ZONA).create();
}

/* ======================= FIRESTORE REST ======================= */

function panggilGoogle(url, metode, isi) {
  const o = {
    method: metode || 'get', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': KONFIG.PROYEK },
  };
  if (isi !== undefined) { o.contentType = 'application/json'; o.payload = JSON.stringify(isi); }
  const r = UrlFetchApp.fetch(url, o);
  const kode = r.getResponseCode();
  if (kode === 404) return null;
  if (kode >= 300) throw new Error('Google API ' + kode + ': ' + r.getContentText().slice(0, 300));
  const teks = r.getContentText();
  return teks ? JSON.parse(teks) : {};
}

function bacaDok(jalur) {
  const d = panggilGoogle(FS + '/' + jalur);
  return d ? dariFs(d.fields || {}) : null;
}

function tulisDok(jalur, data) {
  const mask = Object.keys(data).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  return panggilGoogle(FS + '/' + jalur + '?' + mask, 'patch', { fields: keFs(data) });
}

function tambahLog(uid, aksi, keterangan, koleksi, id) {
  panggilGoogle(FS + '/log_aktivitas', 'post', { fields: keFs({
    uid: uid, aksi: aksi, keterangan: keterangan, koleksi: koleksi, id_dokumen: id,
    sebelum: null, sesudah: null, waktu: new Date(), perangkat: 'Apps Script',
  }) });
}

// opsi: { jenis: 'galat'|'peringatan'|'info'|'sukses', ikon: nama ikon Lucide, tautan: rute SIBOS mis. '/gaji/kgb' }
function kabariAdmin(judul, isi, opsi) {
  const o = opsi || {};
  const q = { structuredQuery: { from: [{ collectionId: 'pengguna' }], where: { fieldFilter: {
    field: { fieldPath: 'peran' }, op: 'ARRAY_CONTAINS', value: { stringValue: 'bendahara' } } } } };
  (panggilGoogle(FS + ':runQuery', 'post', q) || []).filter(function (x) { return x.document; }).forEach(function (x) {
    const uid = x.document.name.split('/').pop();
    panggilGoogle(FS + '/notifikasi', 'post', { fields: keFs({
      uid: uid, jenis: o.jenis || 'galat', ikon: o.ikon || 'CloudUpload', judul: judul, isi: isi, tautan: o.tautan || null, waktu: new Date(), dibaca: false,
    }) });
    try { kirimPush(uid, judul, isi, o.tautan); } catch (e) { /* abaikan */ }
  });
}

/* ======================= NOTIFIKASI PUSH (FCM) ======================= */

// Mengirim push ke semua perangkat milik pengguna; token yang sudah tidak berlaku dihapus
function kirimPush(uid, judul, isi, rute) {
  const prof = bacaDok('pengguna/' + uid) || {};
  const token = prof.token_fcm || [];
  if (!token.length) return 0;
  const tautan = 'https://ramli95.github.io/sibos/#' + (rute || '/notifikasi');
  let terkirim = 0;
  const sisa = [];
  token.forEach(function (t) {
    const r = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + KONFIG.PROYEK + '/messages:send', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': KONFIG.PROYEK },
      payload: JSON.stringify({ message: {
        token: t,
        notification: { title: judul, body: isi },
        webpush: { fcm_options: { link: tautan } },
        data: { link: tautan },
      } }),
    });
    const kode = r.getResponseCode();
    if (kode === 200) { terkirim++; sisa.push(t); }
    else if (kode !== 404 && r.getContentText().indexOf('UNREGISTERED') < 0 && r.getContentText().indexOf('INVALID_ARGUMENT') < 0) sisa.push(t);
  });
  if (sisa.length !== token.length) tulisDok('pengguna/' + uid, { token_fcm: sisa });
  return terkirim;
}

function dariNilai(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('mapValue' in v) return dariFs(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dariNilai);
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  return null;
}
function dariFs(f) { const o = {}; Object.keys(f).forEach(function (k) { o[k] = dariNilai(f[k]); }); return o; }
function keNilai(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(keNilai) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: keFs(v) } };
  return { stringValue: String(v) };
}
function keFs(o) { const f = {}; Object.keys(o).forEach(function (k) { f[k] = keNilai(o[k]); }); return f; }
