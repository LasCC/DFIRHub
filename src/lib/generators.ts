import type { KapeTarget, KapeTargetEntry } from "./kapefiles";
import { findLockedEntries } from "./lockedFiles";

export interface GeneratorOptions {
  source: string;
  destination: string;
  useVss?: boolean;
  useVhdx?: boolean;
  chainOfCustody?: boolean;
  caseId?: string;
  examiner?: string;
}

interface NormalizedEntry {
  name: string;
  safeName: string;
  path: string;
  fileMask?: string;
  recursive: boolean;
  hasUserVar: boolean;
  relativeFromUserRoot?: string;
}

const NON_ALPHANUMERIC_RUN = /[^a-zA-Z0-9]+/g;
const LEADING_UNDERSCORE = /^_+|_+$/g;
const DRIVE_LETTER = /^([A-Za-z]):(.*)/;
const USERS_PREFIX_CI = /^[A-Za-z]:\\users\\%user%\\?/i;
const REGEX_MASK_PREFIX = /^regex:\*?/i;
const BATCH_UNSAFE_CHARACTERS = /[&|<>^%!"()]/g;
const MAX_LISTED_LOCKED_ENTRIES = 12;
const REGEX_MASK_MARKER = "regex:";

const RESERVED_PROFILE_FOLDERS = [
  "All Users",
  "Default",
  "Default User",
  "Public",
];

function sanitizeFolderName(name: string): string {
  return name
    .replace(NON_ALPHANUMERIC_RUN, "_")
    .replace(LEADING_UNDERSCORE, "");
}

function stripTrailingBackslash(value: string): string {
  return value.replace(/\\+$/, "");
}

function applySourceDrive(pathStr: string, source: string): string {
  return pathStr.replace(DRIVE_LETTER, (_, _drive, rest) => `${source}${rest}`);
}

function normalizeFileMask(fileMask: string | undefined): string | undefined {
  if (!fileMask) {
    return undefined;
  }
  if (REGEX_MASK_PREFIX.test(fileMask)) {
    return `${REGEX_MASK_MARKER}${fileMask.replace(REGEX_MASK_PREFIX, "")}`;
  }
  return fileMask;
}

function isRegexMask(fileMask: string | undefined): fileMask is string {
  return fileMask?.startsWith(REGEX_MASK_MARKER) ?? false;
}

function regexPattern(fileMask: string): string {
  return fileMask.slice(REGEX_MASK_MARKER.length);
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
    fileMask: normalizeFileMask(entry.fileMask),
    hasUserVar,
    name: entry.name,
    path: applySourceDrive(entry.path, source),
    recursive: entry.recursive === true,
    relativeFromUserRoot,
    safeName,
  };
}

// Generators run client-side, so they cannot resolve compound references
// themselves (resolution requires the on-disk KapeFiles index). Callers
// pass a target whose `targets` already contain the flat entry list —
// `getResolvedEntries` in lib/kapefiles.ts is the server-side helper.
function getEntries(target: KapeTarget): KapeTargetEntry[] {
  return target.targets.filter((e) => !e.path.endsWith(".tkape"));
}

export function kapeTargetName(target: KapeTarget): string {
  return target.sourceFile
    ? target.sourceFile.replace(/\.tkape$/, "")
    : target.name;
}

function quotePowerShellSingle(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteBashSingle(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function stripBatchSpecialCharacters(value: string): string {
  return value.replace(BATCH_UNSAFE_CHARACTERS, "");
}

function lockedEntryWarning(
  target: KapeTarget,
  commentPrefix: string
): string[] {
  const locked = findLockedEntries(getEntries(target));
  if (locked.length === 0) {
    return [];
  }
  const names = [...new Set(locked.map((entry) => entry.name))];
  const listed = names.slice(0, MAX_LISTED_LOCKED_ENTRIES);
  const lines = [
    `${commentPrefix} WARNING: ${locked.length} ${locked.length === 1 ? "path is" : "paths are"} locked by Windows on a live system.`,
    `${commentPrefix} This script cannot copy them. Use KAPE (raw disk access) or run it against a mounted image:`,
    ...listed.map((name) => `${commentPrefix}   - ${name}`),
  ];
  if (names.length > listed.length) {
    lines.push(
      `${commentPrefix}   ... and ${names.length - listed.length} more`
    );
  }
  lines.push("");
  return lines;
}

export function generateKapeCommand(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
  let cmd = `kape.exe --tsource ${opts.source} --tdest ${opts.destination} --target ${kapeTargetName(target)}`;
  if (opts.useVss) {
    cmd += " --vss";
  }
  if (opts.useVhdx) {
    cmd += " --vhdx evidence";
  }
  return cmd;
}

function powerShellCollectCall(
  entry: NormalizedEntry,
  sourceExpression: string,
  folderExpression: string
): string {
  const parts = [
    `Collect-Artifact -SourceDir ${sourceExpression}`,
    entry.fileMask ? `-FileMask ${quotePowerShellSingle(entry.fileMask)}` : "",
    `-FolderName ${folderExpression}`,
    entry.recursive ? "-Recurse" : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function powerShellCustodyStart(opts: GeneratorOptions): string[] {
  if (!opts.chainOfCustody) {
    return [];
  }
  return [
    "$null = New-Item -ItemType Directory -Force -Path $DestBase",
    'Start-Transcript -Path (Join-Path $DestBase "collection-log.txt") -Append | Out-Null',
    '$CollectionStart = (Get-Date).ToUniversalTime().ToString("o")',
    "",
  ];
}

function powerShellCustodyEnd(opts: GeneratorOptions): string[] {
  if (!opts.chainOfCustody) {
    return [];
  }
  return [
    "",
    "@(",
    `    ${quotePowerShellSingle(`Case: ${opts.caseId ?? ""}`)}`,
    `    ${quotePowerShellSingle(`Examiner: ${opts.examiner ?? ""}`)}`,
    '    "Host: $env:COMPUTERNAME"',
    '    "Collected by: $env:USERDOMAIN\\$env:USERNAME"',
    '    "Source: $SourceRoot"',
    '    "Started (UTC): $CollectionStart"',
    "    \"Finished (UTC): $((Get-Date).ToUniversalTime().ToString('o'))\"",
    ') | Set-Content -Path (Join-Path $DestBase "collection-info.txt") -Encoding UTF8',
    "Stop-Transcript | Out-Null",
    "",
    '$ManifestPath = Join-Path $DestBase "SHA256SUMS.csv"',
    "Get-ChildItem -LiteralPath $DestBase -File -Recurse -Force |",
    "    Where-Object { $_.FullName -ne $ManifestPath } |",
    "    Get-FileHash -Algorithm SHA256 |",
    "    Select-Object Hash, Path |",
    "    Export-Csv -NoTypeInformation -Encoding UTF8 -Path $ManifestPath",
  ];
}

export function generatePowerShell(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
  const entries = getEntries(target).map((e) => normalizeEntry(e, opts.source));
  const lines: string[] = [
    "# PowerShell Artifact Collection Script",
    `# Target: ${target.name}`,
    "# Run as Administrator",
    "",
    ...lockedEntryWarning(target, "#"),
    "#Requires -RunAsAdministrator",
    "",
    '$ErrorActionPreference = "Continue"',
    `$SourceRoot = "${opts.source}"`,
    `$DestBase   = "${opts.destination}"`,
    "$Summary = @{ Copied = 0; Missed = 0; Errors = 0 }",
    "",
    ...powerShellCustodyStart(opts),
    "function Collect-Artifact {",
    "    param(",
    "        [Parameter(Mandatory)][string]$SourceDir,",
    "        [Parameter(Mandatory)][string]$FolderName,",
    '        [string]$FileMask = "*",',
    "        [switch]$Recurse",
    "    )",
    "    # Expand wildcards in any path segment (e.g. 'Program Files*',",
    "    # 'ScreenConnect Client*'). robocopy itself does not glob the source.",
    "    $sources = @(Get-Item -Path $SourceDir -Force -ErrorAction SilentlyContinue |",
    "        Where-Object { $_.PSIsContainer })",
    "    if ($sources.Count -eq 0) {",
    "        $Summary.Missed++",
    "        return",
    "    }",
    "    $FullDest = Join-Path -Path $DestBase -ChildPath $FolderName",
    "    $null = New-Item -ItemType Directory -Force -Path $FullDest -ErrorAction SilentlyContinue",
    "    foreach ($src in $sources) {",
    `        if ($FileMask.StartsWith("${REGEX_MASK_MARKER}")) {`,
    `            $Pattern = $FileMask.Substring(${REGEX_MASK_MARKER.length})`,
    "            Get-ChildItem -LiteralPath $src.FullName -File -Force -Recurse:$Recurse -ErrorAction SilentlyContinue |",
    "                Where-Object { $_.Name -match $Pattern } |",
    "                Copy-Item -Destination $FullDest -Force -ErrorAction SilentlyContinue",
    "            $Summary.Copied++",
    "            continue",
    "        }",
    '        $RoboFlags = @("/COPY:DAT", "/R:0", "/W:0", "/NP", "/NFL", "/NDL", "/NJH", "/NJS")',
    '        if ($Recurse) { $RoboFlags += "/E" }',
    '        robocopy $src.FullName "$FullDest" "$FileMask" @RoboFlags 2>$null | Out-Null',
    "        if ($LASTEXITCODE -le 7) { $Summary.Copied++ } else { $Summary.Errors++ }",
    "    }",
    "}",
    "",
  ];

  const reservedList = RESERVED_PROFILE_FOLDERS.map((n) => `'${n}'`).join(", ");
  const userEntries = entries.filter((e) => e.hasUserVar);
  const nonUserEntries = entries.filter((e) => !e.hasUserVar);

  for (const [idx, entry] of nonUserEntries.entries()) {
    lines.push(`# ${idx + 1}. ${entry.name}`);
    const src = stripTrailingBackslash(entry.path);
    lines.push(
      powerShellCollectCall(
        entry,
        quotePowerShellSingle(src),
        quotePowerShellSingle(entry.safeName)
      ),
      ""
    );
  }

  if (userEntries.length > 0) {
    lines.push(
      "# Iterate every user profile under the source drive",
      `Get-ChildItem "$SourceRoot\\Users" -Directory -Force -ErrorAction SilentlyContinue |`
    );
    lines.push(
      `    Where-Object { $_.Name -notin @(${reservedList}) } |`,
      "    ForEach-Object {"
    );
    lines.push("        $UserName = $_.Name");
    for (const entry of userEntries) {
      const rel = entry.relativeFromUserRoot ?? "";
      const folder = `"${entry.safeName}_$UserName"`;
      lines.push(
        `        # ${entry.name}`,
        rel
          ? `        $UserPath = Join-Path $_.FullName ${quotePowerShellSingle(rel)}`
          : "        $UserPath = $_.FullName"
      );
      lines.push(
        `        ${powerShellCollectCall(entry, "$UserPath", folder)}`
      );
    }
    lines.push("    }", "");
  }

  lines.push(
    ...powerShellCustodyEnd(opts),
    'Write-Host ("Collection complete. Copied: {0}  Missed: {1}  Errors: {2}" -f $Summary.Copied, $Summary.Missed, $Summary.Errors) -ForegroundColor Green'
  );

  return lines.join("\n");
}

const BATCH_ROBOCOPY_FLAGS = "/COPY:DAT /R:0 /W:0 /NP /NFL /NDL /NJH /NJS";

function batchRobocopyFlags(entry: NormalizedEntry): string {
  return entry.recursive ? `/E ${BATCH_ROBOCOPY_FLAGS}` : BATCH_ROBOCOPY_FLAGS;
}

function batchRegexCopy(
  entry: NormalizedEntry,
  sourceExpression: string,
  destinationExpression: string
): string {
  const pattern = regexPattern(entry.fileMask ?? "").replaceAll("'", "''");
  const recurse = entry.recursive ? " -Recurse" : "";
  return `powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path '${destinationExpression}' | Out-Null; Get-ChildItem -Path '${sourceExpression}' -File -Force${recurse} -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '${pattern}' } | Copy-Item -Destination '${destinationExpression}' -Force"`;
}

function batchCopy(
  entry: NormalizedEntry,
  sourceExpression: string,
  destinationExpression: string
): string {
  if (isRegexMask(entry.fileMask)) {
    return batchRegexCopy(entry, sourceExpression, destinationExpression);
  }
  const mask = entry.fileMask ? ` "${entry.fileMask}"` : "";
  return `robocopy "${sourceExpression}\\" "${destinationExpression}"${mask} ${batchRobocopyFlags(entry)} >nul 2>&1`;
}

function batchCustodyStart(opts: GeneratorOptions): string[] {
  if (!opts.chainOfCustody) {
    return [];
  }
  const info = `"%DEST%\\collection-info.txt"`;
  return [
    `> ${info} echo Case: ${stripBatchSpecialCharacters(opts.caseId ?? "")}`,
    `>> ${info} echo Examiner: ${stripBatchSpecialCharacters(opts.examiner ?? "")}`,
    `>> ${info} echo Host: %COMPUTERNAME%`,
    `>> ${info} echo Collected by: %USERDOMAIN%\\%USERNAME%`,
    `>> ${info} echo Source: %SRC%`,
    `>> ${info} echo Started: %DATE% %TIME%`,
    "",
  ];
}

function batchCustodyEnd(opts: GeneratorOptions): string[] {
  if (!opts.chainOfCustody) {
    return [];
  }
  return [
    `>> "%DEST%\\collection-info.txt" echo Finished: %DATE% %TIME%`,
    "echo Hashing collected files...",
    `powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%DEST%' -File -Recurse -Force | Where-Object { $_.Name -ne 'SHA256SUMS.csv' } | Get-FileHash -Algorithm SHA256 | Select-Object Hash, Path | Export-Csv -NoTypeInformation -Encoding UTF8 -Path '%DEST%\\SHA256SUMS.csv'"`,
    "",
  ];
}

export function generateBatch(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
  const entries = getEntries(target).map((e) => normalizeEntry(e, opts.source));
  const userEntries = entries.filter((e) => e.hasUserVar);
  const nonUserEntries = entries.filter((e) => !e.hasUserVar);

  const lines: string[] = [
    "@echo off",
    "setlocal EnableDelayedExpansion",
    "",
    "REM Batch Artifact Collection Script",
    `REM Target: ${target.name}`,
    "REM Run as Administrator",
    "",
    ...lockedEntryWarning(target, "REM"),
    `set "SRC=${opts.source}"`,
    `set "DEST=${opts.destination}"`,
    `if not exist "%DEST%" mkdir "%DEST%"`,
    "",
    ...batchCustodyStart(opts),
  ];

  for (const entry of nonUserEntries) {
    const src = stripTrailingBackslash(entry.path);
    const destination = `%DEST%\\${entry.safeName}`;
    lines.push(`REM ${entry.name}`);
    if (isRegexMask(entry.fileMask)) {
      lines.push(batchCopy(entry, src, destination));
    } else if (src.includes("*") || src.includes("?")) {
      // robocopy and `if exist` don't expand wildcards in mid-path segments
      // (e.g. "Program Files*"). Shell out to PowerShell to enumerate the
      // matching directories first, then robocopy each result.
      const psLiteral = src.replaceAll("'", "''");
      lines.push(
        `for /F "usebackq delims=" %%D in (\`powershell -NoProfile -Command "Get-Item -Path '${psLiteral}' -Force -ErrorAction SilentlyContinue | Where-Object PSIsContainer | ForEach-Object FullName"\`) do (`,
        `    ${batchCopy(entry, "%%D", destination)}`
      );
      lines.push(")");
    } else {
      lines.push(
        `if exist "${src}\\" (`,
        `    ${batchCopy(entry, src, destination)}`
      );
      lines.push(")");
    }
    lines.push("");
  }

  if (userEntries.length > 0) {
    lines.push(
      "REM Iterate every user profile under the source drive",
      `for /D %%U in ("%SRC%\\Users\\*") do (`
    );
    lines.push(`    set "SKIP=0"`);
    for (const reserved of RESERVED_PROFILE_FOLDERS) {
      lines.push(`    if /I "%%~nxU"=="${reserved}" set "SKIP=1"`);
    }
    lines.push(`    if "!SKIP!"=="0" (`);
    for (const entry of userEntries) {
      const rel = entry.relativeFromUserRoot ?? "";
      const relSuffix = rel ? `\\${rel}` : "";
      const srcExpr = `%%U${relSuffix}`;
      const destination = `%DEST%\\${entry.safeName}_%%~nxU`;
      lines.push(
        `        REM ${entry.name}`,
        `        if exist "${srcExpr}\\" (`
      );
      lines.push(
        `            ${batchCopy(entry, srcExpr, destination)}`,
        `        )`
      );
    }
    lines.push(`    )`, `)`);
    lines.push("");
  }

  lines.push(...batchCustodyEnd(opts), "echo Collection complete!");
  lines.push("endlocal", "pause");

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

function wslCopyCall(
  entry: NormalizedEntry,
  sourceExpression: string,
  destinationExpression: string
): string {
  const mask = quoteBashSingle(entry.fileMask ?? "");
  const recurse = entry.recursive ? "1" : "0";
  return `copy_artifact ${sourceExpression} ${destinationExpression} ${mask} ${recurse}`;
}

function wslCustodyStart(opts: GeneratorOptions): string[] {
  if (!opts.chainOfCustody) {
    return [];
  }
  return [
    'exec > >(tee -a "$DEST/collection-log.txt") 2>&1',
    'STARTED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")',
    "",
  ];
}

function wslCustodyEnd(opts: GeneratorOptions): string[] {
  if (!opts.chainOfCustody) {
    return [];
  }
  return [
    "",
    "{",
    `    echo ${quoteBashSingle(`Case: ${opts.caseId ?? ""}`)}`,
    `    echo ${quoteBashSingle(`Examiner: ${opts.examiner ?? ""}`)}`,
    '    echo "Host: $(hostname)"',
    '    echo "Collected by: $(whoami)"',
    '    echo "Source: $SRC"',
    '    echo "Started (UTC): $STARTED"',
    '    echo "Finished (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"',
    '} > "$DEST/collection-info.txt"',
    '(cd "$DEST" && find . -type f ! -name SHA256SUMS ! -name collection-log.txt -print0 | xargs -0 sha256sum > SHA256SUMS)',
  ];
}

export function generateWsl(
  target: KapeTarget,
  opts: GeneratorOptions
): string {
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
    "",
    ...lockedEntryWarning(target, "#"),
    "set -u",
    "",
    `SRC="${wslSourceRoot}"`,
    `DEST="${wslDest}"`,
    "COPIED=0",
    "MISSED=0",
    'mkdir -p "$DEST"',
    ...wslCustodyStart(opts),
    "",
    "copy_artifact() {",
    "    local src_pattern=$1",
    "    local dest_name=$2",
    "    local mask=${3:-}",
    "    local recurse=${4:-0}",
    "    local depth=()",
    '    [ "$recurse" = "1" ] || depth=(-maxdepth 1)',
    "    # Expand wildcards (e.g. 'Program Files*'). compgen -G handles",
    "    # patterns containing spaces without word-splitting issues.",
    "    local matches",
    '    mapfile -t matches < <(compgen -G "$src_pattern" 2>/dev/null)',
    '    if [ "${#matches[@]}" -eq 0 ]; then',
    "        MISSED=$((MISSED + 1))",
    "        return",
    "    fi",
    '    mkdir -p "$DEST/$dest_name"',
    '    for src in "${matches[@]}"; do',
    '        [ -d "$src" ] || continue',
    `        if [[ "$mask" == ${REGEX_MASK_MARKER}* ]]; then`,
    `            (cd "$src" && find . \${depth[@]+"\${depth[@]}"} -type f -regextype posix-extended -regex ".*/\${mask#${REGEX_MASK_MARKER}}" -exec cp -p --parents {} "$DEST/$dest_name/" \\;) 2>/dev/null`,
    "        else",
    `            (cd "$src" && find . \${depth[@]+"\${depth[@]}"} -type f -name "\${mask:-*}" -exec cp -p --parents {} "$DEST/$dest_name/" \\;) 2>/dev/null`,
    "        fi",
    "    done",
    "    COPIED=$((COPIED + 1))",
    "}",
    "",
  ];

  for (const entry of nonUserEntries) {
    const src = toWslPath(stripTrailingBackslash(entry.path));
    lines.push(
      `# ${entry.name}`,
      wslCopyCall(entry, quoteBashSingle(src), quoteBashSingle(entry.safeName))
    );
  }

  if (userEntries.length > 0) {
    lines.push("", "# Iterate every user profile under the source drive");
    lines.push(
      'for user_dir in "$SRC"/Users/*/; do',
      '    user_name=$(basename "$user_dir")'
    );
    lines.push(
      '    case "$user_name" in',
      `        ${RESERVED_PROFILE_FOLDERS.map((n) => `"${n}"`).join("|")}) continue ;;`
    );
    lines.push("    esac");
    for (const entry of userEntries) {
      const rel = (entry.relativeFromUserRoot ?? "").replaceAll("\\", "/");
      const srcExpr = rel
        ? `"\${user_dir}"${quoteBashSingle(rel)}`
        : `"$user_dir"`;
      const destName = `"${entry.safeName}_$user_name"`;
      lines.push(
        `    # ${entry.name}`,
        `    ${wslCopyCall(entry, srcExpr, destName)}`
      );
    }
    lines.push("done");
  }

  lines.push(...wslCustodyEnd(opts), "");
  lines.push(
    'echo -e "\\033[32mCollection complete. Copied: $COPIED  Missed: $MISSED\\033[0m"'
  );

  return lines.join("\n");
}
