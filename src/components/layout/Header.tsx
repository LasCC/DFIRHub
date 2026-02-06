import {
  ChevronRight,
  FileSearch,
  Hammer,
  HatGlasses,
  Layers,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Search } from "../search/Search";

// Real GitHub mark icon (filled octocat)
const GitHubMark = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

// Official Sigma logo (monocle shape from sigmahq.io)
const SigmaLogo = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="currentColor"
    viewBox="155 155 750 625"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m890.394412 165c3.019653 25.589448-5.253407 50.2282-24.819179 73.916253-19.565772 23.688054-45.907539 35.53208-79.025312 35.53208l-62.977337.363397c39.393202 52.779296 59.977836 120.64775 53.603978 194.68827-14.47716 168.170707-162.549778 304.5-330.729454 304.5s-292.780187-136.329293-278.30303-304.5c14.477156-168.170706 162.549776-304.5 330.729452-304.5zm-401.090784 111.166667c-106.780747 0-200.795108 86.558282-209.986954 193.333334s69.91959 193.333333 176.700337 193.333333c106.780746 0 200.795108-86.558281 209.986952-193.333333 9.191849-106.775052-69.919588-193.333334-176.700335-193.333334z" />
  </svg>
);

interface HeaderProps {
  showSearch?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
}

const navItems: NavItem[] = [
  {
    href: "/artifacts",
    label: "artifacts",
    icon: <FileSearch className="h-4 w-4" />,
    badgeClass: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    href: "/collections",
    label: "collections",
    icon: <Layers className="h-4 w-4" />,
    badgeClass: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  },
  {
    href: "/builder",
    label: "builder",
    icon: <Hammer className="h-4 w-4" />,
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  {
    href: "/converter",
    label: "converter",
    icon: <SigmaLogo className="h-4 w-4" />,
    badgeClass: "border-purple-500/20 bg-purple-500/10 text-purple-400",
  },
];

export function Header({ showSearch = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  // Focus trap for mobile menu
  useEffect(() => {
    if (!(mobileMenuOpen && mobileNavRef.current)) {
      return;
    }

    const focusableElements =
      mobileNavRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])"
      );

    const firstElement = focusableElements[0];
    // biome-ignore lint/style/useAtIndex: NodeList.at() not supported in all browsers
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") {
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => document.removeEventListener("keydown", handleTabKey);
  }, [mobileMenuOpen]);

  return (
    <header className="glass-header sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <a
          aria-label="DFIRHub home"
          className="group focus-ring flex items-center gap-2 rounded-sm"
          href="/"
        >
          <HatGlasses aria-hidden="true" className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg tracking-tight">
            dfir<span className="text-primary">hub</span>
          </span>
        </a>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Desktop-only converter link */}
          <a
            className="focus-ring hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground md:flex"
            href="/converter"
          >
            <SigmaLogo className="h-3.5 w-3.5" />
            <span>Sigma Converter</span>
          </a>

          {showSearch && <Search />}

          {/* Mobile menu button */}
          <button
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="glass-subtle focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground transition-all duration-200 hover:border-white/[0.1] hover:text-foreground md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            ref={menuButtonRef}
            type="button"
          >
            {mobileMenuOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        aria-hidden={!mobileMenuOpen}
        aria-label="Mobile navigation"
        className={`glass-strong overflow-hidden border-white/[0.06] border-t transition-all duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        id="mobile-menu"
        ref={mobileNavRef}
        role="menu"
      >
        <nav className="space-y-1 px-4 py-3">
          {navItems.map((item, index) => (
            <a
              className="focus-ring flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground text-sm transition-all duration-200 hover:bg-white/[0.04] hover:text-foreground"
              href={item.href}
              key={item.href}
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
              style={{ animationDelay: `${index * 50}ms` }}
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg border ${item.badgeClass}`}
              >
                <span aria-hidden="true">{item.icon}</span>
              </div>
              <span className="font-medium">{item.label}</span>
              <ChevronRight
                aria-hidden="true"
                className="ml-auto h-4 w-4 text-muted-foreground/30"
              />
            </a>
          ))}

          {/* Mobile GitHub link */}
          <a
            className="focus-ring flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground text-sm transition-all duration-200 hover:bg-white/[0.04] hover:text-foreground"
            href="https://github.com/LasCC/DFIRHub"
            onClick={() => setMobileMenuOpen(false)}
            rel="noopener noreferrer"
            role="menuitem"
            tabIndex={mobileMenuOpen ? 0 : -1}
            target="_blank"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-500/20 bg-zinc-500/10">
              <GitHubMark className="h-4 w-4 text-zinc-400" />
            </div>
            <span className="font-medium">GitHub</span>
            <span className="ml-auto text-muted-foreground/40 text-xs">↗</span>
          </a>
        </nav>

        {/* Keyboard hints */}
        <div className="border-white/[0.06] border-t bg-white/[0.02] px-4 py-2.5">
          <p className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
            <kbd className="kbd text-[9px]">⌘K</kbd>
            <span>to search & navigate</span>
          </p>
        </div>
      </div>
    </header>
  );
}
