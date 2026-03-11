import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { getTelegramConfig, login, me, telegramAuth } from "../api";
import { supabase } from "../lib/supabase";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import BrandSplash from "../components/BrandSplash";
import { useAuth } from "../lib/auth";
import { getPostAuthPath } from "../lib/authRedirect";
import {
  getGoogleOAuthErrorMessage,
  getGoogleOAuthErrorMessageFromUrl,
  getLoginErrorMessage,
  isAuthRateLimitError,
} from "../lib/authErrors";
import { toast } from "sonner";
import {
  ArrowRight,
  Mail,
  Lock,
  Sparkles,
  GraduationCap,
  Brain,
  Shield,
} from "lucide-react";
import gsap from "gsap";

type AuthTab = "email" | "phone";

const LOGIN_COOLDOWN_KEY = "sypev_login_cooldown_until";
const LOGIN_COOLDOWN_MS = 30_000;

function getRemainingMs(until: number): number {
  return Math.max(0, until - Date.now());
}

function getStoredCooldownUntil(key: string): number {
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : 0;
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

function setCooldown(key: string, durationMs: number) {
  localStorage.setItem(key, String(Date.now() + durationMs));
}

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Admissions radar",
    desc: "Match safety, target & reach universities in seconds.",
  },
  {
    icon: Brain,
    title: "AI counselor",
    desc: "Personalized guidance tuned to your interests & persona.",
  },
  {
    icon: Shield,
    title: "SAT engine",
    desc: "Topic-by-topic practice with adaptive feedback loops.",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, refreshProfile, setTelegramSession } = useAuth();
  const [tab, setTab] = React.useState<AuthTab>("email");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailLoading, setEmailLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [telegramLoading, setTelegramLoading] = React.useState(false);
  const [telegramEnabled, setTelegramEnabled] = React.useState(true);
  const [telegramMessage, setTelegramMessage] = React.useState<string | null>(null);
  const [googleTemporarilyDisabled, setGoogleTemporarilyDisabled] = React.useState(false);
  const [oauthInlineMessage, setOauthInlineMessage] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [cooldownUntil, setCooldownUntil] = React.useState(() =>
    getStoredCooldownUntil(LOGIN_COOLDOWN_KEY),
  );

  const emailSubmitLockRef = React.useRef(false);
  const oauthSubmitLockRef = React.useRef(false);
  const telegramLockRef = React.useRef(false);
  const oauthErrorHandledRef = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  const cooldownRemainingMs = getRemainingMs(cooldownUntil);
  const cooldownActive = cooldownRemainingMs > 0;
  const cooldownSeconds = Math.ceil(cooldownRemainingMs / 1000);
  const isAnyLoading = emailLoading || oauthLoading || telegramLoading;

  React.useEffect(() => {
    if (!cooldownActive) return;
    const timer = window.setInterval(() => {
      setCooldownUntil(getStoredCooldownUntil(LOGIN_COOLDOWN_KEY));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownActive]);

  React.useEffect(() => {
    if (containerRef.current && formRef.current) {
      gsap.fromTo(
        ".animate-element",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power2.out" },
      );
    }
  }, [tab]);

  React.useEffect(() => {
    if (oauthErrorHandledRef.current) return;
    const oauthErrorMessage = getGoogleOAuthErrorMessageFromUrl(window.location);
    if (!oauthErrorMessage) return;
    oauthErrorHandledRef.current = true;
    toast.error(oauthErrorMessage);
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownActive) {
      toast.error(`Too many login attempts. Please wait ${cooldownSeconds}s and try again.`);
      return;
    }
    if (isAnyLoading || emailSubmitLockRef.current) return;
    emailSubmitLockRef.current = true;
    setEmailLoading(true);
    try {
      const normalizedIdentifier = identifier.trim();
      if (!normalizedIdentifier || !password) {
        toast.error("Email/username and password are required.");
        return;
      }
      const response = await login({ identifier: normalizedIdentifier, password });
      const { error } = await supabase.auth.setSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
      });
      if (error) throw error;
      await refreshProfile();
      const current = await me();
      navigate(getPostAuthPath(current.user), { replace: true });
    } catch (err: any) {
      console.error("email/username login failed", err);
      if (isAuthRateLimitError(err)) {
        setCooldown(LOGIN_COOLDOWN_KEY, LOGIN_COOLDOWN_MS);
        setCooldownUntil(getStoredCooldownUntil(LOGIN_COOLDOWN_KEY));
      }
      toast.error(getLoginErrorMessage(err));
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      shouldReleaseLock = false;
    } catch (err: any) {
      console.error("google oauth login failed", err);
      const message = getGoogleOAuthErrorMessage(err, "login");
      if (message.toLowerCase().includes("not enabled") || message.toLowerCase().includes("provider")) {
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
        toast.error("Telegram login response is invalid");
      } catch (err: any) {
        toast.error(getLoginErrorMessage(err));
      } finally {
        telegramLockRef.current = false;
        setTelegramLoading(false);
      }
    };
  }, [isAnyLoading, navigate, refreshProfile, setTelegramSession]);

  React.useEffect(() => {
    if (loading || !user) return;
    const nextPath = getPostAuthPath(user);
    if (window.location.pathname !== nextPath) navigate(nextPath, { replace: true });
  }, [loading, navigate, user]);

  React.useEffect(() => {
    let cancelled = false;
    let widgetHealthTimer: number | null = null;
    const container = document.getElementById("telegram-login-container");
    if (!container) return;

    const mountWidget = async () => {
      try {
        const config = await getTelegramConfig();
        if (cancelled) return;
        if (!config.enabled || !config.botUsername) {
          setTelegramEnabled(false);
          if (config.requiredDomain && config.currentHost && config.domainMatch === false) {
            setTelegramMessage(
              `Bot domain invalid. Set /setdomain in BotFather to ${config.requiredDomain}.`,
            );
            return;
          }
          setTelegramMessage(config.error || "Telegram login is currently unavailable.");
          return;
        }
        setTelegramEnabled(true);
        setTelegramMessage(null);
        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", config.botUsername);
        script.setAttribute("data-size", "large");
        script.setAttribute("data-radius", "12");
        script.setAttribute("data-onauth", "onTelegramAuth(user)");
        script.setAttribute("data-request-access", "write");
        script.async = true;
        container.replaceChildren();
        container.appendChild(script);
        widgetHealthTimer = window.setTimeout(() => {
          if (cancelled) return;
          const hasIframe = Boolean(container.querySelector("iframe"));
          if (!hasIframe) {
            setTelegramEnabled(false);
            setTelegramMessage("Telegram widget could not load. Check BotFather domain settings.");
          }
        }, 3500);
      } catch (error: any) {
        setTelegramEnabled(false);
        setTelegramMessage(error?.message || "Telegram login is currently unavailable.");
      }
    };

    void mountWidget();
    return () => {
      cancelled = true;
      if (widgetHealthTimer !== null) window.clearTimeout(widgetHealthTimer);
      container.querySelector("script")?.remove();
    };
  }, []);

  if (loading) {
    return <BrandSplash compact message="Checking your auth session..." />;
  }

  return (
    <div className="relative w-full overflow-hidden" ref={containerRef}>
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 auth-split-gradient" aria-hidden />

      <div className="relative z-10 grid min-h-[calc(100dvh-180px)] w-full lg:grid-cols-2">

        {/* ─── Left: Brand panel ─────────────────────────────── */}
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-l-3xl p-10 lg:flex xl:p-14">
          {/* Glow orbs */}
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.4) 0%, transparent 70%)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(var(--primary-glow)/0.3) 0%, transparent 70%)" }}
            aria-hidden
          />

          <div className="relative space-y-8 animate-element">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
                <span className="text-sm font-black text-primary">S</span>
              </div>
              <span className="text-xl font-bold tracking-tight">Sypev</span>
            </div>

            {/* Headline */}
            <div>
              <div className="nova-badge mb-4 w-fit">
                <Sparkles className="h-3 w-3" />
                AI-powered admissions
              </div>
              <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
                Welcome back to
                <br />
                <span className="text-gradient">your path.</span>
              </h1>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
                Sign in and continue your precision SAT prep and university admissions journey.
              </p>
            </div>

            {/* Feature bullets */}
            <div className="space-y-4">
              {FEATURES.map((feat) => (
                <div key={feat.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
                    <feat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{feat.title}</p>
                    <p className="text-xs text-muted-foreground">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <p className="relative text-xs text-muted-foreground/60 animate-element">
            Trusted by students aiming for top universities worldwide.
          </p>
        </div>

        {/* ─── Right: Auth form ───────────────────────────────── */}
        <div className="flex flex-col items-center justify-center px-4 py-8 sm:px-8 lg:px-10">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden animate-element">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/15">
              <span className="text-xs font-black text-primary">S</span>
            </div>
            <span className="font-bold tracking-tight">Sypev</span>
          </div>

          <div ref={formRef} className="w-full max-w-md space-y-6">
            {/* Header */}
            <div className="animate-element">
              <h2 className="text-3xl font-extrabold tracking-tight">Sign in</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your credentials to access your account.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="animate-element flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
              <button
                type="button"
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  tab === "email"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("email")}
                disabled={isAnyLoading}
              >
                <Mail className="h-4 w-4" />
                Email / Username
              </button>
              <button
                type="button"
                className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-muted-foreground/50 transition-all"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isAnyLoading) toast.info("Phone auth coming soon!");
                }}
                disabled={isAnyLoading}
              >
                Phone
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  Soon
                </span>
              </button>
            </div>

            {/* Email/Username form */}
            {tab === "email" && (
              <form className="animate-element space-y-4" onSubmit={handleEmailLogin}>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Email or Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-12 pl-10 pr-4"
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        const v = e.target.value;
                        const isEmail = v.includes("@");
                        setIdentifier(isEmail ? v : v.toLowerCase().replace(/[^a-z0-9_.]/g, ""));
                      }}
                      placeholder="name@example.com or username"
                      disabled={isAnyLoading || cooldownActive}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Password</Label>
                    <Link
                      className="text-xs font-semibold text-primary transition hover:underline"
                      to="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-12 pl-10 pr-12"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isAnyLoading || cooldownActive}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                      onClick={() => setShowPassword((p) => !p)}
                      tabIndex={-1}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-nova mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                  disabled={isAnyLoading || cooldownActive}
                >
                  {cooldownActive
                    ? `Wait ${cooldownSeconds}s`
                    : emailLoading
                      ? "Signing in..."
                      : (
                        <>
                          Sign in
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="animate-element relative">
              <div className="absolute inset-0 flex items-center">
                <div className="section-divider w-full" />
              </div>
              <div className="relative flex justify-center">
                <span className="rounded-full bg-background px-3 text-xs text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            {/* Social auth */}
            <div className="animate-element flex flex-col items-center gap-3">
              {/* Google */}
              <button
                type="button"
                className="nova-card flex h-12 w-full items-center justify-center gap-3 rounded-xl text-sm font-medium transition-all hover:border-primary/30 disabled:opacity-60"
                onClick={handleGoogleLogin}
                disabled={googleTemporarilyDisabled || isAnyLoading || cooldownActive}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                  <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.25033 6.60998L5.31033 9.76C6.27533 6.81 9.07033 4.75 12.0003 4.75Z" fill="#EA4335" />
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                  <path d="M5.26498 14.2949C5.02498 13.5649 4.88501 12.7949 4.88501 11.9949C4.88501 11.1949 5.01998 10.4249 5.26498 9.6949L1.275 6.65486C0.46 8.22986 0 10.0549 0 11.9949C0 13.9349 0.46 15.7599 1.28 17.3349L5.26498 14.2949Z" fill="#FBBC05" />
                  <path d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C9.07041 19.245 6.27541 17.185 5.31041 14.235L1.25043 17.385C3.25543 21.305 7.31041 24 12.0004 24Z" fill="#34A853" />
                </svg>
                {googleTemporarilyDisabled
                  ? "Google unavailable"
                  : oauthLoading
                    ? "Redirecting..."
                    : "Continue with Google"}
              </button>

              {/* OAuth error */}
              {oauthInlineMessage && (
                <div className="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-200">
                  {oauthInlineMessage}
                </div>
              )}

              {/* Telegram widget */}
              {telegramEnabled ? (
                <div
                  id="telegram-login-container"
                  className={`nova-card flex min-h-12 w-full items-center justify-center overflow-hidden rounded-xl p-2 [&>iframe]:rounded-xl ${
                    isAnyLoading || cooldownActive ? "pointer-events-none opacity-55" : ""
                  }`}
                />
              ) : (
                <div className="w-full rounded-xl border border-primary/20 bg-primary/8 px-3.5 py-2.5 text-xs leading-relaxed text-foreground/70">
                  {telegramMessage || "Telegram login is currently unavailable."}
                </div>
              )}
              {telegramLoading && (
                <p className="text-xs text-muted-foreground">Authenticating with Telegram...</p>
              )}
            </div>

            {/* Register link */}
            <div className="animate-element text-center">
              <p className="text-sm text-muted-foreground">
                New to Sypev?{" "}
                <Link
                  className="font-semibold text-primary transition hover:underline"
                  to="/register"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
