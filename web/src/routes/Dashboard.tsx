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
  ShieldAlert,
  Clock3,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth";
import FunBlock from "../components/FunBlock";

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
      ? `Your current SAT total is ${satTotal}, so focus on the weakest subsection first.`
      : "No SAT baseline detected yet, so create a diagnostic score to unlock stronger recommendations.";

  const personaLine =
    persona === "bold_dark"
      ? "Use 40-minute deep-work blocks with strict breaks."
      : persona === "soft_cute"
        ? "Use gentler 20-minute focus cycles to keep momentum stable."
        : persona === "energetic_fun"
          ? "Keep study dynamic: short cycles, visible checkpoints, quick wins."
          : "Keep your plan minimal: top 3 priorities only.";

  return `${firstName}, based on your ${topInterest} interest: ${scoreLine} ${personaLine}`;
}

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

  const telegramLinked = Boolean(providers.find((provider) => provider.provider === "telegram"));

  return (
    <div className="space-y-8 pb-20">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Personalized Hub</p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome back, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Your dashboard adapts to your profile, persona, and interests to keep every session
              more relevant.
            </p>
            <div className="flex flex-wrap gap-2">
              {interests.length > 0 ? (
                interests.map((interest: string) => (
                  <span
                    key={interest}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  Add interests in onboarding/settings
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild>
                <Link to="/study/sat">
                  Continue SAT plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/account">Open settings</Link>
              </Button>
            </div>
            <FunBlock />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI Suggestion</p>
              <p className="mt-2 text-sm leading-relaxed">{aiSuggestion}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Telegram</p>
              <p className="mt-2 text-sm leading-relaxed">
                {telegramLinked
                  ? "Telegram is linked to this account. You can use Telegram login safely."
                  : "Telegram is not linked yet. Link it from Account to enable one-tap Telegram sign-in."}
              </p>
              <Button asChild variant="ghost" className="mt-2 px-0">
                <Link to="/account">
                  Manage providers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          to="/study/sat"
          className="rounded-2xl border border-border/70 bg-card/70 p-5 transition-colors hover:border-primary/40"
        >
          <BookOpen className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-xl font-semibold">SAT Engine</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Practice by topic and monitor score progression with cleaner feedback.
          </p>
        </Link>

        <Link
          to="/admissions"
          className="rounded-2xl border border-border/70 bg-card/70 p-5 transition-colors hover:border-primary/40"
        >
          <GraduationCap className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-xl font-semibold">Admissions Radar</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Match safety/target/reach universities from your updated profile.
          </p>
        </Link>

        <Link
          to="/tutor"
          className="rounded-2xl border border-border/70 bg-card/70 p-5 transition-colors hover:border-primary/40"
        >
          <Brain className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-xl font-semibold">AI Counselor</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask tailored questions with your persona and interests in context.
          </p>
        </Link>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/70 p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Current style profile</h3>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Persona</p>
            <p className="mt-1 text-sm font-semibold capitalize">
              {(preferences?.persona ?? "clean_minimal").replace(/_/g, " ")}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Theme</p>
            <p className="mt-1 text-sm font-semibold capitalize">{preferences?.theme ?? "system"}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bot + Link</p>
            <p className="mt-1 text-sm font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              {telegramLinked ? "Linked" : "Not linked"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Yangi funksiyalar</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-foreground/90">
            <li>
              foydalanuvchilar sonini ko&apos;paytirish uchun ochiq universitetlar bilan hamkorlik
              qilish
            </li>
            <li>
              foydalanuvchilarga ko&apos;proq xizmat ko&apos;rsatish uchun AI yordamida darsliklar yaratish
            </li>
          </ul>
        </article>

        <article className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold">Aniqlangan xatolar/risklar va tuzatish ishlari</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-foreground/90">
            <li>admin kirish huquqi yo&apos;qligi sababli xatolar</li>
            <li>xatolarni tuzatish uchun admin kirish huquqini sozlash</li>
            <li>foydalanuvchilarni avtorizatsiya qilish</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-sky-600" />
            <h3 className="text-lg font-semibold">Kelgusi 24 soat ichida bajariladigan ishlar</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-foreground/90">
            <li>xatolarni tuzatish</li>
            <li>admin huquqlarini sozlash</li>
            <li>foydalanuvchilarni avtorizatsiya qilish</li>
            <li>yangi funksiyalarni ishlab chiqish</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
