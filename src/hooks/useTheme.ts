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

const THEME_EVENT = "dfir-theme-change";

function getController(): ThemeController | undefined {
  if (typeof window === "undefined") {
    return;
  }
  return (window as unknown as { __dfirTheme?: ThemeController }).__dfirTheme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("auto");

  useEffect(() => {
    const controller = getController();
    if (controller) {
      setThemeState(controller.get());
    }

    const handleChange = (event: Event) => {
      const next = (event as CustomEvent<ThemePreference>).detail;
      setThemeState(next ?? getController()?.get() ?? "auto");
    };

    window.addEventListener(THEME_EVENT, handleChange);
    return () => window.removeEventListener(THEME_EVENT, handleChange);
  }, []);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    getController()?.set(next);
  };

  return { theme, setTheme };
}
