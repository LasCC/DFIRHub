import {
	ChevronRight,
	FileSearch,
	Hammer,
	Layers,
	Menu,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Search } from "../search/Search";

// Magnifying glass icon SVG component
const SearchIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 32 32"
		className={className}
		fill="none"
	>
		<circle cx="13" cy="13" r="9" stroke="currentColor" strokeWidth="2.5" fill="none"/>
		<circle cx="13" cy="13" r="6" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" fill="none"/>
		<line x1="20" y1="20" x2="28" y2="28" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
		<circle cx="10" cy="10" r="1.2" fill="currentColor" fillOpacity="0.6"/>
		<circle cx="14" cy="11" r="1.2" fill="currentColor" fillOpacity="0.8"/>
		<circle cx="11" cy="15" r="1.2" fill="currentColor" fillOpacity="0.5"/>
		<circle cx="16" cy="14" r="1.2" fill="currentColor" fillOpacity="0.7"/>
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

	return (
		<header
			className="sticky top-0 z-50 w-full glass-header"
			role="banner"
		>
			<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
				{/* Logo */}
				<a
					href="/"
					className="group flex items-center gap-2 focus-ring rounded-sm"
					aria-label="DFIRHub home"
				>
					<SearchIcon className="h-5 w-5 text-primary" aria-hidden="true" />
					<span className="font-semibold tracking-tight text-lg">
						dfir<span className="text-primary">hub</span>
					</span>
				</a>

				{/* Right side controls */}
				<div className="flex items-center gap-2">
					{showSearch && <Search />}

					{/* Mobile menu button */}
					<button
						ref={menuButtonRef}
						type="button"
						className="md:hidden flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground glass-subtle border border-white/[0.06] hover:border-white/[0.1] transition-all duration-200 focus-ring rounded-lg"
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
				className={`md:hidden glass-strong border-t border-white/[0.06] overflow-hidden transition-all duration-300 ease-out ${
					mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
				}`}
				role="menu"
				aria-label="Mobile navigation"
				aria-hidden={!mobileMenuOpen}
			>
				<nav className="px-4 py-3 space-y-1">
					{navItems.map((item, index) => (
						<a
							key={item.href}
							href={item.href}
							role="menuitem"
							tabIndex={mobileMenuOpen ? 0 : -1}
							className="flex items-center gap-3 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 focus-ring rounded-lg"
							onClick={() => setMobileMenuOpen(false)}
							style={{ animationDelay: `${index * 50}ms` }}
						>
							<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
								<span className="text-primary" aria-hidden="true">
									{item.icon}
								</span>
							</div>
							<span className="font-medium">{item.label}</span>
							<ChevronRight
								className="h-4 w-4 text-muted-foreground/30 ml-auto"
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
						className="flex items-center gap-3 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 focus-ring rounded-lg"
						onClick={() => setMobileMenuOpen(false)}
					>
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
							<FaGithub className="h-4 w-4 text-zinc-400" aria-hidden="true" />
						</div>
						<span className="font-medium">GitHub</span>
						<span className="text-xs text-muted-foreground/40 ml-auto">↗</span>
					</a>
				</nav>

				{/* Keyboard hints */}
				<div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
					<p className="text-[10px] text-muted-foreground/50 flex items-center gap-2">
						<kbd className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[9px]">⌘K</kbd>
						<span>to search & navigate</span>
					</p>
				</div>
			</div>
		</header>
	);
}
