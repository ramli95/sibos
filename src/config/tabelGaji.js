// Tabel gaji pokok BAWAAN (disalin dari lampiran peraturan di Project, diperiksa terhadap sheet dB-SKPG).
// Tabel yang dipakai menghitung bisa diubah Bendahara (sekolah/tabel_gaji) bila ada peraturan gaji baru —
// lihat pasangTabelGaji(). Selama belum diubah, tabel bawaan di bawah ini yang berlaku.
import { shallowRef } from 'vue'
// PNS  : PP 5/2024 (perubahan ke-19 PP 7/1977), berlaku 1 Januari 2024.
// PPPK : Perpres 11/2024 (perubahan Perpres 98/2020), berlaku 1 Januari 2024.
// Bentuk: { golongan: { mkg: gajiPokok } }. MKG = masa kerja golongan (tahun).

const baris = (mkgAwal, langkah, nilai) => Object.fromEntries(nilai.map((v, i) => [mkgAwal + i * langkah, v]))

export const GAJI_PNS = {
  'I/a': baris(0, 2, [1685700, 1738800, 1793500, 1850000, 1908300, 1968400, 2030400, 2094300, 2160300, 2228300, 2298500, 2370900, 2445500, 2522600]),
  'I/b': baris(3, 2, [1840800, 1898800, 1958600, 2020300, 2083900, 2149600, 2217300, 2287100, 2359100, 2433400, 2510100, 2589100, 2670700]),
  'I/c': baris(3, 2, [1918700, 1979100, 2041500, 2105800, 2172100, 2240500, 2311100, 2383900, 2458900, 2536400, 2616300, 2698700, 2783700]),
  'I/d': baris(3, 2, [1999900, 2062900, 2127800, 2194800, 2264000, 2335300, 2408800, 2484700, 2562900, 2643700, 2726900, 2812800, 2901400]),
  'II/a': { 0: 2184000, 1: 2218400, ...baris(3, 2, [2288200, 2360300, 2434600, 2511300, 2590400, 2672000, 2756200, 2843000, 2932500, 3024900, 3120100, 3218400, 3319800, 3424300, 3532200, 3643400]) },
  'II/b': baris(3, 2, [2385000, 2460100, 2537600, 2617500, 2700000, 2785000, 2872700, 2963200, 3056500, 3152800, 3252100, 3354500, 3460200, 3569200, 3681600, 3797500]),
  'II/c': baris(3, 2, [2485900, 2564200, 2645000, 2728300, 2814200, 2902800, 2994300, 3088600, 3185800, 3286200, 3389700, 3496400, 3606500, 3720100, 3837300, 3958200]),
  'II/d': baris(3, 2, [2591100, 2672700, 2756800, 2843700, 2933200, 3025600, 3120900, 3219200, 3320600, 3425200, 3533100, 3644300, 3759100, 3877500, 3999600, 4125600]),
  'III/a': baris(0, 2, [2785700, 2873500, 2964000, 3057300, 3153600, 3252900, 3355400, 3461100, 3570100, 3682500, 3798500, 3918100, 4041500, 4168800, 4300100, 4435500, 4575200]),
  'III/b': baris(0, 2, [2903600, 2995000, 3089300, 3186600, 3287000, 3390500, 3497300, 3607500, 3721100, 3838300, 3959200, 4083900, 4212500, 4345100, 4482000, 4623200, 4768800]),
  'III/c': baris(0, 2, [3026400, 3121700, 3220000, 3321400, 3426000, 3533900, 3645200, 3760100, 3878500, 4000600, 4126600, 4256600, 4390700, 4528900, 4671600, 4818700, 4970500]),
  'III/d': baris(0, 2, [3154400, 3253700, 3356200, 3461900, 3571000, 3683400, 3799400, 3919100, 4042500, 4169900, 4301200, 4436700, 4576400, 4720500, 4869200, 5022500, 5180700]),
  'IV/a': baris(0, 2, [3287800, 3391400, 3498200, 3608400, 3722000, 3839200, 3960200, 4084900, 4213500, 4346200, 4483100, 4624300, 4770000, 4920200, 5075200, 5235000, 5399900]),
  'IV/b': baris(0, 2, [3426900, 3534800, 3646200, 3761000, 3879500, 4001600, 4127700, 4257700, 4391800, 4530100, 4672800, 4819900, 4971700, 5128300, 5289800, 5456400, 5628300]),
  'IV/c': baris(0, 2, [3571900, 3684400, 3800400, 3920100, 4043600, 4170900, 4302300, 4437800, 4577500, 4721700, 4870400, 5023800, 5182000, 5345200, 5513600, 5687200, 5866400]),
  'IV/d': baris(0, 2, [3723000, 3840200, 3961200, 4085900, 4214600, 4347300, 4484300, 4625500, 4771200, 4921400, 5076400, 5236300, 5401200, 5571400, 5746800, 5927800, 6114500]),
  'IV/e': baris(0, 2, [3880400, 4002700, 4128700, 4258700, 4392900, 4531200, 4673900, 4821100, 4973000, 5129600, 5291200, 5457800, 5629700, 5807000, 5989900, 6178600, 6373200]),
}

export const GAJI_PPPK = {
  I: baris(0, 2, [1938500, 1999500, 2062500, 2127500, 2194500, 2263600, 2334900, 2408400, 2484300, 2562500, 2643200, 2726500, 2812400, 2900900]),
  II: baris(3, 2, [2116900, 2183600, 2252400, 2323300, 2396500, 2472000, 2549800, 2630100, 2713000, 2798400, 2886600, 2977500, 3071200]),
  III: baris(3, 2, [2206500, 2276000, 2347700, 2421600, 2497900, 2576500, 2657700, 2741400, 2827700, 2916800, 3008700, 3103400, 3201200]),
  IV: baris(3, 2, [2299800, 2372300, 2447000, 2524000, 2603500, 2685500, 2770100, 2857400, 2947400, 3040200, 3135900, 3234700, 3336600]),
  V: { 0: 2511500, 1: 2551100, ...baris(3, 2, [2631400, 2714300, 2799800, 2888000, 2978900, 3072800, 3169500, 3269400, 3372300, 3478500, 3588100, 3701100, 3817700, 3937900, 4061900, 4189900]) },
  VI: baris(3, 2, [2742800, 2829100, 2918200, 3010100, 3105000, 3202700, 3303600, 3407700, 3515000, 3625700, 3739900, 3857700, 3979200, 4104500, 4233800, 4367100]),
  VII: baris(3, 2, [2858800, 2948800, 3041700, 3137500, 3236300, 3338200, 3443400, 3551800, 3663700, 3779100, 3898100, 4020800, 4147500, 4278100, 4412800, 4551800]),
  VIII: baris(3, 2, [2979700, 3073500, 3170300, 3270200, 3373200, 3479400, 3589000, 3702000, 3818600, 3938900, 4063000, 4190900, 4322900, 4459100, 4599500, 4744400]),
  IX: baris(0, 2, [3203600, 3304400, 3408500, 3515900, 3626600, 3740800, 3858600, 3980200, 4105500, 4234800, 4368200, 4505800, 4647700, 4794100, 4945100, 5100800, 5261500]),
  X: baris(0, 2, [3339100, 3444200, 3552700, 3664600, 3780000, 3899100, 4021900, 4148500, 4279200, 4414000, 4553000, 4696400, 4844300, 4996900, 5154200, 5316600, 5484000]),
  XI: baris(0, 2, [3480300, 3589900, 3703000, 3819600, 3939900, 4064000, 4192000, 4324000, 4460200, 4600700, 4745600, 4895000, 5049200, 5208200, 5372300, 5541500, 5716000]),
  XII: baris(0, 2, [3627500, 3741800, 3859600, 3981200, 4106600, 4235900, 4369300, 4506900, 4648900, 4795300, 4946300, 5102100, 5262800, 5428500, 5599500, 5775900, 5957800]),
  XIII: baris(0, 2, [3781000, 3900000, 4022900, 4149600, 4280300, 4415100, 4554100, 4697600, 4845500, 4998100, 5155500, 5317900, 5485400, 5658200, 5836400, 6020200, 6209800]),
  XIV: baris(0, 2, [3940900, 4065000, 4193000, 4325100, 4461300, 4601800, 4746800, 4896300, 5050500, 5209500, 5373600, 5542900, 5717400, 5897500, 6083200, 6274800, 6472500]),
  XV: baris(0, 2, [4107600, 4237000, 4370400, 4508100, 4650000, 4796500, 4947600, 5103400, 5264100, 5429900, 5600900, 5777300, 5959300, 6147000, 6340600, 6540300, 6746200]),
  XVI: baris(0, 2, [4281400, 4416200, 4555300, 4698700, 4846700, 4999400, 5156800, 5319300, 5486800, 5659600, 5837800, 6021700, 6211400, 6407000, 6608800, 6816900, 7031600]),
  XVII: baris(0, 2, [4462500, 4603000, 4748000, 4897500, 5051800, 5210900, 5375000, 5544300, 5718900, 5899000, 6084800, 6276400, 6474100, 6678000, 6888300, 7105300, 7329000]),
}

export const DASAR_BAWAAN = { PNS: 'PP 5/2024', PPPK: 'Perpres 11/2024', berlaku: '2024-01-01' }

// Tabel yang sedang berlaku (reaktif: perhitungan di layar ikut berubah saat tabel disimpan)
const aktif = shallowRef({ PNS: GAJI_PNS, PPPK: GAJI_PPPK, dasar: { ...DASAR_BAWAAN }, ubahan: false })
export const tabelAktif = () => aktif.value

/** Tabel → baris { jenis, golongan, mkg, gaji_pokok } (bentuk penyimpanan & ekspor Excel) */
export function keBaris(t = aktif.value) {
  const hasil = []
  ;['PNS', 'PPPK'].forEach((jenis) => Object.entries(t[jenis]).forEach(([golongan, isi]) =>
    Object.entries(isi).forEach(([mkg, gp]) => hasil.push({ jenis, golongan, mkg: Number(mkg), gaji_pokok: Number(gp) }))))
  return hasil
}
/** Baris → tabel { PNS: { gol: { mkg: gp } }, PPPK: … } */
export function dariBaris(baris = []) {
  const t = { PNS: {}, PPPK: {} }
  baris.forEach((b) => {
    const j = String(b.jenis || '').toUpperCase() === 'PPPK' ? 'PPPK' : 'PNS'
    const g = String(b.golongan || '').trim()
    const gp = Number(b.gaji_pokok) || 0
    if (!g || gp <= 0 || b.mkg === '' || b.mkg == null) return
    ;(t[j][g] ||= {})[Number(b.mkg)] = gp
  })
  return t
}
/** Dipanggil saat data gaji dimuat: dok sekolah/tabel_gaji { baris, dasar_pns, dasar_pppk, berlaku } atau null (= bawaan) */
export function pasangTabelGaji(dok) {
  if (!dok?.baris?.length) { aktif.value = { PNS: GAJI_PNS, PPPK: GAJI_PPPK, dasar: { ...DASAR_BAWAAN }, ubahan: false }; return }
  const t = dariBaris(dok.baris)
  aktif.value = {
    PNS: Object.keys(t.PNS).length ? t.PNS : GAJI_PNS, PPPK: Object.keys(t.PPPK).length ? t.PPPK : GAJI_PPPK,
    dasar: { PNS: dok.dasar_pns || DASAR_BAWAAN.PNS, PPPK: dok.dasar_pppk || DASAR_BAWAAN.PPPK, berlaku: dok.berlaku || '' }, ubahan: true,
  }
}

/** Gaji pokok menurut tabel: MKG dibulatkan ke bawah ke baris terdekat yang tersedia. null bila golongan tak dikenal. */
export function gajiPokokTabel(status, golongan, mkg) {
  const t = aktif.value[status === 'PPPK' ? 'PPPK' : 'PNS'][golongan]
  if (!t) return null
  const kunci = Object.keys(t).map(Number).sort((a, b) => a - b)
  const pakai = kunci.filter((k) => k <= Math.max(0, Number(mkg) || 0)).pop() ?? kunci[0]
  return { gaji_pokok: t[pakai], mkg_tabel: pakai }
}

/** MKG berikutnya yang menaikkan gaji pokok (untuk KGB): baris tabel berikutnya setelah MKG sekarang */
export function mkgBerikut(status, golongan, mkg) {
  const t = aktif.value[status === 'PPPK' ? 'PPPK' : 'PNS'][golongan]
  if (!t) return null
  const k = Object.keys(t).map(Number).sort((a, b) => a - b).find((x) => x > (Number(mkg) || 0))
  return k === undefined ? null : { mkg: k, gaji_pokok: t[k] }
}
