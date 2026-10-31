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
  Pencil, Trash2, Save, Filter, ListChecks, FileDown, Phone, Landmark, BadgeCheck, CircleX, ArrowRight, Table2, Columns3, Wand2, UserRound, HeartHandshake, Briefcase, ScrollText, SkipForward, Clock, ChevronLeft,
  PanelLeftClose, PanelLeftOpen, Pin, PinOff, FileText, Expand, Type, Bold, ArrowUp, ImagePlus, Globe, Frame,
  ChartPie, ListTree, Layers, GitCompareArrows, FileCheck, FilePen, ShoppingBag, Cpu, Library, Scale, Gauge, ChartColumn, Sigma, Calculator, Coins, Percent, ArrowDownUp, Minus, Undo2, MoveRight, BookCopy, Hammer, FileStack, FolderTree, ChevronsUpDown, ChevronsDownUp, Equal, TrendingDown, Target, Wrench, CalendarRange, Flag, BadgeAlert, SearchX, Grid3x3, CopyCheck, Activity, UtensilsCrossed, Bus, Package, Ellipsis, Archive, CalendarPlus,
} from 'lucide-vue-next'

const DAFTAR = {
  LayoutDashboard, ClipboardList, ShoppingCart, ReceiptText, BookOpenText, FileBarChart, ArrowRightLeft, Boxes,
  IdCard, Users, Wallet, FileSignature, TrendingUp, Database, Store, BookMarked, Tags, Mailbox, FileUp, History,
  Settings, School, Image, UserCheck, UsersRound, Printer, HardDrive, ShieldCheck, Stamp, Handshake, PackageCheck,
  Bell, BellRing, Sun, Moon, Monitor, LogOut, Menu, X, ChevronDown, ChevronRight, Lock, User, Eye, EyeOff, KeyRound,
  Mail, Info, Sparkles, CircleCheck, TriangleAlert, Download, Upload, Search, Plus, CloudUpload, WifiOff,
  FileSpreadsheet, Construction, ArrowLeft, CalendarDays, Banknote, PiggyBank, Building2, Smartphone, RefreshCw,
  UserPlus, Copy, UserCog, Power, Repeat, ArrowDown, CircleAlert, Link,
  Pencil, Trash2, Save, Filter, ListChecks, FileDown, Phone, Landmark, BadgeCheck, CircleX, ArrowRight, Table2, Columns3, Wand2, UserRound, HeartHandshake, Briefcase, ScrollText, SkipForward, Clock, ChevronLeft,
  PanelLeftClose, PanelLeftOpen, Pin, PinOff, FileText, Expand, Type, Bold, ArrowUp, ImagePlus, Globe, Frame,
  ChartPie, ListTree, Layers, GitCompareArrows, FileCheck, FilePen, ShoppingBag, Cpu, Library, Scale, Gauge, ChartColumn, Sigma, Calculator, Coins, Percent, ArrowDownUp, Minus, Undo2, MoveRight, BookCopy, Hammer, FileStack, FolderTree, ChevronsUpDown, ChevronsDownUp, Equal, TrendingDown, Target, Wrench, CalendarRange, Flag, BadgeAlert, SearchX, Grid3x3, CopyCheck, Activity, UtensilsCrossed, Bus, Package, Ellipsis, Archive, CalendarPlus,
}

const props = defineProps({ nama: { type: String, required: true }, ukuran: { type: [Number, String], default: 18 } })
</script>

<template>
  <component :is="DAFTAR[props.nama] || Info" :size="Number(props.ukuran)" :stroke-width="2" aria-hidden="true" class="shrink-0" />
</template>
