import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import type { KapeTarget, KapeTargetEntry } from "../../lib/kapefiles";
import type { CategoryStyle } from "../../lib/categoryStyles";

import { useCopyFeedbackKeyed } from "../../hooks/useCopyFeedback";
import { trackCopyPath } from "../../lib/analytics";
import { getCategoryStyle } from "../../lib/categoryStyles";

interface PathBrowserProps {
  target: KapeTarget;
  resolvedTargets?: KapeTarget[];
}

// ─── Category → accent classes (rounded pill badges) ───
// categoryStyles keys are capitalized ("Windows", "P2P"); normalize lookup.
const SPECIAL_KEYS: Record<string, string> = { p2p: "P2P" };

function getCategoryStyleFor(category: string): CategoryStyle {
  const lower = category.toLowerCase();
  const key =
    SPECIAL_KEYS[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1);
  return getCategoryStyle(key);
}

function getCategoryClasses(category: string): string {
  const style = getCategoryStyleFor(category);
  return `${style.bg} ${style.text} border-current/40`;
}

// ─── Clipboard helper ───
async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    const announcer = document.querySelector("#live-announcer");
    if (announcer) {
      announcer.textContent = `${label} copied to clipboard`;
      setTimeout(() => {
        announcer.textContent = "";
      }, 1000);
    }
  } catch (error) {
    console.error("Failed to copy:", error);
  }
}

// ─── Path segment parser ───
interface PathSegment {
  text: string;
  type: "drive" | "separator" | "envvar" | "dir" | "mask";
}

// Joins a KAPE `Path` and `FileMask` with an inferred separator.
// .tkape authors may or may not include a trailing `\`; without this,
// a path like `...\AnyDesk` + mask `file_transfer_trace.txt` collapses
// into `...\AnyDeskfile_transfer_trace.txt`.
function joinPathAndMask(pathStr: string, fileMask?: string): string {
  if (!fileMask) {
    return pathStr;
  }
  if (pathStr.endsWith("\\") || pathStr.endsWith("/")) {
    return `${pathStr}${fileMask}`;
  }
  const sep = pathStr.includes("/") && !pathStr.includes("\\") ? "/" : "\\";
  return `${pathStr}${sep}${fileMask}`;
}

function parsePathSegments(pathStr: string, fileMask?: string): PathSegment[] {
  const segments: PathSegment[] = [];
  // Match: drive letter, env vars (%...%), separators (\), and directory names
  const regex = /([A-Za-z]:)|(%[^%]+%)|([\\/])|([^\\/]+)/g;
  let match: RegExpExecArray | null = regex.exec(pathStr);

  while (match !== null) {
    if (match[1]) {
      segments.push({ text: match[1], type: "drive" });
    } else if (match[2]) {
      segments.push({ text: match[2], type: "envvar" });
    } else if (match[3]) {
      segments.push({ text: match[3], type: "separator" });
    } else if (match[4]) {
      segments.push({ text: match[4], type: "dir" });
    }
    match = regex.exec(pathStr);
  }

  if (fileMask) {
    const lastSeg = segments.at(-1);
    if (lastSeg && lastSeg.type !== "separator") {
      const sep = pathStr.includes("/") && !pathStr.includes("\\") ? "/" : "\\";
      segments.push({ text: sep, type: "separator" });
    }
    segments.push({ text: fileMask, type: "mask" });
  }

  return segments;
}

// ─── Main component ───
export function PathBrowser({ target, resolvedTargets }: PathBrowserProps) {
  const [copiedPath, triggerCopied] = useCopyFeedbackKeyed<string>();
  // For compound targets, default-expand the first group so visitors land on
  // visible content instead of a row of collapsed accordions.
  const firstGroupName =
    target.isCompound && resolvedTargets?.[0]
      ? resolvedTargets[0].name
      : undefined;
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(
    () => new Set(firstGroupName ? [firstGroupName] : [])
  );
  const [filter, setFilter] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set()
  );

  // Memoized path entries
  const pathEntries = useMemo(
    () =>
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
            })),
    [target, resolvedTargets]
  );

  // Memoized grouped paths for compound targets
  const groupedPaths = useMemo(
    () =>
      target.isCompound && resolvedTargets
        ? resolvedTargets.map((t) => ({
            entries: t.targets.filter((e) => !e.path.endsWith(".tkape")),
            name: t.name,
            slug: t.slug,
          }))
        : [
            {
              entries: target.targets.filter((e) => !e.path.endsWith(".tkape")),
              name: target.name,
              slug: target.slug,
            },
          ],
    [target, resolvedTargets]
  );

  // Unique categories for filter chips
  const uniqueCategories = useMemo(() => {
    const cats = new Set(
      pathEntries.map((e) => (e.category || "file").toLowerCase())
    );
    return [...cats].toSorted();
  }, [pathEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let entries = pathEntries;
    if (filter) {
      const q = filter.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.name?.toLowerCase().includes(q) ||
          e.fileMask?.toLowerCase().includes(q) ||
          e.comment?.toLowerCase().includes(q)
      );
    }
    if (activeCategories.size > 0) {
      entries = entries.filter((e) =>
        activeCategories.has((e.category || "file").toLowerCase())
      );
    }
    return entries;
  }, [pathEntries, filter, activeCategories]);

  // Filtered grouped paths for compound display
  const filteredGroupedPaths = useMemo(() => {
    if (!filter && activeCategories.size === 0) {
      return groupedPaths;
    }

    const q = filter.toLowerCase();
    return groupedPaths
      .map((group) => ({
        ...group,
        entries: group.entries.filter((e) => {
          const matchesText =
            !filter ||
            e.path.toLowerCase().includes(q) ||
            e.name?.toLowerCase().includes(q) ||
            e.fileMask?.toLowerCase().includes(q) ||
            e.comment?.toLowerCase().includes(q);
          const matchesCat =
            activeCategories.size === 0 ||
            activeCategories.has((e.category || "file").toLowerCase());
          return matchesText && matchesCat;
        }),
      }))
      .filter((group) => group.entries.length > 0);
  }, [groupedPaths, filter, activeCategories]);

  const handleCopyPath = async (path: string, fileMask?: string) => {
    const fullPath = joinPathAndMask(path, fileMask);
    await copyToClipboard(fullPath, "Path");
    trackCopyPath(fullPath, target.name);
    triggerCopied(fullPath);
  };

  const handleCopyAll = async () => {
    const allPaths = pathEntries
      .map((e) => joinPathAndMask(e.path, e.fileMask))
      .join("\n");
    await copyToClipboard(allPaths, "All paths");
    triggerCopied("all");
  };

  const toggleExpanded = (name: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const showFilter = pathEntries.length > 5;
  const visibleCount =
    target.isCompound && resolvedTargets
      ? filteredGroupedPaths.reduce((n, g) => n + g.entries.length, 0)
      : filteredEntries.length;

  if (pathEntries.length === 0) {
    return (
      <div className="glass-subtle rounded-xl p-6 text-center">
        <p className="text-muted-foreground text-sm">
          No file paths defined for this target
        </p>
      </div>
    );
  }

  return (
    <div className="glass-subtle overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-overlay/[0.04] border-b bg-overlay/[0.02] px-4 py-3">
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
          {copiedPath === "all" ? "Copied!" : "Copy all"}
        </button>
      </div>

      {/* Filter bar — only shown when > 5 paths */}
      {showFilter && (
        <div className="flex flex-wrap items-center gap-2 border-overlay/[0.04] border-b bg-overlay/[0.02] px-4 py-2">
          <input
            aria-label="Filter paths"
            className="h-7 min-w-0 flex-1 rounded border border-border bg-background px-2 text-foreground text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter paths..."
            type="text"
            value={filter}
          />
          {uniqueCategories.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              {uniqueCategories.map((cat) => (
                <button
                  aria-pressed={activeCategories.has(cat)}
                  className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-0.5 font-medium text-xs uppercase tracking-wider transition-opacity ${getCategoryClasses(cat)} ${
                    activeCategories.size > 0 && !activeCategories.has(cat)
                      ? "opacity-30"
                      : ""
                  }`}
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  type="button"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          {(filter || activeCategories.size > 0) && (
            <span className="text-muted-foreground text-xs">
              {visibleCount} / {pathEntries.length}
            </span>
          )}
        </div>
      )}

      {/* Paths List */}
      <div className="scrollbar-thin max-h-[600px] overflow-y-auto">
        {target.isCompound && resolvedTargets ? (
          // Grouped view for compound targets
          <div className="divide-y divide-overlay/[0.04]">
            {filteredGroupedPaths.map((group) => (
              <div key={group.name}>
                <button
                  aria-expanded={expandedTargets.has(group.name)}
                  className="focus-ring flex w-full items-center justify-between bg-overlay/[0.02] px-4 py-2 text-left transition-colors hover:bg-overlay/[0.04]"
                  onClick={() => toggleExpanded(group.name)}
                  type="button"
                >
                  <span className="font-medium text-xs">
                    <ChevronRight
                      aria-hidden="true"
                      className={`mr-1 inline-block h-3.5 w-3.5 align-middle text-primary transition-transform ${
                        expandedTargets.has(group.name) ? "rotate-90" : ""
                      }`}
                    />
                    {group.name}
                    <span className="ml-2 text-muted-foreground">
                      ({group.entries.length} path
                      {group.entries.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                  {group.slug !== target.slug && (
                    <a
                      className="text-primary text-xs transition-colors hover:text-primary/80"
                      href={`/artifact/${group.slug}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                  )}
                </button>
                {expandedTargets.has(group.name) && (
                  <div className="bg-sunken">
                    {group.entries.map((entry, i) => (
                      <PathEntry
                        copiedPath={copiedPath}
                        entry={entry}
                        key={`${group.name}-${entry.path}-${i}`}
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
          <div className="divide-y divide-overlay/[0.04]">
            {filteredEntries.map((entry, i) => (
              <PathEntry
                copiedPath={copiedPath}
                entry={entry}
                key={`${entry.name}-${entry.path}-${i}`}
                onCopy={handleCopyPath}
              />
            ))}
          </div>
        )}

        {/* No results state */}
        {visibleCount === 0 && (filter || activeCategories.size > 0) && (
          <div className="px-4 py-6 text-center text-muted-foreground text-xs">
            No paths match the current filter
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-overlay/[0.04] border-t bg-overlay/[0.02] px-4 py-2 text-muted-foreground text-xs">
        Paths use Windows environment variable syntax
      </div>
    </div>
  );
}

// ─── PathEntry sub-component ───
interface PathEntryProps {
  entry: KapeTargetEntry;
  copiedPath: string | null;
  onCopy: (path: string, fileMask?: string) => void;
}

function PathEntry({ entry, copiedPath, onCopy }: PathEntryProps) {
  const fullPath = joinPathAndMask(entry.path, entry.fileMask);
  const isCopied = copiedPath === fullPath;
  const segments = useMemo(
    () => parsePathSegments(entry.path, entry.fileMask),
    [entry.path, entry.fileMask]
  );
  const colorClasses = getCategoryClasses(entry.category || "file");

  return (
    <button
      aria-label={`Copy path: ${fullPath}`}
      className="group relative flex w-full cursor-pointer items-start justify-between px-4 py-3 text-left transition-colors hover:z-10 hover:bg-primary/5"
      onClick={() => onCopy(entry.path, entry.fileMask)}
      type="button"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-start gap-1.5 sm:items-center sm:gap-2">
          <span
            className={`inline-flex max-w-[11.5rem] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-1.5 py-0.5 font-medium text-xs uppercase tracking-wider ${colorClasses}`}
            title={entry.category || "file"}
          >
            {entry.category || "file"}
          </span>
          {entry.name && (
            <span className="text-muted-foreground text-xs leading-4">
              {entry.name}
            </span>
          )}
        </div>
        <code className="block break-all font-mono text-xs leading-relaxed">
          {segments.map((seg, i) => {
            switch (seg.type) {
              case "drive": {
                return (
                  <span className="text-foreground/70" key={i}>
                    {seg.text}
                  </span>
                );
              }
              case "separator": {
                return (
                  <span className="text-foreground/40" key={i}>
                    {seg.text}
                  </span>
                );
              }
              case "envvar": {
                return (
                  <span
                    className="rounded-sm bg-cyan-500/10 px-0.5 text-cyan-700 dark:text-cyan-400"
                    key={i}
                  >
                    {seg.text}
                  </span>
                );
              }
              case "mask": {
                return (
                  <span
                    className="text-amber-700 dark:text-amber-400"
                    key={i}
                  >
                    {seg.text}
                  </span>
                );
              }
              default: {
                return (
                  <span className="text-foreground/80" key={i}>
                    {seg.text}
                  </span>
                );
              }
            }
          })}
        </code>
        {entry.comment && (
          <p className="mt-1 text-muted-foreground text-xs">{entry.comment}</p>
        )}
      </div>
      <span
        className={`relative ml-2 shrink-0 rounded-md p-1.5 transition-all sm:ml-4 ${
          isCopied
            ? "text-primary"
            : "text-muted-foreground opacity-100 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
        }`}
        title={isCopied ? "Copied!" : "Copy path"}
      >
        {isCopied ? (
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )}
      </span>
    </button>
  );
}
