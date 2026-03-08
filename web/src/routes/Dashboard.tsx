import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth";
import FunBlock from "../components/FunBlock";
import { ArrowRight, BookOpen, Target, Sparkles, GraduationCap } from "lucide-react";
import gsap from "gsap";

export default function Dashboard() {
  const { profile, user } = useAuth();
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        ".animate-dash",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <div className="space-y-10 pb-20" ref={containerRef}>
      
      {/* Premium Top Area */}
      <section className="relative overflow-hidden rounded-[2.5rem] glass-panel border-b-0">
        <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10" />
        <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-[120px] -z-10" />
        
        <div className="relative z-10 p-8 md:p-12 lg:p-16 grid gap-8 lg:grid-cols-[1.5fr_1fr] items-center">
          <div className="space-y-6 animate-dash">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 border text-xs font-bold uppercase tracking-widest text-primary shadow-sm backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sypev Horizon Workspace</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Welcome back, <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                {user?.name || user?.username || "Scholar"}.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Your personalized command center for SAT mastery and university admissions strategy.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button asChild size="lg" className="h-12 px-8 font-semibold rounded-2xl group">
                <Link to="/study/sat">
                  Launch Study Plan
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 font-semibold rounded-2xl bg-background/50 hover:bg-background">
                <Link to="/admissions">Admissions Radar</Link>
              </Button>
            </div>

            <FunBlock />
          </div>

          <div className="animate-dash h-full flex items-center justify-end">
            <div className="w-full max-w-sm glass-panel bg-card/80 p-6 rounded-3xl border shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -z-10" />
              
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold">Snapshot</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Latest diagnostic scores</p>
                </div>
                <div className="p-2.5 bg-background rounded-xl shadow-sm border">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>

              {profile?.satTotal ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 font-medium text-sm border-border/50 border">
                      <span className="text-muted-foreground">Math</span>
                      <span className="text-base font-bold text-foreground">{profile.satMath}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 font-medium text-sm border-border/50 border">
                      <span className="text-muted-foreground">Reading & Writing</span>
                      <span className="text-base font-bold text-foreground">{profile.satReadingWriting}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary text-primary-foreground flex items-center justify-between shadow-lg shadow-primary/20">
                    <span className="font-semibold">Aggregate Score</span>
                    <span className="text-2xl font-black">{profile.satTotal}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 px-4 bg-muted/30 rounded-2xl border border-dashed border-border flex flex-col items-center">
                  <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-3 shadow-sm border block">
                    <Target className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No baseline taken.</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center leading-relaxed">
                    Add a diagnostic score to unlock smart recommendations and tracking.
                  </p>
                  <Button asChild variant="ghost" className="mt-2 h-auto px-0 text-primary">
                    <Link to="/profile">Update Profile</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="grid gap-6 md:grid-cols-3 animate-dash">
        <Link to="/study/sat" className="group block h-full">
          <div className="glass-panel h-full p-8 rounded-[2rem] hover:border-primary/50 transition-colors relative overflow-hidden flex flex-col">
            <div className="p-3 w-fit rounded-2xl bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-2">SAT Study Engine</h3>
            <p className="text-muted-foreground leading-relaxed flex-1">
              Dive into personalized workflows covering Math and R&W topics mapped to your exact weaknesses.
            </p>
            <div className="mt-8 flex items-center text-sm font-semibold text-primary">
              Enter Module <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link to="/admissions" className="group block h-full">
          <div className="glass-panel h-full p-8 rounded-[2rem] hover:border-primary/50 transition-colors relative overflow-hidden flex flex-col">
            <div className="p-3 w-fit rounded-2xl bg-emerald-500/10 text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Admissions Radar</h3>
            <p className="text-muted-foreground leading-relaxed flex-1">
              Automatically calculate safety, target, and reach schools aligned with your metrics.
            </p>
            <div className="mt-8 flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Calculate Matches <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link to="/tutor" className="group block h-full">
          <div className="glass-panel h-full p-8 rounded-[2rem] hover:border-primary/50 transition-colors relative overflow-hidden flex flex-col">
            <div className="p-3 w-fit rounded-2xl bg-violet-500/10 text-violet-500 mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-2">AI Counselor</h3>
            <p className="text-muted-foreground leading-relaxed flex-1">
              Interact with a custom AI designed to guide you through tricky problems or admission anxiety.
            </p>
            <div className="mt-8 flex items-center text-sm font-semibold text-violet-600 dark:text-violet-400">
              Start Chatting <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
