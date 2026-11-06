import type { KapeTargetEntry } from "../kapeEntries";
import { collectLeafTargets, collectUniqueEntries, isPerUserEntry } from "../kapeEntries";
import { isLockedOnLiveSystem } from "../lockedFiles";
import type { ScriptTarget } from "../generators";
import type {
  BuilderModule,
  BuilderTarget,
  OutputFormat,
  ScriptFormat,
} from "./config";
import { isScriptFormat } from "./config";

export interface CollectionSummary {
  leafTargets: number;
  paths: number;
  lockedPaths: number;
  perUserPaths: number;
}

export interface ResolvedCollection {
  leaves: BuilderTarget[];
  entries: KapeTargetEntry[];
  summary: CollectionSummary;
}

const KAPE_VARIABLE = /%[md]/giu;
const MACHINE_NAME_VARIABLE = "%m";

function compactTimestamp(date: Date): string {
  return date
    .toISOString()
    .replaceAll(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "");
}

const SCRIPT_VARIABLES: Record<
  ScriptFormat,
  { machine: string; timestamp: () => string }
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
  if (!isScriptFormat(format)) {
    return path;
  }
  const variables = SCRIPT_VARIABLES[format];
  return path.replace(KAPE_VARIABLE, (variable) =>
    variable.toLowerCase() === MACHINE_NAME_VARIABLE
      ? variables.machine
      : variables.timestamp()
  );
}

function lookupAll<Node>(
  keys: readonly string[],
  index: Map<string, Node>
): Node[] {
  return keys
    .map((key) => index.get(key))
    .filter((node): node is Node => node !== undefined);
}

export function resolveCollection(
  slugs: readonly string[],
  index: Map<string, BuilderTarget>
): ResolvedCollection {
  const leaves = collectLeafTargets(lookupAll(slugs, index), (target) =>
    lookupAll(target.childSlugs, index)
  );
  const entries = collectUniqueEntries(leaves);
  return {
    entries,
    leaves,
    summary: {
      leafTargets: leaves.length,
      lockedPaths: entries.filter(isLockedOnLiveSystem).length,
      paths: entries.length,
      perUserPaths: entries.filter(isPerUserEntry).length,
    },
  };
}

export function scriptTargetFor(
  selected: readonly BuilderTarget[],
  entries: KapeTargetEntry[]
): ScriptTarget {
  return { entries, name: selected.map((target) => target.name).join(", ") };
}

export function kapeNamesFor(selected: readonly BuilderTarget[]): string[] {
  return [...new Set(selected.map((target) => target.kapeName))];
}

export function resolveLeafModules(
  names: readonly string[],
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
