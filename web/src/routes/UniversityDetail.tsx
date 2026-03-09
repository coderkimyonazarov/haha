import React from "react";
import { useParams } from "react-router-dom";
import { addFact, getUniversity } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import Page from "../components/Page";
import { CalendarClock, DollarSign, GraduationCap, Globe2, Link as LinkIcon } from "lucide-react";

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
      .catch(() => setUniversity(null))
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
      fetchUniversity();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-300/80">Loading university...</div>;
  }

  if (!university) {
    return <div className="text-slate-300/80">University not found.</div>;
  }

  return (
    <Page className="space-y-8">
      <section className="cosmos-hero p-6 sm:p-8" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">University</p>
        <h1 className="mt-2 inline-flex items-center gap-2 text-4xl font-semibold text-slate-100">
          <GraduationCap className="h-7 w-7 text-indigo-200" />
          {university.name}
        </h1>
        <p className="mt-2 text-slate-300/80">
          {university.state} - SAT {university.satRangeMin ?? "N/A"}-{university.satRangeMax ?? "N/A"}
        </p>
      </section>

      <Card className="cosmos-panel text-slate-100" data-animate="card">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300/85">
          <p>{university.description || "No description yet."}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="cosmos-soft p-3"><span className="inline-flex items-center gap-1"><DollarSign className="h-4 w-4" /> Tuition:</span> {university.tuitionUsd ? `$${university.tuitionUsd}` : "N/A"}</div>
            <div className="cosmos-soft p-3"><span className="inline-flex items-center gap-1"><Globe2 className="h-4 w-4" /> Aid policy:</span> {university.aidPolicy || "N/A"}</div>
            <div className="cosmos-soft p-3">English requirement: {university.englishReq || "N/A"}</div>
            <div className="cosmos-soft p-3"><span className="inline-flex items-center gap-1"><CalendarClock className="h-4 w-4" /> Deadline:</span> {university.applicationDeadline || "N/A"}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="cosmos-panel text-slate-100" data-animate="card">
        <CardHeader>
          <CardTitle>Did you know?</CardTitle>
        </CardHeader>
        <CardContent>
          {university.facts?.length ? (
            <div className="space-y-3">
              {university.facts
                .filter((fact: any) => fact.sourceUrl)
                .map((fact: any) => (
                  <div key={fact.id} className="cosmos-soft p-4 text-sm text-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {fact.tag && <Badge className="cosmos-pill">{fact.tag}</Badge>}
                      {fact.year && <Badge className="cosmos-pill">{fact.year}</Badge>}
                    </div>
                    <p className="mt-2">{fact.factText}</p>
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 underline"
                      href={fact.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      Source
                    </a>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-slate-300/75">No facts yet. Add one below.</p>
          )}
        </CardContent>
      </Card>

      <Card className="cosmos-panel text-slate-100" data-animate="card">
        <CardHeader>
          <CardTitle>Add a fact</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitFact}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fact text</label>
              <Textarea className="admin-input border-white/20 bg-slate-900/60 text-slate-100" value={factText} onChange={(e) => setFactText(e.target.value)} maxLength={280} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source URL</label>
              <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag</label>
                <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="ED, RD, Policy" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" />
              </div>
            </div>
            <Button className="border border-cyan-300/35 bg-cyan-400/15 text-slate-100 hover:bg-cyan-400/25" disabled={saving}>{saving ? "Saving..." : "Add fact"}</Button>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
