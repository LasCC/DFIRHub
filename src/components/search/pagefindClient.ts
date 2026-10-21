import { escapeRegExp } from "./escapeRegExp";

export type CategoryCounts = Record<string, number>;

export interface SearchOutcome {
  categoryCounts: CategoryCounts;
  hits: SearchHit[];
  total: number;
}

export type SearchHitKind = "Artifact" | "Collection" | "EventLog" | "Registry";

export interface SearchHit {
  category: string;
  excerpt: string;
  id: string;
  kind: SearchHitKind;
  pathCount: number;
  title: string;
  url: string;
}

interface PagefindFragment {
  excerpt: string;
  meta: Record<string, string | undefined>;
  url: string;
}

interface PagefindResult {
  data: () => Promise<PagefindFragment>;
  id: string;
}

interface PagefindResponse {
  results: PagefindResult[];
  totalFilters?: { category?: CategoryCounts };
}

interface PagefindSearchOptions {
  debounceTimeoutMs?: number;
  filters?: { category: string };
}

interface PagefindApi {
  filters: () => Promise<unknown>;
  debouncedSearch: (
    query: string,
    options?: PagefindSearchOptions
  ) => Promise<PagefindResponse | null>;
}

const PAGEFIND_MODULE_URL = "/pagefind/pagefind.js";
const HTML_EXTENSION_PATTERN = /\.html(?=$|[?#])/u;
const ARTIFACT_SLUG_PATTERN = /\/artifact\/(?<slug>[^/?#]+)/u;

const MARK_TAGS = "(?:</?mark>)*";

let pagefindPromise: Promise<PagefindApi | null> | null = null;

const importPagefind = async (): Promise<PagefindApi | null> => {
  try {
    const pagefind = (await import(
      /* @vite-ignore */ PAGEFIND_MODULE_URL
    )) as PagefindApi;
    if (typeof pagefind.debouncedSearch !== "function") {
      return null;
    }
    await pagefind.filters();
    return pagefind;
  } catch (error) {
    console.info("Pagefind not available:", error);
    return null;
  }
};

export const loadPagefind = (): Promise<PagefindApi | null> => {
  pagefindPromise ??= importPagefind().then((pagefind) => {
    if (!pagefind) {
      pagefindPromise = null;
    }
    return pagefind;
  });
  return pagefindPromise;
};

export const getArtifactSlug = (url: string): string =>
  ARTIFACT_SLUG_PATTERN.exec(url)?.groups?.slug ?? url;

const stripLeadingTitle = (excerpt: string, title: string): string => {
  const titlePattern = [...title].map(escapeRegExp).join(MARK_TAGS);
  const leadingTitle = new RegExp(
    `^${MARK_TAGS}${titlePattern}${MARK_TAGS}\\.${MARK_TAGS}(?:\\s+|$)`,
    "iu"
  );
  let stripped = excerpt;
  while (leadingTitle.test(stripped)) {
    stripped = stripped.replace(leadingTitle, "");
  }
  return stripped;
};

const SEARCH_HIT_KINDS = new Set<string>([
  "Collection",
  "EventLog",
  "Registry",
]);

const toSearchHitKind = (kind: string | undefined): SearchHitKind =>
  kind && SEARCH_HIT_KINDS.has(kind) ? (kind as SearchHitKind) : "Artifact";

const toHit = async (result: PagefindResult): Promise<SearchHit> => {
  const { excerpt, meta, url } = await result.data();
  const cleanUrl = url.replace(HTML_EXTENSION_PATTERN, "");
  const title = meta.title ?? getArtifactSlug(cleanUrl);
  return {
    category: meta.category ?? "",
    excerpt: stripLeadingTitle(excerpt, title),
    id: result.id,
    kind: toSearchHitKind(meta.kind),
    pathCount: Number(meta.paths) || 0,
    title,
    url: cleanUrl,
  };
};

interface PagefindSearchRequest {
  category: string | null;
  debounceTimeoutMs: number;
  limit: number;
  query: string;
}

export const runPagefindSearch = async (
  pagefind: PagefindApi,
  { category, debounceTimeoutMs, limit, query }: PagefindSearchRequest
): Promise<SearchOutcome | null> => {
  const response = await pagefind.debouncedSearch(query, {
    debounceTimeoutMs,
    ...(category && { filters: { category } }),
  });
  if (!response) {
    return null;
  }
  const hits = await Promise.all(response.results.slice(0, limit).map(toHit));
  return {
    categoryCounts: response.totalFilters?.category ?? {},
    hits,
    total: response.results.length,
  };
};
