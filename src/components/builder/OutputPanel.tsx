import { AlertTriangle, Check, Copy, Download, Link } from "lucide-react";

import type { OutputFormat } from "../../lib/builder/config";
import type { ConfigIssue, IssueLevel } from "../../lib/builder/kapeCommand";
import { CodeBlock } from "../ui/CodeBlock";
import { Panel } from "../ui/Panel";

export interface OutputTab {
  id: OutputFormat;
  label: string;
  fileName: string;
  mimeType: string;
  language: "powershell" | "batch" | "bash" | "text";
}

export const OUTPUT_TABS: OutputTab[] = [
  {
    fileName: "kape-command.txt",
    id: "kape",
    label: "KAPE command",
    language: "powershell",
    mimeType: "text/plain",
  },
  {
    fileName: "_kape.cli",
    id: "cli",
    label: "_kape.cli",
    language: "text",
    mimeType: "text/plain",
  },
  {
    fileName: "collect.ps1",
    id: "powershell",
    label: "PowerShell",
    language: "powershell",
    mimeType: "text/plain",
  },
  {
    fileName: "collect.bat",
    id: "batch",
    label: "Batch",
    language: "batch",
    mimeType: "text/plain",
  },
  {
    fileName: "collect.sh",
    id: "wsl",
    label: "WSL",
    language: "bash",
    mimeType: "text/plain",
  },
];

const SCRIPT_FORMATS: ReadonlySet<OutputFormat> = new Set<OutputFormat>([
  "powershell",
  "batch",
  "wsl",
]);

const ISSUE_STYLES: Record<IssueLevel, { label: string; className: string }> = {
  error: {
    className: "border-destructive/30 bg-destructive/5 text-destructive",
    label: "Fix",
  },
  info: {
    className: "border-border bg-muted/40 text-muted-foreground",
    label: "Note",
  },
  warning: {
    className:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    label: "Check",
  },
};

interface OutputPanelProps {
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  output: string;
  issues: ConfigIssue[];
  lockedPaths: number;
  moduleCount: number;
  copied: boolean;
  linkCopied: boolean;
  onCopy: () => void;
  onDownload: (tab: OutputTab) => void;
  onShare: () => void;
}

function FormatHint({ format }: { format: OutputFormat }) {
  switch (format) {
    case "kape": {
      return (
        <span>
          Run from the KAPE folder in an elevated PowerShell or cmd window.
        </span>
      );
    }
    case "cli": {
      return (
        <span>
          Save next to{" "}
          <code className="font-mono text-foreground">kape.exe</code>, then run
          it as administrator.
        </span>
      );
    }
    case "powershell": {
      return (
        <span>
          Run as administrator:{" "}
          <code className="font-mono text-foreground">
            powershell -ExecutionPolicy Bypass -File collect.ps1
          </code>
        </span>
      );
    }
    case "batch": {
      return (
        <span>
          Right-click{" "}
          <code className="font-mono text-foreground">collect.bat</code> and
          choose Run as administrator.
        </span>
      );
    }
    default: {
      return (
        <span>
          Run in WSL:{" "}
          <code className="font-mono text-foreground">
            sudo bash collect.sh
          </code>
        </span>
      );
    }
  }
}

function ScriptLimits({
  lockedPaths,
  moduleCount,
}: {
  lockedPaths: number;
  moduleCount: number;
}) {
  const limits = [
    lockedPaths > 0
      ? `${lockedPaths} locked ${lockedPaths === 1 ? "path" : "paths"} skipped on a live system`
      : "",
    moduleCount > 0 ? "module steps skipped" : "",
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs">
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400"
      />
      <span className="text-muted-foreground">
        <span className="font-medium text-amber-700 dark:text-amber-400">
          Fallback script, not KAPE.
        </span>{" "}
        {limits.length > 0 && `${limits.join(" · ")}. `}
        Writes collection-info.txt, a log and SHA256SUMS.
      </span>
    </div>
  );
}

export function OutputPanel({
  format,
  onFormatChange,
  output,
  issues,
  lockedPaths,
  moduleCount,
  copied,
  linkCopied,
  onCopy,
  onDownload,
  onShare,
}: OutputPanelProps) {
  const activeTab =
    OUTPUT_TABS.find((tab) => tab.id === format) ?? OUTPUT_TABS[0];
  const isScript = SCRIPT_FORMATS.has(format);
  const hasOutput = output.trim() !== "";
  const blockingErrors = issues.filter(
    (issue) => issue.level === "error"
  ).length;

  return (
    <Panel
      actions={
        <>
          <button
            className="panel-action focus-ring"
            onClick={onShare}
            type="button"
          >
            {linkCopied ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Link aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {linkCopied ? "Link copied" : "Share link"}
          </button>
          <button
            className="panel-action focus-ring"
            disabled={!hasOutput}
            onClick={onCopy}
            type="button"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            className="panel-action panel-action-primary focus-ring active:scale-[0.98]"
            disabled={!hasOutput}
            onClick={() => onDownload(activeTab)}
            title={`Download ${activeTab.fileName}`}
            type="button"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            Download
          </button>
        </>
      }
      footer={hasOutput ? <FormatHint format={format} /> : undefined}
      headingId="output-heading"
      subtitle={
        hasOutput
          ? blockingErrors > 0
            ? `${blockingErrors} ${blockingErrors === 1 ? "problem" : "problems"} to fix`
            : "Ready to run"
          : undefined
      }
      title="Output"
    >
      <div
        aria-label="Output format"
        className="flex flex-wrap border-border border-b px-2"
        role="tablist"
      >
        {OUTPUT_TABS.map((tab) => (
          <button
            aria-controls="builder-output"
            aria-selected={format === tab.id}
            className={`focus-ring whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${
              format === tab.id
                ? "border-primary border-b-2 font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={tab.id}
            onClick={() => onFormatChange(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {hasOutput && (issues.length > 0 || isScript) && (
        <div className="space-y-2 border-border border-b p-3">
          {isScript && (
            <ScriptLimits lockedPaths={lockedPaths} moduleCount={moduleCount} />
          )}
          {issues.length > 0 && (
            <ul aria-label="Checks" className="space-y-1.5">
              {issues.map((issue) => (
                <li
                  className={`rounded-lg border px-3 py-2 text-xs ${ISSUE_STYLES[issue.level].className}`}
                  key={issue.message}
                >
                  <span className="font-medium">
                    {ISSUE_STYLES[issue.level].label}:
                  </span>{" "}
                  <span className="text-foreground/80">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="[&_pre]:max-h-96" id="builder-output" role="tabpanel">
        {hasOutput ? (
          <CodeBlock code={output} flush language={activeTab.language} />
        ) : (
          <div className="flex min-h-24 items-center justify-center p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Pick a scenario, target or module above.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
