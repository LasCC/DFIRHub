import fs from "node:fs";
import path from "node:path";

import * as yaml from "js-yaml";

import type { KapeTargetEntry } from "./kapeEntries";
import { collectLeafTargets, collectUniqueEntries } from "./kapeEntries";

export type { KapeTargetEntry } from "./kapeEntries";

export const KAPEFILES_DIRECTORY = "src/content/kapefiles";
export const KAPE_DISABLED_FOLDER = "!Disabled";

const VERSION_LINE_PATTERN = /^Version:[ \t]*["']?(?<value>[^"'\r\n]+?)["']?[ \t]*$/mu;
const DEFAULT_TARGET_VERSION = "1.0";
const TARGET_FILE_EXTENSION = ".tkape";
const TARGET_FILE_EXTENSION_PATTERN = /\.tkape$/u;
const COMPOUND_PREFIX_PATTERN = /^!/u;
const DOCUMENTATION_MARKER = "# Documentation";
const EMPTY_DOCUMENTATION_LINE = "N/A";

export interface KapeTarget {
  name: string;
  kapeName: string;
  description: string;
  author: string;
  version: string;
  category: string;
  slug: string;
  sourceFile: string;
  isCompound: boolean;
  entries: KapeTargetEntry[];
  referencedTargets: string[];
  documentation: string[];
}

interface RawKapeTarget {
  Description?: string;
  Author?: string;
  Targets?: RawKapeTargetEntry[];
}

interface RawKapeTargetEntry {
  Name?: string;
  Category?: string;
  Path?: string;
  FileMask?: string;
  Recursive?: boolean;
  Comment?: string;
}

interface TargetIndexes {
  bySlug: Map<string, KapeTarget>;
  byReferenceName: Map<string, KapeTarget[]>;
}

let targetCache: KapeTarget[] | null = null;
let targetIndexesCache: TargetIndexes | null = null;
let collectionLookupCache: Map<string, KapeTarget[]> | null = null;

export function readKapeYaml(content: string): string {
  return content.split(/^#/mu)[0];
}

export function warnUnparsableKapeFile(filePath: string, error: unknown): void {
  console.warn(`Failed to parse ${filePath}:`, error);
}

function isTargetReference(entryPath: string): boolean {
  return entryPath.endsWith(TARGET_FILE_EXTENSION);
}

function referenceName(fileName: string): string {
  return fileName
    .replace(TARGET_FILE_EXTENSION_PATTERN, "")
    .replace(COMPOUND_PREFIX_PATTERN, "");
}

function createSlug(fileName: string): string {
  return referenceName(fileName)
    .replaceAll(/[^a-zA-Z0-9_-]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")
    .toLowerCase();
}

function canonicalOrderKey(target: KapeTarget): string {
  return `${target.category}/${target.sourceFile}`.toLowerCase();
}

function byCanonicalOrder(left: KapeTarget, right: KapeTarget): number {
  return canonicalOrderKey(left).localeCompare(canonicalOrderKey(right));
}

function stableHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index++) {
    hash = (hash * 31 + (input.codePointAt(index) ?? 0)) % 4_294_967_296;
  }
  return hash.toString(36).slice(0, 6);
}

function assignUniqueSlugs(targets: KapeTarget[]): void {
  const groupedBySlug = Map.groupBy(targets, (target) => target.slug);
  const usedSlugs = new Set<string>();

  for (const [slug, grouped] of groupedBySlug) {
    const [canonical, ...duplicates] = grouped.toSorted(byCanonicalOrder);
    canonical.slug = slug;
    usedSlugs.add(slug);

    for (const duplicate of duplicates) {
      const categorySuffix = createSlug(duplicate.category) || "category";
      const sourceSuffix =
        createSlug(duplicate.sourceFile.replace(TARGET_FILE_EXTENSION_PATTERN, "")) ||
        "target";
      const discriminator = stableHash(canonicalOrderKey(duplicate));
      const candidates = [
        `${slug}-${categorySuffix}`,
        `${slug}-${sourceSuffix}`,
        `${slug}-${categorySuffix}-${discriminator}`,
      ];
      const uniqueSlug =
        candidates.find((candidate) => !usedSlugs.has(candidate)) ??
        `${slug}-${categorySuffix}-${sourceSuffix}-${discriminator}`;
      duplicate.slug = uniqueSlug;
      usedSlugs.add(uniqueSlug);
    }
  }

  const duplicateSlugs = targets
    .map((target) => target.slug)
    .filter((slug, index, all) => all.indexOf(slug) !== index);
  if (duplicateSlugs.length > 0) {
    const values = [...new Set(duplicateSlugs)].join(", ");
    throw new Error(`Duplicate artifact slugs detected: ${values}`);
  }
}

function getTargetIndexes(): TargetIndexes {
  if (targetIndexesCache) {
    return targetIndexesCache;
  }
  const allTargets = loadAllTargets();
  targetIndexesCache = {
    bySlug: new Map(allTargets.map((target) => [target.slug, target])),
    byReferenceName: Map.groupBy(allTargets, (target) =>
      referenceName(target.sourceFile).toLowerCase()
    ),
  };
  return targetIndexesCache;
}

function readDocumentation(content: string): string[] {
  const documentation: string[] = [];
  let inDocSection = false;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(DOCUMENTATION_MARKER)) {
      inDocSection = true;
      continue;
    }
    if (inDocSection && trimmed.startsWith("#")) {
      const docLine = trimmed.replace(/^#\s*/u, "").trim();
      if (docLine && docLine !== EMPTY_DOCUMENTATION_LINE) {
        documentation.push(docLine);
      }
    }
  }
  return documentation;
}

function toEntry(raw: RawKapeTargetEntry): KapeTargetEntry {
  return {
    name: raw.Name || "",
    category: raw.Category || "",
    path: raw.Path || "",
    fileMask: raw.FileMask,
    recursive: raw.Recursive,
    comment: raw.Comment,
  };
}

function parseKapeFile(filePath: string, category: string): KapeTarget | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath);
    const yamlContent = readKapeYaml(content);
    const raw = yaml.load(yamlContent) as RawKapeTarget;

    if (!raw?.Targets) {
      return null;
    }

    const allEntries = raw.Targets.map(toEntry);
    const referencedTargets = allEntries
      .map((entry) => entry.path)
      .filter(isTargetReference);

    return {
      name: referenceName(fileName),
      kapeName: fileName.replace(TARGET_FILE_EXTENSION_PATTERN, ""),
      description: raw.Description || "",
      author: raw.Author || "Unknown",
      version:
        yamlContent.match(VERSION_LINE_PATTERN)?.groups?.value ??
        DEFAULT_TARGET_VERSION,
      category,
      slug: createSlug(fileName),
      sourceFile: fileName,
      isCompound: referencedTargets.length > 0,
      entries: allEntries.filter((entry) => !isTargetReference(entry.path)),
      referencedTargets,
      documentation: readDocumentation(content),
    };
  } catch (error) {
    warnUnparsableKapeFile(filePath, error);
    return null;
  }
}

export function loadAllTargets(): KapeTarget[] {
  if (targetCache) {
    return targetCache;
  }

  const targetsDir = path.join(process.cwd(), KAPEFILES_DIRECTORY, "Targets");
  if (!fs.existsSync(targetsDir)) {
    throw new Error(
      `KapeFiles Targets directory not found: ${targetsDir}. Run git submodule update --init.`
    );
  }

  const categories = fs
    .readdirSync(targetsDir, { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        !dirent.name.startsWith(".") &&
        dirent.name !== KAPE_DISABLED_FOLDER
    )
    .map((dirent) => dirent.name)
    .toSorted();

  const targets: KapeTarget[] = [];
  for (const category of categories) {
    const categoryDir = path.join(targetsDir, category);
    const files = fs
      .readdirSync(categoryDir)
      .filter((file) => file.endsWith(TARGET_FILE_EXTENSION))
      .toSorted();
    for (const file of files) {
      const target = parseKapeFile(path.join(categoryDir, file), category);
      if (target) {
        targets.push(target);
      }
    }
  }

  assignUniqueSlugs(targets);
  targetCache = targets;
  return targets;
}

export function getTargetBySlug(slug: string): KapeTarget | undefined {
  return getTargetIndexes().bySlug.get(slug);
}

export function getTargetsByCategory(category: string): KapeTarget[] {
  return loadAllTargets().filter(
    (target) => target.category.toLowerCase() === category.toLowerCase()
  );
}

export function getCompoundTargets(): KapeTarget[] {
  return loadAllTargets().filter((target) => target.isCompound);
}

export function getIndividualTargets(): KapeTarget[] {
  return loadAllTargets().filter((target) => !target.isCompound);
}

export function findTargetByReference(reference: string): KapeTarget | undefined {
  const { bySlug, byReferenceName } = getTargetIndexes();
  const name = referenceName(path.basename(reference.replaceAll("\\", "/")));
  return (
    bySlug.get(createSlug(name)) ??
    byReferenceName.get(name.toLowerCase())?.toSorted(byCanonicalOrder)[0]
  );
}

export function getReferencedTargets(target: KapeTarget): KapeTarget[] {
  const found = target.referencedTargets
    .map(findTargetByReference)
    .filter((candidate): candidate is KapeTarget => candidate !== undefined);
  return [...new Set(found)];
}

export function getDirectReferenceSlugs(target: KapeTarget): string[] {
  return getReferencedTargets(target).map((referenced) => referenced.slug);
}

export function resolveCompoundReferences(target: KapeTarget): KapeTarget[] {
  if (!target.isCompound) {
    return [target];
  }
  return collectLeafTargets(getReferencedTargets(target), getReferencedTargets);
}

export function getResolvedEntries(target: KapeTarget): KapeTargetEntry[] {
  return collectUniqueEntries(
    collectLeafTargets([target], getReferencedTargets)
  );
}

export function getCollectionMembers(target: KapeTarget): KapeTarget[] {
  return collectLeafTargets([target], getReferencedTargets);
}

export function findCollectionsContaining(targetSlug: string): KapeTarget[] {
  if (!collectionLookupCache) {
    const lookup = new Map<string, KapeTarget[]>();
    for (const compound of getCompoundTargets()) {
      for (const member of resolveCompoundReferences(compound)) {
        const existing = lookup.get(member.slug) ?? [];
        existing.push(compound);
        lookup.set(member.slug, existing);
      }
    }
    collectionLookupCache = lookup;
  }
  return collectionLookupCache.get(targetSlug) ?? [];
}

export function getCategories(): string[] {
  return [...new Set(loadAllTargets().map((target) => target.category))].toSorted();
}

export function getStats(): {
  total: number;
  compounds: number;
  individuals: number;
  byCategory: Record<string, number>;
} {
  const targets = loadAllTargets();
  const byCategory: Record<string, number> = {};
  for (const target of targets) {
    byCategory[target.category] = (byCategory[target.category] || 0) + 1;
  }
  const compounds = targets.filter((target) => target.isCompound).length;
  return {
    total: targets.length,
    compounds,
    individuals: targets.length - compounds,
    byCategory,
  };
}
