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
		options?: { debounceTimeoutMs?: number },
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
			if (isInput) return;

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
		if (query || focused) return; // Don't animate when user is typing or focused

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
		if (pagefindRef.current) return pagefindRef.current;
		if (typeof window === "undefined") return null;

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

				if (!response) return;

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
						}),
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
		[loadPagefind],
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
		[results, selectedIndex],
	);

	const showResults = focused && (query.trim() || results.length > 0);

	return (
		<div className="relative w-full">
			{/* Search Input */}
			<div className="relative group">
				<div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />

				<div className="relative flex items-center bg-background border border-border group-focus-within:border-primary/50 transition-colors rounded-lg">
					<Search className="ml-5 h-5 w-5 text-primary/50" />

					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => handleSearch(e.target.value)}
						onFocus={() => setFocused(true)}
						onBlur={() => setTimeout(() => setFocused(false), 200)}
						onKeyDown={handleKeyDown}
						placeholder=""
						className="flex-1 h-14 bg-transparent px-4 text-base outline-none"
						aria-label="Search artifacts"
					/>

					{/* Animated placeholder */}
					{!query && !focused && (
						<div className="absolute left-14 text-base text-muted-foreground/50 pointer-events-none flex items-center gap-1">
							<span>search "</span>
							<span className="text-primary">{displayedText}</span>
							<span className="animate-blink text-primary">|</span>
							<span>"</span>
						</div>
					)}

					<div className="pr-5 flex items-center gap-2">
						<kbd className="kbd text-xs">/</kbd>
					</div>
				</div>
			</div>

			{/* Results Dropdown */}
			<AnimatePresence>
				{showResults && (
					<motion.div
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15 }}
						ref={resultsRef}
						className="absolute top-full left-0 right-0 mt-2 border border-border bg-background/98 backdrop-blur-lg shadow-2xl overflow-hidden z-50 rounded-lg"
					>
						{loading && (
							<div className="px-4 py-4 text-sm text-muted-foreground">
								<span className="inline-flex items-center gap-2">
									<span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
									<span>searching...</span>
								</span>
							</div>
						)}

						{!loading && query && results.length === 0 && (
							<div className="px-4 py-6 text-center text-sm text-muted-foreground">
								no results for "{query}"
							</div>
						)}

						{results.length > 0 && (
							<div className="py-1">
								{results.map((result, index) => (
									<a
										key={result.id}
										href={result.url}
										className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
											selectedIndex === index
												? "bg-primary/10 text-primary"
												: "hover:bg-primary/5"
										}`}
										onMouseEnter={() => setSelectedIndex(index)}
									>
										<ChevronRight
											className={`h-3 w-3 transition-colors ${
												selectedIndex === index
													? "text-primary"
													: "text-muted-foreground/30"
											}`}
										/>
										<span className="font-medium">
											{result.meta.title || result.url}
										</span>
									</a>
								))}
							</div>
						)}

						<div className="px-4 py-2 border-t border-border/30 bg-card/30 flex items-center gap-4 text-[10px] text-muted-foreground/50">
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
