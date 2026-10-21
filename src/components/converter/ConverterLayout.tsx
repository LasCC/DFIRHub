import { ArrowRight, Columns, Zap } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import {
  trackConverterBackendChanged,
  trackConverterConvert,
  trackConverterShareLink,
  trackSigmaRuleImported,
} from "@/lib/analytics";
import { getBackend, toAvailableBackendId } from "@/lib/sigma/backends";
import { locateRuleChecks, toEditorDiagnostics } from "@/lib/sigma/rule-checks";
import { decodeShareState, encodeShareState } from "@/lib/sigma/share";
import { SigmaConverter } from "@/lib/sigma/sigma-converter";
import { sigmaExamples } from "@/lib/sigma/sigma-examples";
import type { ConversionResult, RuleCheck } from "@/lib/sigma/types";
import type { PipelineInfo } from "@/lib/sigma/worker/workerApi";

import { Panel } from "../ui/Panel";
import { AdvancedOptions } from "./AdvancedOptions";
import { ConverterInspector } from "./ConverterInspector";
import { DiffView } from "./DiffView";
import { ExportDialog } from "./ExportDialog";
import { LoadingOverlay } from "./LoadingOverlay";
import { MoreActionsMenu } from "./MoreActionsMenu";
import { OutputPanel } from "./OutputPanel";
import { PipelineSelector } from "./PipelineSelector";
import { RuleImportMenu } from "./RuleImportMenu";

const SigmaEditor = lazy(() =>
  import("./SigmaEditor").then((m) => ({ default: m.SigmaEditor }))
);

import type { LineRevealRequest } from "./SigmaEditor";
import { SigmaSearchDialog } from "./SigmaSearchDialog";
import { TargetSelector } from "./TargetSelector";

const STORAGE_KEY = "dfirhub-converter-settings";
const RULE_CHECK_DEBOUNCE_MS = 600;

interface ConverterSettings {
  selectedBackend: string;
  selectedPipeline: string;
  customPipelineYaml: string;
  multiMode: boolean;
  selectedMulti: string[];
  autoConvert: boolean;
  filterYml: string;
  correlationMethod: string;
  backendOptions: Record<string, string>;
}

const DEFAULT_SETTINGS: ConverterSettings = {
  autoConvert: true,
  backendOptions: {},
  correlationMethod: "",
  customPipelineYaml: "",
  filterYml: "",
  multiMode: false,
  selectedBackend: "splunk",
  selectedMulti: ["splunk", "kusto"],
  selectedPipeline: "windows-audit",
};

function loadSettings(): ConverterSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings: ConverterSettings = {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(stored),
      };
      return {
        ...settings,
        selectedBackend: toAvailableBackendId(settings.selectedBackend),
        selectedMulti: settings.selectedMulti.filter((id) => getBackend(id)),
      };
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
  const mountedRef = useRef(true);
  const [initial] = useState(() => loadSettings());

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
  const [initError, setInitError] = useState<string | null>(null);
  const [autoConvert, setAutoConvert] = useState(initial.autoConvert);
  const [shareCopied, triggerShareCopied] = useCopyFeedback();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterYml, setFilterYml] = useState(initial.filterYml);
  const [correlationMethod, setCorrelationMethod] = useState(
    initial.correlationMethod
  );
  const [backendOptions, setBackendOptions] = useState<Record<string, string>>(
    initial.backendOptions
  );

  const [ruleChecks, setRuleChecks] = useState<RuleCheck[] | null>(null);
  const [checkedRule, setCheckedRule] = useState("");
  const [isCheckingRule, setIsCheckingRule] = useState(false);
  const [lineToReveal, setLineToReveal] = useState<LineRevealRequest | null>(
    null
  );

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
      autoConvert,
      backendOptions,
      correlationMethod,
      customPipelineYaml,
      filterYml,
      multiMode,
      selectedBackend,
      selectedMulti,
      selectedPipeline,
    });
  }, [
    selectedBackend,
    selectedPipeline,
    customPipelineYaml,
    multiMode,
    selectedMulti,
    autoConvert,
    filterYml,
    correlationMethod,
    backendOptions,
  ]);

  // Restore state from shared URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const encoded = params.get("s");
    if (encoded) {
      const state = decodeShareState(encoded);
      if (state) {
        setRule(state.rule);
        setSelectedBackend(toAvailableBackendId(state.backend));
        if (state.pipeline) {
          setSelectedPipeline(state.pipeline);
        }
        if (state.customPipeline) {
          setCustomPipelineYaml(state.customPipeline);
        }
        // Clean up the URL hash after restoring
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  const initializeConverter = useCallback(() => {
    const converter = new SigmaConverter();
    converterRef.current = converter;
    setInitError(null);
    setLoadingProgress(0);
    setIsReady(false);
    converter.onProgress(setLoadingProgress);
    converter
      .initialize()
      .then(async () => {
        if (!mountedRef.current) {
          return;
        }
        setIsReady(true);
        const pipelines = await converter.getAvailablePipelines();
        if (!mountedRef.current) {
          return;
        }
        setAvailablePipelines(pipelines);
      })
      .catch((error: unknown) => {
        if (!mountedRef.current) {
          return;
        }
        setInitError(
          error instanceof Error ? error.message : "Failed to initialize"
        );
      });
    return converter;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const converter = initializeConverter();
    return () => {
      mountedRef.current = false;
      converter.destroy();
    };
  }, [initializeConverter]);

  const handleRetry = useCallback(() => {
    const prev = converterRef.current;
    if (prev) {
      prev.destroy();
    }
    initializeConverter();
  }, [initializeConverter]);

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
    if (!(converter?.isReady() && rule.trim())) {
      return;
    }

    setIsConverting(true);
    trackConverterConvert(selectedBackend, multiMode);

    const pipelineNames = selectedPipeline ? [selectedPipeline] : undefined;
    const pipelineYmls = customPipelineYaml.trim()
      ? [customPipelineYaml]
      : undefined;

    const advancedOpts = {
      backendOptions: Object.keys(backendOptions).length
        ? backendOptions
        : undefined,
      correlationMethod: correlationMethod || undefined,
      filterYml: filterYml.trim() || undefined,
    };

    if (multiMode) {
      const results = await converter.convertMulti(
        rule,
        selectedMulti,
        pipelineNames,
        pipelineYmls,
        advancedOpts
      );
      if (!mountedRef.current) {
        return;
      }
      setMultiResults(results);
    } else {
      const res = await converter.convert(
        rule,
        selectedBackend,
        pipelineNames,
        pipelineYmls,
        advancedOpts
      );
      if (!mountedRef.current) {
        return;
      }
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
    filterYml,
    correlationMethod,
    backendOptions,
  ]);

  // Auto-convert on first load (one-shot: run immediately when Pyodide is ready)
  const hasAutoConverted = useRef(false);
  useEffect(() => {
    if (isReady && !hasAutoConverted.current && rule.trim()) {
      hasAutoConverted.current = true;
      handleConvert();
    }
  }, [isReady, rule, handleConvert]);

  // Auto-convert with debounce (when toggle is on)
  useEffect(() => {
    if (!(autoConvert && isReady)) {
      return;
    }

    const timer = setTimeout(() => {
      handleConvert();
    }, 500);

    return () => clearTimeout(timer);
  }, [autoConvert, isReady, handleConvert]);

  useEffect(() => {
    const converter = converterRef.current;
    if (!(isReady && converter)) {
      return;
    }
    let isStale = false;
    setIsCheckingRule(true);
    const timer = setTimeout(async () => {
      const checks = await converter.validate(rule);
      if (isStale || !mountedRef.current) {
        return;
      }
      setRuleChecks(checks);
      setCheckedRule(rule);
      setIsCheckingRule(false);
    }, RULE_CHECK_DEBOUNCE_MS);
    return () => {
      isStale = true;
      clearTimeout(timer);
    };
  }, [isReady, rule]);

  const locatedRuleChecks = useMemo(
    () => (ruleChecks ? locateRuleChecks(checkedRule, ruleChecks) : null),
    [ruleChecks, checkedRule]
  );

  const engineDiagnostics = useMemo(
    () => (locatedRuleChecks ? toEditorDiagnostics(locatedRuleChecks) : null),
    [locatedRuleChecks]
  );

  const handleRevealLine = useCallback((line: number) => {
    setLineToReveal((previous) => ({
      line,
      requestId: (previous?.requestId ?? 0) + 1,
    }));
  }, []);

  const handleShare = useCallback(async () => {
    const encoded = encodeShareState({
      backend: selectedBackend,
      customPipeline: customPipelineYaml || undefined,
      pipeline: selectedPipeline || undefined,
      rule,
    });
    const url = `${window.location.origin}${window.location.pathname}#s=${encoded}`;
    await navigator.clipboard.writeText(url);
    trackConverterShareLink();
    triggerShareCopied();
  }, [
    rule,
    selectedBackend,
    selectedPipeline,
    customPipelineYaml,
    triggerShareCopied,
  ]);

  const handleExampleSelect = useCallback((yaml: string) => {
    setRule(yaml);
    setResult(null);
    setMultiResults(new Map());
    trackSigmaRuleImported("example");
  }, []);

  const handleExportClose = useCallback(() => {
    setShowExport(false);
  }, []);

  const handleSigmaSelect = useCallback((yaml: string) => {
    setRule(yaml);
    setShowSigmaSearch(false);
    setResult(null);
    setMultiResults(new Map());
    trackSigmaRuleImported("sigmahq");
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
    <div className="relative space-y-4">
      {/* Loading Overlay */}
      <LoadingOverlay
        error={initError ?? undefined}
        isVisible={!isReady}
        onRetry={handleRetry}
        progress={loadingProgress}
      />

      <Panel
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <button
              className="panel-action panel-action-primary focus-ring active:scale-[0.98]"
              disabled={!isReady || isConverting || !rule.trim()}
              onClick={handleConvert}
              title="Convert Sigma rule to the selected backend (⌘↵)"
              type="button"
            >
              {isConverting ? "Converting…" : "Convert"}
              {!isConverting && (
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              )}
            </button>
            <MoreActionsMenu
              canExport={exportConversions.size > 0}
              canShare={rule.trim().length > 0}
              onExport={() => setShowExport(true)}
              onShare={handleShare}
              onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
              shareCopied={shareCopied}
              showAdvanced={showAdvanced}
            />
          </div>
        }
        headingId="converter-heading"
        title={
          <span className="flex items-center gap-1.5">
            Rule
            <ArrowRight
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground"
            />
            query
          </span>
        }
        toolbar={
          <>
            <div className="flex w-full flex-wrap items-center gap-2">
              <RuleImportMenu
                onExampleSelect={handleExampleSelect}
                onSearchSigma={() => setShowSigmaSearch(true)}
              />

              <div
                aria-hidden="true"
                className="mx-1 h-5 w-px shrink-0 bg-border"
              />

              <TargetSelector
                multiSelect={multiMode}
                onMultiSelect={setSelectedMulti}
                onSelect={(backend) => {
                  setSelectedBackend(backend);
                  trackConverterBackendChanged(backend);
                }}
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

              <div className="hidden flex-1 md:block" />

              <button
                aria-label="Compare backends"
                aria-pressed={multiMode}
                className={`hidden h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors active:scale-[0.98] focus-ring md:flex ${
                  multiMode
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-overlay/[0.06] bg-overlay/[0.02] text-muted-foreground hover:border-overlay/[0.12] hover:text-foreground"
                }`}
                onClick={() => setMultiMode((prev) => !prev)}
                title="Compare outputs from several backends side by side"
                type="button"
              >
                <Columns aria-hidden="true" className="h-3.5 w-3.5" />
                Compare
              </button>

              <button
                aria-label="Auto-convert while typing"
                aria-pressed={autoConvert}
                className={`hidden h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors active:scale-[0.98] focus-ring md:flex ${
                  autoConvert
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-overlay/[0.06] bg-overlay/[0.02] text-muted-foreground hover:border-overlay/[0.12] hover:text-foreground"
                }`}
                onClick={() => setAutoConvert((prev) => !prev)}
                title="Convert automatically after every edit"
                type="button"
              >
                <Zap aria-hidden="true" className="h-3.5 w-3.5" />
                Auto
              </button>
            </div>

            <div className="flex w-full items-center gap-2 md:hidden">
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                disabled={!isReady || isConverting || !rule.trim()}
                onClick={handleConvert}
                title="Convert Sigma rule to the selected backend (⌘↵)"
                type="button"
              >
                {isConverting ? "Converting…" : "Convert"}
                {!isConverting && (
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                )}
              </button>
              <MoreActionsMenu
                autoConvert={autoConvert}
                canExport={exportConversions.size > 0}
                canShare={rule.trim().length > 0}
                multiMode={multiMode}
                onExport={() => setShowExport(true)}
                onShare={handleShare}
                onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
                onToggleAutoConvert={() => setAutoConvert((prev) => !prev)}
                onToggleMultiMode={() => setMultiMode((prev) => !prev)}
                shareCopied={shareCopied}
                showAdvanced={showAdvanced}
                showModeToggles
              />
            </div>
          </>
        }
      >
        {showAdvanced && (
          <div className="border-border border-b p-3">
            <AdvancedOptions
              backendOptions={backendOptions}
              correlationMethod={correlationMethod}
              filterYml={filterYml}
              onBackendOptionsChange={setBackendOptions}
              onCorrelationMethodChange={setCorrelationMethod}
              onFilterChange={setFilterYml}
            />
          </div>
        )}

        <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-2">
          <div className="border-overlay/[0.06] border-b lg:border-r lg:border-b-0">
            <Suspense
              fallback={
                <div className="flex h-full min-h-[400px] items-center justify-center text-muted-foreground text-sm">
                  Loading editor…
                </div>
              }
            >
              <SigmaEditor
                engineDiagnostics={engineDiagnostics}
                lineToReveal={lineToReveal}
                onChange={setRule}
                onConvert={handleConvert}
                value={rule}
              />
            </Suspense>
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

        <ConverterInspector
          checks={locatedRuleChecks}
          isChecking={isCheckingRule}
          isEngineReady={isReady}
          onRevealLine={handleRevealLine}
          rule={rule}
          selectedPipeline={selectedPipeline}
        />
      </Panel>

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog
          conversions={exportConversions}
          onClose={handleExportClose}
          rule={rule}
        />
      )}

      {/* Sigma Search Dialog */}
      <SigmaSearchDialog
        onOpenChange={setShowSigmaSearch}
        onSelect={handleSigmaSelect}
        open={showSigmaSearch}
      />
    </div>
  );
}
