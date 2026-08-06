import {
  ArrowRight,
  FileSearch,
  HatGlasses,
  Layers,
  Menu,
  Sigma,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Search } from "../search/Search";
import { ThemeToggle } from "./ThemeToggle";

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

interface HeaderProps {
  showSearch?: boolean;
  currentPath?: string;
}

const navItems = [
  { href: "/artifacts", label: "Artifacts", Icon: FileSearch },
  { href: "/collections", label: "Collections", Icon: Layers },
  { href: "/builder", label: "Builder", Icon: Wrench },
  { href: "/converter", label: "Converter", Icon: Sigma },
];

export function Header({ showSearch = true, currentPath }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    currentPath === href || currentPath?.startsWith(`${href}/`);

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

  // Keep the page fixed while the mobile drawer is open.
  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
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
    const lastElement = [...focusableElements].at(-1);

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
    <header className="glass-header relative sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        {/* Logo */}
        <a
          aria-label="DFIRHub home"
          className="focus-ring flex shrink-0 items-center gap-2 rounded-sm"
          href="/"
        >
          <HatGlasses aria-hidden="true" className="h-5 w-5 text-primary" />
          <span className="font-semibold text-base tracking-tight">
            DFIRHub
          </span>
        </a>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`focus-ring rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive(item.href)
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:bg-overlay/[0.05] hover:text-foreground"
                  }`}
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2">
          <a
            aria-label="DFIRHub on GitHub (opens in new tab)"
            className="focus-ring hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay/[0.05] hover:text-foreground md:flex"
            href="https://github.com/LasCC/DFIRHub"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitHubMark className="h-4.5 w-4.5" />
          </a>

          {showSearch && <Search />}

          <ThemeToggle />

          {/* Mobile menu button */}
          <button
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className={`focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-overlay/[0.05] hover:text-foreground md:hidden ${
              mobileMenuOpen ? "bg-overlay/[0.06] text-foreground" : ""
            }`}
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
        className={`absolute inset-x-0 top-full md:hidden ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        id="mobile-menu"
      >
        <button
          aria-label="Close navigation menu"
          className={`fixed inset-x-0 bottom-0 top-14 z-40 bg-black/20 transition-opacity duration-200 ${
            mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => {
            setMobileMenuOpen(false);
            menuButtonRef.current?.focus();
          }}
          type="button"
        />

        <div
          className={`glass-strong relative z-50 mx-3 mt-2 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl p-2 transition-[opacity,transform,visibility] duration-200 ease-out ${
            mobileMenuOpen
              ? "visible translate-y-0 opacity-100"
              : "invisible -translate-y-2 opacity-0"
          }`}
          ref={mobileNavRef}
        >
          <nav aria-label="Mobile navigation" className="space-y-1">
            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Navigate
            </p>

            {navItems.map((item) => {
              const Icon = item.Icon;
              const active = isActive(item.href);

              return (
                <a
                  aria-current={active ? "page" : undefined}
                  className={`group focus-ring flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                    active
                      ? "bg-primary/[0.08] font-medium text-foreground"
                      : "text-muted-foreground hover:bg-overlay/[0.05] hover:text-foreground"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                      active
                        ? "border-primary/30 bg-primary/[0.1] text-primary"
                        : "border-border bg-overlay/[0.03] text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className={`ml-auto h-4 w-4 transition-opacity ${
                      active
                        ? "text-primary opacity-100"
                        : "text-muted-foreground opacity-40 group-hover:opacity-100"
                    }`}
                  />
                </a>
              );
            })}

            <div className="my-2 border-t border-border" />

            <a
              className="group focus-ring flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-overlay/[0.05] hover:text-foreground"
              href="https://github.com/LasCC/DFIRHub"
              onClick={() => setMobileMenuOpen(false)}
              rel="noopener noreferrer"
              tabIndex={mobileMenuOpen ? 0 : -1}
              target="_blank"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-overlay/[0.03]">
                <GitHubMark className="h-4 w-4" />
              </span>
              <span>
                GitHub
                <span className="sr-only">(opens in new tab)</span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="ml-auto h-4 w-4 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-100"
              />
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
