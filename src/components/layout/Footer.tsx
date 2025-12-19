import { Heart } from "lucide-react";
import { FaGithub } from "react-icons/fa";

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer
			className="border-t border-border/50 py-6 mt-auto"
			role="contentinfo"
			aria-label="Site footer"
		>
			<div className="mx-auto max-w-6xl px-4">
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
					{/* Brand */}
					<div className="flex items-center gap-2">
						<span className="text-primary" aria-hidden="true">
							$
						</span>
						<span>
							built with{" "}
							<Heart
								className="inline-block h-3 w-3 text-red-400"
								aria-label="love"
							/>{" "}
							for the dfir community
						</span>
					</div>

					{/* Navigation */}
					<nav
						className="flex items-center gap-4"
						aria-label="Footer navigation"
					>
						<a
							href="https://github.com/LasCC/DFIRHub"
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-center gap-1 hover:text-foreground transition-colors focus-ring rounded-sm px-1"
						>
							<FaGithub className="h-3 w-3" aria-hidden="true" />
							<span>[DFIRHub]</span>
							<span className="sr-only">(opens in new tab)</span>
						</a>
						<a
							href="https://github.com/EricZimmerman/KapeFiles"
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-center gap-1 hover:text-foreground transition-colors focus-ring rounded-sm px-1"
						>
							<FaGithub className="h-3 w-3" aria-hidden="true" />
							<span>[KapeFiles]</span>
							<span className="sr-only">(opens in new tab)</span>
						</a>
						<a
							href="/about"
							className="hover:text-foreground transition-colors focus-ring rounded-sm px-1"
						>
							[about]
						</a>
						<a
							href="/legal"
							className="hover:text-foreground transition-colors focus-ring rounded-sm px-1"
						>
							[legal]
						</a>
					</nav>
				</div>

				{/* Keyboard hint */}
				<div className="mt-4 pt-4 border-t border-border/30 text-center">
					<p className="text-[10px] text-muted-foreground/40 flex items-center justify-center gap-2">
						<span>keyboard shortcuts:</span>
						<kbd className="kbd text-[9px]">/</kbd>
						<span>search</span>
						<span className="text-muted-foreground/20">•</span>
						<kbd className="kbd text-[9px]">?</kbd>
						<span>help</span>
					</p>
				</div>

				{/* Copyright */}
				<div className="mt-2 text-center">
					<p className="text-[10px] text-muted-foreground/30">
						© {currentYear} DFIRHub. Data sourced from{" "}
						<a
							href="https://github.com/EricZimmerman/KapeFiles"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary/40 hover:text-primary/60 transition-colors"
						>
							KapeFiles
							<span className="sr-only">(opens in new tab)</span>
						</a>
						.
					</p>
				</div>
			</div>
		</footer>
	);
}
