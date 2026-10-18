import { useState } from "react";

import {
  collectUniqueEntries,
  resolveLeafTargets,
} from "../../lib/builder/collection";
import type { CollectionSummary } from "../../lib/builder/collection";
import type { BuilderModule, BuilderTarget } from "../../lib/builder/config";
import type { KapeTargetEntry } from "../../lib/kapefiles";
import { isLockedOnLiveSystem } from "../../lib/lockedFiles";
import { Panel } from "../ui/Panel";

interface CollectionPreviewProps {
  selectedTargets: BuilderTarget[];
  targetIndex: Map<string, BuilderTarget>;
  summary: CollectionSummary;
  leafModules: BuilderModule[];
  selectedModuleCount: number;
}

const USER_VARIABLE = /%user%/i;

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function EntryFlags({ entry }: { entry: KapeTargetEntry }) {
  return (
    <span className="flex shrink-0 gap-1">
      {isLockedOnLiveSystem(entry) && (
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">
          locked
        </span>
      )}
      {USER_VARIABLE.test(entry.path) && (
        <span className="rounded border border-border px-1.5 text-[10px] text-muted-foreground">
          per user
        </span>
      )}
      {entry.recursive && (
        <span className="rounded border border-border px-1.5 text-[10px] text-muted-foreground">
          recursive
        </span>
      )}
    </span>
  );
}

function LeafTargetEntries({ leaf }: { leaf: BuilderTarget }) {
  return (
    <ul className="space-y-1 py-1.5 pl-4">
      {leaf.entries.map((entry) => (
        <li
          className="flex items-start justify-between gap-3 font-mono text-[11px]"
          key={`${entry.path}|${entry.fileMask ?? ""}|${entry.name}`}
        >
          <span className="min-w-0 break-all text-muted-foreground">
            {entry.path}
            {entry.fileMask && (
              <span className="text-foreground">{entry.fileMask}</span>
            )}
          </span>
          <EntryFlags entry={entry} />
        </li>
      ))}
    </ul>
  );
}

function SelectedTargetRow({
  target,
  targetIndex,
}: {
  target: BuilderTarget;
  targetIndex: Map<string, BuilderTarget>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const leaves = resolveLeafTargets([target.slug], targetIndex);
  const entries = collectUniqueEntries(leaves);
  const lockedCount = entries.filter(isLockedOnLiveSystem).length;

  return (
    <details
      className="group"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="text-muted-foreground text-xs transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          <span className="truncate font-medium text-sm">{target.name}</span>
        </span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {target.isCompound && `${pluralize(leaves.length, "target")} · `}
          {pluralize(entries.length, "path")}
          {lockedCount > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              {` · ${lockedCount} locked`}
            </span>
          )}
        </span>
      </summary>
      {isOpen && (
        <div className="space-y-2 border-border border-t bg-muted/30 px-4 py-3">
          {leaves.map((leaf) => (
            <div key={leaf.slug}>
              <a
                className="font-medium text-primary text-xs hover:underline"
                href={`/artifact/${leaf.slug}`}
              >
                {leaf.name}
              </a>
              <LeafTargetEntries leaf={leaf} />
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <div className="bg-background px-4 py-3">
      <div
        className={`font-semibold text-lg tabular-nums ${tone === "warning" && value > 0 ? "text-amber-700 dark:text-amber-400" : ""}`}
      >
        {value}
      </div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

export function CollectionPreview({
  selectedTargets,
  targetIndex,
  summary,
  leafModules,
  selectedModuleCount,
}: CollectionPreviewProps) {
  const isEmpty = selectedTargets.length === 0 && selectedModuleCount === 0;

  return (
    <Panel
      headingId="preview-heading"
      subtitle="Compound targets and modules, expanded to what KAPE runs"
      title="What this collects"
    >
      {isEmpty ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          Pick a scenario, targets or modules to see the collection plan
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px border-border border-b bg-border sm:grid-cols-5">
            <Stat label="artifact targets" value={summary.leafTargets} />
            <Stat label="unique paths" value={summary.paths} />
            <Stat label="per-user paths" value={summary.perUserPaths} />
            <Stat
              label="locked when live"
              tone="warning"
              value={summary.lockedPaths}
            />
            <Stat label="module processors" value={leafModules.length} />
          </div>
          {selectedTargets.length > 0 && (
            <div className="divide-y divide-border">
              {selectedTargets.map((target) => (
                <SelectedTargetRow
                  key={target.slug}
                  target={target}
                  targetIndex={targetIndex}
                />
              ))}
            </div>
          )}
          {leafModules.length > 0 && (
            <div className="border-border border-t px-4 py-3">
              <p className="mb-2 text-muted-foreground text-xs">
                Modules run these processors. Their tools must be in{" "}
                <code className="font-mono text-foreground">
                  KAPE\Modules\bin
                </code>
                .{" "}
                <code className="font-mono text-foreground">
                  kape.exe --mdetail
                </code>{" "}
                lists the missing ones with their download links.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {leafModules.map((module) => (
                  <span
                    className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    key={module.name}
                    title={module.description}
                  >
                    {module.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
