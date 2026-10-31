import { ChevronRight } from "lucide-react";
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

const USER_VARIABLE = /%user%/iu;

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function EntryFlags({ entry }: { entry: KapeTargetEntry }) {
  return (
    <span className="flex shrink-0 gap-1">
      {isLockedOnLiveSystem(entry) && (
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          locked
        </span>
      )}
      {USER_VARIABLE.test(entry.path) && (
        <span className="rounded border border-border px-1.5 text-[11px] text-muted-foreground">
          per user
        </span>
      )}
      {entry.recursive && (
        <span className="rounded border border-border px-1.5 text-[11px] text-muted-foreground">
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
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-muted">
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

function SummaryStats({
  summary,
  processorCount,
}: {
  summary: CollectionSummary;
  processorCount: number;
}) {
  const parts: { label: string; key: string; warning?: boolean }[] = [];
  if (summary.leafTargets > 0) {
    parts.push({
      key: "targets",
      label: pluralize(summary.leafTargets, "target"),
    });
  }
  if (summary.paths > 0) {
    parts.push({
      key: "paths",
      label: `${summary.paths.toLocaleString()} ${summary.paths === 1 ? "path" : "paths"}`,
    });
  }
  if (summary.perUserPaths > 0) {
    parts.push({
      key: "per-user",
      label: `${summary.perUserPaths.toLocaleString()} per-user`,
    });
  }
  if (summary.lockedPaths > 0) {
    parts.push({
      key: "locked",
      label: `${summary.lockedPaths.toLocaleString()} locked`,
      warning: true,
    });
  }
  if (processorCount > 0) {
    parts.push({
      key: "processors",
      label: pluralize(processorCount, "processor"),
    });
  }

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs tabular-nums">
      {parts.map((part, index) => (
        <span className="flex items-center gap-2" key={part.key}>
          {index > 0 && (
            <span aria-hidden="true" className="text-muted-foreground/40">
              ·
            </span>
          )}
          <span
            className={part.warning ? "text-amber-700 dark:text-amber-400" : ""}
          >
            {part.label}
          </span>
        </span>
      ))}
    </span>
  );
}

export function CollectionPreview({
  selectedTargets,
  targetIndex,
  summary,
  leafModules,
  selectedModuleCount,
}: CollectionPreviewProps) {
  if (selectedTargets.length === 0 && selectedModuleCount === 0) {
    return null;
  }

  return (
    <Panel
      actions={
        <SummaryStats processorCount={leafModules.length} summary={summary} />
      }
      headingId="preview-heading"
      title="Collection plan"
    >
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
        <details
          className="group border-border border-t"
          title="Run kape.exe --mdetail to list missing tools."
        >
          <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 px-3 py-2 transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90"
            />
            <span className="font-medium text-xs text-muted-foreground">
              Processors
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {leafModules.length}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground/70">
              from KAPE\Modules\bin
            </span>
          </summary>
          <div className="flex flex-wrap gap-1.5 px-3 pb-3">
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
        </details>
      )}
    </Panel>
  );
}
