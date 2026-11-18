import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Battery,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  Download,
  Droplet,
  Droplets,
  FileSpreadsheet,
  FileText,
  Filter,
  FlaskConical,
  Home,
  Info,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Lock,
  LogOut,
  Network,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  Router,
  Share2,
  Shield,
  ShieldCheck,
  Sliders,
  SunMoon,
  Table,
  Trash2,
  Users,
  Waves,
  Zap,
} from "lucide-react";

export type IconRole =
  | "home"
  | "caretDown"
  | "theme"
  | "clock"
  | "demo"
  | "live"
  | "sim"
  | "tank"
  | "level"
  | "volume"
  | "distance"
  | "battery"
  | "signal"
  | "pump"
  | "fill"
  | "drain"
  | "consumption"
  | "bell"
  | "ok"
  | "info"
  | "warn"
  | "critical"
  | "emergency"
  | "gateway"
  | "table"
  | "filter"
  | "add"
  | "edit"
  | "remove"
  | "restore"
  | "share"
  | "csv"
  | "download"
  | "users"
  | "audit"
  | "signOut"
  | "lock"
  | "methodology"
  | "glossary"
  | "diagram"
  | "spinner"
  | "tip"
  | "layers"
  | "overview"
  | "tankDetail"
  | "analytics"
  | "alerts"
  | "settings"
  | "admin";

export const ICON: Record<IconRole, LucideIcon> = {
  home: Home,
  caretDown: ChevronDown,
  theme: SunMoon,
  clock: Clock,
  demo: FlaskConical,
  live: Radio,
  sim: FlaskConical,
  tank: Database,
  level: Waves,
  volume: Droplets,
  distance: ArrowUpDown,
  battery: Battery,
  signal: Radio,
  pump: Zap,
  fill: ArrowUp,
  drain: ArrowDown,
  consumption: Activity,
  bell: Bell,
  ok: CheckCircle2,
  info: Info,
  warn: AlertTriangle,
  critical: AlertCircle,
  emergency: AlertOctagon,
  gateway: Router,
  table: Table,
  filter: Filter,
  add: Plus,
  edit: Pencil,
  remove: Trash2,
  restore: RotateCcw,
  share: Share2,
  csv: FileSpreadsheet,
  download: Download,
  users: Users,
  audit: ShieldCheck,
  signOut: LogOut,
  lock: Lock,
  methodology: BookOpen,
  glossary: FileText,
  diagram: Network,
  spinner: Loader2,
  tip: Lightbulb,
  layers: Layers,
  overview: LayoutDashboard,
  tankDetail: Droplet,
  analytics: BarChart3,
  alerts: Bell,
  settings: Sliders,
  admin: Shield,
};
