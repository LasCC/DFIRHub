import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../config";
import type { KapeConfig } from "../config";
import {
  formatKapeBatchFile,
  formatKapeCommand,
  quoteArgument,
  validateKapeConfig,
} from "../kapeCommand";

function configWith(patch: Partial<KapeConfig>): KapeConfig {
  return { ...DEFAULT_CONFIG, ...patch };
}

function issueMessages(config: KapeConfig, level: string): string[] {
  return validateKapeConfig(config)
    .filter((issue) => issue.level === level)
    .map((issue) => issue.message);
}

describe("formatKapeCommand", () => {
  it("builds a target and module command with the KAPE names", () => {
    const command = formatKapeCommand(
      configWith({ modules: ["!EZParser"], targets: ["!SANS_Triage"] })
    );
    expect(command).toBe(
      ".\\kape.exe --tsource C: --tdest D:\\KAPE\\%m\\Targets --target !SANS_Triage --mdest D:\\KAPE\\%m\\Modules --module !EZParser"
    );
  });

  it("quotes target lists that contain spaces", () => {
    const command = formatKapeCommand(
      configWith({ targets: ["Everything (VoidTools)", "Prefetch"] })
    );
    expect(command).toContain('--target "Everything (VoidTools),Prefetch"');
  });

  it("drops the trailing backslash inside quotes so it cannot escape the quote", () => {
    expect(quoteArgument("E:\\My Cases\\")).toBe('"E:\\My Cases"');
  });

  it("quotes SAS URIs that contain ampersands", () => {
    const command = formatKapeCommand(
      configWith({
        azureSasUri: "https://acct.blob.core.windows.net/c/?sp=w&sig=x",
        container: "zip",
        targets: ["Prefetch"],
        transfer: "azure",
      })
    );
    expect(command).toContain(
      '--asu "https://acct.blob.core.windows.net/c/?sp=w&sig=x"'
    );
  });

  it("emits --zv false only for virtual disks that should stay unzipped", () => {
    const vhdx = formatKapeCommand(
      configWith({
        container: "vhdx",
        targets: ["Prefetch"],
        zipContainer: false,
      })
    );
    const zip = formatKapeCommand(
      configWith({
        container: "zip",
        targets: ["Prefetch"],
        zipContainer: false,
      })
    );
    expect(vhdx).toContain("--vhdx evidence --zv false");
    expect(zip).not.toContain("--zv");
  });

  it("leaves transfer switches out when there is nothing KAPE can upload", () => {
    const command = formatKapeCommand(
      configWith({
        sftpServer: "10.0.0.5",
        targets: ["Prefetch"],
        transfer: "sftp",
      })
    );
    expect(command).not.toContain("--scs");
  });

  it("adds SFTP switches and skips the default port", () => {
    const command = formatKapeCommand(
      configWith({
        container: "vhdx",
        sftpDirectory: "cases/001",
        sftpServer: "10.0.0.5",
        sftpUser: "kape",
        targets: ["Prefetch"],
        transfer: "sftp",
      })
    );
    expect(command).toContain("--scs 10.0.0.5 --scu kape --scd cases/001");
    expect(command).not.toContain("--scp");
  });

  it("runs modules alone against a live system with --msource", () => {
    const command = formatKapeCommand(
      configWith({ modules: ["LiveResponse_NetworkDetails"], msource: "C:\\" })
    );
    expect(command).toBe(
      ".\\kape.exe --msource C:\\ --mdest D:\\KAPE\\%m\\Modules --module LiveResponse_NetworkDetails"
    );
  });
});

describe("formatKapeBatchFile", () => {
  it("writes one CRLF line without kape.exe and adds the batch switches", () => {
    const file = formatKapeBatchFile(
      configWith({ cleanup: true, linear: true, targets: ["KapeTriage"] })
    );
    expect(file.startsWith("--tsource C:")).toBe(true);
    expect(file).toContain("--ul --cu");
    expect(file.endsWith("\r\n")).toBe(true);
    expect(file).not.toContain("kape.exe");
  });
});

describe("validateKapeConfig", () => {
  it("asks for a selection when nothing is picked", () => {
    expect(issueMessages(DEFAULT_CONFIG, "error")).toHaveLength(1);
  });

  it("rejects a transfer without a container or zipped module output", () => {
    const errors = issueMessages(
      configWith({
        sftpServer: "host",
        sftpUser: "user",
        targets: ["Prefetch"],
        transfer: "sftp",
      }),
      "error"
    );
    expect(errors.some((message) => message.includes("only uploads"))).toBe(
      true
    );
  });

  it("rejects an SFTP directory with a leading slash", () => {
    const errors = issueMessages(
      configWith({
        container: "zip",
        sftpDirectory: "/cases",
        sftpServer: "host",
        sftpUser: "user",
        targets: ["Prefetch"],
        transfer: "sftp",
      }),
      "error"
    );
    expect(errors.some((message) => message.includes("--scd"))).toBe(true);
  });

  it("warns when the container name looks like a file name", () => {
    const warnings = issueMessages(
      configWith({
        container: "vhdx",
        containerName: "host.vhdx",
        targets: ["Prefetch"],
      }),
      "warning"
    );
    expect(warnings.some((message) => message.includes("base name"))).toBe(
      true
    );
  });

  it("warns when evidence is written to the source drive", () => {
    const warnings = issueMessages(
      configWith({ targets: ["Prefetch"], tdest: "C:\\Evidence" }),
      "warning"
    );
    expect(
      warnings.some((message) => message.includes("source drive C:"))
    ).toBe(true);
  });

  it("asks for --msource on a module-only run", () => {
    const errors = issueMessages(
      configWith({ modules: ["!EZParser"] }),
      "error"
    );
    expect(errors.some((message) => message.includes("--msource"))).toBe(true);
  });
});
