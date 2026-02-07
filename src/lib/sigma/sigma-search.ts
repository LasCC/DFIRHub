import MiniSearch from "minisearch";

export interface SigmaRuleEntry {
  id: string;
  title: string;
  description: string;
  level: string;
  status: string;
  logsource: { category?: string; product?: string; service?: string };
  tags: string[];
  author: string;
  date: string;
  filename: string;
}

let searchInstance: MiniSearch<SigmaRuleEntry> | null = null;
let indexData: SigmaRuleEntry[] | null = null;
let rulesData: Record<string, string> | null = null;
let indexPromise: Promise<void> | null = null;
let rulesPromise: Promise<Record<string, string>> | null = null;

function buildSearch(entries: SigmaRuleEntry[]): MiniSearch<SigmaRuleEntry> {
  const search = new MiniSearch<SigmaRuleEntry>({
    fields: ["title", "description", "tagsJoined", "logsourceJoined"],
    storeFields: [
      "id",
      "title",
      "description",
      "level",
      "status",
      "logsource",
      "tags",
      "author",
      "date",
      "filename",
    ],
    searchOptions: {
      boost: { title: 3, tagsJoined: 2, description: 1, logsourceJoined: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });

  const docs = entries.map((entry) => ({
    ...entry,
    tagsJoined: entry.tags.join(" "),
    logsourceJoined: [
      entry.logsource.category,
      entry.logsource.product,
      entry.logsource.service,
    ]
      .filter(Boolean)
      .join(" "),
  }));

  search.addAll(docs);
  return search;
}

export async function loadSigmaIndex(): Promise<void> {
  if (searchInstance) {
    return;
  }

  if (!indexPromise) {
    indexPromise = (async () => {
      const res = await fetch("/sigma-rules/index.json");
      if (!res.ok) {
        throw new Error(`Failed to load sigma index: ${res.status}`);
      }
      const entries = (await res.json()) as SigmaRuleEntry[];
      indexData = entries;
      searchInstance = buildSearch(entries);
    })();
  }

  await indexPromise;
}

export function searchSigmaRules(query: string): SigmaRuleEntry[] {
  if (!searchInstance) {
    return [];
  }
  if (!query.trim()) {
    return [];
  }

  const results = searchInstance.search(query);
  return (results as unknown as SigmaRuleEntry[]).slice(0, 50);
}

export function getSigmaRuleCount(): number {
  return indexData?.length ?? 0;
}

export async function loadSigmaRule(id: string): Promise<string | null> {
  if (!rulesData) {
    if (!rulesPromise) {
      rulesPromise = (async () => {
        const res = await fetch("/sigma-rules/rules.json");
        if (!res.ok) {
          throw new Error(`Failed to load sigma rules: ${res.status}`);
        }
        return (await res.json()) as Record<string, string>;
      })();
    }
    rulesData = await rulesPromise;
  }

  return rulesData[id] ?? null;
}
