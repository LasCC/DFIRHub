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
    <nav aria-label="Breadcrumb" className={className}>
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
