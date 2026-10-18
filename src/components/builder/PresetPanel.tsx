import type { ScenarioPreset } from "../../lib/builder/presets";
import { Panel } from "../ui/Panel";

interface PresetPanelProps {
  presets: ScenarioPreset[];
  activePresetId: string | undefined;
  onApply: (preset: ScenarioPreset) => void;
}

function describeContents(preset: ScenarioPreset): string {
  const parts = [
    preset.targets.length > 0
      ? `${preset.targets.length} ${preset.targets.length === 1 ? "target" : "targets"}`
      : "",
    preset.modules.length > 0
      ? `${preset.modules.length} ${preset.modules.length === 1 ? "module" : "modules"}`
      : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

export function PresetPanel({
  presets,
  activePresetId,
  onApply,
}: PresetPanelProps) {
  return (
    <Panel
      headingId="scenario-heading"
      subtitle="Pick the case type. You can change every target, module and option after."
      title="Start from a scenario"
    >
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => {
          const isActive = preset.id === activePresetId;
          return (
            <button
              aria-pressed={isActive}
              className={`focus-ring flex min-w-0 flex-col gap-1.5 p-4 text-left transition-colors ${
                isActive ? "bg-primary/10" : "bg-background hover:bg-muted"
              }`}
              key={preset.id}
              onClick={() => onApply(preset)}
              type="button"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{preset.label}</span>
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {describeContents(preset)}
                </span>
              </span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                {preset.summary}
              </span>
              <span className="mt-auto truncate pt-1 font-mono text-[11px] text-muted-foreground/80">
                {[...preset.targets, ...preset.modules].join(", ")}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
