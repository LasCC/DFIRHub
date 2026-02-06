import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ExportDialogProps {
  rule: string;
  conversions: Map<string, string>;
  onClose: () => void;
}

export function ExportDialog({
  rule,
  conversions,
  onClose,
}: ExportDialogProps) {
  const [exporting, setExporting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const [yaml, { DetectionPackageExporter }] = await Promise.all([
        import("js-yaml"),
        import("@/lib/sigma/export"),
      ]);

      let parsed: any = {};
      try {
        parsed = yaml.default.load(rule) ?? {};
      } catch {
        // If parsing fails, use defaults
      }

      const exporter = new DetectionPackageExporter();
      const zip = await exporter.generate({
        conversions,
        metadata: {
          author: parsed.author,
          description: parsed.description,
          level: parsed.level ?? "unknown",
          mitre:
            parsed.tags?.filter((t: string) => t.startsWith("attack.t")) ?? [],
          title: parsed.title ?? "Sigma Rule",
        },
        rule,
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(parsed.title ?? "sigma-rule").toLowerCase().replaceAll(/\s+/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setExporting(false);
    }
  }, [rule, conversions, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Export Detection Package"
    >
      <div className="w-full max-w-md rounded-lg border border-white/[0.06] bg-zinc-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Export Detection Package</h2>
          <button
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-muted-foreground text-sm">
          Download a ZIP package containing the original Sigma rule, converted
          queries ({conversions.size} backend{conversions.size !== 1 ? "s" : ""}
          ), README with metadata, and test case template.
        </p>

        <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="text-muted-foreground text-xs">Package contents:</div>
          <ul className="mt-2 space-y-1 font-mono text-sm">
            <li className="text-foreground/80">rule.yml</li>
            {[...conversions.keys()].map((backend) => (
              <li className="text-foreground/80" key={backend}>
                query-{backend}.txt
              </li>
            ))}
            <li className="text-foreground/80">README.md</li>
            <li className="text-foreground/80">test-cases.md</li>
          </ul>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-background text-sm transition-all hover:bg-primary/90 disabled:opacity-50"
          disabled={exporting}
          onClick={handleExport}
          type="button"
        >
          {exporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Generating…
            </>
          ) : (
            <>
              <Download aria-hidden="true" className="h-4 w-4" />
              Download Package
            </>
          )}
        </button>
      </div>
    </div>
  );
}
