import React from "react";
import { useNavigate } from "react-router-dom";

import { checkUsername, setPassword, setUsername } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Fingerprint } from "lucide-react";
import gsap from "gsap";

export default function SetUsername() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [username, setUsernameVal] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [normalizedUsername, setNormalizedUsername] = React.useState<string | null>(null);
  const [availError, setAvailError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" },
      );
    }
  }, []);

  React.useEffect(() => {
    if (user && user.username) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  React.useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setAvailable(null);
      setNormalizedUsername(null);
      setAvailError(null);
      return;
    }

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
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!available || !normalizedUsername) {
      return;
    }

    setLoading(true);
    try {
      if (password.length >= 8) {
        try {
          await setPassword(password);
        } catch {
          toast.error("Password update failed; username setup will continue.");
        }
      }

      await setUsername(normalizedUsername);
      await refreshProfile();
      toast.success("Username saved");
      navigate("/onboarding");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set username");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full relative overflow-hidden bg-background">
      <div className="absolute inset-0 auth-split-gradient pointer-events-none opacity-40" />

      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 w-full max-w-7xl mx-auto">
        <div ref={containerRef} className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Fingerprint className="w-8 h-8" />
            </div>
          </div>

          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Claim Identity</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Choose a unique username. Uppercase input is accepted and normalized to lowercase.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-semibold text-foreground/80">Username</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-medium">@</span>
                <Input
                  className="pl-9 h-12 bg-background/50 focus:bg-background transition-colors"
                  value={username}
                  onChange={(e) => setUsernameVal(e.target.value)}
                  placeholder="john_doe"
                  maxLength={30}
                  required
                />
              </div>

              {username.length > 0 && (
                <div className="text-xs font-medium h-5 flex items-center mt-1">
                  {available === null && (
                    <span className="text-muted-foreground animate-pulse">Checking availability...</span>
                  )}
                  {available === true && normalizedUsername && (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Available as @{normalizedUsername}
                    </span>
                  )}
                  {available === false && (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {availError || "Not available"}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label className="font-semibold text-foreground/80">
                Set Password <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                className="h-12 bg-background/50 focus:bg-background transition-colors"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                minLength={8}
              />
              <p className="text-[11px] text-muted-foreground leading-snug">
                If you are currently signed in with email/Google, this updates your account password for future email/username login.
              </p>
            </div>

            <Button className="w-full h-12 text-base font-semibold transition-all mt-4 hover:scale-[1.02]" disabled={loading || !available}>
              {loading ? "Securing Identity..." : "Complete Setup"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
