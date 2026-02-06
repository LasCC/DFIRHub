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
  antivirus: HiOutlineShieldCheck,
  apps: HiOutlineCube,
  browsers: HiOutlineGlobeAlt,
  compound: HiOutlineRectangleStack,
  logs: HiOutlineDocumentText,
  p2p: HiOutlineArrowsRightLeft,
  windows: HiOutlineComputerDesktop,
};

const colorConfig: Record<
  string,
  { text: string; border: string; bg: string }
> = {
  antivirus: {
    bg: "bg-red-500/10",
    border: "border-red-500/50",
    text: "text-red-400",
  },
  apps: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
  },
  browsers: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/50",
    text: "text-orange-400",
  },
  compound: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/50",
    text: "text-cyan-400",
  },
  logs: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/50",
    text: "text-yellow-400",
  },
  p2p: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/50",
    text: "text-purple-400",
  },
  windows: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    text: "text-blue-400",
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
        className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium text-xs backdrop-blur-sm transition-all duration-300 ${config.border} ${config.bg} ${config.text}`}
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
