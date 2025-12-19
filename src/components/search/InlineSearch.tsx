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
		options?: { debounceTimeoutMs?: number },
	) => Promise<{ results: PagefindResult[] } | null>;
}

declare global {
	interface Window {
		announce?: (message: string) => void;
	}
}

// Quick access items with keyboard shortcuts
const quickAccessItems = [
	{ href: "/artefact/prefetch", label: "Prefetch", shortcut: "1" },
	{ href: "/artefact/amcache", label: "Amcache", shortcut: "2" },
	{ href: "/artefact/eventlogs", label: "EventLogs", shortcut: "3" },
	{ href: "/artefact/srum", label: "SRUM", shortcut: "4" },
];

export function InlineSearch() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [focused, setFocused] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const [pagefindAvailable, setPagefindAvailable] = useState<boolean | null>(
		null,
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
			} else {
				setPagefindAvailable(false);
				return null;
			}
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
					}),
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
		[loadPagefind, announce],
	);

	// Extract artifact name from URL
	const getArtifactName = (url: string): string => {
		const match = url.match(/\/artefact\/([^/]+)/);
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
						const index = parseInt(e.key) - 1;
						if (quickAccessItems[index]) {
							window.location.href = quickAccessItems[index].href;
						}
					}
					break;
			}
		},
		[query, results, selectedIndex],
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
		<div className="relative w-full z-50" role="search">
			{/* Live region for announcements */}
			<div
				ref={announcerRef}
				className="sr-only"
				aria-live="polite"
				aria-atomic="true"
			/>

			{/* Search Input */}
			<div className="relative group">
				{/* Glow effect */}
				<div
					className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 blur-sm transition-opacity duration-300"
					aria-hidden="true"
				/>

				<div className="relative flex items-center bg-background border border-border group-focus-within:border-primary/50 transition-colors duration-200">
					{/* Terminal prompt */}
					<span
						className="pl-4 text-muted-foreground select-none flex items-center gap-1"
						aria-hidden="true"
					>
						<span className="text-primary">~</span>
						<span>/artifacts</span>
						<span className="text-primary">$</span>
					</span>

					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => handleSearch(e.target.value)}
						onFocus={() => {
							setFocused(true);
							setSelectedIndex(-1);
						}}
						onBlur={() => setTimeout(() => setFocused(false), 200)}
						onKeyDown={handleKeyDown}
						placeholder="grep -r 'prefetch' ."
						className="flex-1 h-12 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/40"
						aria-label="Search artifacts"
						aria-describedby="search-hint"
						aria-expanded={showResults}
						aria-controls="search-results"
						aria-activedescendant={
							selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
						}
						role="combobox"
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck="false"
						data-search-input
					/>

					{/* Keyboard hints */}
					<div className="pr-4 flex items-center gap-2" aria-hidden="true">
						<kbd className="kbd">/</kbd>
						<span className="text-[10px] text-muted-foreground/40 hidden sm:inline">
							focus
						</span>
					</div>
				</div>
			</div>

			{/* Screen reader hint */}
			<div id="search-hint" className="sr-only">
				Type to search artifacts. Use arrow keys to navigate, Enter to select,
				Escape to close.
			</div>

			{/* Results Dropdown */}
			{showResults && (
				<div
					id="search-results"
					ref={resultsRef}
					className="absolute top-full left-0 right-0 mt-2 border border-border bg-background/98 backdrop-blur-lg shadow-2xl animate-slide-down overflow-hidden"
					role="listbox"
					aria-label="Search results"
				>
					{/* Loading state */}
					{loading && (
						<div
							className="px-4 py-4 text-sm text-muted-foreground"
							role="status"
							aria-live="polite"
						>
							<span className="inline-flex items-center gap-2">
								<span
									className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
									aria-hidden="true"
								/>
								<span className="text-primary">$</span>
								<span>
									searching<span className="loading-dots"></span>
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
								<div className="text-sm text-muted-foreground mb-2">
									<span className="text-primary">$</span> search not available
									in dev mode
								</div>
								<p className="text-xs text-muted-foreground/60">
									run{" "}
									<code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
										bun build
									</code>{" "}
									then{" "}
									<code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">
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
									className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2"
									aria-hidden="true"
								/>
								<div className="text-sm text-muted-foreground">
									<span className="text-primary">$</span> no results for "
									{query}"
								</div>
								<p className="text-xs text-muted-foreground/50 mt-1">
									Try a different search term
								</p>
							</div>
						)}

					{/* Search results */}
					{results.length > 0 && (
						<div className="py-2">
							<div className="px-4 py-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2">
								<span className="text-primary/50">//</span>
								<span>results</span>
								<span className="text-primary">({results.length})</span>
							</div>
							{results.map((result, index) => (
								<a
									key={result.id}
									id={`result-${index}`}
									href={result.url}
									role="option"
									aria-selected={selectedIndex === index}
									className={`block px-4 py-3 transition-colors duration-150 focus-ring ${
										selectedIndex === index
											? "bg-primary/10 border-l-2 border-primary"
											: "hover:bg-primary/5 border-l-2 border-transparent"
									} ${index > 0 ? "border-t border-border/30" : ""}`}
									onMouseEnter={() => setSelectedIndex(index)}
								>
									<div className="flex items-center gap-2 mb-1">
										<ChevronRight
											className={`h-3 w-3 transition-all duration-150 ${
												selectedIndex === index
													? "text-primary translate-x-0.5"
													: "text-muted-foreground/50"
											}`}
											aria-hidden="true"
										/>
										<span className="text-sm font-medium">
											{result.meta.title || getArtifactName(result.url)}
										</span>
									</div>
									{result.excerpt && (
										<p
											className="text-xs text-muted-foreground/70 line-clamp-2 pl-5"
											dangerouslySetInnerHTML={{ __html: result.excerpt }}
										/>
									)}
								</a>
							))}
						</div>
					)}

					{/* Quick access */}
					{!query && !loading && (
						<div className="py-2">
							<div className="px-4 py-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2">
								<span className="text-primary/50">//</span>
								<span>quick access</span>
							</div>
							{quickAccessItems.map((item, index) => (
								<a
									key={item.href}
									id={`result-${index}`}
									href={item.href}
									role="option"
									aria-selected={selectedIndex === index}
									className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 focus-ring ${
										selectedIndex === index
											? "bg-primary/10 border-l-2 border-primary"
											: "hover:bg-primary/5 border-l-2 border-transparent"
									}`}
									onMouseEnter={() => setSelectedIndex(index)}
								>
									<ChevronRight
										className={`h-3 w-3 transition-all duration-150 ${
											selectedIndex === index
												? "text-primary translate-x-0.5"
												: "text-muted-foreground/50"
										}`}
										aria-hidden="true"
									/>
									<span className="font-medium">{item.label}</span>
									<kbd
										className="ml-auto kbd text-[9px]"
										aria-label={`Press Control plus ${item.shortcut}`}
									>
										⌘{item.shortcut}
									</kbd>
								</a>
							))}
						</div>
					)}

					{/* Footer hints */}
					<div className="px-4 py-2 border-t border-border/30 bg-secondary/20 flex items-center justify-between text-[10px] text-muted-foreground/50">
						<div className="flex items-center gap-3">
							<span className="flex items-center gap-1">
								<ArrowUp className="h-2.5 w-2.5" aria-hidden="true" />
								<ArrowDown className="h-2.5 w-2.5" aria-hidden="true" />
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
