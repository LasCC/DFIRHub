import { BookOpen, FileSearch, Hammer, Layers, Wrench } from "lucide-react";
import { FaGithub } from "react-icons/fa";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      aria-label="Site footer"
      className="mt-auto border-white/[0.06] border-t bg-white/[0.01]"
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Main Footer Content */}
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <a className="mb-3 inline-flex items-center gap-2" href="/">
              <span className="font-semibold text-lg">
                dfir<span className="text-primary">hub</span>
              </span>
            </a>
            <p className="mb-4 max-w-md text-muted-foreground text-sm">
              The comprehensive resource for Windows forensic artifacts. Search,
              explore, and generate collection scripts for DFIR investigations.
            </p>
            <a
              aria-label="GitHub Repository"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-muted-foreground transition-all hover:border-white/[0.1] hover:text-foreground"
              href="https://github.com/LasCC/DFIRHub"
              rel="noopener noreferrer"
              target="_blank"
            >
              <FaGithub className="h-4 w-4" />
            </a>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="mb-4 text-muted-foreground text-xs uppercase tracking-wider">
              Navigate
            </h3>
            <nav aria-label="Footer navigation" className="space-y-2">
              <a
                className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="/artifacts"
              >
                <FileSearch className="h-3.5 w-3.5 text-primary/60" />
                <span>All Artifacts</span>
              </a>
              <a
                className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="/collections"
              >
                <Layers className="h-3.5 w-3.5 text-cyan-400/60" />
                <span>Collections</span>
              </a>
              <a
                className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="/builder"
              >
                <Hammer className="h-3.5 w-3.5 text-amber-400/60" />
                <span>Script Builder</span>
              </a>
            </nav>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="mb-4 text-muted-foreground text-xs uppercase tracking-wider">
              Resources
            </h3>
            <nav aria-label="External resources" className="space-y-2">
              <a
                className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://github.com/EricZimmerman/KapeFiles"
                rel="noopener noreferrer"
                target="_blank"
              >
                <FaGithub className="h-3.5 w-3.5" />
                <span>KapeFiles</span>
                <span className="text-[10px] text-muted-foreground/50">↗</span>
              </a>
              <a
                className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://ericzimmerman.github.io/KapeDocs/"
                rel="noopener noreferrer"
                target="_blank"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>KAPE Documentation</span>
                <span className="text-[10px] text-muted-foreground/50">↗</span>
              </a>
              <a
                className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://www.sans.org/tools/kape/"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>SANS KAPE</span>
                <span className="text-[10px] text-muted-foreground/50">↗</span>
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-white/[0.06] border-t pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Copyright */}
            <p className="text-muted-foreground/50 text-xs">
              © {currentYear} DFIRHub. Data sourced from{" "}
              <a
                className="text-primary/50 transition-colors hover:text-primary"
                href="https://github.com/EricZimmerman/KapeFiles"
                rel="noopener noreferrer"
                target="_blank"
              >
                KapeFiles
              </a>
              .
            </p>

            {/* Keyboard Shortcuts */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground/40">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px]">
                  ⌘K
                </kbd>
                <span>search</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px]">
                  ?
                </kbd>
                <span>shortcuts</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
