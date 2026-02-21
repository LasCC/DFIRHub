import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiOutlineArrowsRightLeft,
  HiOutlineComputerDesktop,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineGlobeAlt,
  HiOutlineRectangleStack,
  HiOutlineShieldCheck,
  HiOutlineSquares2X2,
} from "react-icons/hi2";

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
  all: HiOutlineSquares2X2,
  antivirus: HiOutlineShieldCheck,
  apps: HiOutlineCube,
  browsers: HiOutlineGlobeAlt,
  compound: HiOutlineRectangleStack,
  logs: HiOutlineDocumentText,
  p2p: HiOutlineArrowsRightLeft,
  windows: HiOutlineComputerDesktop,
};

interface CategoryColorConfig {
  active: string;
  badgeActive: string;
  icon: string;
}

const colorConfig: Record<string, CategoryColorConfig> = {
  all: {
    active:
      "data-[active=true]:!border-primary/70 data-[active=true]:!bg-primary/18 data-[active=true]:!text-primary",
    badgeActive:
      "group-data-[active=true]:border-primary/40 group-data-[active=true]:bg-primary/20 group-data-[active=true]:text-primary",
    icon: "text-muted-foreground",
  },
  antivirus: {
    active:
      "data-[active=true]:!border-red-500/60 data-[active=true]:!bg-red-500/16 data-[active=true]:!text-red-300",
    badgeActive:
      "group-data-[active=true]:border-red-400/35 group-data-[active=true]:bg-red-500/22 group-data-[active=true]:text-red-200",
    icon: "text-red-400",
  },
  apps: {
    active:
      "data-[active=true]:!border-emerald-500/60 data-[active=true]:!bg-emerald-500/16 data-[active=true]:!text-emerald-300",
    badgeActive:
      "group-data-[active=true]:border-emerald-400/35 group-data-[active=true]:bg-emerald-500/22 group-data-[active=true]:text-emerald-200",
    icon: "text-emerald-400",
  },
  browsers: {
    active:
      "data-[active=true]:!border-orange-500/60 data-[active=true]:!bg-orange-500/16 data-[active=true]:!text-orange-300",
    badgeActive:
      "group-data-[active=true]:border-orange-400/35 group-data-[active=true]:bg-orange-500/22 group-data-[active=true]:text-orange-200",
    icon: "text-orange-400",
  },
  compound: {
    active:
      "data-[active=true]:!border-cyan-500/60 data-[active=true]:!bg-cyan-500/16 data-[active=true]:!text-cyan-300",
    badgeActive:
      "group-data-[active=true]:border-cyan-400/35 group-data-[active=true]:bg-cyan-500/22 group-data-[active=true]:text-cyan-200",
    icon: "text-cyan-400",
  },
  logs: {
    active:
      "data-[active=true]:!border-yellow-500/60 data-[active=true]:!bg-yellow-500/16 data-[active=true]:!text-yellow-300",
    badgeActive:
      "group-data-[active=true]:border-yellow-400/35 group-data-[active=true]:bg-yellow-500/22 group-data-[active=true]:text-yellow-200",
    icon: "text-yellow-400",
  },
  p2p: {
    active:
      "data-[active=true]:!border-purple-500/60 data-[active=true]:!bg-purple-500/16 data-[active=true]:!text-purple-300",
    badgeActive:
      "group-data-[active=true]:border-purple-400/35 group-data-[active=true]:bg-purple-500/22 group-data-[active=true]:text-purple-200",
    icon: "text-purple-400",
  },
  windows: {
    active:
      "data-[active=true]:!border-blue-500/60 data-[active=true]:!bg-blue-500/16 data-[active=true]:!text-blue-300",
    badgeActive:
      "group-data-[active=true]:border-blue-400/35 group-data-[active=true]:bg-blue-500/22 group-data-[active=true]:text-blue-200",
    icon: "text-blue-400",
  },
};

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
          const Icon = iconMap[cat.id.toLowerCase()] || HiOutlineSquares2X2;
          const config = colorConfig[cat.id.toLowerCase()] || colorConfig.all;

          return (
            <a
              className={`group category-filter-btn inline-flex shrink-0 items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 font-medium text-xs text-muted-foreground transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground ${config.active} backdrop-blur-sm`}
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
            >
              <Icon
                className={`h-3.5 w-3.5 transition-colors ${config.icon} group-data-[active=true]:text-current`}
              />
              <span>{cat.label}</span>
              <span
                className={`rounded-full border border-transparent bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${config.badgeActive}`}
              >
                {cat.count}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
