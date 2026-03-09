import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { getTelegramConfig, me, register, telegramAuth } from "../api";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import BrandMotionLogo from "../components/BrandMotionLogo";
import BrandSplash from "../components/BrandSplash";
import { useAuth } from "../lib/auth";
import { getPostAuthPath } from "../lib/authRedirect";
import {
  getGoogleOAuthErrorMessage,
  getGoogleOAuthErrorMessageFromUrl,
  getSignupErrorMessage,
  isAuthRateLimitError,
} from "../lib/authErrors";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import gsap from "gsap";

const SIGNUP_COOLDOWN_KEY = "sypev_signup_cooldown_until";
const SIGNUP_COOLDOWN_MS = 70_000;

function getRemainingMs(until: number): number {
  return Math.max(0, until - Date.now());
}

function getStoredCooldownUntil(key: string): number {
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : 0;
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value;
}

function setCooldown(key: string, durationMs: number) {
  const until = Date.now() + durationMs;
  localStorage.setItem(key, String(until));
}

export default function Register() {
  const navigate = useNavigate();
  const { user, loading, setTelegramSession, refreshProfile } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailLoading, setEmailLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [telegramLoading, setTelegramLoading] = React.useState(false);
  const [telegramEnabled, setTelegramEnabled] = React.useState(true);
  const [telegramMessage, setTelegramMessage] = React.useState<string | null>(null);
  const [googleTemporarilyDisabled, setGoogleTemporarilyDisabled] = React.useState(false);
  const [oauthInlineMessage, setOauthInlineMessage] = React.useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = React.useState(() => getStoredCooldownUntil(SIGNUP_COOLDOWN_KEY));

  const emailSubmitLockRef = React.useRef(false);
  const oauthSubmitLockRef = React.useRef(false);
  const telegramLockRef = React.useRef(false);
  const oauthErrorHandledRef = React.useRef(false);

  const cooldownRemainingMs = getRemainingMs(cooldownUntil);
  const cooldownActive = cooldownRemainingMs > 0;
  const cooldownSeconds = Math.ceil(cooldownRemainingMs / 1000);

  const isAnyLoading = emailLoading || oauthLoading || telegramLoading;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!cooldownActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownUntil(getStoredCooldownUntil(SIGNUP_COOLDOWN_KEY));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownActive]);

  React.useEffect(() => {
    if (containerRef.current && formRef.current) {
      gsap.fromTo(
        ".animate-element",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: "power2.out" },
      );
    }
  }, []);

  React.useEffect(() => {
    if (oauthErrorHandledRef.current) {
      return;
    }

    const oauthErrorMessage = getGoogleOAuthErrorMessageFromUrl(window.location);
    if (!oauthErrorMessage) {
      return;
    }

    oauthErrorHandledRef.current = true;
    toast.error(oauthErrorMessage);

    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownActive) {
      toast.error(`Too many signup attempts. Please wait ${cooldownSeconds}s and try again.`);
      return;
    }

    if (isAnyLoading || emailSubmitLockRef.current) return;

    emailSubmitLockRef.current = true;
    setEmailLoading(true);

    try {
      const response = await register({
        email: email.trim().toLowerCase(),
        password,
      });

      const { error } = await supabase.auth.setSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
      });

      if (error) {
        throw error;
      }

      await refreshProfile();
      toast.success("Registration successful.");
      const current = await me();
      navigate(getPostAuthPath(current.user), { replace: true });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("email registration failed", err);

      if (isAuthRateLimitError(err)) {
        setCooldown(SIGNUP_COOLDOWN_KEY, SIGNUP_COOLDOWN_MS);
        setCooldownUntil(getStoredCooldownUntil(SIGNUP_COOLDOWN_KEY));
      }

      toast.error(getSignupErrorMessage(err));
    } finally {
      emailSubmitLockRef.current = false;
      setEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleTemporarilyDisabled || isAnyLoading || oauthSubmitLockRef.current) return;

    oauthSubmitLockRef.current = true;
    setOauthLoading(true);
    setOauthInlineMessage(null);
    let shouldReleaseLock = true;

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      shouldReleaseLock = false;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("google oauth registration failed", err);
      const message = getGoogleOAuthErrorMessage(err, "register");
      const lower = message.toLowerCase();
      if (lower.includes("not enabled") || lower.includes("provider")) {
        setGoogleTemporarilyDisabled(true);
      }
      setOauthInlineMessage(message);
      toast.error(message);
    } finally {
      if (shouldReleaseLock) {
        oauthSubmitLockRef.current = false;
        setOauthLoading(false);
      }
    }
  };

  React.useEffect(() => {
    (window as Window & { onTelegramAuth?: (user: Record<string, unknown>) => Promise<void> }).onTelegramAuth = async (
      user: Record<string, unknown>,
    ) => {
      if (isAnyLoading || telegramLockRef.current) return;

      telegramLockRef.current = true;
      setTelegramLoading(true);

      try {
        const res = await telegramAuth(user);
        if ("accessToken" in res) {
          await setTelegramSession(res.accessToken);
          const current = await me();
          navigate(getPostAuthPath(current.user), { replace: true });
          return;
        }

        if ("linked" in res) {
          await refreshProfile();
          const current = await me();
          navigate(getPostAuthPath(current.user), { replace: true });
          return;
        }

        toast.error("Telegram registration response is invalid");
      } catch (err: any) {
        toast.error(getSignupErrorMessage(err));
      } finally {
        telegramLockRef.current = false;
        setTelegramLoading(false);
      }
    };
  }, [isAnyLoading, navigate, refreshProfile, setTelegramSession]);

  React.useEffect(() => {
    if (loading || !user) {
      return;
    }
    const nextPath = getPostAuthPath(user);
    if (window.location.pathname !== nextPath) {
      navigate(nextPath, { replace: true });
    }
  }, [loading, navigate, user]);

  React.useEffect(() => {
    let cancelled = false;
    let widgetHealthTimer: number | null = null;
    const container = document.getElementById("telegram-register-container");
    if (!container) {
      return;
    }

    const mountWidget = async () => {
      try {
        const config = await getTelegramConfig();
        if (cancelled) {
          return;
        }
        if (!config.enabled || !config.botUsername) {
          setTelegramEnabled(false);
          if (config.requiredDomain && config.currentHost && config.domainMatch === false) {
            setTelegramMessage(
              `Bot domain invalid. BotFather /setdomain ni ${config.requiredDomain} ga qo'ying (hozirgi host: ${config.currentHost}).`,
            );
            return;
          }
          setTelegramMessage(config.error || "Telegram registration is currently unavailable.");
          return;
        }

        setTelegramEnabled(true);
        setTelegramMessage(null);
        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", config.botUsername);
        script.setAttribute("data-size", "large");
        script.setAttribute("data-radius", "16");
        script.setAttribute("data-onauth", "onTelegramAuth(user)");
        script.setAttribute("data-request-access", "write");
        script.async = true;

        container.replaceChildren();
        container.appendChild(script);

        widgetHealthTimer = window.setTimeout(() => {
          if (cancelled) {
            return;
          }
          const hasIframe = Boolean(container.querySelector("iframe"));
          if (!hasIframe) {
            setTelegramEnabled(false);
            setTelegramMessage(
              "Telegram widget could not load. Check BotFather domain and refresh the page.",
            );
          }
        }, 3500);
      } catch (error: any) {
        setTelegramEnabled(false);
        setTelegramMessage(error?.message || "Telegram registration is currently unavailable.");
      }
    };

    void mountWidget();

    return () => {
      cancelled = true;
      if (widgetHealthTimer !== null) {
        window.clearTimeout(widgetHealthTimer);
      }
      container.querySelector("script")?.remove();
    };
  }, []);

  if (loading) {
    return <BrandSplash compact message="Checking your auth session..." />;
  }

  return (
    <div className="min-h-screen flex w-full relative overflow-hidden bg-background">
      <div className="absolute inset-0 auth-split-gradient pointer-events-none opacity-40 mix-blend-multiply dark:mix-blend-screen" />

      <div className="flex-1 grid lg:grid-cols-2 relative z-10 w-full max-w-[1400px] mx-auto">
        <div className="hidden lg:flex flex-col justify-between p-12 pr-20 animate-element">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <img
                src="/brand/sypev-logo.png"
                alt="Sypev logo"
                className="h-10 w-auto rounded-md border border-border/70 bg-background px-2 py-1"
                loading="lazy"
              />
              <span className="text-2xl font-bold tracking-tight">Sypev</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Join the elite <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                scholars.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Create your account with Supabase Auth and complete your profile once, then use any linked identity to sign in.
            </p>

            <div className="mt-10 inline-flex rounded-2xl border border-border/70 bg-card/80 p-3">
              <BrandMotionLogo className="w-44" alt="Sypev brand animation preview" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative" ref={containerRef}>
          <div className="w-full justify-start mb-4 max-w-md animate-element">
            <Button variant="ghost" size="sm" asChild className="-ml-4 text-muted-foreground hover:text-foreground" disabled={isAnyLoading || cooldownActive}>
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Link>
            </Button>
          </div>

          <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-[2rem]">
            <div className="mb-8 animate-element">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Create account</h2>
              <p className="text-muted-foreground text-sm">Enter your information to get started.</p>
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
                    disabled={isAnyLoading || cooldownActive}
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
                    disabled={isAnyLoading || cooldownActive}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold group mt-2"
                  disabled={isAnyLoading || cooldownActive}
                >
                  {cooldownActive
                    ? `Please wait ${cooldownSeconds}s`
                    : emailLoading
                      ? "Creating..."
                      : "Create Account"}
                  {!cooldownActive && !emailLoading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </form>

              <div className="relative my-6 animate-element">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-semibold">
                  <span className="bg-background/80 backdrop-blur-md px-3 text-muted-foreground rounded-full">Or register with</span>
                </div>
              </div>

              <div className="space-y-3 animate-element flex flex-col items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl border-border/70 bg-card/80 hover:bg-card shadow-sm"
                  onClick={handleGoogleLogin}
                  disabled={googleTemporarilyDisabled || isAnyLoading || cooldownActive}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.25033 6.60998L5.31033 9.76C6.27533 6.81 9.07033 4.75 12.0003 4.75Z" fill="#EA4335"/><path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"/><path d="M5.26498 14.2949C5.02498 13.5649 4.88501 12.7949 4.88501 11.9949C4.88501 11.1949 5.01998 10.4249 5.26498 9.6949L1.275 6.65486C0.46 8.22986 0 10.0549 0 11.9949C0 13.9349 0.46 15.7599 1.28 17.3349L5.26498 14.2949Z" fill="#FBBC05"/><path d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C9.07041 19.245 6.27541 17.185 5.31041 14.235L1.25043 17.385C3.25543 21.305 7.31041 24 12.0004 24Z" fill="#34A853"/></svg>
                  {googleTemporarilyDisabled
                    ? "Google temporarily unavailable"
                    : oauthLoading
                      ? "Redirecting to Google..."
                      : "Continue with Google"}
                </Button>
                {oauthInlineMessage ? (
                  <div className="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    {oauthInlineMessage}
                  </div>
                ) : null}

                {telegramEnabled ? (
                  <div
                    id="telegram-register-container"
                    className={`flex min-h-12 justify-center [&>iframe]:rounded-2xl overflow-hidden shadow-sm transition-shadow w-full rounded-2xl border border-border/70 bg-card/80 p-2 ${isAnyLoading || cooldownActive ? "pointer-events-none opacity-60" : ""}`}
                  />
                ) : (
                  <div className="w-full rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-100">
                    {telegramMessage || "Telegram registration is currently unavailable."}
                  </div>
                )}
                {telegramLoading && <p className="text-xs text-muted-foreground">Authenticating with Telegram...</p>}
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
