// Data bersama tab Papan Informasi: ringkasan periode, profil sekolah, dan pejabat penanda tangan.
import { ref, computed, onMounted } from 'vue'
import { useKas } from '@/stores/kas'
import { useBelanja } from '@/stores/belanja'
import { useRkas } from '@/stores/rkas'
import { modePratinjau } from '@/services/firebase'
import { muatProfilSekolah } from '@/services/cetak'
import { muatPejabat, pejabatPada } from '@/services/pejabat'
import { PEJABAT_CONTOH } from '@/config/sekolahAwal'
import { ringkasInformasi } from '@/utils/informasi'

export function pakaiInformasi(periode) {
  const kas = useKas()
  const belanja = useBelanja()
  const rkas = useRkas()
  const profil = ref(null)
  const pejabat = ref([])
  onMounted(async () => {
    profil.value = await muatProfilSekolah().catch(() => null)
    pejabat.value = modePratinjau ? PEJABAT_CONTOH : await muatPejabat().catch(() => [])
  })
  const r = computed(() => ringkasInformasi({ uraian: rkas.uraian, belanja: belanja.daftar, kas: kas.kas, periode: periode() }))
  // Tanggal dokumen: akhir periode, atau hari ini bila periode belum berakhir
  const tanggal = computed(() => {
    const p = r.value.periode
    const akhir = new Date(kas.tahun, p.sampai + 1, 0)
    const kini = new Date()
    const t = akhir < kini ? akhir : kini
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  })
  const kepsek = computed(() => pejabatPada(pejabat.value, 'kepala_sekolah', tanggal.value))
  const bendahara = computed(() => pejabatPada(pejabat.value, 'bendahara_bosp', tanggal.value))
  return { kas, belanja, rkas, profil, pejabat, r, tanggal, kepsek, bendahara }
}
