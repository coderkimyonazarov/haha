/**
 * Sypev Theme Engine
 * Manages theme (light/dark) and accent colors via HTML data attributes.
 */

export type Theme = "light" | "dark" | "system";
export type Accent = "sky" | "violet" | "rose" | "amber" | "emerald";
export type Vibe = "minimal" | "playful" | "bold";

export interface UserPreferences {
  theme: Theme;
  accent: Accent;
  vibe: Vibe;
  onboardingDone: boolean;
}

export function applyTheme(prefs: UserPreferences) {
  const root = window.document.documentElement;

  // 1. Light/Dark
  let actualTheme: "light" | "dark" =
    prefs.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : (prefs.theme as "light" | "dark");

  root.classList.remove("light", "dark");
  root.classList.add(actualTheme);
  root.style.colorScheme = actualTheme;

  // 2. Accent
  root.setAttribute("data-accent", prefs.accent);

  // 3. Vibe
  root.setAttribute("data-vibe", prefs.vibe);
}

export function setupThemeWatcher() {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = () => {
    // If user is on 'system', we need to re-apply
    // We'll rely on the auth context to re-trigger applyTheme
  };
  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}
