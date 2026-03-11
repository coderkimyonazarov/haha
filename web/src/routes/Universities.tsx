import React from "react";
import { Link } from "react-router-dom";
import { listUniversities } from "../api";
import Page from "../components/Page";
import { Input } from "../components/ui/input";
import { 
  GraduationCap, 
  MapPin, 
  Search, 
  Target, 
  ArrowRight, 
  School,
  Sparkles,
  Filter,
  X
} from "lucide-react";
import { toast } from "sonner";

export default function Universities() {
  const [search, setSearch] = React.useState("");
  const [state, setState] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [universities, setUniversities] = React.useState<any[]>([]);

  const fetchList = React.useCallback(() => {
    setLoading(true);
    listUniversities({ search: search || undefined, state: state || undefined })
      .then(setUniversities)
      .catch((err) => {
        console.error("University fetch failed", err);
        toast.error("Failed to load universities.");
      })
      .finally(() => setLoading(false));
  }, [search, state]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <Page className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="glow-hero p-8 sm:p-10 relative overflow-hidden" data-animate="fade">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="nova-badge">
              <School className="h-3 w-3" />
              University Database
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Explore <span className="text-gradient">global excellence.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Find your perfect match. Discover standard and reach institutions across the United States.
            </p>
          </div>

          <div className="hidden lg:block h-40 w-40 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/10 border border-primary/20 flex items-center justify-center shadow-[0_0_60px_-10px_hsl(var(--primary)/0.3)]">
            <GraduationCap className="h-20 w-20 text-primary opacity-80" />
          </div>
        </div>
      </section>

      {/* ── Search & Filter ─────────────────────────────────── */}
      <section className="nova-card p-6" data-animate="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-12 pl-11 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl"
              placeholder="Search by institution name (e.g. Harvard)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="relative md:w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-12 pl-11 bg-background/50 border-border/60 focus:border-primary transition-all rounded-xl uppercase"
              placeholder="State (CA)"
              value={state}
              maxLength={2}
              onChange={(e) => setState(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            />
          </div>
          <button 
            onClick={fetchList} 
            className="btn-nova h-12 px-8 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            Apply Filters
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Results Grid ───────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Results
            <span className="text-sm font-normal text-muted-foreground ml-2">({universities.length} found)</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="nova-card h-48 animate-pulse bg-muted/20 border-dashed" />
            ))}
          </div>
        ) : universities.length === 0 ? (
          <div className="nova-panel p-20 text-center space-y-4" data-animate="card">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
              <Search className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">No results found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search terms or state filter.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {universities.map((uni) => (
              <div key={uni.id} className="nova-card p-6 flex flex-col group" data-animate="card">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    {uni.satRangeMax && uni.satRangeMax >= 1500 && (
                      <div className="nova-badge">
                        <Sparkles className="h-2.5 w-2.5" />
                        Top Tier
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {uni.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <MapPin className="h-3 w-3" />
                      {uni.state}, USA
                    </div>
                  </div>

                  <div className="stat-chip py-2 px-3 w-fit flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary">
                      SAT: {uni.satRangeMin ?? "N/A"} - {uni.satRangeMax ?? "N/A"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/40">
                  <Link 
                    to={`/universities/${uni.id}`}
                    className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all group/btn"
                  >
                    Details & Requirements
                    <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
