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
	all: "text-muted-foreground group-data-[active]:text-primary",
	lolbin: "text-primary",
	windows: "text-blue-400 group-data-[active]:text-primary",
	browsers: "text-amber-400 group-data-[active]:text-primary",
	apps: "text-green-400 group-data-[active]:text-primary",
	antivirus: "text-red-400 group-data-[active]:text-primary",
	logs: "text-orange-400 group-data-[active]:text-primary",
	p2p: "text-purple-400 group-data-[active]:text-primary",
	compound: "text-cyan-400 group-data-[active]:text-primary",
};

export function CategoryFilters({ categories }: CategoryFiltersProps) {
	return (
		<div id="category-filters" className="flex flex-wrap gap-2">
			{categories.map((cat) => {
				const Icon = iconMap[cat.id.toLowerCase()] || HiOutlineSquares2X2;
				const iconColor =
					colorMap[cat.id.toLowerCase()] || "text-muted-foreground";

				return (
					<a
						key={cat.id}
						href={
							cat.id === "all"
								? "/artifacts"
								: cat.special
									? `/artifacts?filter=${cat.id}`
									: `/artifacts?category=${cat.id}`
						}
						data-filter-id={cat.id}
						data-special={cat.special ? "true" : undefined}
						className={`
							group category-filter-btn inline-flex items-center gap-2 px-3 py-1.5 text-xs border transition-all rounded-sm
							border-border/50 text-muted-foreground hover:border-foreground hover:text-foreground
							data-[active]:border-primary data-[active]:bg-primary/10 data-[active]:text-primary
							${cat.special ? "border-primary/30 text-primary hover:border-primary hover:bg-primary/10" : ""}
						`}
					>
						<Icon className={`h-3.5 w-3.5 ${iconColor}`} />
						<span>{cat.label}</span>
						<span className="opacity-60">({cat.count})</span>
					</a>
				);
			})}
		</div>
	);
}
