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
import BrandMotionLogo from "../components/BrandMotionLogo";
import BrandSplash from "../components/BrandSplash";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleUserRound,
  Palette,
  Sparkles,
  Zap,
  User,
  Heart,
  Layout,
  MousePointer2,
  CheckCircle2,
  Lock,
  Calendar,
  Plus,
  Loader2
} from "lucide-react";

const STEPS = ["Identity", "Interests", "Persona", "Theme", "Review"] as const;

const GENDER_OPTIONS: Array<{ value: Gender; label: string; helper: string }> = [
  { value: "male", label: "Male", helper: "Masculine tone profile" },
  { value: "female", label: "Female", helper: "Feminine tone profile" },
  { value: "non_binary", label: "Non-binary", helper: "Neutral style profile" },
  {
    value: "prefer_not_to_say",
    label: "Private",
    helper: "Skip gender-based tone",
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
    subtitle: "Warm gradients, cheerful style",
  },
  {
    value: "bold_dark",
    title: "Bold / Dark",
    subtitle: "High contrast, deeper tones",
  },
  {
    value: "clean_minimal",
    title: "Clean / Minimal",
    subtitle: "Typography-first, quiet focus",
  },
  {
    value: "energetic_fun",
    title: "Energetic / Fun",
    subtitle: "Vivid rhythm, playful glow",
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
      const birthYearNum = Number(form.birthYear);
      return (
        form.firstName.trim().length > 0 &&
        form.lastName.trim().length > 0 &&
        Number.isInteger(birthYearNum) &&
        birthYearNum >= 1950 &&
        birthYearNum <= new Date().getFullYear() - 10
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
      toast.success("Profile initialized. Welcome aboard!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save onboarding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <BrandSplash compact message="Finalizing your environment..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-20 pt-8 sm:pt-14 px-4">
      
      {/* ── Progress Header ─────────────────────────────────── */}
      <section className="glow-hero p-6 sm:p-10 relative overflow-hidden" data-animate="fade">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="nova-badge">
                 <Zap className="h-3 w-3 fill-current" />
                 Step {step + 1}
               </div>
               <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">/ {STEPS.length}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Initialize <span className="text-gradient">Core Profile</span>
            </h1>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="hidden sm:block">
              <BrandMotionLogo className="w-24 opacity-80" decorative />
            </div>
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx < step ? 'w-4 bg-primary' : idx === step ? 'w-8 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'w-4 bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Container ───────────────────────────────── */}
      <section className="nova-card p-6 sm:p-10 min-h-[480px] flex flex-col justify-between" data-animate="card">
        <div key={step} className="animate-element">
            
            {/* Step 0: Identity */}
            {step === 0 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    Who are you?
                  </h2>
                  <p className="text-muted-foreground text-sm">Let's get the basics down. This helps AI counselor address you properly.</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                    <Input
                      className="h-12 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl"
                      value={form.firstName}
                      onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="e.g. John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                    <Input
                      className="h-12 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl"
                      value={form.lastName}
                      onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="e.g. Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Birth Year</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="h-12 pl-11 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl"
                        value={form.birthYear}
                        onChange={(e) => setForm((prev) => ({ ...prev, birthYear: e.target.value }))}
                        type="number"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Tone & Gender Preference</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setForm((prev) => ({ ...prev, gender: option.value }))}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          form.gender === option.value
                            ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                            : "border-border/60 bg-background/40 hover:border-primary/40"
                        }`}
                      >
                        <p className={`font-bold text-sm ${form.gender === option.value ? 'text-primary' : 'text-foreground'}`}>
                          {option.label}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Interests */}
            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Heart className="h-4 w-4" />
                    </div>
                    Neural Interests
                  </h2>
                  <p className="text-muted-foreground text-sm">The pulse of your feed. Choose what matters most (up to 8).</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {INTEREST_OPTIONS.map((interest) => {
                    const isSelected = form.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`h-11 px-6 rounded-2xl border text-sm font-bold capitalize transition-all flex items-center gap-2 ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                            : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Persona */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Layout className="h-4 w-4" />
                    </div>
                    Visual Persona
                  </h2>
                  <p className="text-muted-foreground text-sm">Choose the atmospheric DNA of your workspace.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {PERSONA_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setForm((prev) => ({ ...prev, persona: option.value }))}
                      className={`group p-6 rounded-[2.5rem] border text-left transition-all ${
                        form.persona === option.value
                          ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.1)]"
                          : "border-border/60 bg-background/40 hover:border-primary/40"
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-xl mb-4 flex items-center justify-center transition-all ${
                        form.persona === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                      }`}>
                         <Palette className="h-5 w-5" />
                      </div>
                      <p className={`font-black text-lg ${form.persona === option.value ? 'text-primary' : 'text-foreground'}`}>
                        {option.title}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{option.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Theme */}
            {step === 3 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <MousePointer2 className="h-4 w-4" />
                    </div>
                    Final Polish
                  </h2>
                  <p className="text-muted-foreground text-sm">Lock in your base theme and primary accent hue.</p>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-3">
                    {(["light", "dark", "system"] as Theme[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setForm((prev) => ({ ...prev, theme: mode }))}
                        className={`h-14 rounded-2xl border flex items-center justify-center font-black uppercase text-xs tracking-widest transition-all ${
                          form.theme === mode
                            ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                            : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    {ACCENT_OPTIONS.map((accent) => (
                      <button
                        key={accent}
                        onClick={() => setForm((prev) => ({ ...prev, accent }))}
                        className={`h-10 px-6 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
                          form.accent === accent
                            ? "border-primary bg-primary text-primary-foreground shadow-lg"
                            : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {accent}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    Confirm Profile
                  </h2>
                  <p className="text-muted-foreground text-sm">Behold your new academic identity. Everything looks elite.</p>
                </div>

                <div className="nova-card p-6 sm:p-8 bg-primary/5 border-primary/20 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <Lock className="h-12 w-12 text-primary/10" />
                  </div>
                  
                  <div className="flex items-center gap-5">
                    <div className="h-20 w-20 rounded-[2rem] bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white shadow-xl">
                      <CircleUserRound className="h-10 w-10" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black">{form.firstName} {form.lastName}</h3>
                      <p className="text-sm font-bold text-primary uppercase tracking-widest">
                        {form.gender.replace(/_/g, " ")} • Class of {parseInt(form.birthYear) + 18}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    <div className="p-4 rounded-2xl bg-background/60 border border-border/40">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Visual DNA</div>
                      <div className="text-sm font-bold">{form.persona.replace(/_/g, " ")} Mode</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Accent: {form.accent}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-background/60 border border-border/40">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Neural Link</div>
                      <div className="flex flex-wrap gap-1">
                         {form.interests.slice(0, 3).map(i => (
                           <span key={i} className="px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-bold text-primary">{i}</span>
                         ))}
                         {form.interests.length > 3 && <span className="text-[9px] font-bold text-muted-foreground">+{form.interests.length-3} more</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* ── Navigation Controls ────────────────────────────── */}
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <button 
            type="button" 
            onClick={handleBack} 
            disabled={step === 0 || saving}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {step < STEPS.length - 1 ? (
              <button 
                type="button" 
                onClick={handleNext} 
                disabled={!canProceed || saving}
                className="btn-nova w-full sm:w-auto h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={!canProceed || saving}
                className="btn-nova w-full sm:w-auto h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initializing Workspace...
                  </>
                ) : (
                  <>
                    Complete Neural Link
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer Detail ───────────────────────────────────── */}
      <section className="nova-panel p-6 border-primary/10 bg-primary/5 flex items-start gap-4" data-animate="fade">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-1" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your persona and theme are applied globally. AI suggestions and dashboard intelligence 
          dynamically evolve based on your interests and performance metrics.
        </p>
      </section>
    </div>
  );
}
