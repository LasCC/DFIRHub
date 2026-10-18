import type { KapeTarget, KapeTargetEntry } from "../kapefiles";
import { isLockedOnLiveSystem } from "../lockedFiles";
import type { BuilderModule, BuilderTarget, OutputFormat } from "./config";

export interface CollectionSummary {
  leafTargets: number;
  paths: number;
  lockedPaths: number;
  perUserPaths: number;
}

const USER_VARIABLE = /%user%/i;
const MACHINE_NAME_VARIABLE = /%m/gi;
const TIMESTAMP_VARIABLE = /%d/gi;

function compactTimestamp(date: Date): string {
  return date
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "");
}

const SCRIPT_VARIABLES: Partial<
  Record<OutputFormat, { machine: string; timestamp: () => string }>
> = {
  batch: {
    machine: "%COMPUTERNAME%",
    timestamp: () => compactTimestamp(new Date()),
  },
  powershell: {
    machine: "$env:COMPUTERNAME",
    timestamp: () => "$(Get-Date -Format 'yyyyMMddTHHmmss')",
  },
  wsl: { machine: "$(hostname)", timestamp: () => "$(date +%Y%m%dT%H%M%S)" },
};

export function translateKapeVariables(
  path: string,
  format: OutputFormat
): string {
  const variables = SCRIPT_VARIABLES[format];
  if (!variables) {
    return path;
  }
  return path
    .replace(MACHINE_NAME_VARIABLE, () => variables.machine)
    .replace(TIMESTAMP_VARIABLE, () => variables.timestamp());
}

function entryKey(entry: KapeTargetEntry): string {
  return [
    entry.path.toLowerCase(),
    (entry.fileMask ?? "").toLowerCase(),
    entry.recursive === true ? "r" : "",
  ].join("|");
}

export function resolveLeafTargets(
  slugs: string[],
  index: Map<string, BuilderTarget>
): BuilderTarget[] {
  const leaves: BuilderTarget[] = [];
  const visited = new Set<string>();

  const visit = (slug: string) => {
    if (visited.has(slug)) {
      return;
    }
    visited.add(slug);
    const target = index.get(slug);
    if (!target) {
      return;
    }
    if (target.entries.length > 0) {
      leaves.push(target);
    }
    for (const childSlug of target.childSlugs) {
      visit(childSlug);
    }
  };

  for (const slug of slugs) {
    visit(slug);
  }
  return leaves;
}

export function collectUniqueEntries(
  leaves: BuilderTarget[]
): KapeTargetEntry[] {
  const seen = new Set<string>();
  const entries: KapeTargetEntry[] = [];
  for (const leaf of leaves) {
    for (const entry of leaf.entries) {
      const key = entryKey(entry);
      if (!seen.has(key)) {
        seen.add(key);
        entries.push(entry);
      }
    }
  }
  return entries;
}

export function summarizeCollection(
  leaves: BuilderTarget[],
  entries: KapeTargetEntry[]
): CollectionSummary {
  return {
    leafTargets: leaves.length,
    lockedPaths: entries.filter(isLockedOnLiveSystem).length,
    paths: entries.length,
    perUserPaths: entries.filter((entry) => USER_VARIABLE.test(entry.path))
      .length,
  };
}

export function buildScriptTarget(
  selected: BuilderTarget[],
  entries: KapeTargetEntry[]
): KapeTarget {
  const name = selected.map((target) => target.name).join(", ");
  return {
    author: "DFIRHub",
    category: "Custom",
    description: "",
    documentation: [],
    id: "",
    isCompound: false,
    name,
    recreateDirectories: true,
    referencedTargets: [],
    slug: "custom",
    sourceFile: "",
    targets: entries,
    version: "1.0",
  };
}

export function uniqueKapeNames(selected: BuilderTarget[]): string[] {
  return [...new Set(selected.map((target) => target.kapeName))];
}

export function resolveLeafModules(
  names: string[],
  index: Map<string, BuilderModule>
): BuilderModule[] {
  const leaves: BuilderModule[] = [];
  const visited = new Set<string>();

  const visit = (name: string) => {
    const key = name.toLowerCase();
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    const module = index.get(key);
    if (!module) {
      return;
    }
    if (!module.isCompound) {
      leaves.push(module);
    }
    for (const child of module.referencedModules) {
      visit(child);
    }
  };

  for (const name of names) {
    visit(name);
  }
  return leaves;
}
