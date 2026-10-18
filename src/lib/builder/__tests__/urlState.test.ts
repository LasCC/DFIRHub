import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG, SECRET_FIELDS } from "../config";
import type { KapeConfig } from "../config";
import { configFromSearchParams, configToSearchParams } from "../urlState";

describe("builder URL state", () => {
  it("keeps the default config out of the URL", () => {
    expect(configToSearchParams(DEFAULT_CONFIG).toString()).toBe("");
  });

  it("round-trips selections and options", () => {
    const config: KapeConfig = {
      ...DEFAULT_CONFIG,
      caseId: "IR-42",
      container: "vhdx",
      deduplicate: false,
      format: "cli",
      modules: ["!EZParser", "Hayabusa"],
      targets: ["kapetriage", "everything-voidtools"],
      transfer: "sftp",
      tsource: "E:",
      vss: true,
    };
    const restored = configFromSearchParams(configToSearchParams(config));
    expect(restored).toEqual(config);
  });

  it("never writes secrets into a share link", () => {
    const config: KapeConfig = {
      ...DEFAULT_CONFIG,
      azureSasUri: "https://x/?sig=secret",
      s3AccessKey: "AKIA",
      s3Secret: "secret",
      s3SessionToken: "token",
      s3Url: "https://bucket/?X-Amz-Signature=secret",
      sftpPassword: "hunter2",
      zipPassword: "infected",
    };
    const query = configToSearchParams(config).toString();
    expect(query).toBe("");
    for (const field of SECRET_FIELDS) {
      expect(configFromSearchParams(new URLSearchParams(query))[field]).toBe(
        ""
      );
    }
  });

  it("falls back to defaults for unknown enum values", () => {
    const restored = configFromSearchParams(
      new URLSearchParams("c=iso&tx=ftp&f=exe")
    );
    expect(restored.container).toBe("none");
    expect(restored.transfer).toBe("none");
    expect(restored.format).toBe("kape");
  });
});
