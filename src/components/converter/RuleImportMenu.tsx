import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { sigmaExamples } from "@/lib/sigma/sigma-examples";

interface RuleImportMenuProps {
  onExampleSelect: (yaml: string) => void;
  onSearchSigma: () => void;
}

export function RuleImportMenu({
  onExampleSelect,
  onSearchSigma,
}: RuleImportMenuProps) {
  const [open, setOpen] = useState(false);

  const chooseExample = (yaml: string) => {
    setOpen(false);
    onExampleSelect(yaml);
  };

  const openSearch = () => {
    setOpen(false);
    onSearchSigma();
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] px-2.5 text-muted-foreground text-sm transition-colors hover:border-overlay/[0.12] hover:text-foreground active:scale-[0.98]"
          title="Import a rule from SigmaHQ or load an example"
          type="button"
        >
          Import
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1.5">
        <button
          className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-overlay/[0.05]"
          onClick={openSearch}
          type="button"
        >
          <Search
            aria-hidden="true"
            className="h-3.5 w-3.5 text-muted-foreground"
          />
          <span className="flex-1">Search SigmaHQ</span>
          <kbd className="kbd kbd-compact">⌘⇧K</kbd>
        </button>

        <p className="px-2.5 pt-3 pb-1 font-medium text-xs text-muted-foreground">
          Examples
        </p>
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          {sigmaExamples.map((example) => (
            <button
              className="focus-ring w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-overlay/[0.05]"
              key={example.title}
              onClick={() => chooseExample(example.yaml)}
              type="button"
            >
              <span className="block font-medium text-foreground text-sm">
                {example.title}
              </span>
              <span className="mt-0.5 line-clamp-1 block text-muted-foreground text-xs">
                {example.description}
              </span>
            </button>
          ))}
        </div>

        <p className="px-2.5 pt-2 pb-1 text-[11px] text-muted-foreground/80">
          You can also drop a .yml file on the editor.
        </p>
      </PopoverContent>
    </Popover>
  );
}
