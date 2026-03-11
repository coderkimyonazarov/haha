import React from "react";
import Page from "../components/Page";
import { useAuth } from "../lib/auth";
import {
  Sparkles,
  BookOpen,
  Trophy,
  Lightbulb,
  ArrowRight,
  Target,
  BarChart3,
  Dna,
  Zap,
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
    color: "from-blue-500/20 to-blue-600/20",
  },
  {
    id: "2",
    title: "Top 5 Engineering Schools for 2026",
    description: "MIT, Stanford, and Berkeley lead the pack. Check out regional backups.",
    icon: <Target className="w-5 h-5" />,
    tag: "Admissions",
    color: "from-purple-500/20 to-purple-600/20",
  },
  {
    id: "3",
    title: "The 1600 Club: Exclusive Interview",
    description: "How a student from Tashkent hit the perfect score in 3 months.",
    icon: <Trophy className="w-5 h-5" />,
    tag: "Motivation",
    color: "from-amber-500/20 to-amber-600/20",
  },
  {
    id: "4",
    title: "Ivy League Financial Aid Secrets",
    description: "Did you know Harvard is free if your family earns under $85k?",
    icon: <Lightbulb className="w-5 h-5" />,
    tag: "Financial Aid",
    color: "from-emerald-500/20 to-emerald-600/20",
  },
];

export default function ContentFeed() {
  const { preferences } = useAuth();
  const vibe = preferences?.vibe || "minimal";

  // Vibe styling logic refined for Nova
  const getContainerStyles = () => {
    switch (vibe) {
      case "playful":
        return "grid grid-cols-1 md:grid-cols-2 gap-8";
      case "bold":
        return "space-y-12 max-w-4xl mx-auto";
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";
    }
  };

  const getCardStyles = () => {
    switch (vibe) {
      case "playful":
        return "rounded-[2.5rem] border-2 border-primary/20 rotate-1 hover:rotate-0 transition-all duration-500 shadow-xl overflow-hidden hover:shadow-primary/10";
      case "bold":
        return "nova-panel border-l-[12px] border-l-primary rounded-none shadow-2xl py-10 hover:translate-x-2 transition-transform duration-300";
      default:
        return "nova-card hover:border-primary/40 transition-all duration-300";
    }
  };

  const getIconContainerStyles = (vibeType: string) => {
    switch (vibeType) {
      case "playful":
        return "h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center -mt-10 ml-6 mb-4 shadow-lg";
      case "bold":
        return "h-12 w-12 bg-foreground text-background flex items-center justify-center mb-6";
      default:
        return "h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4";
    }
  };

  return (
    <Page className="space-y-12 pb-24 max-w-7xl mx-auto">
      {/* ── Hero section with vibe-specific pulse ──────────────── */}
      <header data-animate="fade" className="glow-hero p-8 sm:p-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Curated for your {vibe} aesthetic
          </div>
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight">
            Discovery <span className="text-gradient">Feed</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Fresh intelligence and insider strategies tailored to your academic profile. 
            Styled specifically with your <b>{vibe}</b> vibe.
          </p>
        </div>
        
        {/* Decorative background orbs based on vibe */}
        <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[100px] transition-all duration-1000 ${
          vibe === 'playful' ? 'bg-fuchsia-500/20' : vibe === 'bold' ? 'bg-primary/30' : 'bg-primary/10'
        }`} />
      </header>

      <div className={getContainerStyles()}>
        {/* Dynamic Vibe demonstration blocks */}
        {vibe === "minimal" && (
          <div className="nova-panel lg:col-span-4 flex flex-col sm:flex-row items-center justify-between p-8 gap-6 border-primary/10 bg-primary/5" data-animate="fade">
            <div className="flex gap-12">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-primary">142</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Universities Tracked</span>
              </div>
              <div className="hidden sm:block w-[1px] bg-border/60" />
              <div className="flex flex-col">
                <span className="text-3xl font-black text-primary">8.4k</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Active Scholars</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-background/50 px-4 py-2 rounded-full border border-border/40">
              <BarChart3 className="w-4 h-4 text-primary" />
              System Status: Optimal
            </div>
          </div>
        )}

        {ITEMS.map((item, idx) => (
          <div
            key={item.id}
            className={`${getCardStyles()} flex flex-col p-6`}
            style={{ transitionDelay: `${idx * 100}ms` }}
            data-animate="card"
          >
            <div className={getIconContainerStyles(vibe)}>
              {item.icon}
            </div>
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  vibe === 'bold' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {item.tag}
                </span>
              </div>
              <h3 className={`font-extrabold mb-3 leading-tight tracking-tight ${
                vibe === 'bold' ? 'text-4xl' : 'text-xl'
              } group-hover:text-primary transition-colors`}>
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                {item.description}
              </p>
              <Button 
                variant={vibe === 'bold' ? 'secondary' : 'ghost'} 
                className={`group w-fit gap-2 font-bold uppercase text-[10px] tracking-widest transition-all ${
                  vibe === 'bold' ? 'rounded-none px-6' : 'px-0 hover:text-primary'
                }`}
              >
                Read Article
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}

        {vibe === "playful" && (
          <div className="md:col-span-2 glow-card p-10 rounded-[3.5rem] overflow-hidden relative group border-fuchsia-500/30 shadow-fuchsia-500/5" data-animate="card">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 pointer-events-none" />
            <Dna className="absolute -right-10 -bottom-10 w-64 h-64 text-primary/10 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="relative z-10 space-y-6">
              <div className="nova-badge bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200">
                <Zap className="h-3 w-3 fill-current" />
                Vibe Exclusive
              </div>
              <div className="space-y-2">
                <h2 className="text-5xl font-black italic tracking-tighter text-gradient from-violet-400 to-fuchsia-400">
                  Meme Therapy
                </h2>
                <p className="text-lg font-medium text-foreground/80 max-w-sm leading-snug">
                  Because studying for the SAT is 90% panic and 10% actually 
                  forgetting how to add numbers.
                </p>
              </div>
              <Button className="btn-nova bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 border-none rounded-full px-8 py-6 font-black uppercase tracking-widest text-xs">
                See Today's Memes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
