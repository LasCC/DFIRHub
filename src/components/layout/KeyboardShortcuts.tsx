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
			if (!modal) return;

			const focusable = modal.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last?.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first?.focus();
			}
		}
	}, []);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center"
			role="dialog"
			aria-modal="true"
			aria-labelledby="keyboard-shortcuts-title"
			onKeyDown={handleKeyDown}
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in"
				onClick={() => setIsOpen(false)}
				aria-hidden="true"
			/>

			{/* Modal */}
			<div
				id="keyboard-shortcuts-modal"
				className="relative w-full max-w-lg mx-4 bg-card border border-border shadow-2xl animate-scale-in"
				style={{ animationDuration: "200ms" }}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 text-primary">
							<Keyboard className="h-4 w-4" aria-hidden="true" />
						</div>
						<h2 id="keyboard-shortcuts-title" className="text-sm font-medium">
							Keyboard Shortcuts
						</h2>
					</div>
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus-ring rounded-sm"
						aria-label="Close keyboard shortcuts"
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</button>
				</div>

				{/* Content */}
				<div className="p-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
					<div className="grid gap-6">
						{shortcutGroups.map((group) => (
							<div key={group.title}>
								<h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
									<span className="text-primary/50" aria-hidden="true">
										//
									</span>
									{group.title}
								</h3>
								<div className="space-y-2">
									{group.shortcuts.map((shortcut, index) => (
										<div
											key={index}
											className="flex items-center justify-between py-1.5"
										>
											<span className="text-sm text-muted-foreground">
												{shortcut.description}
											</span>
											<div className="flex items-center gap-1">
												{shortcut.keys.map((key, keyIndex) => (
													<span
														key={keyIndex}
														className="flex items-center gap-1"
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
				<div className="px-5 py-3 border-t border-border bg-secondary/20">
					<p className="text-[10px] text-muted-foreground/60 text-center">
						Press <kbd className="kbd text-[9px]">?</kbd> to toggle this help
					</p>
				</div>
			</div>
		</div>
	);
}
