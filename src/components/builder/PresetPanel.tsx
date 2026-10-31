import type { ScenarioPreset } from "../../lib/builder/presets";
import { Panel } from "../ui/Panel";

interface PresetPanelProps {
  presets: ScenarioPreset[];
  activePresetId: string | undefined;
  hasSelection: boolean;
  onApply: (preset: ScenarioPreset) => void;
}

export function PresetPanel({
  presets,
  activePresetId,
  hasSelection,
  onApply,
}: PresetPanelProps) {
  const activePreset = presets.find((preset) => preset.id === activePresetId);
  const helperText = activePreset
    ? activePreset.summary
    : hasSelection
      ? "Custom collection."
      : "Pick a preset to start, then adjust anything below.";

  return (
    <Panel headingId="scenario-heading" title="Start from a scenario">
      <div className="p-3 sm:p-4">
        <fieldset
          aria-label="Scenario presets"
          className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
        >
          {presets.map((preset) => {
            const isActive = preset.id === activePresetId;
            return (
              <button
                aria-pressed={isActive}
                className={`focus-ring inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors active:scale-[0.98] ${
                  isActive
                    ? "border-primary bg-primary font-medium text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                key={preset.id}
                onClick={() => onApply(preset)}
                title={preset.summary}
                type="button"
              >
                {preset.label}
              </button>
            );
          })}
        </fieldset>
        <p
          aria-live="polite"
          className="mt-3 min-h-4 max-w-3xl text-muted-foreground text-xs"
        >
          {helperText}
        </p>
      </div>
    </Panel>
  );
}
