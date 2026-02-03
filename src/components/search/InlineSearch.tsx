import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronRight, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchResult {
  id: string;
  url: string;
  meta: {
    title?: string;
  };
  excerpt: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<{
    url: string;
    meta: { title?: string };
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
    announce?: (message: string) => void;
  }
}

// Quick access items with keyboard shortcuts
const quickAccessItems = [
  { href: "/artifact/prefetch", label: "Prefetch", shortcut: "1" },
  { href: "/artifact/amcache", label: "Amcache", shortcut: "2" },
  { href: "/artifact/eventlogs", label: "EventLogs", shortcut: "3" },
  { href: "/artifact/srum", label: "SRUM", shortcut: "4" },
];

export function InlineSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [pagefindAvailable, setPagefindAvailable] = useState<boolean | null>(
    null
  );
  const pagefindRef = useRef<PagefindAPI | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  // Announce to screen readers
  const announce = useCallback((message: string) => {
    if (window.announce) {
      window.announce(message);
    } else if (announcerRef.current) {
      announcerRef.current.textContent = message;
      setTimeout(() => {
        if (announcerRef.current) announcerRef.current.textContent = "";
      }, 1000);
    }
  }, []);

  // Focus input on / key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        const isInput =
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement;
        if (!isInput) {
          e.preventDefault();
          inputRef.current?.focus();
          announce("Search focused");
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [announce]);

  // Initialize Pagefind
  const loadPagefind = useCallback(async () => {
    if (pagefindRef.current) return pagefindRef.current;
    if (typeof window === "undefined") return null;

    try {
      const pagefind = (await import(
        /* @vite-ignore */
        "/pagefind/pagefind.js"
      )) as unknown as PagefindAPI;

      if (pagefind && typeof pagefind.search === "function") {
        pagefindRef.current = pagefind;
        setPagefindAvailable(true);
        return pagefind;
      }
      setPagefindAvailable(false);
      return null;
    } catch (e) {
      console.info("Pagefind not available:", e);
      setPagefindAvailable(false);
      return null;
    }
  }, []);

  // Search handler
  const handleSearch = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery);
      setSelectedIndex(-1);

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

        if (!response) return;

        const searchResults: SearchResult[] = await Promise.all(
          response.results.slice(0, 8).map(async (result) => {
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

  // Extract artifact name from URL
  const getArtifactName = (url: string): string => {
    const match = url.match(/\/artifact\/([^/]+)/);
    return match ? match[1] : url;
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const items = query ? results : quickAccessItems;
      const totalItems = items.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            const item = query
              ? results[selectedIndex]
              : quickAccessItems[selectedIndex];
            if (item) {
              const url = "url" in item ? item.url : item.href;
              window.location.href = url;
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          inputRef.current?.blur();
          setFocused(false);
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          // Quick access shortcuts when holding Ctrl/Cmd
          if ((e.metaKey || e.ctrlKey) && !query) {
            e.preventDefault();
            const index = Number.parseInt(e.key) - 1;
            if (quickAccessItems[index]) {
              window.location.href = quickAccessItems[index].href;
            }
          }
          break;
      }
    },
    [query, results, selectedIndex]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll('[role="option"]');
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const showResults = focused && (query.trim() || results.length > 0 || !query);

  return (
    <div className="relative z-50 w-full" role="search">
      {/* Live region for announcements */}
      <div
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        ref={announcerRef}
      />

      {/* Search Input */}
      <div className="group relative">
        {/* Glow effect */}
        <div
          aria-hidden="true"
          className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 opacity-0 blur-sm transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100"
        />

        <div className="relative flex items-center border border-border bg-background transition-colors duration-200 group-focus-within:border-primary/50">
          {/* Terminal prompt */}
          <span
            aria-hidden="true"
            className="flex select-none items-center gap-1 pl-4 text-muted-foreground"
          >
            <span className="text-primary">~</span>
            <span>/artifacts</span>
            <span className="text-primary">$</span>
          </span>

          <input
            aria-activedescendant={
              selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
            }
            aria-controls="search-results"
            aria-describedby="search-hint"
            aria-expanded={showResults}
            aria-label="Search artifacts"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="h-12 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/40"
            data-search-input
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => {
              setFocused(true);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="grep -r 'prefetch' ."
            ref={inputRef}
            role="combobox"
            spellCheck="false"
            type="text"
            value={query}
          />

          {/* Keyboard hints */}
          <div aria-hidden="true" className="flex items-center gap-2 pr-4">
            <kbd className="kbd">/</kbd>
            <span className="hidden text-[10px] text-muted-foreground/40 sm:inline">
              focus
            </span>
          </div>
        </div>
      </div>

      {/* Screen reader hint */}
      <div className="sr-only" id="search-hint">
        Type to search artifacts. Use arrow keys to navigate, Enter to select,
        Escape to close.
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div
          aria-label="Search results"
          className="absolute top-full right-0 left-0 mt-2 animate-slide-down overflow-hidden border border-border bg-background/98 shadow-2xl backdrop-blur-lg"
          id="search-results"
          ref={resultsRef}
          role="listbox"
        >
          {/* Loading state */}
          {loading && (
            <div
              aria-live="polite"
              className="px-4 py-4 text-muted-foreground text-sm"
              role="status"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                />
                <span className="text-primary">$</span>
                <span>
                  searching
                  <span className="loading-dots" />
                </span>
              </span>
            </div>
          )}

          {/* Dev mode warning */}
          {!loading &&
            query &&
            results.length === 0 &&
            pagefindAvailable === false && (
              <div className="px-4 py-6 text-center" role="status">
                <div className="mb-2 text-muted-foreground text-sm">
                  <span className="text-primary">$</span> search not available
                  in dev mode
                </div>
                <p className="text-muted-foreground/60 text-xs">
                  run{" "}
                  <code className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                    bun build
                  </code>{" "}
                  then{" "}
                  <code className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                    bun preview
                  </code>
                </p>
              </div>
            )}

          {/* No results */}
          {!loading &&
            query &&
            results.length === 0 &&
            pagefindAvailable === true && (
              <div className="px-4 py-6 text-center" role="status">
                <Search
                  aria-hidden="true"
                  className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20"
                />
                <div className="text-muted-foreground text-sm">
                  <span className="text-primary">$</span> no results for "
                  {query}"
                </div>
                <p className="mt-1 text-muted-foreground/50 text-xs">
                  Try a different search term
                </p>
              </div>
            )}

          {/* Search results */}
          {results.length > 0 && (
            <div className="py-2">
              <div className="flex items-center gap-2 px-4 py-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                <span className="text-primary/50">//</span>
                <span>results</span>
                <span className="text-primary">({results.length})</span>
              </div>
              <motion.div
                animate="visible"
                initial="hidden"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.04 },
                  },
                }}
              >
                {results.map((result, index) => (
                  <motion.a
                    aria-selected={selectedIndex === index}
                    className={`focus-ring block px-4 py-3 transition-colors duration-150 ${
                      selectedIndex === index
                        ? "border-primary border-l-2 bg-primary/10"
                        : "border-transparent border-l-2 hover:bg-primary/5"
                    } ${index > 0 ? "border-border/30 border-t" : ""}`}
                    href={result.url}
                    id={`result-${index}`}
                    key={result.id}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <ChevronRight
                        aria-hidden="true"
                        className={`h-3 w-3 transition-all duration-150 ${
                          selectedIndex === index
                            ? "translate-x-0.5 text-primary"
                            : "text-muted-foreground/50"
                        }`}
                      />
                      <span className="font-medium text-sm">
                        {result.meta.title || getArtifactName(result.url)}
                      </span>
                    </div>
                    {result.excerpt && (
                      <p
                        className="line-clamp-2 pl-5 text-muted-foreground/70 text-xs"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    )}
                  </motion.a>
                ))}
              </motion.div>
            </div>
          )}

          {/* Quick access */}
          {!(query || loading) && (
            <div className="py-2">
              <div className="flex items-center gap-2 px-4 py-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                <span className="text-primary/50">//</span>
                <span>quick access</span>
              </div>
              {quickAccessItems.map((item, index) => (
                <a
                  aria-selected={selectedIndex === index}
                  className={`focus-ring flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                    selectedIndex === index
                      ? "border-primary border-l-2 bg-primary/10"
                      : "border-transparent border-l-2 hover:bg-primary/5"
                  }`}
                  href={item.href}
                  id={`result-${index}`}
                  key={item.href}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                >
                  <ChevronRight
                    aria-hidden="true"
                    className={`h-3 w-3 transition-all duration-150 ${
                      selectedIndex === index
                        ? "translate-x-0.5 text-primary"
                        : "text-muted-foreground/50"
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                  <kbd
                    aria-label={`Press Control plus ${item.shortcut}`}
                    className="kbd ml-auto text-[9px]"
                  >
                    ⌘{item.shortcut}
                  </kbd>
                </a>
              ))}
            </div>
          )}

          {/* Footer hints */}
          <div className="flex items-center justify-between border-border/30 border-t bg-secondary/20 px-4 py-2 text-[10px] text-muted-foreground/50">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ArrowUp aria-hidden="true" className="h-2.5 w-2.5" />
                <ArrowDown aria-hidden="true" className="h-2.5 w-2.5" />
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd text-[8px]">↵</kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd text-[8px]">esc</kbd>
                <span>close</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
