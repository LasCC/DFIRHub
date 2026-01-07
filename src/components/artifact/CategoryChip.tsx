import {
  HiOutlineArrowsRightLeft,
  HiOutlineComputerDesktop,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineGlobeAlt,
  HiOutlineRectangleStack,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

interface CategoryChipProps {
  category: string;
  version: string;
  isCompound?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
  { text: string; border: string; bg: string; glow: string }
> = {
  windows: {
    text: "text-blue-400",
    border: "border-blue-500/50",
    bg: "bg-blue-500/10",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)]",
  },
  browsers: {
    text: "text-orange-400",
    border: "border-orange-500/50",
    bg: "bg-orange-500/10",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(249,115,22,0.4)]",
  },
  apps: {
    text: "text-emerald-400",
    border: "border-emerald-500/50",
    bg: "bg-emerald-500/10",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(52,211,153,0.4)]",
  },
  antivirus: {
    text: "text-red-400",
    border: "border-red-500/50",
    bg: "bg-red-500/10",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(239,68,68,0.4)]",
  },
  logs: {
    text: "text-yellow-400",
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/10",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(234,179,8,0.4)]",
  },
  p2p: {
    text: "text-purple-400",
    border: "border-purple-500/50",
    bg: "bg-purple-500/10",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(168,85,247,0.4)]",
  },
  compound: {
    text: "text-cyan-400",
    border: "border-cyan-500/50",
    bg: "bg-cyan-500/10",
    glow: "hover:shadow-[0_0_15px_-5px_rgba(6,182,212,0.4)]",
  },
};

export function CategoryChip({
  category,
  version,
  isCompound,
}: CategoryChipProps) {
  const categoryLower = category.toLowerCase();
  const Icon = iconMap[categoryLower] || HiOutlineComputerDesktop;
  const config = colorConfig[categoryLower] || colorConfig.windows;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium text-xs backdrop-blur-sm transition-all duration-300${config.border} ${config.bg} ${config.text} ${config.glow}
				`}
        href={`/artifacts?category=${categoryLower}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{category}</span>
      </a>

      {isCompound && (
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-400 text-xs backdrop-blur-sm">
          <HiOutlineRectangleStack className="h-3.5 w-3.5" />
          <span>Compound</span>
        </span>
      )}

      <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-medium text-xs text-zinc-400 backdrop-blur-sm">
        v{version}
      </span>
    </div>
  );
}
