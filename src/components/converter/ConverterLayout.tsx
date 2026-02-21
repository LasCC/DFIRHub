import {
  ArrowRight,
  Check,
  ChevronDown,
  Columns,
  Ellipsis,
  FileDown,
  Link,
  Search,
  Settings2,
  Zap,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ConversionResult } from "@/lib/sigma/types";
import type { PipelineInfo } from "@/lib/sigma/worker/workerApi";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { getBackend } from "@/lib/sigma/backends";
import { decodeShareState, encodeShareState } from "@/lib/sigma/share";
import { SigmaConverter } from "@/lib/sigma/sigma-converter";
import { sigmaExamples } from "@/lib/sigma/sigma-examples";

import { AdvancedOptions } from "./AdvancedOptions";
import { DiffView } from "./DiffView";
import { ExportDialog } from "./ExportDialog";
import { LoadingOverlay } from "./LoadingOverlay";
import { OutputPanel } from "./OutputPanel";
import { PipelineSelector } from "./PipelineSelector";
import { RelatedArtifacts } from "./RelatedArtifacts";

const SigmaEditor = lazy(() =>
  import("./SigmaEditor").then((m) => ({ default: m.SigmaEditor }))
);

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
  filterYml: string;
  correlationMethod: string;
  backendOptions: Record<string, string>;
}

const DEFAULT_SETTINGS: ConverterSettings = {
  autoConvert: false,
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [filterYml, setFilterYml] = useState(initial.filterYml);
  const [correlationMethod, setCorrelationMethod] = useState(
    initial.correlationMethod
  );
  const [backendOptions, setBackendOptions] = useState<Record<string, string>>(
    initial.backendOptions
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

  // Scroll shadow for mobile toolbar
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [mobileScrollStart, setMobileScrollStart] = useState(true);
  const [mobileScrollEnd, setMobileScrollEnd] = useState(false);

  const checkMobileScroll = useCallback(() => {
    const el = mobileScrollRef.current;
    if (!el) {
      return;
    }
    setMobileScrollStart(el.scrollLeft <= 1);
    setMobileScrollEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) {
      return;
    }
    checkMobileScroll();
    el.addEventListener("scroll", checkMobileScroll, { passive: true });
    window.addEventListener("resize", checkMobileScroll);
    return () => {
      el.removeEventListener("scroll", checkMobileScroll);
      window.removeEventListener("resize", checkMobileScroll);
    };
  }, [checkMobileScroll]);

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

  // Close more menu on click outside
  useEffect(() => {
    if (!showMoreMenu) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMoreMenu]);

  // Restore state from shared URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const encoded = params.get("s");
    if (encoded) {
      const state = decodeShareState(encoded);
      if (state) {
        setRule(state.rule);
        setSelectedBackend(state.backend);
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

  const handleShare = useCallback(async () => {
    const encoded = encodeShareState({
      backend: selectedBackend,
      customPipeline: customPipelineYaml || undefined,
      pipeline: selectedPipeline || undefined,
      rule,
    });
    const url = `${window.location.origin}${window.location.pathname}#s=${encoded}`;
    await navigator.clipboard.writeText(url);
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
  }, []);

  const handleExportClose = useCallback(() => {
    setShowExport(false);
  }, []);

  const handleSigmaSelect = useCallback((yaml: string) => {
    setRule(yaml);
    setShowSigmaSearch(false);
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
      <LoadingOverlay
        error={initError ?? undefined}
        isVisible={!isReady}
        onRetry={handleRetry}
        progress={loadingProgress}
      />

      {/* Toolbar — single row on desktop, two rows on mobile */}
      <div className="space-y-2 md:space-y-0">
        {/* Desktop: single row | Mobile row 1: Examples, Search, spacer, Convert */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-white/[0.1] hover:text-foreground"
                title="Load a pre-built Sigma rule example"
                type="button"
              >
                Examples
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
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
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-white/[0.1] hover:text-foreground"
            onClick={() => setShowSigmaSearch(true)}
            title="Search and import rules from SigmaHQ (⌘⇧K)"
            type="button"
          >
            <Search aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search SigmaHQ</span>
          </button>

          {/* Target + Pipeline + toggles — inline on desktop, hidden on mobile (shown in row 2) */}
          <div className="hidden items-center gap-2 md:flex">
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
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                multiMode
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
              }`}
              onClick={() => setMultiMode((prev) => !prev)}
              title="Convert to multiple backends at once"
              type="button"
            >
              <Columns aria-hidden="true" className="h-3.5 w-3.5" />
              Multi
            </button>
            <button
              aria-pressed={autoConvert}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                autoConvert
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
              }`}
              onClick={() => setAutoConvert((prev) => !prev)}
              title="Automatically convert on every change (500ms debounce)"
              type="button"
            >
              <Zap aria-hidden="true" className="h-3.5 w-3.5" />
              Auto
            </button>
          </div>

          <div className="flex-1" />

          {/* Split button: Convert + More */}
          <div
            className="relative flex shrink-0 items-center"
            ref={moreMenuRef}
          >
            <button
              className="flex items-center gap-2 rounded-l-lg bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={!isReady || isConverting || !rule.trim()}
              onClick={handleConvert}
              title="Convert Sigma rule to the selected backend (⌘↵)"
              type="button"
            >
              Convert
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
            <div className="h-5 w-px bg-background/20" />
            <button
              className="flex items-center self-stretch rounded-r-lg bg-primary px-2.5 text-background transition-colors hover:bg-primary/90"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              title="More actions"
              type="button"
            >
              <Ellipsis aria-hidden="true" className="h-4 w-4" />
            </button>

            {/* Dropdown menu */}
            {showMoreMenu && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-white/[0.08] bg-[#161619] shadow-xl shadow-black/40">
                <div className="p-1">
                  <button
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40"
                    disabled={!rule.trim()}
                    onClick={() => {
                      handleShare();
                      setShowMoreMenu(false);
                    }}
                    type="button"
                  >
                    {shareCopied ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Link className="h-3.5 w-3.5" />
                    )}
                    {shareCopied ? "Copied!" : "Copy share link"}
                  </button>

                  {exportConversions.size > 0 && (
                    <button
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                      onClick={() => {
                        setShowExport(true);
                        setShowMoreMenu(false);
                      }}
                      type="button"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Export as ZIP
                    </button>
                  )}

                  <div className="mx-2 my-1 h-px bg-white/[0.06]" />

                  <button
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                      showAdvanced
                        ? "text-violet-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      setShowAdvanced((prev) => !prev);
                      setShowMoreMenu(false);
                    }}
                    type="button"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Advanced options
                    {showAdvanced && (
                      <Check className="ml-auto h-3 w-3 text-violet-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile row 2: Target, Pipeline, Multi, Auto — horizontal scroll */}
        <div
          className={`scroll-shadow-x md:hidden${mobileScrollStart ? " scrolled-start" : ""}${mobileScrollEnd ? " scrolled-end" : ""}`}
        >
          <div
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
            ref={mobileScrollRef}
          >
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
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                multiMode
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
              }`}
              onClick={() => setMultiMode((prev) => !prev)}
              title="Convert to multiple backends at once"
              type="button"
            >
              <Columns aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
            <button
              aria-pressed={autoConvert}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                autoConvert
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
              }`}
              onClick={() => setAutoConvert((prev) => !prev)}
              title="Automatically convert on every change (500ms debounce)"
              type="button"
            >
              <Zap aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <AdvancedOptions
          backendOptions={backendOptions}
          correlationMethod={correlationMethod}
          filterYml={filterYml}
          onBackendOptionsChange={setBackendOptions}
          onCorrelationMethodChange={setCorrelationMethod}
          onFilterChange={setFilterYml}
        />
      )}

      {/* Editor + Output */}
      <div className="grid min-h-[500px] grid-cols-1 gap-0 overflow-hidden rounded-lg border border-white/[0.06] lg:grid-cols-2">
        <div className="border-white/[0.06] border-b lg:border-r lg:border-b-0">
          <Suspense
            fallback={
              <div className="flex h-full min-h-[400px] items-center justify-center text-muted-foreground text-sm">
                Loading editor…
              </div>
            }
          >
            <SigmaEditor
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

      {/* Related Artifacts */}
      <RelatedArtifacts rule={rule} />

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
