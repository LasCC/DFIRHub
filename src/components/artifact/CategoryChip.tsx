import {
  ArrowLeftRight,
  Box,
  FileText,
  Globe,
  Layers,
  Monitor,
  ShieldCheck,
} from "lucide-react";

import type { CategoryStyle } from "@/lib/categoryStyles";

import { getCategoryStyle } from "@/lib/categoryStyles";

interface CategoryChipProps {
  category: string;
  version: string;
  isCompound?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  antivirus: ShieldCheck,
  apps: Box,
  browsers: Globe,
  compound: Layers,
  logs: FileText,
  p2p: ArrowLeftRight,
  windows: Monitor,
};

// categoryStyles keys are capitalized ("Windows", "P2P"); normalize lookup.
const SPECIAL_KEYS: Record<string, string> = { p2p: "P2P" };

function resolveCategoryStyle(category: string): CategoryStyle {
  const lower = category.toLowerCase();
  const key =
    SPECIAL_KEYS[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1);
  return getCategoryStyle(key);
}

export function CategoryChip({
  category,
  version,
  isCompound,
}: CategoryChipProps) {
  const categoryLower = category.toLowerCase();
  const Icon = iconMap[categoryLower] || Monitor;
  const style = resolveCategoryStyle(category);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        className={`group inline-flex items-center gap-2 rounded-full border border-current/40 px-4 py-2 font-medium text-xs transition-colors ${style.bg} ${style.text}`}
        href={`/artifacts?category=${categoryLower}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{category}</span>
      </a>

      {isCompound && categoryLower !== "compound" && (
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/5 px-4 py-2 font-medium text-cyan-700 text-xs dark:text-cyan-400">
          <Layers className="h-3.5 w-3.5" />
          <span>Compound</span>
        </span>
      )}

      <span className="inline-flex items-center rounded-full border border-overlay/[0.08] bg-overlay/[0.04] px-3 py-2 font-medium text-muted-foreground text-xs">
        v{version}
      </span>
    </div>
  );
}
