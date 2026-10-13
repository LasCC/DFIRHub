import { CornerDownLeft } from "lucide-react";

import { CommandItem } from "@/components/ui/command";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCategoryStyle } from "@/lib/categoryStyles";
import { cn } from "@/lib/utils";

import { HighlightedText } from "./HighlightedText";
import type { SearchHit } from "./pagefindClient";

interface SearchResultItemProps {
  hit: Pick<SearchHit, "category" | "kind" | "title" | "url"> &
    Partial<Pick<SearchHit, "excerpt" | "pathCount">>;
  onSelect: () => void;
  query?: string;
}

export function SearchResultItem({
  hit,
  onSelect,
  query = "",
}: SearchResultItemProps) {
  const categoryStyle = getCategoryStyle(hit.category);
  const CategoryIcon = getCategoryIcon(hit.category);
  const pathLabel = hit.pathCount === 1 ? "path" : "paths";

  return (
    <CommandItem
      className="group relative my-0.5 items-start gap-3 rounded-lg before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity data-[selected=true]:before:opacity-100"
      onSelect={onSelect}
      value={hit.url}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border",
          categoryStyle.bg
        )}
      >
        <CategoryIcon className={categoryStyle.text} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            <HighlightedText query={query} text={hit.title} />
          </span>
          {hit.kind === "Collection" && (
            <span className="shrink-0 rounded border border-border px-1.5 py-px font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Collection
            </span>
          )}
        </span>
        {hit.excerpt && (
          <span
            className="mt-0.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-foreground"
            dangerouslySetInnerHTML={{ __html: hit.excerpt }}
          />
        )}
      </span>

      <span className="hidden shrink-0 flex-col items-end gap-0.5 text-xs sm:flex">
        {hit.kind === "Artifact" && hit.category && (
          <span className={cn("font-medium", categoryStyle.text)}>
            {hit.category}
          </span>
        )}
        {Boolean(hit.pathCount) && (
          <span className="text-muted-foreground tabular-nums">
            {hit.pathCount} {pathLabel}
          </span>
        )}
      </span>

      <CornerDownLeft
        aria-hidden="true"
        className="mt-2 hidden shrink-0 text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100 sm:block"
      />
    </CommandItem>
  );
}
