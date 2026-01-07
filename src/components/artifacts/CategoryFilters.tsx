import {
  HiOutlineArrowsRightLeft,
  HiOutlineBolt,
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
  lolbin: HiOutlineBolt,
  windows: HiOutlineComputerDesktop,
  browsers: HiOutlineGlobeAlt,
  apps: HiOutlineCube,
  antivirus: HiOutlineShieldCheck,
  logs: HiOutlineDocumentText,
  p2p: HiOutlineArrowsRightLeft,
  compound: HiOutlineRectangleStack,
};

const colorConfig: Record<
  string,
  { icon: string; active: string; glow: string }
> = {
  all: {
    icon: "text-zinc-400",
    active:
      "data-[active]:border-primary data-[active]:bg-primary/10 data-[active]:text-primary data-[active]:shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]",
  },
  lolbin: {
    icon: "text-amber-400",
    active:
      "data-[active]:border-amber-500/50 data-[active]:bg-amber-500/10 data-[active]:text-amber-400 data-[active]:shadow-[0_0_20px_-5px_rgba(245,158,11,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]",
  },
  windows: {
    icon: "text-blue-400",
    active:
      "data-[active]:border-blue-500/50 data-[active]:bg-blue-500/10 data-[active]:text-blue-400 data-[active]:shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]",
  },
  browsers: {
    icon: "text-orange-400",
    active:
      "data-[active]:border-orange-500/50 data-[active]:bg-orange-500/10 data-[active]:text-orange-400 data-[active]:shadow-[0_0_20px_-5px_rgba(249,115,22,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]",
  },
  apps: {
    icon: "text-emerald-400",
    active:
      "data-[active]:border-emerald-500/50 data-[active]:bg-emerald-500/10 data-[active]:text-emerald-400 data-[active]:shadow-[0_0_20px_-5px_rgba(52,211,153,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(52,211,153,0.3)]",
  },
  antivirus: {
    icon: "text-red-400",
    active:
      "data-[active]:border-red-500/50 data-[active]:bg-red-500/10 data-[active]:text-red-400 data-[active]:shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]",
  },
  logs: {
    icon: "text-yellow-400",
    active:
      "data-[active]:border-yellow-500/50 data-[active]:bg-yellow-500/10 data-[active]:text-yellow-400 data-[active]:shadow-[0_0_20px_-5px_rgba(234,179,8,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]",
  },
  p2p: {
    icon: "text-purple-400",
    active:
      "data-[active]:border-purple-500/50 data-[active]:bg-purple-500/10 data-[active]:text-purple-400 data-[active]:shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)]",
  },
  compound: {
    icon: "text-cyan-400",
    active:
      "data-[active]:border-cyan-500/50 data-[active]:bg-cyan-500/10 data-[active]:text-cyan-400 data-[active]:shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]",
  },
};

export function CategoryFilters({ categories }: CategoryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2" id="category-filters">
      {categories.map((cat) => {
        const Icon = iconMap[cat.id.toLowerCase()] || HiOutlineSquares2X2;
        const config = colorConfig[cat.id.toLowerCase()] || colorConfig.all;

        return (
          <a
            className={`group category-filter-btn inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2 font-medium text-xs text-zinc-400 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-200${config.active} ${config.glow}backdrop-blur-sm`}
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
              className={`h-3.5 w-3.5 transition-colors ${config.icon} group-data-[active]:text-current`}
            />
            <span>{cat.label}</span>
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
              {cat.count}
            </span>
          </a>
        );
      })}
    </div>
  );
}
