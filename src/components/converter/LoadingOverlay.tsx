interface LoadingOverlayProps {
  progress: number;
  isVisible: boolean;
  error?: string;
  onRetry?: () => void;
}

function PythonIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 256 255"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="py-blue"
          x1="12.959%"
          x2="79.639%"
          y1="12.039%"
          y2="78.201%"
        >
          <stop offset="0%" stopColor="#387EB8" />
          <stop offset="100%" stopColor="#366994" />
        </linearGradient>
        <linearGradient
          id="py-yellow"
          x1="19.128%"
          x2="90.742%"
          y1="20.579%"
          y2="88.429%"
        >
          <stop offset="0%" stopColor="#FFE052" />
          <stop offset="100%" stopColor="#FFC331" />
        </linearGradient>
      </defs>
      <path
        d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072M92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13"
        fill="url(#py-blue)"
      />
      <path
        d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897m34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13"
        fill="url(#py-yellow)"
      />
    </svg>
  );
}

export function LoadingOverlay({
  progress,
  isVisible,
  error,
  onRetry,
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  const percent = Math.round(progress * 100);

  return (
    <div
      aria-busy={!error}
      className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full items-center justify-center bg-background/80 backdrop-blur-sm"
      role={error ? "alert" : "progressbar"}
      {...(!error && {
        "aria-label": `Loading Pyodide runtime: ${percent}%`,
        "aria-valuemax": 100,
        "aria-valuemin": 0,
        "aria-valuenow": percent,
      })}
    >
      <div className="flex flex-col items-center gap-4">
        <PythonIcon
          className={`h-12 w-12 ${error ? "opacity-40" : "animate-pulse"}`}
        />

        {error ? (
          <div className="w-64">
            <div className="mb-2 text-center text-sm text-red-400">
              Failed to initialize
            </div>
            <p className="mb-4 text-center text-xs text-muted-foreground/60">
              {error}
            </p>
            {onRetry && (
              <button
                className="mx-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary/90"
                onClick={onRetry}
                type="button"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="w-48">
              <div className="mb-2 text-center text-muted-foreground text-sm">
                Loading Python runtime…
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
              Installing pySigma and detection backends. This only happens once
              per session.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
