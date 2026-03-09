import React from "react";
import Page from "../components/Page";
import { useAuth } from "../lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Sparkles,
  BookOpen,
  Trophy,
  Lightbulb,
  ArrowRight,
  Target,
  BarChart3,
  Dna,
} from "lucide-react";
import { Button } from "../components/ui/button";

interface FeedItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
  color: string;
}

const ITEMS: FeedItem[] = [
  {
    id: "1",
    title: "Mastering the Digital SAT Reading",
    description: "Focus on 'Command of Evidence' questions for a quick score boost.",
    icon: <BookOpen className="w-5 h-5" />,
    tag: "Strategy",
    color: "bg-blue-500",
  },
  {
    id: "2",
    title: "Top 5 Engineering Schools for 2026",
    description: "MIT, Stanford, and Berkeley lead the pack. Check out regional backups.",
    icon: <Target className="w-5 h-5" />,
    tag: "Admissions",
    color: "bg-purple-500",
  },
  {
    id: "3",
    title: "The 1600 Club: Exclusive Interview",
    description: "How a student from Tashkent hit the perfect score in 3 months.",
    icon: <Trophy className="w-5 h-5" />,
    tag: "Motivation",
    color: "bg-amber-500",
  },
  {
    id: "4",
    title: "Ivy League Financial Aid Secrets",
    description: "Did you know Harvard is free if your family earns under $85k?",
    icon: <Lightbulb className="w-5 h-5" />,
    tag: "Financial Aid",
    color: "bg-emerald-500",
  },
];

export default function ContentFeed() {
  const { preferences } = useAuth();
  const vibe = preferences?.vibe || "minimal";

  // Vibe styling logic
  const getContainerStyles = () => {
    switch (vibe) {
      case "playful":
        return "grid grid-cols-1 md:grid-cols-2 gap-8";
      case "bold":
        return "space-y-12";
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
    }
  };

  const getCardStyles = () => {
    switch (vibe) {
      case "playful":
        return "rounded-[2rem] border-4 border-primary/20 rotate-1 hover:rotate-0 transition-all duration-300 shadow-xl overflow-hidden";
      case "bold":
        return "border-l-[12px] border-l-primary rounded-none shadow-2xl py-8";
      default:
        return "rounded-xl border-muted shadow-none hover:border-primary/50 transition-colors";
    }
  };

  const getIconStyles = (color: string) => {
    switch (vibe) {
      case "playful":
        return `${color} p-4 text-white rounded-full shadow-lg -mt-8 ml-4 mb-4`;
      case "bold":
        return `bg-foreground text-background p-3 rounded-none mb-4`;
      default:
        return `${color} text-white p-2 rounded-lg mb-4`;
    }
  };

  return (
    <Page className="space-y-12 pb-24">
      <header data-animate="fade" className="cosmos-hero max-w-4xl p-6 sm:p-8">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-100">
          <Sparkles className="w-4 h-4" />
          Personalized for you
        </div>
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-slate-100">
          Discovery <span className="admin-glow-text">Feed</span>
        </h1>
        <p className="text-xl leading-relaxed text-slate-300/80">
          Curated intelligence for your academic journey, styled specifically for
          your <b>{vibe}</b> vibe.
        </p>
      </header>

      <div className={getContainerStyles()}>
        {/* Dynamic Vibe demonstration blocks */}
        {vibe === "minimal" && (
          <div className="cosmos-panel lg:col-span-4 flex items-center justify-between p-8">
            <div className="flex gap-8">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">142</span>
                <span className="text-xs text-muted-foreground uppercase font-medium">Universities Tracked</span>
              </div>
              <div className="w-[1px] bg-border" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold">8.4k</span>
                <span className="text-xs text-muted-foreground uppercase font-medium">Active Students</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              Live System Status: Optimal
            </div>
          </div>
        )}

        {ITEMS.map((item, idx) => (
          <div
            key={item.id}
            className={`${getCardStyles()} cosmos-panel`}
            style={{ transitionDelay: `${idx * 100}ms` }}
            data-animate="card"
          >
            <div className={getIconStyles(item.color)}>
              {item.icon}
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {item.tag}
                </span>
              </div>
              <h3 className={`font-bold mb-2 ${vibe === 'bold' ? 'text-3xl' : 'text-lg'}`}>
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {item.description}
              </p>
              <Button 
                variant={vibe === 'bold' ? 'default' : 'ghost'} 
                className={`group px-0 hover:px-2 transition-all ${vibe === 'bold' ? 'rounded-none' : ''}`}
              >
                Read Article
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}

        {vibe === "playful" && (
          <div className="md:col-span-2 bg-gradient-to-br from-violet-500 to-rose-500 p-8 rounded-[3rem] text-white overflow-hidden relative group">
            <Dna className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="relative z-10 space-y-4">
              <h2 className="text-4xl font-black italic">Meme Therapy</h2>
              <p className="text-lg font-medium text-white/90">
                Because studying for the SAT is 90% panic and 10% actually 
                forgetting how to add numbers.
              </p>
              <Button className="bg-white text-violet-600 hover:bg-violet-50 rounded-full font-bold">
                See Today's Memes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
