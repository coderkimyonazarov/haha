import React from "react";
import { getSatTopics } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import Page from "../components/Page";
import { BookOpenCheck, Sparkles } from "lucide-react";

export default function StudySat() {
  const [topics, setTopics] = React.useState<{ id: string; name: string; description: string | null }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getSatTopics()
      .then(setTopics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page className="space-y-8">
      <section className="cosmos-hero p-6 sm:p-8" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/70">SAT prep</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-100">Choose a focus area.</h1>
        <p className="mt-2 text-slate-300/80">Practice the topics that move your score fastest.</p>
      </section>
      {loading ? (
        <div className="text-slate-300/80">Loading topics...</div>
      ) : topics.length === 0 ? (
        <Card className="cosmos-panel text-slate-100" data-animate="card">
          <CardHeader>
            <CardTitle>No topics yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300/80">Topics will appear here once the question bank is added.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {topics.map((topic) => (
            <Card key={topic.id} className="cosmos-panel text-slate-100" data-animate="card">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-cyan-200" />{topic.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300/80">{topic.description || "No description yet."}</p>
                <Button className="mt-4 border border-cyan-300/35 bg-cyan-400/15 text-slate-100 hover:bg-cyan-400/25">
                  <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" />Start quiz</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
