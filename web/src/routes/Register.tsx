import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, telegramAuth, googleAuth } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import Page from "../components/Page";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await register({ email, password, name: name || undefined });
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
        toast.error(err?.message || "Telegram registration failed");
      }
    };
  }, [refresh, navigate]);

  React.useEffect(() => {
    const botUsername = (window as any).__TELEGRAM_BOT_USERNAME;
    if (!botUsername) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    const container = document.getElementById("telegram-register-container");
    container?.appendChild(script);

    return () => {
      container?.querySelector("script")?.remove();
    };
  }, []);

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
        toast.error(err?.message || "Google registration failed");
      }
    };
  }, [refresh, navigate]);

  return (
    <Page className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-4" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Get started
        </p>
        <h1 className="text-4xl font-semibold leading-tight">
          Create your Sypev account.
        </h1>
        <p className="text-muted-foreground">
          Build a personalized SAT plan and map the universities that fit your
          goals.
        </p>
      </div>
      <Card className="w-full max-w-md justify-self-center" data-animate="card">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Start tracking SAT prep and US admissions today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters
              </p>
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Register"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or sign up with
              </span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="space-y-2">
            <div
              id="telegram-register-container"
              className="flex justify-center"
            />
            <div id="google-signup-button" className="flex justify-center" />
          </div>

          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link className="text-primary hover:underline" to="/login">
              Log in
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}
