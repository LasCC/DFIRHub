import { useCallback, useEffect, useRef, useState } from "react";

import { trackCategoryFilterUsed } from "@/lib/analytics";
import { getCategoryIcon } from "@/lib/categoryIcons";

interface Category {
  id: string;
  label: string;
  count: number;
  special?: boolean;
}

interface CategoryFiltersProps {
  categories: Category[];
}

const allActiveClasses =
  "data-[active=true]:!border-primary data-[active=true]:!bg-primary data-[active=true]:!text-primary-foreground";
const categoryActiveClasses =
  "data-[active=true]:!border-primary data-[active=true]:!bg-primary data-[active=true]:!text-primary-foreground";

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
          const Icon = getCategoryIcon(cat.id);
          const activeClasses =
            cat.id === "all" ? allActiveClasses : categoryActiveClasses;

          return (
            <a
              className={`group category-filter-btn inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 font-medium text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${activeClasses}`}
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
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
              <span className="rounded-sm bg-muted px-1.5 text-xs tabular-nums group-data-[active=true]:bg-primary-foreground/20 group-data-[active=true]:text-primary-foreground">
                {cat.count}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
