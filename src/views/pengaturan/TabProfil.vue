<script setup>
import { reactive } from 'vue'
import { SEKOLAH_AWAL } from '@/config/sekolahAwal'
import Ikon from '@/components/Ikon.vue'

// Sementara memakai data awal; penyimpanan ke Firestore `sekolah/profil` disambungkan setelah Firebase siap.
const f = reactive({ ...SEKOLAH_AWAL, kop_baris: [...SEKOLAH_AWAL.kop_baris] })

const kelompok = [
  { judul: 'Identitas', ikon: 'School', warna: 'bg-blue-100 text-biru dark:bg-blue-900/40 dark:text-blue-300', isian: [
    ['nama_arkas', 'Nama versi ARKAS'], ['nama_pemda', 'Nama versi Pemda'], ['npsn', 'NPSN', true], ['status', 'Status'],
  ] },
  { judul: 'Keuangan & Pajak', ikon: 'ReceiptText', warna: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300', isian: [
    ['kode_sekolah_pemda', 'Kode sekolah Pemda (SIMAKDA)', true], ['npwp', 'NPWP satuan pendidikan', true], ['id_subunit', 'ID Subunit e-Bupot', true],
  ] },
  { judul: 'Kontak', ikon: 'Mail', warna: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', isian: [
    ['alamat', 'Alamat'], ['telepon', 'Telepon'], ['email', 'Email'],
  ] },
]
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
    <div class="space-y-5">
      <section v-for="k in kelompok" :key="k.judul" class="kartu p-5">
        <h3 class="mb-4 flex items-center gap-2.5 font-bold">
          <span :class="['grid h-8 w-8 place-items-center rounded-lg', k.warna]"><Ikon :nama="k.ikon" :ukuran="17" /></span>{{ k.judul }}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="[kunci, label, mono] in k.isian" :key="kunci" :class="kunci.startsWith('nama') || kunci === 'alamat' ? 'sm:col-span-2' : ''">
            <label class="label" :for="kunci">{{ label }}</label>
            <input :id="kunci" v-model="f[kunci]" :class="['masukan', mono && 'kode']" :placeholder="kunci === 'id_subunit' ? 'Diisi Bendahara' : ''" />
          </div>
        </div>
      </section>
    </div>

    <!-- Pratinjau kop surat F4 -->
    <section class="kartu h-fit p-5 xl:sticky xl:top-24">
      <h3 class="mb-3 flex items-center gap-2.5 font-bold">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"><Ikon nama="Printer" :ukuran="17" /></span>
        Pratinjau kop surat
      </h3>
      <div class="rounded-lg bg-white p-4 text-black shadow-inner ring-1 ring-slate-200" style="font-family: 'Times New Roman', Times, serif">
        <div class="flex items-center gap-2 border-b-[3px] border-double border-black pb-2">
          <div class="grid h-12 w-10 shrink-0 place-items-center rounded border border-dashed border-slate-400 text-[8px] text-slate-500">Logo Pemkot</div>
          <div class="flex-1 text-center leading-tight">
            <div v-for="(b, i) in f.kop_baris" :key="i" :class="i === f.kop_baris.length - 1 ? 'text-[13px] font-bold' : 'text-[11px] font-bold'">{{ b }}</div>
            <div class="text-[9px]">{{ f.alamat }} Telp. {{ f.telepon }}</div>
            <div class="text-[9px]">NPSN {{ f.npsn }} · Email: {{ f.email }}</div>
          </div>
          <div class="grid h-12 w-10 shrink-0 place-items-center rounded border border-dashed border-slate-400 text-[8px] text-slate-500">Tut Wuri</div>
        </div>
      </div>
      <p class="mt-3 flex gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Ikon nama="Info" :ukuran="14" class="mt-0.5" /> Logo diunggah di tab Kop &amp; Logo setelah penghubung Drive tersambung.
      </p>
      <button class="tombol-utama mt-4 w-full" disabled title="Aktif setelah Firebase tersambung"><Ikon nama="CircleCheck" :ukuran="17" /> Simpan profil</button>
    </section>
  </div>
</template>
