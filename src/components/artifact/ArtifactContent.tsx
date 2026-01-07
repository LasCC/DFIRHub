import type { ReactNode } from "react";

// All animations disabled - instant display
// Using simple div wrappers instead of motion components

// Main wrapper
export function ArtifactPageContainer({ children }: { children: ReactNode }) {
	return <div>{children}</div>;
}

// Breadcrumb navigation
export function ArtifactBreadcrumb({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<nav className={className} aria-label="Breadcrumb">
			{children}
		</nav>
	);
}

// Header section
export function ArtifactHeader({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <header className={className}>{children}</header>;
}

// Generic section
export function ArtifactSection({
	children,
	className = "",
	ariaLabel,
}: {
	children: ReactNode;
	className?: string;
	ariaLabel?: string;
}) {
	return (
		<section className={className} aria-labelledby={ariaLabel}>
			{children}
		</section>
	);
}

// Card/Box section
export function ArtifactCard({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={className}>{children}</div>;
}

// Footer section
export function ArtifactFooter({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <footer className={className}>{children}</footer>;
}

// List container
export function ArtifactList({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={className}>{children}</div>;
}

export function ArtifactListItem({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={className}>{children}</div>;
}

// Scroll reveal wrapper - no animation, instant display
export function ScrollReveal({
	children,
	className = "",
	delay = 0,
}: {
	children: ReactNode;
	className?: string;
	delay?: number;
}) {
	return <div className={className}>{children}</div>;
}

// Scroll reveal container - no animation
export function ScrollRevealStagger({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={className}>{children}</div>;
}

// Child item for ScrollRevealStagger - no animation
export function ScrollRevealItem({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={className}>{children}</div>;
}
