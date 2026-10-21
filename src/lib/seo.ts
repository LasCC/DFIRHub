import { execFileSync } from "node:child_process";
import path from "node:path";

import type { EventLogEvent } from "./eventlogs";
import type { KapeTarget } from "./kapefiles";
import type { RegistryArtifact } from "./registry";

export const SITE_URL = "https://dfirhub.com";
export const SITE_NAME = "DFIRHub";
export const GITHUB_URL = "https://github.com/LasCC/DFIRHub";
export const LOGO_URL = `${SITE_URL}/icon-512.png`;

const MAX_DESCRIPTION_LENGTH = 158;
const MIN_DESCRIPTION_LENGTH = 100;
const SHORT_DESCRIPTION_EXTENSION = "Free DFIR reference.";
const MAX_TITLE_LENGTH = 60;
const TITLE_BRAND_SUFFIX = ` | ${SITE_NAME}`;
const WHITESPACE_PATTERN = /\s+/g;
const TRAILING_PUNCTUATION_PATTERN = /[\s.,;:!-]+$/;
const MIN_CLAUSE_RATIO = 0.6;
const SENTENCE_BREAK_PATTERN = /(?<=[.!?])\s+/u;
const KAPETARGETS_PATH_PREFIX = "Targets";

interface BreadcrumbItem {
  name: string;
  path: string;
}

function collapseWhitespace(text: string): string {
  return text.replaceAll(WHITESPACE_PATTERN, " ").trim();
}

const SCRIPT_UNSAFE_CHARACTERS: Record<string, string> = {
  "&": String.raw`\u0026`,
  "<": String.raw`\u003c`,
  ">": String.raw`\u003e`,
  "\u2028": String.raw`\u2028`,
  "\u2029": String.raw`\u2029`,
};
const SCRIPT_UNSAFE_PATTERN = /[&<>\u2028\u2029]/gu;

export function serializeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll(
    SCRIPT_UNSAFE_PATTERN,
    (character) => SCRIPT_UNSAFE_CHARACTERS[character] ?? character
  );
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

function fitsTitleWithBrand(title: string): boolean {
  return title.length + TITLE_BRAND_SUFFIX.length <= MAX_TITLE_LENGTH;
}

export function buildArtifactTitle(target: KapeTarget): string {
  const candidates = target.isCompound
    ? [`${target.name} KAPE Collection`]
    : [
        `${target.name} Forensic Artifact & KAPE Target`,
        `${target.name} Forensic Artifact`,
      ];
  return candidates.find(fitsTitleWithBrand) ?? target.name;
}

function describeCollectionContext(target: KapeTarget, pathCount: string) {
  return target.isCompound
    ? `KAPE collection of ${pathCount} for forensic triage.`
    : `Windows forensic artifact: ${pathCount} and the KAPE command to collect it.`;
}

export function buildArtifactDescription(target: KapeTarget): string {
  const pathCount = countCollectablePaths(target);
  const summary = collapseWhitespace(target.description).replace(
    TRAILING_PUNCTUATION_PATTERN,
    ""
  );

  if (!summary) {
    return `${target.name} Windows forensic artifact: where it lives on disk (${pathCount}) and the KAPE command to collect it for DFIR investigations.`;
  }

  const context = describeCollectionContext(target, pathCount);
  const room = MAX_DESCRIPTION_LENGTH - context.length - 2;
  const description = `${truncateAtWord(summary, room)}. ${context}`;
  return description.length < MIN_DESCRIPTION_LENGTH
    ? `${description} ${SHORT_DESCRIPTION_EXTENSION}`
    : description;
}

function shortenAtClause(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const clauseEnd = text.slice(0, maxLength + 1).lastIndexOf(", ");
  return clauseEnd > maxLength * MIN_CLAUSE_RATIO
    ? text.slice(0, clauseEnd)
    : truncateAtWord(text, maxLength);
}

export function buildRegistryTitle(artifact: RegistryArtifact): string {
  const candidates = [
    `${artifact.name} Registry Forensic Artifact`,
    `${artifact.name} Registry Artifact`,
  ];
  return candidates.find(fitsTitleWithBrand) ?? artifact.name;
}

export function buildRegistryDescription(artifact: RegistryArtifact): string {
  const keyCount = artifact.entries.length;
  const keyLabel = `${keyCount} ${keyCount === 1 ? "key" : "keys"}`;
  const hiveLabel = `${artifact.hives.join(", ")} ${artifact.hives.length === 1 ? "hive" : "hives"}`;
  const contexts = [
    `Windows registry artifact: ${keyLabel} in the ${hiveLabel} and the RECmd command to parse them.`,
    `${keyLabel} in the ${hiveLabel}, with the RECmd command to parse them.`,
    `${keyLabel} in the ${hiveLabel}, parsed with RECmd.`,
  ];
  const summary = collapseWhitespace(artifact.summary).replace(
    TRAILING_PUNCTUATION_PATTERN,
    ""
  );

  if (!summary) {
    return truncateAtWord(
      `${artifact.name} ${contexts[0]} Free DFIR reference.`,
      MAX_DESCRIPTION_LENGTH
    );
  }

  const [firstSentence] = summary.split(SENTENCE_BREAK_PATTERN);
  const leads = [summary, firstSentence].map(
    (text) =>
      `${artifact.name}: ${text.replace(TRAILING_PUNCTUATION_PATTERN, "")}`
  );
  const fitsWith = (lead: string, context: string) =>
    lead.length + context.length + 2 <= MAX_DESCRIPTION_LENGTH;
  const fittingLead = leads.find((lead) =>
    contexts.some((context) => fitsWith(lead, context))
  );
  const lead = fittingLead ?? leads.at(-1) ?? artifact.name;
  const context =
    contexts.find((candidate) => fitsWith(lead, candidate)) ??
    contexts.at(-1) ??
    "";
  const shortenedLead = shortenAtClause(
    lead,
    MAX_DESCRIPTION_LENGTH - context.length - 2
  );
  const separator = shortenedLead.endsWith("…") ? " " : ". ";
  const description = `${shortenedLead}${separator}${context}`;
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

export function buildEventLogTitle(event: EventLogEvent): string {
  const candidates = [
    `Event ID ${event.eventId}: ${event.title} (${event.channelLabel})`,
    `Event ID ${event.eventId}: ${event.title}`,
    `${event.channelLabel} Event ID ${event.eventId}`,
  ];
  return candidates.find(fitsTitleWithBrand) ?? `Event ID ${event.eventId}`;
}

function describeEventLogFields(event: EventLogEvent): string {
  const fieldCount = event.maps.reduce(
    (total, map) => total + map.fields.length,
    0
  );
  return `${fieldCount} ${fieldCount === 1 ? "field" : "fields"}`;
}

export function buildEventLogDescription(event: EventLogEvent): string {
  const lead = `${event.channelLabel} event ID ${event.eventId}: ${collapseWhitespace(event.title).replace(TRAILING_PUNCTUATION_PATTERN, "")}`;
  const contexts = [
    `The ${describeEventLogFields(event)} EvtxECmd extracts from ${event.logFile}, a sample event and the command to parse it.`,
    `${describeEventLogFields(event)} EvtxECmd extracts from ${event.logFile}, with a sample event.`,
    `Parsed from ${event.logFile} with EvtxECmd.`,
  ];
  const context =
    contexts.find(
      (candidate) =>
        lead.length + candidate.length + 2 <= MAX_DESCRIPTION_LENGTH
    ) ??
    contexts.at(-1) ??
    "";
  const shortenedLead = shortenAtClause(
    lead,
    MAX_DESCRIPTION_LENGTH - context.length - 2
  );
  const separator = shortenedLead.endsWith("…") ? " " : ". ";
  const description = `${shortenedLead}${separator}${context}`;
  return description.length < MIN_DESCRIPTION_LENGTH
    ? `${description} ${SHORT_DESCRIPTION_EXTENSION}`
    : description;
}

export function buildEventLogChooserTitle(
  eventId: number,
  channelCount: number
): string {
  return `Event ID ${eventId} in ${channelCount} Windows Event Logs`;
}

export function buildEventLogChooserDescription(
  events: EventLogEvent[]
): string {
  const [first] = events;
  const channels = events
    .map((event) => `${event.channelLabel} (${event.title})`)
    .join(", ");
  return truncateAtWord(
    `Windows event ID ${first?.eventId} is used by ${events.length} event logs: ${channels}. Pick the channel to see its fields and sample event.`,
    MAX_DESCRIPTION_LENGTH
  );
}
