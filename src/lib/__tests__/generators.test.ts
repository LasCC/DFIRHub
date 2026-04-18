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
    expect(mounted).toContain('"E:\\ProgramData\\AnyDesk"');
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

  it("renders a compound target as a KAPE-deferral note", () => {
    const out = generatePowerShell(compound, defaultOpts);
    expect(out).toContain("Compound Target");
    expect(out).toContain("kape.exe");
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
    writeFileSync(file, script, "utf8");
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
    writeFileSync(file, out, "utf8");
    try {
      execFileSync("bash", ["-n", file], { stdio: "pipe" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
