import { CircleCheck, LoaderCircle } from "lucide-react";

import type { LocatedRuleCheck } from "@/lib/sigma/rule-checks";
import type { RuleCheckSeverity } from "@/lib/sigma/types";

const SEVERITY_STYLES: Record<RuleCheckSeverity, string> = {
  error: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  low: "border-overlay/[0.12] bg-overlay/[0.06] text-muted-foreground",
  medium:
    "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

interface RuleChecksProps {
  checks: LocatedRuleCheck[] | null;
  isEngineReady: boolean;
  isChecking: boolean;
  onRevealLine: (line: number) => void;
}

function countBySeverity(checks: LocatedRuleCheck[]) {
  const counts = new Map<RuleCheckSeverity, number>();
  for (const check of checks) {
    counts.set(check.severity, (counts.get(check.severity) ?? 0) + 1);
  }
  return counts;
}

function ChecksSummary({ checks }: { checks: LocatedRuleCheck[] }) {
  const counts = countBySeverity(checks);
  const parts = (["error", "high", "medium", "low"] as const)
    .filter((severity) => counts.has(severity))
    .map((severity) => `${counts.get(severity)} ${severity}`);
  const issueLabel = checks.length === 1 ? "issue" : "issues";
  return <span>{`${checks.length} ${issueLabel} · ${parts.join(", ")}`}</span>;
}

function StatusLine({ checks, isEngineReady, isChecking }: RuleChecksProps) {
  if (!isEngineReady) {
    return <span>Waiting for pySigma</span>;
  }
  if (isChecking && !checks) {
    return (
      <span className="flex items-center gap-1.5">
        <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        Checking the rule…
      </span>
    );
  }
  if (!checks) {
    return <span>Paste a rule to check it</span>;
  }
  if (checks.length === 0) {
    return (
      <span className="flex items-center gap-1.5 text-primary">
        <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
        No issues found
      </span>
    );
  }
  return <ChecksSummary checks={checks} />;
}

export function RuleChecks(props: RuleChecksProps) {
  const { checks, onRevealLine } = props;
  return (
    <section aria-labelledby="rule-checks-heading" className="p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3
          className="font-medium text-foreground text-sm"
          id="rule-checks-heading"
        >
          Rule checks
        </h3>
        <p aria-live="polite" className="text-muted-foreground text-xs">
          <StatusLine {...props} />
        </p>
      </div>
      {checks && checks.length > 0 && (
        <ul className="fade-y max-h-96 space-y-1 overflow-y-auto">
          {checks.map((check) => (
            <li key={`${check.code}-${check.resolvedLine}-${check.summary}`}>
              <button
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-overlay/[0.04] focus-ring"
                onClick={() => onRevealLine(check.resolvedLine)}
                title={`Go to line ${check.resolvedLine} (${check.code})`}
                type="button"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-xs leading-none ${SEVERITY_STYLES[check.severity]}`}
                >
                  {check.severity}
                </span>
                <span className="min-w-0 flex-1 text-foreground/90">
                  {check.summary}
                </span>
                <span className="shrink-0 font-mono text-muted-foreground text-xs">
                  L{check.resolvedLine}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
