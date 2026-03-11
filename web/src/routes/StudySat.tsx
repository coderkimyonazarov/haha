import React from "react";
import { getSatTopics } from "../api";
import Page from "../components/Page";
import {
  BookOpenCheck,
  Sparkles,
  ArrowRight,
  Brain,
  History,
  TrendingUp,
  Target,
} from "lucide-react";
import { toast } from "sonner";

export default function StudySat() {
  const [topics, setTopics] = React.useState<{ id: string; name: string; description: string | null }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getSatTopics()
      .then(setTopics)
      .catch((err) => {
        console.error("Failed to load SAT topics", err);
        toast.error("Could not load study topics.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page className="space-y-10 pb-20 max-w-6xl mx-auto">
      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="glow-hero p-8 sm:p-10 relative overflow-hidden" data-animate="fade">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="nova-badge">
              <Brain className="h-3 w-3" />
              Prep Intelligence
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Master your <span className="text-gradient">SAT strategy.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Focus on specific concept blocks to maximize your score gains. Our engine tracks your progress and adapts to your performance.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <Target className="h-4 w-4 text-primary" />
                Score Tracking
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <TrendingUp className="h-4 w-4 text-primary" />
                Growth Analytics
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <History className="h-4 w-4 text-primary" />
                Session History
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-48 w-48 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/10 border border-primary/20 flex items-center justify-center shadow-[0_0_60px_-10px_hsl(var(--primary)/0.3)]">
            <BookOpenCheck className="h-20 w-20 text-primary opacity-80" />
          </div>
        </div>
      </section>

      {/* ── Concept Blocks ──────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Concept Blocks</h2>
            <p className="text-sm text-muted-foreground">Select a module below to start a focused practice session.</p>
          </div>
          <div className="hidden sm:block">
            <span className="nova-badge">
              {topics.length} Areas available
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="nova-card h-48 animate-pulse bg-muted/20 border-dashed" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="nova-panel p-10 text-center space-y-4" data-animate="card">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Brain className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Question Bank Initializing</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                We are currently populating the SAT concept blocks with elite-tier practice questions. Please check back shortly.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {topics.map((topic) => (
              <div 
                key={topic.id} 
                className="nova-card group p-6 flex flex-col justify-between" 
                data-animate="card"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary transition-transform duration-300 group-hover:scale-110">
                      <BookOpenCheck className="h-5 w-5" />
                    </div>
                    <div className="nova-badge text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      15+ Questions
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                      {topic.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {topic.description || "Master core concepts in this focused conceptual block."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button className="btn-nova rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 group/btn">
                    <Sparkles className="h-4 w-4" />
                    Start block
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Footer Insight ─────────────────────────────────── */}
      <section className="nova-panel p-6 sm:p-8 border-primary/10 bg-primary/5 flex flex-col sm:flex-row items-center gap-6" data-animate="fade">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h4 className="font-bold">Adaptive Mastery</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every answer you submit helps our AI refine your study path. We prioritize questions you're likely to get wrong to accelerate your learning curve.
          </p>
        </div>
        <div className="shrink-0 w-full sm:w-auto">
          <button className="w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20">
            View Analytics
          </button>
        </div>
      </section>
    </Page>
  );
}
