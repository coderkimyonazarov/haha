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
    script.setAttribute("data-radius", "8");
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
    <Page className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-4" data-animate="fade">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Welcome back
        </p>
        <h1 className="text-4xl font-semibold leading-tight">
          Log in and keep your plan on track.
        </h1>
        <p className="text-muted-foreground">
          Access your dashboard, SAT study plan, and the admissions shortlist in
          one place.
        </p>
      </div>
      <Card className="w-full max-w-md justify-self-center" data-animate="card">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Choose your preferred method.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex gap-1 rounded-lg border p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setTab("email")}
            >
              Email
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors opacity-50 cursor-not-allowed ${tab === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              onClick={(e) => {
                e.preventDefault();
                toast.info("Telefon orqali kirish tez orada qo'shiladi!");
              }}
            >
              Phone (Tez orada...)
            </button>
          </div>

          {tab === "email" && (
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <div className="space-y-2">
                <Label>Email or Username</Label>
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your_email@example.com or user_name"
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
                />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
              </Button>
              <div className="text-right">
                <Link
                  className="text-sm text-primary hover:underline"
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {tab === "phone" && (
            <form className="space-y-4" onSubmit={handlePhoneVerify}>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="+998 xx xxx xx xx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={otpSent}
                />
              </div>
              {!otpSent ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={loading || phone.length < 7}
                  onClick={handlePhoneSendOtp}
                >
                  {loading ? "Sending..." : "Send Code"}
                </Button>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Verification Code</Label>
                    <Input
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      required
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify & Log in"}
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                  >
                    Change number
                  </button>
                </>
              )}
            </form>
          )}

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="space-y-2">
            <div
              id="telegram-login-container"
              className="flex justify-center"
            />
            <div id="google-signin-button" className="flex justify-center" />
          </div>

          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link className="text-primary hover:underline" to="/register">
              Create an account
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}
