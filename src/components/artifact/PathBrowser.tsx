import { useState } from "react";
import type { KapeTarget, KapeTargetEntry } from "../../lib/kapefiles";

interface PathBrowserProps {
  target: KapeTarget;
  resolvedTargets?: KapeTarget[];
}

export function PathBrowser({ target, resolvedTargets }: PathBrowserProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(
    new Set()
  );

  // Get all paths (either from this target or resolved compound targets)
  const pathEntries =
    target.isCompound && resolvedTargets
      ? resolvedTargets.flatMap((t) =>
          t.targets
            .filter((e) => !e.path.endsWith(".tkape"))
            .map((e) => ({
              ...e,
              sourceName: t.name,
            }))
        )
      : target.targets
          .filter((e) => !e.path.endsWith(".tkape"))
          .map((e) => ({
            ...e,
            sourceName: target.name,
          }));

  const handleCopyPath = async (path: string, fileMask?: string) => {
    const fullPath = fileMask ? `${path}${fileMask}` : path;
    try {
      await navigator.clipboard.writeText(fullPath);
      setCopiedPath(fullPath);
      // Announce to screen readers
      const announcer = document.getElementById("live-announcer");
      if (announcer) {
        announcer.textContent = "Path copied to clipboard";
        setTimeout(() => {
          announcer.textContent = "";
        }, 1000);
      }
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyAll = async () => {
    const allPaths = pathEntries
      .map((e) => (e.fileMask ? `${e.path}${e.fileMask}` : e.path))
      .join("\n");
    try {
      await navigator.clipboard.writeText(allPaths);
      setCopiedPath("all");
      const announcer = document.getElementById("live-announcer");
      if (announcer) {
        announcer.textContent = "All paths copied to clipboard";
        setTimeout(() => {
          announcer.textContent = "";
        }, 1000);
      }
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Group paths by source target for compound display
  const groupedPaths =
    target.isCompound && resolvedTargets
      ? resolvedTargets.map((t) => ({
          name: t.name,
          slug: t.slug,
          entries: t.targets.filter((e) => !e.path.endsWith(".tkape")),
        }))
      : [
          {
            name: target.name,
            slug: target.slug,
            entries: target.targets.filter((e) => !e.path.endsWith(".tkape")),
          },
        ];

  const toggleExpanded = (name: string) => {
    const newExpanded = new Set(expandedTargets);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedTargets(newExpanded);
  };

  if (pathEntries.length === 0) {
    return (
      <div className="glass-subtle rounded-xl p-6 text-center">
        <p className="text-muted-foreground text-sm">
          <span className="text-primary">$</span> no file paths defined for this
          target
        </p>
      </div>
    );
  }

  return (
    <div className="glass-subtle overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-white/[0.04] border-b bg-white/[0.02] px-4 py-3">
        <div className="text-muted-foreground text-xs">
          <span className="text-primary">{pathEntries.length}</span> path
          {pathEntries.length !== 1 ? "s" : ""}
          {target.isCompound && resolvedTargets && (
            <span className="ml-2">
              from{" "}
              <span className="text-primary">{resolvedTargets.length}</span>{" "}
              targets
            </span>
          )}
        </div>
        <button
          aria-label="Copy all paths to clipboard"
          className="focus-ring rounded-sm px-2 py-1 text-primary text-xs transition-colors hover:text-primary/80"
          onClick={handleCopyAll}
          type="button"
        >
          {copiedPath === "all" ? "[copied!]" : "[copy all]"}
        </button>
      </div>

      {/* Paths List */}
      {target.isCompound && resolvedTargets ? (
        // Grouped view for compound targets
        <div className="divide-y divide-white/[0.04]">
          {groupedPaths.map((group) => (
            <div key={group.name}>
              <button
                aria-expanded={expandedTargets.has(group.name)}
                className="focus-ring flex w-full items-center justify-between bg-white/[0.02] px-4 py-2 text-left transition-colors hover:bg-white/[0.04]"
                onClick={() => toggleExpanded(group.name)}
                type="button"
              >
                <span className="font-medium text-xs">
                  <span className="mr-2 text-primary">▸</span>
                  {group.name}
                  <span className="ml-2 text-muted-foreground">
                    ({group.entries.length} path
                    {group.entries.length !== 1 ? "s" : ""})
                  </span>
                </span>
                <a
                  className="text-[10px] text-primary transition-colors hover:text-primary/80"
                  href={`/artifact/${group.slug}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  [view]
                </a>
              </button>
              {expandedTargets.has(group.name) && (
                <div className="bg-black/20">
                  {group.entries.map((entry, i) => (
                    <PathEntry
                      copiedPath={copiedPath}
                      entry={entry}
                      key={`${group.name}-${i}`}
                      onCopy={handleCopyPath}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Flat list for individual targets
        <div className="divide-y divide-white/[0.04]">
          {pathEntries.map((entry, i) => (
            <PathEntry
              copiedPath={copiedPath}
              entry={entry}
              key={i}
              onCopy={handleCopyPath}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="border-white/[0.04] border-t bg-white/[0.02] px-4 py-2 text-[10px] text-muted-foreground">
        <span className="text-primary">{"›"}</span> paths use Windows environment
        syntax
      </div>
    </div>
  );
}

interface PathEntryProps {
  entry: KapeTargetEntry;
  copiedPath: string | null;
  onCopy: (path: string, fileMask?: string) => void;
}

function PathEntry({ entry, copiedPath, onCopy }: PathEntryProps) {
  const fullPath = entry.fileMask
    ? `${entry.path}${entry.fileMask}`
    : entry.path;
  const isCopied = copiedPath === fullPath;

  return (
    <div className="group flex items-start justify-between px-4 py-3 transition-colors hover:bg-primary/5">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            {entry.category || "file"}
          </span>
          {entry.name && (
            <span className="text-muted-foreground text-xs">{entry.name}</span>
          )}
        </div>
        <code className="block select-all break-all text-primary text-xs">
          {entry.path}
          {entry.fileMask && (
            <span className="text-amber-400">{entry.fileMask}</span>
          )}
        </code>
        {entry.comment && (
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            {entry.comment}
          </p>
        )}
      </div>
      <button
        aria-label={`Copy path: ${fullPath}`}
        className="focus-ring ml-4 shrink-0 rounded-sm px-2 py-1 text-muted-foreground text-xs opacity-0 transition-all hover:text-foreground focus:opacity-100 group-hover:opacity-100"
        onClick={() => onCopy(entry.path, entry.fileMask)}
        type="button"
      >
        {isCopied ? "copied!" : "copy"}
      </button>
    </div>
  );
}
