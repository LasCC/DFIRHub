import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import * as yaml from "js-yaml";

export const REGISTRY_BATCH_FILE = "DFIRBatch.reb";
export const REGISTRY_SOURCE_URL = `https://github.com/EricZimmerman/RECmd/blob/master/BatchExamples/${REGISTRY_BATCH_FILE}`;
export const REGISTRY_LICENSE_URL =
  "https://github.com/EricZimmerman/RECmd/blob/master/LICENSE";
export const REGISTRY_CREDITS_URL =
  "https://github.com/EricZimmerman/RECmd/blob/master/BatchExamples/DFIRBatch.md";

export interface RegistryEntry {
  hive: string;
  keyPath: string;
  valueName?: string;
  recursive: boolean;
  comment: string;
}

export interface RegistryReference {
  url: string;
  label?: string;
}

export interface RegistryArtifact {
  name: string;
  slug: string;
  category: string;
  entries: RegistryEntry[];
  hives: string[];
  references: RegistryReference[];
  summary: string;
}

export interface RegistrySourceDates {
  modified: string;
  published: string;
}

export interface RegistryBatchInfo {
  author: string;
  version: string;
}

interface RawBatchEntry {
  Description?: string;
  HiveType?: string;
  Category?: string;
  KeyPath?: string;
  ValueName?: string;
  Recursive?: boolean;
  Comment?: string;
}

type BatchToken =
  | { type: "entry"; entry: RawBatchEntry }
  | { type: "reference"; reference: RegistryReference }
  | { type: "header"; reference: RegistryReference };

const COMMENT_LINE_PATTERN = /^\s*#/u;
const URL_PATTERN = /https?:\/\/[^\s)>\]"']+/gu;
const SECTION_HEADER_PATTERN = /^#\s*[^#>]+->\s*(?<title>.+)$/u;
const LABEL_SEPARATOR_PATTERN = /\s*(?:-|:)\s*$/u;
const COMMENT_PREFIX_PATTERN = /^\s*#\s*/u;
const BATCH_AUTHOR_PATTERN = /^Author:\s*(?<value>.+)$/mu;
const BATCH_VERSION_PATTERN = /^Version:\s*(?<value>.+)$/mu;
const SLUG_INVALID_PATTERN = /[^a-z0-9]+/gu;
const SLUG_EDGE_PATTERN = /^-|-$/gu;
const WHITESPACE_PATTERN = /\s+/gu;

const HIVE_ALIASES: Record<string, string> = {
  DEFAULT: "DEFAULT",
  NTUSER: "NTUSER",
  SAM: "SAM",
  SECURITY: "SECURITY",
  SOFTWARE: "SOFTWARE",
  SYSTEM: "SYSTEM",
  USER: "User",
  USRCLASS: "UsrClass",
};

const USER_HIVES = ["NTUSER", "UsrClass"];
const SYSTEM_HIVES = ["DEFAULT", "SAM", "SECURITY", "SOFTWARE", "SYSTEM"];

let artifactCache: RegistryArtifact[] | null = null;
let sourceDatesCache: RegistrySourceDates | null | undefined;

function recmdRepoPath(): string {
  return path.join(process.cwd(), "src/content/recmd");
}

function batchFilePath(): string {
  return path.join(recmdRepoPath(), "BatchExamples", REGISTRY_BATCH_FILE);
}

function runRecmdGit(args: string[]): string {
  return execFileSync("git", ["-C", recmdRepoPath(), ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function readSourceDates(): RegistrySourceDates | null {
  try {
    if (runRecmdGit(["rev-parse", "--is-shallow-repository"]) !== "false") {
      return null;
    }
    const dates = runRecmdGit([
      "log",
      "--follow",
      "--format=%cI",
      "--",
      `BatchExamples/${REGISTRY_BATCH_FILE}`,
    ]).split("\n");
    const modified = dates.at(0);
    const published = dates.at(-1);
    return modified && published ? { modified, published } : null;
  } catch {
    return null;
  }
}

export function getRegistrySourceDates(): RegistrySourceDates | null {
  if (sourceDatesCache === undefined) {
    sourceDatesCache = readSourceDates();
  }
  return sourceDatesCache;
}

function readBatchFile(): string {
  return fs.readFileSync(batchFilePath(), "utf-8");
}

function normalizeHive(hive: string): string {
  return HIVE_ALIASES[hive.toUpperCase()] ?? hive;
}

function normalizeCategory(category: string): string {
  return category
    .replaceAll("-", " ")
    .replaceAll(WHITESPACE_PATTERN, " ")
    .trim();
}

function createRegistrySlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(SLUG_INVALID_PATTERN, "-")
    .replaceAll(SLUG_EDGE_PATTERN, "");
}

function dedent(lines: string[]): string {
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.length - line.trimStart().length);
  const minIndent = Math.min(...indents);
  return lines.map((line) => line.slice(minIndent)).join("\n");
}

function parseEntryChunk(lines: string[]): RawBatchEntry[] {
  if (lines.every((line) => line.trim().length === 0)) {
    return [];
  }
  const parsed = yaml.load(dedent(lines));
  return Array.isArray(parsed) ? (parsed as RawBatchEntry[]) : [];
}

function parseCommentReferences(line: string): RegistryReference[] {
  const text = line.replace(COMMENT_PREFIX_PATTERN, "");
  const urls = text.match(URL_PATTERN) ?? [];
  return urls.map((url) => {
    const label = text
      .slice(0, text.indexOf(url))
      .replace(LABEL_SEPARATOR_PATTERN, "")
      .trim();
    return label ? { label, url } : { url };
  });
}

function parseSectionHeaderReference(line: string): RegistryReference | null {
  const match = line.match(SECTION_HEADER_PATTERN);
  if (!match) {
    return null;
  }
  const title = match.groups?.title ?? "";
  const [url] = title.match(URL_PATTERN) ?? [];
  if (!url) {
    return null;
  }
  const name = title
    .slice(0, title.indexOf(url))
    .replace(LABEL_SEPARATOR_PATTERN, "")
    .trim();
  return { label: `${name} website`, url };
}

function isCompleteEntry(entry: RawBatchEntry): boolean {
  return Boolean(entry?.Description && entry.KeyPath && entry.HiveType);
}

function tokenizeBatchFile(source: string): BatchToken[] {
  const tokens: BatchToken[] = [];
  let chunk: string[] = [];

  const flushChunk = () => {
    for (const entry of parseEntryChunk(chunk)) {
      tokens.push({ entry, type: "entry" });
    }
    chunk = [];
  };

  for (const line of source.split("\n")) {
    if (!COMMENT_LINE_PATTERN.test(line)) {
      chunk.push(line);
      continue;
    }

    flushChunk();

    const headerReference = parseSectionHeaderReference(line);
    if (headerReference) {
      tokens.push({ reference: headerReference, type: "header" });
      continue;
    }
    if (SECTION_HEADER_PATTERN.test(line)) {
      continue;
    }
    for (const reference of parseCommentReferences(line)) {
      tokens.push({ reference, type: "reference" });
    }
  }
  flushChunk();

  return tokens.filter(
    (token) => token.type !== "entry" || isCompleteEntry(token.entry)
  );
}

function addReference(
  artifact: RegistryArtifact,
  reference: RegistryReference
) {
  const known = artifact.references.find((item) => item.url === reference.url);
  if (known) {
    known.label ??= reference.label;
    return;
  }
  artifact.references.push({ ...reference });
}

function addEntry(artifact: RegistryArtifact, raw: RawBatchEntry) {
  const entry: RegistryEntry = {
    comment: raw.Comment?.trim() ?? "",
    hive: normalizeHive(String(raw.HiveType)),
    keyPath: String(raw.KeyPath),
    recursive: raw.Recursive === true,
    valueName: raw.ValueName ? String(raw.ValueName) : undefined,
  };
  const isDuplicate = artifact.entries.some(
    (known) =>
      known.hive === entry.hive &&
      known.keyPath === entry.keyPath &&
      known.valueName === entry.valueName
  );
  if (!isDuplicate) {
    artifact.entries.push(entry);
  }
  if (!artifact.hives.includes(entry.hive)) {
    artifact.hives.push(entry.hive);
  }
}

function assignUniqueRegistrySlugs(artifacts: RegistryArtifact[]) {
  const used = new Set<string>();
  for (const artifact of artifacts) {
    const base = createRegistrySlug(artifact.name) || "registry-artifact";
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    artifact.slug = slug;
    used.add(slug);
  }
}

export function parseRegistryBatch(source: string): RegistryArtifact[] {
  const artifactsByName = new Map<string, RegistryArtifact>();
  let runArtifacts: RegistryArtifact[] = [];
  let runIsClosed = true;
  let pendingHeaderReferences: RegistryReference[] = [];

  for (const token of tokenizeBatchFile(source)) {
    if (token.type === "header") {
      pendingHeaderReferences.push(token.reference);
      runIsClosed = true;
      continue;
    }

    if (token.type === "reference") {
      for (const artifact of runArtifacts) {
        addReference(artifact, token.reference);
      }
      runIsClosed = true;
      continue;
    }

    if (runIsClosed) {
      runArtifacts = [];
      runIsClosed = false;
    }

    const name = String(token.entry.Description).trim();
    const key = name.toLowerCase();
    let artifact = artifactsByName.get(key);
    if (!artifact) {
      artifact = {
        category: normalizeCategory(String(token.entry.Category ?? "Other")),
        entries: [],
        hives: [],
        name,
        references: [],
        slug: "",
        summary: "",
      };
      artifactsByName.set(key, artifact);
    }

    addEntry(artifact, token.entry);
    if (!runArtifacts.includes(artifact)) {
      runArtifacts.push(artifact);
    }
    for (const reference of pendingHeaderReferences) {
      addReference(artifact, reference);
    }
    pendingHeaderReferences = [];
  }

  const artifacts = [...artifactsByName.values()];
  assignUniqueRegistrySlugs(artifacts);
  for (const artifact of artifacts) {
    artifact.summary =
      artifact.entries.find((entry) => entry.comment)?.comment ?? "";
  }
  return artifacts;
}

export function loadRegistryArtifacts(): RegistryArtifact[] {
  artifactCache ??= parseRegistryBatch(readBatchFile());
  return artifactCache;
}

export function getRegistryBatchInfo(): RegistryBatchInfo {
  const source = readBatchFile();
  return {
    author: source.match(BATCH_AUTHOR_PATTERN)?.groups?.value.trim() ?? "",
    version: source.match(BATCH_VERSION_PATTERN)?.groups?.value.trim() ?? "",
  };
}

export function getRegistryCategoryId(category: string): string {
  return createRegistrySlug(category);
}

export function getRegistryCategories(): string[] {
  return [...new Set(loadRegistryArtifacts().map((item) => item.category))];
}

export function getRegistryArtifactsByCategory(): Map<
  string,
  RegistryArtifact[]
> {
  const grouped = new Map<string, RegistryArtifact[]>();
  for (const artifact of loadRegistryArtifacts()) {
    const existing = grouped.get(artifact.category) ?? [];
    existing.push(artifact);
    grouped.set(artifact.category, existing);
  }
  return grouped;
}

export function getRegistryArtifactsForHives(
  hives: string[]
): RegistryArtifact[] {
  return loadRegistryArtifacts().filter((artifact) =>
    artifact.hives.some((hive) => hives.includes(hive))
  );
}

const HIVES_BY_KAPE_TARGET: Record<string, string[]> = {
  registryhivessystem: SYSTEM_HIVES,
  registryhivesuser: USER_HIVES,
};

export function getKapeTargetSlugForHive(hive: string): string | undefined {
  return Object.entries(HIVES_BY_KAPE_TARGET).find(([, hives]) =>
    hives.includes(hive)
  )?.[0];
}

export function getHivesForKapeTarget(targetSlug: string): string[] {
  return HIVES_BY_KAPE_TARGET[targetSlug] ?? [];
}
