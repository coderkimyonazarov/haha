import React from "react";
import { useAuth } from "../lib/auth";
import { Sparkles, Flame, Coffee, Quote } from "lucide-react";
import gsap from "gsap";

export default function FunBlock() {
  const { preferences } = useAuth();
  const vibe = preferences?.vibe || "minimal";
  const blockRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (blockRef.current) {
      gsap.fromTo(
        blockRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }
      );
    }
  }, [vibe]);

  if (vibe === "minimal") {
    return (
      <div 
        ref={blockRef}
        className="px-5 py-4 mt-6 rounded-2xl bg-muted/30 border border-border/50 text-sm flex items-start gap-4"
      >
        <Coffee className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground/90">Daily Focus</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            "Simplicity is the ultimate sophistication." Keep your mind clear and your goals sharp today.
          </p>
        </div>
      </div>
    );
  }

  if (vibe === "playful") {
    return (
      <div 
        ref={blockRef}
        className="px-5 py-4 mt-6 rounded-[2rem] bg-emerald-500/10 border-2 border-emerald-500/20 text-sm flex items-start gap-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-12 bg-emerald-500/20 blur-[30px] rounded-full -z-10" />
        <Sparkles className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5 fill-emerald-500/20" />
        <div>
          <p className="font-bold text-emerald-700 dark:text-emerald-400">You got this!</p>
          <p className="text-emerald-600/90 dark:text-emerald-300/80 mt-1 leading-relaxed font-medium">
            Remember to take breaks, drink water, and maybe pet a dog today. 🐶 Your brain needs rest to grow!
          </p>
        </div>
      </div>
    );
  }

  // bold / sigma meme vibe
  return (
    <div 
      ref={blockRef}
      className="px-5 py-4 mt-6 rounded-lg bg-red-500/5 border-l-4 border-red-500 text-sm flex items-start gap-4"
    >
      <Flame className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="font-black text-red-600 uppercase tracking-widest text-xs mb-1">Sigma Grindset</p>
        <p className="font-bold text-foreground">
          "They sleep, we grind."
        </p>
        <p className="text-muted-foreground font-medium mt-1 leading-relaxed text-xs">
          While your competition is scrolling, you are securing the target SAT score. Do not stop.
        </p>
      </div>
    </div>
  );
}
