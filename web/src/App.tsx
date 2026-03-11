import { gsap } from "gsap";
import React from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Menu, Moon, Monitor, Sun, X } from "lucide-react";

import BrandSplash from "./components/BrandSplash";
import { AuthProvider, useAuth } from "./lib/auth";
import { adminMe, updatePreferences } from "./api";
import { useGoogleAnalytics } from "./lib/analytics";

import Admissions from "./routes/Admissions";
import AdminPanel from "./routes/AdminPanel";
import Dashboard from "./routes/Dashboard";
import Login from "./routes/Login";
import Profile from "./routes/Profile";
import Register from "./routes/Register";
import StudySat from "./routes/StudySat";
import AiChat from "./routes/AiChat";
import Universities from "./routes/Universities";
import UniversityDetail from "./routes/UniversityDetail";
import AdminLogin from "./routes/AdminLogin";
import SetUsername from "./routes/SetUsername";
import Onboarding from "./routes/Onboarding";
import ForgotPassword from "./routes/ForgotPassword";
import ResetPassword from "./routes/ResetPassword";
import AccountSettings from "./routes/AccountSettings";
import ContentFeed from "./routes/ContentFeed";
import { applyRouteSeo } from "./lib/seo";

function SeoManager() {
  const location = useLocation();
  React.useEffect(() => {
    applyRouteSeo(location.pathname);
  }, [location.pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <BrandSplash compact message="Preparing your personalized dashboard..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.username) {
    return <Navigate to="/set-username" replace />;
  }
  const isOnboarding = location.pathname === "/onboarding";
  if (user.needsOnboarding && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function AdminRoute({ children }: { children: React.ReactElement }) {
  const [adminOk, setAdminOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    adminMe()
      .then((data) => setAdminOk(data.admin))
      .catch(() => setAdminOk(false));
  }, []);

  if (adminOk === null) {
    return <BrandSplash compact message="Verifying admin session..." />;
  }
  if (!adminOk) return <Navigate to="/admin/login" replace />;
  return children;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, preferences, refresh } = useAuth();
  const location = useLocation();
  const shellRef = React.useRef<HTMLDivElement>(null);
  const [themeUpdating, setThemeUpdating] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!shellRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-shell='nav']", {
        y: -16,
        opacity: 0,
        duration: 0.65,
        ease: "power3.out",
      });
    }, shellRef);
    return () => ctx.revert();
  }, []);

  const handleThemeCycle = async () => {
    if (!preferences || themeUpdating) return;
    const modes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const next = modes[(modes.indexOf(preferences.theme) + 1) % modes.length];
    setThemeUpdating(true);
    try {
      await updatePreferences({ theme: next });
      await refresh();
    } finally {
      setThemeUpdating(false);
    }
  };

  const modeIcon =
    preferences?.theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : preferences?.theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, user?.id]);

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/study/sat", label: "SAT Study" },
    { to: "/admissions", label: "Admissions" },
    { to: "/universities", label: "Universities" },
    { to: "/tutor", label: "AI Counselor" },
    { to: "/feed", label: "Discovery" },
    { to: "/account", label: "Account" },
  ];

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  return (
    <div
      ref={shellRef}
      className="relative min-h-screen overflow-x-clip bg-background text-foreground transition-colors duration-500"
    >
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="spotlight spotlight-primary absolute -top-48 left-1/3 animate-glow-pulse opacity-25 dark:opacity-45"
        />
        <div
          className="spotlight spotlight-fuchsia absolute -bottom-48 right-1/4 animate-glow-pulse opacity-15 dark:opacity-35"
          style={{ animationDelay: "1.8s" }}
        />
      </div>

      {/* Navigation */}
      <header className="nav-glass sticky top-0 z-30" data-shell="nav">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand */}
          <Link to="/dashboard" className="group flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/20 to-[hsl(var(--primary-glow))/20] shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)] sm:h-9 sm:w-9">
              <img
                src="/brand/sypev-logo.png"
                alt="Sypev logo"
                className="h-full w-full object-contain"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-primary select-none">
                S
              </span>
            </div>
            <span className="text-base font-bold tracking-tight transition-colors group-hover:text-primary sm:text-lg">
              Sypev
            </span>
          </Link>

          {user ? (
            <>
              {/* Desktop navigation links */}
              <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main navigation">
                {navLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                      isActive(item.to)
                        ? "border border-primary/30 bg-primary/12 text-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.35)]"
                        : "border border-transparent text-foreground/65 hover:border-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                {user.isAdmin === 1 && (
                  <Link
                    to="/admin"
                    className="ml-1 rounded-full border border-primary/35 bg-primary/12 px-3.5 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/20"
                  >
                    Admin
                  </Link>
                )}
              </nav>

              {/* Desktop action buttons */}
              <div className="hidden items-center gap-2 xl:flex">
                <button
                  onClick={handleThemeCycle}
                  disabled={themeUpdating || !preferences}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/65 transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                  aria-label="Cycle theme mode"
                >
                  {modeIcon}
                </button>
                <button
                  onClick={() => void logout()}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground/65 transition hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive"
                >
                  Sign out
                </button>
              </div>

              {/* Mobile action buttons */}
              <div className="flex items-center gap-2 xl:hidden">
                <button
                  onClick={handleThemeCycle}
                  disabled={themeUpdating || !preferences}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/65 transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                  aria-label="Cycle theme"
                >
                  {modeIcon}
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/65 transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : (
            <nav className="flex items-center gap-3" aria-label="Auth navigation">
              <Link
                to="/login"
                className="text-sm font-medium text-foreground/70 transition hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-nova rounded-full px-4 py-2 text-sm"
              >
                Get started
              </Link>
            </nav>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {user && mobileMenuOpen && (
          <div className="border-t border-border/50 bg-card/96 px-4 py-3 backdrop-blur-2xl xl:hidden">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-2 sm:grid-cols-3">
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive(item.to)
                      ? "border border-primary/30 bg-primary/12 text-primary"
                      : "border border-border bg-muted/40 text-foreground/75 hover:bg-primary/8 hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user.isAdmin === 1 && (
                <Link
                  to="/admin"
                  className="rounded-xl border border-primary/35 bg-primary/15 px-3 py-2.5 text-sm font-semibold text-primary"
                >
                  Admin Panel
                </Link>
              )}
              <button
                className="col-span-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground/65 transition hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive sm:col-span-1"
                onClick={() => void logout()}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border/50">
        <div className="section-divider" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
              <span className="text-[10px] font-black text-primary">S</span>
            </div>
            <p>© {new Date().getFullYear()} Sypev — Precision SAT & admissions platform.</p>
          </div>
          <nav className="flex items-center gap-4" aria-label="Footer navigation">
            <Link to="/dashboard" className="transition hover:text-primary">Dashboard</Link>
            <Link to="/tutor" className="transition hover:text-primary">AI Tutor</Link>
            <Link to="/universities" className="transition hover:text-primary">Universities</Link>
            <Link to="/account" className="transition hover:text-primary">Settings</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  useGoogleAnalytics();

  return (
    <AuthProvider>
      <SeoManager />
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/set-username" element={<SetUsername />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/study/sat"
                  element={
                    <ProtectedRoute>
                      <StudySat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admissions"
                  element={
                    <ProtectedRoute>
                      <Admissions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/universities"
                  element={
                    <ProtectedRoute>
                      <Universities />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/universities/:id"
                  element={
                    <ProtectedRoute>
                      <UniversityDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tutor"
                  element={
                    <ProtectedRoute>
                      <AiChat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/feed"
                  element={
                    <ProtectedRoute>
                      <ContentFeed />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <AccountSettings />
                    </ProtectedRoute>
                  }
                />

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
