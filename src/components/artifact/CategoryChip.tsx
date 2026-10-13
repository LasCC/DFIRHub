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

export function CategoryChip({ category, isCompound }: CategoryChipProps) {
  const categoryLower = category.toLowerCase();
  const Icon = iconMap[categoryLower] || Monitor;
  const style = resolveCategoryStyle(category);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-foreground text-sm transition-colors hover:bg-muted"
        href={`/artifacts?category=${categoryLower}`}
      >
        <Icon className={`h-3.5 w-3.5 ${style.text}`} />
        <span>{category}</span>
      </a>

      {isCompound && categoryLower !== "compound" && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-foreground text-sm">
          <Layers className="h-3.5 w-3.5 text-cyan-800 dark:text-cyan-400" />
          <span>Compound</span>
        </span>
      )}
    </div>
  );
}
