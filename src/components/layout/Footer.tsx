import { BookOpen, FileSearch, Hammer, Layers, Wrench } from "lucide-react";
import { FaGithub } from "react-icons/fa";

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer
			className="border-t border-white/[0.06] mt-auto bg-white/[0.01]"
			role="contentinfo"
			aria-label="Site footer"
		>
			<div className="mx-auto max-w-6xl px-4 py-10">
				{/* Main Footer Content */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
					{/* Brand Column */}
					<div className="md:col-span-2">
						<a href="/" className="inline-flex items-center gap-2 mb-3">
							<span className="font-semibold text-lg">
								dfir<span className="text-primary">hub</span>
							</span>
						</a>
						<p className="text-sm text-muted-foreground mb-4 max-w-md">
							The comprehensive resource for Windows forensic artifacts.
							Search, explore, and generate collection scripts for DFIR investigations.
						</p>
						<a
							href="https://github.com/LasCC/DFIRHub"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-white/[0.1] transition-all"
							aria-label="GitHub Repository"
						>
							<FaGithub className="h-4 w-4" />
						</a>
					</div>

					{/* Navigation Column */}
					<div>
						<h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
							Navigate
						</h3>
						<nav className="space-y-2" aria-label="Footer navigation">
							<a
								href="/artifacts"
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<FileSearch className="h-3.5 w-3.5 text-primary/60" />
								<span>All Artifacts</span>
							</a>
							<a
								href="/collections"
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<Layers className="h-3.5 w-3.5 text-cyan-400/60" />
								<span>Collections</span>
							</a>
							<a
								href="/builder"
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<Hammer className="h-3.5 w-3.5 text-amber-400/60" />
								<span>Script Builder</span>
							</a>
						</nav>
					</div>

					{/* Resources Column */}
					<div>
						<h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
							Resources
						</h3>
						<nav className="space-y-2" aria-label="External resources">
							<a
								href="https://github.com/EricZimmerman/KapeFiles"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<FaGithub className="h-3.5 w-3.5" />
								<span>KapeFiles</span>
								<span className="text-[10px] text-muted-foreground/50">↗</span>
							</a>
							<a
								href="https://ericzimmerman.github.io/KapeDocs/"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<BookOpen className="h-3.5 w-3.5" />
								<span>KAPE Documentation</span>
								<span className="text-[10px] text-muted-foreground/50">↗</span>
							</a>
							<a
								href="https://www.sans.org/tools/kape/"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<Wrench className="h-3.5 w-3.5" />
								<span>SANS KAPE</span>
								<span className="text-[10px] text-muted-foreground/50">↗</span>
							</a>
						</nav>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="pt-6 border-t border-white/[0.06]">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						{/* Copyright */}
						<p className="text-xs text-muted-foreground/50">
							© {currentYear} DFIRHub. Data sourced from{" "}
							<a
								href="https://github.com/EricZimmerman/KapeFiles"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary/50 hover:text-primary transition-colors"
							>
								KapeFiles
							</a>
							.
						</p>

						{/* Keyboard Shortcuts */}
						<div className="flex items-center gap-4 text-[10px] text-muted-foreground/40">
							<span className="flex items-center gap-1.5">
								<kbd className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[9px]">⌘K</kbd>
								<span>search</span>
							</span>
							<span className="flex items-center gap-1.5">
								<kbd className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-[9px]">?</kbd>
								<span>shortcuts</span>
							</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
