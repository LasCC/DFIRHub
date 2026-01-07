import { useCallback, useMemo, useState } from "react";
import type { KapeTarget } from "../../lib/kapefiles";
import { CodeBlock } from "../ui/CodeBlock";

type CommandFormat = "kape" | "powershell" | "batch" | "wsl";

// Top-level regex patterns for performance
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const DRIVE_LETTER_REGEX = /^([A-Za-z]):(.*)/;
const STARTS_WITH_DRIVE_REGEX = /^[A-Za-z]:/;
const LEADING_SLASHES_REGEX = /^[\\/]+/;

interface CommandGeneratorProps {
  target: KapeTarget;
}

export function CommandGenerator({ target }: CommandGeneratorProps) {
  const [format, setFormat] = useState<CommandFormat>("powershell");
  const [source, setSource] = useState("C:");
  const [destination, setDestination] = useState("D:\\Evidence");
  const [useVss, setUseVss] = useState(false);
  const [useVhdx, setUseVhdx] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get all paths from the target (for PowerShell/batch generation)
  const targetPaths = useMemo(() => {
    if (target.isCompound) {
      // For compound targets, we just use the target name
      return [];
    }
    return target.targets
      .filter((entry) => !entry.path.endsWith(".tkape"))
      .map((entry) => ({
        name: entry.name,
        path: entry.path,
        fileMask: entry.fileMask,
      }));
  }, [target]);

  // Generate KAPE command
  const kapeCommand = useMemo(() => {
    let cmd = `kape.exe --tsource ${source} --tdest ${destination} --target ${target.name}`;
    if (useVss) {
      cmd += " --vss";
    }
    if (useVhdx) {
      cmd += " --vhdx evidence";
    }
    return cmd;
  }, [source, destination, target.name, useVss, useVhdx]);

  // Generate PowerShell script
  const powershellScript = useMemo(() => {
    if (target.isCompound) {
      return `# PowerShell Collection Script
# Target: ${target.name} (Compound Target)
# Use KAPE for compound target collection:
# ${kapeCommand}

Write-Host "For compound targets, use KAPE directly for best results." -ForegroundColor Yellow
`;
    }

    const lines = [
      "# PowerShell Artifact Collection Script",
      `# Target: ${target.name}`,
      "# Run as Administrator",
      "",
      "#Requires -RunAsAdministrator",
      "",
      '$ErrorActionPreference = "SilentlyContinue"',
      `$DestBase = "${destination}"`,
      "",
      "# Function to handle directory creation and copying",
      "function Collect-Artifact {",
      "    param (",
      "        [string]$SourcePath,",
      "        [string]$FolderName",
      "    )",
      "    $FullDest = Join-Path -Path $DestBase -ChildPath $FolderName",
      "    if (-not (Test-Path -Path $FullDest)) {",
      "        New-Item -ItemType Directory -Path $FullDest -Force | Out-Null",
      "    }",
      "    Copy-Item -Path $SourcePath -Destination $FullDest -Recurse -Force",
      "}",
      "",
    ];

    let entryNum = 1;
    for (const entry of targetPaths) {
      const safeName = entry.name.replace(NON_ALPHANUMERIC_REGEX, "_");
      // Convert %user% to PowerShell variable
      let sourcePath = entry.path.replace("C:", source);
      const hasUserVar = sourcePath.includes("%user%");

      if (hasUserVar) {
        sourcePath = sourcePath.replace(/%user%/gi, "$env:USERNAME");
      }

      lines.push(`# ${entryNum}. ${entry.name}`);

      // Check for legacy XP paths
      if (sourcePath.includes("Documents And Settings")) {
        lines.push('if (Test-Path "C:\\Documents And Settings") {');
        if (entry.fileMask) {
          lines.push(
            `    Collect-Artifact -SourcePath "${sourcePath}\\${entry.fileMask}" -FolderName "${safeName}"`
          );
        } else {
          lines.push(
            `    Collect-Artifact -SourcePath "${sourcePath}\\*" -FolderName "${safeName}"`
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
            `Collect-Artifact -SourcePath "$UserPath\\${entry.fileMask}" -FolderName "${safeName}"`
          );
        } else {
          lines.push(
            `Collect-Artifact -SourcePath "$UserPath\\*" -FolderName "${safeName}"`
          );
        }
      } else if (entry.fileMask) {
        lines.push(
          `Collect-Artifact -SourcePath "${sourcePath}\\${entry.fileMask}" -FolderName "${safeName}"`
        );
      } else {
        lines.push(
          `Collect-Artifact -SourcePath "${sourcePath}\\*" -FolderName "${safeName}"`
        );
      }
      lines.push("");
      entryNum++;
    }

    lines.push('Write-Host "Collection complete!" -ForegroundColor Green');

    return lines.join("\n");
  }, [target, targetPaths, destination, source, kapeCommand]);

  // Generate Batch script
  const batchScript = useMemo(() => {
    if (target.isCompound) {
      return `@echo off
REM Batch Collection Script
REM Target: ${target.name} (Compound Target)
REM Use KAPE for compound target collection:
REM ${kapeCommand}

echo For compound targets, use KAPE directly for best results.
pause
`;
    }

    const lines = [
      "@echo off",
      "setlocal EnableDelayedExpansion",
      "",
      "REM Batch Artifact Collection Script",
      `REM Target: ${target.name}`,
      "REM Generated by DFIRHub",
      "REM Run as Administrator",
      "",
      `set "DEST=${destination}"`,
      "",
      "REM Create destination directory",
      `if not exist "%DEST%" mkdir "%DEST%"`,
      "",
    ];

    for (const entry of targetPaths) {
      const safeName = entry.name.replace(NON_ALPHANUMERIC_REGEX, "_");
      let sourcePath = entry.path.replace("C:", source);
      const hasUserVar = sourcePath.includes("%user%");

      // Convert %user% to %USERNAME%
      if (hasUserVar) {
        sourcePath = sourcePath.replace(/%user%/gi, "%USERNAME%");
      }

      lines.push(`REM ${entry.name}`);
      lines.push(`set "DESTFOLDER=%DEST%\\${safeName}"`);
      lines.push(`if not exist "%DESTFOLDER%" mkdir "%DESTFOLDER%"`);

      // Handle legacy XP paths with existence check
      if (sourcePath.includes("Documents And Settings")) {
        lines.push(`if exist "C:\\Documents And Settings" (`);
        if (entry.fileMask) {
          lines.push(
            `    xcopy "${sourcePath}\\${entry.fileMask}" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`
          );
        } else {
          lines.push(
            `    xcopy "${sourcePath}\\*" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`
          );
        }
        lines.push(")");
      } else if (hasUserVar) {
        // For paths with %USERNAME%, use the Users folder with current user
        if (entry.fileMask) {
          lines.push(
            `xcopy "${sourcePath}\\${entry.fileMask}" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`
          );
        } else {
          lines.push(
            `xcopy "${sourcePath}\\*" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`
          );
        }
      } else if (entry.fileMask) {
        lines.push(
          `xcopy "${sourcePath}\\${entry.fileMask}" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`
        );
      } else {
        lines.push(
          `xcopy "${sourcePath}\\*" "%DESTFOLDER%\\" /E /H /Y /C /Q >nul 2>&1`
        );
      }
      lines.push("");
    }

    lines.push("echo Collection complete!");
    lines.push("endlocal");
    lines.push("pause");

    return lines.join("\r\n");
  }, [target, targetPaths, destination, source, kapeCommand]);

  // Helper to convert Windows path to WSL path
  const toWslPath = useCallback((windowsPath: string): string => {
    // Handle drive letters: C:\path -> /mnt/c/path
    const match = windowsPath.match(DRIVE_LETTER_REGEX);
    if (match) {
      const drive = match[1].toLowerCase();
      const rest = match[2].replace(/\\/g, "/");
      return `/mnt/${drive}${rest}`;
    }
    // Handle UNC paths or relative paths
    return windowsPath.replace(/\\/g, "/");
  }, []);

  // Generate WSL (Bash) script
  const wslScript = useMemo(() => {
    if (target.isCompound) {
      return `#!/bin/bash
# WSL Artifact Collection Script
# Target: ${target.name} (Compound Target)
# For compound targets, use KAPE on Windows directly:
# ${kapeCommand}

echo "For compound targets, use KAPE directly for best results."
`;
    }

    const wslDest = toWslPath(destination);
    const wslSource = toWslPath(source);

    // Check if any path contains %user% variable
    const hasUserPaths = targetPaths.some((entry) =>
      entry.path.toLowerCase().includes("%user%")
    );

    const lines = [
      "#!/bin/bash",
      "# WSL Artifact Collection Script",
      `# Target: ${target.name}`,
      "# Generated by DFIRHub",
      "# Run from WSL with sudo for best results",
      "",
      `DEST="${wslDest}"`,
      "",
      "# Create destination directory",
      'mkdir -p "$DEST"',
      "",
    ];

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

    for (const entry of targetPaths) {
      const safeName = entry.name.replace(NON_ALPHANUMERIC_REGEX, "_");
      const destPath = `$DEST/${safeName}`;

      // Convert the source path
      let sourcePath = entry.path;

      // Replace drive letter with WSL mount path
      if (STARTS_WITH_DRIVE_REGEX.test(sourcePath)) {
        sourcePath = sourcePath.replace(STARTS_WITH_DRIVE_REGEX, wslSource);
      }

      // Convert backslashes to forward slashes
      sourcePath = sourcePath.replace(/\\/g, "/");

      // Replace %user% with $WIN_USER for Bash
      const hasUserVar = sourcePath.toLowerCase().includes("%user%");
      if (hasUserVar) {
        sourcePath = sourcePath.replace(/%user%/gi, "$WIN_USER");
      }

      // Clean up any double slashes (except after protocol)
      sourcePath = sourcePath.replace(/([^:])\/\//g, "$1/");

      lines.push(`# ${entry.name}`);
      lines.push(`mkdir -p "${destPath}"`);

      // Add directory existence check
      lines.push(`if [ -d "${sourcePath}" ]; then`);

      if (entry.fileMask) {
        // Use find for file mask patterns - more efficient and reliable
        if (entry.fileMask.includes("*")) {
          lines.push(
            `    find "${sourcePath}" -maxdepth 1 -name "${entry.fileMask}" -exec cp {} "${destPath}/" \\; 2>/dev/null`
          );
        } else {
          lines.push(
            `    cp -r "${sourcePath}/${entry.fileMask}" "${destPath}/" 2>/dev/null`
          );
        }
      } else {
        lines.push(`    cp -r "${sourcePath}/"* "${destPath}/" 2>/dev/null`);
      }

      lines.push("else");
      lines.push(`    echo "Source not found: ${sourcePath}"`);
      lines.push("fi");
      lines.push("");
    }

    lines.push('echo -e "\\033[32mCollection complete!\\033[0m"');

    return lines.join("\n");
  }, [target, targetPaths, destination, source, kapeCommand, toWslPath]);

  const currentCommand = useMemo(() => {
    switch (format) {
      case "kape":
        return kapeCommand;
      case "powershell":
        return powershellScript;
      case "batch":
        return batchScript;
      case "wsl":
        return wslScript;
      default:
        return kapeCommand;
    }
  }, [format, kapeCommand, powershellScript, batchScript, wslScript]);

  const handleCopy = async (command: string, id: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedId(id);
      // Announce to screen readers
      const announcer = document.getElementById("live-announcer");
      if (announcer) {
        announcer.textContent = "Command copied to clipboard";
        setTimeout(() => {
          announcer.textContent = "";
        }, 1000);
      }
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="glass-subtle overflow-hidden rounded-xl">
      {/* Format Tabs */}
      <div
        aria-label="Command format selection"
        className="flex overflow-x-auto border-white/[0.04] border-b bg-white/[0.02]"
        role="tablist"
      >
        {[
          { id: "kape", label: "KAPE", description: "KAPE command line" },
          {
            id: "powershell",
            label: "PowerShell",
            description: "PowerShell script",
          },
          { id: "batch", label: "Batch", description: "Windows batch script" },
          { id: "wsl", label: "WSL", description: "WSL/Linux bash script" },
        ].map((tab) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={format === tab.id}
            className={`focus-ring whitespace-nowrap px-4 py-2 text-xs transition-colors ${
              format === tab.id
                ? "border-primary border-b-2 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={tab.id}
            onClick={() => setFormat(tab.id as CommandFormat)}
            role="tab"
            type="button"
          >
            {tab.label.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Configuration Panel */}
      <div className="border-white/[0.04] border-b bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Source Drive */}
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground" htmlFor="source-input">
              source:
            </label>
            <input
              className="h-7 w-16 border border-border bg-background px-2 text-xs outline-none focus:border-primary/50"
              id="source-input"
              onChange={(e) => setSource(e.target.value)}
              placeholder="C:"
              type="text"
              value={source}
            />
          </div>

          {/* Destination Path */}
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground" htmlFor="dest-input">
              destination:
            </label>
            <input
              className="h-7 w-40 border border-border bg-background px-2 text-xs outline-none focus:border-primary/50"
              id="dest-input"
              onChange={(e) => setDestination(e.target.value)}
              placeholder="D:\Evidence"
              type="text"
              value={destination}
            />
          </div>

          {/* KAPE-specific options */}
          {format === "kape" && (
            <>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  checked={useVss}
                  className="h-3 w-3 accent-primary"
                  onChange={(e) => setUseVss(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-muted-foreground">--vss</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  checked={useVhdx}
                  className="h-3 w-3 accent-primary"
                  onChange={(e) => setUseVhdx(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-muted-foreground">--vhdx</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Command Display */}
      <div className="p-4">
        <div className="relative">
          <CodeBlock
            code={currentCommand}
            language={
              format === "kape"
                ? "shell"
                : format === "wsl"
                  ? "bash"
                  : format === "powershell"
                    ? "powershell"
                    : "batch"
            }
          />
          <button
            aria-label={
              copiedId === format ? "Copied to clipboard" : "Copy command"
            }
            className="focus-ring absolute top-2 right-2 z-20 rounded border border-white/[0.1] bg-black/60 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
            onClick={() => handleCopy(currentCommand, format)}
            type="button"
          >
            {copiedId === format ? "copied!" : "copy"}
          </button>
        </div>

        {/* Format description */}
        <div className="mt-3 text-[10px] text-muted-foreground">
          {format === "kape" && (
            <p>
              <span className="text-primary">{"›"}</span> Run with administrator
              privileges.{" "}
              <a
                className="text-primary transition-colors hover:text-primary/80"
                href="https://ericzimmerman.github.io/KapeDocs/"
                rel="noopener noreferrer"
                target="_blank"
              >
                KAPE Documentation
              </a>
            </p>
          )}
          {format === "powershell" && (
            <p>
              <span className="text-primary">{"›"}</span> Save as .ps1 and run as
              Administrator. Use:{" "}
              <code className="text-primary">
                powershell -ExecutionPolicy Bypass -File script.ps1
              </code>
            </p>
          )}
          {format === "batch" && (
            <p>
              <span className="text-primary">{"›"}</span> Save as .bat and run as
              Administrator (right-click → Run as administrator).
            </p>
          )}
          {format === "wsl" && (
            <p>
              <span className="text-primary">{"›"}</span> Save as .sh and run with{" "}
              <code className="text-primary">sudo bash script.sh</code> from
              WSL.
            </p>
          )}
        </div>
      </div>

      {/* Target Info */}
      {target.isCompound && (
        <div className="px-4 pb-4">
          <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <span className="text-amber-400">Note:</span>{" "}
            <span className="text-muted-foreground">
              This is a compound target that references{" "}
              {target.referencedTargets.length} other targets. KAPE will
              automatically collect all referenced artifacts.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
