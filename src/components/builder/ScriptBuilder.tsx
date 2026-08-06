import {
  ArrowLeftRight,
  Box,
  FileText,
  Globe,
  Layers,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { CategoryStyle } from "@/lib/categoryStyles";

import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { trackBuilderCopy, trackBuilderDownload } from "@/lib/analytics";
import { getCategoryStyle } from "@/lib/categoryStyles";

import type { KapeTarget, KapeTargetEntry } from "../../lib/kapefiles";

import { CodeBlock } from "../ui/CodeBlock";

type ExportFormat = "kape" | "powershell" | "batch" | "wsl";

// Top-level regex patterns for performance
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const LEADING_SLASHES_REGEX = /^[\\/]+/;
const DRIVE_LETTER_REGEX = /^([A-Za-z]):(.*)/;
const STARTS_WITH_DRIVE_REGEX = /^[A-Za-z]:/;

const categoryIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  antivirus: ShieldCheck,
  apps: Box,
  browsers: Globe,
  compound: Layers,
  logs: FileText,
  p2p: ArrowLeftRight,
  windows: Monitor,
};

// categoryStyles keys are capitalized ("Windows", "P2P"); normalize lookup.
const SPECIAL_KEYS: Record<string, string> = { p2p: "P2P" };

function resolveCategoryStyle(category: string): CategoryStyle {
  const lower = category.toLowerCase();
  const key =
    SPECIAL_KEYS[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1);
  return getCategoryStyle(key);
}

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
    new Set()
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0] || "Windows"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<ScriptOptions>({
    destination: "D:\\Evidence",
    format: "kape",
    source: "C:",
    useVhdx: false,
    useVss: false,
  });
  const [copied, triggerCopied] = useCopyFeedback();

  // Filter targets by category and search
  const filteredTargets = useMemo(() => {
    let targets = allTargets.filter((t) => t.category === activeCategory);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      targets = targets.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }
    return targets.toSorted((a, b) => a.name.localeCompare(b.name));
  }, [allTargets, activeCategory, searchQuery]);

  // Get selected target objects
  const selectedTargetObjects = useMemo(
    () => allTargets.filter((t) => selectedTargets.has(t.slug)),
    [allTargets, selectedTargets]
  );

  // Generate script based on selected targets and options
  const generatedScript = useMemo(() => {
    if (selectedTargets.size === 0) {
      return "";
    }

    const lines: string[] = [];
    const targetNames = selectedTargetObjects.map((t) => t.name);

    if (options.format === "kape") {
      // Generate KAPE command
      let cmd = `kape.exe --tsource ${options.source} --tdest ${options.destination} --target ${targetNames.join(",")}`;
      if (options.useVss) {
        cmd += " --vss";
      }
      if (options.useVhdx) {
        cmd += " --vhdx evidence";
      }
      return cmd;
    }
    if (options.format === "powershell") {
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
      lines.push("# Function to handle artifact collection with robocopy");
      lines.push("function Collect-Artifact {");
      lines.push("    param (");
      lines.push("        [string]$SourceDir,");
      lines.push("        [string]$FolderName,");
      lines.push('        [string]$FileMask = "*"');
      lines.push("    )");
      lines.push(
        "    $FullDest = Join-Path -Path $DestBase -ChildPath $FolderName"
      );
      lines.push(
        '    robocopy "$SourceDir" "$FullDest" "$FileMask" /E /COPY:DAT /R:0 /W:0 /NP /NFL /NDL /NJH /NJS | Out-Null'
      );
      lines.push("}");
      lines.push("");

      let entryNum = 1;
      for (const target of selectedTargetObjects) {
        const paths = getTargetPaths(target);
        if (paths.length === 0) {
          continue;
        }

        lines.push(`# === ${target.name} ===`);
        for (const entry of paths) {
          const safeName = `${target.name}_${entry.name.replace(NON_ALPHANUMERIC_REGEX, "_")}`;
          let sourcePath = entry.path.replace("C:", options.source);
          const hasUserVar = sourcePath.includes("%user%");

          // Convert %user% to PowerShell variable
          if (hasUserVar) {
            sourcePath = sourcePath.replaceAll("%user%", "$env:USERNAME");
          }

          lines.push(`# ${entryNum}. ${entry.name}`);

          // Check for legacy XP paths
          if (sourcePath.includes("Documents And Settings")) {
            lines.push('if (Test-Path "C:\\Documents And Settings") {');
            if (entry.fileMask) {
              lines.push(
                `    Collect-Artifact -SourceDir "${sourcePath}" -FileMask "${entry.fileMask}" -FolderName "${safeName}"`
              );
            } else {
              lines.push(
                `    Collect-Artifact -SourceDir "${sourcePath}" -FolderName "${safeName}"`
              );
            }
            lines.push("}");
          } else if (hasUserVar) {
            // Use Join-Path for user variable paths
            const pathParts = sourcePath.split("$env:USERNAME");
            lines.push(
              `$UserPath = Join-Path $env:USERPROFILE "${pathParts[1]?.replace(LEADING_SLASHES_REGEX, "") || ""}"`
            );
            if (entry.fileMask) {
              lines.push(
                `Collect-Artifact -SourceDir "$UserPath" -FileMask "${entry.fileMask}" -FolderName "${safeName}"`
              );
            } else {
              lines.push(
                `Collect-Artifact -SourceDir "$UserPath" -FolderName "${safeName}"`
              );
            }
          } else if (entry.fileMask) {
            lines.push(
              `Collect-Artifact -SourceDir "${sourcePath}" -FileMask "${entry.fileMask}" -FolderName "${safeName}"`
            );
          } else {
            lines.push(
              `Collect-Artifact -SourceDir "${sourcePath}" -FolderName "${safeName}"`
            );
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
        if (paths.length === 0) {
          continue;
        }

        lines.push(`REM === ${target.name} ===`);
        for (const entry of paths) {
          const safeName = `${target.name}_${entry.name.replace(NON_ALPHANUMERIC_REGEX, "_")}`;
          let sourcePath = entry.path.replace("C:", options.source);
          const hasUserVar = sourcePath.includes("%user%");

          // Convert %user% to %USERNAME%
          if (hasUserVar) {
            sourcePath = sourcePath.replaceAll("%user%", "%USERNAME%");
          }

          lines.push(`REM ${entry.name}`);
          lines.push(`set "DESTFOLDER=%DEST%\\${safeName}"`);

          const robocopyFlags =
            "/E /COPY:DAT /R:0 /W:0 /NP /NFL /NDL /NJH /NJS";

          // Handle legacy XP paths with existence check
          if (sourcePath.includes("Documents And Settings")) {
            lines.push('if exist "C:\\Documents And Settings" (');
            if (entry.fileMask) {
              lines.push(
                `    robocopy "${sourcePath}" "%DESTFOLDER%" "${entry.fileMask}" ${robocopyFlags} >nul 2>&1`
              );
            } else {
              lines.push(
                `    robocopy "${sourcePath}" "%DESTFOLDER%" ${robocopyFlags} >nul 2>&1`
              );
            }
            lines.push(")");
          } else if (entry.fileMask) {
            lines.push(
              `robocopy "${sourcePath}" "%DESTFOLDER%" "${entry.fileMask}" ${robocopyFlags} >nul 2>&1`
            );
          } else {
            lines.push(
              `robocopy "${sourcePath}" "%DESTFOLDER%" ${robocopyFlags} >nul 2>&1`
            );
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
        const match = windowsPath.match(DRIVE_LETTER_REGEX);
        if (match) {
          const drive = match[1].toLowerCase();
          const rest = match[2].replaceAll("\\", "/");
          return `/mnt/${drive}${rest}`;
        }
        return windowsPath.replaceAll("\\", "/");
      };

      const wslDest = toWslPath(options.destination);
      const wslSource = toWslPath(options.source);

      // Check if any path contains %user% variable
      const allPaths = selectedTargetObjects.flatMap((t) => getTargetPaths(t));
      const hasUserPaths = allPaths.some((entry) =>
        entry.path.toLowerCase().includes("%user%")
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
        lines.push(
          "WIN_USER=$(cmd.exe /c \"echo %USERNAME%\" 2>/dev/null | tr -d '\\r')"
        );
        lines.push("");
        lines.push('if [ -z "$WIN_USER" ]; then');
        lines.push(
          '    echo "Could not detect Windows username. Please set WIN_USER manually."'
        );
        lines.push("    exit 1");
        lines.push("fi");
        lines.push("");
      }

      for (const target of selectedTargetObjects) {
        const paths = getTargetPaths(target);
        if (paths.length === 0) {
          continue;
        }

        lines.push(`# === ${target.name} ===`);
        for (const entry of paths) {
          const safeName = `${target.name}_${entry.name.replace(NON_ALPHANUMERIC_REGEX, "_")}`;
          const destPath = `$DEST/${safeName}`;

          // Convert the source path
          let sourcePath = entry.path;
          if (STARTS_WITH_DRIVE_REGEX.test(sourcePath)) {
            sourcePath = sourcePath.replace(STARTS_WITH_DRIVE_REGEX, wslSource);
          }
          sourcePath = sourcePath.replaceAll("\\", "/");

          // Replace %user% with $WIN_USER for Bash
          if (sourcePath.toLowerCase().includes("%user%")) {
            sourcePath = sourcePath.replaceAll("%user%", "$WIN_USER");
          }

          // Clean up any double slashes
          sourcePath = sourcePath.replaceAll(/([^:])\/\//g, "$1/");
          // Strip trailing slash for clean path joining
          sourcePath = sourcePath.replace(/\/+$/, "");

          lines.push(`# ${entry.name}`);
          lines.push(`mkdir -p "${destPath}"`);
          lines.push(`if [ -d "${sourcePath}" ]; then`);

          if (entry.fileMask && entry.fileMask.includes("*")) {
            lines.push(
              `    find "${sourcePath}" -maxdepth 1 -name "${entry.fileMask}" -exec cp {} "${destPath}/" \\; 2>/dev/null`
            );
          } else if (entry.fileMask) {
            lines.push(
              `    cp -r "${sourcePath}/${entry.fileMask}" "${destPath}/" 2>/dev/null`
            );
          } else {
            lines.push(
              `    cp -r "${sourcePath}/"* "${destPath}/" 2>/dev/null`
            );
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
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      for (const t of filteredTargets) {
        next.add(t.slug);
      }
      return next;
    });
  };

  const clearAll = () => {
    setSelectedTargets(new Set());
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedScript);
      trackBuilderCopy(options.format, selectedTargets.size);
      triggerCopied();
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownload = () => {
    const extensions: Record<ExportFormat, string> = {
      batch: ".bat",
      kape: ".txt",
      powershell: ".ps1",
      wsl: ".sh",
    };

    const mimeTypes: Record<ExportFormat, string> = {
      batch: "application/x-bat",
      kape: "text/plain",
      powershell: "application/x-powershell",
      wsl: "application/x-sh",
    };

    const blob = new Blob([generatedScript], {
      type: mimeTypes[options.format],
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dfirhub_collection${extensions[options.format]}`;
    document.body.append(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    trackBuilderDownload(options.format, selectedTargets.size);
  };

  return (
    <div className="space-y-6">
      {/* Target Selection */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          Select targets
          <span className="text-primary">
            ({selectedTargets.size} selected)
          </span>
        </h2>

        {/* Category Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = categoryIconMap[cat.toLowerCase()];
            const style = resolveCategoryStyle(cat);
            const isActive = activeCategory === cat;

            return (
              <button
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs transition-colors ${
                  isActive
                    ? `border border-current/40 ${style.bg} ${style.text}`
                    : "border border-overlay/[0.06] bg-overlay/[0.02] text-muted-foreground hover:border-overlay/10 hover:bg-overlay/[0.04] hover:text-foreground"
                }`}
                key={cat}
                onClick={() => setActiveCategory(cat)}
                type="button"
              >
                {Icon && (
                  <Icon
                    className={`h-3.5 w-3.5 ${isActive ? "" : "opacity-60"}`}
                  />
                )}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-4">
          <input
            aria-label="Search targets"
            className="h-9 flex-1 rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] px-3 text-sm outline-none focus:border-primary/50"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search targets..."
            type="text"
            value={searchQuery}
          />
          <button
            className="px-3 py-1.5 text-primary text-xs transition-colors hover:text-primary/80"
            onClick={selectAll}
            type="button"
          >
            Select all
          </button>
          <button
            className="px-3 py-1.5 text-destructive text-xs transition-colors hover:text-destructive/80"
            onClick={clearAll}
            type="button"
          >
            Clear
          </button>
        </div>

        {/* Target Grid */}
        <div className="glass-subtle max-h-64 overflow-y-auto rounded-xl">
          {filteredTargets.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No targets found
            </div>
          ) : (
            <div className="divide-y divide-overlay/[0.04]">
              {filteredTargets.map((target) => (
                <label
                  className="flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-overlay/[0.04]"
                  key={target.slug}
                >
                  <input
                    checked={selectedTargets.has(target.slug)}
                    className="h-3.5 w-3.5 accent-primary"
                    onChange={() => toggleTarget(target.slug)}
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm">{target.name}</span>
                    {target.isCompound && (
                      <span className="ml-2 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-700 text-xs uppercase dark:text-cyan-400">
                        Collection
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-muted-foreground text-xs">
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
        <h2 className="mb-3 flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          Export options
        </h2>
        <div className="glass-subtle rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Format */}
            <div>
              <label
                className="mb-2 block text-muted-foreground text-xs"
                htmlFor="script-format"
              >
                Format
              </label>
              <select
                className="h-9 w-full rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] px-3 text-sm outline-none focus:border-primary/50"
                id="script-format"
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    format: e.target.value as ExportFormat,
                  }))
                }
                value={options.format}
              >
                <option value="kape">KAPE Command</option>
                <option value="powershell">PowerShell (.ps1)</option>
                <option value="batch">Batch (.bat)</option>
                <option value="wsl">WSL/Bash (.sh)</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label
                className="mb-2 block text-muted-foreground text-xs"
                htmlFor="script-source"
              >
                Source
              </label>
              <input
                className="h-9 w-full rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] px-3 text-sm outline-none focus:border-primary/50"
                id="script-source"
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, source: e.target.value }))
                }
                type="text"
                value={options.source}
              />
            </div>

            {/* Destination */}
            <div>
              <label
                className="mb-2 block text-muted-foreground text-xs"
                htmlFor="script-destination"
              >
                Destination
              </label>
              <input
                className="h-9 w-full rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] px-3 text-sm outline-none focus:border-primary/50"
                id="script-destination"
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    destination: e.target.value,
                  }))
                }
                type="text"
                value={options.destination}
              />
            </div>

            {/* KAPE Options */}
            {options.format === "kape" && (
              <div className="flex flex-col gap-2">
                <span className="block text-muted-foreground text-xs">
                  Options
                </span>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      checked={options.useVss}
                      className="h-3 w-3 accent-primary"
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          useVss: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="text-muted-foreground text-xs">--vss</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      checked={options.useVhdx}
                      className="h-3 w-3 accent-primary"
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          useVhdx: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="text-muted-foreground text-xs">
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
            Generated {options.format === "kape" ? "command" : "script"}
          </h2>
          {generatedScript && (
            <div className="flex gap-2">
              <button
                className="rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs transition-colors hover:border-primary/50"
                onClick={handleCopy}
                type="button"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-primary text-xs transition-colors hover:bg-primary/20"
                onClick={handleDownload}
                type="button"
              >
                Download
              </button>
            </div>
          )}
        </div>
        <div className="glass-subtle overflow-hidden rounded-xl">
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
            <div className="bg-sunken p-4 text-muted-foreground text-sm">
              Select targets to generate a collection command
            </div>
          )}
        </div>
      </section>

      {/* Selected Targets Summary */}
      {selectedTargets.size > 0 && (
        <section className="text-muted-foreground text-xs">
          <span className="font-medium text-foreground">Selected:</span>{" "}
          {selectedTargetObjects.map((t) => t.name).join(", ")}
        </section>
      )}
    </div>
  );
}
