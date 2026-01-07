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
import { CodeBlock } from "../ui/CodeBlock";

type ExportFormat = "kape" | "powershell" | "batch" | "wsl";

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
		border: "border-blue-500/40",
		bg: "bg-blue-500/10",
	},
	browsers: {
		text: "text-orange-400",
		border: "border-orange-500/40",
		bg: "bg-orange-500/10",
	},
	apps: {
		text: "text-emerald-400",
		border: "border-emerald-500/40",
		bg: "bg-emerald-500/10",
	},
	antivirus: {
		text: "text-red-400",
		border: "border-red-500/40",
		bg: "bg-red-500/10",
	},
	logs: {
		text: "text-yellow-400",
		border: "border-yellow-500/40",
		bg: "bg-yellow-500/10",
	},
	p2p: {
		text: "text-purple-400",
		border: "border-purple-500/40",
		bg: "bg-purple-500/10",
	},
	compound: {
		text: "text-cyan-400",
		border: "border-cyan-500/40",
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
			// PowerShell with function-based approach
			lines.push("# DFIRHub Collection Script");
			lines.push(`# Generated: ${new Date().toISOString()}`);
			lines.push(`# Targets: ${selectedTargets.size}`);
			lines.push("# Run as Administrator");
			lines.push("");
			lines.push("#Requires -RunAsAdministrator");
			lines.push("");
			lines.push('$ErrorActionPreference = "SilentlyContinue"');
			lines.push(`$DestBase = "${options.destination}"`);
			lines.push("");
			lines.push("# Function to handle directory creation and copying");
			lines.push("function Collect-Artifact {");
			lines.push("    param (");
			lines.push("        [string]$SourcePath,");
			lines.push("        [string]$FolderName");
			lines.push("    )");
			lines.push('    $FullDest = Join-Path -Path $DestBase -ChildPath $FolderName');
			lines.push('    if (-not (Test-Path -Path $FullDest)) {');
			lines.push('        New-Item -ItemType Directory -Path $FullDest -Force | Out-Null');
			lines.push("    }");
			lines.push('    Copy-Item -Path $SourcePath -Destination $FullDest -Recurse -Force');
			lines.push("}");
			lines.push("");

			let entryNum = 1;
			for (const target of selectedTargetObjects) {
				const paths = getTargetPaths(target);
				if (paths.length === 0) continue;

				lines.push(`# === ${target.name} ===`);
				for (const entry of paths) {
					const safeName = `${target.name}_${entry.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
					let sourcePath = entry.path.replace("C:", options.source);
					const hasUserVar = sourcePath.includes("%user%");

					// Convert %user% to PowerShell variable
					if (hasUserVar) {
						sourcePath = sourcePath.replace(/%user%/gi, "$env:USERNAME");
					}

					lines.push(`# ${entryNum}. ${entry.name}`);

					// Check for legacy XP paths
					if (sourcePath.includes("Documents And Settings")) {
						lines.push('if (Test-Path "C:\\Documents And Settings") {');
						if (entry.fileMask) {
							lines.push(`    Collect-Artifact -SourcePath "${sourcePath}\\${entry.fileMask}" -FolderName "${safeName}"`);
						} else {
							lines.push(`    Collect-Artifact -SourcePath "${sourcePath}\\*" -FolderName "${safeName}"`);
						}
						lines.push("}");
					} else if (hasUserVar) {
						// Use Join-Path for user variable paths
						const pathParts = sourcePath.split("$env:USERNAME");
						lines.push(`$UserPath = Join-Path $env:USERPROFILE "${pathParts[1]?.replace(/^[\\/]+/, "") || ""}"`);
						if (entry.fileMask) {
							lines.push(`Collect-Artifact -SourcePath "$UserPath\\${entry.fileMask}" -FolderName "${safeName}"`);
						} else {
							lines.push(`Collect-Artifact -SourcePath "$UserPath\\*" -FolderName "${safeName}"`);
						}
					} else {
						if (entry.fileMask) {
							lines.push(`Collect-Artifact -SourcePath "${sourcePath}\\${entry.fileMask}" -FolderName "${safeName}"`);
						} else {
							lines.push(`Collect-Artifact -SourcePath "${sourcePath}\\*" -FolderName "${safeName}"`);
						}
					}
					entryNum++;
				}
				lines.push("");
			}

			lines.push('Write-Host "Collection complete!" -ForegroundColor Green');
		} else if (options.format === "batch") {
			// Batch with proper variable handling
			lines.push("@echo off");
			lines.push("setlocal EnableDelayedExpansion");
			lines.push("");
			lines.push("REM DFIRHub Collection Script");
			lines.push(`REM Generated: ${new Date().toISOString()}`);
			lines.push(`REM Targets: ${selectedTargets.size}`);
			lines.push("REM Run as Administrator");
			lines.push("");
			lines.push(`set "DEST=${options.destination}"`);
			lines.push("");
			lines.push("REM Create destination directory");
			lines.push('if not exist "%DEST%" mkdir "%DEST%"');
			lines.push("");

			for (const target of selectedTargetObjects) {
				const paths = getTargetPaths(target);
				if (paths.length === 0) continue;

				lines.push(`REM === ${target.name} ===`);
				for (const entry of paths) {
					const safeName = `${target.name}_${entry.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
					let sourcePath = entry.path.replace("C:", options.source);
					const hasUserVar = sourcePath.includes("%user%");

					// Convert %user% to %USERNAME%
					if (hasUserVar) {
						sourcePath = sourcePath.replace(/%user%/gi, "%USERNAME%");
					}

					lines.push(`REM ${entry.name}`);
					lines.push(`set "DESTFOLDER=%DEST%\\${safeName}"`);
					lines.push('if not exist "%DESTFOLDER%" mkdir "%DESTFOLDER%"');

					// Handle legacy XP paths with existence check
					if (sourcePath.includes("Documents And Settings")) {
						lines.push('if exist "C:\\Documents And Settings" (');
						if (entry.fileMask) {
							lines.push(`    xcopy "${sourcePath}\\${entry.fileMask}" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`);
						} else {
							lines.push(`    xcopy "${sourcePath}\\*" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`);
						}
						lines.push(")");
					} else {
						if (entry.fileMask) {
							lines.push(`xcopy "${sourcePath}\\${entry.fileMask}" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`);
						} else {
							lines.push(`xcopy "${sourcePath}\\*" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`);
						}
					}
				}
				lines.push("");
			}

			lines.push("echo Collection complete!");
			lines.push("endlocal");
			lines.push("pause");
		} else if (options.format === "wsl") {
			// WSL (Bash) script with proper variable handling
			const toWslPath = (windowsPath: string): string => {
				const match = windowsPath.match(/^([A-Za-z]):(.*)/);
				if (match) {
					const drive = match[1].toLowerCase();
					const rest = match[2].replace(/\\/g, "/");
					return `/mnt/${drive}${rest}`;
				}
				return windowsPath.replace(/\\/g, "/");
			};

			const wslDest = toWslPath(options.destination);
			const wslSource = toWslPath(options.source);

			// Check if any path contains %user% variable
			const allPaths = selectedTargetObjects.flatMap((t) => getTargetPaths(t));
			const hasUserPaths = allPaths.some((entry) =>
				entry.path.toLowerCase().includes("%user%"),
			);

			lines.push("#!/bin/bash");
			lines.push("# DFIRHub Collection Script");
			lines.push(`# Generated: ${new Date().toISOString()}`);
			lines.push(`# Targets: ${selectedTargets.size}`);
			lines.push("# Run from WSL with sudo for best results");
			lines.push("");
			lines.push(`DEST="${wslDest}"`);
			lines.push("");
			lines.push("# Create destination directory");
			lines.push('mkdir -p "$DEST"');
			lines.push("");

			// Add Windows username detection if needed
			if (hasUserPaths) {
				lines.push("# Detect Windows username");
				lines.push('WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d \'\\r\')');
				lines.push("");
				lines.push('if [ -z "$WIN_USER" ]; then');
				lines.push('    echo "Could not detect Windows username. Please set WIN_USER manually."');
				lines.push("    exit 1");
				lines.push("fi");
				lines.push("");
			}

			for (const target of selectedTargetObjects) {
				const paths = getTargetPaths(target);
				if (paths.length === 0) continue;

				lines.push(`# === ${target.name} ===`);
				for (const entry of paths) {
					const safeName = `${target.name}_${entry.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
					const destPath = `$DEST/${safeName}`;

					// Convert the source path
					let sourcePath = entry.path;
					if (sourcePath.match(/^[A-Za-z]:/)) {
						sourcePath = sourcePath.replace(/^[A-Za-z]:/, wslSource);
					}
					sourcePath = sourcePath.replace(/\\/g, "/");

					// Replace %user% with $WIN_USER for Bash
					if (sourcePath.toLowerCase().includes("%user%")) {
						sourcePath = sourcePath.replace(/%user%/gi, "$WIN_USER");
					}

					// Clean up any double slashes
					sourcePath = sourcePath.replace(/([^:])\/\//g, "$1/");

					lines.push(`# ${entry.name}`);
					lines.push(`mkdir -p "${destPath}"`);
					lines.push(`if [ -d "${sourcePath}" ]; then`);

					if (entry.fileMask && entry.fileMask.includes("*")) {
						lines.push(
							`    find "${sourcePath}" -maxdepth 1 -name "${entry.fileMask}" -exec cp {} "${destPath}/" \\; 2>/dev/null`,
						);
					} else if (entry.fileMask) {
						lines.push(
							`    cp -r "${sourcePath}/${entry.fileMask}" "${destPath}/" 2>/dev/null`,
						);
					} else {
						lines.push(`    cp -r "${sourcePath}/"* "${destPath}/" 2>/dev/null`);
					}

					lines.push("else");
					lines.push(`    echo "Source not found: ${sourcePath}"`);
					lines.push("fi");
				}
				lines.push("");
			}

			lines.push('echo -e "\\033[32mCollection complete!\\033[0m"');
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
			wsl: ".sh",
		};

		const mimeTypes: Record<ExportFormat, string> = {
			kape: "text/plain",
			powershell: "application/x-powershell",
			batch: "application/x-bat",
			wsl: "application/x-sh",
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
							border: "border-white/[0.08]",
							bg: "bg-white/[0.04]",
						};
						const isActive = activeCategory === cat;

						return (
							<button
								key={cat}
								onClick={() => setActiveCategory(cat)}
								className={`inline-flex items-center gap-2 px-4 py-2 text-xs rounded-full transition-all backdrop-blur-sm ${
									isActive
										? `border ${colors.border} ${colors.bg} ${colors.text}`
										: "border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:border-white/10 hover:bg-white/[0.04]"
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
						className="flex-1 h-9 px-3 text-xs bg-white/[0.02] border border-white/[0.06] rounded-lg focus:border-primary/50 outline-none backdrop-blur-sm"
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
				<div className="glass-subtle rounded-xl max-h-64 overflow-y-auto">
					{filteredTargets.length === 0 ? (
						<div className="p-4 text-center text-sm text-muted-foreground">
							No targets found
						</div>
					) : (
						<div className="divide-y divide-white/[0.04]">
							{filteredTargets.map((target) => (
								<label
									key={target.slug}
									className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.04] cursor-pointer transition-colors"
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
				<div className="glass-subtle rounded-xl p-4">
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
								className="w-full h-9 px-3 text-xs bg-white/[0.02] border border-white/[0.06] rounded-lg focus:border-primary/50 outline-none backdrop-blur-sm"
							>
								<option value="kape">KAPE Command</option>
								<option value="powershell">PowerShell (.ps1)</option>
								<option value="batch">Batch (.bat)</option>
								<option value="wsl">WSL/Bash (.sh)</option>
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
								className="w-full h-9 px-3 text-xs bg-white/[0.02] border border-white/[0.06] rounded-lg focus:border-primary/50 outline-none backdrop-blur-sm"
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
								className="w-full h-9 px-3 text-xs bg-white/[0.02] border border-white/[0.06] rounded-lg focus:border-primary/50 outline-none backdrop-blur-sm"
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
				<div className="glass-subtle rounded-xl overflow-hidden">
					{generatedScript ? (
						<CodeBlock
							code={generatedScript}
							language={
								options.format === "kape"
									? "shell"
									: options.format === "wsl"
										? "bash"
										: options.format === "powershell"
											? "powershell"
											: "batch"
							}
						/>
					) : (
						<pre className="p-4 text-xs text-muted-foreground overflow-x-auto bg-black/30">
							<code>// Select targets to generate collection command</code>
						</pre>
					)}
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
