import { getCategoryIcon } from "@/lib/categoryIcons";
import type { CategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

import type { CategoryCounts } from "./pagefindClient";
import { useHorizontalScrollEdges } from "./useHorizontalScrollEdges";

interface CategoryChipsProps {
  activeCategory: string | null;
  counts: CategoryCounts;
  onChange: (category: string | null) => void;
}

interface ChipProps {
  count: number;
  Icon: CategoryIcon;
  isActive: boolean;
  label: string;
  onClick: () => void;
}

const FADE_WIDTH_PX = 28;

const buildFadeMask = (
  canScrollStart: boolean,
  canScrollEnd: boolean
): string | undefined => {
  if (!(canScrollStart || canScrollEnd)) {
    return undefined;
  }
  const startAlpha = canScrollStart ? 0 : 1;
  const endAlpha = canScrollEnd ? 0 : 1;
  return `linear-gradient(to right, rgba(0, 0, 0, ${startAlpha}), #000 ${FADE_WIDTH_PX}px, #000 calc(100% - ${FADE_WIDTH_PX}px), rgba(0, 0, 0, ${endAlpha}))`;
};

const Chip = ({ count, Icon, isActive, label, onClick }: ChipProps) => (
  <button
    aria-pressed={isActive}
    className={cn(
      "focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium text-sm transition-colors",
      isActive
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
    onClick={onClick}
    onMouseDown={(event) => event.preventDefault()}
    type="button"
  >
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
    <span
      className={cn(
        "rounded-sm px-1.5 text-xs tabular-nums",
        isActive
          ? "bg-primary-foreground/20 text-primary-foreground"
          : "bg-muted"
      )}
    >
      {count}
    </span>
  </button>
);

export function CategoryChips({
  activeCategory,
  counts,
  onChange,
}: CategoryChipsProps) {
  const categories = Object.keys(counts).filter(
    (category) => (counts[category] ?? 0) > 0
  );
  if (activeCategory && !categories.includes(activeCategory)) {
    categories.push(activeCategory);
  }
  const { edges, scrollRef } = useHorizontalScrollEdges();
  if (categories.length < 2) {
    return null;
  }
  const fadeMask = buildFadeMask(edges.canScrollStart, edges.canScrollEnd);

  const sortedCategories = categories.toSorted(
    (first, second) => (counts[second] ?? 0) - (counts[first] ?? 0)
  );
  const totalCount = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <fieldset className="min-w-0 border-overlay/[0.06] border-b">
      <legend className="sr-only">Filter by category</legend>
      <div
        className="scrollbar-hide flex gap-1.5 overflow-x-auto px-4 py-2.5"
        ref={scrollRef}
        style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
      >
        <Chip
          count={totalCount}
          Icon={getCategoryIcon("all")}
          isActive={activeCategory === null}
          label="All"
          onClick={() => onChange(null)}
        />
        {sortedCategories.map((category) => (
          <Chip
            count={counts[category] ?? 0}
            Icon={getCategoryIcon(category)}
            isActive={activeCategory === category}
            key={category}
            label={category}
            onClick={() =>
              onChange(activeCategory === category ? null : category)
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
