import { Keyboard, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["g", "h"], description: "Go to home" },
      { keys: ["g", "a"], description: "Go to all artifacts" },
      { keys: ["g", "c"], description: "Go to collections" },
      { keys: ["g", "b"], description: "Go to builder" },
    ],
  },
  {
    title: "Search",
    shortcuts: [
      { keys: ["/"], description: "Focus search input" },
      { keys: ["⌘", "K"], description: "Open search dialog" },
      { keys: ["↑", "↓"], description: "Navigate results" },
      { keys: ["↵"], description: "Select result" },
      { keys: ["Esc"], description: "Close search" },
    ],
  },
  {
    title: "Lists",
    shortcuts: [
      { keys: ["j"], description: "Move down in list" },
      { keys: ["k"], description: "Move up in list" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["?"], description: "Show this help" },
      { keys: ["Esc"], description: "Close modals / blur" },
    ],
  },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;

      if (e.key === "?" && e.shiftKey && !isInput) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Also listen for the hidden trigger button
  useEffect(() => {
    const trigger = document.getElementById("keyboard-help-trigger");
    if (trigger) {
      const handleClick = () => setIsOpen(true);
      trigger.addEventListener("click", handleClick);
      return () => trigger.removeEventListener("click", handleClick);
    }
  }, []);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      const modal = document.getElementById("keyboard-shortcuts-modal");
      if (!modal) {
        return;
      }

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const first = focusable[0];
      const last = focusable.at(-1);

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="keyboard-shortcuts-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onKeyDown={handleKeyDown}
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-in bg-background/80 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div
        className="relative mx-4 w-full max-w-lg animate-scale-in border border-border bg-card shadow-2xl"
        id="keyboard-shortcuts-modal"
        style={{ animationDuration: "200ms" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 text-primary">
              <Keyboard aria-hidden="true" className="h-4 w-4" />
            </div>
            <h2 className="font-medium text-sm" id="keyboard-shortcuts-title">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            aria-label="Close keyboard shortcuts"
            className="focus-ring rounded-sm p-2 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto p-5">
          <div className="grid gap-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span aria-hidden="true" className="text-primary/50">
                    //
                  </span>
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      className="flex items-center justify-between py-1.5"
                      key={index}
                    >
                      <span className="text-muted-foreground text-sm">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span
                            className="flex items-center gap-1"
                            key={keyIndex}
                          >
                            {keyIndex > 0 && (
                              <span className="text-muted-foreground/30 text-xs">
                                +
                              </span>
                            )}
                            <kbd className="kbd min-w-[24px] text-center">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border border-t bg-secondary/20 px-5 py-3">
          <p className="text-center text-[10px] text-muted-foreground/60">
            Press <kbd className="kbd text-[9px]">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
}
