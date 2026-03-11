import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  BookOpen,
  Brain,
  GraduationCap,
  Palette,
  Rocket,
  ShieldCheck,
  Zap,
  Sparkles,
  Target,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../lib/auth";

function getAiSuggestion(params: {
  firstName: string;
  interests: string[];
  satTotal: number | null;
  persona: string;
}) {
  const { firstName, interests, satTotal, persona } = params;
  const topInterest = interests[0] ?? "study";
  const scoreLine =
    typeof satTotal === "number"
      ? `Your current SAT total is ${satTotal}. Focus on your weakest subsection first for maximum gains.`
      : "No SAT baseline yet. Start with a diagnostic block to unlock sharper AI guidance.";

  const personaLine =
    persona === "bold_dark"
      ? "Run 40-minute deep-focus sessions with structured breaks."
      : persona === "soft_cute"
        ? "Use calmer 25-minute focus cycles to maintain consistency."
        : persona === "energetic_fun"
          ? "Keep it dynamic: short sprints, visible checkpoints, real progress."
          : "Three priorities, clean execution, measurable output daily.";

  return `${firstName}, aligned with your ${topInterest} track. ${scoreLine} ${personaLine}`;
}

const QUICK_ACTIONS = [
  {
    to: "/study/sat",
    icon: BookOpen,
    label: "SAT Engine",
    desc: "Practice by topic, monitor progression with smart feedback.",
    accent: "from-violet-500 to-purple-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(114,38,255,0.45)]",
  },
  {
    to: "/admissions",
    icon: GraduationCap,
    label: "Admissions Radar",
    desc: "Match safety / target / reach universities to your profile.",
    accent: "from-fuchsia-500 to-pink-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(240,66,255,0.4)]",
  },
  {
    to: "/tutor",
    icon: Brain,
    label: "AI Counselor",
    desc: "Ask tailored questions with persona & interests in context.",
    accent: "from-indigo-500 to-blue-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(99,102,241,0.4)]",
  },
  {
    to: "/universities",
    icon: Target,
    label: "Universities",
    desc: "Browse 1,000+ programs with filters for your SAT score.",
    accent: "from-emerald-500 to-teal-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(16,185,129,0.4)]",
  },
  {
    to: "/feed",
    icon: Sparkles,
    label: "Discovery Feed",
    desc: "Curated content based on your interests and vibe profile.",
    accent: "from-amber-500 to-orange-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(245,158,11,0.4)]",
  },
  {
    to: "/account",
    icon: Palette,
    label: "Personalize",
    desc: "Tune theme, persona, and linked providers.",
    accent: "from-rose-500 to-red-600",
    glow: "shadow-[0_8px_32px_-8px_rgba(244,63,94,0.4)]",
  },
];

export default function Dashboard() {
  const { user, profile, preferences, providers } = useAuth();
  const firstName = profile?.firstName || user?.name?.split(" ")[0] || "Student";
  const interests = profile?.interests ?? [];
  const aiSuggestion = getAiSuggestion({
    firstName,
    interests,
    satTotal: profile?.satTotal ?? null,
    persona: preferences?.persona ?? "clean_minimal",
  });

  const telegramLinked = Boolean(providers.find((p) => p.provider === "telegram"));
  const googleLinked = Boolean(providers.find((p) => p.provider === "google"));

  return (
    <div className="space-y-6 pb-14 sm:space-y-8 sm:pb-20 stagger">
      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="glow-hero p-5 sm:p-7 lg:p-9">
        {/* decorative orb */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary-glow)) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Left */}
          <div className="space-y-4">
            <div className="nova-badge w-fit">
              <Zap className="h-3 w-3" />
              Sypev Workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Welcome back,{" "}
              <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Your dashboard is personalized by profile, persona, and interests — every session
              stays focused and relevant.
            </p>

            {/* Interest tags */}
            <div className="flex flex-wrap gap-2">
              {interests.length > 0 ? (
                interests.map((interest: string) => (
                  <span
                    key={interest}
                    className="nova-badge capitalize"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <span className="nova-badge opacity-60">
                  Add interests in settings to unlock deeper personalization
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/study/sat"
                className="btn-nova flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Continue SAT plan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground/70 transition hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
              >
                Open settings
              </Link>
            </div>
          </div>

          {/* Right — stat cards */}
          <div className="flex flex-col gap-3">
            {/* AI suggestion */}
            <div className="stat-chip flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  AI Suggestion
                </p>
                <p className="text-sm leading-relaxed text-foreground/85">{aiSuggestion}</p>
              </div>
            </div>

            {/* Status chips */}
            <div className="grid grid-cols-2 gap-2">
              <div className="stat-chip text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Persona</p>
                <p className="mt-1 text-sm font-bold capitalize text-foreground">
                  {(preferences?.persona ?? "clean_minimal").replace(/_/g, " ")}
                </p>
              </div>
              <div className="stat-chip text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme</p>
                <p className="mt-1 text-sm font-bold capitalize text-foreground">
                  {preferences?.theme ?? "system"}
                </p>
              </div>
              <div className={`stat-chip col-span-2 flex items-center justify-between ${telegramLinked ? "border-primary/25 bg-primary/6" : ""}`}>
                <div className="flex items-center gap-2">
                  <Bot className={`h-4 w-4 ${telegramLinked ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">
                    Telegram {telegramLinked ? "linked" : "not linked"}
                  </span>
                </div>
                <Link
                  to="/account"
                  className="text-xs font-medium text-primary transition hover:underline"
                >
                  Manage →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Actions Grid ─────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Quick access</h2>
          <span className="nova-badge">
            <TrendingUp className="h-3 w-3" />
            6 modules
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nova-card group flex flex-col gap-3 p-5"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${item.accent} ${item.glow} transition-shadow duration-300 group-hover:shadow-none`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{item.label}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Linked Accounts Status ─────────────────────────── */}
      <section className="nova-panel p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Connected accounts</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Telegram */}
          <div className={`stat-chip flex items-center justify-between ${telegramLinked ? "border-primary/25 bg-primary/6" : ""}`}>
            <div className="flex items-center gap-2">
              <Bot className={`h-4 w-4 ${telegramLinked ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Telegram</span>
            </div>
            <span className={`nova-badge text-[11px] ${telegramLinked ? "" : "border-border bg-muted text-muted-foreground"}`}>
              {telegramLinked ? "Linked" : "Not linked"}
            </span>
          </div>

          {/* Google */}
          <div className={`stat-chip flex items-center justify-between ${googleLinked ? "border-primary/25 bg-primary/6" : ""}`}>
            <div className="flex items-center gap-2">
              <MessageSquare className={`h-4 w-4 ${googleLinked ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Google</span>
            </div>
            <span className={`nova-badge text-[11px] ${googleLinked ? "" : "border-border bg-muted text-muted-foreground"}`}>
              {googleLinked ? "Linked" : "Not linked"}
            </span>
          </div>

          {/* SAT Score */}
          <div className={`stat-chip flex items-center justify-between ${profile?.satTotal ? "border-primary/25 bg-primary/6" : ""}`}>
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 ${profile?.satTotal ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">SAT Score</span>
            </div>
            <span className={`nova-badge text-[11px] ${profile?.satTotal ? "" : "border-border bg-muted text-muted-foreground"}`}>
              {profile?.satTotal ? `${profile.satTotal}` : "Not set"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            to="/account"
            className="flex items-center gap-1.5 text-sm font-medium text-primary transition hover:underline"
          >
            Manage all providers
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Roadmap Preview ───────────────────────────────── */}
      <section className="nova-panel p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Coming soon</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "University partnerships", desc: "Partner programs expanding access to 50+ universities." },
            { label: "AI-generated lessons", desc: "Personalized lesson plans built from your score gap analysis." },
            { label: "Study streaks & XP", desc: "Daily goals, XP points, and a community leaderboard." },
          ].map((item) => (
            <div key={item.label} className="stat-chip">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
