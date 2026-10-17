import { ArrowRight, Check, Copy } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { trackCopyCommand } from "@/lib/analytics";
import type { ConsolePreview } from "@/lib/homepage";
import { cn } from "@/lib/utils";

import { Panel } from "../ui/Panel";

interface HeroConsoleProps {
  previews: ConsolePreview[];
}

const LINE_STAGGER_MS = 70;
const COMMAND_LEAD_MS = 180;
const COMMAND_CHARACTER_MS = 16;
const TARGET_FLAG = "--target";
const LINE_HEIGHT_REM = 1.5;
const LINE_GAP_REM = 0.25;
const LIST_VERTICAL_PADDING_REM = 2;

function countVisibleLines(preview: ConsolePreview): number {
  return preview.rows.length + (preview.hiddenPathCount > 0 ? 1 : 0);
}

function getListMinHeightRem(previews: ConsolePreview[]): number {
  const tallestLineCount = Math.max(...previews.map(countVisibleLines));
  return (
    tallestLineCount * LINE_HEIGHT_REM +
    (tallestLineCount - 1) * LINE_GAP_REM +
    LIST_VERTICAL_PADDING_REM
  );
}

const countFormat = new Intl.NumberFormat("en-US");

function pluralize(count: number, singular: string): string {
  return `${countFormat.format(count)} ${count === 1 ? singular : `${singular}s`}`;
}

function describePreview(preview: ConsolePreview): string {
  if (preview.isCompound) {
    return `Expands to ${pluralize(preview.artifactCount, "artifact")} and ${pluralize(preview.pathCount, "path")}.`;
  }
  const collections =
    preview.collectionCount > 0
      ? `, part of ${pluralize(preview.collectionCount, "collection")}`
      : "";
  return `${pluralize(preview.pathCount, "path")}${collections}.`;
}

function getTokenClassName(token: string, previousToken: string | undefined) {
  if (previousToken === TARGET_FLAG) {
    return "font-bold text-console-accent";
  }
  if (token.startsWith("--")) {
    return "text-console-muted";
  }
  return "text-console-foreground";
}

function CommandText({ command }: { command: string }) {
  const tokens = command.split(" ");
  return (
    <>
      {tokens.map((token, position) => (
        <span key={`${position}-${token}`}>
          <span className={getTokenClassName(token, tokens[position - 1])}>
            {token}
          </span>
          {position < tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

export function HeroConsole({ previews }: HeroConsoleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, triggerCopied] = useCopyFeedback();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const idPrefix = useId();

  const active = previews[activeIndex];
  if (!active) {
    return null;
  }

  const panelId = `${idPrefix}-panel`;
  const commandDelayMs = COMMAND_LEAD_MS + active.rows.length * LINE_STAGGER_MS;

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const lastIndex = previews.length - 1;
    const nextIndexByKey: Record<string, number> = {
      ArrowRight: index === lastIndex ? 0 : index + 1,
      ArrowLeft: index === 0 ? lastIndex : index - 1,
      Home: 0,
      End: lastIndex,
    };
    const nextIndex = nextIndexByKey[event.key];
    if (nextIndex === undefined) {
      return;
    }
    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(active.command);
      trackCopyCommand("kape-home", active.name);
      triggerCopied();
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Panel
      actions={
        <a
          className="panel-action focus-ring"
          href={`/artifact/${active.slug}`}
        >
          Open {active.name}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      }
      headingId={`${idPrefix}-heading`}
      subtitle={describePreview(active)}
      title={active.name}
    >
      <div
        aria-label="Example artifacts"
        className="scrollbar-hide fade-x flex overflow-x-auto border-b border-border px-2"
        role="tablist"
      >
        {previews.map((preview, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              aria-controls={panelId}
              aria-selected={isActive}
              className={cn(
                "relative shrink-0 px-3 py-2.5 text-sm transition-colors",
                "after:absolute after:inset-x-3 after:bottom-[-1px] after:h-0.5",
                isActive
                  ? "font-medium text-foreground after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              id={`${idPrefix}-tab-${preview.slug}`}
              key={preview.slug}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {preview.name}
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`${idPrefix}-tab-${active.slug}`}
        id={panelId}
        key={active.slug}
        role="tabpanel"
      >
        <ul
          className="space-y-1 px-5 pt-5 pb-4 font-mono text-[13px] leading-6"
          style={{ minHeight: `${getListMinHeightRem(previews)}rem` }}
        >
          {active.rows.map((row, index) => (
            <li
              className="console-line break-all"
              key={`${row.directory}${row.mask ?? ""}`}
              style={{ animationDelay: `${index * LINE_STAGGER_MS}ms` }}
            >
              <span className="text-foreground">{row.directory}</span>
              {row.mask && (
                <span className="text-console-accent">{row.mask}</span>
              )}
            </li>
          ))}
          {active.hiddenPathCount > 0 && (
            <li
              className="console-line text-muted-foreground"
              style={{
                animationDelay: `${active.rows.length * LINE_STAGGER_MS}ms`,
              }}
            >
              and {pluralize(active.hiddenPathCount, "more path")}
            </li>
          )}
        </ul>

        <div className="flex items-center gap-2.5 border-t border-console-line bg-console px-5 py-2.5 text-console-foreground">
          <span
            aria-hidden="true"
            className="select-none font-mono text-[13px] text-console-muted"
          >
            PS&gt;
          </span>
          <div className="scrollbar-thin min-w-0 flex-1 overflow-x-auto py-1">
            <code
              className="console-command inline-block whitespace-pre-wrap break-words font-mono text-[13px] sm:whitespace-pre sm:break-normal"
              style={{
                animationDelay: `${commandDelayMs}ms`,
                animationDuration: `${active.command.length * COMMAND_CHARACTER_MS}ms`,
                animationTimingFunction: `steps(${active.command.length}, end)`,
              }}
            >
              <CommandText command={active.command} />
            </code>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-console-line bg-background text-console-muted transition-colors hover:border-console-muted hover:text-console-foreground"
            onClick={copyCommand}
            title={copied ? "Copied" : "Copy command"}
            type="button"
          >
            {copied ? (
              <Check
                aria-hidden="true"
                className="h-4 w-4 text-console-accent"
              />
            ) : (
              <Copy aria-hidden="true" className="h-4 w-4" />
            )}
            <span className="sr-only">Copy command</span>
          </button>
          <span className="sr-only" role="status">
            {copied ? "Command copied to clipboard" : ""}
          </span>
        </div>
      </div>
    </Panel>
  );
}
