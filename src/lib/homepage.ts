import sigmaMeta from "../../public/sigma-rules/meta.json";
import { DEFAULT_CONFIG } from "./builder/config";
import { buildKapeArguments } from "./builder/kapeCommand";
import { SCENARIO_PRESETS } from "./builder/presets";
import { generateKapeCommand } from "./generators";
import type { KapeTarget, KapeTargetEntry } from "./kapefiles";
import {
  findCollectionsContaining,
  getResolvedEntries,
  getStats,
  getTargetBySlug,
  loadAllTargets,
  resolveCompoundReferences,
} from "./kapefiles";
import { backends } from "./sigma/backends";

export interface ConsolePathRow {
  directory: string;
  mask: string | null;
}

export interface ConsolePreview {
  slug: string;
  name: string;
  isCompound: boolean;
  rows: ConsolePathRow[];
  hiddenPathCount: number;
  pathCount: number;
  artifactCount: number;
  collectionCount: number;
  command: string;
}

export interface QuestionRow {
  question: string;
  note: string;
  artifacts: { name: string; slug: string }[];
}

export interface CategoryBar {
  name: string;
  slug: string;
  count: number;
  widthPercent: number;
}

export interface CollectionPreview {
  name: string;
  featured: string[];
  moreCount: number;
  artifactCount: number;
  pathCount: number;
}

export interface SigmaPreview {
  excerpt: string;
  credit: string;
  featuredBackends: string[];
  moreBackendCount: number;
  ruleCount: number;
  backendCount: number;
}

export interface HomepageData {
  totalTargets: number;
  distinctPathCount: number;
  consolePreviews: ConsolePreview[];
  questions: QuestionRow[];
  categoryBars: CategoryBar[];
  collection: CollectionPreview;
  builderLines: string[];
  sigma: SigmaPreview;
}

const CONSOLE_SOURCE_DRIVE = "C:";
const CONSOLE_DESTINATION = "D:\\Evidence";
const CONSOLE_SLUGS = [
  "prefetch",
  "anydesk",
  "eventlogs",
  "srum",
  "kapetriage",
];
const CONSOLE_MAX_ROWS = 5;
const COMPOUND_FEATURED_SLUGS = [
  "eventlogs",
  "prefetch",
  "amcache",
  "srum",
  "jumplists",
];

const COLLECTION_SLUG = "kapetriage";
const COLLECTION_FEATURED_NAMES = [
  "eventlogs",
  "evidenceofexecution",
  "registryhives",
  "lnkfilesandjumplists",
];

const BUILDER_PRESET_ID = "ransomware";
const POWERSHELL_LINE_CONTINUATION = " `";

const SIGMA_FEATURED_BACKEND_IDS = ["splunk", "esql", "kusto", "log_scale"];

const SIGMA_EXCERPT = `title: Remote Access Tool - AnyDesk Execution
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        - Image|endswith:
              - '\\AnyDesk.exe'
              - '\\AnyDeskMSI.exe'
        - Description: AnyDesk
        - Product: AnyDesk
        - Company: AnyDesk Software GmbH
    condition: selection`;

const QUESTION_DEFINITIONS = [
  {
    question: "Did this program run?",
    note: "Prefetch and Amcache can still show a program after someone deletes it.",
    slugs: ["prefetch", "amcache", "evidenceofexecution"],
  },
  {
    question: "Which files did the user open?",
    note: "Jump lists and LNK files list recent files with timestamps. The Recycle Bin keeps what the user deleted.",
    slugs: ["jumplists", "lnkfilesandjumplists", "recyclebin"],
  },
  {
    question: "Who logged on, and from where?",
    note: "Event logs record every logon. The RDP logs add the address it came from.",
    slugs: ["eventlogs", "eventlogs-rdp", "rdplogs"],
  },
  {
    question: "Did someone use remote access software?",
    note: "Attackers often reuse the tools IT already trusts. Each of these keeps its own logs.",
    slugs: ["anydesk", "screenconnect", "teamviewerlogs"],
  },
  {
    question: "What did the user browse?",
    note: "Browser profiles hold history, downloads and cache for every user on the host.",
    slugs: ["chrome", "edge", "firefox"],
  },
  {
    question: "What was plugged in?",
    note: "Windows remembers each USB device that connected, with the first and last time.",
    slugs: ["usbdeviceslogs", "usbdetective"],
  },
  {
    question: "What survives a reboot?",
    note: "Scheduled tasks, BITS jobs and registry run keys keep attacker code alive after a restart.",
    slugs: ["scheduledtasks", "bits", "registryhives"],
  },
];

function getDirectEntries(target: KapeTarget): KapeTargetEntry[] {
  return target.targets.filter((entry) => !entry.path.endsWith(".tkape"));
}

function toPathRow(entry: KapeTargetEntry): ConsolePathRow {
  const mask = entry.fileMask ?? null;
  const needsSeparator = mask !== null && !entry.path.endsWith("\\");
  return {
    directory: needsSeparator ? `${entry.path}\\` : entry.path,
    mask,
  };
}

function pickCompoundRows(target: KapeTarget): ConsolePathRow[] {
  const leaves = resolveCompoundReferences(target);
  const featuredRows = COMPOUND_FEATURED_SLUGS.flatMap((slug) => {
    const entry = leaves
      .find((leaf) => leaf.slug === slug)
      ?.targets.find((candidate) => !candidate.path.endsWith(".tkape"));
    return entry ? [toPathRow(entry)] : [];
  });
  if (featuredRows.length > 0) {
    return featuredRows;
  }
  return getResolvedEntries(target).slice(0, CONSOLE_MAX_ROWS).map(toPathRow);
}

function buildConsolePreview(target: KapeTarget): ConsolePreview {
  const pathCount = getResolvedEntries(target).length;
  const rows = target.isCompound
    ? pickCompoundRows(target)
    : getDirectEntries(target).slice(0, CONSOLE_MAX_ROWS).map(toPathRow);

  return {
    slug: target.slug,
    name: target.name,
    isCompound: target.isCompound,
    rows,
    hiddenPathCount: Math.max(0, pathCount - rows.length),
    pathCount,
    artifactCount: target.isCompound
      ? resolveCompoundReferences(target).length
      : 1,
    collectionCount: findCollectionsContaining(target.slug).length,
    command: generateKapeCommand(target, {
      source: CONSOLE_SOURCE_DRIVE,
      destination: CONSOLE_DESTINATION,
    }),
  };
}

function buildConsolePreviews(): ConsolePreview[] {
  return CONSOLE_SLUGS.flatMap((slug) => {
    const target = getTargetBySlug(slug);
    return target ? [buildConsolePreview(target)] : [];
  });
}

function buildQuestions(): QuestionRow[] {
  return QUESTION_DEFINITIONS.map((definition) => ({
    question: definition.question,
    note: definition.note,
    artifacts: definition.slugs.flatMap((slug) => {
      const target = getTargetBySlug(slug);
      return target ? [{ name: target.name, slug: target.slug }] : [];
    }),
  })).filter((row) => row.artifacts.length > 0);
}

function buildCategoryBars(): CategoryBar[] {
  const entries = Object.entries(getStats().byCategory).toSorted(
    ([, left], [, right]) => right - left
  );
  const largestCount = entries[0]?.[1] ?? 1;
  return entries.map(([name, count]) => ({
    name,
    slug: name.toLowerCase(),
    count,
    widthPercent: Math.round((count / largestCount) * 100),
  }));
}

function toReferenceName(reference: string): string {
  const fileName = reference.split(/[/\\]/).at(-1) ?? reference;
  return fileName.replace(/\.tkape$/, "").replace(/^!/, "");
}

function buildCollectionPreview(): CollectionPreview {
  const target = getTargetBySlug(COLLECTION_SLUG);
  if (!target) {
    return {
      name: "KapeTriage",
      featured: [],
      moreCount: 0,
      artifactCount: 0,
      pathCount: 0,
    };
  }
  const referenceNames = target.referencedTargets.map(toReferenceName);
  const featuredFromPreference = COLLECTION_FEATURED_NAMES.flatMap(
    (preferred) =>
      referenceNames.filter((name) => name.toLowerCase() === preferred)
  );
  const featured =
    featuredFromPreference.length > 0
      ? featuredFromPreference
      : referenceNames.slice(0, COLLECTION_FEATURED_NAMES.length);

  return {
    name: target.name,
    featured,
    moreCount: Math.max(0, referenceNames.length - featured.length),
    artifactCount: resolveCompoundReferences(target).length,
    pathCount: getResolvedEntries(target).length,
  };
}

function groupArgumentsBySwitch(argumentsList: string[]): string[][] {
  const groups: string[][] = [];
  for (const argument of argumentsList) {
    if (argument.startsWith("--") || groups.length === 0) {
      groups.push([argument]);
    } else {
      groups.at(-1)?.push(argument);
    }
  }
  return groups;
}

function buildBuilderLines(): string[] {
  const preset = SCENARIO_PRESETS.find(
    (candidate) => candidate.id === BUILDER_PRESET_ID
  );
  if (!preset) {
    return [];
  }
  const groups = groupArgumentsBySwitch(
    buildKapeArguments({
      ...DEFAULT_CONFIG,
      container: "vhdx",
      modules: preset.modules,
      targets: preset.targets,
    })
  );
  const lastIndex = groups.length - 1;
  return groups.map((group, index) => {
    const prefix = index === 0 ? ".\\kape.exe " : "  ";
    const suffix = index < lastIndex ? POWERSHELL_LINE_CONTINUATION : "";
    return `${prefix}${group.join(" ")}${suffix}`;
  });
}

function buildSigmaPreview(): SigmaPreview {
  const featuredBackends = SIGMA_FEATURED_BACKEND_IDS.flatMap((id) => {
    const backend = backends.find((candidate) => candidate.id === id);
    return backend ? [backend.name] : [];
  });
  return {
    excerpt: SIGMA_EXCERPT,
    credit: "SigmaHQ rule by frack113",
    featuredBackends,
    moreBackendCount: backends.length - featuredBackends.length,
    ruleCount: sigmaMeta.ruleCount,
    backendCount: backends.length,
  };
}

function countDistinctPaths(): number {
  const paths = loadAllTargets().flatMap((target) =>
    getDirectEntries(target).map((entry) => entry.path.toLowerCase())
  );
  return new Set(paths).size;
}

export function getHomepageData(): HomepageData {
  return {
    totalTargets: getStats().total,
    distinctPathCount: countDistinctPaths(),
    consolePreviews: buildConsolePreviews(),
    questions: buildQuestions(),
    categoryBars: buildCategoryBars(),
    collection: buildCollectionPreview(),
    builderLines: buildBuilderLines(),
    sigma: buildSigmaPreview(),
  };
}
