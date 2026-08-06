/**
 * Single source of truth for artifact category accent colors.
 *
 * Text classes use an 800-shade in light mode (AA+ on the light surfaces)
 * and a 400-shade in dark mode so they stay readable in both themes.
 * Accent dots use 600-shades (700 for yellow) to stay visible on both
 * the light and the dark background. Import this everywhere a category
 * color is needed — do not re-declare per-file color maps.
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
    accent: "bg-red-600",
    bg: "bg-red-500/5",
    text: "text-red-800 dark:text-red-400",
  },
  Apps: {
    accent: "bg-emerald-600",
    bg: "bg-emerald-500/5",
    text: "text-emerald-800 dark:text-emerald-400",
  },
  Browsers: {
    accent: "bg-orange-600",
    bg: "bg-orange-500/5",
    text: "text-orange-800 dark:text-orange-400",
  },
  Compound: {
    accent: "bg-cyan-600",
    bg: "bg-cyan-500/5",
    text: "text-cyan-800 dark:text-cyan-400",
  },
  Logs: {
    accent: "bg-yellow-700",
    bg: "bg-yellow-500/5",
    text: "text-yellow-800 dark:text-yellow-400",
  },
  P2P: {
    accent: "bg-purple-600",
    bg: "bg-purple-500/5",
    text: "text-purple-800 dark:text-purple-400",
  },
  Windows: {
    accent: "bg-blue-600",
    bg: "bg-blue-500/5",
    text: "text-blue-800 dark:text-blue-400",
  },
};

const defaultStyle: CategoryStyle = {
  accent: "bg-zinc-600",
  bg: "bg-zinc-500/5",
  text: "text-zinc-700 dark:text-zinc-400",
};

export function getCategoryStyle(category: string): CategoryStyle {
  return categoryStyles[category] ?? defaultStyle;
}
