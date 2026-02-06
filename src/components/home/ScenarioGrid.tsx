import {
  HiOutlineCircleStack,
  HiOutlineCpuChip,
  HiOutlineCursorArrowRays,
  HiOutlineFingerPrint,
  HiOutlineServerStack,
} from "react-icons/hi2";
import { TbWorldSearch } from "react-icons/tb";

import { cn } from "@/lib/utils";

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
  "anti-forensics": HiOutlineCircleStack,
  "browser-forensics": TbWorldSearch,
  execution: HiOutlineCpuChip,
  "lateral-movement": HiOutlineServerStack,
  persistence: HiOutlineFingerPrint,
  "user-activity": HiOutlineCursorArrowRays,
};

const colorMap = {
  amber: {
    glow: "bg-amber-500/[0.07]",
    icon: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  blue: {
    glow: "bg-blue-500/[0.07]",
    icon: "text-blue-400",
    iconBg: "bg-blue-500/10",
  },
  cyan: {
    glow: "bg-cyan-500/[0.07]",
    icon: "text-cyan-400",
    iconBg: "bg-cyan-500/10",
  },
  green: {
    glow: "bg-green-500/[0.07]",
    icon: "text-green-400",
    iconBg: "bg-green-500/10",
  },
  purple: {
    glow: "bg-purple-500/[0.07]",
    icon: "text-purple-400",
    iconBg: "bg-purple-500/10",
  },
  red: {
    glow: "bg-red-500/[0.07]",
    icon: "text-red-400",
    iconBg: "bg-red-500/10",
  },
};

export function ScenarioGrid({ scenarios }: ScenarioGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {scenarios.map((scenario) => {
        const Icon =
          iconMap[scenario.id as keyof typeof iconMap] || HiOutlineCpuChip;
        const colors = colorMap[scenario.color] || colorMap.cyan;

        return (
          <a
            className={cn(
              "group relative block overflow-hidden p-4 sm:p-5 glass-card rounded-xl",
              "transition-all duration-300"
            )}
            href={`/artifacts?scenario=${scenario.id}`}
            key={scenario.id}
          >
            <div className="mb-2 flex items-start justify-between sm:mb-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  colors.iconBg
                )}
              >
                <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", colors.icon)} />
              </div>
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
            {/* Hover glow blob */}
            <div
              className={cn(
                "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100",
                colors.glow
              )}
              aria-hidden="true"
            />
          </a>
        );
      })}
    </div>
  );
}
