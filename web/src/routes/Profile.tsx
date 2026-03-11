import React from "react";
import { getProfile, updateProfile } from "../api";
import Page from "../components/Page";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  CircleUserRound, 
  Trophy, 
  Sparkles, 
  Save, 
  BadgeCheck, 
  Globe2, 
  GraduationCap, 
  School,
  ClipboardList
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [grade, setGrade] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [targetMajor, setTargetMajor] = React.useState("");
  const [satMath, setSatMath] = React.useState("");
  const [satRw, setSatRw] = React.useState("");
  const [satTotal, setSatTotal] = React.useState<number | null>(null);

  React.useEffect(() => {
    getProfile()
      .then((profile) => {
        setGrade(profile.grade ? String(profile.grade) : "");
        setCountry(profile.country || "");
        setTargetMajor(profile.targetMajor || "");
        setSatMath(profile.satMath ? String(profile.satMath) : "");
        setSatRw(profile.satReadingWriting ? String(profile.satReadingWriting) : "");
        setSatTotal(profile.satTotal ?? null);
      })
      .catch((err) => {
        console.error("Profile fetch failed", err);
        toast.error("Failed to load profile data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const toNumberOrNull = (value: string) => (value === "" ? null : Number(value));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({
        grade: toNumberOrNull(grade),
        country: country || null,
        target_major: targetMajor || null,
        sat_math: toNumberOrNull(satMath),
        sat_reading_writing: toNumberOrNull(satRw)
      });
      setSatTotal(updated.satTotal ?? null);
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save changes. Please check your input.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page className="flex items-center justify-center min-h-[calc(100dvh-250px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium">Loading your profile details...</p>
        </div>
      </Page>
    );
  }

  return (
    <Page className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="glow-hero p-8 sm:p-10 relative overflow-hidden" data-animate="fade">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="nova-badge">
              <BadgeCheck className="h-3 w-3" />
              Verified Scholar
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight flex items-center gap-3">
              <CircleUserRound className="h-10 w-10 text-primary" />
              Your <span className="text-gradient">Academic Profile</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Complete your student details to sharpen our admissions radar and personalize your learning journey.
            </p>
          </div>
          
          <div className="hidden lg:block h-32 w-32 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]">
            <ClipboardList className="h-16 w-16 text-primary opacity-80" />
          </div>
        </div>
      </section>

      {/* ── Main Form ───────────────────────────────────────── */}
      <div className="nova-card p-6 sm:p-10" data-animate="card">
        <form className="space-y-10" onSubmit={handleSubmit}>
          
          {/* Section 1: Background */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Globe2 className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Academic Background</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Current Grade / Class</Label>
                <div className="relative">
                  <Input 
                    className="h-12 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl pl-4"
                    type="number" 
                    value={grade} 
                    onChange={(e) => setGrade(e.target.value)} 
                    min={1} 
                    max={12} 
                    placeholder="e.g. 11"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground ml-1">Use grade level (1-12) or equivalent.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Country of Origin</Label>
                <Input 
                  className="h-12 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl pl-4"
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)} 
                  placeholder="e.g. Uzbekistan"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold ml-1">Target Major / Field of Study</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="h-12 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl pl-11"
                    value={targetMajor} 
                    onChange={(e) => setTargetMajor(e.target.value)} 
                    placeholder="e.g. Computer Science and AI"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: SAT Performance */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-500">
                <Trophy className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">SAT Performance Hub</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Math Subscore</Label>
                <Input 
                  className="h-12 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl"
                  type="number" 
                  value={satMath} 
                  onChange={(e) => setSatMath(e.target.value)} 
                  min={200} 
                  max={800} 
                  placeholder="200 - 800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Reading & Writing Subscore</Label>
                <Input 
                  className="h-12 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl"
                  type="number" 
                  value={satRw} 
                  onChange={(e) => setSatRw(e.target.value)} 
                  min={200} 
                  max={800} 
                  placeholder="200 - 800"
                />
              </div>
            </div>

            {/* Total Result Chip */}
            <div className="nova-panel p-5 mt-4 flex items-center justify-between bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Calculated Total</div>
                  <div className="text-2xl font-black text-primary">{satTotal ?? "0000"}</div>
                </div>
              </div>
              
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</div>
                <div className="nova-badge">
                  {satTotal && satTotal >= 1500 ? "Elite Tier" : satTotal && satTotal >= 1400 ? "Top Tier" : "Calculating..."}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              className="btn-nova w-full sm:w-auto h-12 px-10 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Details
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Info */}
      <section className="nova-panel p-6 sm:p-8 border-primary/10 bg-primary/5 flex flex-col sm:flex-row items-center gap-6" data-animate="fade">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
          <School className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center sm:text-left flex-1 space-y-1">
          <h4 className="font-bold">Recommendation Privacy</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your scores and background data are encrypted and only used to drive our admissions radar and AI counselor algorithms. We never share your individual scores with third parties.
          </p>
        </div>
      </section>
    </Page>
  );
}
