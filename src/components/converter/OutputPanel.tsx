import { AlertTriangle, Check, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";

interface OutputPanelProps {
  query: string;
  error?: string;
  backend: string;
  language: string;
  isLoading?: boolean;
}

const shikiLangMap: Record<string, string> = {
  splunk: "kusto",
  esql: "sql",
  lucene: "text",
  eql: "python",
  kql: "kusto",
  logql: "kusto",
  datadog: "text",
  "yara-l": "javascript",
  quickwit: "text",
  netwitness: "text",
  crowdstrike: "kusto",
  carbonblack: "text",
  sentinelone: "sql",
  python: "python",
  uaql: "text",
  sql: "sql",
  surrealql: "sql",
};

export function OutputPanel({
  query,
  error,
  backend,
  language,
  isLoading,
}: OutputPanelProps) {
  const [copied, triggerCopied] = useCopyFeedback();
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");

  const handleCopy = useCallback(async () => {
    if (!query) return;
    await navigator.clipboard.writeText(query);
    triggerCopied();
  }, [query, triggerCopied]);

  useEffect(() => {
    if (!query || error || isLoading) {
      setHighlightedHtml("");
      return;
    }

    let cancelled = false;

    async function highlight() {
      try {
        const lang = shikiLangMap[language] ?? "text";
        const html = await codeToHtml(query, {
          lang,
          theme: "vesper",
        });
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch {
        if (!cancelled) {
          setHighlightedHtml("");
        }
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [query, language, error, isLoading]);

  return (
    <div className="flex h-full flex-col bg-[#101010]">
      <div className="flex items-center justify-between border-white/[0.06] border-b px-4 py-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {backend}{" "}
          <span className="text-muted-foreground/50">({language})</span>
        </span>
        {query && (
          <button
            aria-label={copied ? "Copied" : "Copy query to clipboard"}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-muted-foreground text-xs transition-all hover:border-white/[0.1] hover:text-foreground"
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-primary" />
                <span className="text-primary">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Converting...
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-red-400 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
          </div>
        )}
        {query &&
          !error &&
          !isLoading &&
          (highlightedHtml ? (
            <div
              className="[&_pre]:!bg-transparent [&_pre]:whitespace-pre-wrap [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed [&_code]:!bg-transparent"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
              {query}
            </pre>
          ))}
        {!(query || error || isLoading) && (
          <p className="text-muted-foreground/50 text-sm">
            Convert a Sigma rule to see the output here.
          </p>
        )}
      </div>
    </div>
  );
}
