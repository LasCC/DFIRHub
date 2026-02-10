import { Loader2, Search as SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";

import type { SigmaRuleEntry } from "@/lib/sigma/sigma-search";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { loadSigmaRule } from "@/lib/sigma/sigma-search";
import { useSigmaSearch } from "@/lib/sigma/useSigmaSearch";

interface SigmaSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (yaml: string) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-400",
  high: "border-orange-500/40 bg-orange-500/15 text-orange-400",
  informational: "border-zinc-500/40 bg-zinc-500/15 text-zinc-400",
  low: "border-blue-500/40 bg-blue-500/15 text-blue-400",
  medium: "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
};

function LevelBadge({ level }: { level: string }) {
  const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS.informational;
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] leading-none ${colors}`}
    >
      {level}
    </span>
  );
}

function LogsourceBadge({
  logsource,
}: {
  logsource: SigmaRuleEntry["logsource"];
}) {
  const parts = [
    logsource.category,
    logsource.product,
    logsource.service,
  ].filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return (
    <span className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
      {parts.join("/")}
    </span>
  );
}

function MitreTags({ tags }: { tags: string[] }) {
  const mitre = tags
    .filter((t) => t.startsWith("attack.t"))
    .map((t) => t.replace("attack.", "").toUpperCase())
    .slice(0, 3);

  if (mitre.length === 0) {
    return null;
  }

  return (
    <>
      {mitre.map((tag) => (
        <span
          className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] leading-none text-purple-400"
          key={tag}
        >
          {tag}
        </span>
      ))}
    </>
  );
}

export function SigmaSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: SigmaSearchDialogProps) {
  const { query, setQuery, results, loading, indexReady, ruleCount } =
    useSigmaSearch(open);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (entry: SigmaRuleEntry) => {
      setLoadingId(entry.id);
      try {
        const yaml = await loadSigmaRule(entry.id);
        if (yaml) {
          onSelect(yaml);
        }
      } finally {
        setLoadingId(null);
      }
    },
    [onSelect]
  );

  const placeholder = indexReady
    ? `Search ${ruleCount.toLocaleString()} Sigma rules...`
    : "Loading Sigma index...";

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open} shouldFilter={false}>
      <CommandInput
        disabled={!indexReady}
        onValueChange={setQuery}
        placeholder={placeholder}
        value={query}
      />

      <CommandList className="max-h-[400px]">
        {loading && !indexReady && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading Sigma index...
            </span>
          </div>
        )}

        {indexReady && query && results.length === 0 && (
          <CommandEmpty className="py-8 text-center text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-2">
              <SearchIcon className="h-8 w-8 text-muted-foreground/30" />
              <span>No rules found for "{query}"</span>
              <span className="text-muted-foreground/60 text-xs">
                Try a different search term or MITRE technique ID
              </span>
            </div>
          </CommandEmpty>
        )}

        {indexReady && !query && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-2">
              <SearchIcon className="h-8 w-8 text-muted-foreground/30" />
              <span>Search by title, description, logsource, or MITRE tag</span>
              <span className="text-muted-foreground/60 text-xs">
                e.g. "mimikatz", "T1059.001", "process_creation"
              </span>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <CommandGroup
            heading={
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                <span>results</span>
                <span className="font-medium text-primary">
                  ({results.length})
                </span>
              </span>
            }
          >
            {results.map((entry) => (
              <CommandItem
                className="group my-0.5 rounded-lg py-2.5 text-sm"
                key={entry.id}
                onSelect={() => handleSelect(entry)}
                value={entry.id}
              >
                <div className="flex w-full flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    {loadingId === entry.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : null}
                    <span className="font-medium">{entry.title}</span>
                  </div>
                  {entry.description && (
                    <p className="line-clamp-1 text-muted-foreground/70 text-xs">
                      {entry.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <LevelBadge level={entry.level} />
                    <LogsourceBadge logsource={entry.logsource} />
                    <MitreTags tags={entry.tags} />
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex items-center justify-between border-white/[0.06] border-t bg-white/[0.02] px-4 py-2.5 text-[10px] text-muted-foreground/50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <kbd className="kbd text-[9px]">↑</kbd>
              <kbd className="kbd text-[9px]">↓</kbd>
            </div>
            <span>navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd text-[9px]">↵</kbd>
            <span>import</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd text-[9px]">esc</kbd>
            <span>close</span>
          </span>
        </div>
        <div className="text-muted-foreground/40">SigmaHQ</div>
      </div>
    </CommandDialog>
  );
}
