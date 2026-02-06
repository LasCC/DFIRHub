import { ExternalLink, Minus, Plus } from "lucide-react";
import { useCallback } from "react";

interface AdvancedOptionsProps {
  filterYml: string;
  onFilterChange: (val: string) => void;
  correlationMethod: string;
  onCorrelationMethodChange: (val: string) => void;
  backendOptions: Record<string, string>;
  onBackendOptionsChange: (opts: Record<string, string>) => void;
}

const DOCS = {
  backends: "https://sigmahq.io/docs/digging-deeper/backends.html",
  backendsApi: "https://sigmahq-pysigma.readthedocs.io/en/latest/Backends.html",
  correlations: "https://sigmahq.io/docs/meta/correlations.html",
  filters: "https://sigmahq.io/docs/meta/filters.html",
  filtersSpec:
    "https://github.com/SigmaHQ/sigma-specification/blob/main/specification/sigma-filters-specification.md",
};

export function AdvancedOptions({
  filterYml,
  onFilterChange,
  correlationMethod,
  onCorrelationMethodChange,
  backendOptions,
  onBackendOptionsChange,
}: AdvancedOptionsProps) {
  const optionEntries = Object.entries(backendOptions);

  const handleAddOption = useCallback(() => {
    onBackendOptionsChange({ ...backendOptions, "": "" });
  }, [backendOptions, onBackendOptionsChange]);

  const handleRemoveOption = useCallback(
    (key: string) => {
      const next = { ...backendOptions };
      delete next[key];
      onBackendOptionsChange(next);
    },
    [backendOptions, onBackendOptionsChange]
  );

  const handleOptionKeyChange = useCallback(
    (oldKey: string, newKey: string) => {
      const entries = Object.entries(backendOptions);
      const next: Record<string, string> = {};
      for (const [k, v] of entries) {
        next[k === oldKey ? newKey : k] = v;
      }
      onBackendOptionsChange(next);
    },
    [backendOptions, onBackendOptionsChange]
  );

  const handleOptionValueChange = useCallback(
    (key: string, value: string) => {
      onBackendOptionsChange({ ...backendOptions, [key]: value });
    },
    [backendOptions, onBackendOptionsChange]
  );

  return (
    <div className="space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      {/* Header with docs links */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Advanced pySigma conversion options. These settings are passed
          directly to the conversion engine.
        </p>
        <div className="flex items-center gap-3">
          <a
            className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-primary"
            href={DOCS.filters}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3 w-3" />
            Filters docs
          </a>
          <a
            className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-primary"
            href={DOCS.correlations}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3 w-3" />
            Correlations docs
          </a>
          <a
            className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-primary"
            href={DOCS.backends}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3 w-3" />
            Backends docs
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Filter YAML */}
        <div className="lg:col-span-2">
          <div className="mb-1.5 flex items-center gap-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="sigma-filter"
            >
              Sigma Filter (YAML)
            </label>
            <a
              className="text-[10px] text-muted-foreground/40 transition-colors hover:text-primary"
              href={DOCS.filtersSpec}
              rel="noopener noreferrer"
              target="_blank"
              title="View the Sigma Filters specification"
            >
              spec
            </a>
          </div>
          <textarea
            className="w-full rounded-md border border-white/[0.06] bg-[#101010] px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            id="sigma-filter"
            name="sigma-filter"
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={`# Sigma filters narrow down detection scope\n# by adding or excluding conditions.\n# Example:\nlogsource:\n    category: process_creation\ndetection:\n    filter:\n        Image|endswith: '\\\\svchost.exe'\n    condition: not filter`}
            rows={5}
            spellCheck={false}
            value={filterYml}
          />
        </div>

        {/* Correlation Method + Backend Options */}
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="correlation-method"
              >
                Correlation Method
              </label>
              <a
                className="text-[10px] text-muted-foreground/40 transition-colors hover:text-primary"
                href={DOCS.correlations}
                rel="noopener noreferrer"
                target="_blank"
                title="Learn about Sigma correlation rules"
              >
                docs
              </a>
            </div>
            <select
              className="w-full rounded-md border border-white/[0.06] bg-[#101010] px-3 py-2 text-xs text-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              id="correlation-method"
              name="correlation-method"
              onChange={(e) => onCorrelationMethodChange(e.target.value)}
              value={correlationMethod}
            >
              <option value="">Default</option>
              <option value="default">default</option>
              <option value="multisearch">multisearch</option>
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground/40">
              Controls how correlation rules are converted. Only applies to
              rules with a correlation section.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Backend Options
                </label>
                <a
                  className="text-[10px] text-muted-foreground/40 transition-colors hover:text-primary"
                  href={DOCS.backendsApi}
                  rel="noopener noreferrer"
                  target="_blank"
                  title="View pySigma backend API documentation"
                >
                  api docs
                </a>
              </div>
              <button
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={handleAddOption}
                title="Add backend option"
                type="button"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {optionEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground/40">
                No options set. Backend-specific key-value pairs passed via{" "}
                <code className="rounded bg-white/[0.04] px-1 py-0.5 text-[10px]">
                  -O key=value
                </code>{" "}
                in sigma-cli.
              </p>
            ) : (
              <div className="space-y-1.5">
                {optionEntries.map(([key, val], idx) => (
                  <div className="flex items-center gap-1.5" key={idx}>
                    <input
                      aria-label={`Backend option key ${idx + 1}`}
                      className="w-1/2 rounded-md border border-white/[0.06] bg-[#101010] px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
                      name={`backend-key-${idx}`}
                      onChange={(e) =>
                        handleOptionKeyChange(key, e.target.value)
                      }
                      placeholder="key"
                      value={key}
                    />
                    <input
                      aria-label={`Backend option value ${idx + 1}`}
                      className="w-1/2 rounded-md border border-white/[0.06] bg-[#101010] px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
                      name={`backend-val-${idx}`}
                      onChange={(e) =>
                        handleOptionValueChange(key, e.target.value)
                      }
                      placeholder="value"
                      value={val}
                    />
                    <button
                      className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-red-400"
                      onClick={() => handleRemoveOption(key)}
                      title="Remove option"
                      type="button"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
