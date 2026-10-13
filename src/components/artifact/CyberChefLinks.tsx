import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

import { generateCyberChefUrl, getRecipesForTarget } from "../../lib/cyberchef";
import type { KapeTarget } from "../../lib/kapefiles";
import { Panel } from "../ui/Panel";

interface CyberChefLinksProps {
  target: KapeTarget;
}

export function CyberChefLinks({ target }: CyberChefLinksProps) {
  const applicableRecipes = useMemo(
    () => getRecipesForTarget(target),
    [target]
  );

  if (applicableRecipes.length === 0) {
    return null;
  }

  return (
    <Panel
      headingId="cyberchef-heading"
      subtitle={`${applicableRecipes.length} ${applicableRecipes.length === 1 ? "recipe" : "recipes"} for this artifact`}
      title="Decode with CyberChef"
    >
      <ul
        aria-label="Available CyberChef recipes"
        className="list-none divide-y divide-border"
      >
        {applicableRecipes.map((recipe) => (
          <li key={recipe.id}>
            <a
              className="group focus-ring flex items-start gap-2 px-4 py-2.5 transition-colors hover:bg-muted"
              href={generateCyberChefUrl(recipe)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-sm group-hover:text-primary">
                  {recipe.name}
                </span>
                <span className="block text-muted-foreground text-xs">
                  {recipe.description}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary"
              />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
