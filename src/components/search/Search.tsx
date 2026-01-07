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
		options?: { debounceTimeoutMs?: number },
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
				if (announcerRef.current) announcerRef.current.textContent = "";
			}, 1000);
		}
	}, []);

	// Initialize Pagefind when dialog opens
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

				if (!response) return;

				const searchResults: SearchResult[] = await Promise.all(
					response.results.slice(0, 10).map(async (result) => {
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

	// Navigate to result
	const handleSelect = useCallback(
		(url: string) => {
			setOpen(false);
			announce("Navigating to result");
			window.location.href = url;
		},
		[announce],
	);

	// Extract artifact name from URL
	const getArtifactName = (url: string): string => {
		const match = url.match(/\/artifact\/([^/]+)/);
		return match ? match[1] : url;
	};

	const isMac =
		typeof navigator !== "undefined" &&
		navigator.platform.toUpperCase().indexOf("MAC") >= 0;

	return (
		<>
			{/* Live region for announcements */}
			<div
				ref={announcerRef}
				className="sr-only"
				aria-live="polite"
				aria-atomic="true"
			/>

			{/* Trigger button */}
			{showTrigger && (
				<button
					type="button"
					onClick={() => setOpen(true)}
					data-search-trigger
					className="group flex items-center justify-center h-9 w-9 sm:h-8 sm:w-auto sm:px-3 text-xs text-muted-foreground glass-subtle border border-white/[0.06] hover:border-primary/30 hover:bg-white/[0.04] transition-all duration-200 focus-ring rounded-lg"
					aria-label="Open search dialog"
					aria-keyshortcuts="Control+K"
				>
					<SearchIcon
						className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-primary/70 group-hover:text-primary transition-colors"
						aria-hidden="true"
					/>
					<span className="hidden sm:inline ml-2">search</span>
					<span className="hidden sm:flex items-center gap-1 ml-2">
						<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.06] border border-white/[0.08] rounded text-muted-foreground/70">{isMac ? "⌘" : "ctrl"}</kbd>
						<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.06] border border-white/[0.08] rounded text-muted-foreground/70">K</kbd>
					</span>
				</button>
			)}

			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				aria-label="Search artifacts"
			>
				<CommandInput
					placeholder="Search artifacts..."
					value={query}
					onValueChange={handleSearch}
					data-search-input
					aria-label="Search query"
					aria-describedby="search-instructions"
				/>

				{/* Hidden instructions for screen readers */}
				<div id="search-instructions" className="sr-only">
					Type to search artifacts. Use arrow keys to navigate results, Enter to
					select.
				</div>

				<CommandList
					className="max-h-[400px]"
					role="listbox"
					aria-label="Search results"
				>
					{loading && (
						<div
							className="py-8 text-center text-sm text-muted-foreground animate-pulse-subtle"
							role="status"
							aria-live="polite"
						>
							<span className="inline-flex items-center gap-2">
								<span
									className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
									aria-hidden="true"
								/>
								<span className="text-primary">$</span> searching
								<span className="loading-dots"></span>
							</span>
						</div>
					)}

					{!loading && query && results.length === 0 && (
						<CommandEmpty
							className="py-8 text-center text-sm text-muted-foreground"
							role="status"
						>
							<div className="flex flex-col items-center gap-2">
								<SearchIcon
									className="h-8 w-8 text-muted-foreground/30"
									aria-hidden="true"
								/>
								<span>
									<span className="text-primary">$</span> no results for "
									{query}"
								</span>
								<span className="text-xs text-muted-foreground/60">
									Try a different search term
								</span>
							</div>
						</CommandEmpty>
					)}

					{!query && (
						<CommandGroup
							heading={
								<span className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
									<Sparkles className="h-3 w-3 text-primary/60" aria-hidden="true" />
									<span>quick navigation</span>
								</span>
							}
						>
							<CommandItem
								onSelect={() => handleSelect("/")}
								className="text-sm group rounded-lg my-0.5"
							>
								<div className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-500/20 border border-zinc-500/20 mr-2 group-data-[selected=true]:bg-zinc-500/30 group-data-[selected=true]:border-zinc-400/30 transition-colors">
									<Home className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
								</div>
								<span>home</span>
								<span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">g</kbd>
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">h</kbd>
								</span>
							</CommandItem>
							<CommandItem
								onSelect={() => handleSelect("/artifacts")}
								className="text-sm group rounded-lg my-0.5"
							>
								<div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/20 border border-primary/20 mr-2 group-data-[selected=true]:bg-primary/30 group-data-[selected=true]:border-primary/40 transition-colors">
									<FileSearch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
								</div>
								<span>all artifacts</span>
								<span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">g</kbd>
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">a</kbd>
								</span>
							</CommandItem>
							<CommandItem
								onSelect={() => handleSelect("/collections")}
								className="text-sm group rounded-lg my-0.5"
							>
								<div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/20 border border-cyan-500/20 mr-2 group-data-[selected=true]:bg-cyan-500/30 group-data-[selected=true]:border-cyan-400/30 transition-colors">
									<Layers className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
								</div>
								<span>collections</span>
								<span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">g</kbd>
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">c</kbd>
								</span>
							</CommandItem>
							<CommandItem
								onSelect={() => handleSelect("/builder")}
								className="text-sm group rounded-lg my-0.5"
							>
								<div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/20 mr-2 group-data-[selected=true]:bg-amber-500/30 group-data-[selected=true]:border-amber-400/30 transition-colors">
									<Hammer className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
								</div>
								<span>builder</span>
								<span className="ml-auto flex items-center gap-1 text-muted-foreground/40">
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">g</kbd>
									<kbd className="px-1.5 py-0.5 text-[9px] bg-white/[0.04] border border-white/[0.06] rounded">b</kbd>
								</span>
							</CommandItem>
						</CommandGroup>
					)}

					{results.length > 0 && (
						<CommandGroup
							heading={
								<span className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
									<Blocks className="h-3 w-3 text-primary/60" aria-hidden="true" />
									<span>results</span>
									<span className="text-primary font-medium">({results.length})</span>
								</span>
							}
						>
							{results.map((result) => (
								<CommandItem
									key={result.id}
									onSelect={() => handleSelect(result.url)}
									className="text-sm group py-3 rounded-lg my-0.5"
								>
									<div className="flex flex-col gap-1.5 w-full">
										<div className="flex items-center gap-2">
											<div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20 group-data-[selected=true]:bg-primary/20 group-data-[selected=true]:border-primary/30 transition-colors">
												<FileSearch className="h-3.5 w-3.5 text-primary/70 group-data-[selected=true]:text-primary" aria-hidden="true" />
											</div>
											<span className="font-medium">
												{result.meta.title || getArtifactName(result.url)}
											</span>
										</div>
										{result.excerpt && (
											<p
												className="text-xs text-muted-foreground line-clamp-2 pl-9 [&_mark]:bg-primary/30 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
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
				<div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02] text-[10px] text-muted-foreground/50">
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1.5">
							<div className="flex items-center gap-0.5">
								<kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[9px]">↑</kbd>
								<kbd className="px-1 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[9px]">↓</kbd>
							</div>
							<span>navigate</span>
						</span>
						<span className="flex items-center gap-1.5">
							<kbd className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[9px]">↵</kbd>
							<span>select</span>
						</span>
						<span className="flex items-center gap-1.5">
							<kbd className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[9px]">esc</kbd>
							<span>close</span>
						</span>
					</div>
					<div className="flex items-center gap-1.5 text-muted-foreground/40">
						<SearchIcon className="h-3 w-3" aria-hidden="true" />
						<span>pagefind</span>
					</div>
				</div>
			</CommandDialog>
		</>
	);
}
