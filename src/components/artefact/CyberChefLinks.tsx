import { useMemo } from "react";
import {
	type CyberChefRecipe,
	generateCyberChefUrl,
	getRecipesForArtifact,
} from "../../lib/cyberchef";
import type { KapeTarget } from "../../lib/kapefiles";

interface CyberChefLinksProps {
	target: KapeTarget;
}

export function CyberChefLinks({ target }: CyberChefLinksProps) {
	// Build a searchable string from target name, description, and paths
	const searchText = useMemo(() => {
		const parts = [
			target.name,
			target.description,
			target.category,
			...target.targets.map((t) => `${t.name} ${t.path} ${t.fileMask || ""}`),
		];
		return parts.join(" ");
	}, [target]);

	const applicableRecipes = useMemo(
		() => getRecipesForArtifact(searchText),
		[searchText],
	);

	if (applicableRecipes.length === 0) {
		return null;
	}

	return (
		<div className="border border-border bg-card/20 rounded-lg p-4">
			<div className="flex items-center gap-2 mb-3">
				<svg
					className="w-4 h-4 text-primary"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-hidden="true"
				>
					<path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
				</svg>
				<span className="text-xs uppercase tracking-wider text-muted-foreground">
					// cyberchef recipes
				</span>
			</div>

			<div
				className="space-y-2"
				role="list"
				aria-label="Available CyberChef recipes"
			>
				{applicableRecipes.map((recipe) => (
					<a
						key={recipe.id}
						href={generateCyberChefUrl(recipe)}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-between p-3 border border-border/50 bg-black/20 hover:border-primary/30 hover:bg-primary/5 transition-colors group focus-ring"
						role="listitem"
					>
						<div className="flex items-center gap-3">
							<span className="text-primary" aria-hidden="true">
								→
							</span>
							<div>
								<div className="text-sm font-medium group-hover:text-primary transition-colors">
									{recipe.name}
								</div>
								<div className="text-xs text-muted-foreground">
									{recipe.description}
								</div>
							</div>
						</div>
						<span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
							open in cyberchef
							<span className="sr-only">(opens in new tab)</span>
						</span>
					</a>
				))}
			</div>

			<p className="text-[10px] text-muted-foreground/70 mt-3">
				Open in CyberChef to decode values extracted from this artifact.
			</p>
		</div>
	);
}
