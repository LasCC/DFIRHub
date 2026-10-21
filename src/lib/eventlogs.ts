import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import * as yaml from "js-yaml";

export const EVENTLOG_REPO_URL = "https://github.com/EricZimmerman/evtx";
export const EVENTLOG_MAPS_URL = `${EVENTLOG_REPO_URL}/tree/master/evtx/Maps`;
export const EVENTLOG_LICENSE_URL = `${EVENTLOG_REPO_URL}/blob/master/LICENSE`;
export const EVENTLOG_CONTRIBUTORS_URL = `${EVENTLOG_REPO_URL}/graphs/contributors`;
export const EVENTLOG_FOLDER = String.raw`C:\Windows\System32\winevt\Logs`;

const MAPS_RELATIVE_DIR = "evtx/Maps";
const MAP_FILE_URL_BASE = `${EVENTLOG_REPO_URL}/blob/master/${MAPS_RELATIVE_DIR}`;

export interface EventLogFieldValue {
  name: string;
  xpath: string;
}

export interface EventLogField {
  property: string;
  template: string;
  values: EventLogFieldValue[];
}

export interface EventLogLookup {
  name: string;
  fallback: string;
  values: [string, string][];
}

export interface EventLogReference {
  url: string;
  label?: string;
}

export interface EventLogMap {
  author: string;
  description: string;
  fields: EventLogField[];
  fileName: string;
  fileUrl: string;
  lookups: EventLogLookup[];
  notes: string[];
  provider: string;
  references: EventLogReference[];
  sampleXml: string;
}

export interface EventLogEvent {
  category: string;
  channel: string;
  channelLabel: string;
  channelSlug: string;
  eventId: number;
  logFile: string;
  maps: EventLogMap[];
  slug: string;
  summary: string;
  title: string;
}

export interface EventLogSourceDates {
  modified: string;
  published: string;
}

interface RawMapValue {
  Name?: unknown;
  Value?: unknown;
}

interface RawMapField {
  Property?: unknown;
  PropertyValue?: unknown;
  Values?: RawMapValue[];
}

interface RawLookup {
  Name?: unknown;
  Default?: unknown;
  Values?: Record<string, unknown>;
}

interface RawMapFile {
  Author?: unknown;
  Description?: unknown;
  EventId?: unknown;
  Channel?: unknown;
  Provider?: unknown;
  Maps?: RawMapField[];
  Lookups?: RawLookup[];
}

const MAP_FILE_EXTENSION = ".map";
const DOCUMENTATION_HEADER_PATTERN = /^#\s*Documentation:?\s*$/iu;
const EXAMPLE_HEADER_PATTERN = /^#\s*Example Event Data:?\s*$/iu;
const EXAMPLE_HEADER_WITH_XML_PATTERN =
  /^(?<header>#\s*Example Event Data:?)\s*#?\s*(?<xml><.*)$/iu;
const XML_TOKEN_PATTERN =
  /(?<token><!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^<>]+>)/u;
const XML_INDENT = "  ";
const COMMENT_PREFIX_PATTERN = /^#\s?/u;
const XML_LIST_MARKER_PATTERN = /^-\s(?=<)/u;
const XML_TAG_PATTERN = /<\/?[A-Za-z][\w:.-]*(?:\s[^>]*)?\/?>/u;
const XML_COMMENT_LINE_PATTERN = /^#\s*(?:-\s)?<[A-Za-z?!]/u;
const URL_PATTERN = /https?:\/\/[^\s)>\]"']+/gu;
const LABEL_SEPARATOR_PATTERN = /\s*(?:-|:)\s*$/u;
const NOT_APPLICABLE_PATTERN = /^N\/?A\.?$/iu;
const MICROSOFT_WINDOWS_PREFIX_PATTERN = /^Microsoft-Windows-/iu;
const OPERATIONAL_SUFFIX_PATTERN = /\/Operational$/iu;
const SLUG_INVALID_PATTERN = /[^a-z0-9]+/gu;
const SLUG_EDGE_PATTERN = /^-|-$/gu;
const AUTHOR_EMAIL_PATTERN = /\s*\S+@\S+\s*/gu;
const WHITESPACE_PATTERN = /\s+/gu;

const CHANNEL_CATEGORY_RULES: [RegExp, string][] = [
  [/^Security$/u, "Security"],
  [/Sysmon/u, "Sysmon"],
  [/^System$/u, "System"],
  [/^Application$/u, "Application"],
  [/PowerShell/u, "PowerShell"],
  [
    /TerminalServices|RemoteDesktopServices|OpenSSH|WinRM|Splashtop/u,
    "Remote access",
  ],
  [
    /Windows Defender|Firewall|AppLocker|AppID|SmbClient\/Security|SMBServer\/(?:Security|Audit)/u,
    "Defender and policy",
  ],
  [/^Microsoft-Windows-/u, "Windows operational"],
];
const THIRD_PARTY_CATEGORY = "Third party";

export const EVENTLOG_CATEGORY_ORDER = [
  "Security",
  "Sysmon",
  "System",
  "Application",
  "PowerShell",
  "Remote access",
  "Defender and policy",
  "Windows operational",
  THIRD_PARTY_CATEGORY,
];

let eventCache: EventLogEvent[] | null = null;
let sourceDatesCache: EventLogSourceDates | null | undefined;

function evtxRepoPath(): string {
  return path.join(process.cwd(), "src/content/evtx");
}

function mapsDirectoryPath(): string {
  return path.join(evtxRepoPath(), MAPS_RELATIVE_DIR);
}

function runEvtxGit(args: string[]): string {
  return execFileSync("git", ["-C", evtxRepoPath(), ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function readSourceDates(): EventLogSourceDates | null {
  try {
    if (runEvtxGit(["rev-parse", "--is-shallow-repository"]) !== "false") {
      return null;
    }
    const modified = runEvtxGit([
      "log",
      "-1",
      "--format=%cI",
      "--",
      MAPS_RELATIVE_DIR,
    ]);
    const published = runEvtxGit([
      "log",
      "--reverse",
      "--format=%cI",
      "--",
      MAPS_RELATIVE_DIR,
    ]).split("\n")[0];
    return modified && published ? { modified, published } : null;
  } catch {
    return null;
  }
}

export function getEventLogSourceDates(): EventLogSourceDates | null {
  if (sourceDatesCache === undefined) {
    sourceDatesCache = readSourceDates();
  }
  return sourceDatesCache;
}

function toText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(SLUG_INVALID_PATTERN, "-")
    .replaceAll(SLUG_EDGE_PATTERN, "");
}

export function getEventLogChannelLabel(channel: string): string {
  return channel
    .replace(MICROSOFT_WINDOWS_PREFIX_PATTERN, "")
    .replace(OPERATIONAL_SUFFIX_PATTERN, "");
}

function createChannelSlug(channel: string): string {
  return createSlug(getEventLogChannelLabel(channel)) || createSlug(channel);
}

export function getEventLogCategory(channel: string): string {
  return (
    CHANNEL_CATEGORY_RULES.find(([pattern]) => pattern.test(channel))?.[1] ??
    THIRD_PARTY_CATEGORY
  );
}

export function getEventLogCategoryId(category: string): string {
  return createSlug(category);
}

export function getEventLogFileName(channel: string): string {
  return `${channel.replaceAll("/", "%4")}.evtx`;
}

function cleanAuthor(author: string): string {
  return author
    .replaceAll(AUTHOR_EMAIL_PATTERN, " ")
    .replaceAll(WHITESPACE_PATTERN, " ")
    .trim();
}

function parseFields(rawFields: RawMapField[] | undefined): EventLogField[] {
  return (rawFields ?? [])
    .map((raw) => ({
      property: toText(raw.Property),
      template: toText(raw.PropertyValue),
      values: (raw.Values ?? []).map((value) => ({
        name: toText(value.Name),
        xpath: toText(value.Value),
      })),
    }))
    .filter((field) => field.property.length > 0);
}

function parseLookups(rawLookups: RawLookup[] | undefined): EventLogLookup[] {
  return (rawLookups ?? [])
    .map((raw) => ({
      fallback: toText(raw.Default),
      name: toText(raw.Name),
      values: Object.entries(raw.Values ?? {}).map(
        ([code, label]): [string, string] => [code, toText(label)]
      ),
    }))
    .filter((lookup) => lookup.name.length > 0 && lookup.values.length > 0);
}

function parseReferenceLine(text: string): EventLogReference[] {
  const urls = text.match(URL_PATTERN) ?? [];
  return urls.map((url) => {
    const label = text
      .slice(0, text.indexOf(url))
      .replace(LABEL_SEPARATOR_PATTERN, "")
      .trim();
    return label ? { label, url } : { url };
  });
}

interface MapComments {
  notes: string[];
  references: EventLogReference[];
  sampleXml: string;
}

function findSampleXmlStart(
  lines: string[],
  exampleStart: number,
  documentationStart: number
): number {
  if (exampleStart !== -1) {
    return exampleStart + 1;
  }
  return lines.findIndex(
    (line, index) =>
      index > documentationStart && XML_COMMENT_LINE_PATTERN.test(line)
  );
}

function splitExampleHeaderFromXml(line: string): string[] {
  const match = line.match(EXAMPLE_HEADER_WITH_XML_PATTERN);
  return match?.groups
    ? [match.groups.header, `# ${match.groups.xml}`]
    : [line];
}

function isXmlClosingTag(token: string): boolean {
  return token.startsWith("</");
}

function isXmlStandaloneTag(token: string): boolean {
  return (
    token.endsWith("/>") || token.startsWith("<?") || token.startsWith("<!")
  );
}

function isXmlOpeningTag(token: string): boolean {
  return (
    token.startsWith("<") &&
    !isXmlClosingTag(token) &&
    !isXmlStandaloneTag(token)
  );
}

function isXmlText(token: string | undefined): token is string {
  return token !== undefined && !token.startsWith("<");
}

function normalizeXmlToken(token: string): string {
  return token.startsWith("<") && !token.startsWith("<![CDATA[")
    ? token.replaceAll(WHITESPACE_PATTERN, " ").replace(" >", ">").replace(" />", "/>")
    : token;
}

export function formatSampleXml(xml: string): string {
  const tokens = xml
    .split(XML_TOKEN_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(normalizeXmlToken);
  const lines: string[] = [];
  let depth = 0;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const afterNext = tokens[index + 2];
    const indent = XML_INDENT.repeat(depth);

    if (isXmlOpeningTag(token) && isXmlText(next) && afterNext && isXmlClosingTag(afterNext)) {
      lines.push(`${indent}${token}${next}${afterNext}`);
      index += 3;
      continue;
    }
    if (isXmlOpeningTag(token) && next && isXmlClosingTag(next)) {
      lines.push(`${indent}${token}${next}`);
      index += 2;
      continue;
    }
    if (isXmlClosingTag(token)) {
      depth = Math.max(0, depth - 1);
    }
    lines.push(`${XML_INDENT.repeat(depth)}${token}`);
    if (isXmlOpeningTag(token)) {
      depth += 1;
    }
    index += 1;
  }

  return lines.join("\n");
}

function parseTrailingComments(source: string): MapComments {
  const lines = source
    .split("\n")
    .map((line) => line.trimEnd())
    .flatMap(splitExampleHeaderFromXml);
  const documentationStart = lines.findIndex((line) =>
    DOCUMENTATION_HEADER_PATTERN.test(line)
  );
  const exampleStart = lines.findIndex((line) =>
    EXAMPLE_HEADER_PATTERN.test(line)
  );
  const sampleXmlStart = findSampleXmlStart(
    lines,
    exampleStart,
    documentationStart
  );
  const comments: MapComments = { notes: [], references: [], sampleXml: "" };

  if (documentationStart !== -1) {
    const documentationEnd = [exampleStart, sampleXmlStart, lines.length].find(
      (index) => index > documentationStart
    );
    for (const line of lines.slice(documentationStart + 1, documentationEnd)) {
      if (!line.startsWith("#")) {
        continue;
      }
      const text = line.replace(COMMENT_PREFIX_PATTERN, "").trim();
      if (
        !text ||
        NOT_APPLICABLE_PATTERN.test(text) ||
        XML_TAG_PATTERN.test(text)
      ) {
        continue;
      }
      const references = parseReferenceLine(text);
      if (references.length > 0) {
        comments.references.push(...references);
      } else {
        comments.notes.push(text);
      }
    }
  }

  if (sampleXmlStart !== -1) {
    const xmlLines = lines
      .slice(sampleXmlStart)
      .filter((line) => line.startsWith("#"))
      .map((line) =>
        line
          .replace(COMMENT_PREFIX_PATTERN, "")
          .replace(XML_LIST_MARKER_PATTERN, "")
      );
    const xml = xmlLines.join("\n").trim();
    comments.sampleXml = xml.includes("<") ? formatSampleXml(xml) : "";
  }

  return comments;
}

function uniqueReferences(
  references: EventLogReference[]
): EventLogReference[] {
  const byUrl = new Map<string, EventLogReference>();
  for (const reference of references) {
    const known = byUrl.get(reference.url);
    if (known) {
      known.label ??= reference.label;
    } else {
      byUrl.set(reference.url, { ...reference });
    }
  }
  return [...byUrl.values()];
}

interface ParsedMapFile {
  channel: string;
  eventId: number;
  map: EventLogMap;
}

export function parseEventLogMap(
  fileName: string,
  source: string
): ParsedMapFile | null {
  const raw = yaml.load(source, {
    json: true,
    schema: yaml.FAILSAFE_SCHEMA,
  }) as RawMapFile | null;
  const channel = toText(raw?.Channel);
  const eventId = Number(raw?.EventId);
  if (!(raw && channel && Number.isInteger(eventId))) {
    return null;
  }
  const comments = parseTrailingComments(source);
  return {
    channel,
    eventId,
    map: {
      author: cleanAuthor(toText(raw.Author)),
      description: toText(raw.Description),
      fields: parseFields(raw.Maps),
      fileName,
      fileUrl: `${MAP_FILE_URL_BASE}/${encodeURIComponent(fileName)}`,
      lookups: parseLookups(raw.Lookups),
      notes: comments.notes,
      provider: toText(raw.Provider),
      references: uniqueReferences(comments.references),
      sampleXml: comments.sampleXml,
    },
  };
}

function assignChannelSlugs(channels: string[]): Map<string, string> {
  const slugs = new Map<string, string>();
  const used = new Set<string>();
  for (const channel of channels) {
    let slug = createChannelSlug(channel);
    if (used.has(slug)) {
      slug = createSlug(channel);
    }
    slugs.set(channel, slug);
    used.add(slug);
  }
  return slugs;
}

function buildEventTitle(maps: EventLogMap[]): string {
  const descriptions = [
    ...new Set(maps.map((map) => map.description).filter(Boolean)),
  ];
  return descriptions.length === 1 ? descriptions[0] : descriptions.join(" / ");
}

function buildEventSummary(maps: EventLogMap[]): string {
  return maps.flatMap((map) => map.notes).at(0) ?? "";
}

function compareEvents(left: EventLogEvent, right: EventLogEvent): number {
  const categoryOrder =
    EVENTLOG_CATEGORY_ORDER.indexOf(left.category) -
    EVENTLOG_CATEGORY_ORDER.indexOf(right.category);
  return (
    categoryOrder ||
    left.channel.localeCompare(right.channel) ||
    left.eventId - right.eventId
  );
}

export function buildEventLogEvents(
  parsedMaps: ParsedMapFile[]
): EventLogEvent[] {
  const channelSlugs = assignChannelSlugs(
    [...new Set(parsedMaps.map((parsed) => parsed.channel))].toSorted()
  );
  const eventsByKey = new Map<string, EventLogEvent>();

  for (const parsed of parsedMaps) {
    const channelSlug =
      channelSlugs.get(parsed.channel) ?? createSlug(parsed.channel);
    const slug = `${channelSlug}/${parsed.eventId}`;
    let event = eventsByKey.get(slug);
    if (!event) {
      event = {
        category: getEventLogCategory(parsed.channel),
        channel: parsed.channel,
        channelLabel: getEventLogChannelLabel(parsed.channel),
        channelSlug,
        eventId: parsed.eventId,
        logFile: getEventLogFileName(parsed.channel),
        maps: [],
        slug,
        summary: "",
        title: "",
      };
      eventsByKey.set(slug, event);
    }
    event.maps.push(parsed.map);
  }

  const events = [...eventsByKey.values()];
  for (const event of events) {
    event.maps = event.maps.toSorted((left, right) =>
      left.provider.localeCompare(right.provider)
    );
    event.title = buildEventTitle(event.maps);
    event.summary = buildEventSummary(event.maps);
  }
  return events.toSorted(compareEvents);
}

function readMapFiles(): ParsedMapFile[] {
  const directory = mapsDirectoryPath();
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(MAP_FILE_EXTENSION))
    .toSorted()
    .flatMap((fileName) => {
      const source = fs.readFileSync(path.join(directory, fileName), "utf-8");
      return parseEventLogMap(fileName, source) ?? [];
    });
}

export function loadEventLogEvents(): EventLogEvent[] {
  eventCache ??= buildEventLogEvents(readMapFiles());
  return eventCache;
}

export function getEventLogEventsById(): Map<number, EventLogEvent[]> {
  const grouped = new Map<number, EventLogEvent[]>();
  for (const event of loadEventLogEvents()) {
    grouped.set(event.eventId, [...(grouped.get(event.eventId) ?? []), event]);
  }
  return grouped;
}

export function getSharedEventLogIds(): Map<number, EventLogEvent[]> {
  return new Map(
    [...getEventLogEventsById()].filter(([, events]) => events.length > 1)
  );
}

export function getEventLogEventsByCategory(): Map<string, EventLogEvent[]> {
  const grouped = new Map<string, EventLogEvent[]>();
  for (const event of loadEventLogEvents()) {
    grouped.set(event.category, [
      ...(grouped.get(event.category) ?? []),
      event,
    ]);
  }
  return grouped;
}

export function getEventLogRedirects(): [string, string][] {
  return [...getEventLogEventsById()]
    .filter(([, events]) => events.length === 1)
    .map(([eventId, [event]]) => [
      `/eventlogs/${eventId}`,
      `/eventlogs/${event.slug}`,
    ]);
}

const KEY_EVENTLOG_SLUGS = [
  "security/4624",
  "security/4625",
  "security/4634",
  "security/4648",
  "security/4672",
  "security/4688",
  "security/4697",
  "security/4698",
  "security/4720",
  "security/4732",
  "security/1102",
  "system/7045",
  "system/104",
  "powershell/4104",
  "windows-powershell/400",
  "sysmon/1",
  "sysmon/3",
  "terminalservices-localsessionmanager/21",
  "terminalservices-remoteconnectionmanager/1149",
  "taskscheduler/106",
  "windows-defender/1116",
  "bits-client/59",
  "wmi-activity/5861",
];

const REMOTE_ACCESS_CATEGORY = "Remote access";

export function getEventLogEventsForKapeTarget(
  targetSlug: string
): EventLogEvent[] {
  const events = loadEventLogEvents();
  if (targetSlug === "eventlogs") {
    const bySlug = new Map(events.map((event) => [event.slug, event]));
    return KEY_EVENTLOG_SLUGS.flatMap((slug) => bySlug.get(slug) ?? []);
  }
  if (targetSlug === "eventlogs-rdp") {
    return events.filter((event) => event.category === REMOTE_ACCESS_CATEGORY);
  }
  return [];
}
