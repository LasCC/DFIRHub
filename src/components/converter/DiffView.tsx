import type { ConversionResult } from "@/lib/sigma/types";

import { getBackend } from "@/lib/sigma/backends";

import { OutputPanel } from "./OutputPanel";

interface DiffViewProps {
  results: Map<string, ConversionResult>;
  isLoading?: boolean;
}

export function DiffView({ results, isLoading }: DiffViewProps) {
  const entries = [...results.entries()];

  if (entries.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground/50 text-sm">
        Select backends and convert a rule to compare outputs side-by-side.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col divide-y divide-white/[0.06]">
      {entries.map(([backendId, result]) => {
        const config = getBackend(backendId);
        return (
          <div className="flex-1" key={backendId}>
            <OutputPanel
              backend={config?.name ?? backendId}
              error={result.error}
              isLoading={isLoading}
              language={config?.language ?? "text"}
              query={result.query ?? ""}
            />
          </div>
        );
      })}
      {entries.length === 0 && isLoading && (
        <div className="flex h-full items-center justify-center p-8">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Converting to multiple backends...
          </div>
        </div>
      )}
    </div>
  );
}
