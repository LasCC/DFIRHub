interface SearchFooterProps {
  canCopyCommand: boolean;
  copied: boolean;
  modifierKey: string;
  primaryActionLabel: string;
}

interface KeyHintProps {
  keys: string[];
  label: string;
}

const KeyHint = ({ keys, label }: KeyHintProps) => (
  <span className="flex items-center gap-1.5">
    <span className="flex items-center gap-0.5">
      {keys.map((key) => (
        <kbd className="kbd kbd-compact" key={key}>
          {key}
        </kbd>
      ))}
    </span>
    <span>{label}</span>
  </span>
);

export function SearchFooter({
  canCopyCommand,
  copied,
  modifierKey,
  primaryActionLabel,
}: SearchFooterProps) {
  return (
    <div className="hidden items-center justify-between border-overlay/[0.06] border-t bg-overlay/[0.02] px-4 py-2.5 text-muted-foreground text-xs sm:flex">
      <div className="flex items-center gap-4">
        <KeyHint keys={["↑", "↓"]} label="Navigate" />
        <KeyHint keys={["↵"]} label={primaryActionLabel} />
        {canCopyCommand && (
          <KeyHint
            keys={[modifierKey, "C"]}
            label={copied ? "Copied" : "Copy KAPE command"}
          />
        )}
      </div>
      <KeyHint keys={["esc"]} label="Close" />
    </div>
  );
}
