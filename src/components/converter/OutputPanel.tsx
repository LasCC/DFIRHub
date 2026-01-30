import { AlertTriangle, Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

interface OutputPanelProps {
  query: string;
  error?: string;
  backend: string;
  language: string;
  isLoading?: boolean;
}

export function OutputPanel({
  query,
  error,
  backend,
  language,
  isLoading,
}: OutputPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!query) return;
    await navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [query]);

  return (
    <div className="flex h-full flex-col">
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
        {query && !error && !isLoading && (
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
            {query}
          </pre>
        )}
        {!(query || error || isLoading) && (
          <p className="text-muted-foreground/50 text-sm">
            Convert a Sigma rule to see the output here.
          </p>
        )}
      </div>
    </div>
  );
}
