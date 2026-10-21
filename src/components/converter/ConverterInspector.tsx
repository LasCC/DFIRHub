import {
  AlertTriangle,
  ChevronDown,
  CircleCheck,
  LoaderCircle,
  ScrollText,
} from "lucide-react";
import { useMemo, useState } from "react";

import { describeRuleTelemetry } from "@/lib/sigma/logsource-requirements";
import type { LocatedRuleCheck } from "@/lib/sigma/rule-checks";

import { LoggingRequirements } from "./LoggingRequirements";
import { RuleChecks } from "./RuleChecks";

type InspectorPanel = "checks" | "telemetry";

interface ConverterInspectorProps {
  checks: LocatedRuleCheck[] | null;
  isChecking: boolean;
  isEngineReady: boolean;
  onRevealLine: (line: number) => void;
  rule: string;
  selectedPipeline: string;
}

function checkStatus(
  checks: LocatedRuleCheck[] | null,
  isChecking: boolean,
  isEngineReady: boolean
) {
  if (!isEngineReady) {
    return {
      Icon: LoaderCircle,
      label: "Engine starting",
      spin: true,
      tone: "text-muted-foreground",
    };
  }
  if (isChecking && !checks) {
    return {
      Icon: LoaderCircle,
      label: "Checking",
      spin: true,
      tone: "text-muted-foreground",
    };
  }
  if (!checks) {
    return {
      Icon: null,
      label: "No rule",
      spin: false,
      tone: "text-muted-foreground",
    };
  }
  if (checks.length === 0) {
    return {
      Icon: CircleCheck,
      label: "No issues",
      spin: false,
      tone: "text-primary",
    };
  }

  const count = checks.length;
  const hasError = checks.some((check) => check.severity === "error");
  const hasHigh = checks.some((check) => check.severity === "high");
  return {
    Icon: AlertTriangle,
    label: `${count} ${count === 1 ? "issue" : "issues"}`,
    spin: false,
    tone: hasError
      ? "text-red-700 dark:text-red-400"
      : hasHigh
        ? "text-orange-700 dark:text-orange-400"
        : "text-amber-700 dark:text-amber-400",
  };
}

export function ConverterInspector({
  checks,
  isChecking,
  isEngineReady,
  onRevealLine,
  rule,
  selectedPipeline,
}: ConverterInspectorProps) {
  const [openPanel, setOpenPanel] = useState<InspectorPanel | null>(null);
  const telemetry = useMemo(() => describeRuleTelemetry(rule), [rule]);
  const sourceCount = telemetry?.sources.length ?? 0;
  const activePanel =
    openPanel === "telemetry" && sourceCount === 0 ? null : openPanel;
  const status = checkStatus(checks, isChecking, isEngineReady);
  const StatusIcon = status.Icon;

  const toggle = (panel: InspectorPanel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  return (
    <div className="border-overlay/[0.06] border-t bg-overlay/[0.015]">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
        <button
          aria-controls="converter-inspector-body"
          aria-expanded={activePanel === "checks"}
          className={`focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-overlay/[0.05] ${
            activePanel === "checks" ? "bg-overlay/[0.05]" : ""
          }`}
          onClick={() => toggle("checks")}
          type="button"
        >
          <span className="font-medium text-foreground">Rule checks</span>
          <span aria-hidden="true" className="text-muted-foreground/60">
            ·
          </span>
          {StatusIcon && (
            <StatusIcon
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${status.tone} ${status.spin ? "animate-spin" : ""}`}
            />
          )}
          <span className={status.tone}>{status.label}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-3 w-3 text-muted-foreground transition-transform ${
              activePanel === "checks" ? "rotate-180" : ""
            }`}
          />
        </button>

        {sourceCount > 0 && (
          <>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-border sm:block"
            />
            <button
              aria-controls="converter-inspector-body"
              aria-expanded={activePanel === "telemetry"}
              className={`focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-overlay/[0.05] ${
                activePanel === "telemetry" ? "bg-overlay/[0.05]" : ""
              }`}
              onClick={() => toggle("telemetry")}
              type="button"
            >
              <ScrollText
                aria-hidden="true"
                className="h-3.5 w-3.5 text-muted-foreground"
              />
              <span className="font-medium text-foreground">Telemetry</span>
              <span className="text-muted-foreground">
                {sourceCount} {sourceCount === 1 ? "source" : "sources"}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-3 w-3 text-muted-foreground transition-transform ${
                  activePanel === "telemetry" ? "rotate-180" : ""
                }`}
              />
            </button>
          </>
        )}
      </div>

      {activePanel && (
        <section
          aria-label={
            activePanel === "checks"
              ? "Rule check details"
              : "Telemetry requirements"
          }
          className="border-overlay/[0.06] border-t bg-background px-4 py-3"
          id="converter-inspector-body"
        >
          {activePanel === "checks" &&
            (() => {
              if (!isEngineReady) {
                return (
                  <p className="text-muted-foreground text-sm">
                    Checks start with the conversion engine.
                  </p>
                );
              }
              if (!checks) {
                return (
                  <p className="text-muted-foreground text-sm">
                    Paste a rule to check it.
                  </p>
                );
              }
              if (checks.length === 0) {
                return (
                  <p className="flex items-center gap-2 text-muted-foreground text-sm">
                    <CircleCheck
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-primary"
                    />
                    No issues found.
                  </p>
                );
              }
              return <RuleChecks checks={checks} onRevealLine={onRevealLine} />;
            })()}

          {activePanel === "telemetry" && (
            <LoggingRequirements
              selectedPipeline={selectedPipeline}
              telemetry={telemetry}
            />
          )}
        </section>
      )}
    </div>
  );
}
