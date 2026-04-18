import type { KapeTarget, KapeTargetEntry } from "./kapefiles";

export interface GeneratorOptions {
  source: string;
  destination: string;
  useVss?: boolean;
  useVhdx?: boolean;
}

interface NormalizedEntry {
  name: string;
  safeName: string;
  path: string;
  fileMask?: string;
  hasUserVar: boolean;
  relativeFromUserRoot?: string;
}

const NON_ALPHANUMERIC_RUN = /[^a-zA-Z0-9]+/g;
const LEADING_UNDERSCORE = /^_+|_+$/g;
const DRIVE_LETTER = /^([A-Za-z]):(.*)/;
const USERS_PREFIX_CI = /^[A-Za-z]:\\users\\%user%\\?/i;

const RESERVED_PROFILE_FOLDERS = [
  "All Users",
  "Default",
  "Default User",
  "Public",
];

function sanitizeFolderName(name: string): string {
  return name.replace(NON_ALPHANUMERIC_RUN, "_").replace(LEADING_UNDERSCORE, "");
}

function stripTrailingBackslash(value: string): string {
  return value.replace(/\\+$/, "");
}

function applySourceDrive(pathStr: string, source: string): string {
  return pathStr.replace(DRIVE_LETTER, (_, _drive, rest) => `${source}${rest}`);
}

function normalizeEntry(
  entry: KapeTargetEntry,
  source: string
): NormalizedEntry {
  const hasUserVar = /%user%/i.test(entry.path);
  const safeName = sanitizeFolderName(entry.name);

  let relativeFromUserRoot: string | undefined;
  if (hasUserVar) {
    const match = entry.path.match(USERS_PREFIX_CI);
    if (match) {
      relativeFromUserRoot = entry.path.slice(match[0].length);
    } else {
      const afterUser = entry.path.split(/%user%\\?/i)[1] ?? "";
      relativeFromUserRoot = afterUser;
    }
    relativeFromUserRoot = stripTrailingBackslash(relativeFromUserRoot);
  }

  return {
    fileMask: entry.fileMask,
    hasUserVar,
    name: entry.name,
    path: applySourceDrive(entry.path, source),
    relativeFromUserRoot,
    safeName,
  };
}

function getEntries(target: KapeTarget): KapeTargetEntry[] {
  return target.targets.filter((e) => !e.path.endsWith(".tkape"));
}

export function generateKapeCommand(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
  let cmd = `kape.exe --tsource ${opts.source} --tdest ${opts.destination} --target ${target.name}`;
  if (opts.useVss) {
    cmd += " --vss";
  }
  if (opts.useVhdx) {
    cmd += " --vhdx evidence";
  }
  return cmd;
}

export function generatePowerShell(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
  const kapeCmd = generateKapeCommand(target, opts);

  if (target.isCompound) {
    return [
      "# PowerShell Collection Script",
      `# Target: ${target.name} (Compound Target)`,
      "# Use KAPE directly for best results:",
      `# ${kapeCmd}`,
      "",
      'Write-Host "For compound targets, use KAPE directly for best results." -ForegroundColor Yellow',
      "",
    ].join("\n");
  }

  const entries = getEntries(target).map((e) => normalizeEntry(e, opts.source));
  const lines: string[] = [
    "# PowerShell Artifact Collection Script",
    `# Target: ${target.name}`,
    "# Run as Administrator",
    "",
    "#Requires -RunAsAdministrator",
    "",
    '$ErrorActionPreference = "Continue"',
    `$SourceRoot = "${opts.source}"`,
    `$DestBase   = "${opts.destination}"`,
    "$Summary = @{ Copied = 0; Missed = 0; Errors = 0 }",
    "",
    "function Collect-Artifact {",
    "    param(",
    "        [Parameter(Mandatory)][string]$SourceDir,",
    "        [Parameter(Mandatory)][string]$FolderName,",
    '        [string]$FileMask = "*"',
    "    )",
    "    if (-not (Test-Path -LiteralPath $SourceDir)) {",
    "        $Summary.Missed++",
    "        return",
    "    }",
    "    $FullDest = Join-Path -Path $DestBase -ChildPath $FolderName",
    "    $null = New-Item -ItemType Directory -Force -Path $FullDest -ErrorAction SilentlyContinue",
    '    robocopy "$SourceDir" "$FullDest" "$FileMask" /E /COPY:DAT /R:0 /W:0 /NP /NFL /NDL /NJH /NJS 2>$null | Out-Null',
    "    if ($LASTEXITCODE -le 7) { $Summary.Copied++ } else { $Summary.Errors++ }",
    "}",
    "",
  ];

  const reservedList = RESERVED_PROFILE_FOLDERS.map((n) => `'${n}'`).join(", ");
  const userEntries = entries.filter((e) => e.hasUserVar);
  const nonUserEntries = entries.filter((e) => !e.hasUserVar);

  for (const [idx, entry] of nonUserEntries.entries()) {
    lines.push(`# ${idx + 1}. ${entry.name}`);
    const src = stripTrailingBackslash(entry.path);
    if (entry.fileMask) {
      lines.push(
        `Collect-Artifact -SourceDir "${src}" -FileMask "${entry.fileMask}" -FolderName "${entry.safeName}"`
      );
    } else {
      lines.push(`Collect-Artifact -SourceDir "${src}" -FolderName "${entry.safeName}"`);
    }
    lines.push("");
  }

  if (userEntries.length > 0) {
    lines.push("# Iterate every user profile under the source drive");
    lines.push(
      `Get-ChildItem "$SourceRoot\\Users" -Directory -ErrorAction SilentlyContinue |`
    );
    lines.push(`    Where-Object { $_.Name -notin @(${reservedList}) } |`);
    lines.push("    ForEach-Object {");
    lines.push("        $UserName = $_.Name");
    for (const entry of userEntries) {
      const rel = entry.relativeFromUserRoot ?? "";
      const folder = `${entry.safeName}_$UserName`;
      lines.push(`        # ${entry.name}`);
      lines.push(
        rel
          ? `        $UserPath = "$($_.FullName)\\${rel}"`
          : "        $UserPath = $_.FullName"
      );
      if (entry.fileMask) {
        lines.push(
          `        Collect-Artifact -SourceDir $UserPath -FileMask "${entry.fileMask}" -FolderName "${folder}"`
        );
      } else {
        lines.push(
          `        Collect-Artifact -SourceDir $UserPath -FolderName "${folder}"`
        );
      }
    }
    lines.push("    }");
    lines.push("");
  }

  lines.push(
    'Write-Host ("Collection complete. Copied: {0}  Missed: {1}  Errors: {2}" -f $Summary.Copied, $Summary.Missed, $Summary.Errors) -ForegroundColor Green'
  );

  return lines.join("\n");
}

export function generateBatch(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
  const kapeCmd = generateKapeCommand(target, opts);

  if (target.isCompound) {
    return [
      "@echo off",
      "REM Batch Collection Script",
      `REM Target: ${target.name} (Compound Target)`,
      "REM Use KAPE directly for best results:",
      `REM ${kapeCmd}`,
      "",
      "echo For compound targets, use KAPE directly for best results.",
      "pause",
      "",
    ].join("\r\n");
  }

  const entries = getEntries(target).map((e) => normalizeEntry(e, opts.source));
  const userEntries = entries.filter((e) => e.hasUserVar);
  const nonUserEntries = entries.filter((e) => !e.hasUserVar);
  const roboFlags = "/E /COPY:DAT /R:0 /W:0 /NP /NFL /NDL /NJH /NJS";

  const lines: string[] = [
    "@echo off",
    "setlocal EnableDelayedExpansion",
    "",
    "REM Batch Artifact Collection Script",
    `REM Target: ${target.name}`,
    "REM Run as Administrator",
    "",
    `set "SRC=${opts.source}"`,
    `set "DEST=${opts.destination}"`,
    `if not exist "%DEST%" mkdir "%DEST%"`,
    "",
  ];

  for (const entry of nonUserEntries) {
    const src = stripTrailingBackslash(entry.path);
    lines.push(`REM ${entry.name}`);
    lines.push(`if exist "${src}\\" (`);
    if (entry.fileMask) {
      lines.push(
        `    robocopy "${src}\\" "%DEST%\\${entry.safeName}" "${entry.fileMask}" ${roboFlags} >nul 2>&1`
      );
    } else {
      lines.push(
        `    robocopy "${src}\\" "%DEST%\\${entry.safeName}" ${roboFlags} >nul 2>&1`
      );
    }
    lines.push(")");
    lines.push("");
  }

  if (userEntries.length > 0) {
    lines.push("REM Iterate every user profile under the source drive");
    lines.push(`for /D %%U in ("%SRC%\\Users\\*") do (`);
    lines.push(`    set "SKIP=0"`);
    for (const reserved of RESERVED_PROFILE_FOLDERS) {
      lines.push(`    if /I "%%~nxU"=="${reserved}" set "SKIP=1"`);
    }
    lines.push(`    if "!SKIP!"=="0" (`);
    for (const entry of userEntries) {
      const rel = entry.relativeFromUserRoot ?? "";
      const relSuffix = rel ? `\\${rel}` : "";
      const srcExpr = `%%U${relSuffix}`;
      const destFolder = `${entry.safeName}_%%~nxU`;
      lines.push(`        REM ${entry.name}`);
      lines.push(`        if exist "${srcExpr}\\" (`);
      if (entry.fileMask) {
        lines.push(
          `            robocopy "${srcExpr}\\" "%DEST%\\${destFolder}" "${entry.fileMask}" ${roboFlags} >nul 2>&1`
        );
      } else {
        lines.push(
          `            robocopy "${srcExpr}\\" "%DEST%\\${destFolder}" ${roboFlags} >nul 2>&1`
        );
      }
      lines.push(`        )`);
    }
    lines.push(`    )`);
    lines.push(`)`);
    lines.push("");
  }

  lines.push("echo Collection complete!");
  lines.push("endlocal");
  lines.push("pause");

  return lines.join("\r\n");
}

function toWslPath(windowsPath: string): string {
  const match = windowsPath.match(DRIVE_LETTER);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replaceAll("\\", "/");
    return `/mnt/${drive}${rest}`;
  }
  return windowsPath.replaceAll("\\", "/");
}

export function generateWsl(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
  const kapeCmd = generateKapeCommand(target, opts);

  if (target.isCompound) {
    return [
      "#!/bin/bash",
      "# WSL Artifact Collection Script",
      `# Target: ${target.name} (Compound Target)`,
      "# For compound targets, run KAPE on Windows directly:",
      `# ${kapeCmd}`,
      "",
      'echo "For compound targets, use KAPE directly for best results."',
      "",
    ].join("\n");
  }

  const entries = getEntries(target).map((e) => normalizeEntry(e, opts.source));
  const userEntries = entries.filter((e) => e.hasUserVar);
  const nonUserEntries = entries.filter((e) => !e.hasUserVar);

  const wslSourceRoot = toWslPath(opts.source);
  const wslDest = toWslPath(opts.destination);

  const lines: string[] = [
    "#!/bin/bash",
    "# WSL Artifact Collection Script",
    `# Target: ${target.name}`,
    "# Run with sudo for best results",
    "set -u",
    "",
    `SRC="${wslSourceRoot}"`,
    `DEST="${wslDest}"`,
    "COPIED=0",
    "MISSED=0",
    'mkdir -p "$DEST"',
    "",
    "copy_artifact() {",
    "    local src_dir=$1",
    "    local dest_name=$2",
    "    local mask=${3:-}",
    '    if [ ! -d "$src_dir" ]; then',
    "        MISSED=$((MISSED + 1))",
    "        return",
    "    fi",
    '    mkdir -p "$DEST/$dest_name"',
    '    if [ -n "$mask" ]; then',
    '        find "$src_dir" -maxdepth 1 -type f -name "$mask" -exec cp -p {} "$DEST/$dest_name/" \\; 2>/dev/null',
    "    else",
    '        cp -rp "$src_dir"/. "$DEST/$dest_name/" 2>/dev/null',
    "    fi",
    "    COPIED=$((COPIED + 1))",
    "}",
    "",
  ];

  for (const entry of nonUserEntries) {
    const src = toWslPath(stripTrailingBackslash(entry.path));
    lines.push(`# ${entry.name}`);
    if (entry.fileMask) {
      lines.push(
        `copy_artifact "${src}" "${entry.safeName}" "${entry.fileMask}"`
      );
    } else {
      lines.push(`copy_artifact "${src}" "${entry.safeName}"`);
    }
  }

  if (userEntries.length > 0) {
    lines.push("");
    lines.push("# Iterate every user profile under the source drive");
    lines.push('for user_dir in "$SRC"/Users/*/; do');
    lines.push('    user_name=$(basename "$user_dir")');
    lines.push("    case \"$user_name\" in");
    lines.push(
      `        ${RESERVED_PROFILE_FOLDERS.map((n) => `"${n}"`).join("|")}) continue ;;`
    );
    lines.push("    esac");
    for (const entry of userEntries) {
      const rel = (entry.relativeFromUserRoot ?? "").replaceAll("\\", "/");
      const srcExpr = rel ? `"\${user_dir}${rel}"` : `"$user_dir"`;
      const destName = `${entry.safeName}_$user_name`;
      lines.push(`    # ${entry.name}`);
      if (entry.fileMask) {
        lines.push(
          `    copy_artifact ${srcExpr} "${destName}" "${entry.fileMask}"`
        );
      } else {
        lines.push(`    copy_artifact ${srcExpr} "${destName}"`);
      }
    }
    lines.push("done");
  }

  lines.push("");
  lines.push(
    'echo -e "\\033[32mCollection complete. Copied: $COPIED  Missed: $MISSED\\033[0m"'
  );

  return lines.join("\n");
}
