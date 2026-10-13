import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

import { generateCyberChefUrl, getRecipesForTarget } from "../../lib/cyberchef";
import type { KapeTarget } from "../../lib/kapefiles";

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
    <section aria-labelledby="cyberchef-heading">
      <h2
        className="mb-3 font-semibold text-base tracking-tight"
        id="cyberchef-heading"
      >
        Decode with CyberChef
      </h2>
      <ul
        aria-label="Available CyberChef recipes"
        className="-mx-2 list-none space-y-0.5"
      >
        {applicableRecipes.map((recipe) => (
          <li key={recipe.id}>
            <a
              className="group focus-ring flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
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
    </section>
  );
}
