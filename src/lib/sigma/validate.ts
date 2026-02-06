import yaml from "js-yaml";

export interface SigmaDiagnostic {
  message: string;
  startLine: number; // 1-based
  startCol: number;
  endLine: number;
  endCol: number;
  severity: "error" | "warning" | "info";
}

const REQUIRED_FIELDS = ["title", "logsource", "detection"];
const RECOMMENDED_FIELDS = ["description", "status", "level"];
const VALID_STATUSES = [
  "stable",
  "test",
  "experimental",
  "deprecated",
  "unsupported",
];
const VALID_LEVELS = ["informational", "low", "medium", "high", "critical"];

const keyRegexCache = new Map<string, RegExp>();

function getKeyRegex(key: string): RegExp {
  let re = keyRegexCache.get(key);
  if (!re) {
    re = new RegExp(`^${key}\\s*:`);
    keyRegexCache.set(key, re);
  }
  return re;
}

function findKeyLine(lines: string[], key: string): number {
  const regex = getKeyRegex(key);
  const idx = lines.findIndex((l) => regex.test(l));
  return idx >= 0 ? idx + 1 : 1;
}

export function validateSigmaRule(content: string): SigmaDiagnostic[] {
  const diagnostics: SigmaDiagnostic[] = [];

  if (!content.trim()) return diagnostics;

  // 1. Parse YAML
  let doc: Record<string, unknown>;
  try {
    const parsed = yaml.load(content);
    if (!parsed || typeof parsed !== "object") {
      diagnostics.push({
        message: "Document must be a YAML mapping",
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 1000,
        severity: "error",
      });
      return diagnostics;
    }
    doc = parsed as Record<string, unknown>;
  } catch (e: unknown) {
    const yamlError = e as {
      mark?: { line?: number };
      reason?: string;
      message?: string;
    };
    const line = yamlError.mark?.line ? yamlError.mark.line + 1 : 1;
    diagnostics.push({
      message: `YAML parse error: ${yamlError.reason || yamlError.message}`,
      startLine: line,
      startCol: 1,
      endLine: line,
      endCol: 1000,
      severity: "error",
    });
    return diagnostics;
  }

  // 2. Required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in doc)) {
      diagnostics.push({
        message: `Missing required field: '${field}'`,
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 1,
        severity: "error",
      });
    }
  }

  // 3. Recommended fields
  for (const field of RECOMMENDED_FIELDS) {
    if (!(field in doc)) {
      diagnostics.push({
        message: `Missing recommended field: '${field}'`,
        startLine: 1,
        startCol: 1,
        endLine: 1,
        endCol: 1,
        severity: "warning",
      });
    }
  }

  // Split lines once for all findKeyLine calls
  const lines = content.split("\n");

  // 4. detection must have 'condition'
  if (
    doc.detection &&
    typeof doc.detection === "object" &&
    !("condition" in (doc.detection as Record<string, unknown>))
  ) {
    const line = findKeyLine(lines, "detection");
    diagnostics.push({
      message: "Detection section missing 'condition' field",
      startLine: line,
      startCol: 1,
      endLine: line,
      endCol: 1000,
      severity: "error",
    });
  }

  // 5. logsource validation
  if (doc.logsource && typeof doc.logsource === "object") {
    const logsource = doc.logsource as Record<string, unknown>;
    if (!(logsource.category || logsource.product || logsource.service)) {
      const line = findKeyLine(lines, "logsource");
      diagnostics.push({
        message:
          "Logsource should have at least one of: category, product, service",
        startLine: line,
        startCol: 1,
        endLine: line,
        endCol: 1000,
        severity: "warning",
      });
    }
  }

  // 6. Validate status enum
  if (
    doc.status &&
    typeof doc.status === "string" &&
    !VALID_STATUSES.includes(doc.status)
  ) {
    const line = findKeyLine(lines, "status");
    diagnostics.push({
      message: `Invalid status: '${doc.status}'. Expected: ${VALID_STATUSES.join(", ")}`,
      startLine: line,
      startCol: 1,
      endLine: line,
      endCol: 1000,
      severity: "warning",
    });
  }

  // 7. Validate level enum
  if (
    doc.level &&
    typeof doc.level === "string" &&
    !VALID_LEVELS.includes(doc.level)
  ) {
    const line = findKeyLine(lines, "level");
    diagnostics.push({
      message: `Invalid level: '${doc.level}'. Expected: ${VALID_LEVELS.join(", ")}`,
      startLine: line,
      startCol: 1,
      endLine: line,
      endCol: 1000,
      severity: "warning",
    });
  }

  return diagnostics;
}
