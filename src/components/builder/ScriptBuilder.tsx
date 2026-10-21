import { useEffect, useMemo, useState } from "react";

import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import {
  trackBuilderCopy,
  trackBuilderDownload,
  trackBuilderPreset,
  trackBuilderShare,
} from "@/lib/analytics";

import {
  buildScriptTarget,
  collectUniqueEntries,
  resolveLeafModules,
  resolveLeafTargets,
  summarizeCollection,
  translateKapeVariables,
  uniqueKapeNames,
} from "../../lib/builder/collection";
import { DEFAULT_CONFIG } from "../../lib/builder/config";
import type {
  BuilderModule,
  BuilderTarget,
  KapeConfig,
  OutputFormat,
} from "../../lib/builder/config";
import {
  formatKapeBatchFile,
  formatKapeCommand,
  validateKapeConfig,
} from "../../lib/builder/kapeCommand";
import { SCENARIO_PRESETS } from "../../lib/builder/presets";
import type { ScenarioPreset } from "../../lib/builder/presets";
import {
  configFromSearchParams,
  configToSearchParams,
} from "../../lib/builder/urlState";
import {
  generateBatch,
  generatePowerShell,
  generateWsl,
} from "../../lib/generators";
import { ChecklistPicker } from "./ChecklistPicker";
import type { ChecklistItem } from "./ChecklistPicker";
import { CollectionPreview } from "./CollectionPreview";
import { OptionsPanel } from "./OptionsPanel";
import { OutputPanel } from "./OutputPanel";
import type { OutputTab } from "./OutputPanel";
import { PresetPanel } from "./PresetPanel";

interface ScriptBuilderProps {
  targets: BuilderTarget[];
  modules: BuilderModule[];
  targetCategories: string[];
  moduleFolders: string[];
}

function toTargetItem(target: BuilderTarget): ChecklistItem {
  return {
    badge: target.isCompound ? "Collection" : undefined,
    description: target.description,
    group: target.category,
    id: target.slug,
    label: target.name,
    meta: target.isCompound
      ? `${target.childSlugs.length} targets`
      : `${target.entries.length} ${target.entries.length === 1 ? "path" : "paths"}`,
  };
}

function toModuleItem(module: BuilderModule): ChecklistItem {
  return {
    badge: module.isCompound ? "Collection" : undefined,
    description: module.description,
    group: module.folder,
    id: module.name,
    label: module.name,
    meta: module.isCompound
      ? `${module.referencedModules.length} modules`
      : module.exportFormats.join(", "),
  };
}

function findTargetSlugByKapeName(
  targets: BuilderTarget[],
  kapeName: string
): string | undefined {
  const normalized = kapeName.toLowerCase();
  return targets.find((target) => target.kapeName.toLowerCase() === normalized)
    ?.slug;
}

function sameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.every((value) => rightSet.has(value.toLowerCase()));
}

function buildOutput(
  config: KapeConfig,
  selectedTargets: BuilderTarget[],
  leaves: BuilderTarget[]
): string {
  const hasSelection = config.targets.length > 0 || config.modules.length > 0;
  const commandConfig = {
    ...config,
    targets: uniqueKapeNames(selectedTargets),
  };
  if (config.format === "kape") {
    return hasSelection ? formatKapeCommand(commandConfig) : "";
  }
  if (config.format === "cli") {
    return hasSelection ? formatKapeBatchFile(commandConfig) : "";
  }
  const entries = collectUniqueEntries(leaves);
  if (entries.length === 0) {
    return "";
  }
  const scriptTarget = buildScriptTarget(selectedTargets, entries);
  const options = {
    caseId: config.caseId,
    chainOfCustody: true,
    destination: translateKapeVariables(config.tdest, config.format),
    examiner: config.examiner,
    source: config.tsource,
  };
  if (config.format === "powershell") {
    return generatePowerShell(scriptTarget, options);
  }
  if (config.format === "batch") {
    return generateBatch(scriptTarget, options);
  }
  return generateWsl(scriptTarget, options);
}

export function ScriptBuilder({
  targets,
  modules,
  targetCategories,
  moduleFolders,
}: ScriptBuilderProps) {
  const [config, setConfig] = useState<KapeConfig>(DEFAULT_CONFIG);
  const [isUrlLoaded, setIsUrlLoaded] = useState(false);
  const [copied, triggerCopied] = useCopyFeedback();
  const [linkCopied, triggerLinkCopied] = useCopyFeedback();

  const targetIndex = useMemo(
    () => new Map(targets.map((target) => [target.slug, target])),
    [targets]
  );
  const moduleIndex = useMemo(
    () => new Map(modules.map((module) => [module.name.toLowerCase(), module])),
    [modules]
  );
  const targetItems = useMemo(() => targets.map(toTargetItem), [targets]);
  const moduleItems = useMemo(() => modules.map(toModuleItem), [modules]);

  useEffect(() => {
    const fromUrl = configFromSearchParams(
      new URLSearchParams(window.location.search)
    );
    setConfig({
      ...fromUrl,
      modules: fromUrl.modules
        .map((name) => moduleIndex.get(name.toLowerCase())?.name)
        .filter((name): name is string => name !== undefined),
      targets: fromUrl.targets.filter((slug) => targetIndex.has(slug)),
    });
    setIsUrlLoaded(true);
  }, [moduleIndex, targetIndex]);

  useEffect(() => {
    if (!isUrlLoaded) {
      return;
    }
    const query = configToSearchParams(config).toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [config, isUrlLoaded]);

  const selectedTargets = useMemo(
    () =>
      config.targets
        .map((slug) => targetIndex.get(slug))
        .filter((target): target is BuilderTarget => target !== undefined),
    [config.targets, targetIndex]
  );
  const leaves = useMemo(
    () => resolveLeafTargets(config.targets, targetIndex),
    [config.targets, targetIndex]
  );
  const summary = useMemo(
    () => summarizeCollection(leaves, collectUniqueEntries(leaves)),
    [leaves]
  );
  const leafModules = useMemo(
    () => resolveLeafModules(config.modules, moduleIndex),
    [config.modules, moduleIndex]
  );
  const exportFormats = useMemo(
    () =>
      [
        ...new Set(leafModules.flatMap((module) => module.exportFormats)),
      ].toSorted(),
    [leafModules]
  );
  const issues = useMemo(
    () =>
      validateKapeConfig({
        ...config,
        targets: uniqueKapeNames(selectedTargets),
      }),
    [config, selectedTargets]
  );
  const output = useMemo(
    () => buildOutput(config, selectedTargets, leaves),
    [config, selectedTargets, leaves]
  );

  const activePresetId = useMemo(
    () =>
      SCENARIO_PRESETS.find(
        (preset) =>
          sameMembers(
            preset.targets
              .map((name) => findTargetSlugByKapeName(targets, name))
              .filter((slug): slug is string => slug !== undefined),
            config.targets
          ) && sameMembers(preset.modules, config.modules)
      )?.id,
    [config.targets, config.modules, targets]
  );

  const updateConfig = (patch: Partial<KapeConfig>) => {
    setConfig((previous) => ({ ...previous, ...patch }));
  };

  const applyPreset = (preset: ScenarioPreset) => {
    updateConfig({
      modules: preset.modules.filter((name) =>
        moduleIndex.has(name.toLowerCase())
      ),
      msource: preset.moduleSource ?? "",
      targets: preset.targets
        .map((name) => findTargetSlugByKapeName(targets, name))
        .filter((slug): slug is string => slug !== undefined),
    });
    trackBuilderPreset(preset.id);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      trackBuilderCopy(config.format, config.targets.length);
      triggerCopied();
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    const query = configToSearchParams(config).toString();
    const url = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      trackBuilderShare(config.targets.length, config.modules.length);
      triggerLinkCopied();
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleDownload = (tab: OutputTab) => {
    const blob = new Blob([output], { type: tab.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = tab.fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    trackBuilderDownload(config.format, config.targets.length);
  };

  return (
    <div className="space-y-5">
      <PresetPanel
        activePresetId={activePresetId}
        hasSelection={config.targets.length > 0 || config.modules.length > 0}
        onApply={applyPreset}
        presets={SCENARIO_PRESETS}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChecklistPicker
          groups={targetCategories}
          headingId="targets-heading"
          items={targetItems}
          onChange={(selected) => updateConfig({ targets: selected })}
          searchLabel="Search targets"
          selected={config.targets}
          subtitle="Files KAPE copies"
          title="Targets"
        />
        <ChecklistPicker
          groups={moduleFolders}
          headingId="modules-heading"
          items={moduleItems}
          onChange={(selected) => updateConfig({ modules: selected })}
          searchLabel="Search modules"
          selected={config.modules}
          subtitle="Tools KAPE runs"
          title="Modules"
        />
      </div>

      <CollectionPreview
        leafModules={leafModules}
        selectedModuleCount={config.modules.length}
        selectedTargets={selectedTargets}
        summary={summary}
        targetIndex={targetIndex}
      />

      <OptionsPanel
        config={config}
        exportFormats={exportFormats}
        onChange={updateConfig}
      />

      <OutputPanel
        copied={copied}
        format={config.format}
        issues={issues}
        linkCopied={linkCopied}
        lockedPaths={summary.lockedPaths}
        moduleCount={config.modules.length}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onFormatChange={(format: OutputFormat) => updateConfig({ format })}
        onShare={handleShare}
        output={output}
      />
    </div>
  );
}
