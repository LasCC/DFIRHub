import { describe, expect, test } from "vitest";

import {
  getRelatedKapeTargets,
  getRelatedSigmaCategories,
  parseLogsourceFromYaml,
} from "../sigma-mapping";

const VALID_SIGMA_RULE = `title: Test Rule
status: test
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains: 'test'
    condition: selection
level: medium`;

describe("SigmaMapping", () => {
  describe("getRelatedKapeTargets", () => {
    test("should map process_creation logsource to Prefetch, Amcache, etc.", () => {
      const targets = getRelatedKapeTargets({
        category: "process_creation",
        product: "windows",
      });
      expect(targets.map((t) => t.name)).toContain("Prefetch");
      expect(targets.map((t) => t.name)).toContain("Amcache");
    });

    test("should map registry_event to Registry Hives", () => {
      const targets = getRelatedKapeTargets({
        category: "registry_event",
        product: "windows",
      });
      expect(targets.some((t) => t.name.includes("Registry"))).toBe(true);
    });

    test("should return empty array for unknown logsource", () => {
      const targets = getRelatedKapeTargets({
        category: "unknown_category",
        product: "unknown",
      });
      expect(targets).toEqual([]);
    });

    test("should map file_event to filesystem artifacts", () => {
      const targets = getRelatedKapeTargets({
        category: "file_event",
        product: "windows",
      });
      expect(targets.map((t) => t.name)).toContain("$MFT");
      expect(targets.map((t) => t.name)).toContain("$UsnJrnl");
    });

    test("should map network_connection to SRUM and EventLogs", () => {
      const targets = getRelatedKapeTargets({
        category: "network_connection",
        product: "windows",
      });
      expect(targets.map((t) => t.name)).toContain("SRUM");
      expect(targets.map((t) => t.name)).toContain("Event Logs");
    });
  });

  describe("getRelatedSigmaCategories", () => {
    test("should map Prefetch artifact to process_creation", () => {
      const categories = getRelatedSigmaCategories("Prefetch");
      expect(categories).toContain("process_creation");
    });

    test("should map EventLogs to multiple categories", () => {
      const categories = getRelatedSigmaCategories("EventLogs");
      expect(categories.length).toBeGreaterThan(1);
    });

    test("should return empty array for unknown artifact", () => {
      const categories = getRelatedSigmaCategories("nonexistent");
      expect(categories).toEqual([]);
    });
  });

  describe("parseLogsourceFromYaml", () => {
    test("should extract logsource from valid Sigma YAML", () => {
      const logsource = parseLogsourceFromYaml(VALID_SIGMA_RULE);
      expect(logsource?.category).toBe("process_creation");
      expect(logsource?.product).toBe("windows");
    });

    test("should return null for invalid YAML", () => {
      const logsource = parseLogsourceFromYaml("not valid yaml: [: bad");
      expect(logsource).toBeNull();
    });

    test("should return null for YAML without logsource", () => {
      const logsource = parseLogsourceFromYaml(
        "title: No logsource\nlevel: high"
      );
      expect(logsource).toBeNull();
    });
  });
});
