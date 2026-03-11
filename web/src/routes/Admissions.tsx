import React from "react";
import { admissionsRecommend } from "../api";
import Page from "../components/Page";
import { 
  ShieldCheck, 
  Target, 
  TrendingUp, 
  Sparkles, 
  Info, 
  School,
  ArrowRight,
  ChevronRight,
  Activity
} from "lucide-react";
import { toast } from "sonner";

export default function Admissions() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<{
    safety: any[];
    target: any[];
    reach: any[];
    disclaimer: string;
    message?: string;
  } | null>(null);

  React.useEffect(() => {
    admissionsRecommend()
      .then(setData)
      .catch((err) => {
        console.error("Admissions fetch failed", err);
        toast.error("Failed to load admissions recommendations.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Page className="flex items-center justify-center min-h-[calc(100dvh-250px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium">Scanning university databases...</p>
        </div>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page className="flex items-center justify-center min-h-[calc(100dvh-250px)]">
        <div className="nova-panel p-10 text-center space-y-4 max-w-md">
          <Info className="h-10 w-10 text-destructive mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Data unavailable</h3>
            <p className="text-muted-foreground text-sm">
              We couldn't retrieve your admissions radar profile. Please ensure your SAT score is set in your profile.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (data.message) {
    return (
      <Page className="max-w-4xl mx-auto py-10">
        <div className="nova-panel p-8 sm:p-12 text-center space-y-6" data-animate="card">
          <div className="h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)] mx-auto">
            <Activity className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight">Radar Insight</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {data.message}
            </p>
          </div>
          <div className="pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground/70 italic">
              {data.disclaimer}
            </p>
          </div>
        </div>
      </Page>
    );
  }

  const renderList = (label: string, items: any[], icon: React.ReactNode, theme: string) => (
    <div className="nova-card h-full flex flex-col p-6" data-animate="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${theme}`}>
            {icon}
          </div>
          <h3 className="text-xl font-bold tracking-tight">{label}</h3>
        </div>
        <div className="stat-chip py-1 px-3">
          <span className="text-xs font-bold text-primary">{items.length}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {items.length === 0 ? (
          <div className="h-32 flex items-center justify-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
            <p className="text-xs text-muted-foreground">No matches found in this tier.</p>
          </div>
        ) : (
          items.map((uni) => (
            <div 
              key={uni.id} 
              className="group relative p-4 rounded-2xl border border-border/60 bg-background/40 hover:bg-background/80 hover:border-primary/40 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-1">{uni.name}</div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3 w-3" />
                    SAT: {uni.satRangeMin ?? "N/A"} - {uni.satRangeMax ?? "N/A"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <button className="mt-6 w-full py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 border-t border-border/40 pt-4">
          View full list <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <Page className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="glow-hero p-8 sm:p-10 relative overflow-hidden" data-animate="fade">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4 max-w-2xl">
            <div className="nova-badge">
              <Sparkles className="h-3 w-3" />
              Global Reach
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Your <span className="text-gradient">Admissions Radar</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We've analyzed your performance data against thousands of institutions. Here are your best matches, ranked by admission probability.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Safety (80%+)
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <Target className="h-4 w-4 text-primary" />
                Target (40-80%)
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <TrendingUp className="h-4 w-4 text-fuchsia-500" />
                Reach ({"<"}40%)
              </div>
            </div>
          </div>

          <div className="hidden xl:block h-48 w-48 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/10 border border-primary/20 flex items-center justify-center shadow-[0_0_60px_-10px_hsl(var(--primary)/0.3)]">
            <School className="h-20 w-20 text-primary opacity-80" />
          </div>
        </div>
      </section>

      {/* ── School Grid ────────────────────────────────────── */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {renderList("Safety", data.safety, <ShieldCheck className="h-5 w-5 text-emerald-500" />, "border-emerald-500/30 bg-emerald-500/10")}
        {renderList("Target", data.target, <Target className="h-5 w-5 text-primary" />, "border-primary/30 bg-primary/10")}
        {renderList("Reach", data.reach, <TrendingUp className="h-5 w-5 text-fuchsia-500" />, "border-fuchsia-500/30 bg-fuchsia-500/10")}
      </section>

      {/* ── Footer Insight ─────────────────────────────────── */}
      <section className="nova-panel p-6 sm:p-8 border-primary/10 bg-primary/5 flex flex-col sm:flex-row items-center gap-6" data-animate="fade">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
          <Info className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center sm:text-left flex-1 space-y-1">
          <h4 className="font-bold">Important Disclaimer</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.disclaimer}
          </p>
        </div>
      </section>
    </Page>
  );
}
