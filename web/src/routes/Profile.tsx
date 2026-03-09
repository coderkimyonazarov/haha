import React from "react";
import { getProfile, updateProfile } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import Page from "../components/Page";
import { CircleUserRound, Trophy } from "lucide-react";

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
      .catch(() => {})
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
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-300/80">Loading profile...</div>;
  }

  return (
    <Page className="space-y-8">
      <section className="cosmos-hero p-6 sm:p-8" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">Profile</p>
        <h1 className="mt-2 inline-flex items-center gap-2 text-4xl font-semibold text-slate-100"><CircleUserRound className="h-7 w-7 text-indigo-200" />Your student details.</h1>
        <p className="mt-2 text-slate-300/80">Update your background to personalize recommendations.</p>
      </section>
      <Card className="cosmos-panel text-slate-100" data-animate="card">
        <CardHeader>
          <CardTitle>Student details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" type="number" value={grade} onChange={(e) => setGrade(e.target.value)} min={1} max={12} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Target major</Label>
                <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" value={targetMajor} onChange={(e) => setTargetMajor(e.target.value)} />
              </div>
            </div>

            <div className="cosmos-soft p-5">
              <h3 className="text-sm font-semibold text-slate-100">SAT subscores</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Math</Label>
                  <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" type="number" value={satMath} onChange={(e) => setSatMath(e.target.value)} min={200} max={800} />
                </div>
                <div className="space-y-2">
                  <Label>Reading & Writing</Label>
                  <Input className="admin-input border-white/20 bg-slate-900/60 text-slate-100" type="number" value={satRw} onChange={(e) => setSatRw(e.target.value)} min={200} max={800} />
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm text-slate-300/80"><Trophy className="h-4 w-4 text-cyan-200" />Total: {satTotal ?? "Not set"}</div>
            </div>

            <Button className="border border-cyan-300/35 bg-cyan-400/15 text-slate-100 hover:bg-cyan-400/25" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
