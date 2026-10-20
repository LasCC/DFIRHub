import {
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
  Mail,
  Monitor,
  MousePointerClick,
  Package,
  Play,
  Repeat,
  Share2,
  ShieldCheck,
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

export const getCategoryIcon = (
  category: string,
  fallback: CategoryIcon = LayoutGrid
): CategoryIcon => {
  const id = category.toLowerCase();
  return categoryIcons[id] ?? registryCategoryIcons[id] ?? fallback;
};
