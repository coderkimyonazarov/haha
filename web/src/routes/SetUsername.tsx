import React from "react";
import { useNavigate } from "react-router-dom";

import { checkUsername, setPassword as apiSetPassword, setUsername } from "../api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import { getPostAuthPath } from "../lib/authRedirect";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Fingerprint, ArrowRight, Lock } from "lucide-react";
import gsap from "gsap";

export default function SetUsername() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [username, setUsernameVal] = React.useState("");
  const [password, setPasswordVal] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [normalizedUsername, setNormalizedUsername] = React.useState<string | null>(null);
  const [availError, setAvailError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
      );
    }
  }, []);

  React.useEffect(() => {
    if (user && user.username) {
      navigate(getPostAuthPath(user), { replace: true });
    }
  }, [user, navigate]);

  React.useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setAvailable(null);
      setNormalizedUsername(null);
      setAvailError(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsername(trimmed);
        setAvailable(result.available);
        setNormalizedUsername(result.normalizedUsername);
        setAvailError(result.error);
      } catch {
        setAvailable(false);
        setNormalizedUsername(null);
        setAvailError("Could not connect to server");
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!available || !normalizedUsername) return;

    setLoading(true);
    try {
      if (password.length >= 8) {
        try {
          await apiSetPassword(password);
        } catch {
          toast.error("Password update failed; username setup will continue.");
        }
      }
      await setUsername(normalizedUsername);
      await refreshProfile();
      toast.success("Username saved");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set username");
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = checking ? (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  ) : available === true && normalizedUsername ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  ) : available === false ? (
    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  ) : null;

  return (
    <div className="relative flex min-h-[calc(100dvh-180px)] w-full items-center justify-center overflow-hidden py-8">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 auth-split-gradient"
        aria-hidden
      />
      <div
        className="spotlight spotlight-primary pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 opacity-25 dark:opacity-45 animate-glow-pulse"
        aria-hidden
      />

      <div ref={containerRef} className="relative z-10 w-full max-w-md px-4">
        {/* Header badge */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 shadow-[0_0_32px_-8px_hsl(var(--primary)/0.4)]">
            <Fingerprint className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Claim your <span className="text-gradient">identity</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose a unique username. Input is normalised: uppercase and spaces are stripped automatically.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="glow-card p-7 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username field */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Username</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-primary">
                  @
                </span>
                <Input
                  className="h-12 pl-9 pr-10 font-mono tracking-wide"
                  value={username}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
                    setUsernameVal(v);
                  }}
                  placeholder="john_doe"
                  maxLength={30}
                  required
                  autoComplete="username"
                  autoFocus
                />

                {/* Status icon */}
                {statusIcon && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                    {statusIcon}
                  </span>
                )}
              </div>

              {/* Status message */}
              <div className="flex h-5 items-center text-xs font-medium">
                {checking ? (
                  <span className="text-muted-foreground">Checking availability...</span>
                ) : available === true && normalizedUsername ? (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Available as @{normalizedUsername}
                  </span>
                ) : available === false ? (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {availError || "Username not available"}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2 border-t border-border/60 pt-5">
              <Label className="text-sm font-semibold">
                Set Password{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-12 pl-10 pr-14"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPasswordVal(e.target.value)}
                  placeholder="Min 8 characters"
                  minLength={8}
                  autoComplete="new-password"
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
              <p className="text-xs leading-snug text-muted-foreground">
                If signed in via Google or Telegram, this lets you also sign in with email + password.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-nova flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              disabled={loading || !available || checking}
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  Complete setup
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-muted-foreground/70">
          Your username is your permanent identifier on Sypev. Choose wisely.
        </p>
      </div>
    </div>
  );
}
