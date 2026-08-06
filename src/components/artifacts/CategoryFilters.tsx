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
import { useCallback, useEffect, useRef, useState } from "react";

import { trackCategoryFilterUsed } from "@/lib/analytics";
import { getCategoryStyle } from "@/lib/categoryStyles";

interface Category {
  id: string;
  label: string;
  count: number;
  special?: boolean;
}

interface CategoryFiltersProps {
  categories: Category[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  all: LayoutGrid,
  antivirus: ShieldCheck,
  apps: Box,
  browsers: Globe,
  compound: Layers,
  logs: FileText,
  p2p: ArrowLeftRight,
  windows: Monitor,
};

const categoryNameById: Record<string, string> = {
  antivirus: "Antivirus",
  apps: "Apps",
  browsers: "Browsers",
  compound: "Compound",
  logs: "Logs",
  p2p: "P2P",
  windows: "Windows",
};

const allActiveClasses =
  "data-[active=true]:!border-primary/70 data-[active=true]:!bg-primary/10 data-[active=true]:!text-primary";
const categoryActiveClasses =
  "data-[active=true]:!border-foreground/40 data-[active=true]:!bg-overlay/[0.06] data-[active=true]:!text-foreground";

export function CategoryFilters({ categories }: CategoryFiltersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledStart, setScrolledStart] = useState(true);
  const [scrolledEnd, setScrolledEnd] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const atStart = el.scrollLeft <= 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setScrolledStart(atStart);
    setScrolledEnd(atEnd);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  return (
    <div
      className={`scroll-shadow-x${scrolledStart ? " scrolled-start" : ""}${scrolledEnd ? " scrolled-end" : ""}`}
    >
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide"
        id="category-filters"
        ref={scrollRef}
      >
        {categories.map((cat) => {
          const Icon = iconMap[cat.id.toLowerCase()] || LayoutGrid;
          const categoryName = categoryNameById[cat.id.toLowerCase()];
          const style = categoryName ? getCategoryStyle(categoryName) : null;
          const activeClasses =
            cat.id === "all" ? allActiveClasses : categoryActiveClasses;

          return (
            <a
              className={`group category-filter-btn inline-flex shrink-0 items-center gap-2 rounded-full border border-overlay/[0.06] bg-overlay/[0.02] px-4 py-2 font-medium text-xs text-muted-foreground transition-all duration-300 hover:border-overlay/10 hover:bg-overlay/[0.04] hover:text-foreground ${activeClasses}`}
              data-filter-id={cat.id}
              data-special={cat.special ? "true" : undefined}
              href={
                cat.id === "all"
                  ? "/artifacts"
                  : cat.special
                    ? `/artifacts?filter=${cat.id}`
                    : `/artifacts?category=${cat.id}`
              }
              key={cat.id}
              onClick={() => {
                trackCategoryFilterUsed(cat.id);
              }}
            >
              <Icon
                className={`h-3.5 w-3.5 transition-colors ${style ? style.text : "text-muted-foreground"}`}
              />
              <span>{cat.label}</span>
              <span className="rounded-full border border-transparent bg-overlay/[0.06] px-1.5 py-0.5 text-xs tabular-nums">
                {cat.count}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
