import { Check, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useCallback, useMemo } from "react";

import { useCopyFeedbackKeyed } from "@/hooks/useCopyFeedback";
import type {
  RuleTelemetry,
  SetupStep,
  TelemetrySource,
} from "@/lib/sigma/logsource-requirements";
import type { Logsource } from "@/lib/sigma/sigma-mapping";

interface LoggingRequirementsProps {
  telemetry: RuleTelemetry | null;
  selectedPipeline: string;
}

const LOGSOURCE_DISPLAY_KEYS = ["product", "category", "service"] as const;

function formatLogsource(logsource: Logsource) {
  return LOGSOURCE_DISPLAY_KEYS.filter((key) => logsource[key])
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
    <ol className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground">
      {path.map((segment, index) => (
        <li className="flex items-center gap-1" key={segment}>
          {index > 0 && (
            <ChevronRight aria-hidden="true" className="h-3 w-3 opacity-50" />
          )}
          <span
            className={index === path.length - 1 ? "text-foreground/80" : ""}
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
    <div className="mt-1.5 flex items-start gap-2 rounded-md bg-console px-2.5 py-1.5">
      <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-console-foreground">
        {command}
      </code>
      <button
        aria-label={copied ? "Command copied" : "Copy command"}
        className="focus-ring shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
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
    <li className="text-xs">
      <span className="font-medium text-foreground">{step.title}</span>
      {step.policyPath && <PolicyPath path={step.policyPath} />}
      {step.command && (
        <CommandLine
          command={step.command}
          copied={copiedCommand === step.command}
          onCopy={onCopy}
        />
      )}
      {step.detail && (
        <p className="mt-1 text-muted-foreground">{step.detail}</p>
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
    <details className="group overflow-hidden rounded-lg border border-overlay/[0.06] bg-overlay/[0.02]">
      <summary className="focus-ring flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 transition-colors hover:bg-overlay/[0.03] [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        <span className="font-medium text-foreground text-sm">
          {source.name}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {source.channel} · {eventIdLabel}
        </span>
        {matchesPipeline && (
          <span
            className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary text-[11px] leading-none sm:ml-auto"
            title="Matches the selected pipeline"
          >
            {selectedPipeline}
          </span>
        )}
      </summary>
      <ol className="space-y-3 border-overlay/[0.06] border-t px-3 py-3">
        {source.steps.map((step) => (
          <SetupStepItem
            copiedCommand={copiedCommand}
            key={step.title}
            onCopy={onCopy}
            step={step}
          />
        ))}
      </ol>
    </details>
  );
}

export function LoggingRequirements({
  telemetry,
  selectedPipeline,
}: LoggingRequirementsProps) {
  const [copiedCommand, triggerCopied] = useCopyFeedbackKeyed<string>();

  const handleCopy = useCallback(
    async (command: string) => {
      await navigator.clipboard.writeText(command);
      triggerCopied(command);
    },
    [triggerCopied]
  );

  const sources = useMemo(
    () =>
      telemetry ? sortByPipelineMatch(telemetry.sources, selectedPipeline) : [],
    [telemetry, selectedPipeline]
  );

  if (!telemetry) {
    return (
      <p className="text-muted-foreground text-sm">
        No logging guide for this rule yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
        <span className="text-muted-foreground">Logsource</span>
        <code className="font-mono text-muted-foreground">
          {formatLogsource(telemetry.logsource)}
        </code>
      </div>

      {sources.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No logging guide for this log source yet.
        </p>
      ) : (
        <div className="space-y-2">
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
        </div>
      )}

      {telemetry.kapeTargets.length > 0 && (
        <div className="mt-3">
          <h4 className="mb-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
            Collect with KAPE
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {telemetry.kapeTargets.map((target) => (
              <a
                className="flex items-center gap-1.5 rounded-md border border-overlay/[0.06] bg-overlay/[0.02] px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-primary/30 hover:text-foreground"
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
    </div>
  );
}
