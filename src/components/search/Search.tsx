import { ArrowRight, Search as SearchIcon, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { trackSearchQuery, trackSearchResultSelected } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import { CategoryChips } from "./CategoryChips";
import type { SearchHit } from "./pagefindClient";
import { QUICK_LINKS } from "./quickLinks";
import {
  BROWSE_ALL_VALUE,
  SUGGESTED_QUERIES,
  buildKapeCommand,
} from "./searchActions";
import { SearchFooter } from "./SearchFooter";
import { SearchResultItem } from "./SearchResultItem";
import { usePagefindSearch } from "./usePagefindSearch";
import type { RecentArtifact } from "./useRecentArtifacts";
import { useRecentArtifacts } from "./useRecentArtifacts";

declare global {
  interface Window {
    announce?: (message: string) => void;
  }
}

interface SearchProps {
  showTrigger?: boolean;
}

const PRIMARY_ACTION_LABELS: Record<RecentArtifact["kind"], string> = {
  Artifact: "Open artifact",
  Collection: "Open collection",
  EventLog: "Open event",
  Registry: "Open registry artifact",
};

const BROWSE_ALL_PATHS: Record<string, string> = {
  "Event log": "/eventlogs",
  Registry: "/registry",
};

const KINDS_WITHOUT_KAPE_COMMAND = new Set<RecentArtifact["kind"]>([
  "EventLog",
  "Registry",
]);

const ANNOUNCEMENT_CLEAR_DELAY_MS = 1000;
const COPIED_FEEDBACK_MS = 1500;
const SKELETON_ROW_COUNT = 3;

const subscribeToNothing = () => () => null;
const detectMacPlatform = () => navigator.userAgent.includes("Mac");
const assumeNonMacPlatform = () => false;

const toRecentArtifact = ({
  category,
  kind,
  title,
  url,
}: RecentArtifact): RecentArtifact => ({ category, kind, title, url });

function SearchSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-1 p-2">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, row) => (
        <div
          className="flex animate-pulse items-start gap-3 rounded-lg px-3 py-3"
          key={row}
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-overlay/[0.06]" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/3 rounded bg-overlay/[0.08]" />
            <div className="h-2.5 w-4/5 rounded bg-overlay/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Search({ showTrigger = true }: SearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [copied, setCopied] = useState(false);
  const isMac = useSyncExternalStore(
    subscribeToNothing,
    detectMacPlatform,
    assumeNonMacPlatform
  );
  const { categoryCounts, hits, reset, search, status, total } =
    usePagefindSearch();
  const { recent, refresh, remember } = useRecentArtifacts();
  const announcerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const isLoading = status === "loading";
  const hasHits = hits.length > 0;
  const showSkeleton = hasQuery && isLoading && !hasHits;
  const showNoResults = hasQuery && status === "ready" && !hasHits;
  const showUnavailable = hasQuery && status === "unavailable";
  const showChips = hasQuery && status !== "unavailable";
  const showBrowseAll = hasQuery && hasHits && total > hits.length;
  const modifierKey = isMac ? "⌘" : "Ctrl";
  const resultsHeading =
    total > hits.length
      ? `Top ${hits.length} of ${total} results`
      : `${total} ${total === 1 ? "result" : "results"}`;
  const browseAllPath =
    (category && BROWSE_ALL_PATHS[category]) ?? "/artifacts";
  const browseAllHref = `${browseAllPath}?q=${encodeURIComponent(trimmedQuery)}`;

  const selectedArtifact: RecentArtifact | undefined = (
    hasQuery ? hits : recent
  ).find((artifact) => artifact.url === selectedValue);
  const canCopyCommand =
    selectedArtifact !== undefined &&
    !KINDS_WITHOUT_KAPE_COMMAND.has(selectedArtifact.kind);
  const selectedQuickLink = QUICK_LINKS.find(
    (link) => link.href === selectedValue
  );

  const getPrimaryActionLabel = (): string => {
    if (selectedValue === BROWSE_ALL_VALUE) {
      return "See all results";
    }
    if (selectedArtifact) {
      return PRIMARY_ACTION_LABELS[selectedArtifact.kind];
    }
    return selectedQuickLink ? `Go to ${selectedQuickLink.label}` : "Open";
  };

  const announce = useCallback((message: string) => {
    if (window.announce) {
      window.announce(message);
      return;
    }
    const announcer = announcerRef.current;
    if (!announcer) {
      return;
    }
    announcer.textContent = message;
    setTimeout(() => {
      announcer.textContent = "";
    }, ANNOUNCEMENT_CLEAR_DELAY_MS);
  }, []);

  const changeOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        return;
      }
      setQuery("");
      setCategory(null);
      setSelectedValue("");
      reset();
      refresh();
      announce("Search dialog opened. Type to search artifacts.");
    },
    [reset, refresh, announce]
  );

  const copySelectedCommand = useCallback(async () => {
    if (!(selectedArtifact && canCopyCommand)) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildKapeCommand(selectedArtifact.title)
      );
      setCopied(true);
      announce("KAPE command copied");
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(
        () => setCopied(false),
        COPIED_FEEDBACK_MS
      );
    } catch {
      announce("Could not copy the KAPE command");
    }
  }, [selectedArtifact, canCopyCommand, announce]);

  useEffect(
    () => () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const hasSelectedInputText = () => {
      const input = searchInputRef.current;
      return Boolean(input && input.selectionStart !== input.selectionEnd);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      if (event.key === "k" && hasModifier) {
        event.preventDefault();
        changeOpen(!open);
        return;
      }
      if (open && event.key === "c" && hasModifier && !hasSelectedInputText()) {
        event.preventDefault();
        copySelectedCommand();
        return;
      }
      if (event.key !== "/" || open || event.defaultPrevented) {
        return;
      }
      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;
      if (!isTyping) {
        event.preventDefault();
        changeOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, changeOpen, copySelectedCommand]);

  const runSearch = useCallback(
    async (nextQuery: string, nextCategory: string | null) => {
      const outcome = await search(nextQuery, nextCategory);
      if (outcome === null) {
        return;
      }
      setSelectedValue(outcome.hits[0]?.url ?? "");
      trackSearchQuery(nextQuery.trim(), outcome.total);
      announce(`${outcome.total} results found`);
    },
    [search, announce]
  );

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery);
      if (!nextQuery.trim()) {
        setSelectedValue("");
      }
      return runSearch(nextQuery, category);
    },
    [runSearch, category]
  );

  const handleCategoryChange = useCallback(
    (nextCategory: string | null) => {
      setCategory(nextCategory);
      return runSearch(query, nextCategory);
    },
    [runSearch, query]
  );

  const handleClearQuery = useCallback(() => {
    handleQueryChange("");
    searchInputRef.current?.focus();
  }, [handleQueryChange]);

  const navigateTo = useCallback(
    (url: string) => {
      setOpen(false);
      announce("Navigating to result");
      window.location.href = url;
    },
    [announce]
  );

  const handleSelectHit = useCallback(
    (hit: SearchHit) => {
      trackSearchResultSelected(trimmedQuery, hit.url);
      remember(toRecentArtifact(hit));
      navigateTo(hit.url);
    },
    [navigateTo, remember, trimmedQuery]
  );

  const handleSelectRecent = useCallback(
    (artifact: RecentArtifact) => {
      trackSearchResultSelected("", artifact.url);
      remember(artifact);
      navigateTo(artifact.url);
    },
    [navigateTo, remember]
  );

  const handleSelectLink = useCallback(
    (href: string) => {
      trackSearchResultSelected(trimmedQuery, href);
      navigateTo(href);
    },
    [navigateTo, trimmedQuery]
  );

  return (
    <>
      <div
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        ref={announcerRef}
      />

      {showTrigger && (
        <button
          aria-keyshortcuts="Control+K"
          aria-label="Open search dialog"
          className="group glass-subtle focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-overlay/[0.06] text-muted-foreground text-xs transition-all duration-200 hover:border-primary/30 hover:bg-overlay/[0.04] sm:h-8 sm:w-auto sm:px-3"
          data-search-trigger
          onClick={() => changeOpen(true)}
          type="button"
        >
          <SearchIcon
            aria-hidden="true"
            className="h-4 w-4 text-primary/70 transition-colors group-hover:text-primary sm:h-3.5 sm:w-3.5"
          />
          <span className="ml-2 hidden sm:inline">Search</span>
          <span className="ml-2 hidden items-center gap-1 sm:flex">
            <kbd className="kbd kbd-compact">{isMac ? "⌘" : "ctrl"}</kbd>
            <kbd className="kbd kbd-compact">K</kbd>
          </span>
        </button>
      )}

      <CommandDialog
        onOpenChange={changeOpen}
        onSelectionChange={setSelectedValue}
        open={open}
        selectedValue={selectedValue}
      >
        <CommandInput
          aria-describedby="search-instructions"
          aria-label="Search query"
          className="text-base sm:text-sm"
          data-search-input
          onValueChange={handleQueryChange}
          placeholder="Search artifacts and collections"
          ref={searchInputRef}
          trailing={
            <span className="ml-2 flex shrink-0 items-center gap-2">
              {hasQuery && (
                <button
                  aria-label="Clear search"
                  className="focus-ring flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  onClick={handleClearQuery}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  <X aria-hidden="true" className="h-4! w-4!" />
                </button>
              )}
              <kbd className="kbd kbd-compact hidden sm:inline-flex">esc</kbd>
            </span>
          }
          value={query}
        />

        <div
          aria-hidden="true"
          className={cn(
            "-mt-px h-px origin-left bg-primary/60 transition-opacity duration-200",
            isLoading ? "animate-pulse opacity-100" : "opacity-0"
          )}
        />

        {showChips && (
          <CategoryChips
            activeCategory={category}
            counts={categoryCounts}
            onChange={handleCategoryChange}
          />
        )}

        <div className="sr-only" id="search-instructions">
          Type to search artifacts and collections. Use arrow keys to navigate
          results, Enter to select.
        </div>

        <CommandList
          aria-busy={isLoading}
          aria-label="Search results"
          className={cn(
            "scrollbar-thin max-h-[min(30rem,65dvh)] transition-opacity duration-150",
            isLoading && hasHits && "opacity-60"
          )}
        >
          {showSkeleton && <SearchSkeleton />}

          {showNoResults && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <SearchIcon
                aria-hidden="true"
                className="h-8 w-8 text-muted-foreground/50"
              />
              <output className="block text-muted-foreground text-sm">
                No results for &ldquo;{trimmedQuery}&rdquo;
                {category && ` in ${category}`}
              </output>
              <p className="text-muted-foreground text-xs">
                Try an artifact name, a file name, or a path fragment.
              </p>
              {category && (
                <button
                  className="focus-ring rounded-sm text-primary text-xs hover:underline"
                  onClick={() => handleCategoryChange(null)}
                  type="button"
                >
                  Search all categories
                </button>
              )}
            </div>
          )}

          {showUnavailable && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <output className="block text-muted-foreground text-sm">
                The search index is not available right now.
              </output>
              <a
                className="text-primary text-xs hover:underline"
                href={browseAllHref}
              >
                Browse all artifacts
              </a>
            </div>
          )}

          {!hasQuery && (
            <div className="px-4 pt-3 pb-1">
              <p className="pb-2 font-medium text-muted-foreground/70 text-xs">
                Popular searches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUERIES.map((suggestion) => (
                  <button
                    className="focus-ring rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-primary/40 hover:text-foreground"
                    key={suggestion}
                    onClick={() => handleQueryChange(suggestion)}
                    onMouseDown={(event) => event.preventDefault()}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasQuery && recent.length > 0 && (
            <CommandGroup heading="Recent">
              {recent.map((artifact) => (
                <SearchResultItem
                  hit={artifact}
                  key={artifact.url}
                  onSelect={() => handleSelectRecent(artifact)}
                />
              ))}
            </CommandGroup>
          )}

          {!hasQuery && (
            <CommandGroup heading="Quick navigation">
              {QUICK_LINKS.map(({ href, icon: Icon, label, shortcut }) => (
                <CommandItem
                  className="group my-0.5 rounded-lg py-2! text-sm"
                  key={href}
                  onSelect={() => handleSelectLink(href)}
                  value={href}
                >
                  <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary transition-colors group-data-[selected=true]:bg-overlay/[0.04]">
                    <Icon className="h-4! w-4! text-muted-foreground" />
                  </div>
                  <span>{label}</span>
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                    <kbd className="kbd">g</kbd>
                    <kbd className="kbd">{shortcut}</kbd>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasQuery && hasHits && (
            <CommandGroup heading={resultsHeading}>
              {hits.map((hit) => (
                <SearchResultItem
                  hit={hit}
                  key={hit.id}
                  onSelect={() => handleSelectHit(hit)}
                  query={trimmedQuery}
                />
              ))}
              {showBrowseAll && (
                <CommandItem
                  className="group my-0.5 rounded-lg py-2! text-muted-foreground text-sm"
                  onSelect={() => handleSelectLink(browseAllHref)}
                  value={BROWSE_ALL_VALUE}
                >
                  <span>See all {total} results</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-auto h-4! w-4! transition-transform group-data-[selected=true]:translate-x-0.5"
                  />
                </CommandItem>
              )}
            </CommandGroup>
          )}
        </CommandList>

        <SearchFooter
          canCopyCommand={canCopyCommand}
          copied={copied}
          modifierKey={modifierKey}
          primaryActionLabel={getPrimaryActionLabel()}
        />
      </CommandDialog>
    </>
  );
}
