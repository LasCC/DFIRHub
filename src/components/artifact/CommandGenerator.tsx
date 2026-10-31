import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { useCopyFeedbackKeyed } from "../../hooks/useCopyFeedback";
import { trackCopyCommand } from "../../lib/analytics";
import {
  generateBatch,
  generateKapeCommand,
  generatePowerShell,
  generateWsl,
} from "../../lib/generators";
import type { KapeTarget } from "../../lib/kapefiles";
import { CodeBlock } from "../ui/CodeBlock";
import { Panel } from "../ui/Panel";

type CommandFormat = "kape" | "powershell" | "batch" | "wsl";

const COMMAND_TABS: {
  description: string;
  id: CommandFormat;
  label: string;
}[] = [
  { description: "KAPE command line", id: "kape", label: "KAPE" },
  { description: "PowerShell script", id: "powershell", label: "PowerShell" },
  { description: "Windows batch script", id: "batch", label: "Batch" },
  { description: "WSL/Linux bash script", id: "wsl", label: "WSL" },
];

interface CommandGeneratorProps {
  target: KapeTarget;
}

const CODE_LANGUAGES = {
  batch: "batch",
  kape: "powershell",
  powershell: "powershell",
  wsl: "bash",
} as const;

const inputClassName =
  "h-8 rounded-lg border border-border bg-background px-2.5 font-mono text-xs outline-none focus:border-primary/50";

function FormatHint({ format }: { format: CommandFormat }) {
  switch (format) {
    case "kape": {
      return (
        <span>
          Run with administrator privileges.{" "}
          <a
            className="text-primary transition-colors hover:text-primary/80"
            href="https://ericzimmerman.github.io/KapeDocs/"
            rel="noopener noreferrer"
            target="_blank"
          >
            KAPE Documentation
          </a>
        </span>
      );
    }
    case "powershell": {
      return (
        <span>
          Save as .ps1 and run as Administrator. Use:{" "}
          <code className="text-primary">
            powershell -ExecutionPolicy Bypass -File script.ps1
          </code>
        </span>
      );
    }
    case "batch": {
      return (
        <span>
          Save as .bat and run as Administrator (right-click → Run as
          administrator).
        </span>
      );
    }
    default: {
      return (
        <span>
          Save as .sh and run with{" "}
          <code className="text-primary">sudo bash script.sh</code> from WSL.
        </span>
      );
    }
  }
}

export function CommandGenerator({ target }: CommandGeneratorProps) {
  const [format, setFormat] = useState<CommandFormat>("kape");
  const [source, setSource] = useState("C:");
  const [destination, setDestination] = useState("D:\\Evidence");
  const [useVss, setUseVss] = useState(false);
  const [useVhdx, setUseVhdx] = useState(false);
  const [copiedId, triggerCopied] = useCopyFeedbackKeyed<string>();

  const opts = useMemo(
    () => ({ destination, source, useVhdx, useVss }),
    [destination, source, useVss, useVhdx]
  );

  const kapeCommand = useMemo(
    () => generateKapeCommand(target, opts),
    [target, opts]
  );

  const currentCommand = useMemo(() => {
    switch (format) {
      case "kape":
        return kapeCommand;
      case "powershell":
        return generatePowerShell(target, opts);
      case "batch":
        return generateBatch(target, opts);
      case "wsl":
        return generateWsl(target, opts);
      default:
        return kapeCommand;
    }
  }, [format, kapeCommand, target, opts]);

  const handleCopy = async (command: string, id: string) => {
    try {
      await navigator.clipboard.writeText(command);
      trackCopyCommand(id, target.name);
      triggerCopied(id);
      // Announce to screen readers
      const announcer = document.querySelector("#live-announcer");
      if (announcer) {
        announcer.textContent = "Command copied to clipboard";
        setTimeout(() => {
          announcer.textContent = "";
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const activeTab = COMMAND_TABS.find((tab) => tab.id === format);
  const isCopied = copiedId === format;

  return (
    <Panel
      actions={
        <button
          aria-label={isCopied ? "Copied to clipboard" : "Copy command"}
          className="panel-action focus-ring"
          onClick={() => handleCopy(currentCommand, format)}
          type="button"
        >
          {isCopied ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {isCopied ? "Copied" : "Copy"}
        </button>
      }
      footer={<FormatHint format={format} />}
      headingId="commands-heading"
      subtitle={`${activeTab?.description ?? ""} for ${target.name}`}
      title="Collect it"
    >
      <div
        aria-label="Command format selection"
        className="fade-x flex overflow-x-auto border-border border-b px-2"
        role="tablist"
      >
        {COMMAND_TABS.map((tab) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={format === tab.id}
            className={`focus-ring whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${
              format === tab.id
                ? "border-primary border-b-2 font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={tab.id}
            onClick={() => setFormat(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-border border-b px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground" htmlFor="source-input">
            Source
          </label>
          <input
            className={`${inputClassName} w-16`}
            id="source-input"
            onChange={(e) => setSource(e.target.value)}
            placeholder="C:"
            type="text"
            value={source}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-muted-foreground" htmlFor="dest-input">
            Destination
          </label>
          <input
            className={`${inputClassName} w-40`}
            id="dest-input"
            onChange={(e) => setDestination(e.target.value)}
            placeholder="D:\Evidence"
            type="text"
            value={destination}
          />
        </div>

        {format === "kape" && (
          <>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                checked={useVss}
                className="h-3.5 w-3.5 accent-primary"
                onChange={(e) => setUseVss(e.target.checked)}
                type="checkbox"
              />
              <span className="font-mono text-muted-foreground">--vss</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                checked={useVhdx}
                className="h-3.5 w-3.5 accent-primary"
                onChange={(e) => setUseVhdx(e.target.checked)}
                type="checkbox"
              />
              <span className="font-mono text-muted-foreground">--vhdx</span>
            </label>
          </>
        )}
      </div>

      <div className="[&_pre]:max-h-72!" id={`${format}-panel`} role="tabpanel">
        <CodeBlock
          code={currentCommand}
          flush
          language={CODE_LANGUAGES[format]}
        />
      </div>

      {target.isCompound && (
        <div className="border-border border-t p-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <span className="font-medium text-amber-700 dark:text-amber-400">
              Note:
            </span>{" "}
            <span className="text-muted-foreground">
              This is a compound target that references{" "}
              {target.referencedTargets.length} other target
              {target.referencedTargets.length === 1 ? "" : "s"}. The KAPE
              command resolves them natively; the PowerShell/Batch/WSL scripts
              flatten every referenced path into explicit copy commands.
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}
