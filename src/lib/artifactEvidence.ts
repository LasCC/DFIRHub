import type { KapeTarget, KapeTargetEntry } from "./kapefiles";
import {
  findCollectionsContaining,
  getIndividualTargets,
  getResolvedEntries,
  resolveCompoundReferences,
} from "./kapefiles";

const LEGACY_PATH_PATTERN = /windows\.old|documents and settings/iu;
const TRANSACTION_LOG_PATTERN = /\.log\d?\*?$/iu;
const MATCH_ALL_MASKS = new Set(["*", "*.*"]);
const EXTENSION_MASK_PATTERN = /^\*\.[\w-]+$/u;
const TRAILING_WILDCARD_PATTERN = /\*+$/u;
const TRAILING_SEPARATOR_PATTERN = /[\\/]+$/u;
const TRAILING_WILDCARD_SEGMENT_PATTERN = /(?:\\\*)+$/u;
const MAX_LOCATION_LENGTH = 60;
const LOG_ENTRY_NAME_PATTERN = /\blogs?\b/iu;
const REGISTRY_HIVE_FILES = new Set([
  "SAM",
  "SECURITY",
  "SOFTWARE",
  "SYSTEM",
  "DEFAULT",
]);

const PATH_SHORTCUTS: [RegExp, string][] = [
  [/^C:\\Users\\%user%\\AppData\\Roaming/iu, "%AppData%"],
  [/^C:\\Users\\%user%\\AppData\\Local/iu, "%LocalAppData%"],
  [/^C:\\Users\\%user%/iu, "%UserProfile%"],
  [/^C:\\ProgramData/iu, "%ProgramData%"],
  [/^C:\\Program Files\*/iu, "C:\\Program Files"],
  [/^C:\\Windows/iu, "%SystemRoot%"],
];

function isCollectableEntry(entry: KapeTargetEntry): boolean {
  return !(
    entry.path.endsWith(".tkape") || LEGACY_PATH_PATTERN.test(entry.path)
  );
}

function toReadableFileName(mask: string | undefined): string | null {
  if (
    !mask ||
    MATCH_ALL_MASKS.has(mask) ||
    TRANSACTION_LOG_PATTERN.test(mask)
  ) {
    return null;
  }
  if (EXTENSION_MASK_PATTERN.test(mask)) {
    return mask;
  }
  const withoutTrailingWildcard = mask.replace(TRAILING_WILDCARD_PATTERN, "");
  if (withoutTrailingWildcard.includes("*")) {
    return null;
  }
  return REGISTRY_HIVE_FILES.has(withoutTrailingWildcard)
    ? `${withoutTrailingWildcard} hive`
    : withoutTrailingWildcard;
}

function limitPathDepth(path: string): string {
  const segments = path.split("\\");
  while (
    segments.length > 2 &&
    segments.join("\\").length > MAX_LOCATION_LENGTH
  ) {
    segments.pop();
  }
  return segments.join("\\");
}

export function shortenWindowsPath(path: string): string {
  const trimmed = path
    .replace(TRAILING_SEPARATOR_PATTERN, "")
    .replace(TRAILING_WILDCARD_SEGMENT_PATTERN, "");
  for (const [pattern, replacement] of PATH_SHORTCUTS) {
    if (pattern.test(trimmed)) {
      return trimmed.replace(pattern, replacement);
    }
  }
  return trimmed;
}

function uniqueCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function rankExactNamesFirst(fileNames: string[]): string[] {
  const exact = fileNames.filter((name) => !name.startsWith("*"));
  const extensions = fileNames.filter((name) => name.startsWith("*"));
  return [...exact, ...extensions];
}

export interface ArtifactEvidence {
  keyFiles: string[];
  locations: string[];
  mentionsLogs: boolean;
}

export function getArtifactEvidence(target: KapeTarget): ArtifactEvidence {
  const entries = getResolvedEntries(target).filter(isCollectableEntry);
  const fileNames = entries.flatMap((entry) => {
    const fileName = toReadableFileName(entry.fileMask);
    return fileName ? [fileName] : [];
  });
  return {
    keyFiles: rankExactNamesFirst(uniqueCaseInsensitive(fileNames)),
    locations: uniqueCaseInsensitive(
      entries.map((entry) => limitPathDepth(shortenWindowsPath(entry.path)))
    ),
    mentionsLogs: entries.some((entry) =>
      LOG_ENTRY_NAME_PATTERN.test(entry.name)
    ),
  };
}

const RELATED_ARTIFACT_LIMIT = 8;
const SAME_CATEGORY_BONUS = 0.05;
const MAX_FOCUSED_COLLECTION_SIZE = 100;

function scoreSharedCollections(
  ownCollectionSizes: Map<string, number>,
  candidate: KapeTarget
): number {
  let score = 0;
  for (const collection of findCollectionsContaining(candidate.slug)) {
    const size = ownCollectionSizes.get(collection.slug);
    if (size) {
      score += 1 / size;
    }
  }
  return score;
}

export function findRelatedArtifacts(target: KapeTarget): KapeTarget[] {
  if (target.isCompound) {
    return [];
  }
  const ownCollectionSizes = new Map(
    findCollectionsContaining(target.slug)
      .map((collection) => ({
        size: resolveCompoundReferences(collection).length,
        slug: collection.slug,
      }))
      .filter(({ size }) => size > 1 && size <= MAX_FOCUSED_COLLECTION_SIZE)
      .map(({ slug, size }) => [slug, size])
  );
  if (ownCollectionSizes.size === 0) {
    return [];
  }

  return getIndividualTargets()
    .filter((candidate) => candidate.slug !== target.slug)
    .map((candidate) => ({
      candidate,
      sharedScore: scoreSharedCollections(ownCollectionSizes, candidate),
      sameCategory: candidate.category === target.category,
    }))
    .filter(({ sharedScore }) => sharedScore > 0)
    .map(({ candidate, sharedScore, sameCategory }) => ({
      candidate,
      score: sharedScore + (sameCategory ? SAME_CATEGORY_BONUS : 0),
    }))
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        left.candidate.name.localeCompare(right.candidate.name)
    )
    .slice(0, RELATED_ARTIFACT_LIMIT)
    .map(({ candidate }) => candidate);
}
