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
import BrandMotionLogo from "../components/BrandMotionLogo";

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
      ? `Current SAT total: ${satTotal}. Prioritize your lowest subsection first.`
      : "No SAT baseline yet. Start with a diagnostic block to unlock sharper guidance.";

  const personaLine =
    persona === "bold_dark"
      ? "Run 40-minute deep-focus sessions with strict breaks."
      : persona === "soft_cute"
        ? "Use calmer 20-minute focus cycles to protect consistency."
        : persona === "energetic_fun"
          ? "Keep it dynamic: short cycles, checkpoints, visible progress."
          : "Stay minimal: three top priorities and clean execution.";

  return `${firstName}, aligned with your ${topInterest} interest. ${scoreLine} ${personaLine}`;
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
    <div className="space-y-6 pb-14 sm:space-y-8 sm:pb-20">
      <section className="cosmos-hero p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Sypev Workspace</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Welcome back, <span className="text-foreground">{firstName}</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Your dashboard is personalized by profile, persona, and interests so every session
              stays focused and relevant.
            </p>

            <div className="flex flex-wrap gap-2">
              {interests.length > 0 ? (
                interests.map((interest: string) => (
                  <span
                    key={interest}
                    className="cosmos-pill rounded-full px-3 py-1 text-xs font-semibold capitalize"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <div className="cosmos-soft flex items-center gap-3 px-3 py-2 text-xs text-slate-300/80">
                  <BrandMotionLogo className="w-16" decorative />
                  <span>Add interests in onboarding/settings to unlock deeper personalization.</span>
                </div>
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
            <div className="cosmos-soft p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">AI Suggestion</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-100">{aiSuggestion}</p>
            </div>
            <div className="cosmos-soft p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Telegram</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-100">
                {telegramLinked
                  ? "Telegram is linked to this profile. Bot and web are running in one unified account."
                  : "Telegram is not linked yet. Link it in Account to enable one-tap sign-in and bot sync."}
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
          className="cosmos-panel p-4 transition-colors hover:border-cyan-200/35 sm:p-5"
        >
          <BookOpen className="h-6 w-6 text-foreground" />
          <h3 className="mt-3 text-xl font-semibold">SAT Engine</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Practice by topic and monitor progression with cleaner feedback.
          </p>
        </Link>

        <Link
          to="/admissions"
          className="cosmos-panel p-4 transition-colors hover:border-cyan-200/35 sm:p-5"
        >
          <GraduationCap className="h-6 w-6 text-foreground" />
          <h3 className="mt-3 text-xl font-semibold">Admissions Radar</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Match safety/target/reach universities from your updated profile.
          </p>
        </Link>

        <Link
          to="/tutor"
          className="cosmos-panel p-4 transition-colors hover:border-cyan-200/35 sm:p-5"
        >
          <Brain className="h-6 w-6 text-foreground" />
          <h3 className="mt-3 text-xl font-semibold">AI Counselor</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask tailored questions with persona + interests in context.
          </p>
        </Link>
      </section>

      <section className="cosmos-panel p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold">Current style profile</h3>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="cosmos-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/75">Persona</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-100">
              {(preferences?.persona ?? "clean_minimal").replace(/_/g, " ")}
            </p>
          </div>
          <div className="cosmos-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/75">Theme</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-100">{preferences?.theme ?? "system"}</p>
          </div>
          <div className="cosmos-soft p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/75">Bot + Link</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Bot className="h-4 w-4 text-foreground" />
              {telegramLinked ? "Linked" : "Not linked"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="cosmos-panel p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-foreground" />
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

        <article className="cosmos-panel p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-foreground" />
            <h3 className="text-lg font-semibold">Aniqlangan xatolar/risklar va tuzatish ishlari</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-foreground/90">
            <li>admin kirish huquqi yo&apos;qligi sababli xatolar</li>
            <li>xatolarni tuzatish uchun admin kirish huquqini sozlash</li>
            <li>foydalanuvchilarni avtorizatsiya qilish</li>
          </ul>
        </article>

        <article className="cosmos-panel p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-foreground" />
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
