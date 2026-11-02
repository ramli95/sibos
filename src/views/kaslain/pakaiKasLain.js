// Data bersama menu Kas Lain & Iuran (dimuat sekali per sesi). Koleksi Firestore:
//   kas_lain_pos        → pos kas (Arisan, Dana Sosial, …)
//   kas_lain_transaksi  → buku kas per pos (masuk/keluar); setoran & pembayaran utang tercatat otomatis
//   kas_lain_tagihan    → tagihan per orang per periode, berisi daftar setoran
//   utang_piutang       → pinjaman (piutang = orang berutang ke kas; utang = kas berutang ke pihak lain)
import { ref, computed } from 'vue'
import { muatSemua, simpanSatu, hapusSatu } from '@/services/catatan'
import { muatBahan, namaGelar } from '@/services/bahanBelanja'
import { modePratinjau } from '@/services/firebase'
import { rupiah, romawi } from '@/utils/format'
import { POS_BAWAAN, hitungTagihan, hitungUtang, saldoPos, idAcak, labelPeriode, nomorKwitansi } from '@/utils/kasLain'

const pos = ref([])
const transaksi = ref([])
const tagihanMentah = ref([])
const utangMentah = ref([])
const orang = ref([]) // pegawai: { id, nama, no_wa, jabatan }
const memuat = ref(false)
let dimuat = false

const sekarang = () => new Date().toISOString()
const hariIni = () => new Date().toISOString().slice(0, 10)

function ganti(daftar, id, data) {
  const i = daftar.value.findIndex((x) => x.id === id)
  if (i >= 0) daftar.value[i] = { id, ...data }; else daftar.value.push({ id, ...data })
  daftar.value = [...daftar.value]
}

async function isiContoh() {
  // Mode Pratinjau: contoh data agar fitur bisa dicoba
  const ids = []
  for (const [i, p] of POS_BAWAAN.entries()) ids.push(await simpanSatu('kas_lain_pos', null, { ...p, saldo_awal: i === 1 ? 750000 : 0, aktif: true, urut: i, dibuat: sekarang() }))
  const th = new Date().getFullYear()
  const bl = String(new Date().getMonth() + 1).padStart(2, '0')
  const per = `${th}-${bl}`
  const peg = orang.value.slice(0, 5)
  for (const [i, p] of peg.entries()) {
    const setoran = i < 2 ? [{ id: idAcak(), tanggal: `${per}-03`, nilai: 100000, cara: 'tunai', no_kwitansi: `KS-000${i + 1}/${romawi(Number(bl))}/${th}` }] : i === 2 ? [{ id: idAcak(), tanggal: `${per}-05`, nilai: 50000, cara: 'transfer', no_kwitansi: `KS-0003/${romawi(Number(bl))}/${th}` }] : []
    const tid = await simpanSatu('kas_lain_tagihan', null, { pos_id: ids[0], periode: per, orang: { id: p.id, nama: p.nama, no_wa: p.no_wa || '' }, nominal: 100000, jatuh_tempo: `${per}-10`, setoran, dibuat: sekarang() })
    for (const s of setoran) await simpanSatu('kas_lain_transaksi', `st_${s.id}`, { pos_id: ids[0], tanggal: s.tanggal, jenis: 'masuk', nilai: s.nilai, uraian: `Setoran Uang Arisan ${labelPeriode(per)} — ${p.nama}`, pihak: p.nama, orang_id: p.id, tagihan_id: tid, setoran_id: s.id, dibuat: sekarang() })
  }
  await simpanSatu('kas_lain_transaksi', null, { pos_id: ids[1], tanggal: `${per}-08`, jenis: 'keluar', nilai: 500000, uraian: 'Santunan duka keluarga pegawai', pihak: '', dibuat: sekarang() })
  if (peg[3]) await simpanSatu('utang_piutang', null, { arah: 'piutang', pihak: { id: peg[3].id, nama: peg[3].nama, no_wa: peg[3].no_wa || '' }, pos_id: '', tanggal: `${per}-02`, jatuh_tempo: `${per}-25`, nilai: 300000, uraian: 'Pinjaman sementara', bayar: [{ id: idAcak(), tanggal: `${per}-12`, nilai: 100000, ket: 'Cicilan 1' }], dibuat: sekarang() })
}

export function pakaiKasLain() {
  async function muat({ segar = false } = {}) {
    if (dimuat && !segar) return
    memuat.value = true
    try {
      const bahan = await muatBahan().catch(() => ({ pegawai: [] }))
      orang.value = (bahan.pegawai || []).filter((p) => p.aktif !== false).map((p) => ({ id: p.id, nama: namaGelar(p), no_wa: p.no_wa || '', jabatan: p.jabatan || '' }))
      let [a, b, c, d] = await Promise.all(['kas_lain_pos', 'kas_lain_transaksi', 'kas_lain_tagihan', 'utang_piutang'].map((k) => muatSemua(k)))
      if (modePratinjau && !a.length && !dimuat) {
        await isiContoh();
        [a, b, c, d] = await Promise.all(['kas_lain_pos', 'kas_lain_transaksi', 'kas_lain_tagihan', 'utang_piutang'].map((k) => muatSemua(k)))
      }
      pos.value = a; transaksi.value = b; tagihanMentah.value = c; utangMentah.value = d
      dimuat = true
    } finally { memuat.value = false }
  }

  const posUrut = computed(() => [...pos.value].sort((x, y) => (x.urut ?? 99) - (y.urut ?? 99) || String(x.nama).localeCompare(String(y.nama))))
  const posAktif = computed(() => posUrut.value.filter((p) => p.aktif !== false))
  const cariPos = (id) => pos.value.find((p) => p.id === id)
  const namaPos = (id) => cariPos(id)?.nama || '(tanpa pos)'
  const tagihan = computed(() => tagihanMentah.value.map(hitungTagihan))
  const utang = computed(() => utangMentah.value.map(hitungUtang))
  const saldo = (p, sampai) => saldoPos(p, transaksi.value, sampai)
  const kwitansiBaru = (tanggal) => nomorKwitansi(tagihanMentah.value, utangMentah.value, tanggal)

  /* ---------- Pos ---------- */
  async function simpanPos(id, data) {
    const isi = { ...data, dibuat: cariPos(id)?.dibuat || sekarang() }
    const k = await simpanSatu('kas_lain_pos', id, isi, `${id ? 'Mengubah' : 'Menambah'} pos kas lain "${data.nama}"`)
    ganti(pos, k, isi)
    return k
  }
  async function pasangPosBawaan() {
    let n = pos.value.length
    for (const p of POS_BAWAAN) if (!pos.value.some((x) => x.nama === p.nama)) await simpanPos(null, { ...p, saldo_awal: 0, aktif: true, urut: n++ })
  }
  async function hapusPos(p) {
    if (transaksi.value.some((t) => t.pos_id === p.id) || tagihanMentah.value.some((t) => t.pos_id === p.id)) throw new Error('Pos masih punya transaksi/tagihan. Nonaktifkan saja, atau hapus isinya lebih dulu.')
    await hapusSatu('kas_lain_pos', p.id, `Menghapus pos kas lain "${p.nama}"`)
    pos.value = pos.value.filter((x) => x.id !== p.id)
  }

  /* ---------- Transaksi kas ---------- */
  async function simpanTransaksi(id, data, log = true) {
    const isi = { ...data, nilai: Math.round(Number(data.nilai) || 0), dibuat: transaksi.value.find((x) => x.id === id)?.dibuat || sekarang() }
    const k = await simpanSatu('kas_lain_transaksi', id, isi, log ? `${data.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'} ${namaPos(data.pos_id)}: ${data.uraian} (${rupiah(isi.nilai)})` : '')
    ganti(transaksi, k, isi)
    return k
  }
  async function hapusTransaksi(t, log = true) {
    await hapusSatu('kas_lain_transaksi', t.id, log ? `Menghapus transaksi ${namaPos(t.pos_id)}: ${t.uraian}` : '')
    transaksi.value = transaksi.value.filter((x) => x.id !== t.id)
  }

  /* ---------- Tagihan & setoran ---------- */
  async function simpanTagihan(id, data, log = true) {
    const lama = tagihanMentah.value.find((x) => x.id === id)
    const isi = { setoran: [], ...lama, ...data, nominal: Math.round(Number(data.nominal ?? lama?.nominal) || 0), dibuat: lama?.dibuat || sekarang() }
    delete isi.id
    const teks = typeof log === 'string' ? log : log ? `${id ? 'Mengubah' : 'Membuat'} tagihan ${namaPos(isi.pos_id)} ${labelPeriode(isi.periode)} — ${isi.orang?.nama}` : ''
    const k = await simpanSatu('kas_lain_tagihan', id, isi, teks)
    ganti(tagihanMentah, k, isi)
    return k
  }
  /** Buat tagihan untuk banyak orang sekaligus (orang yang sudah punya tagihan pos+periode yang sama dilewati) */
  async function buatTagihanMassal({ pos_id, periode, nominal, jatuh_tempo, ket, daftar }) {
    let n = 0, lewat = 0
    for (const o of daftar) {
      if (tagihanMentah.value.some((t) => t.pos_id === pos_id && t.periode === periode && (t.orang?.id ? t.orang.id === o.id : t.orang?.nama === o.nama))) { lewat++; continue }
      await simpanTagihan(null, { pos_id, periode, nominal: o.nominal ?? nominal, jatuh_tempo, ket: ket || '', orang: { id: o.id || '', nama: o.nama, no_wa: o.no_wa || '' }, setoran: [] }, n === 0 ? `Membuat tagihan ${namaPos(pos_id)} ${labelPeriode(periode)} untuk ${daftar.length} orang` : false)
      n++
    }
    return { n, lewat }
  }
  async function hapusTagihan(t) {
    for (const s of t.setoran || []) await hapusSatu('kas_lain_transaksi', `st_${s.id}`).catch(() => {})
    transaksi.value = transaksi.value.filter((x) => x.tagihan_id !== t.id)
    await hapusSatu('kas_lain_tagihan', t.id, `Menghapus tagihan ${namaPos(t.pos_id)} ${labelPeriode(t.periode)} — ${t.orang?.nama}`)
    tagihanMentah.value = tagihanMentah.value.filter((x) => x.id !== t.id)
  }
  /** Catat setoran → tagihan diperbarui + pemasukan pos tercatat otomatis. Hasil: setoran */
  async function catatSetoran(t, { tanggal, nilai, cara, ket }) {
    const s = { id: idAcak(), tanggal, nilai: Math.round(Number(nilai) || 0), cara: cara || 'tunai', ket: ket || '', no_kwitansi: kwitansiBaru(tanggal) }
    const lama = tagihanMentah.value.find((x) => x.id === t.id)
    await simpanTagihan(t.id, { setoran: [...(lama.setoran || []), s] }, false)
    await simpanSatu('kas_lain_transaksi', `st_${s.id}`, {
      pos_id: t.pos_id, tanggal, jenis: 'masuk', nilai: s.nilai, uraian: `Setoran ${namaPos(t.pos_id)} ${labelPeriode(t.periode)} — ${t.orang?.nama}`,
      pihak: t.orang?.nama || '', orang_id: t.orang?.id || '', tagihan_id: t.id, setoran_id: s.id, no_bukti: s.no_kwitansi, dibuat: sekarang(),
    }, `Menerima setoran ${namaPos(t.pos_id)} ${labelPeriode(t.periode)} dari ${t.orang?.nama} (${rupiah(s.nilai)}) — ${s.no_kwitansi}`)
    ganti(transaksi, `st_${s.id}`, { pos_id: t.pos_id, tanggal, jenis: 'masuk', nilai: s.nilai, uraian: `Setoran ${namaPos(t.pos_id)} ${labelPeriode(t.periode)} — ${t.orang?.nama}`, pihak: t.orang?.nama || '', orang_id: t.orang?.id || '', tagihan_id: t.id, setoran_id: s.id, no_bukti: s.no_kwitansi })
    return s
  }
  async function hapusSetoran(t, s) {
    const lama = tagihanMentah.value.find((x) => x.id === t.id)
    await simpanTagihan(t.id, { setoran: (lama.setoran || []).filter((x) => x.id !== s.id) }, false)
    await hapusSatu('kas_lain_transaksi', `st_${s.id}`, `Membatalkan setoran ${s.no_kwitansi} — ${t.orang?.nama}`)
    transaksi.value = transaksi.value.filter((x) => x.id !== `st_${s.id}`)
  }

  /* ---------- Utang piutang ---------- */
  // Bila pos dipilih: pokok pinjaman & setiap pembayaran ikut tercatat di buku kas pos tersebut.
  const efekPokok = (arah) => (arah === 'piutang' ? 'keluar' : 'masuk')
  const efekBayar = (arah) => (arah === 'piutang' ? 'masuk' : 'keluar')
  async function sinkronKas(u, id) {
    const pokokId = `up_${id}`
    const ada = transaksi.value.filter((x) => x.utang_id === id)
    for (const x of ada) { await hapusSatu('kas_lain_transaksi', x.id).catch(() => {}) }
    transaksi.value = transaksi.value.filter((x) => x.utang_id !== id)
    if (!u.pos_id) return
    const label = u.arah === 'piutang' ? 'Pinjaman kepada' : 'Pinjaman dari'
    const baris = [{ id: pokokId, pos_id: u.pos_id, tanggal: u.tanggal, jenis: efekPokok(u.arah), nilai: u.nilai, uraian: `${label} ${u.pihak?.nama} — ${u.uraian || ''}`.trim(), pihak: u.pihak?.nama || '', utang_id: id }]
    ;(u.bayar || []).forEach((b) => baris.push({ id: `upb_${b.id}`, pos_id: u.pos_id, tanggal: b.tanggal, jenis: efekBayar(u.arah), nilai: b.nilai, uraian: `Pembayaran pinjaman ${u.pihak?.nama}${b.ket ? ` (${b.ket})` : ''}`, pihak: u.pihak?.nama || '', utang_id: id, no_bukti: b.no_kwitansi || '' }))
    for (const r of baris) { const { id: rid, ...isi } = r; await simpanSatu('kas_lain_transaksi', rid, { ...isi, dibuat: sekarang() }); ganti(transaksi, rid, { ...isi, dibuat: sekarang() }) }
  }
  async function simpanUtang(id, data, log = true) {
    const lama = utangMentah.value.find((x) => x.id === id)
    const isi = { bayar: [], ...lama, ...data, nilai: Math.round(Number(data.nilai ?? lama?.nilai) || 0), dibuat: lama?.dibuat || sekarang() }
    delete isi.id
    const teks = typeof log === 'string' ? log : log ? `${id ? 'Mengubah' : 'Mencatat'} ${isi.arah} ${isi.pihak?.nama} (${rupiah(isi.nilai)})` : ''
    const k = await simpanSatu('utang_piutang', id, isi, teks)
    ganti(utangMentah, k, isi)
    await sinkronKas(isi, k)
    return k
  }
  async function catatBayarUtang(u, { tanggal, nilai, ket }) {
    const b = { id: idAcak(), tanggal, nilai: Math.round(Number(nilai) || 0), ket: ket || '', no_kwitansi: kwitansiBaru(tanggal) }
    const lama = utangMentah.value.find((x) => x.id === u.id)
    await simpanUtang(u.id, { bayar: [...(lama.bayar || []), b] }, `Pembayaran ${u.arah} ${u.pihak?.nama} ${rupiah(b.nilai)} — ${b.no_kwitansi}`)
    return b
  }
  async function hapusBayarUtang(u, b) {
    const lama = utangMentah.value.find((x) => x.id === u.id)
    await simpanUtang(u.id, { bayar: (lama.bayar || []).filter((x) => x.id !== b.id) }, `Membatalkan pembayaran ${b.no_kwitansi || ''} ${u.pihak?.nama}`)
  }
  async function hapusUtang(u) {
    await sinkronKas({ ...u, pos_id: '' }, u.id)
    await hapusSatu('utang_piutang', u.id, `Menghapus ${u.arah} ${u.pihak?.nama}`)
    utangMentah.value = utangMentah.value.filter((x) => x.id !== u.id)
  }

  return {
    pos, posUrut, posAktif, transaksi, tagihan, utang, orang, memuat, muat, cariPos, namaPos, saldo, hariIni, kwitansiBaru,
    simpanPos, pasangPosBawaan, hapusPos, simpanTransaksi, hapusTransaksi,
    simpanTagihan, buatTagihanMassal, hapusTagihan, catatSetoran, hapusSetoran,
    simpanUtang, catatBayarUtang, hapusBayarUtang, hapusUtang,
  }
}
