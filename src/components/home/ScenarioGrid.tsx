import {
  HiOutlineCircleStack,
  HiOutlineCpuChip,
  HiOutlineCursorArrowRays,
  HiOutlineFingerPrint,
  HiOutlineServerStack,
} from "react-icons/hi2";
import { TbWorldSearch } from "react-icons/tb";

interface Scenario {
  id: string;
  title: string;
  description: string;
  count: number;
  keywords: string[];
  color: "cyan" | "blue" | "red" | "green" | "purple" | "amber";
}

interface ScenarioGridProps {
  scenarios: Scenario[];
}

const iconMap = {
  "lateral-movement": HiOutlineServerStack,
  "browser-forensics": TbWorldSearch,
  persistence: HiOutlineFingerPrint,
  execution: HiOutlineCpuChip,
  "user-activity": HiOutlineCursorArrowRays,
  "anti-forensics": HiOutlineCircleStack,
};

const colorMap = {
  cyan: {
    icon: "text-cyan-400",
    border: "hover:border-cyan-500/40",
    glow: "hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]",
  },
  blue: {
    icon: "text-blue-400",
    border: "hover:border-blue-500/40",
    glow: "hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]",
  },
  red: {
    icon: "text-red-400",
    border: "hover:border-red-500/40",
    glow: "hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]",
  },
  green: {
    icon: "text-green-400",
    border: "hover:border-green-500/40",
    glow: "hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]",
  },
  purple: {
    icon: "text-purple-400",
    border: "hover:border-purple-500/40",
    glow: "hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.3)]",
  },
  amber: {
    icon: "text-amber-400",
    border: "hover:border-amber-500/40",
    glow: "hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]",
  },
};

export function ScenarioGrid({ scenarios }: ScenarioGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {scenarios.map((scenario) => {
        const Icon =
          iconMap[scenario.id as keyof typeof iconMap] || HiOutlineCpuChip;
        const colors = colorMap[scenario.color] || colorMap.cyan;
        const cardClass = `group block p-4 sm:p-5 glass-card rounded-xl ${colors.border} ${colors.glow}`;

        return (
          <a
            className={cardClass}
            href={`/artifacts?scenario=${scenario.id}`}
            key={scenario.id}
          >
            <div className="mb-2 flex items-start justify-between sm:mb-3">
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colors.icon}`} />
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {scenario.count} artifacts
              </span>
            </div>
            <h3 className="mb-1 font-medium text-sm transition-colors group-hover:text-foreground sm:text-base">
              {scenario.title}
            </h3>
            <p className="mb-2 text-muted-foreground text-xs sm:mb-3 sm:text-sm">
              {scenario.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {scenario.keywords.slice(0, 4).map((kw) => (
                <span
                  className="rounded bg-secondary/30 px-1.5 py-0.5 text-[9px] text-muted-foreground/70 sm:px-2 sm:text-[10px]"
                  key={kw}
                >
                  {kw}
                </span>
              ))}
            </div>
          </a>
        );
      })}
    </div>
  );
}
