import type {
  RuleCheck,
  RuleCheckDetailValue,
  RuleCheckSeverity,
} from "./types";
import type { SigmaDiagnostic } from "./validate";

const FIRST_LINE = 1;
const WHOLE_LINE_END_COLUMN = 1000;

const SEVERITY_ORDER: Record<RuleCheckSeverity, number> = {
  error: 0,
  high: 1,
  low: 3,
  medium: 2,
};

const DIAGNOSTIC_SEVERITY: Record<
  RuleCheckSeverity,
  SigmaDiagnostic["severity"]
> = {
  error: "error",
  high: "warning",
  low: "info",
  medium: "info",
};

const TOP_LEVEL_KEY_BY_CODE_FRAGMENT: [RegExp, string][] = [
  [/Title/u, "title"],
  [/Description/u, "description"],
  [/Modified/u, "modified"],
  [/Date/u, "date"],
  [/Author/u, "author"],
  [/Status/u, "status"],
  [/Level/u, "level"],
  [/Identifier/u, "id"],
  [/Tag|Tlp|Attack|Cve|Car|Stp|Namespace/u, "tags"],
  [/Falsepositive/u, "falsepositives"],
  [/Reference|Link|Github|Mitre/u, "references"],
  [/Logsource/u, "logsource"],
  [/Correlation/u, "correlation"],
  [/FieldsExistence/u, "fields"],
];

const NESTED_KEY_BY_CODE_FRAGMENT: [RegExp, string][] = [
  [/Condition|Them|OfSelection|OfThem/u, "condition"],
];

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

function findLine(lines: string[], pattern: RegExp): number | null {
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? null : index + 1;
}

function findTopLevelKeyLine(lines: string[], key: string): number | null {
  return findLine(lines, new RegExp(`^${escapeRegExp(key)}\\s*:`, "u"));
}

function findNestedKeyLine(lines: string[], key: string): number | null {
  return findLine(lines, new RegExp(`^\\s+${escapeRegExp(key)}\\s*:`, "u"));
}

function findFieldLine(lines: string[], field: string): number | null {
  return findLine(
    lines,
    new RegExp(
      `^\\s*-?\\s*['"]?${escapeRegExp(field)}(?:\\|[^:]*)?['"]?\\s*:`,
      "u"
    )
  );
}

function findTextLine(lines: string[], text: string): number | null {
  return findLine(lines, new RegExp(escapeRegExp(text), "u"));
}

function firstStringDetail(value: RuleCheckDetailValue | undefined) {
  if (typeof value === "string" && value) {
    return value;
  }
  if (Array.isArray(value)) {
    const firstString = value.find((item) => typeof item === "string");
    return typeof firstString === "string" ? firstString : null;
  }
  return null;
}

function locateFromDetails(lines: string[], check: RuleCheck): number | null {
  const { details } = check;
  const field = firstStringDetail(details.field);
  if (field) {
    return findFieldLine(lines, field);
  }
  const detectionName = firstStringDetail(details.detection_name);
  if (detectionName) {
    return findNestedKeyLine(lines, detectionName);
  }
  const tag = firstStringDetail(details.tag) ?? firstStringDetail(details.tags);
  if (tag) {
    return findTextLine(lines, tag);
  }
  const modifier = firstStringDetail(details.modifier);
  if (modifier) {
    return findTextLine(lines, `|${modifier}`);
  }
  return null;
}

function locateFromCode(lines: string[], check: RuleCheck): number | null {
  const nestedMatch = NESTED_KEY_BY_CODE_FRAGMENT.find(([pattern]) =>
    pattern.test(check.code)
  );
  if (nestedMatch) {
    return findNestedKeyLine(lines, nestedMatch[1]);
  }
  const topLevelMatch = TOP_LEVEL_KEY_BY_CODE_FRAGMENT.find(([pattern]) =>
    pattern.test(check.code)
  );
  return topLevelMatch ? findTopLevelKeyLine(lines, topLevelMatch[1]) : null;
}

export function locateRuleCheckLine(ruleText: string, check: RuleCheck) {
  if (check.line) {
    return check.line;
  }
  const lines = ruleText.split("\n");
  return (
    locateFromDetails(lines, check) ??
    locateFromCode(lines, check) ??
    FIRST_LINE
  );
}

function formatDetailValue(value: RuleCheckDetailValue): string {
  if (Array.isArray(value)) {
    return value.map(formatDetailValue).join(", ");
  }
  return String(value);
}

export function describeRuleCheck(check: RuleCheck): string {
  const detailText = Object.entries(check.details)
    .filter(([, value]) => value !== null && value !== "")
    .map(
      ([key, value]) =>
        `${key.replaceAll("_", " ")}: ${formatDetailValue(value)}`
    )
    .join("; ");
  return detailText ? `${check.message} (${detailText})` : check.message;
}

export interface LocatedRuleCheck extends RuleCheck {
  resolvedLine: number;
  summary: string;
}

export function locateRuleChecks(
  ruleText: string,
  checks: RuleCheck[]
): LocatedRuleCheck[] {
  return checks
    .map((check) => ({
      ...check,
      resolvedLine: locateRuleCheckLine(ruleText, check),
      summary: describeRuleCheck(check),
    }))
    .toSorted(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.resolvedLine - b.resolvedLine
    );
}

export function toEditorDiagnostics(
  checks: LocatedRuleCheck[]
): SigmaDiagnostic[] {
  return checks.map((check) => ({
    endCol: WHOLE_LINE_END_COLUMN,
    endLine: check.resolvedLine,
    message: `${check.summary} [pySigma ${check.code}]`,
    severity: DIAGNOSTIC_SEVERITY[check.severity],
    startCol: 1,
    startLine: check.resolvedLine,
  }));
}
