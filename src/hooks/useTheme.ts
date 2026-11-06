import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "auto";

/**
 * Bridge to the inline theme controller defined in `Layout.astro`.
 * That script owns the source of truth (localStorage + the applied `<html>`
 * class) so the theme is resolved before first paint. This hook mirrors its
 * state into React and forwards changes back to it.
 */
interface ThemeController {
  get(): ThemePreference;
  set(theme: ThemePreference): void;
  apply(): void;
}

const THEME_EVENT_FALLBACK = "dfir-theme-change";

function themeEventName(): string {
  if (typeof window === "undefined") {
    return THEME_EVENT_FALLBACK;
  }
  return (
    (window as unknown as { __dfirThemeEvent?: string }).__dfirThemeEvent ??
    THEME_EVENT_FALLBACK
  );
}

function getController(): ThemeController | undefined {
  if (typeof window === "undefined") {
    return;
  }
  return (window as unknown as { __dfirTheme?: ThemeController }).__dfirTheme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("dark");

  useEffect(() => {
    const controller = getController();
    if (controller) {
      setThemeState(controller.get());
    }

    const handleChange = (event: Event) => {
      const next = (event as CustomEvent<ThemePreference>).detail;
      setThemeState(next ?? getController()?.get() ?? "dark");
    };

    const eventName = themeEventName();
    window.addEventListener(eventName, handleChange);
    return () => window.removeEventListener(eventName, handleChange);
  }, []);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    getController()?.set(next);
  };

  return { theme, setTheme };
}
