// Membuka pop-up Detail Anggaran dari tab mana pun (Kertas Kerja, Per Bulan): lihat saja pada versi biasa,
// bisa diubah bila versi yang dipilih adalah draf pergeseran/perubahan.
import { ref, computed, onMounted } from 'vue'
import { useRkas } from '@/stores/rkas'
import { useBelanja } from '@/stores/belanja'
import { useAuth } from '@/stores/auth'
import { useNotifikasi } from '@/stores/notifikasi'
import { simpanUraianDraf } from '@/services/rkas'
import { kunciUraian } from '@/utils/belanja'

export function pakaiDetail() {
  const rkas = useRkas()
  const belanja = useBelanja()
  const auth = useAuth()
  const notif = useNotifikasi()
  onMounted(() => belanja.muat({ tahun: rkas.tahun }).catch(() => {}))
  const detail = ref(null)
  const menyimpan = ref(false)
  const bolehUbah = computed(() => !!rkas.versi?.draf && auth.isAdmin)
  const buka = (u) => { detail.value = { uraian: u, dibelanjakan: [...(belanja.pemakaian.get(kunciUraian(u))?.bulanKomitmen || Array(12).fill(0))] } }
  async function simpan(baru) {
    menyimpan.value = true
    try { rkas.pasangUraian(await simpanUraianDraf(rkas.versi, rkas.uraian, detail.value.uraian, baru)); await rkas.muatDaftar(); detail.value = null; notif.kabari('Draf diperbarui.') }
    catch (e) { notif.kabari(e.message, 'galat') } finally { menyimpan.value = false }
  }
  async function hapus() { if (confirm(`Hapus uraian "${detail.value.uraian.uraian}" dari draf?`)) await simpan(null) }
  return { detail, menyimpan, bolehUbah, buka, simpan, hapus }
}
