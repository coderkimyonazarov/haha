import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { gsap } from "gsap";
import { adminLogin } from "../api";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorText, setErrorText] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".al-logo", {
        scale: 0.55,
        opacity: 0,
        duration: 0.7,
        ease: "back.out(1.7)",
      });
      gsap.from(".al-title", {
        y: 18,
        opacity: 0,
        duration: 0.55,
        delay: 0.12,
        ease: "power3.out",
      });
      gsap.from(".al-sub", {
        y: 14,
        opacity: 0,
        duration: 0.5,
        delay: 0.2,
        ease: "power2.out",
      });
      gsap.from(".al-field", {
        y: 18,
        opacity: 0,
        duration: 0.45,
        stagger: 0.08,
        delay: 0.28,
        ease: "power2.out",
      });
      gsap.from(".al-btn", {
        scale: 0.95,
        opacity: 0,
        duration: 0.45,
        delay: 0.55,
        ease: "back.out(1.4)",
      });

      gsap.to(".al-orb-1", {
        x: 24,
        y: -14,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".al-orb-2", {
        x: -18,
        y: 20,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorText("");
    try {
      await adminLogin({ username: username.trim(), password });
      navigate("/admin");
    } catch (err: any) {
      setErrorText(err?.message || "Invalid credentials. Please try again.");
      gsap.to(".al-card", {
        x: -8,
        duration: 0.05,
        repeat: 5,
        yoyo: true,
        ease: "none",
        onComplete: () => {
          gsap.set(".al-card", { x: 0 });
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="admin-cosmos relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="al-orb-1 pointer-events-none absolute -top-16 left-[7%] h-72 w-72 rounded-full bg-gradient-to-br from-cyan-400/25 to-transparent blur-3xl" />
      <div className="al-orb-2 pointer-events-none absolute -bottom-12 right-[8%] h-80 w-80 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-indigo-300/15 via-cyan-200/5 to-transparent" />

      <svg className="pointer-events-none absolute inset-x-0 top-0 h-[110px] w-full" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden>
        <path d="M0,0 L1440,0 L1440,78 C1280,106 1080,32 900,54 C690,80 560,112 360,82 C250,66 130,48 0,72 Z" fill="rgba(15,23,42,0.9)" />
      </svg>

      <div className="al-card admin-glass relative z-10 w-full max-w-[470px] rounded-[30px] p-6 sm:p-8">
        <div className="al-logo mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-300/30 via-indigo-300/30 to-fuchsia-300/30">
            <ShieldCheck className="h-7 w-7 text-slate-100" />
          </div>
          <p className="rounded-full border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-100">
            Restricted
          </p>
          <h1 className="al-title mt-3 text-3xl font-extrabold tracking-tight text-white">Admin Portal</h1>
          <p className="al-sub mt-2 text-sm text-slate-300/75">Secure access for internal operations and analytics.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="al-field space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300/80">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
              className="admin-input w-full rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="al-field space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300/80">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="admin-input w-full rounded-xl px-3.5 py-2.5 pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-300/80 transition hover:bg-white/10 hover:text-slate-100"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorText && (
            <div className="rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {errorText}
            </div>
          )}

          <button
            className="al-btn mt-2 w-full rounded-xl border border-cyan-300/45 bg-gradient-to-r from-cyan-400/25 via-indigo-400/25 to-fuchsia-300/25 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                Authenticating...
              </span>
            ) : (
              "Authorize Access"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs font-medium text-slate-300/70 transition hover:text-cyan-100">
            Back to user portal
          </Link>
        </div>
      </div>
    </div>
  );
}
