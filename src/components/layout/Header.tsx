import {
	ChevronRight,
	FolderArchive,
	Menu,
	Package,
	Terminal,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Search } from "../search/Search";

// Book-open icon SVG component
const BookOpenIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		className={className}
		fill="currentColor"
	>
		<path d="M21.17 2.06A13.1 13.1 0 0 0 19 1.87a12.94 12.94 0 0 0-7 2.05a12.94 12.94 0 0 0-7-2a13.1 13.1 0 0 0-2.17.19a1 1 0 0 0-.83 1v12a1 1 0 0 0 1.17 1a10.9 10.9 0 0 1 8.25 1.91l.12.07h.11a.91.91 0 0 0 .7 0h.11l.12-.07A10.9 10.9 0 0 1 20.83 16A1 1 0 0 0 22 15V3a1 1 0 0 0-.83-.94M11 15.35a12.87 12.87 0 0 0-6-1.48H4v-10a8.69 8.69 0 0 1 1 0a10.86 10.86 0 0 1 6 1.8Zm9-1.44h-1a12.87 12.87 0 0 0-6 1.48V5.67a10.86 10.86 0 0 1 6-1.8a8.69 8.69 0 0 1 1 0Zm1.17 4.15a13.1 13.1 0 0 0-2.17-.19a12.94 12.94 0 0 0-7 2.05a12.94 12.94 0 0 0-7-2.05a13.1 13.1 0 0 0-2.17.19A1 1 0 0 0 2 19.21a1 1 0 0 0 1.17.79a10.9 10.9 0 0 1 8.25 1.91a1 1 0 0 0 1.16 0A10.9 10.9 0 0 1 20.83 20a1 1 0 0 0 1.17-.79a1 1 0 0 0-.83-1.15"></path>
	</svg>
);

interface HeaderProps {
	showSearch?: boolean;
}

interface NavItem {
	href: string;
	label: string;
	icon: React.ReactNode;
	shortcut?: string;
}

const navItems: NavItem[] = [
	{
		href: "/artifacts",
		label: "artifacts",
		icon: <Package className="h-3.5 w-3.5" />,
		shortcut: "g a",
	},
	{
		href: "/collections",
		label: "collections",
		icon: <FolderArchive className="h-3.5 w-3.5" />,
		shortcut: "g c",
	},
	{
		href: "/builder",
		label: "builder",
		icon: <Terminal className="h-3.5 w-3.5" />,
		shortcut: "g b",
	},
];

export function Header({ showSearch = true }: HeaderProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const navRef = useRef<HTMLElement>(null);
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
		if (!mobileMenuOpen || !mobileNavRef.current) return;

		const focusableElements =
			mobileNavRef.current.querySelectorAll<HTMLElement>(
				"a[href], button:not([disabled])",
			);

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement?.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement?.focus();
				}
			}
		};

		document.addEventListener("keydown", handleTabKey);
		firstElement?.focus();

		return () => document.removeEventListener("keydown", handleTabKey);
	}, [mobileMenuOpen]);

	// Handle keyboard navigation in desktop nav
	const handleNavKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLElement>, index: number) => {
			const items = navItems.length;

			switch (e.key) {
				case "ArrowRight":
				case "ArrowDown":
					e.preventDefault();
					setActiveIndex((index + 1) % items);
					break;
				case "ArrowLeft":
				case "ArrowUp":
					e.preventDefault();
					setActiveIndex((index - 1 + items) % items);
					break;
				case "Home":
					e.preventDefault();
					setActiveIndex(0);
					break;
				case "End":
					e.preventDefault();
					setActiveIndex(items - 1);
					break;
			}
		},
		[],
	);

	// Focus management for keyboard navigation
	useEffect(() => {
		if (activeIndex >= 0 && navRef.current) {
			const links =
				navRef.current.querySelectorAll<HTMLAnchorElement>(
					'a[role="menuitem"]',
				);
			links[activeIndex]?.focus();
		}
	}, [activeIndex]);

	return (
		<header
			className="sticky top-0 z-50 w-full bg-[var(--surface-1)]/95 backdrop-blur-md border-b border-white/[0.04] shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2),0_1px_3px_0_rgba(0,0,0,0.3)]"
			role="banner"
		>
			<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
				{/* Logo */}
				<a
					href="/"
					className="group flex items-center gap-2 focus-ring rounded-sm"
					aria-label="DFIRHub home"
				>
					<BookOpenIcon className="h-5 w-5 text-primary" aria-hidden="true" />
					<span className="font-semibold tracking-tight text-lg">
						dfir<span className="text-primary">hub</span>
					</span>
				</a>

				{/* Desktop Navigation */}
				<nav
					ref={navRef}
					className="hidden md:flex items-center gap-1"
					role="menubar"
					aria-label="Main navigation"
				>
					{navItems.map((item, index) => (
						<a
							key={item.href}
							href={item.href}
							role="menuitem"
							tabIndex={activeIndex === -1 || activeIndex === index ? 0 : -1}
							onKeyDown={(e) => handleNavKeyDown(e, index)}
							onFocus={() => setActiveIndex(index)}
							onBlur={() => setActiveIndex(-1)}
							className="group flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-[var(--surface-3)] rounded-md transition-all duration-200 focus-ring hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_0_rgba(0,0,0,0.3)]"
							aria-current={
								typeof window !== "undefined" &&
								window.location.pathname === item.href
									? "page"
									: undefined
							}
						>
							<span
								className="text-primary/60 group-hover:text-primary transition-colors"
								aria-hidden="true"
							>
								{item.icon}
							</span>
							<span>{item.label}</span>
							{item.shortcut && (
								<span className="hidden lg:inline-flex ml-1 text-[10px] text-muted-foreground/50 kbd">
									{item.shortcut}
								</span>
							)}
						</a>
					))}
				</nav>

				{/* Right side controls */}
				<div className="flex items-center gap-2">
					{showSearch && <Search />}

					{/* Mobile menu button */}
					<button
						ref={menuButtonRef}
						type="button"
						className="md:hidden flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 focus-ring rounded-sm"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						aria-expanded={mobileMenuOpen}
						aria-controls="mobile-menu"
						aria-label={
							mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
						}
					>
						{mobileMenuOpen ? (
							<X className="h-5 w-5" aria-hidden="true" />
						) : (
							<Menu className="h-5 w-5" aria-hidden="true" />
						)}
					</button>
				</div>
			</div>

			{/* Mobile Navigation */}
			<div
				id="mobile-menu"
				ref={mobileNavRef}
				className={`md:hidden border-t border-border/50 bg-background/98 backdrop-blur-lg overflow-hidden transition-all duration-300 ease-out ${
					mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
				}`}
				role="menu"
				aria-label="Mobile navigation"
				aria-hidden={!mobileMenuOpen}
			>
				<nav className="px-4 py-4 space-y-2">
					{navItems.map((item, index) => (
						<a
							key={item.href}
							href={item.href}
							role="menuitem"
							tabIndex={mobileMenuOpen ? 0 : -1}
							className="flex items-center gap-3 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 focus-ring rounded-sm"
							onClick={() => setMobileMenuOpen(false)}
							style={{ animationDelay: `${index * 50}ms` }}
						>
							<span className="text-primary" aria-hidden="true">
								{item.icon}
							</span>
							<span className="font-medium">{item.label}</span>
							<ChevronRight
								className="h-3.5 w-3.5 text-muted-foreground/50 ml-auto"
								aria-hidden="true"
							/>
						</a>
					))}

					{/* Mobile GitHub link */}
					<a
						href="https://github.com/LasCC/DFIRHub"
						target="_blank"
						rel="noopener noreferrer"
						role="menuitem"
						tabIndex={mobileMenuOpen ? 0 : -1}
						className="flex items-center gap-3 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 focus-ring rounded-sm"
						onClick={() => setMobileMenuOpen(false)}
					>
						<FaGithub className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
						<span className="font-medium">GitHub</span>
						<span className="text-xs text-muted-foreground/50 ml-auto">↗</span>
					</a>
				</nav>

				{/* Keyboard hints */}
				<div className="px-4 py-2 border-t border-border/30 bg-secondary/20">
					<p className="text-[10px] text-muted-foreground/60 flex items-center gap-2">
						<span className="kbd text-[9px]">?</span>
						<span>for keyboard shortcuts</span>
					</p>
				</div>
			</div>
		</header>
	);
}
