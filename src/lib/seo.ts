import { execFileSync } from "node:child_process";
import path from "node:path";

import type { KapeTarget } from "./kapefiles";

export const SITE_URL = "https://dfirhub.com";
export const SITE_NAME = "DFIRHub";
export const GITHUB_URL = "https://github.com/LasCC/DFIRHub";
export const LOGO_URL = `${SITE_URL}/icon-512.png`;

const MAX_DESCRIPTION_LENGTH = 158;
const MIN_DESCRIPTION_LENGTH = 100;
const SHORT_DESCRIPTION_EXTENSION = "Includes paths and KAPE commands.";
const MAX_TITLE_LENGTH = 60;
const TITLE_BRAND_SUFFIX = ` | ${SITE_NAME}`;
const WHITESPACE_PATTERN = /\s+/g;
const TRAILING_PUNCTUATION_PATTERN = /[\s.,;:!-]+$/;
const KAPETARGETS_PATH_PREFIX = "Targets";

interface BreadcrumbItem {
  name: string;
  path: string;
}

function collapseWhitespace(text: string): string {
  return text.replaceAll(WHITESPACE_PATTERN, " ").trim();
}

export function truncateAtWord(text: string, maxLength: number): string {
  const clean = collapseWhitespace(text);
  if (clean.length <= maxLength) {
    return clean;
  }
  const cut = clean.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(TRAILING_PUNCTUATION_PATTERN, "")}…`;
}

function countCollectablePaths(target: KapeTarget): string {
  if (target.isCompound) {
    return `${target.referencedTargets.length} targets`;
  }
  const count = target.targets.filter((e) => !e.path.endsWith(".tkape")).length;
  return `${count} ${count === 1 ? "path" : "paths"}`;
}

export function buildArtifactTitle(target: KapeTarget): string {
  const kind = target.isCompound ? "KAPE Collection" : "KAPE Target";
  const detailed = `${target.name} ${kind}`;
  const fitsWithBrand =
    detailed.length + TITLE_BRAND_SUFFIX.length <= MAX_TITLE_LENGTH;
  return fitsWithBrand ? detailed : target.name;
}

export function buildArtifactDescription(target: KapeTarget): string {
  const pathCount = countCollectablePaths(target);
  const summary = collapseWhitespace(target.description).replace(
    TRAILING_PUNCTUATION_PATTERN,
    ""
  );

  if (!summary) {
    return `${target.name} - Windows forensic artifact with ${pathCount}. KAPE collection target for DFIR investigations.`;
  }

  const context = `KAPE target with ${pathCount} for Windows forensic collection.`;
  const room = MAX_DESCRIPTION_LENGTH - context.length - 2;
  const description = `${truncateAtWord(summary, room)}. ${context}`;
  return description.length < MIN_DESCRIPTION_LENGTH
    ? `${description} ${SHORT_DESCRIPTION_EXTENSION}`
    : description;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: new URL(item.path, SITE_URL).toString(),
      name: item.name,
      position: index + 1,
    })),
  };
}

interface TargetDates {
  modified: string;
  published: string;
}

let targetDatesCache: Map<string, TargetDates> | null = null;

function readTargetDates(): Map<string, TargetDates> {
  const dates = new Map<string, TargetDates>();
  const repoDir = path.join(process.cwd(), "src/content/kapefiles");

  try {
    const isShallow = execFileSync(
      "git",
      ["-C", repoDir, "rev-parse", "--is-shallow-repository"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    if (isShallow !== "false") {
      return dates;
    }

    const log = execFileSync(
      "git",
      [
        "-C",
        repoDir,
        "log",
        "--format=@@%cI",
        "--name-only",
        "--",
        KAPETARGETS_PATH_PREFIX,
      ],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }
    );

    let currentDate = "";
    for (const line of log.split("\n")) {
      if (line.startsWith("@@")) {
        currentDate = line.slice(2);
      } else if (line && currentDate) {
        const known = dates.get(line);
        dates.set(line, {
          modified: known?.modified ?? currentDate,
          published: currentDate,
        });
      }
    }
  } catch {
    return new Map();
  }

  return dates;
}

export function getTargetDates(target: KapeTarget): TargetDates | undefined {
  targetDatesCache ??= readTargetDates();
  return targetDatesCache.get(
    `${KAPETARGETS_PATH_PREFIX}/${target.category}/${target.sourceFile}`
  );
}
