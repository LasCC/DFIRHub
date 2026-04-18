import { useMemo, useState } from "react";

import type { KapeTarget } from "../../lib/kapefiles";

import { useCopyFeedbackKeyed } from "../../hooks/useCopyFeedback";
import { useHaptics } from "../../hooks/useHaptics";
import { trackCopyCommand } from "../../lib/analytics";
import {
  generateBatch,
  generateKapeCommand,
  generatePowerShell,
  generateWsl,
} from "../../lib/generators";
import { CodeBlock } from "../ui/CodeBlock";

type CommandFormat = "kape" | "powershell" | "batch" | "wsl";

interface CommandGeneratorProps {
  target: KapeTarget;
}

export function CommandGenerator({ target }: CommandGeneratorProps) {
  const [format, setFormat] = useState<CommandFormat>("powershell");
  const [source, setSource] = useState("C:");
  const [destination, setDestination] = useState("D:\\Evidence");
  const [useVss, setUseVss] = useState(false);
  const [useVhdx, setUseVhdx] = useState(false);
  const [copiedId, triggerCopied] = useCopyFeedbackKeyed<string>();
  const { tapHaptic, toggleHaptic } = useHaptics();

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

  return (
    <div className="glass-subtle overflow-hidden rounded-xl">
      {/* Format Tabs */}
      <div
        aria-label="Command format selection"
        className="flex overflow-x-auto border-white/[0.04] border-b bg-white/[0.02]"
        role="tablist"
      >
        {[
          { description: "KAPE command line", id: "kape", label: "KAPE" },
          {
            description: "PowerShell script",
            id: "powershell",
            label: "PowerShell",
          },
          { description: "Windows batch script", id: "batch", label: "Batch" },
          { description: "WSL/Linux bash script", id: "wsl", label: "WSL" },
        ].map((tab) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={format === tab.id}
            className={`focus-ring whitespace-nowrap px-4 py-2 text-xs transition-colors ${
              format === tab.id
                ? "border-primary border-b-2 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={tab.id}
            onClick={() => {
              tapHaptic();
              setFormat(tab.id as CommandFormat);
            }}
            role="tab"
            type="button"
          >
            {tab.label.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Configuration Panel */}
      <div className="border-white/[0.04] border-b bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Source Drive */}
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground" htmlFor="source-input">
              source:
            </label>
            <input
              className="h-7 w-16 border border-border bg-background px-2 text-xs outline-none focus:border-primary/50"
              id="source-input"
              onChange={(e) => setSource(e.target.value)}
              placeholder="C:"
              type="text"
              value={source}
            />
          </div>

          {/* Destination Path */}
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground" htmlFor="dest-input">
              destination:
            </label>
            <input
              className="h-7 w-40 border border-border bg-background px-2 text-xs outline-none focus:border-primary/50"
              id="dest-input"
              onChange={(e) => setDestination(e.target.value)}
              placeholder="D:\Evidence"
              type="text"
              value={destination}
            />
          </div>

          {/* KAPE-specific options */}
          {format === "kape" && (
            <>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  checked={useVss}
                  className="h-3 w-3 accent-primary"
                  onChange={(e) => {
                    toggleHaptic();
                    setUseVss(e.target.checked);
                  }}
                  type="checkbox"
                />
                <span className="text-muted-foreground">--vss</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  checked={useVhdx}
                  className="h-3 w-3 accent-primary"
                  onChange={(e) => {
                    toggleHaptic();
                    setUseVhdx(e.target.checked);
                  }}
                  type="checkbox"
                />
                <span className="text-muted-foreground">--vhdx</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Command Display */}
      <div className="p-4">
        <div className="relative">
          <CodeBlock
            code={currentCommand}
            language={
              format === "kape"
                ? "shell"
                : format === "wsl"
                  ? "bash"
                  : format === "powershell"
                    ? "powershell"
                    : "batch"
            }
          />
          <button
            aria-label={
              copiedId === format ? "Copied to clipboard" : "Copy command"
            }
            className="focus-ring absolute top-2 right-2 z-20 rounded border border-white/[0.1] bg-black/60 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
            onClick={() => handleCopy(currentCommand, format)}
            type="button"
          >
            {copiedId === format ? "copied!" : "copy"}
          </button>
        </div>

        {/* Format description */}
        <div className="mt-3 text-[10px] text-muted-foreground">
          {format === "kape" && (
            <p>
              <span className="text-primary">›</span> Run with administrator
              privileges.{" "}
              <a
                className="text-primary transition-colors hover:text-primary/80"
                href="https://ericzimmerman.github.io/KapeDocs/"
                rel="noopener noreferrer"
                target="_blank"
              >
                KAPE Documentation
              </a>
            </p>
          )}
          {format === "powershell" && (
            <p>
              <span className="text-primary">›</span> Save as .ps1 and run as
              Administrator. Use:{" "}
              <code className="text-primary">
                powershell -ExecutionPolicy Bypass -File script.ps1
              </code>
            </p>
          )}
          {format === "batch" && (
            <p>
              <span className="text-primary">›</span> Save as .bat and run as
              Administrator (right-click → Run as administrator).
            </p>
          )}
          {format === "wsl" && (
            <p>
              <span className="text-primary">›</span> Save as .sh and run with{" "}
              <code className="text-primary">sudo bash script.sh</code> from
              WSL.
            </p>
          )}
        </div>
      </div>

      {/* Target Info */}
      {target.isCompound && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <span className="text-amber-400">Note:</span>{" "}
            <span className="text-muted-foreground">
              This is a compound target that references{" "}
              {target.referencedTargets.length} other targets. KAPE will
              automatically collect all referenced artifacts.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
