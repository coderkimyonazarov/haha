import React from "react";
import { aiTutor, listUniversities } from "../api";
import Page from "../components/Page";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function AiChat() {
  const [message, setMessage] = React.useState("");
  const [context, setContext] = React.useState<"SAT" | "Admissions">("SAT");
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<Message[]>([]);
  const [universityId, setUniversityId] = React.useState<string | undefined>(
    undefined,
  );
  const [universities, setUniversities] = React.useState<
    { id: string; name: string }[]
  >([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listUniversities({ limit: 50 })
      .then((data) =>
        setUniversities(data.map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const current = message.trim();
    setHistory((prev) => [...prev, { role: "user", text: current }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await aiTutor({
        message: current,
        context,
        university_id: universityId,
      });
      setHistory((prev) => [...prev, { role: "assistant", text: res.reply }]);
    } catch (e) {
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page className="mx-auto flex min-h-[calc(100dvh-250px)] max-w-5xl flex-col">
      <div className="mb-5 space-y-1" data-animate="fade">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Counselor</h1>
        <p className="text-muted-foreground text-sm">
          Personalized guidance for your academic journey.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Card className="relative flex flex-1 flex-col overflow-hidden border-2 bg-card/60 shadow-xl">
          <div
            ref={scrollRef}
            className="flex-1 space-y-5 overflow-y-auto p-4 scroll-smooth sm:p-6"
          >
            {history.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 px-2 text-center opacity-65">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
                  ✨
                </div>
                <div className="max-w-xs">
                  <p className="font-semibold text-foreground">
                    How can I help you today?
                  </p>
                  <p className="text-sm">
                    Ask about SAT prep strategies, college admissions, or
                    specific universities.
                  </p>
                </div>
              </div>
            ) : (
              history.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-animate="fade"
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all sm:max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted/80 backdrop-blur-sm border border-border/50 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start" data-animate="fade">
                <div className="bg-muted/80 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center border border-border/50">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="border-2 p-3 shadow-lg sm:p-4">
          <form onSubmit={send} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <Select value={context} onValueChange={(v: any) => setContext(v)}>
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue placeholder="Context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAT">SAT Prep</SelectItem>
                  <SelectItem value="Admissions">Admissions</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={universityId || "none"}
                onValueChange={(v) =>
                  setUniversityId(v === "none" ? undefined : v)
                }
              >
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue placeholder="Target University (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific university</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
                placeholder="Message AI Counselor..."
                className="min-h-[44px] max-h-36 resize-none border-none bg-muted/30 py-3 text-sm focus-visible:ring-primary"
                rows={1}
              />
              <Button
                type="submit"
                disabled={loading || !message.trim()}
                className="h-[44px] w-[44px] shrink-0 rounded-xl"
              >
                {loading ? "..." : "↑"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Page>
  );
}
