import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth";
import { updatePreferences } from "../api";
import { toast } from "sonner";
import { Theme, Accent, Vibe } from "../api";
import { Paintbrush, Palette, LayoutTemplate, Command, ArrowRight, ArrowLeft } from "lucide-react";
import gsap from "gsap";

export default function Onboarding() {
  const { preferences, refreshUser } = useAuth();
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

  const containerRef = React.useRef<HTMLDivElement>(null);
  const stepContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (preferences?.onboardingDone) {
      navigate("/dashboard");
    }
  }, [preferences, navigate]);

  React.useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        ".animate-intro",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, []);

  React.useEffect(() => {
    if (stepContainerRef.current) {
      gsap.fromTo(
        stepContainerRef.current,
        { x: 20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [step]);

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
    <div className="min-h-screen flex w-full relative overflow-hidden bg-background" ref={containerRef}>
      {/* Visual Background */}
      <div className="absolute inset-0 auth-split-gradient pointer-events-none opacity-40 mix-blend-multiply dark:mix-blend-screen" />

      <div className="flex-1 grid lg:grid-cols-2 relative z-10 w-full max-w-[1400px] mx-auto">
        
        {/* Left Side: Branding / Intro */}
        <div className="hidden lg:flex flex-col justify-between p-12 pr-20 animate-intro">
          <div>
            <div className="flex items-center gap-2 mb-16">
              <Command className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold tracking-tight">Test_Bro</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
              Design your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                Experience.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-md">
              Tailor the interface perfectly to your workflow and aesthetic preferences.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm font-semibold text-muted-foreground">
              <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 3 ? "bg-primary" : "bg-border"}`} />
            </div>
            <p className="text-sm font-medium pt-2">Step {step} of 3</p>
          </div>
        </div>

        {/* Right Side: Setup Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative">
          
          <div className="w-full max-w-lg glass-panel p-8 sm:p-12 rounded-[2.5rem]">
            
            <div className="mb-8 animate-intro">
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                {step === 1 && "Choose your Theme"}
                {step === 2 && "Pick an Accent Color"}
                {step === 3 && "Select your Vibe"}
              </h2>
              <p className="text-muted-foreground text-base">
                {step === 1 && "Decide how Test_Bro looks day and night."}
                {step === 2 && "Select a primary color to highlight your actions."}
                {step === 3 && "Choose the overall shape and structural feel."}
              </p>
            </div>

            <div ref={stepContainerRef} className="min-h-[220px]">
              {step === 1 && (
                <div className="grid grid-cols-1 gap-4">
                  {(["light", "dark", "system"] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                        theme === t
                          ? "border-primary bg-primary/5 shadow-sm ring-4 ring-primary/10"
                          : "border-border/50 bg-background/50 hover:bg-background hover:border-border"
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${theme === t ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Paintbrush className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-lg capitalize">{t}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {t === "system" ? "Follows device preferences" : `Classic ${t} mode experience`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(["sky", "violet", "rose", "amber", "emerald"] as Accent[]).map(
                    (a) => (
                      <button
                        key={a}
                        onClick={() => setAccent(a)}
                        className={`aspect-square rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                          accent === a
                            ? "border-primary bg-primary/5 shadow-md ring-4 ring-primary/10 scale-105"
                            : "border-border/50 bg-background/40 hover:bg-background hover:border-border"
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-full shadow-inner flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `var(--color-${a}-500, #3b82f6)` }} // Fallback styling conceptual map 
                        >
                          {accent === a && <div className="w-3 h-3 bg-white rounded-full shadow-sm" />}
                        </div>
                        <span className="font-semibold capitalize text-sm">{a}</span>
                      </button>
                    ),
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 gap-4">
                  {(["minimal", "playful", "bold"] as Vibe[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVibe(v)}
                      className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                        vibe === v
                          ? "border-primary bg-primary/5 shadow-sm ring-4 ring-primary/10"
                          : "border-border/50 bg-background/50 hover:bg-background hover:border-border"
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${vibe === v ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <LayoutTemplate className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-lg capitalize">{v}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {v === "minimal" && "Clean, sharp UI limits"}
                          {v === "playful" && "Rounded, softer elements"}
                          {v === "bold" && "Strong, high-contrast squared blocks"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-12 pt-6 border-t border-border/50 animate-intro">
              <Button 
                type="button"
                variant="ghost" 
                onClick={prev} 
                className={`font-semibold ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {step < 3 ? (
                <Button type="button" onClick={next} className="h-12 px-8 font-semibold text-base group">
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button
                  onClick={finish}
                  disabled={loading}
                  className="h-12 px-8 font-semibold text-base group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    {loading ? "Preparing..." : "Enter Workspace"}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </span>
                </Button>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
