import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";
import { useAuth } from "../lib/auth";
import { gsap } from "gsap";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState("");

  const containerRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useLayoutEffect(() => {
    if (!containerRef.current || !formRef.current) return;

    // Premium entry animation
    const ctx = gsap.context(() => {
      gsap.from(".admin-badge", {
        y: -20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });
      gsap.from(".admin-title", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.1,
        ease: "power3.out",
      });
      gsap.from(".admin-subtitle", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: "power3.out",
      });
      gsap.from(formRef.current!.children, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.3,
        ease: "power2.out",
      });
      // Floating particles background effect
      gsap.to(".particle", {
        y: "random(-100, 100)",
        x: "random(-100, 100)",
        opacity: "random(0.1, 0.4)",
        duration: "random(3, 6)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.1,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorText("");
    try {
      await login({ email, password });
      await refresh();

      // We must check if the user is actually an admin after fetching profile
      // The `refresh()` call above updates `window.__AUTH_USER` (conceptually) but `useAuth` user object is updated async.
      // We can do a quick check via an API or just rely on the protected route mechanics.
      // A better way is to wait briefly for context to sync or manually verify.
      // Let's just navigate. The <AdminRoute> will kick them out if they aren't admin.
      // But for a better UX, we could fetch /api/profile directly and verify.

      const res = await fetch("/api/profile");
      if (res.ok) {
        const body = await res.json();
        if (body.data?.isAdmin === 1) {
          navigate("/admin");
        } else {
          setErrorText(
            "Access Denied: You do not have administrator privileges.",
          );
          // Ideally logout here or redirect them to dashboard
          setTimeout(() => navigate("/dashboard"), 2000);
        }
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      setErrorText(err?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    color: "white",
    padding: "14px 18px",
    width: "100%",
    outline: "none",
    fontSize: "15px",
    transition: "all 0.3s ease",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center min-h-screen overflow-hidden"
      style={{
        background: "#050505",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />

      {/* Tiny particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="particle absolute rounded-full bg-white point-events-none"
          style={{
            width: Math.random() * 4 + 1 + "px",
            height: Math.random() * 4 + 1 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            opacity: 0,
          }}
        />
      ))}

      <div
        className="relative z-10 w-full max-w-md p-10 rounded-3xl"
        style={{
          background: "rgba(20, 20, 25, 0.6)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div className="text-center mb-8">
          <div
            className="admin-badge inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#a5b4fc",
              fontSize: "24px",
            }}
          >
            ⚡
          </div>
          <h1 className="admin-title text-3xl font-bold text-white tracking-tight">
            System Admin
          </h1>
          <p className="admin-subtitle text-sm mt-2 text-indigo-200/60">
            Restricted access portal. Please authenticate.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-indigo-300/50 uppercase mb-2">
              Email Address / Username
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:border-indigo-500 focus:bg-white/5 transition-all"
              style={fieldStyle}
              placeholder="admin@sypev.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-indigo-300/50 uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus:border-indigo-500 focus:bg-white/5 transition-all"
              style={fieldStyle}
              placeholder="••••••••"
              required
            />
          </div>

          {errorText && (
            <div className="text-red-400 text-sm py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20">
              {errorText}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden group rounded-xl py-3.5 mt-2 font-bold text-[15px] tracking-wide transition-all"
            style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "white",
              opacity: loading ? 0.7 : 1,
              transform: loading ? "scale(0.98)" : "scale(1)",
            }}
          >
            <span className="relative z-10">
              {loading ? "Authenticating..." : "Authorize Access"}
            </span>
            <div className="absolute inset-0 h-full w-full opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </button>

          <div className="text-center mt-6">
            <Link
              to="/login"
              className="text-xs text-indigo-300/40 hover:text-indigo-300/80 transition-colors"
            >
              ← Return to User Portal
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
