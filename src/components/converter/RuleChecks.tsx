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
  checks: LocatedRuleCheck[];
  onRevealLine: (line: number) => void;
}

export function RuleChecks({ checks, onRevealLine }: RuleChecksProps) {
  return (
    <ul
      aria-label="Rule checks"
      className="fade-y max-h-80 space-y-0.5 overflow-y-auto"
    >
      {checks.map((check) => (
        <li key={`${check.code}-${check.resolvedLine}-${check.summary}`}>
          <button
            className="focus-ring flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-overlay/[0.04]"
            onClick={() => onRevealLine(check.resolvedLine)}
            title={`Go to line ${check.resolvedLine}`}
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
  );
}
