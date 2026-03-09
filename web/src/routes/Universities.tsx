import React from "react";
import { Link } from "react-router-dom";
import { listUniversities } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import Page from "../components/Page";
import { GraduationCap, MapPin, Search } from "lucide-react";

export default function Universities() {
  const [search, setSearch] = React.useState("");
  const [state, setState] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [universities, setUniversities] = React.useState<any[]>([]);

  const fetchList = React.useCallback(() => {
    setLoading(true);
    listUniversities({ search: search || undefined, state: state || undefined })
      .then(setUniversities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, state]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <Page className="space-y-8">
      <section className="cosmos-hero p-6 sm:p-8" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">Universities</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-100">Explore US programs.</h1>
        <p className="mt-2 text-slate-300/80">Search by name and state to refine your list.</p>
      </section>

      <Card className="cosmos-panel text-slate-100" data-animate="card">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Search</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
          <Input
            className="admin-input border-white/20 bg-slate-900/60 text-slate-100"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            className="admin-input border-white/20 bg-slate-900/60 text-slate-100"
            placeholder="State (e.g. CA)"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
          />
          <Button onClick={fetchList} className="border border-cyan-300/35 bg-cyan-400/15 text-slate-100 hover:bg-cyan-400/25">Apply</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-slate-300/80">Loading universities...</div>
      ) : universities.length === 0 ? (
        <Card className="cosmos-panel text-slate-100" data-animate="card">
          <CardContent className="p-6 text-sm text-slate-300/80">No universities found.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {universities.map((uni) => (
            <Card key={uni.id} className="cosmos-panel text-slate-100" data-animate="card">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-200" />
                  {uni.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300/80">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {uni.state}</span> · SAT {uni.satRangeMin ?? "N/A"}-{uni.satRangeMax ?? "N/A"}
                </p>
                <Button asChild className="mt-4 border border-indigo-300/35 bg-indigo-400/15 text-slate-100 hover:bg-indigo-400/25">
                  <Link to={`/universities/${uni.id}`}>View details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
