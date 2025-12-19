import { useState } from "react";
import type { KapeTarget, KapeTargetEntry } from "../../lib/kapefiles";

interface PathBrowserProps {
	target: KapeTarget;
	resolvedTargets?: KapeTarget[];
}

export function PathBrowser({ target, resolvedTargets }: PathBrowserProps) {
	const [copiedPath, setCopiedPath] = useState<string | null>(null);
	const [expandedTargets, setExpandedTargets] = useState<Set<string>>(
		new Set(),
	);

	// Get all paths (either from this target or resolved compound targets)
	const pathEntries =
		target.isCompound && resolvedTargets
			? resolvedTargets.flatMap((t) =>
					t.targets
						.filter((e) => !e.path.endsWith(".tkape"))
						.map((e) => ({
							...e,
							sourceName: t.name,
						})),
				)
			: target.targets
					.filter((e) => !e.path.endsWith(".tkape"))
					.map((e) => ({
						...e,
						sourceName: target.name,
					}));

	const handleCopyPath = async (path: string, fileMask?: string) => {
		const fullPath = fileMask ? `${path}${fileMask}` : path;
		try {
			await navigator.clipboard.writeText(fullPath);
			setCopiedPath(fullPath);
			// Announce to screen readers
			const announcer = document.getElementById("live-announcer");
			if (announcer) {
				announcer.textContent = "Path copied to clipboard";
				setTimeout(() => {
					announcer.textContent = "";
				}, 1000);
			}
			setTimeout(() => setCopiedPath(null), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	const handleCopyAll = async () => {
		const allPaths = pathEntries
			.map((e) => (e.fileMask ? `${e.path}${e.fileMask}` : e.path))
			.join("\n");
		try {
			await navigator.clipboard.writeText(allPaths);
			setCopiedPath("all");
			const announcer = document.getElementById("live-announcer");
			if (announcer) {
				announcer.textContent = "All paths copied to clipboard";
				setTimeout(() => {
					announcer.textContent = "";
				}, 1000);
			}
			setTimeout(() => setCopiedPath(null), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	// Group paths by source target for compound display
	const groupedPaths =
		target.isCompound && resolvedTargets
			? resolvedTargets.map((t) => ({
					name: t.name,
					slug: t.slug,
					entries: t.targets.filter((e) => !e.path.endsWith(".tkape")),
				}))
			: [
					{
						name: target.name,
						slug: target.slug,
						entries: target.targets.filter((e) => !e.path.endsWith(".tkape")),
					},
				];

	const toggleExpanded = (name: string) => {
		const newExpanded = new Set(expandedTargets);
		if (newExpanded.has(name)) {
			newExpanded.delete(name);
		} else {
			newExpanded.add(name);
		}
		setExpandedTargets(newExpanded);
	};

	if (pathEntries.length === 0) {
		return (
			<div className="border border-border bg-card/20 rounded-lg p-6 text-center">
				<p className="text-sm text-muted-foreground">
					<span className="text-primary">$</span> no file paths defined for this
					target
				</p>
			</div>
		);
	}

	return (
		<div className="border border-border bg-card/20 rounded-lg">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
				<div className="text-xs text-muted-foreground">
					<span className="text-primary">{pathEntries.length}</span> path
					{pathEntries.length !== 1 ? "s" : ""}
					{target.isCompound && resolvedTargets && (
						<span className="ml-2">
							from{" "}
							<span className="text-primary">{resolvedTargets.length}</span>{" "}
							targets
						</span>
					)}
				</div>
				<button
					onClick={handleCopyAll}
					className="text-xs text-primary hover:text-primary/80 transition-colors focus-ring rounded-sm px-2 py-1"
					aria-label="Copy all paths to clipboard"
				>
					{copiedPath === "all" ? "[copied!]" : "[copy all]"}
				</button>
			</div>

			{/* Paths List */}
			{target.isCompound && resolvedTargets ? (
				// Grouped view for compound targets
				<div className="divide-y divide-border">
					{groupedPaths.map((group) => (
						<div key={group.name}>
							<button
								onClick={() => toggleExpanded(group.name)}
								className="w-full flex items-center justify-between px-4 py-2 bg-secondary/10 hover:bg-secondary/20 transition-colors text-left focus-ring"
								aria-expanded={expandedTargets.has(group.name)}
							>
								<span className="text-xs font-medium">
									<span className="text-primary mr-2">▸</span>
									{group.name}
									<span className="text-muted-foreground ml-2">
										({group.entries.length} path
										{group.entries.length !== 1 ? "s" : ""})
									</span>
								</span>
								<a
									href={`/artefact/${group.slug}`}
									onClick={(e) => e.stopPropagation()}
									className="text-[10px] text-primary hover:text-primary/80 transition-colors"
								>
									[view]
								</a>
							</button>
							{expandedTargets.has(group.name) && (
								<div className="bg-black/20">
									{group.entries.map((entry, i) => (
										<PathEntry
											key={`${group.name}-${i}`}
											entry={entry}
											copiedPath={copiedPath}
											onCopy={handleCopyPath}
										/>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			) : (
				// Flat list for individual targets
				<div className="divide-y divide-border/50">
					{pathEntries.map((entry, i) => (
						<PathEntry
							key={i}
							entry={entry}
							copiedPath={copiedPath}
							onCopy={handleCopyPath}
						/>
					))}
				</div>
			)}

			{/* Legend */}
			<div className="px-4 py-2 border-t border-border bg-secondary/10 text-[10px] text-muted-foreground">
				<span className="text-primary">//</span> paths use Windows environment
				syntax
			</div>
		</div>
	);
}

interface PathEntryProps {
	entry: KapeTargetEntry;
	copiedPath: string | null;
	onCopy: (path: string, fileMask?: string) => void;
}

function PathEntry({ entry, copiedPath, onCopy }: PathEntryProps) {
	const fullPath = entry.fileMask
		? `${entry.path}${entry.fileMask}`
		: entry.path;
	const isCopied = copiedPath === fullPath;

	return (
		<div className="group flex items-start justify-between px-4 py-3 hover:bg-primary/5 transition-colors">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/50 px-1.5 py-0.5">
						{entry.category || "file"}
					</span>
					{entry.name && (
						<span className="text-xs text-muted-foreground">{entry.name}</span>
					)}
				</div>
				<code className="text-xs text-primary break-all select-all block">
					{entry.path}
					{entry.fileMask && (
						<span className="text-amber-400">{entry.fileMask}</span>
					)}
				</code>
				{entry.comment && (
					<p className="text-[10px] text-muted-foreground/70 mt-1">
						{entry.comment}
					</p>
				)}
			</div>
			<button
				onClick={() => onCopy(entry.path, entry.fileMask)}
				className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs text-muted-foreground hover:text-foreground transition-all ml-4 shrink-0 focus-ring rounded-sm px-2 py-1"
				aria-label={`Copy path: ${fullPath}`}
			>
				{isCopied ? "copied!" : "copy"}
			</button>
		</div>
	);
}
