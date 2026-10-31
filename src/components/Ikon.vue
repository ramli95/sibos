<script setup>
// Ikon Lucide berdasarkan nama. Hanya ikon yang didaftarkan di sini yang ikut dibundel.
import {
  LayoutDashboard, ClipboardList, ShoppingCart, ReceiptText, BookOpenText, FileBarChart, ArrowRightLeft, Boxes,
  IdCard, Users, Wallet, FileSignature, TrendingUp, Database, Store, BookMarked, Tags, Mailbox, FileUp, History,
  Settings, School, Image, UserCheck, UsersRound, Printer, HardDrive, ShieldCheck, Stamp, Handshake, PackageCheck,
  Bell, BellRing, Sun, Moon, Monitor, LogOut, Menu, X, ChevronDown, ChevronRight, Lock, User, Eye, EyeOff, KeyRound,
  Mail, Info, Sparkles, CircleCheck, TriangleAlert, Download, Upload, Search, Plus, CloudUpload, WifiOff,
  FileSpreadsheet, Construction, ArrowLeft, CalendarDays, Banknote, PiggyBank, Building2, Smartphone, RefreshCw,
  UserPlus, Copy, UserCog, Power, Repeat, ArrowDown, CircleAlert, Link,
} from 'lucide-vue-next'

const DAFTAR = {
  LayoutDashboard, ClipboardList, ShoppingCart, ReceiptText, BookOpenText, FileBarChart, ArrowRightLeft, Boxes,
  IdCard, Users, Wallet, FileSignature, TrendingUp, Database, Store, BookMarked, Tags, Mailbox, FileUp, History,
  Settings, School, Image, UserCheck, UsersRound, Printer, HardDrive, ShieldCheck, Stamp, Handshake, PackageCheck,
  Bell, BellRing, Sun, Moon, Monitor, LogOut, Menu, X, ChevronDown, ChevronRight, Lock, User, Eye, EyeOff, KeyRound,
  Mail, Info, Sparkles, CircleCheck, TriangleAlert, Download, Upload, Search, Plus, CloudUpload, WifiOff,
  FileSpreadsheet, Construction, ArrowLeft, CalendarDays, Banknote, PiggyBank, Building2, Smartphone, RefreshCw,
  UserPlus, Copy, UserCog, Power, Repeat, ArrowDown, CircleAlert, Link,
}

const props = defineProps({ nama: { type: String, required: true }, ukuran: { type: [Number, String], default: 18 } })
</script>

<template>
  <component :is="DAFTAR[props.nama] || Info" :size="Number(props.ukuran)" :stroke-width="2" aria-hidden="true" class="shrink-0" />
</template>
