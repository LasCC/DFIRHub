import { useMemo, useState } from "react";
import {
	HiOutlineArrowsRightLeft,
	HiOutlineComputerDesktop,
	HiOutlineCube,
	HiOutlineDocumentText,
	HiOutlineGlobeAlt,
	HiOutlineRectangleStack,
	HiOutlineShieldCheck,
} from "react-icons/hi2";
import type { KapeTarget, KapeTargetEntry } from "../../lib/kapefiles";

type ExportFormat = "kape" | "powershell" | "batch";

const categoryIconMap: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	windows: HiOutlineComputerDesktop,
	browsers: HiOutlineGlobeAlt,
	apps: HiOutlineCube,
	antivirus: HiOutlineShieldCheck,
	logs: HiOutlineDocumentText,
	p2p: HiOutlineArrowsRightLeft,
	compound: HiOutlineRectangleStack,
};

const categoryColorMap: Record<
	string,
	{ text: string; border: string; bg: string }
> = {
	windows: {
		text: "text-blue-400",
		border: "border-blue-500/30",
		bg: "bg-blue-500/10",
	},
	browsers: {
		text: "text-amber-400",
		border: "border-amber-500/30",
		bg: "bg-amber-500/10",
	},
	apps: {
		text: "text-green-400",
		border: "border-green-500/30",
		bg: "bg-green-500/10",
	},
	antivirus: {
		text: "text-red-400",
		border: "border-red-500/30",
		bg: "bg-red-500/10",
	},
	logs: {
		text: "text-orange-400",
		border: "border-orange-500/30",
		bg: "bg-orange-500/10",
	},
	p2p: {
		text: "text-purple-400",
		border: "border-purple-500/30",
		bg: "bg-purple-500/10",
	},
	compound: {
		text: "text-cyan-400",
		border: "border-cyan-500/30",
		bg: "bg-cyan-500/10",
	},
};

interface ScriptOptions {
	format: ExportFormat;
	source: string;
	destination: string;
	useVss: boolean;
	useVhdx: boolean;
}

interface ScriptBuilderProps {
	allTargets: KapeTarget[];
	categories: string[];
}

// Helper to get paths from a target (client-side version)
function getTargetPaths(target: KapeTarget): KapeTargetEntry[] {
	return target.targets.filter((entry) => !entry.path.endsWith(".tkape"));
}

export function ScriptBuilder({ allTargets, categories }: ScriptBuilderProps) {
	const [selectedTargets, setSelectedTargets] = useState<Set<string>>(
		new Set(),
	);
	const [activeCategory, setActiveCategory] = useState<string>(
		categories[0] || "Windows",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [options, setOptions] = useState<ScriptOptions>({
		format: "kape",
		source: "C:",
		destination: "D:\\Evidence",
		useVss: false,
		useVhdx: false,
	});
	const [copied, setCopied] = useState(false);

	// Filter targets by category and search
	const filteredTargets = useMemo(() => {
		let targets = allTargets.filter((t) => t.category === activeCategory);
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			targets = targets.filter(
				(t) =>
					t.name.toLowerCase().includes(query) ||
					t.description.toLowerCase().includes(query),
			);
		}
		return targets.sort((a, b) => a.name.localeCompare(b.name));
	}, [allTargets, activeCategory, searchQuery]);

	// Get selected target objects
	const selectedTargetObjects = useMemo(() => {
		return allTargets.filter((t) => selectedTargets.has(t.slug));
	}, [allTargets, selectedTargets]);

	// Generate script based on selected targets and options
	const generatedScript = useMemo(() => {
		if (selectedTargets.size === 0) return "";

		const lines: string[] = [];
		const targetNames = selectedTargetObjects.map((t) => t.name);

		if (options.format === "kape") {
			// Generate KAPE command
			let cmd = `kape.exe --tsource ${options.source} --tdest ${options.destination} --target ${targetNames.join(",")}`;
			if (options.useVss) cmd += " --vss";
			if (options.useVhdx) cmd += " --vhdx evidence";
			return cmd;
		} else if (options.format === "powershell") {
			lines.push("# DFIRHub Collection Script");
			lines.push(`# Generated: ${new Date().toISOString()}`);
			lines.push(`# Targets: ${selectedTargets.size}`);
			lines.push("");
			lines.push('$ErrorActionPreference = "SilentlyContinue"');
			lines.push(`$destBase = "${options.destination}"`);
			lines.push("");
			lines.push("# Create destination directory");
			lines.push(
				"New-Item -ItemType Directory -Path $destBase -Force | Out-Null",
			);
			lines.push("");

			for (const target of selectedTargetObjects) {
				const paths = getTargetPaths(target);
				if (paths.length === 0) continue;

				lines.push(`# === ${target.name} ===`);
				for (const entry of paths) {
					const safeName = entry.name.replace(/[^a-zA-Z0-9]/g, "_");
					const destPath = `$destBase\\${target.name}\\${safeName}`;
					const sourcePath = entry.path.replace("C:", options.source);

					lines.push(`$dest = "${destPath}"`);
					lines.push(
						"New-Item -ItemType Directory -Path $dest -Force | Out-Null",
					);
					if (entry.fileMask) {
						lines.push(
							`Copy-Item -Path "${sourcePath}${entry.fileMask}" -Destination $dest -Recurse -Force 2>$null`,
						);
					} else {
						lines.push(
							`Copy-Item -Path "${sourcePath}*" -Destination $dest -Recurse -Force 2>$null`,
						);
					}
				}
				lines.push("");
			}

			lines.push('Write-Host "Collection complete!" -ForegroundColor Green');
		} else if (options.format === "batch") {
			lines.push("@echo off");
			lines.push("REM DFIRHub Collection Script");
			lines.push(`REM Generated: ${new Date().toISOString()}`);
			lines.push(`REM Targets: ${selectedTargets.size}`);
			lines.push("");
			lines.push(`set DEST=${options.destination}`);
			lines.push("");
			lines.push("REM Create destination directory");
			lines.push('if not exist "%DEST%" mkdir "%DEST%"');
			lines.push("");

			for (const target of selectedTargetObjects) {
				const paths = getTargetPaths(target);
				if (paths.length === 0) continue;

				lines.push(`REM === ${target.name} ===`);
				for (const entry of paths) {
					const safeName = entry.name.replace(/[^a-zA-Z0-9]/g, "_");
					const destPath = `%DEST%\\${target.name}\\${safeName}`;
					const sourcePath = entry.path.replace("C:", options.source);

					lines.push(`if not exist "${destPath}" mkdir "${destPath}"`);
					if (entry.fileMask) {
						lines.push(
							`xcopy "${sourcePath}${entry.fileMask}" "${destPath}\\" /E /H /Y /Q 2>nul`,
						);
					} else {
						lines.push(
							`xcopy "${sourcePath}*" "${destPath}\\" /E /H /Y /Q 2>nul`,
						);
					}
				}
				lines.push("");
			}

			lines.push("echo Collection complete!");
			lines.push("pause");
		}

		return lines.join("\n");
	}, [selectedTargets, selectedTargetObjects, options]);

	const toggleTarget = (slug: string) => {
		const newSelected = new Set(selectedTargets);
		if (newSelected.has(slug)) {
			newSelected.delete(slug);
		} else {
			newSelected.add(slug);
		}
		setSelectedTargets(newSelected);
	};

	const selectAll = () => {
		const newSelected = new Set(selectedTargets);
		filteredTargets.forEach((t) => newSelected.add(t.slug));
		setSelectedTargets(newSelected);
	};

	const clearAll = () => {
		setSelectedTargets(new Set());
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(generatedScript);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	const handleDownload = () => {
		const extensions: Record<ExportFormat, string> = {
			kape: ".txt",
			powershell: ".ps1",
			batch: ".bat",
		};

		const mimeTypes: Record<ExportFormat, string> = {
			kape: "text/plain",
			powershell: "application/x-powershell",
			batch: "application/x-bat",
		};

		const blob = new Blob([generatedScript], {
			type: mimeTypes[options.format],
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dfirhub_collection${extensions[options.format]}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-6">
			{/* Target Selection */}
			<section>
				<h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
					<span className="text-primary/50">//</span>
					select targets
					<span className="text-primary">
						({selectedTargets.size} selected)
					</span>
				</h2>

				{/* Category Tabs */}
				<div className="flex flex-wrap gap-2 mb-4">
					{categories.map((cat) => {
						const Icon = categoryIconMap[cat.toLowerCase()];
						const colors = categoryColorMap[cat.toLowerCase()] || {
							text: "text-muted-foreground",
							border: "border-border",
							bg: "bg-secondary/30",
						};
						const isActive = activeCategory === cat;

						return (
							<button
								key={cat}
								onClick={() => setActiveCategory(cat)}
								className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded-md transition-all ${
									isActive
										? `${colors.border} ${colors.bg} ${colors.text}`
										: "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-foreground/30"
								}`}
							>
								{Icon && (
									<Icon
										className={`h-3.5 w-3.5 ${isActive ? colors.text : "opacity-60"}`}
									/>
								)}
								<span>{cat.toLowerCase()}</span>
							</button>
						);
					})}
				</div>

				{/* Search */}
				<div className="flex items-center gap-4 mb-4">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search targets..."
						className="flex-1 h-8 px-3 text-xs bg-background border border-border rounded-md focus:border-primary/50 outline-none"
					/>
					<button
						onClick={selectAll}
						className="px-3 py-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
					>
						[select all]
					</button>
					<button
						onClick={clearAll}
						className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
					>
						[clear]
					</button>
				</div>

				{/* Target Grid */}
				<div className="border border-border bg-card/20 rounded-lg max-h-64 overflow-y-auto">
					{filteredTargets.length === 0 ? (
						<div className="p-4 text-center text-sm text-muted-foreground">
							No targets found
						</div>
					) : (
						<div className="divide-y divide-border/50">
							{filteredTargets.map((target) => (
								<label
									key={target.slug}
									className="flex items-center gap-3 px-4 py-2 hover:bg-primary/5 cursor-pointer transition-colors"
								>
									<input
										type="checkbox"
										checked={selectedTargets.has(target.slug)}
										onChange={() => toggleTarget(target.slug)}
										className="accent-primary w-3.5 h-3.5"
									/>
									<div className="flex-1 min-w-0">
										<span className="text-sm">{target.name}</span>
										{target.isCompound && (
											<span className="ml-2 px-1.5 py-0.5 text-[9px] uppercase text-cyan-400 border border-cyan-500/30 bg-cyan-500/10">
												collection
											</span>
										)}
									</div>
									<span className="text-[10px] text-muted-foreground shrink-0">
										{target.isCompound
											? `${target.referencedTargets.length} targets`
											: `${target.targets.filter((e) => !e.path.endsWith(".tkape")).length} paths`}
									</span>
								</label>
							))}
						</div>
					)}
				</div>
			</section>

			{/* Export Options */}
			<section>
				<h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
					<span className="text-primary/50">//</span>
					export options
				</h2>
				<div className="border border-border bg-card/20 rounded-lg p-4">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{/* Format */}
						<div>
							<label className="block text-xs text-muted-foreground mb-2">
								format:
							</label>
							<select
								value={options.format}
								onChange={(e) =>
									setOptions({
										...options,
										format: e.target.value as ExportFormat,
									})
								}
								className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md focus:border-primary/50 outline-none"
							>
								<option value="kape">KAPE Command</option>
								<option value="powershell">PowerShell (.ps1)</option>
								<option value="batch">Batch (.bat)</option>
							</select>
						</div>

						{/* Source */}
						<div>
							<label className="block text-xs text-muted-foreground mb-2">
								source:
							</label>
							<input
								type="text"
								value={options.source}
								onChange={(e) =>
									setOptions({ ...options, source: e.target.value })
								}
								className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md focus:border-primary/50 outline-none"
							/>
						</div>

						{/* Destination */}
						<div>
							<label className="block text-xs text-muted-foreground mb-2">
								destination:
							</label>
							<input
								type="text"
								value={options.destination}
								onChange={(e) =>
									setOptions({ ...options, destination: e.target.value })
								}
								className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md focus:border-primary/50 outline-none"
							/>
						</div>

						{/* KAPE Options */}
						{options.format === "kape" && (
							<div className="flex flex-col gap-2">
								<label className="block text-xs text-muted-foreground">
									options:
								</label>
								<div className="flex items-center gap-4">
									<label className="flex items-center gap-1.5 cursor-pointer">
										<input
											type="checkbox"
											checked={options.useVss}
											onChange={(e) =>
												setOptions({ ...options, useVss: e.target.checked })
											}
											className="accent-primary w-3 h-3"
										/>
										<span className="text-xs text-muted-foreground">--vss</span>
									</label>
									<label className="flex items-center gap-1.5 cursor-pointer">
										<input
											type="checkbox"
											checked={options.useVhdx}
											onChange={(e) =>
												setOptions({ ...options, useVhdx: e.target.checked })
											}
											className="accent-primary w-3 h-3"
										/>
										<span className="text-xs text-muted-foreground">
											--vhdx
										</span>
									</label>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Generated Script */}
			<section>
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
						<span className="text-primary/50">//</span>
						generated {options.format === "kape" ? "command" : "script"}
					</h2>
					{generatedScript && (
						<div className="flex gap-2">
							<button
								onClick={handleCopy}
								className="px-3 py-1.5 text-xs border border-border bg-secondary/30 rounded-md hover:border-primary/50 transition-colors"
							>
								{copied ? "copied!" : "copy"}
							</button>
							<button
								onClick={handleDownload}
								className="px-3 py-1.5 text-xs border border-primary/50 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
							>
								download
							</button>
						</div>
					)}
				</div>
				<div className="border border-border bg-black/50 rounded-lg">
					<pre className="p-4 text-xs text-green-400 overflow-x-auto max-h-[400px]">
						<code>
							{generatedScript ||
								"// Select targets to generate collection command"}
						</code>
					</pre>
				</div>
			</section>

			{/* Selected Targets Summary */}
			{selectedTargets.size > 0 && (
				<section className="text-xs text-muted-foreground/70">
					<span className="text-primary">$</span> selected:{" "}
					{selectedTargetObjects.map((t) => t.name).join(", ")}
				</section>
			)}
		</div>
	);
}
