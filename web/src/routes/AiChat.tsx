import React from "react";
import { aiTutor, listUniversities } from "../api";
import Page from "../components/Page";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Bot, Sparkles, Send, GraduationCap, BookOpen, SendHorizonal } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function AiChat() {
  const [message, setMessage] = React.useState("");
  const [context, setContext] = React.useState<"SAT" | "Admissions">("SAT");
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<Message[]>([]);
  const [universityId, setUniversityId] = React.useState<string | undefined>(undefined);
  const [universities, setUniversities] = React.useState<{ id: string; name: string }[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listUniversities({ limit: 50 })
      .then((data) => setUniversities(data.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        { role: "assistant", text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment." },
      ]);
      toast.error("Failed to get response from AI Counselor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page className="max-w-5xl mx-auto flex flex-col min-h-[calc(100dvh-180px)] pb-6 lg:pb-10">
      {/* ── Header ────────────────────────────────────────── */}
      <section className="glow-hero mb-6 p-6 sm:p-8" data-animate="fade">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="nova-badge">
              <Sparkles className="h-3 w-3" />
              Intelligence Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary animate-pulse" />
              AI Counselor
            </h1>
            <p className="text-muted-foreground text-sm max-w-md">
              Your personalized academic advisor. Ask about SAT strategies, university matching, or admissions workflows.
            </p>
          </div>

          {/* Context badges */}
          <div className="flex gap-2">
            <div className={`stat-chip flex items-center gap-2 py-1.5 px-3 border-primary/20 bg-primary/5`}>
              {context === "SAT" ? <BookOpen className="h-3.5 w-3.5 text-primary" /> : <GraduationCap className="h-3.5 w-3.5 text-primary" />}
              <span className="text-xs font-semibold text-primary">{context} Mode</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chat Container ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0" data-animate="card">
        <div className="relative flex-1 flex flex-col min-h-0 bg-card/40 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-xl">
          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 scrollbar-thin"
          >
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70 py-10">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    "What's a good study schedule for a 1500+ SAT score?"
                    <br />
                    or
                    <br />
                    "Which universities match my interests?"
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
                    className={`relative max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/20"
                        : "bg-card border border-border/80 rounded-tl-none shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start" data-animate="fade">
                <div className="bg-card border border-border/80 rounded-2xl rounded-tl-none px-5 py-3.5 flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom input area */}
          <div className="p-4 sm:p-6 border-t border-border/40 bg-card/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Knowledge Context</Label>
                  <Select value={context} onValueChange={(v: any) => setContext(v)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background/50 border-border/60 hover:border-primary/40 transition-colors">
                      <SelectValue placeholder="Context" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAT">SAT Prep & Strategy</SelectItem>
                      <SelectItem value="Admissions">University Admissions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Target University (Optional)</Label>
                  <Select
                    value={universityId || "none"}
                    onValueChange={(v) => setUniversityId(v === "none" ? undefined : v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-background/50 border-border/60 hover:border-primary/40 transition-colors">
                      <SelectValue placeholder="Select University" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General Assistance</SelectItem>
                      {universities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 items-end">
                <div className="relative flex-1">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Ask Sypev AI anything..."
                    className="min-h-[52px] max-h-40 py-3.5 px-4 rounded-xl bg-background border-border/60 focus:border-primary ring-0 resize-none scrollbar-none shadow-inner"
                    rows={1}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className={`h-[52px] w-[52px] shrink-0 rounded-xl flex items-center justify-center transition-all ${
                    message.trim() ? "btn-nova" : "bg-muted border border-border text-muted-foreground"
                  }`}
                  aria-label="Send message"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <SendHorizonal className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Page>
  );
}
