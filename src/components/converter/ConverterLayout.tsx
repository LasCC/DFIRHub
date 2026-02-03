import {
  ArrowRight,
  ChevronDown,
  Columns,
  FileDown,
  Search,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { getBackend } from "@/lib/sigma/backends";
import { SigmaConverter } from "@/lib/sigma/sigma-converter";
import { sigmaExamples } from "@/lib/sigma/sigma-examples";
import type { ConversionResult } from "@/lib/sigma/types";
import type { PipelineInfo } from "@/lib/sigma/worker/workerApi";
import { DiffView } from "./DiffView";
import { ExportDialog } from "./ExportDialog";
import { LoadingOverlay } from "./LoadingOverlay";
import { OutputPanel } from "./OutputPanel";
import { PipelineSelector } from "./PipelineSelector";
import { RelatedArtifacts } from "./RelatedArtifacts";
import { SigmaEditor } from "./SigmaEditor";
import { SigmaSearchDialog } from "./SigmaSearchDialog";
import { TargetSelector } from "./TargetSelector";

const STORAGE_KEY = "dfirhub-converter-settings";

interface ConverterSettings {
  selectedBackend: string;
  selectedPipeline: string;
  customPipelineYaml: string;
  multiMode: boolean;
  selectedMulti: string[];
  autoConvert: boolean;
}

const DEFAULT_SETTINGS: ConverterSettings = {
  selectedBackend: "splunk",
  selectedPipeline: "windows-audit",
  customPipelineYaml: "",
  multiMode: false,
  selectedMulti: ["splunk", "kusto"],
  autoConvert: false,
};

function loadSettings(): ConverterSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: ConverterSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function ConverterLayout() {
  const converterRef = useRef<SigmaConverter | null>(null);
  const initial = useRef(loadSettings()).current;

  const [rule, setRule] = useState(sigmaExamples[0].yaml);
  const [selectedBackend, setSelectedBackend] = useState(
    initial.selectedBackend
  );
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [multiResults, setMultiResults] = useState<
    Map<string, ConversionResult>
  >(new Map());
  const [isConverting, setIsConverting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [multiMode, setMultiMode] = useState(initial.multiMode);
  const [selectedMulti, setSelectedMulti] = useState<string[]>(
    initial.selectedMulti
  );
  const [showExport, setShowExport] = useState(false);
  const [showSigmaSearch, setShowSigmaSearch] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [autoConvert, setAutoConvert] = useState(initial.autoConvert);

  // Pipeline state
  const [selectedPipeline, setSelectedPipeline] = useState(
    initial.selectedPipeline
  );
  const [customPipelineYaml, setCustomPipelineYaml] = useState(
    initial.customPipelineYaml
  );
  const [availablePipelines, setAvailablePipelines] = useState<PipelineInfo[]>(
    []
  );

  // Persist settings to localStorage
  useEffect(() => {
    saveSettings({
      selectedBackend,
      selectedPipeline,
      customPipelineYaml,
      multiMode,
      selectedMulti,
      autoConvert,
    });
  }, [
    selectedBackend,
    selectedPipeline,
    customPipelineYaml,
    multiMode,
    selectedMulti,
    autoConvert,
  ]);

  useEffect(() => {
    const converter = new SigmaConverter();
    converterRef.current = converter;
    converter.onProgress(setLoadingProgress);
    converter.initialize().then(async () => {
      setIsReady(true);
      const pipelines = await converter.getAvailablePipelines();
      setAvailablePipelines(pipelines);
    });
    return () => converter.destroy();
  }, []);

  // Keyboard shortcut: Cmd+Shift+K to open Sigma search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "k") {
        e.preventDefault();
        setShowSigmaSearch(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleConvert = useCallback(async () => {
    const converter = converterRef.current;
    if (!(converter && converter.isReady() && rule.trim())) return;

    setIsConverting(true);

    const pipelineNames = selectedPipeline ? [selectedPipeline] : undefined;
    const pipelineYmls = customPipelineYaml.trim()
      ? [customPipelineYaml]
      : undefined;

    if (multiMode) {
      const results = await converter.convertMulti(
        rule,
        selectedMulti,
        pipelineNames,
        pipelineYmls
      );
      setMultiResults(results);
    } else {
      const res = await converter.convert(
        rule,
        selectedBackend,
        pipelineNames,
        pipelineYmls
      );
      setResult(res);
    }

    setIsConverting(false);
  }, [
    rule,
    selectedBackend,
    multiMode,
    selectedMulti,
    selectedPipeline,
    customPipelineYaml,
  ]);

  // Auto-convert with debounce
  useEffect(() => {
    if (!(autoConvert && isReady)) return;

    const timer = setTimeout(() => {
      handleConvert();
    }, 500);

    return () => clearTimeout(timer);
  }, [autoConvert, isReady, handleConvert]);

  const handleExampleSelect = useCallback((yaml: string) => {
    setRule(yaml);
    setResult(null);
    setMultiResults(new Map());
  }, []);

  const backendConfig = getBackend(selectedBackend);

  // Gather all successful conversions for export
  const exportConversions = useMemo(() => {
    const conversions = new Map<string, string>();
    if (multiMode) {
      for (const [key, val] of multiResults) {
        if (val.success && val.query) {
          conversions.set(key, val.query);
        }
      }
    } else if (result?.success && result.query) {
      conversions.set(selectedBackend, result.query);
    }
    return conversions;
  }, [multiMode, multiResults, result, selectedBackend]);

  return (
    <div className="relative space-y-6">
      {/* Loading Overlay */}
      <LoadingOverlay isVisible={!isReady} progress={loadingProgress} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Rule source group */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-white/[0.1] hover:text-foreground"
              title="Load a pre-built Sigma rule example"
              type="button"
            >
              Examples
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            {sigmaExamples.map((example) => (
              <button
                className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04]"
                key={example.title}
                onClick={() => handleExampleSelect(example.yaml)}
                type="button"
              >
                <div className="font-medium text-foreground">
                  {example.title}
                </div>
                <div className="text-xs text-muted-foreground/60">
                  {example.description}
                </div>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <button
          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-white/[0.1] hover:text-foreground"
          onClick={() => setShowSigmaSearch(true)}
          title="Search and import rules from SigmaHQ (⌘⇧K)"
          type="button"
        >
          <Search className="h-3.5 w-3.5" />
          Search SigmaHQ
        </button>

        <Separator className="h-6" orientation="vertical" />

        {/* Conversion settings group */}
        <TargetSelector
          multiSelect={multiMode}
          onMultiSelect={setSelectedMulti}
          onSelect={setSelectedBackend}
          selected={selectedBackend}
          selectedMulti={selectedMulti}
        />

        <PipelineSelector
          availablePipelines={availablePipelines}
          customPipelineYaml={customPipelineYaml}
          onCustomPipelineChange={setCustomPipelineYaml}
          onPipelineChange={setSelectedPipeline}
          selectedPipeline={selectedPipeline}
        />

        <button
          aria-pressed={multiMode}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            multiMode
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
          }`}
          onClick={() => setMultiMode(!multiMode)}
          title="Convert to multiple backends at once"
          type="button"
        >
          <Columns className="h-3.5 w-3.5" />
          Multi-Target
        </button>

        <button
          aria-pressed={autoConvert}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            autoConvert
              ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
              : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
          }`}
          onClick={() => setAutoConvert(!autoConvert)}
          title="Automatically convert on every change (500ms debounce)"
          type="button"
        >
          <Zap className="h-3.5 w-3.5" />
          Auto
        </button>

        <Separator className="h-6" orientation="vertical" />

        {/* Actions group */}
        <div className="ml-auto flex items-center gap-2">
          {exportConversions.size > 0 && (
            <button
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-white/[0.1] hover:text-foreground"
              onClick={() => setShowExport(true)}
              title="Export converted rules as a ZIP package"
              type="button"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export
            </button>
          )}

          <button
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-sm text-background transition-colors hover:bg-primary/90 disabled:opacity-50"
            disabled={!isReady || isConverting || !rule.trim()}
            onClick={handleConvert}
            title="Convert Sigma rule to the selected backend (⌘↵)"
            type="button"
          >
            Convert
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editor + Output */}
      <div className="grid min-h-[500px] grid-cols-1 gap-0 overflow-hidden rounded-lg border border-white/[0.06] lg:grid-cols-2">
        <div className="border-white/[0.06] border-b lg:border-r lg:border-b-0">
          <SigmaEditor
            onChange={setRule}
            onConvert={handleConvert}
            value={rule}
          />
        </div>
        <div>
          {multiMode ? (
            <DiffView isLoading={isConverting} results={multiResults} />
          ) : (
            <OutputPanel
              backend={backendConfig?.name ?? selectedBackend}
              error={result?.error}
              isLoading={isConverting}
              language={backendConfig?.language ?? "text"}
              query={result?.query ?? ""}
            />
          )}
        </div>
      </div>

      {/* Related Artifacts */}
      <RelatedArtifacts rule={rule} />

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog
          conversions={exportConversions}
          onClose={() => setShowExport(false)}
          rule={rule}
        />
      )}

      {/* Sigma Search Dialog */}
      <SigmaSearchDialog
        onOpenChange={setShowSigmaSearch}
        onSelect={(yaml) => {
          setRule(yaml);
          setShowSigmaSearch(false);
          setResult(null);
          setMultiResults(new Map());
        }}
        open={showSigmaSearch}
      />
    </div>
  );
}
