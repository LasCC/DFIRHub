import JSZip from "jszip";
import { getFileExtension } from "./backends";
import { generateReadme, generateTestCases } from "./templates";
import type { ExportPackageOptions } from "./types";

export class DetectionPackageExporter {
  async generate(options: ExportPackageOptions): Promise<JSZip> {
    const zip = new JSZip();

    // Original Sigma rule
    zip.file("rule.yml", options.rule);

    // Converted queries
    for (const [backend, query] of options.conversions) {
      const ext = getFileExtension(backend);
      zip.file(`query-${backend}.${ext}`, query);
    }

    // README with metadata
    const readme = generateReadme(options);
    zip.file("README.md", readme);

    // Test case template
    const testCases = generateTestCases(options);
    zip.file("test-cases.md", testCases);

    return zip;
  }
}
