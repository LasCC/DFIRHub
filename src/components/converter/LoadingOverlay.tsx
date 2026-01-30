interface LoadingOverlayProps {
  progress: number;
  isVisible: boolean;
}

export function LoadingOverlay({ progress, isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null;

  const percent = Math.round(progress * 100);

  return (
    <div
      aria-busy="true"
      aria-label={`Loading Pyodide runtime: ${percent}%`}
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div className="w-48">
          <div className="mb-2 text-center text-muted-foreground text-sm">
            Loading Python runtime...
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 text-center text-muted-foreground/50 text-xs">
            {percent}%
          </div>
        </div>
        <p className="max-w-xs text-center text-muted-foreground/40 text-xs">
          Installing pySigma and detection backends. This only happens once per
          session.
        </p>
      </div>
    </div>
  );
}
