import { Monitor, Moon, Sun } from "lucide-react";

import { type ThemePreference, useTheme } from "@/hooks/useTheme";

interface ThemeOption {
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "auto", label: "Auto (match browser preference)", Icon: Monitor },
  { value: "dark", label: "Dark theme", Icon: Moon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-lg border border-overlay/[0.08] bg-overlay/[0.02] p-0.5"
      role="radiogroup"
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value;
        return (
          <button
            aria-checked={isActive}
            aria-label={label}
            className={`focus-ring flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-200 ${
              isActive
                ? "bg-overlay/[0.1] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-haptic
            key={value}
            onClick={() => setTheme(value)}
            role="radio"
            title={label}
            type="button"
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
