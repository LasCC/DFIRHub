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
		border: "hover:border-cyan-500/50",
		bg: "hover:bg-cyan-500/5",
	},
	blue: {
		icon: "text-blue-400",
		border: "hover:border-blue-500/50",
		bg: "hover:bg-blue-500/5",
	},
	red: {
		icon: "text-red-400",
		border: "hover:border-red-500/50",
		bg: "hover:bg-red-500/5",
	},
	green: {
		icon: "text-green-400",
		border: "hover:border-green-500/50",
		bg: "hover:bg-green-500/5",
	},
	purple: {
		icon: "text-purple-400",
		border: "hover:border-purple-500/50",
		bg: "hover:bg-purple-500/5",
	},
	amber: {
		icon: "text-amber-400",
		border: "hover:border-amber-500/50",
		bg: "hover:bg-amber-500/5",
	},
};

export function ScenarioGrid({ scenarios }: ScenarioGridProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
			{scenarios.map((scenario) => {
				const Icon =
					iconMap[scenario.id as keyof typeof iconMap] || HiOutlineCpuChip;
				const colors = colorMap[scenario.color] || colorMap.cyan;
				const cardClass = `group block p-4 sm:p-5 border border-border/50 rounded-xl ${colors.border} ${colors.bg} transition-all`;

				return (
					<a
						key={scenario.id}
						href={`/artifacts?scenario=${scenario.id}`}
						className={cardClass}
					>
						<div className="flex items-start justify-between mb-2 sm:mb-3">
							<Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.icon}`} />
							<span className="text-[10px] sm:text-xs text-muted-foreground">
								{scenario.count} artifacts
							</span>
						</div>
						<h3 className="font-medium text-sm sm:text-base mb-1 group-hover:text-foreground transition-colors">
							{scenario.title}
						</h3>
						<p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
							{scenario.description}
						</p>
						<div className="flex flex-wrap gap-1">
							{scenario.keywords.slice(0, 4).map((kw) => (
								<span
									key={kw}
									className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] text-muted-foreground/70 bg-secondary/30 rounded"
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
