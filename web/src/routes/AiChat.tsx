import React from "react";
import { aiTutor, listUniversities } from "../api";
import Page from "../components/Page";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../lib/auth";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function AiChat() {
  const { user } = useAuth();
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
    <Page className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
      <div className="mb-6 space-y-1" data-animate="fade">
        <h1 className="text-3xl font-bold tracking-tight">AI Counselor</h1>
        <p className="text-muted-foreground text-sm">
          Personalized guidance for your academic journey.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Chat window */}
        <Card className="flex-1 overflow-hidden flex flex-col border-2 relative bg-card/50 backdrop-blur-sm shadow-xl">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl">
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
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted/80 backdrop-blur-sm border border-border/50 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
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

        {/* Controls */}
        <Card className="border-2 p-4 shadow-lg">
          <form onSubmit={send} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={context} onValueChange={(v: any) => setContext(v)}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
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
                <SelectTrigger className="flex-1 h-9 text-xs">
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
                className="min-h-[44px] max-h-32 resize-none bg-muted/30 focus-visible:ring-primary border-none text-sm py-3"
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
