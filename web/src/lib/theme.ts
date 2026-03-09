export type Theme = "light" | "dark" | "system";
export type Accent = "sky" | "violet" | "rose" | "amber" | "emerald";
export type Vibe = "minimal" | "playful" | "bold";
export type Persona = "soft_cute" | "bold_dark" | "clean_minimal" | "energetic_fun";
export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export interface ThemeRuntime {
  theme: Theme;
  accent: Accent;
  vibe: Vibe;
  persona: Persona;
  gender?: Gender | null;
}

export const DEFAULT_THEME: ThemeRuntime = {
  theme: "system",
  accent: "sky",
  vibe: "minimal",
  persona: "clean_minimal",
  gender: "prefer_not_to_say",
};

function resolveActualTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme(runtime: ThemeRuntime) {
  const root = document.documentElement;
  const actualTheme = resolveActualTheme(runtime.theme);

  root.classList.remove("light", "dark");
  root.classList.add(actualTheme);
  root.style.colorScheme = actualTheme;

  root.setAttribute("data-accent", runtime.accent);
  root.setAttribute("data-vibe", runtime.vibe);
  root.setAttribute("data-persona", runtime.persona);
  root.setAttribute("data-gender", runtime.gender ?? "prefer_not_to_say");
}

export function normalizeThemeRuntime(input: Partial<ThemeRuntime> | null | undefined): ThemeRuntime {
  return {
    theme: input?.theme ?? DEFAULT_THEME.theme,
    accent: input?.accent ?? DEFAULT_THEME.accent,
    vibe: input?.vibe ?? DEFAULT_THEME.vibe,
    persona: input?.persona ?? DEFAULT_THEME.persona,
    gender: input?.gender ?? DEFAULT_THEME.gender,
  };
}

