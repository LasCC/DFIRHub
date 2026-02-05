import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getBackend, getBackendsByCategory } from "@/lib/sigma/backends";
import type { BackendConfig } from "@/lib/sigma/types";

interface TargetSelectorProps {
  selected: string;
  onSelect: (backendId: string) => void;
  multiSelect?: boolean;
  selectedMulti?: string[];
  onMultiSelect?: (backendIds: string[]) => void;
}

function BackendButton({
  backend,
  isSelected,
  onClick,
  isCheckbox,
}: {
  backend: BackendConfig;
  isSelected: boolean;
  onClick: () => void;
  isCheckbox?: boolean;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        isSelected
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      {isCheckbox && (
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            isSelected
              ? "border-primary bg-primary text-background"
              : "border-white/20"
          }`}
        >
          {isSelected && "\u2713"}
        </span>
      )}
      <span className="font-medium">{backend.name}</span>
    </button>
  );
}

function BackendGroup({
  label,
  backends,
  isSelected,
  onSelect,
  multiSelect,
}: {
  label: string;
  backends: BackendConfig[];
  isSelected: (id: string) => boolean;
  onSelect: (id: string) => void;
  multiSelect: boolean;
}) {
  if (backends.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <div
        aria-label={`${label} backends`}
        className="flex flex-wrap gap-2"
        role={multiSelect ? "group" : "radiogroup"}
      >
        {backends.map((b) => (
          <BackendButton
            backend={b}
            isCheckbox={multiSelect}
            isSelected={isSelected(b.id)}
            key={b.id}
            onClick={() => onSelect(b.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function TargetSelector({
  selected,
  onSelect,
  multiSelect = false,
  selectedMulti = [],
  onMultiSelect,
}: TargetSelectorProps) {
  const siemBackends = getBackendsByCategory("siem");
  const edrBackends = getBackendsByCategory("edr");
  const otherBackends = getBackendsByCategory("other");

  const handleClick = (backendId: string) => {
    if (multiSelect && onMultiSelect) {
      const newSelection = selectedMulti.includes(backendId)
        ? selectedMulti.filter((id) => id !== backendId)
        : [...selectedMulti, backendId];
      onMultiSelect(newSelection);
    } else {
      onSelect(backendId);
    }
  };

  const isSelected = (id: string) =>
    multiSelect ? selectedMulti.includes(id) : selected === id;

  const triggerLabel = multiSelect
    ? `${selectedMulti.length} target${selectedMulti.length !== 1 ? "s" : ""}`
    : (getBackend(selected)?.name ?? selected);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex shrink-0 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/15"
          title="Select conversion target backend"
          type="button"
        >
          {triggerLabel}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[540px] space-y-4 p-4">
        <BackendGroup
          backends={siemBackends}
          isSelected={isSelected}
          label="SIEM"
          multiSelect={multiSelect}
          onSelect={handleClick}
        />
        <BackendGroup
          backends={edrBackends}
          isSelected={isSelected}
          label="EDR"
          multiSelect={multiSelect}
          onSelect={handleClick}
        />
        <BackendGroup
          backends={otherBackends}
          isSelected={isSelected}
          label="Other"
          multiSelect={multiSelect}
          onSelect={handleClick}
        />
      </PopoverContent>
    </Popover>
  );
}
