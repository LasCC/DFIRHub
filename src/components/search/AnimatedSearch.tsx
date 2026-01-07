import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronRight, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchResult {
  id: string;
  url: string;
  meta: { title?: string };
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
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
  debouncedSearch: (
    query: string,
    options?: { debounceTimeoutMs?: number }
  ) => Promise<{ results: PagefindResult[] } | null>;
}

// Example searches to cycle through
const searchExamples = [
  "prefetch",
  "amcache",
  "registry",
  "eventlogs",
  "chrome",
  "anydesk",
  "teamviewer",
  "bitmap",
  "clipboard",
  "srum",
];

export function AnimatedSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentExample, setCurrentExample] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const pagefindRef = useRef<PagefindAPI | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcuts: "/" to focus, or auto-focus on typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if already focused on an input
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      if (isInput) {
        return;
      }

      // "/" shortcut to focus
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Auto-focus on alphanumeric typing (single printable characters)
      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        /^[a-zA-Z0-9]$/.test(e.key)
      ) {
        inputRef.current?.focus();
        // The character will be typed into the now-focused input
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Typewriter effect for placeholder
  useEffect(() => {
    if (query || focused) {
      return; // Don't animate when user is typing or focused
    }

    const example = searchExamples[currentExample];
    let charIndex = 0;
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      const typeChar = () => {
        if (charIndex <= example.length) {
          setDisplayedText(example.slice(0, charIndex));
          charIndex++;
          timeout = setTimeout(typeChar, 80 + Math.random() * 40);
        } else {
          // Pause at end, then start deleting
          timeout = setTimeout(() => setIsTyping(false), 2000);
        }
      };
      typeChar();
    } else {
      // Deleting phase
      let deleteIndex = example.length;
      const deleteChar = () => {
        if (deleteIndex >= 0) {
          setDisplayedText(example.slice(0, deleteIndex));
          deleteIndex--;
          timeout = setTimeout(deleteChar, 40);
        } else {
          // Move to next example
          setCurrentExample((prev) => (prev + 1) % searchExamples.length);
          setIsTyping(true);
        }
      };
      deleteChar();
    }

    return () => clearTimeout(timeout);
  }, [currentExample, isTyping, query, focused]);

  // Initialize Pagefind
  const loadPagefind = useCallback(async () => {
    if (pagefindRef.current) {
      return pagefindRef.current;
    }
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const pagefind = (await import(
        /* @vite-ignore */
        "/pagefind/pagefind.js"
      )) as unknown as PagefindAPI;

      if (pagefind && typeof pagefind.search === "function") {
        pagefindRef.current = pagefind;
        return pagefind;
      }
      return null;
    } catch {
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

        if (!response) {
          return;
        }

        const searchResults: SearchResult[] = (
          await Promise.all(
            response.results.slice(0, 12).map(async (result) => {
              const data = await result.data();
              return {
                id: result.id,
                url: data.url,
                meta: data.meta,
                excerpt: data.excerpt,
              };
            })
          )
        )
          // Filter out non-artifact pages (landing page, tools, builder, etc.)
          .filter((r) => r.url.startsWith("/artifact/"))
          .slice(0, 8);

        setResults(searchResults);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [loadPagefind]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const totalItems = results.length;

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
          if (selectedIndex >= 0 && results[selectedIndex]) {
            window.location.href = results[selectedIndex].url;
          }
          break;
        case "Escape":
          e.preventDefault();
          inputRef.current?.blur();
          setFocused(false);
          break;
      }
    },
    [results, selectedIndex]
  );

  const showResults = focused && (query.trim() || results.length > 0);

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 blur-sm transition-opacity duration-300 group-focus-within:opacity-100" />

        <div className="relative flex items-center rounded-lg border border-border bg-background transition-colors group-focus-within:border-primary/50">
          <Search className="ml-5 h-5 w-5 text-primary/50" />

          <input
            aria-label="Search artifacts"
            className="h-14 flex-1 bg-transparent px-4 text-base outline-none"
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder=""
            ref={inputRef}
            type="text"
            value={query}
          />

          {/* Animated placeholder */}
          {!(query || focused) && (
            <div className="pointer-events-none absolute left-14 flex items-center gap-1 text-base text-muted-foreground/50">
              <span>search "</span>
              <span className="text-primary">{displayedText}</span>
              <span className="animate-blink text-primary">|</span>
              <span>"</span>
            </div>
          )}

          <div className="flex items-center gap-2 pr-5">
            <kbd className="kbd text-xs">/</kbd>
          </div>
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-lg border border-border bg-background/98 shadow-2xl backdrop-blur-lg"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: -8 }}
            ref={resultsRef}
            transition={{ duration: 0.15 }}
          >
            {loading && (
              <div className="px-4 py-4 text-muted-foreground text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  <span>searching...</span>
                </span>
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                no results for "{query}"
              </div>
            )}

            {results.length > 0 && (
              <motion.div
                animate="visible"
                className="py-1"
                initial="hidden"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.035 },
                  },
                }}
              >
                {results.map((result, index) => (
                  <motion.a
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      selectedIndex === index
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-primary/5"
                    }`}
                    href={result.url}
                    key={result.id}
                    onMouseEnter={() => setSelectedIndex(index)}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                  >
                    <ChevronRight
                      className={`h-3 w-3 transition-all duration-150 ${
                        selectedIndex === index
                          ? "translate-x-0.5 text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                    <span className="font-medium">
                      {result.meta.title || result.url}
                    </span>
                  </motion.a>
                ))}
              </motion.div>
            )}

            <div className="flex items-center gap-4 border-border/30 border-t bg-card/30 px-4 py-2 text-[10px] text-muted-foreground/50">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-2.5 w-2.5" />
                <ArrowDown className="h-2.5 w-2.5" />
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd text-[8px]">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd text-[8px]">esc</kbd>
                close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
