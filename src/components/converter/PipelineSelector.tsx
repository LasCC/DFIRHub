import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PipelineInfo } from "@/lib/sigma/worker/workerApi";

interface PipelineSelectorProps {
  selectedPipeline: string;
  onPipelineChange: (pipeline: string) => void;
  customPipelineYaml: string;
  onCustomPipelineChange: (yaml: string) => void;
  availablePipelines: PipelineInfo[];
}

export function PipelineSelector({
  selectedPipeline,
  onPipelineChange,
  customPipelineYaml,
  onCustomPipelineChange,
  availablePipelines,
}: PipelineSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);

  const hasSelection =
    selectedPipeline !== "" || customPipelineYaml.trim() !== "";
  const selectedLabel =
    availablePipelines.find((p) => p.name === selectedPipeline)?.name ??
    selectedPipeline;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            hasSelection
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
          }`}
          title="Select a processing pipeline to transform field names and values"
          type="button"
        >
          {selectedPipeline ? selectedLabel : "Pipeline"}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="mb-1 flex items-center justify-between px-2 pt-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Processing Pipeline
          </span>
          {hasSelection && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                onPipelineChange("");
                onCustomPipelineChange("");
              }}
              type="button"
            >
              Clear
            </button>
          )}
        </div>

        {/* None option */}
        <button
          className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04] ${
            selectedPipeline === "" ? "text-primary" : "text-foreground"
          }`}
          onClick={() => onPipelineChange("")}
          type="button"
        >
          None
        </button>

        {availablePipelines.length > 0 && (
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {availablePipelines.map((pipeline) => (
              <button
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04] ${
                  selectedPipeline === pipeline.name
                    ? "bg-white/[0.04] text-primary"
                    : "text-foreground"
                }`}
                key={pipeline.name}
                onClick={() => onPipelineChange(pipeline.name)}
                type="button"
              >
                {pipeline.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1 border-t border-white/[0.06] px-1 pb-1 pt-2">
          <button
            className="flex w-full items-center justify-between px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowCustom(!showCustom)}
            type="button"
          >
            <span>Custom Pipeline YAML</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showCustom ? "rotate-180" : ""}`}
            />
          </button>
          {showCustom && (
            <textarea
              aria-label="Custom pipeline YAML"
              className="mt-2 w-full rounded-md border border-white/[0.06] bg-white/[0.02] p-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40"
              onChange={(e) => onCustomPipelineChange(e.target.value)}
              placeholder={
                "name: Custom Pipeline\npriority: 10\ntransformations:\n  - id: field_mapping\n    type: field_name_mapping\n    mapping:\n      EventID: event_id"
              }
              rows={6}
              value={customPipelineYaml}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
