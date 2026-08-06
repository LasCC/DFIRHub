import { ArrowRight } from "lucide-react";
import { useMemo } from "react";

import type { KapeTarget } from "../../lib/kapefiles";

import {
  generateCyberChefUrl,
  getRecipesForArtifact,
} from "../../lib/cyberchef";

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
    [searchText]
  );

  if (applicableRecipes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span className="text-muted-foreground text-xs uppercase tracking-wider">
          CyberChef recipes
        </span>
      </div>

      <ul
        aria-label="Available CyberChef recipes"
        className="list-none space-y-2"
      >
        {applicableRecipes.map((recipe) => (
          <li key={recipe.id}>
            <a
              className="group focus-ring flex items-center justify-between border border-border/50 bg-sunken p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
              href={generateCyberChefUrl(recipe)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="flex items-center gap-3">
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-primary"
                />
                <div>
                  <div className="font-medium text-sm transition-colors group-hover:text-primary">
                    {recipe.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {recipe.description}
                  </div>
                </div>
              </div>
              <span className="text-muted-foreground text-xs transition-colors group-hover:text-primary">
                Open in CyberChef
                <span className="sr-only">(opens in new tab)</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-muted-foreground text-xs">
        Open in CyberChef to decode values extracted from this artifact.
      </p>
    </div>
  );
}
