import { Layers, Monitor } from "lucide-react";

import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCategoryStyle } from "@/lib/categoryStyles";

interface CategoryChipProps {
  category: string;
  isCompound?: boolean;
}

export function CategoryChip({ category, isCompound }: CategoryChipProps) {
  const categoryLower = category.toLowerCase();
  const Icon = getCategoryIcon(categoryLower, Monitor);
  const style = getCategoryStyle(category);
  const compoundStyle = getCategoryStyle("compound");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-foreground text-sm transition-colors hover:bg-muted"
        href={`/artifacts?category=${categoryLower}`}
      >
        <Icon className={`h-3.5 w-3.5 ${style.text}`} />
        <span>{category}</span>
      </a>

      {isCompound && categoryLower !== "compound" && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-foreground text-sm">
          <Layers className={`h-3.5 w-3.5 ${compoundStyle.text}`} />
          <span>Compound</span>
        </span>
      )}
    </div>
  );
}
