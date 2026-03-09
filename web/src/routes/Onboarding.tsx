import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Accent,
  Gender,
  Persona,
  Theme,
  getOnboardingProfile,
  saveOnboardingProfile,
} from "../api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleUserRound,
  Palette,
  Sparkles,
} from "lucide-react";

const STEPS = ["Identity", "Interests", "Persona", "Theme", "Review"] as const;

const GENDER_OPTIONS: Array<{ value: Gender; label: string; helper: string }> = [
  { value: "male", label: "Male", helper: "Sharper visual tone by default" },
  { value: "female", label: "Female", helper: "Softer visual tone by default" },
  { value: "non_binary", label: "Non-binary", helper: "Balanced neutral styling" },
  {
    value: "prefer_not_to_say",
    label: "Prefer not to say",
    helper: "Use neutral profile styling",
  },
];

const INTEREST_OPTIONS = [
  "programming",
  "games",
  "music",
  "anime",
  "sport",
  "design",
  "memes",
  "science",
  "business",
  "books",
];

const PERSONA_OPTIONS: Array<{
  value: Persona;
  title: string;
  subtitle: string;
}> = [
  {
    value: "soft_cute",
    title: "Soft / Cute",
    subtitle: "Rounded cards, warm gradients, cheerful highlights",
  },
  {
    value: "bold_dark",
    title: "Bold / Dark",
    subtitle: "High contrast, stronger edges, confident accents",
  },
  {
    value: "clean_minimal",
    title: "Clean / Minimal",
    subtitle: "Quiet visuals, typography-first hierarchy",
  },
  {
    value: "energetic_fun",
    title: "Energetic / Fun",
    subtitle: "Vivid gradients, playful rhythm, light motion",
  },
];

const ACCENT_OPTIONS: Accent[] = ["sky", "violet", "rose", "amber", "emerald"];

type OnboardingForm = {
  firstName: string;
  lastName: string;
  gender: Gender;
  birthYear: string;
  interests: string[];
  persona: Persona;
  theme: Theme;
  accent: Accent;
};

const INITIAL_FORM: OnboardingForm = {
  firstName: "",
  lastName: "",
  gender: "prefer_not_to_say",
  birthYear: "2007",
  interests: [],
  persona: "clean_minimal",
  theme: "system",
  accent: "sky",
};

export default function Onboarding() {
  const { user, profile, preferences, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<OnboardingForm>(INITIAL_FORM);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getOnboardingProfile();
        if (!active) {
          return;
        }
        setForm({
          firstName: data.first_name || profile?.firstName || "",
          lastName: data.last_name || profile?.lastName || "",
          gender: data.gender || profile?.gender || "prefer_not_to_say",
          birthYear: String(data.birth_year || profile?.birthYear || 2007),
          interests: data.interests.length > 0 ? data.interests : profile?.interests || [],
          persona: data.persona || preferences?.persona || "clean_minimal",
          theme: data.theme || preferences?.theme || "system",
          accent: data.accent || preferences?.accent || "sky",
        });
      } catch (error: any) {
        toast.error(error?.message || "Failed to load onboarding data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [preferences, profile]);

  React.useEffect(() => {
    if (user && user.needsOnboarding === false) {
      navigate("/dashboard");
    }
  }, [navigate, user]);

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  const canProceed = React.useMemo(() => {
    if (step === 0) {
      const birthYear = Number(form.birthYear);
      return (
        form.firstName.trim().length > 0 &&
        form.lastName.trim().length > 0 &&
        Number.isInteger(birthYear) &&
        birthYear >= 1950 &&
        birthYear <= new Date().getFullYear() - 10
      );
    }
    if (step === 1) {
      return form.interests.length > 0;
    }
    if (step === 2) {
      return Boolean(form.persona);
    }
    if (step === 3) {
      return Boolean(form.theme && form.accent);
    }
    return true;
  }, [form, step]);

  const toggleInterest = (interest: string) => {
    setForm((prev) => {
      if (prev.interests.includes(interest)) {
        return { ...prev, interests: prev.interests.filter((item) => item !== interest) };
      }

      if (prev.interests.length >= 8) {
        return prev;
      }

      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleNext = () => {
    if (!canProceed) {
      toast.error("Please complete this step first.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    if (!canProceed || saving) {
      return;
    }

    setSaving(true);
    try {
      await saveOnboardingProfile({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        gender: form.gender,
        birth_year: Number(form.birthYear),
        interests: form.interests,
        persona: form.persona,
        theme: form.theme,
        accent: form.accent,
      });
      await refreshUser();
      toast.success("Profile completed. Welcome to your personalized dashboard.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save onboarding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading onboarding...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_55%)]" />
        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Setup Profile
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Build your personalized workspace</h1>
            </div>
            <div className="hidden rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm font-semibold sm:block">
              Step {step + 1} / {STEPS.length}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((item, index) => (
              <div
                key={item}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  index <= step
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/70 p-5 sm:p-8">
        <div key={step} className="space-y-6 animate-[fadeIn_220ms_ease-out]">
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Identity details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    These fields help us tailor content and AI responses to your profile.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input
                      value={form.firstName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                      placeholder="Muhammadxoja"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input
                      value={form.lastName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                      placeholder="Kimyonazarov"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Birth year</Label>
                    <Input
                      value={form.birthYear}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, birthYear: event.target.value }))
                      }
                      type="number"
                      min={1950}
                      max={new Date().getFullYear() - 10}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, gender: option.value }))}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          form.gender === option.value
                            ? "border-primary/60 bg-primary/10"
                            : "border-border/70 hover:border-primary/30"
                        }`}
                      >
                        <p className="font-semibold">{option.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Pick your interests</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select up to 8 interests. These drive dashboard blocks and AI suggestions.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {INTEREST_OPTIONS.map((interest) => {
                    const selected = form.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                          selected
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/70 hover:border-primary/30"
                        }`}
                      >
                        {selected ? <Check className="mr-1 inline h-4 w-4" /> : null}
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Choose persona style</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Persona defines shape, contrast, and atmosphere of your UI.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PERSONA_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, persona: option.value }))}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        form.persona === option.value
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/70 hover:border-primary/30"
                      }`}
                    >
                      <p className="font-semibold">{option.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{option.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Theme + accent mode</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick appearance mode and accent color. You can change this later in settings.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["light", "dark", "system"] as Theme[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, theme: mode }))}
                      className={`rounded-2xl border px-4 py-4 text-sm font-semibold capitalize ${
                        form.theme === mode
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/70 hover:border-primary/30"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_OPTIONS.map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, accent }))}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold capitalize ${
                        form.accent === accent
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/70 hover:border-primary/30"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            accent === "sky"
                              ? "#0ea5e9"
                              : accent === "violet"
                                ? "#8b5cf6"
                                : accent === "rose"
                                  ? "#f43f5e"
                                  : accent === "amber"
                                    ? "#f59e0b"
                                    : "#10b981",
                        }}
                      />
                      {accent}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Final preview</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirm your onboarding profile before entering dashboard.
                  </p>
                </div>
                <div className="grid gap-4 rounded-3xl border border-border/70 bg-background/60 p-5 sm:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Identity
                    </p>
                    <div className="flex items-center gap-3">
                      <CircleUserRound className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-lg font-semibold">
                          {form.firstName} {form.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {form.gender.replace(/_/g, " ")} • {form.birthYear}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Style
                    </p>
                    <p className="text-sm font-semibold">{form.persona.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      Mode: {form.theme} • Accent: {form.accent}
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Interests
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {form.interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/70 pt-5">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 0 || saving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext} disabled={!canProceed || saving}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={!canProceed || saving}>
              {saving ? "Saving..." : "Complete Onboarding"}
              {!saving ? <Sparkles className="ml-2 h-4 w-4" /> : null}
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <Palette className="mt-0.5 h-4 w-4 text-primary" />
          <p>
            Persona and theme are applied globally across dashboard, feed, and settings. AI and fun
            cards will use your name, interests, and study stats to stay relevant.
          </p>
        </div>
      </section>
    </div>
  );
}
