import { describe, expect, test } from "vitest";

import { DetectionPackageExporter } from "../export";

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

describe("DetectionPackageExporter", () => {
  test("should generate ZIP with original rule", async () => {
    const exporter = new DetectionPackageExporter();
    const zip = await exporter.generate({
      rule: VALID_SIGMA_RULE,
      conversions: new Map([["splunk", "index=main"]]),
      metadata: { title: "Test Rule", level: "medium" },
    });
    const files = Object.keys(zip.files);
    expect(files).toContain("rule.yml");
  });

  test("should include converted queries for each backend", async () => {
    const exporter = new DetectionPackageExporter();
    const zip = await exporter.generate({
      rule: VALID_SIGMA_RULE,
      conversions: new Map([
        ["splunk", "index=main"],
        ["kusto", "SecurityEvent"],
      ]),
      metadata: { title: "Test Rule", level: "medium" },
    });
    const files = Object.keys(zip.files);
    expect(files).toContain("query-splunk.spl");
    expect(files).toContain("query-kusto.kql");
  });

  test("should generate README with metadata", async () => {
    const exporter = new DetectionPackageExporter();
    const zip = await exporter.generate({
      rule: VALID_SIGMA_RULE,
      conversions: new Map([["splunk", "index=main"]]),
      metadata: {
        title: "Test Rule",
        level: "medium",
        mitre: ["attack.t1059"],
      },
    });
    const readme = await zip.file("README.md")?.async("string");
    expect(readme).toContain("Test Rule");
    expect(readme).toContain("T1059");
  });

  test("should include test case template", async () => {
    const exporter = new DetectionPackageExporter();
    const zip = await exporter.generate({
      rule: VALID_SIGMA_RULE,
      conversions: new Map([["splunk", "index=main"]]),
      metadata: { title: "Test Rule", level: "medium" },
    });
    const files = Object.keys(zip.files);
    expect(files).toContain("test-cases.md");
  });

  test("should include author and description in README", async () => {
    const exporter = new DetectionPackageExporter();
    const zip = await exporter.generate({
      rule: VALID_SIGMA_RULE,
      conversions: new Map([["splunk", "index=main"]]),
      metadata: {
        title: "Test Rule",
        level: "high",
        author: "Test Author",
        description: "Test description of the rule",
      },
    });
    const readme = await zip.file("README.md")?.async("string");
    expect(readme).toContain("Test Author");
    expect(readme).toContain("Test description");
  });
});
