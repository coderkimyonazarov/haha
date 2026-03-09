import React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";

type FunCard = {
  title: string;
  line: string;
  microTask: string;
};

const CARDS: Record<string, FunCard[]> = {
  soft_cute: [
    {
      title: "Small wins mode",
      line: "Finish one tiny study task now and future-you says thanks.",
      microTask: "2 minutes: revise one SAT formula.",
    },
    {
      title: "Calm boost",
      line: "Your momentum matters more than intensity.",
      microTask: "Write one sentence goal for this session.",
    },
  ],
  bold_dark: [
    {
      title: "Focus lock",
      line: "High output comes from clean priorities, not noise.",
      microTask: "Close 2 distracting tabs and run one deep block.",
    },
    {
      title: "Precision mode",
      line: "Sharp execution beats random hustle.",
      microTask: "Solve 3 hard problems with full explanation.",
    },
  ],
  energetic_fun: [
    {
      title: "Energy sprint",
      line: "Fast loops, clear checkpoints, no boredom.",
      microTask: "15-minute timer: complete one topic checkpoint.",
    },
    {
      title: "Momentum streak",
      line: "Keep the streak alive with one meaningful action.",
      microTask: "Do one admissions task before your next break.",
    },
  ],
  clean_minimal: [
    {
      title: "Quiet progress",
      line: "Consistency scales better than intensity spikes.",
      microTask: "Clean your plan and keep only top 3 tasks.",
    },
    {
      title: "Signal over noise",
      line: "Simple systems create reliable results.",
      microTask: "Update one metric in your profile today.",
    },
  ],
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function FunBlock() {
  const { user, profile, preferences } = useAuth();
  const persona = preferences?.persona ?? "clean_minimal";
  const cards = CARDS[persona] ?? CARDS.clean_minimal;
  const seedBase = `${user?.id ?? "anon"}:${profile?.interests?.join(",") ?? ""}`;
  const initialIndex = hashString(seedBase + new Date().toDateString()) % cards.length;
  const [index, setIndex] = React.useState(initialIndex);
  const card = cards[index % cards.length];

  if (preferences && !preferences.funCardEnabled) {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Fun Layer
          </p>
          <h4 className="text-lg font-semibold">{card.title}</h4>
          <p className="text-sm text-muted-foreground">{card.line}</p>
          <p className="mt-2 text-sm font-medium text-foreground/85">{card.microTask}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => setIndex((prev) => (prev + 1) % cards.length)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Rotate
        </Button>
      </div>
    </div>
  );
}

