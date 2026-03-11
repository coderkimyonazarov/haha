import React from "react";
import { useParams, Link } from "react-router-dom";
import { addFact, getUniversity } from "../api";
import Page from "../components/Page";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { 
  CalendarClock, 
  DollarSign, 
  GraduationCap, 
  Globe2, 
  Link as LinkIcon, 
  Sparkles, 
  ArrowLeft, 
  Info,
  BadgeCheck,
  Plus
} from "lucide-react";
import { toast } from "sonner";

// Small helper for a visual placeholder logo
function SchoolIcon({ universityName }: { universityName: string }) {
  const initial = universityName.charAt(0);
  const color = "hsl(var(--primary))";
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-5xl font-black" style={{ color }}>{initial}</span>
      <div className="h-1 w-10 mt-1 bg-primary/40 rounded-full" />
    </div>
  );
}

export default function UniversityDetail() {
  const { id } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [university, setUniversity] = React.useState<any | null>(null);
  const [factText, setFactText] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [year, setYear] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchUniversity = React.useCallback(() => {
    if (!id) return;
    setLoading(true);
    getUniversity(id)
      .then(setUniversity)
      .catch((err) => {
        console.error("Failed to fetch university", err);
        setUniversity(null);
        toast.error("University data not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => {
    fetchUniversity();
  }, [fetchUniversity]);

  const submitFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await addFact(id, {
        fact_text: factText,
        source_url: sourceUrl,
        tag: tag || undefined,
        year: year ? Number(year) : undefined
      });
      setFactText("");
      setSourceUrl("");
      setTag("");
      setYear("");
      toast.success("Fact added successfully!");
      fetchUniversity();
    } catch (err: any) {
      toast.error("Failed to add fact. Please check your data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page className="flex items-center justify-center min-h-[calc(100dvh-250px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium">Downloading university profile...</p>
        </div>
      </Page>
    );
  }

  if (!university) {
    return (
      <Page className="flex items-center justify-center min-h-[calc(100dvh-250px)]">
        <div className="nova-panel p-10 text-center space-y-4 max-w-md">
          <Info className="h-10 w-10 text-destructive mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold">University not found</h3>
            <p className="text-muted-foreground text-sm">
              The institution you are looking for might have been moved or removed from our database.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/universities">Back to database</Link>
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page className="space-y-10 pb-20 max-w-6xl mx-auto">
      {/* ── Back Navigation ────────────────────────────────── */}
      <div className="animate-element">
        <Link 
          to="/universities" 
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Browse Universities
        </Link>
      </div>

      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="glow-hero p-8 sm:p-10 relative overflow-hidden" data-animate="fade">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="nova-badge">
              <Sparkles className="h-3 w-3" />
              Verified Profile
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight flex items-center gap-3">
              <GraduationCap className="h-10 w-10 text-primary" />
              {university.name}
            </h1>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="stat-chip py-1.5 px-3 flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{university.state}, USA</span>
              </div>
              <div className="stat-chip py-1.5 px-3 flex items-center gap-2 border-fuchsia-500/30 bg-fuchsia-500/5">
                <BadgeCheck className="h-3.5 w-3.5 text-fuchsia-500" />
                <span className="text-xs font-semibold text-fuchsia-500">
                  SAT Range: {university.satRangeMin ?? "N/A"} - {university.satRangeMax ?? "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-32 w-32 shrink-0 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center transform rotate-6 shadow-xl">
             <SchoolIcon universityName={university.name} />
          </div>
        </div>
      </section>

      {/* ── Detailed Grid ───────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Col: Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="nova-card p-6 sm:p-8" data-animate="card">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Institution Overview</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {university.description || "The profile for this institution is currently being updated by our admissions research team. Check back shortly for deep-dive information."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-4">
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    Annual Tuition
                  </div>
                  <div className="text-lg font-bold">
                    {university.tuitionUsd ? `$${university.tuitionUsd.toLocaleString()}` : "Contact for details"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Globe2 className="h-3.5 w-3.5" />
                    Financial Aid Policy
                  </div>
                  <div className="text-sm font-bold text-foreground/90">
                    {university.aidPolicy || "Scholarships available"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    English Proficiency
                  </div>
                  <div className="text-sm font-bold text-foreground/90">
                    {university.englishReq || "TOEFL / IELTS Required"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Priority Deadline
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {university.applicationDeadline || "January 15th"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facts Section */}
          <section className="space-y-6">
            <h3 className="text-2xl font-bold tracking-tight flex items-center gap-2 px-2">
              <Info className="h-6 w-6 text-primary" />
              Insider Knowledge
            </h3>
            
            {university.facts?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {university.facts
                  .filter((fact: any) => fact.sourceUrl)
                  .map((fact: any) => (
                    <div key={fact.id} className="nova-card p-5 space-y-4" data-animate="card">
                      <div className="flex items-center gap-2">
                        {fact.tag && <div className="nova-badge">{fact.tag}</div>}
                        {fact.year && <div className="nova-badge bg-primary/10 text-primary border-primary/20">{fact.year}</div>}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed italic">
                        "{fact.factText}"
                      </p>
                      <a
                        href={fact.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline group/link"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        Verify Source
                      </a>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="nova-panel p-10 text-center border-dashed border-border/80">
                <p className="text-muted-foreground text-sm italic">No insider facts available for this institution yet.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Col: Add Fact Form */}
        <div className="space-y-8">
          <div className="nova-card p-6 sticky top-24" data-animate="card">
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="font-bold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Contribute Knowledge
                </h4>
                <p className="text-xs text-muted-foreground">Share an interesting fact or policy detail.</p>
              </div>

              <form className="space-y-4" onSubmit={submitFact}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Fact Description</label>
                  <Textarea 
                    className="bg-background/50 border-border/60 focus:border-primary min-h-[100px]" 
                    value={factText} 
                    onChange={(e) => setFactText(e.target.value)} 
                    maxLength={280} 
                    placeholder="e.g. This school has a strong ED preference..."
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Verification Link</label>
                  <Input 
                    className="bg-background/50 border-border/60 focus:border-primary" 
                    value={sourceUrl} 
                    onChange={(e) => setSourceUrl(e.target.value)} 
                    placeholder="https://university.edu/admissions..."
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Tag</label>
                    <Input 
                      className="bg-background/50 border-border/60 focus:border-primary" 
                      value={tag} 
                      onChange={(e) => setTag(e.target.value)} 
                      placeholder="ED, SAT, Aid" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Year</label>
                    <Input 
                      className="bg-background/50 border-border/60 focus:border-primary" 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)} 
                      placeholder="2024" 
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={saving}
                  className="btn-nova w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Submit Fact
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
