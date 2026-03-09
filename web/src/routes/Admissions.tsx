import React from "react";
import { admissionsRecommend } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import Page from "../components/Page";
import { ShieldCheck, Target, TrendingUp } from "lucide-react";

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-300/80">Loading recommendations...</div>;
  }

  if (!data) {
    return <div className="text-slate-300/80">Unable to load recommendations.</div>;
  }

  if (data.message) {
    return (
      <Page className="space-y-6">
        <Card className="cosmos-panel text-slate-100" data-animate="card">
          <CardHeader>
            <CardTitle>Admissions recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300/85">{data.message}</p>
            <p className="mt-3 text-xs text-slate-300/75">{data.disclaimer}</p>
          </CardContent>
        </Card>
      </Page>
    );
  }

  const renderList = (label: string, items: any[]) => (
    <Card className="cosmos-panel text-slate-100" data-animate="card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {label}
          <Badge className="cosmos-pill border-white/20">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-300/80">No schools in this tier yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {items.map((uni) => (
              <li key={uni.id} className="cosmos-soft p-4">
                <div className="font-medium text-slate-100">{uni.name}</div>
                <div className="text-xs text-slate-300/75">
                  SAT range: {uni.satRangeMin ?? "N/A"}-{uni.satRangeMax ?? "N/A"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Page className="space-y-8">
      <section className="cosmos-hero p-6 sm:p-8" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">Admissions</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-100">Your school list, tiered.</h1>
        <p className="mt-2 text-slate-300/80">Safety, target, and reach schools based on your SAT total.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="cosmos-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Safety</span>
          <span className="cosmos-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"><Target className="h-3.5 w-3.5" /> Target</span>
          <span className="cosmos-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"><TrendingUp className="h-3.5 w-3.5" /> Reach</span>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        {renderList("Safety", data.safety)}
        {renderList("Target", data.target)}
        {renderList("Reach", data.reach)}
      </div>
      <p className="text-xs text-slate-300/70" data-animate="fade">
        {data.disclaimer}
      </p>
    </Page>
  );
}
