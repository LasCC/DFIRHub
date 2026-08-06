import { FileSearch, Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getCategoryStyle } from "@/lib/categoryStyles";
import { trackSearchQuery, trackSearchResultSelected } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export interface HomeSearchItem {
  /** Name */
  n: string;
  /** Slug (URL path) */
  s: string;
  /** Category */
  c: string;
  /** Description */
  d: string;
  /** Direct path count */
  p: number;
}

interface HomeSearchProps {
  data: HomeSearchItem[];
  popular: HomeSearchItem[];
}

const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 80;

export function HomeSearch({ data, popular }: HomeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HomeSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasQuery = query.trim().length > 0;

  const filterResults = useCallback(
    (needle: string) => {
      if (!needle) {
        setResults([]);
        return;
      }
      const matches = data.filter(
        (item) =>
          item.n.toLowerCase().includes(needle) ||
          item.c.toLowerCase().includes(needle) ||
          item.d.toLowerCase().includes(needle)
      );
      matches.sort((a, b) => {
        const aName = a.n.toLowerCase();
        const bName = b.n.toLowerCase();
        const score = (name: string) =>
          name.startsWith(needle) ? 0 : name.includes(needle) ? 1 : 2;
        const diff = score(aName) - score(bName);
        return diff !== 0 ? diff : aName.localeCompare(bName);
      });
      setResults(matches.slice(0, MAX_SUGGESTIONS));
    },
    [data]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    const needle = value.trim().toLowerCase();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => filterResults(needle), DEBOUNCE_MS);
  };

  const suggestions = useMemo(
    () => (hasQuery ? results : popular),
    [hasQuery, popular, results]
  );

  // Close when clicking outside
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        index < suggestions.length - 1 ? index + 1 : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index > 0 ? index - 1 : suggestions.length - 1
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      const item = suggestions[activeIndex];
      if (item) {
        event.preventDefault();
        trackSearchResultSelected(query, `/artifact/${item.s}`);
        window.location.href = `/artifact/${item.s}`;
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handleSubmit = () => {
    trackSearchQuery(query.trim(), suggestions.length);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <form action="/artifacts" method="get" onSubmit={handleSubmit} role="search">
        <label htmlFor="home-search" className="sr-only">
          Search artifacts
        </label>
        <div className="flex h-12 items-center gap-3 rounded-xl border border-input bg-card px-4 shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
          <SearchIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <input
            id="home-search"
            name="q"
            type="search"
            data-search-input
            autoComplete="off"
            spellCheck="false"
            placeholder="Search artifacts, e.g. prefetch, amcache, srum"
            aria-activedescendant={
              open && activeIndex >= 0
                ? `home-search-option-${activeIndex}`
                : undefined
            }
            aria-controls="home-search-results"
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:text-base"
            onBlur={() => setOpen(false)}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            value={query}
          />
          <kbd className="kbd" aria-hidden="true">
            /
          </kbd>
        </div>

        {open && (
          <div
            id="home-search-results"
            className="glass-strong animate-slide-down absolute right-0 left-0 top-full z-50 mt-2 overflow-hidden rounded-xl"
          >
            {hasQuery && suggestions.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No artifacts match "{query}"
                </p>
                <a
                  href={`/artifacts?q=${encodeURIComponent(query.trim())}`}
                  className="mt-1 inline-block text-xs text-primary transition-colors hover:underline"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  Search all artifacts
                </a>
              </div>
            ) : (
              <>
                <p
                  aria-hidden="true"
                  className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground"
                >
                  {hasQuery ? "Suggestions" : "Popular"}
                </p>
                <ul
                  aria-label={hasQuery ? "Search suggestions" : "Popular artifacts"}
                  className="max-h-80 overflow-y-auto pb-2"
                  role="listbox"
                >
                  {suggestions.map((item, index) => (
                    <li key={item.s}>
                      <a
                        aria-selected={index === activeIndex}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          index === activeIndex ? "bg-overlay/[0.06]" : ""
                        )}
                        href={`/artifact/${item.s}`}
                        id={`home-search-option-${index}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        role="option"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
                          <FileSearch
                            aria-hidden="true"
                            className="h-4 w-4 text-muted-foreground"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.n}
                          </p>
                          {item.d && (
                            <p className="truncate text-xs text-muted-foreground">
                              {item.d}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs">
                          {item.c && (
                            <span
                              className={cn(
                                "hidden font-medium sm:inline",
                                getCategoryStyle(item.c).text
                              )}
                            >
                              {item.c}
                            </span>
                          )}
                          <span className="tabular-nums text-muted-foreground">
                            {item.p} paths
                          </span>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
                {hasQuery && (
                  <div className="flex items-center justify-between border-t border-border px-3 py-2">
                    <a
                      href={`/artifacts?q=${encodeURIComponent(query.trim())}`}
                      className="text-xs text-muted-foreground transition-colors hover:text-primary"
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      View all results
                    </a>
                    <kbd className="kbd kbd-compact" aria-hidden="true">
                      ↵
                    </kbd>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
