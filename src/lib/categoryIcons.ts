import {
  ArrowLeftRight,
  Box,
  FileText,
  Globe,
  Layers,
  LayoutGrid,
  Monitor,
  ShieldCheck,
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

export const getCategoryIcon = (
  category: string,
  fallback: CategoryIcon = LayoutGrid
): CategoryIcon => categoryIcons[category.toLowerCase()] ?? fallback;
