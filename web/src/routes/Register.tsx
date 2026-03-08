import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { telegramAuth } from "../api";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Mail, Command } from "lucide-react";
import gsap from "gsap";

export default function Register() {
  const navigate = useNavigate();
  const { setSessionManually } = useAuth();
  
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current && formRef.current) {
      gsap.fromTo(
        ".animate-element",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, []);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      if (data.user?.identities?.length === 0) {
        toast.error("An account with this email already exists");
        return;
      }
      
      toast.success("Registration successful! Check your email to verify if required.");
      navigate("/set-username");
      
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = import.meta.env.VITE_WEBSITE_URL 
        ? `${import.meta.env.VITE_WEBSITE_URL}/dashboard`
        : `${window.location.origin}/dashboard`;
        
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Google registration failed");
    }
  };

  React.useEffect(() => {
    (window as any).onTelegramAuth = async (user: Record<string, unknown>) => {
      try {
        const res = await telegramAuth(user);
        if ((res as any).session) {
          await setSessionManually((res as any).session.access_token, (res as any).session.refresh_token);
        }
        navigate("/set-username");
      } catch (err: any) {
        toast.error(err?.message || "Telegram login failed");
      }
    };
  }, [setSessionManually, navigate]);

  React.useEffect(() => {
    const botUsername = (window as any).__TELEGRAM_BOT_USERNAME || "SypevBot";
    if (!botUsername) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "16");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    const container = document.getElementById("telegram-register-container");
    container?.appendChild(script);

    return () => {
      container?.querySelector("script")?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen flex w-full relative overflow-hidden bg-background">
      <div className="absolute inset-0 auth-split-gradient pointer-events-none opacity-40 mix-blend-multiply dark:mix-blend-screen" />

      <div className="flex-1 grid lg:grid-cols-2 relative z-10 w-full max-w-[1400px] mx-auto">
        <div className="hidden lg:flex flex-col justify-between p-12 pr-20 animate-element">
          <div>
            <div className="flex items-center gap-2 mb-16">
              <Command className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold tracking-tight">Test_Bro</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Join the elite <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                scholars.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Create an account instantly with Supabase Auth to begin your journey towards your top university choices.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative" ref={containerRef}>
          <div className="w-full justify-start mb-4 max-w-md animate-element">
            <Button variant="ghost" size="sm" asChild className="-ml-4 text-muted-foreground hover:text-foreground">
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Link>
            </Button>
          </div>

          <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-[2rem]">
            <div className="mb-8 animate-element">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Create account</h2>
              <p className="text-muted-foreground text-sm">
                Enter your information to get started.
              </p>
            </div>

            <div ref={formRef} className="space-y-6">
              <form className="space-y-4 animate-element" onSubmit={handleEmailRegister}>
                <div className="space-y-2">
                  <Label className="text-foreground/80 font-medium">Email Address</Label>
                  <Input
                    className="h-12 bg-background/50 focus:bg-background transition-colors"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground/80 font-medium">Password</Label>
                  <Input
                    className="h-12 bg-background/50 focus:bg-background transition-colors"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <Button className="w-full h-12 text-base font-semibold group mt-2" disabled={loading}>
                  {loading ? "Creating..." : "Create Account"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </form>

              <div className="relative my-6 animate-element">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-semibold">
                  <span className="bg-background/80 backdrop-blur-md px-3 text-muted-foreground rounded-full">
                    Or register with
                  </span>
                </div>
              </div>

              <div className="space-y-3 animate-element flex flex-col items-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-12 flex items-center justify-center gap-2"
                  onClick={handleGoogleLogin}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.25033 6.60998L5.31033 9.76C6.27533 6.81 9.07033 4.75 12.0003 4.75Z" fill="#EA4335"/><path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"/><path d="M5.26498 14.2949C5.02498 13.5649 4.88501 12.7949 4.88501 11.9949C4.88501 11.1949 5.01998 10.4249 5.26498 9.6949L1.275 6.65486C0.46 8.22986 0 10.0549 0 11.9949C0 13.9349 0.46 15.7599 1.28 17.3349L5.26498 14.2949Z" fill="#FBBC05"/><path d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C9.07041 19.245 6.27541 17.185 5.31041 14.235L1.25043 17.385C3.25543 21.305 7.31041 24 12.0004 24Z" fill="#34A853"/></svg>
                  Continue with Google
                </Button>
                
                <div
                  id="telegram-register-container"
                  className="flex justify-center [&>iframe]:rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow w-full"
                />
              </div>

              <div className="text-center mt-8 animate-element">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link className="text-foreground font-semibold hover:text-primary transition-colors hover:underline" to="/login">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
