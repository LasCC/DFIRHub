export interface KapeTargetEntry {
  name: string;
  category: string;
  path: string;
  fileMask?: string;
  recursive?: boolean;
  comment?: string;
}

export interface EntryGroup {
  entries: readonly KapeTargetEntry[];
}

export const USER_PROFILE_VARIABLE = /%user%/iu;
const TRAILING_BACKSLASHES = /\\+$/u;

export function isPerUserEntry(entry: KapeTargetEntry): boolean {
  return USER_PROFILE_VARIABLE.test(entry.path);
}

export function stripTrailingBackslashes(value: string): string {
  return value.replace(TRAILING_BACKSLASHES, "");
}

export function joinPathAndMask(path: string, fileMask?: string): string {
  if (!fileMask) {
    return path;
  }
  if (path.endsWith("\\") || path.endsWith("/")) {
    return `${path}${fileMask}`;
  }
  const separator = path.includes("/") && !path.includes("\\") ? "/" : "\\";
  return `${path}${separator}${fileMask}`;
}

function entryIdentity(entry: KapeTargetEntry): string {
  return [
    entry.path.toLowerCase(),
    (entry.fileMask ?? "").toLowerCase(),
    entry.recursive === true ? "r" : "",
  ].join("|");
}

export function collectLeafTargets<Node extends EntryGroup>(
  roots: readonly Node[],
  childrenOf: (node: Node) => readonly Node[]
): Node[] {
  const leaves: Node[] = [];
  const visited = new Set<Node>();
  const visit = (node: Node) => {
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    if (node.entries.length > 0) {
      leaves.push(node);
    }
    for (const child of childrenOf(node)) {
      visit(child);
    }
  };
  for (const root of roots) {
    visit(root);
  }
  return leaves;
}

export function collectUniqueEntries(
  groups: readonly EntryGroup[]
): KapeTargetEntry[] {
  const seen = new Set<string>();
  const unique: KapeTargetEntry[] = [];
  for (const group of groups) {
    for (const entry of group.entries) {
      const identity = entryIdentity(entry);
      if (!seen.has(identity)) {
        seen.add(identity);
        unique.push(entry);
      }
    }
  }
  return unique;
}
