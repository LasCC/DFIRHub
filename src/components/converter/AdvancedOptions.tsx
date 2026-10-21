import { Minus, Plus } from "lucide-react";
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
  backendsApi: "https://sigmahq-pysigma.readthedocs.io/en/latest/Backends.html",
  correlations: "https://sigmahq.io/docs/meta/correlations.html",
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
    <div className="rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] p-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Filter YAML */}
        <div className="lg:col-span-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              className="font-medium text-muted-foreground text-xs"
              htmlFor="sigma-filter"
            >
              Filter YAML
            </label>
            <a
              className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
              href={DOCS.filtersSpec}
              rel="noopener noreferrer"
              target="_blank"
            >
              Spec
            </a>
          </div>
          <textarea
            className="w-full rounded-md border border-overlay/[0.06] bg-secondary px-3 py-2 font-mono text-foreground text-xs placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            id="sigma-filter"
            name="sigma-filter"
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="# Optional Sigma filter YAML"
            rows={4}
            spellCheck={false}
            value={filterYml}
          />
        </div>

        {/* Correlation method + backend options */}
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label
                className="font-medium text-muted-foreground text-xs"
                htmlFor="correlation-method"
              >
                Correlation
              </label>
              <a
                className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
                href={DOCS.correlations}
                rel="noopener noreferrer"
                target="_blank"
              >
                Docs
              </a>
            </div>
            <select
              className="w-full rounded-md border border-overlay/[0.06] bg-secondary px-2.5 py-1.5 text-foreground text-xs focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              id="correlation-method"
              name="correlation-method"
              onChange={(e) => onCorrelationMethodChange(e.target.value)}
              value={correlationMethod}
            >
              <option value="">Default</option>
              <option value="default">default</option>
              <option value="multisearch">multisearch</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Only affects correlation rules.
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="font-medium text-muted-foreground text-xs">
                  Backend options
                </label>
                <a
                  className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
                  href={DOCS.backendsApi}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  API
                </a>
              </div>
              <button
                className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                onClick={handleAddOption}
                title="Add backend option"
                type="button"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {optionEntries.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Passed as{" "}
                <code className="rounded bg-overlay/[0.04] px-1 py-0.5">
                  -O key=value
                </code>
                .
              </p>
            ) : (
              <div className="space-y-1.5">
                {optionEntries.map(([key, val], idx) => (
                  <div className="flex items-center gap-1.5" key={idx}>
                    <input
                      aria-label={`Backend option key ${idx + 1}`}
                      className="w-1/2 rounded-md border border-overlay/[0.06] bg-secondary px-2 py-1 font-mono text-foreground text-xs placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
                      name={`backend-key-${idx}`}
                      onChange={(e) =>
                        handleOptionKeyChange(key, e.target.value)
                      }
                      placeholder="key"
                      value={key}
                    />
                    <input
                      aria-label={`Backend option value ${idx + 1}`}
                      className="w-1/2 rounded-md border border-overlay/[0.06] bg-secondary px-2 py-1 font-mono text-foreground text-xs placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none"
                      name={`backend-val-${idx}`}
                      onChange={(e) =>
                        handleOptionValueChange(key, e.target.value)
                      }
                      placeholder="value"
                      value={val}
                    />
                    <button
                      aria-label={`Remove option ${key || idx + 1}`}
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
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
