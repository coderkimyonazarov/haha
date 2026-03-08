import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  login,
  telegramAuth,
  googleAuth,
  phoneSendOtp,
  phoneVerifyOtp,
} from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { ArrowRight, Fingerprint, Mail, Smartphone, Command } from "lucide-react";
import gsap from "gsap";

type AuthTab = "email" | "phone";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [tab, setTab] = React.useState<AuthTab>("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
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
  }, [tab]); // Re-animate on tab switch slightly

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ identifier: email, password });
      await refresh();
      if (res.needsUsername) {
        navigate("/set-username");
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async () => {
    setLoading(true);
    try {
      const res = await phoneSendOtp(phone);
      if (res.sent) {
        setOtpSent(true);
        toast.success("Verification code sent!");
        if (res.code) {
          toast.info(`Dev code: ${res.code}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await phoneVerifyOtp(phone, otp);
      await refresh();
      if (res.needsUsername) {
        navigate("/set-username");
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  // Telegram Login Widget callback
  React.useEffect(() => {
    (window as any).onTelegramAuth = async (user: Record<string, unknown>) => {
      try {
        const res = await telegramAuth(user);
        await refresh();
        if (res.needsUsername) {
          navigate("/set-username");
        } else {
          navigate("/dashboard");
        }
      } catch (err: any) {
        toast.error(err?.message || "Telegram login failed");
      }
    };
  }, [refresh, navigate]);

  // Load Telegram widget
  React.useEffect(() => {
    const botUsername = (window as any).__TELEGRAM_BOT_USERNAME;
    if (!botUsername) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "16");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    const container = document.getElementById("telegram-login-container");
    container?.appendChild(script);

    return () => {
      container?.querySelector("script")?.remove();
    };
  }, []);

  // Google credential callback
  React.useEffect(() => {
    (window as any).handleGoogleCredential = async (response: {
      credential: string;
    }) => {
      try {
        const res = await googleAuth(response.credential);
        await refresh();
        if (res.needsUsername) {
          navigate("/set-username");
        } else {
          navigate("/dashboard");
        }
      } catch (err: any) {
        toast.error(err?.message || "Google login failed");
      }
    };
  }, [refresh, navigate]);

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
              Welcome back to your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                master plan.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Access your personalized study schedule, university shortlist, and track your progress in one beautifully designed space.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-foreground/5 border border-border/50 backdrop-blur-sm">
              <p className="text-sm font-medium">"Success is the sum of small efforts, repeated day in and day out."</p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative" ref={containerRef}>
          
          <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-[2rem]">
            
            <div className="mb-8 animate-element">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Sign in</h2>
              <p className="text-muted-foreground text-sm">
                Enter your details to access your account.
              </p>
            </div>

            <div ref={formRef} className="space-y-6">
              {/* Tab Switcher */}
              <div className="flex gap-1 rounded-xl bg-muted/50 p-1 mb-6 animate-element">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${tab === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setTab("email")}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all opacity-60 cursor-not-allowed ${tab === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info("Tez orada qo'shiladi!");
                  }}
                >
                  <Smartphone className="w-4 h-4" />
                  Phone
                </button>
              </div>

              {tab === "email" && (
                <form className="space-y-4 animate-element" onSubmit={handleEmailLogin}>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-medium">Email or Username</Label>
                    <Input
                      className="h-12 bg-background/50 focus:bg-background transition-colors"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground/80 font-medium">Password</Label>
                      <Link
                        className="text-xs font-semibold text-primary hover:underline"
                        to="/forgot-password"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      className="h-12 bg-background/50 focus:bg-background transition-colors"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button className="w-full h-12 text-base font-semibold group mt-2" disabled={loading}>
                    {loading ? "Authenticating..." : "Log in"}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </form>
              )}

              {/* Divider */}
              <div className="relative my-6 animate-element">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-semibold">
                  <span className="bg-background/80 backdrop-blur-md px-3 text-muted-foreground rounded-full">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social Buttons */}
              <div className="space-y-3 animate-element">
                <div
                  id="telegram-login-container"
                  className="flex justify-center [&>iframe]:rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow"
                />
                <div id="google-signin-button" className="flex justify-center" />
              </div>

              <div className="text-center mt-8 animate-element">
                <p className="text-sm text-muted-foreground">
                  New to Test_Bro?{" "}
                  <Link className="text-foreground font-semibold hover:text-primary transition-colors hover:underline" to="/register">
                    Create an account
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
