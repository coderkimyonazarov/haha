import React from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useAuth } from "../lib/auth";
import { updatePreferences } from "../api";
import { toast } from "sonner";
import { Theme, Accent, Vibe } from "../api";

export default function Onboarding() {
  const { user, preferences, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  // Local state for choices
  const [theme, setTheme] = React.useState<Theme>(
    preferences?.theme || "system",
  );
  const [accent, setAccent] = React.useState<Accent>(
    preferences?.accent || "sky",
  );
  const [vibe, setVibe] = React.useState<Vibe>(preferences?.vibe || "minimal");

  React.useEffect(() => {
    if (preferences?.onboardingDone) {
      navigate("/dashboard");
    }
  }, [preferences, navigate]);

  const finish = async () => {
    setLoading(true);
    try {
      await updatePreferences({
        theme,
        accent,
        vibe,
        onboardingDone: 1,
      });
      await refreshUser();
      toast.success("Welcome aboard!");
      navigate("/dashboard");
    } catch (e) {
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  const next = () => setStep((s) => s + 1);
  const prev = () => setStep((s) => s - 1);

  return (
    <Page className="max-w-2xl mx-auto flex flex-col justify-center min-h-[80vh]">
      <div className="mb-8 space-y-2 text-center" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Step {step} of 3
        </p>
        <h1 className="text-3xl font-bold">Personalize your space.</h1>
      </div>

      <Card data-animate="card" className="border-2">
        <CardHeader>
          <CardTitle>
            {step === 1 && "Choose your Theme"}
            {step === 2 && "Pick an Accent Color"}
            {step === 3 && "Select your Vibe"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    theme === t
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="font-semibold capitalize">{t}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t === "system" ? "Follows device" : `Classic ${t} mode`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(["sky", "violet", "rose", "amber", "emerald"] as Accent[]).map(
                (a) => (
                  <button
                    key={a}
                    onClick={() => setAccent(a)}
                    className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all ${
                      accent === a
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: `hsl(var(--primary))` }}
                    title={a}
                  >
                    {accent === a && (
                      <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                    )}
                  </button>
                ),
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["minimal", "playful", "bold"] as Vibe[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    vibe === v
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="font-bold capitalize">{v}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {v === "minimal" && "Clean & sharp"}
                    {v === "playful" && "Rounded & soft"}
                    {v === "bold" && "Strong & squared"}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={prev} disabled={step === 1}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={next} className="px-8">
                Continue
              </Button>
            ) : (
              <Button
                onClick={finish}
                disabled={loading}
                className="px-8 font-bold"
              >
                {loading ? "Saving..." : "Start Exploring"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
