/**
 * Single source of truth for artifact category accent colors.
 *
 * Text classes use a 700-shade in light mode and a 400-shade in dark mode so
 * they stay readable in both themes. Import this everywhere a category color
 * is needed — do not re-declare per-file color maps.
 */
export interface CategoryStyle {
  /** Solid dot/bar accent */
  accent: string;
  /** Subtle tinted background wash */
  bg: string;
  /** Category label text color (dual-theme safe) */
  text: string;
}

const categoryStyles: Record<string, CategoryStyle> = {
  Antivirus: {
    accent: "bg-red-500",
    bg: "bg-red-500/5",
    text: "text-red-700 dark:text-red-400",
  },
  Apps: {
    accent: "bg-emerald-500",
    bg: "bg-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  Browsers: {
    accent: "bg-orange-500",
    bg: "bg-orange-500/5",
    text: "text-orange-700 dark:text-orange-400",
  },
  Compound: {
    accent: "bg-cyan-500",
    bg: "bg-cyan-500/5",
    text: "text-cyan-700 dark:text-cyan-400",
  },
  Logs: {
    accent: "bg-yellow-500",
    bg: "bg-yellow-500/5",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  P2P: {
    accent: "bg-purple-500",
    bg: "bg-purple-500/5",
    text: "text-purple-700 dark:text-purple-400",
  },
  Windows: {
    accent: "bg-blue-500",
    bg: "bg-blue-500/5",
    text: "text-blue-700 dark:text-blue-400",
  },
};

const defaultStyle: CategoryStyle = {
  accent: "bg-zinc-500",
  bg: "bg-zinc-500/5",
  text: "text-zinc-600 dark:text-zinc-400",
};

export function getCategoryStyle(category: string): CategoryStyle {
  return categoryStyles[category] ?? defaultStyle;
}
