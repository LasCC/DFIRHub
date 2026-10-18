import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  generateBatch,
  generateKapeCommand,
  generatePowerShell,
  generateWsl,
} from "../generators";
import { getResolvedEntries } from "../kapefiles";
import type { KapeTarget } from "../kapefiles";

// Fixture mirroring the real AnyDesk.tkape — covers:
//   * %user% expansion (multi-user iteration)
//   * trailing-backslash vs. no-trailing-backslash on Path
//   * entries with and without FileMask
//   * entries with special-character Names (spaces, dashes, dots)
const anyDesk: KapeTarget = {
  author: "Andrew Rathbun, Scott Hanson, and Nicole Jao",
  category: "Apps",
  description: "AnyDesk",
  documentation: [],
  id: "6c3736f5-39e2-4cce-9af8-02c76c09b91c",
  isCompound: false,
  name: "AnyDesk",
  recreateDirectories: true,
  referencedTargets: [],
  slug: "anydesk",
  sourceFile: "AnyDesk.tkape",
  targets: [
    {
      category: "Communications",
      fileMask: "*.trace",
      name: "AnyDesk Logs - User Profile - *.trace",
      path: "C:\\Users\\%user%\\AppData\\Roaming\\AnyDesk\\",
    },
    {
      category: "Communications",
      fileMask: "*.trace",
      name: "AnyDesk Logs - ProgramData - *.trace",
      path: "C:\\ProgramData\\AnyDesk\\",
    },
    {
      category: "Communications",
      fileMask: "*.anydesk",
      name: "AnyDesk Videos",
      path: "C:\\Users\\%user%\\Videos\\AnyDesk\\",
    },
    {
      category: "Communications",
      name: "AnyDesk Logs - System User Account",
      path: "C:\\Windows\\SysWOW64\\config\\systemprofile\\AppData\\Roaming\\AnyDesk\\",
    },
    {
      category: "Communications",
      fileMask: "*.txt",
      name: "AnyDesk Chat Logs - User Profile",
      path: "C:\\Users\\%user%\\AppData\\Roaming\\AnyDesk\\chat",
    },
    {
      category: "Communications",
      fileMask: "file_transfer_trace.txt",
      name: "AnyDesk File Transfer Logs - Running in portable mode",
      path: "C:\\Users\\%user%\\AppData\\Roaming\\AnyDesk",
    },
  ],
  version: "1.5",
};

const compound: KapeTarget = {
  ...anyDesk,
  isCompound: true,
  name: "PackageManagers",
  referencedTargets: ["Chocolatey.tkape"],
  slug: "packagemanagers",
  targets: [{ category: "Compound", path: "Chocolatey.tkape", name: "" }],
};

const defaultOpts = { destination: "D:\\Evidence", source: "C:" };

describe("generateKapeCommand", () => {
  it("emits a basic command", () => {
    expect(generateKapeCommand(anyDesk, defaultOpts)).toBe(
      "kape.exe --tsource C: --tdest D:\\Evidence --target AnyDesk"
    );
  });

  it("threads --vss and --vhdx flags", () => {
    const cmd = generateKapeCommand(anyDesk, {
      ...defaultOpts,
      useVhdx: true,
      useVss: true,
    });
    expect(cmd).toContain("--vss");
    expect(cmd).toContain("--vhdx evidence");
  });
});

describe("generatePowerShell — AnyDesk", () => {
  const script = generatePowerShell(anyDesk, defaultOpts);

  it("does NOT fall back to $env:USERPROFILE (the original bug)", () => {
    expect(script).not.toContain("$env:USERPROFILE");
    expect(script).not.toContain("$env:USERNAME");
  });

  it("iterates every user profile under $SourceRoot\\Users", () => {
    expect(script).toContain('Get-ChildItem "$SourceRoot\\Users" -Directory');
    expect(script).toMatch(/ForEach-Object \{/);
  });

  it("honors a custom source drive for BOTH user and system paths", () => {
    const mounted = generatePowerShell(anyDesk, {
      destination: "D:\\Evidence",
      source: "E:",
    });
    expect(mounted).toContain('$SourceRoot = "E:"');
    expect(mounted).toContain("'E:\\ProgramData\\AnyDesk'");
    expect(mounted).not.toContain("C:\\ProgramData\\AnyDesk");
    expect(mounted).not.toContain("C:\\Users");
  });

  it("skips reserved profile folders", () => {
    expect(script).toContain("'All Users'");
    expect(script).toContain("'Default'");
    expect(script).toContain("'Default User'");
    expect(script).toContain("'Public'");
  });

  it("suffixes per-user folder names with the username to avoid collisions", () => {
    expect(script).toContain("$UserName");
    expect(script).toMatch(/AnyDesk_Logs_User_Profile_trace_\$UserName/);
  });

  it("collapses underscore runs in folder names", () => {
    // original generator produced "AnyDesk_Logs___User_Profile_____trace"
    expect(script).not.toContain("___");
    expect(script).not.toMatch(/_ _/);
  });

  it("preserves Path vs. FileMask relationship for trailing-slash-less paths", () => {
    // chat dir (no trailing \) + *.txt
    expect(script).toMatch(/AppData\\Roaming\\AnyDesk\\chat/);
    // file_transfer path (no trailing \) + file_transfer_trace.txt
    expect(script).toMatch(/AppData\\Roaming\\AnyDesk/);
  });

  it("flattens a compound target into copy commands for resolved paths", () => {
    // Mirrors what [slug].astro does: server-side flatten via
    // `getResolvedEntries`, then hand the flat target to the generator.
    const flat: KapeTarget = {
      ...compound,
      targets: getResolvedEntries(compound),
    };
    const out = generatePowerShell(flat, defaultOpts);
    expect(out).not.toContain("use KAPE directly");
    expect(out).toContain("Collect-Artifact");
    // PackageManagers references Chocolatey.tkape, whose Path lives under
    // C:\ProgramData\chocolatey — confirms transitive resolution worked.
    expect(out).toContain("chocolatey");
  });
});

// Mirrors the real ScreenConnect.tkape — exercises wildcard expansion in
// mid-path segments ("Program Files*") and at the leaf ("ScreenConnect Client*").
const wildcardTarget: KapeTarget = {
  ...anyDesk,
  isCompound: false,
  name: "ScreenConnect",
  referencedTargets: [],
  slug: "screenconnect",
  sourceFile: "ScreenConnect.tkape",
  targets: [
    {
      category: "ApplicationLogs",
      fileMask: "Session.db",
      name: "ScreenConnect Session Database",
      path: "C:\\Program Files*\\ScreenConnect\\App_Data\\",
    },
    {
      category: "ApplicationLogs",
      fileMask: "user.config",
      name: "ScreenConnect User Config",
      path: "C:\\ProgramData\\ScreenConnect Client*\\",
    },
  ],
};

describe("wildcard expansion in path segments", () => {
  it("PowerShell uses Get-Item to glob and iterates matching directories", () => {
    const out = generatePowerShell(wildcardTarget, defaultOpts);
    // robocopy itself can't expand wildcards, so the script must enumerate
    // matches first via Get-Item and loop with foreach.
    expect(out).toContain("Get-Item -Path $SourceDir");
    expect(out).toContain("foreach ($src in $sources)");
    // robocopy receives the resolved FullName, never the raw wildcarded path.
    expect(out).toContain("robocopy $src.FullName");
    expect(out).not.toContain("Test-Path -LiteralPath");
  });

  it("Batch shells out to PowerShell for wildcarded source paths", () => {
    const out = generateBatch(wildcardTarget, defaultOpts);
    // Wildcarded entry uses for /F + powershell Get-Item enumeration.
    expect(out).toContain('for /F "usebackq delims="');
    expect(out).toContain("powershell -NoProfile");
    expect(out).toContain("Get-Item -Path");
    // robocopy operates on the per-iteration variable, not the raw pattern.
    expect(out).toMatch(/robocopy "%%D\\"/);
  });

  it("Batch keeps simple if-exist + robocopy for non-wildcarded paths", () => {
    const out = generateBatch(anyDesk, defaultOpts);
    // AnyDesk has no wildcards in non-user paths, so the original form stays.
    expect(out).not.toContain("powershell -NoProfile");
    expect(out).toContain('if exist "C:\\ProgramData\\AnyDesk\\"');
  });

  it("WSL uses compgen -G to expand wildcards safely", () => {
    const out = generateWsl(wildcardTarget, defaultOpts);
    expect(out).toContain('compgen -G "$src_pattern"');
    expect(out).toContain("mapfile -t matches");
    expect(out).toContain('for src in "${matches[@]}"');
    // The raw `find "$src_dir"` form is gone — find now runs on each match.
    expect(out).not.toContain('find "$src_dir"');
  });

  it("WSL passes bash syntax check with wildcarded paths", () => {
    const out = generateWsl(wildcardTarget, defaultOpts);
    const dir = mkdtempSync(join(tmpdir(), "dfirhub-wsl-wc-"));
    const file = join(dir, "collect.sh");
    writeFileSync(file, out, "utf-8");
    try {
      execFileSync("bash", ["-n", file], { stdio: "pipe" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("generateBatch — AnyDesk", () => {
  const script = generateBatch(anyDesk, defaultOpts);

  it("uses delayed expansion for reserved-folder skipping", () => {
    expect(script).toContain("setlocal EnableDelayedExpansion");
    expect(script).toContain(`if /I "%%~nxU"=="All Users" set "SKIP=1"`);
    expect(script).toContain(`if "!SKIP!"=="0"`);
  });

  it("iterates under %SRC%\\Users\\* rather than %USERNAME%", () => {
    expect(script).toContain(`for /D %%U in ("%SRC%\\Users\\*")`);
    expect(script).not.toContain("%USERNAME%");
  });

  it("does not use goto labels inside parenthesized for blocks", () => {
    // goto inside a for (...) body is a common batch footgun
    expect(script).not.toMatch(/\(\s*[\s\S]*?goto :/);
  });

  it("honors a custom source drive", () => {
    const mounted = generateBatch(anyDesk, {
      destination: "D:\\Evidence",
      source: "E:",
    });
    expect(mounted).toContain(`set "SRC=E:"`);
    expect(mounted).toContain(`"E:\\ProgramData\\AnyDesk\\"`);
    expect(mounted).not.toContain("C:\\Users");
  });

  it("uses CRLF line endings for Windows compatibility", () => {
    expect(script.includes("\r\n")).toBe(true);
  });
});

describe("generateWsl — AnyDesk", () => {
  const script = generateWsl(anyDesk, defaultOpts);

  it("iterates under $SRC/Users/*/ rather than detecting one user", () => {
    expect(script).toContain('for user_dir in "$SRC"/Users/*/');
    expect(script).not.toContain("cmd.exe");
  });

  it("skips reserved folders with a case statement", () => {
    expect(script).toContain('"All Users"|"Default"|"Default User"|"Public"');
  });

  it("mounts the custom source drive under /mnt/<drive>", () => {
    const mounted = generateWsl(anyDesk, {
      destination: "/mnt/d/Evidence",
      source: "E:",
    });
    expect(mounted).toContain('SRC="/mnt/e"');
  });

  it("passes bash -n syntax check", () => {
    const dir = mkdtempSync(join(tmpdir(), "dfirhub-wsl-"));
    const file = join(dir, "collect.sh");
    writeFileSync(file, script, "utf-8");
    try {
      execFileSync("bash", ["-n", file], { stdio: "pipe" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("parses the compound variant without syntax errors", () => {
    const out = generateWsl(compound, defaultOpts);
    const dir = mkdtempSync(join(tmpdir(), "dfirhub-wsl-"));
    const file = join(dir, "collect.sh");
    writeFileSync(file, out, "utf-8");
    try {
      execFileSync("bash", ["-n", file], { stdio: "pipe" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

const mixedTarget: KapeTarget = {
  ...anyDesk,
  name: "Mixed",
  slug: "mixed",
  sourceFile: "!Mixed.tkape",
  targets: [
    {
      category: "FileSystem",
      fileMask: "$MFT",
      name: "$MFT",
      path: "C:\\",
    },
    {
      category: "Executables",
      fileMask: "*.pf",
      name: "Prefetch",
      path: "C:\\Windows\\prefetch\\",
    },
    {
      category: "Logs",
      fileMask: "*.log",
      name: "Recursive logs",
      path: "C:\\ProgramData\\Vendor\\",
      recursive: true,
    },
    {
      category: "SQLiteDatabases",
      fileMask: "regex:*.+\\.(db|db-wal)",
      name: "SQLite",
      path: "C:\\Users\\%user%\\AppData\\Local\\App\\",
      recursive: true,
    },
  ],
};

const custodyOpts = {
  ...defaultOpts,
  caseId: "IR-'42'",
  chainOfCustody: true,
  examiner: "Analyst",
};

describe("KAPE target naming", () => {
  it("keeps the leading ! that KAPE needs to find compound targets", () => {
    expect(generateKapeCommand(mixedTarget, defaultOpts)).toContain(
      "--target !Mixed"
    );
  });
});

describe("Recursive and regex file masks", () => {
  it("PowerShell recurses only for entries marked Recursive", () => {
    const out = generatePowerShell(mixedTarget, defaultOpts);
    expect(out).toContain(
      "Collect-Artifact -SourceDir 'C:\\Windows\\prefetch' -FileMask '*.pf' -FolderName 'Prefetch'\n"
    );
    expect(out).toContain("-FolderName 'Recursive_logs' -Recurse");
    expect(out).toContain('if ($Recurse) { $RoboFlags += "/E" }');
  });

  it("strips the KAPE regex prefix into a pattern every script can use", () => {
    const out = generatePowerShell(mixedTarget, defaultOpts);
    expect(out).toContain("-FileMask 'regex:.+\\.(db|db-wal)'");
    expect(out).toContain("Where-Object { $_.Name -match $Pattern }");
  });

  it("Batch adds /E only for recursive entries and filters regex masks with PowerShell", () => {
    const out = generateBatch(mixedTarget, defaultOpts);
    expect(out).toMatch(
      /robocopy "C:\\Windows\\prefetch\\" "%DEST%\\Prefetch" "\*\.pf" \/COPY:DAT/
    );
    expect(out).toMatch(/"\*\.log" \/E \/COPY:DAT/);
    expect(out).toContain("-match '.+\\.(db|db-wal)'");
  });

  it("WSL passes the recursion flag and handles regex masks with find -regex", () => {
    const out = generateWsl(mixedTarget, defaultOpts);
    expect(out).toContain(
      "copy_artifact '/mnt/c/Windows/prefetch' 'Prefetch' '*.pf' 0"
    );
    expect(out).toContain("'Recursive_logs' '*.log' 1");
    expect(out).toContain("-regextype posix-extended");
  });
});

describe("dollar signs in KAPE paths", () => {
  it("keeps $MFT and $Recycle.Bin literal instead of expanding them as variables", () => {
    const ps = generatePowerShell(mixedTarget, defaultOpts);
    const wsl = generateWsl(mixedTarget, defaultOpts);
    expect(ps).toContain("-FileMask '$MFT'");
    expect(ps).not.toContain('"$MFT"');
    expect(wsl).toContain("'$MFT'");
    expect(wsl).not.toContain('"$MFT"');
  });
});

describe("locked file warning", () => {
  it("lists paths a live copy cannot read in every script", () => {
    for (const out of [
      generatePowerShell(mixedTarget, defaultOpts),
      generateBatch(mixedTarget, defaultOpts),
      generateWsl(mixedTarget, defaultOpts),
    ]) {
      expect(out).toContain("WARNING: 1 path is locked by Windows");
      expect(out).toContain("- $MFT");
    }
  });

  it("stays silent when nothing is locked", () => {
    expect(generatePowerShell(anyDesk, defaultOpts)).not.toContain("WARNING");
  });
});

describe("chain of custody", () => {
  it("PowerShell writes a transcript, case info and a SHA-256 manifest", () => {
    const out = generatePowerShell(mixedTarget, custodyOpts);
    expect(out).toContain("Start-Transcript");
    expect(out).toContain("'Case: IR-''42'''");
    expect(out).toContain("Get-FileHash -Algorithm SHA256");
    expect(out.indexOf("Stop-Transcript")).toBeLessThan(
      out.indexOf("Get-FileHash")
    );
  });

  it("Batch strips characters that would break echo", () => {
    const out = generateBatch(mixedTarget, {
      ...custodyOpts,
      caseId: "IR&42|x>y",
    });
    expect(out).toContain("echo Case: IR42xy");
    expect(out).toContain("SHA256SUMS.csv");
  });

  it("is off unless asked for", () => {
    expect(generatePowerShell(mixedTarget, defaultOpts)).not.toContain(
      "Start-Transcript"
    );
  });

  it("WSL custody script passes bash -n", () => {
    const out = generateWsl(mixedTarget, custodyOpts);
    expect(out).toContain("sha256sum");
    const dir = mkdtempSync(join(tmpdir(), "dfirhub-wsl-coc-"));
    const file = join(dir, "collect.sh");
    writeFileSync(file, out, "utf-8");
    try {
      execFileSync("bash", ["-n", file], { stdio: "pipe" });
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
