import type { ReactNode } from "react";

interface PanelProps {
  actions?: ReactNode;
  cardClassName?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  headingId?: string;
  headingLevel?: "h2" | "h3";
  subtitle?: ReactNode;
  title: ReactNode;
  toolbar?: ReactNode;
}

export function Panel({
  actions,
  cardClassName = "",
  children,
  className = "",
  footer,
  headingId,
  headingLevel: Heading = "h2",
  subtitle,
  title,
  toolbar,
}: PanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={`panel ${className}`.trim()}
    >
      <header className="panel-header" data-pagefind-ignore>
        <div className="min-w-0">
          <Heading className="panel-title" id={headingId}>
            {title}
          </Heading>
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className={`panel-card ${cardClassName}`.trim()}>
        {toolbar && (
          <div className="panel-toolbar" data-pagefind-ignore>
            {toolbar}
          </div>
        )}
        {children}
        {footer && (
          <div className="panel-footer" data-pagefind-ignore>
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}
