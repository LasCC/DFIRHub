import { useEffect, useState } from "react";
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

const colorMap: Record<string, string> = {
	all: "text-muted-foreground",
	lolbin: "text-primary",
	windows: "text-blue-400",
	browsers: "text-amber-400",
	apps: "text-green-400",
	antivirus: "text-red-400",
	logs: "text-orange-400",
	p2p: "text-purple-400",
	compound: "text-cyan-400",
};

export function CategoryFilters({ categories }: CategoryFiltersProps) {
	const [activeFilter, setActiveFilter] = useState<string>("all");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const filter = params.get("filter");
		if (filter) {
			setActiveFilter(filter);
		} else {
			setActiveFilter("all");
		}
	}, []);

	return (
		<div className="flex flex-wrap gap-2">
			{categories.map((cat) => {
				const Icon = iconMap[cat.id.toLowerCase()] || HiOutlineSquares2X2;
				const iconColor =
					colorMap[cat.id.toLowerCase()] || "text-muted-foreground";
				const isActive = activeFilter === cat.id;

				return (
					<a
						key={cat.id}
						href={
							cat.id === "all" ? "/artefacts" : `/artefacts?filter=${cat.id}`
						}
						className={`
							inline-flex items-center gap-2 px-3 py-1.5 text-xs border transition-all rounded-sm
							${
								isActive
									? "border-primary bg-primary/10 text-primary"
									: cat.special
										? "border-primary/30 text-primary hover:border-primary hover:bg-primary/10"
										: "border-border/50 text-muted-foreground hover:border-foreground hover:text-foreground"
							}
						`}
					>
						<Icon
							className={`h-3.5 w-3.5 ${isActive ? "text-primary" : iconColor}`}
						/>
						<span>{cat.label}</span>
						<span className="opacity-60">({cat.count})</span>
					</a>
				);
			})}
		</div>
	);
}
