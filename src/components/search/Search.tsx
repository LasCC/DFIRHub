import {
  Blocks,
  FileSearch,
  Hammer,
  Home,
  Layers,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchResult {
  id: string;
  url: string;
  meta: {
    title?: string;
    image?: string;
  };
  excerpt: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<{
    url: string;
    meta: { title?: string; image?: string };
    excerpt: string;
  }>;
}

interface PagefindAPI {
  init: () => Promise<void>;
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
  debouncedSearch: (
    query: string,
    options?: { debounceTimeoutMs?: number }
  ) => Promise<{ results: PagefindResult[] } | null>;
}

declare global {
  interface Window {
    pagefind?: PagefindAPI;
    announce?: (message: string) => void;
  }
}

interface SearchProps {
  showTrigger?: boolean;
}

export function Search({ showTrigger = true }: SearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const pagefindRef = useRef<PagefindAPI | null>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  // Announce to screen readers
  const announce = useCallback((message: string) => {
    if (window.announce) {
      window.announce(message);
    } else if (announcerRef.current) {
      announcerRef.current.textContent = message;
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = "";
        }
      }, 1000);
    }
  }, []);

  // Initialize Pagefind when dialog opens
  const loadPagefind = useCallback(async () => {
    if (pagefindRef.current) {
      return pagefindRef.current;
    }
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const pagefind = (await import(
        // @ts-expect-error -- pagefind.js is generated at build time by Pagefind
        /* @vite-ignore */ "/pagefind/pagefind.js"
      )) as unknown as PagefindAPI;

      if (pagefind && typeof pagefind.search === "function") {
        pagefindRef.current = pagefind;
        return pagefind;
      }
      return null;
    } catch (e) {
      console.info("Pagefind not available:", e);
      return null;
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K or / to open
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "/" && !open) {
        const activeEl = document.activeElement;
        const isInput =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement;
        if (!isInput) {
          e.preventDefault();
          setOpen(true);
          announce("Search dialog opened");
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, announce]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      announce("Search dialog opened. Type to search artifacts.");
    }
  }, [open, announce]);

  // Search handler
  const handleSearch = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery);

      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const pagefind = await loadPagefind();
        if (!pagefind) {
          setResults([]);
          setLoading(false);
          return;
        }

        const response = await pagefind.debouncedSearch(searchQuery, {
          debounceTimeoutMs: 150,
        });

        if (!response) {
          return;
        }

        const searchResults: SearchResult[] = await Promise.all(
          response.results.slice(0, 10).map(async (result) => {
            const data = await result.data();
            return {
              id: result.id,
              url: data.url,
              meta: data.meta,
              excerpt: data.excerpt,
            };
          })
        );

        setResults(searchResults);
        announce(`${searchResults.length} results found`);
      } catch (e) {
        console.error("Search error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [loadPagefind, announce]
  );

  // Navigate to result
  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      announce("Navigating to result");
      window.location.href = url;
    },
    [announce]
  );

  // Extract artifact name from URL
  const getArtifactName = (url: string): string => {
    const match = url.match(/\/artifact\/([^/]+)/);
    return match ? match[1] : url;
  };

  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  return (
    <>
      {/* Live region for announcements */}
      <div
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        ref={announcerRef}
      />

      {/* Trigger button */}
      {showTrigger && (
        <button
          aria-keyshortcuts="Control+K"
          aria-label="Open search dialog"
          className="group glass-subtle focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground text-xs transition-all duration-200 hover:border-primary/30 hover:bg-white/[0.04] sm:h-8 sm:w-auto sm:px-3"
          data-search-trigger
          onClick={() => setOpen(true)}
          type="button"
        >
          <SearchIcon
            aria-hidden="true"
            className="h-4 w-4 text-primary/70 transition-colors group-hover:text-primary sm:h-3.5 sm:w-3.5"
          />
          <span className="ml-2 hidden sm:inline">search</span>
          <span className="ml-2 hidden items-center gap-1 sm:flex">
            <kbd className="kbd text-[9px]">{isMac ? "⌘" : "ctrl"}</kbd>
            <kbd className="kbd text-[9px]">K</kbd>
          </span>
        </button>
      )}

      <CommandDialog
        aria-label="Search artifacts"
        onOpenChange={setOpen}
        open={open}
      >
        <CommandInput
          aria-describedby="search-instructions"
          aria-label="Search query"
          data-search-input
          onValueChange={handleSearch}
          placeholder="Search artifacts..."
          value={query}
        />

        {/* Hidden instructions for screen readers */}
        <div className="sr-only" id="search-instructions">
          Type to search artifacts. Use arrow keys to navigate results, Enter to
          select.
        </div>

        <CommandList
          aria-label="Search results"
          className="max-h-[400px]"
          role="listbox"
        >
          {loading && (
            <div
              aria-live="polite"
              className="animate-pulse-subtle py-8 text-center text-muted-foreground text-sm"
              role="status"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                />
                <span className="text-primary">$</span> searching
                <span className="loading-dots" />
              </span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <CommandEmpty
              className="py-8 text-center text-muted-foreground text-sm"
              role="status"
            >
              <div className="flex flex-col items-center gap-2">
                <SearchIcon
                  aria-hidden="true"
                  className="h-8 w-8 text-muted-foreground/30"
                />
                <span>
                  <span className="text-primary">$</span> no results for "
                  {query}"
                </span>
                <span className="text-muted-foreground/60 text-xs">
                  Try a different search term
                </span>
              </div>
            </CommandEmpty>
          )}

          {!query && (
            <CommandGroup
              heading={
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                  <Sparkles
                    aria-hidden="true"
                    className="h-3 w-3 text-primary/60"
                  />
                  <span>quick navigation</span>
                </span>
              }
            >
              <CommandItem
                className="group my-0.5 rounded-lg text-sm"
                onSelect={() => handleSelect("/")}
              >
                <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-md border border-zinc-500/20 bg-zinc-500/20 transition-colors group-data-[selected=true]:border-zinc-400/30 group-data-[selected=true]:bg-zinc-500/30">
                  <Home
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-zinc-400"
                  />
                </div>
                <span>home</span>
                <span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
                  <kbd className="kbd text-[9px]">g</kbd>
                  <kbd className="kbd text-[9px]">h</kbd>
                </span>
              </CommandItem>
              <CommandItem
                className="group my-0.5 rounded-lg text-sm"
                onSelect={() => handleSelect("/artifacts")}
              >
                <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-md border border-primary/20 bg-primary/20 transition-colors group-data-[selected=true]:border-primary/40 group-data-[selected=true]:bg-primary/30">
                  <FileSearch
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-primary"
                  />
                </div>
                <span>all artifacts</span>
                <span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
                  <kbd className="kbd text-[9px]">g</kbd>
                  <kbd className="kbd text-[9px]">a</kbd>
                </span>
              </CommandItem>
              <CommandItem
                className="group my-0.5 rounded-lg text-sm"
                onSelect={() => handleSelect("/collections")}
              >
                <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/20 transition-colors group-data-[selected=true]:border-cyan-400/30 group-data-[selected=true]:bg-cyan-500/30">
                  <Layers
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-cyan-400"
                  />
                </div>
                <span>collections</span>
                <span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
                  <kbd className="kbd text-[9px]">g</kbd>
                  <kbd className="kbd text-[9px]">c</kbd>
                </span>
              </CommandItem>
              <CommandItem
                className="group my-0.5 rounded-lg text-sm"
                onSelect={() => handleSelect("/builder")}
              >
                <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/20 transition-colors group-data-[selected=true]:border-amber-400/30 group-data-[selected=true]:bg-amber-500/30">
                  <Hammer
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-amber-400"
                  />
                </div>
                <span>builder</span>
                <span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
                  <kbd className="kbd text-[9px]">g</kbd>
                  <kbd className="kbd text-[9px]">b</kbd>
                </span>
              </CommandItem>
              <CommandItem
                className="group my-0.5 rounded-lg text-sm"
                onSelect={() => handleSelect("/converter")}
              >
                <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-md border border-purple-500/20 bg-purple-500/20 transition-colors group-data-[selected=true]:border-purple-400/30 group-data-[selected=true]:bg-purple-500/30">
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-purple-400"
                    fill="currentColor"
                    viewBox="155 155 750 625"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m890.394412 165c3.019653 25.589448-5.253407 50.2282-24.819179 73.916253-19.565772 23.688054-45.907539 35.53208-79.025312 35.53208l-62.977337.363397c39.393202 52.779296 59.977836 120.64775 53.603978 194.68827-14.47716 168.170707-162.549778 304.5-330.729454 304.5s-292.780187-136.329293-278.30303-304.5c14.477156-168.170706 162.549776-304.5 330.729452-304.5zm-401.090784 111.166667c-106.780747 0-200.795108 86.558282-209.986954 193.333334s69.91959 193.333333 176.700337 193.333333c106.780746 0 200.795108-86.558281 209.986952-193.333333 9.191849-106.775052-69.919588-193.333334-176.700335-193.333334z" />
                  </svg>
                </div>
                <span>converter</span>
                <span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
                  <kbd className="kbd text-[9px]">g</kbd>
                  <kbd className="kbd text-[9px]">v</kbd>
                </span>
              </CommandItem>
            </CommandGroup>
          )}

          {results.length > 0 && (
            <CommandGroup
              heading={
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                  <Blocks
                    aria-hidden="true"
                    className="h-3 w-3 text-primary/60"
                  />
                  <span>results</span>
                  <span className="font-medium text-primary">
                    ({results.length})
                  </span>
                </span>
              }
            >
              {results.map((result) => (
                <CommandItem
                  className="group my-0.5 rounded-lg py-3 text-sm"
                  key={result.id}
                  onSelect={() => handleSelect(result.url)}
                >
                  <div className="flex w-full flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/20 bg-primary/10 transition-colors group-data-[selected=true]:border-primary/30 group-data-[selected=true]:bg-primary/20">
                        <FileSearch
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-primary/70 group-data-[selected=true]:text-primary"
                        />
                      </div>
                      <span className="font-medium">
                        {result.meta.title || getArtifactName(result.url)}
                      </span>
                    </div>
                    {result.excerpt && (
                      <p
                        className="line-clamp-2 pl-9 text-muted-foreground text-xs [&_mark]:rounded-sm [&_mark]:bg-primary/30 [&_mark]:px-0.5 [&_mark]:text-foreground"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>

        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between border-white/[0.06] border-t bg-white/[0.02] px-4 py-2.5 text-[10px] text-muted-foreground/50">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <kbd className="kbd text-[9px]">↑</kbd>
                <kbd className="kbd text-[9px]">↓</kbd>
              </div>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd text-[9px]">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd text-[9px]">esc</kbd>
              <span>close</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/40">
            <SearchIcon aria-hidden="true" className="h-3 w-3" />
            <span>pagefind</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
