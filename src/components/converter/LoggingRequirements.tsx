import { Check, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useCallback, useMemo } from "react";

import { useCopyFeedbackKeyed } from "@/hooks/useCopyFeedback";
import type {
  SetupStep,
  TelemetrySource,
} from "@/lib/sigma/logsource-requirements";
import { describeRuleTelemetry } from "@/lib/sigma/logsource-requirements";
import type { Logsource } from "@/lib/sigma/sigma-mapping";

interface LoggingRequirementsProps {
  rule: string;
  selectedPipeline: string;
}

const LOGSOURCE_DISPLAY_KEYS = ["product", "category", "service"] as const;

function formatLogsource(logsource: Logsource) {
  return LOGSOURCE_DISPLAY_KEYS
    .filter((key) => logsource[key])
    .map((key) => `${key}: ${logsource[key]}`)
    .join(" · ");
}

function sortByPipelineMatch(
  sources: TelemetrySource[],
  selectedPipeline: string
): TelemetrySource[] {
  return sources.toSorted(
    (a, b) =>
      Number(b.pipelines.includes(selectedPipeline)) -
      Number(a.pipelines.includes(selectedPipeline))
  );
}

function PolicyPath({ path }: { path: string[] }) {
  return (
    <ol className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-muted-foreground text-xs">
      {path.map((segment, index) => (
        <li className="flex items-center gap-1" key={segment}>
          {index > 0 && (
            <ChevronRight aria-hidden="true" className="h-3 w-3 opacity-60" />
          )}
          <span
            className={index === path.length - 1 ? "text-foreground/90" : ""}
          >
            {segment}
          </span>
        </li>
      ))}
    </ol>
  );
}

interface CommandLineProps {
  command: string;
  copied: boolean;
  onCopy: (command: string) => void;
}

function CommandLine({ command, copied, onCopy }: CommandLineProps) {
  return (
    <div className="mt-1.5 flex items-start gap-2 rounded-md bg-console px-3 py-2">
      <code className="min-w-0 flex-1 break-all font-mono text-console-foreground text-xs">
        {command}
      </code>
      <button
        aria-label={copied ? "Command copied" : "Copy command"}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground focus-ring rounded-sm"
        onClick={() => onCopy(command)}
        type="button"
      >
        {copied ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

interface SetupStepItemProps {
  step: SetupStep;
  copiedCommand: string | null;
  onCopy: (command: string) => void;
}

function SetupStepItem({ step, copiedCommand, onCopy }: SetupStepItemProps) {
  return (
    <li className="text-sm">
      <span className="text-foreground">{step.title}</span>
      {step.policyPath && <PolicyPath path={step.policyPath} />}
      {step.command && (
        <CommandLine
          command={step.command}
          copied={copiedCommand === step.command}
          onCopy={onCopy}
        />
      )}
      {step.detail && (
        <p className="mt-1 text-muted-foreground text-xs">{step.detail}</p>
      )}
    </li>
  );
}

interface SourceCardProps {
  source: TelemetrySource;
  matchesPipeline: boolean;
  selectedPipeline: string;
  copiedCommand: string | null;
  onCopy: (command: string) => void;
}

function SourceCard({
  source,
  matchesPipeline,
  selectedPipeline,
  copiedCommand,
  onCopy,
}: SourceCardProps) {
  const eventIdLabel =
    source.eventIds.length > 0
      ? `Event ID ${source.eventIds.join(", ")}`
      : "Any event ID";
  return (
    <li className="rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground text-sm">
          {source.name}
        </span>
        {matchesPipeline && (
          <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary text-xs leading-none">
            {`${selectedPipeline} pipeline`}
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-muted-foreground text-xs">
        {`${source.channel} · ${eventIdLabel}`}
      </p>
      <ol className="mt-3 space-y-3">
        {source.steps.map((step) => (
          <SetupStepItem
            copiedCommand={copiedCommand}
            key={step.title}
            onCopy={onCopy}
            step={step}
          />
        ))}
      </ol>
    </li>
  );
}

export function LoggingRequirements({
  rule,
  selectedPipeline,
}: LoggingRequirementsProps) {
  const telemetry = useMemo(() => describeRuleTelemetry(rule), [rule]);
  const [copiedCommand, triggerCopied] = useCopyFeedbackKeyed<string>();

  const handleCopy = useCallback(
    async (command: string) => {
      await navigator.clipboard.writeText(command);
      triggerCopied(command);
    },
    [triggerCopied]
  );

  if (!telemetry) {
    return null;
  }

  const sources = sortByPipelineMatch(telemetry.sources, selectedPipeline);

  return (
    <section aria-labelledby="logging-requirements-heading" className="p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3
          className="font-medium text-foreground text-sm"
          id="logging-requirements-heading"
        >
          Will this rule fire?
        </h3>
        <p className="font-mono text-muted-foreground text-xs">
          {formatLogsource(telemetry.logsource)}
        </p>
      </div>

      {sources.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No logging guide for this log source yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {sources.map((source) => (
            <SourceCard
              copiedCommand={copiedCommand}
              key={source.id}
              matchesPipeline={source.pipelines.includes(selectedPipeline)}
              onCopy={handleCopy}
              selectedPipeline={selectedPipeline}
              source={source}
            />
          ))}
        </ul>
      )}

      {telemetry.kapeTargets.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 font-medium text-foreground text-sm">
            Collect the evidence
          </h4>
          <div className="flex flex-wrap gap-2">
            {telemetry.kapeTargets.map((target) => (
              <a
                className="flex items-center gap-1.5 rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] px-3 py-1.5 text-muted-foreground text-sm transition-all hover:border-primary/30 hover:text-foreground"
                href={`/artifact/${target.slug}`}
                key={`${target.slug}-${target.name}`}
              >
                {target.name}
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
