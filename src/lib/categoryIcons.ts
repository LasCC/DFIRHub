import {
  Activity,
  AppWindow,
  ArrowLeftRight,
  Box,
  Briefcase,
  Cloud,
  Cog,
  Copy,
  Cpu,
  Crosshair,
  FileText,
  Globe,
  KeyRound,
  Layers,
  LayoutGrid,
  Lock,
  Mail,
  Monitor,
  MonitorSmartphone,
  MousePointerClick,
  Package,
  Play,
  Repeat,
  ScrollText,
  Share2,
  ShieldCheck,
  SquareTerminal,
  Usb,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

export type CategoryIcon = ComponentType<{ className?: string }>;

export const categoryIcons: Record<string, CategoryIcon> = {
  all: LayoutGrid,
  antivirus: ShieldCheck,
  apps: Box,
  browsers: Globe,
  "event log": ScrollText,
  compound: Layers,
  logs: FileText,
  p2p: ArrowLeftRight,
  windows: Monitor,
};

export const registryCategoryIcons: Record<string, CategoryIcon> = {
  autoruns: Repeat,
  "cloud-storage": Cloud,
  devices: Usb,
  "event-logs": FileText,
  "installed-software": Package,
  "microsoft-exchange": Mail,
  "microsoft-office": Briefcase,
  "network-shares": Share2,
  "program-execution": Play,
  registry: KeyRound,
  services: Cog,
  "system-info": Cpu,
  "third-party-applications": AppWindow,
  "threat-hunting": Crosshair,
  "user-accounts": Users,
  "user-activity": MousePointerClick,
  "volume-shadow-copies": Copy,
  "web-browsers": Globe,
};

export const eventLogCategoryIcons: Record<string, CategoryIcon> = {
  application: AppWindow,
  "defender-and-policy": ShieldCheck,
  powershell: SquareTerminal,
  "remote-access": MonitorSmartphone,
  security: Lock,
  sysmon: Activity,
  system: Cpu,
  "third-party": Package,
  "windows-operational": Monitor,
};

export const getCategoryIcon = (
  category: string,
  fallback: CategoryIcon = LayoutGrid
): CategoryIcon => {
  const id = category.toLowerCase();
  return (
    categoryIcons[id] ??
    registryCategoryIcons[id] ??
    eventLogCategoryIcons[id] ??
    fallback
  );
};
