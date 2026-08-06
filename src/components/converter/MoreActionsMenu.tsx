import { Check, Ellipsis, FileDown, Link, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MoreActionsMenuProps {
  canShare: boolean;
  canExport: boolean;
  shareCopied: boolean;
  showAdvanced: boolean;
  onShare: () => void;
  onExport: () => void;
  onToggleAdvanced: () => void;
}

/**
 * "More actions" dropdown for the converter toolbar.
 * Owns its open state and container ref so each instance (desktop + mobile)
 * handles click-outside independently — previously a single ref was attached
 * to both simultaneously-rendered containers, so clicks inside the desktop
 * dropdown were seen as "outside" and closed it.
 */
export function MoreActionsMenu({
  canShare,
  canExport,
  shareCopied,
  showAdvanced,
  onShare,
  onExport,
  onToggleAdvanced,
}: MoreActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside this instance's container
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More actions"
        className="flex items-center justify-center rounded-lg border border-overlay/[0.08] bg-overlay/[0.03] p-2 text-muted-foreground transition-colors hover:border-overlay/[0.12] hover:text-foreground"
        onClick={() => setOpen((prev) => !prev)}
        title="More actions"
        type="button"
      >
        <Ellipsis aria-hidden="true" className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-overlay/[0.08] bg-popover shadow-xl shadow-black/40"
          role="menu"
        >
          <div className="p-1">
            <button
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-overlay/[0.06] hover:text-foreground disabled:opacity-40"
              disabled={!canShare}
              onClick={() => {
                onShare();
                setOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              {shareCopied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
              {shareCopied ? "Copied!" : "Copy share link"}
            </button>
            {canExport && (
              <button
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-overlay/[0.06] hover:text-foreground"
                onClick={() => {
                  onExport();
                  setOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export as ZIP
              </button>
            )}
            <div className="mx-2 my-1 h-px bg-overlay/[0.06]" />
            <button
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-overlay/[0.06] ${
                showAdvanced
                  ? "text-violet-700 dark:text-violet-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                onToggleAdvanced();
                setOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Advanced options
              {showAdvanced && (
                <Check className="ml-auto h-3 w-3 text-violet-700 dark:text-violet-400" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
