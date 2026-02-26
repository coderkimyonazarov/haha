import React from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { login } from "../api";
import { useAuth } from "../lib/auth";
import { gsap } from "gsap";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorText, setErrorText] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".al-logo", {
        scale: 0.5,
        opacity: 0,
        duration: 0.7,
        ease: "back.out(1.7)",
      });
      gsap.from(".al-title", {
        y: 24,
        opacity: 0,
        duration: 0.6,
        delay: 0.15,
        ease: "power3.out",
      });
      gsap.from(".al-sub", {
        y: 16,
        opacity: 0,
        duration: 0.6,
        delay: 0.25,
        ease: "power3.out",
      });
      gsap.from(".al-field", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.35,
        ease: "power2.out",
      });
      gsap.from(".al-btn", {
        scale: 0.95,
        opacity: 0,
        duration: 0.5,
        delay: 0.65,
        ease: "back.out(1.4)",
      });

      // Animate orbs
      gsap.to(".al-orb-1", {
        x: 30,
        y: -20,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".al-orb-2", {
        x: -20,
        y: 30,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // If still loading auth, show dark loading screen
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6366f1",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18,
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            Checking session…
          </span>
        </div>
      </div>
    );
  }

  // Already logged in as admin → skip login
  if (user && user.isAdmin === 1) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorText("");
    try {
      await login({ email: identifier, password });
      await refresh();
      // After auth refresh, navigate; AdminRoute will handle guard
      navigate("/admin");
    } catch (err: any) {
      setErrorText(err?.message || "Invalid credentials. Please try again.");
      // Shake effect
      gsap.to(".al-card", {
        x: -8,
        duration: 0.05,
        repeat: 5,
        yoyo: true,
        ease: "none",
        onComplete: () => gsap.set(".al-card", { x: 0 }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "#050508",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Space Grotesk', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <div
        className="al-orb-1"
        style={{
          position: "absolute",
          top: "15%",
          left: "10%",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        className="al-orb-2"
        style={{
          position: "absolute",
          bottom: "10%",
          right: "8%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Login card */}
      <div
        className="al-card"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 420,
          background: "rgba(15, 17, 25, 0.85)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(99,102,241,0.18)",
          borderRadius: 24,
          padding: "44px 40px",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div
          className="al-logo"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              marginBottom: 16,
              boxShadow: "0 8px 24px rgba(79,70,229,0.4)",
            }}
          >
            ⚡
          </div>
          <h1
            className="al-title"
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "white",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Admin Portal
          </h1>
          <p
            className="al-sub"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              marginTop: 6,
              textAlign: "center",
            }}
          >
            Restricted area · Authorized personnel only
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Email / identifier */}
          <div
            className="al-field"
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(165,180,252,0.6)",
              }}
            >
              Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@sypev.com"
              required
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 12,
                color: "white",
                padding: "13px 16px",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s",
                width: "100%",
                boxSizing: "border-box",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(99,102,241,0.6)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(99,102,241,0.2)")
              }
            />
          </div>

          {/* Password */}
          <div
            className="al-field"
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(165,180,252,0.6)",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 12,
                  color: "white",
                  padding: "13px 44px 13px 16px",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(99,102,241,0.6)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(99,102,241,0.2)")
                }
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: "absolute",
                  right: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 16,
                  padding: 0,
                }}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {errorText && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#f87171",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span> {errorText}
            </div>
          )}

          {/* Submit */}
          <button
            className="al-btn"
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              background: submitting
                ? "rgba(79,70,229,0.4)"
                : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "white",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.02em",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: submitting
                ? "none"
                : "0 8px 20px rgba(79,70,229,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!submitting)
                (e.target as HTMLButtonElement).style.transform =
                  "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = "";
            }}
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Authenticating…
              </>
            ) : (
              "Authorize Access →"
            )}
          </button>
        </form>

        {/* Footer link */}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link
            to="/login"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.2)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLAnchorElement).style.color =
                "rgba(165,180,252,0.6)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLAnchorElement).style.color =
                "rgba(255,255,255,0.2)")
            }
          >
            ← Return to User Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
