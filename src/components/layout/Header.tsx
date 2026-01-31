import {
  ChevronRight,
  FileSearch,
  FlaskConical,
  Github,
  Hammer,
  Layers,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Search } from "../search/Search";

// Magnifying glass icon SVG component
const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="24"
    viewBox="0 0 32 32"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Search</title>
    <circle
      cx="13"
      cy="13"
      fill="none"
      r="9"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <circle
      cx="13"
      cy="13"
      fill="none"
      r="6"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="0.5"
    />
    <line
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="3"
      x1="20"
      x2="28"
      y1="20"
      y2="28"
    />
    <circle cx="10" cy="10" fill="currentColor" fillOpacity="0.6" r="1.2" />
    <circle cx="14" cy="11" fill="currentColor" fillOpacity="0.8" r="1.2" />
    <circle cx="11" cy="15" fill="currentColor" fillOpacity="0.5" r="1.2" />
    <circle cx="16" cy="14" fill="currentColor" fillOpacity="0.7" r="1.2" />
  </svg>
);

interface HeaderProps {
  showSearch?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/artifacts",
    label: "artifacts",
    icon: <FileSearch className="h-4 w-4" />,
  },
  {
    href: "/collections",
    label: "collections",
    icon: <Layers className="h-4 w-4" />,
  },
  {
    href: "/builder",
    label: "builder",
    icon: <Hammer className="h-4 w-4" />,
  },
  {
    href: "/converter",
    label: "converter",
    icon: <FlaskConical className="h-4 w-4" />,
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
          <SearchIcon aria-hidden="true" className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg tracking-tight">
            dfir<span className="text-primary">hub</span>
          </span>
        </a>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Desktop-only converter button */}
          <a
            className="focus-ring hidden h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-all hover:bg-primary/20 md:flex"
            href="/converter"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>converter</span>
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-primary">
              New
            </span>
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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <span aria-hidden="true" className="text-primary">
                  {item.icon}
                </span>
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
              <Github aria-hidden="true" className="h-4 w-4 text-zinc-400" />
            </div>
            <span className="font-medium">GitHub</span>
            <span className="ml-auto text-muted-foreground/40 text-xs">↗</span>
          </a>
        </nav>

        {/* Keyboard hints */}
        <div className="border-white/[0.06] border-t bg-white/[0.02] px-4 py-2.5">
          <p className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
            <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px]">
              ⌘K
            </kbd>
            <span>to search & navigate</span>
          </p>
        </div>
      </div>
    </header>
  );
}
