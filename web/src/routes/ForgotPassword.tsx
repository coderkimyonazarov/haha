import React from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Command, ArrowRight, ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import gsap from "gsap";

export default function ForgotPassword() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        ".animate-element",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, [sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSent(true);
      toast.success(res.message || "Check your email for a reset link.");
      if (res.token) {
        toast.info(`Dev token: ${res.token}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full relative overflow-hidden bg-background">
      {/* Visual Background */}
      <div className="absolute inset-0 auth-split-gradient pointer-events-none opacity-40 mix-blend-multiply dark:mix-blend-screen" />

      <div className="flex-1 grid lg:grid-cols-2 relative z-10 w-full max-w-[1400px] mx-auto">
        
        {/* Left Side: Branding / Intro */}
        <div className="hidden lg:flex flex-col justify-between p-12 pr-20 animate-element">
          <div>
            <div className="flex items-center gap-2 mb-16">
              <Command className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold tracking-tight">Test_Bro</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Securing your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                Data.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Forgot your credentials? No worries. We'll help you regain access securely.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-foreground/5 border border-border/50 backdrop-blur-sm">
              <p className="text-sm font-medium">"Your security is our top priority."</p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative" ref={containerRef}>
          
          <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-[2.5rem]">
            
            {!sent ? (
              <>
                <div className="mb-8 animate-element">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h2>
                  <p className="text-muted-foreground text-sm">
                    Enter the email associated with your account and we'll send a magic link.
                  </p>
                </div>

                <form className="space-y-6 animate-element" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-medium">Email Address</Label>
                    <Input
                      className="h-12 bg-background/50 focus:bg-background transition-colors"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@example.com"
                    />
                  </div>
                  <Button className="w-full h-12 text-base font-semibold group mt-2" disabled={loading}>
                    {loading ? "Sending Protocol..." : "Send Reset Link"}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center animate-element py-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MailCheck className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-3">Check your inbox</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  If an account exists for <span className="font-semibold text-foreground">{email}</span>, we've sent a secure password reset link.
                </p>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full h-12 font-semibold" 
                    variant="outline" 
                    onClick={() => setSent(false)}
                  >
                    Try another email
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center mt-10 animate-element">
              <Link className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors" to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
