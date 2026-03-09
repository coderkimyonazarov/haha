import { gsap } from "gsap";
import React from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Menu, Moon, Monitor, Sun, X } from "lucide-react";

import { Button } from "./components/ui/button";
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

  return (
    <div ref={shellRef} className="relative min-h-screen overflow-x-clip bg-background transition-colors duration-500">
      <div className="pointer-events-none absolute inset-0 -z-10 brand-noise opacity-[0.16]" aria-hidden />

      <header
        className="sticky top-0 z-30 border-b border-border/70 bg-background/88 backdrop-blur-xl"
        data-shell="nav"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img
              src="/brand/sypev-logo.png"
              alt="Sypev logo"
              className="h-8 w-auto rounded-md border border-border/60 bg-white px-1.5 py-1 sm:h-9"
              loading="lazy"
            />
            <span className="text-base font-semibold tracking-tight sm:text-lg">Sypev</span>
          </Link>

          {user ? (
            <>
              <nav className="hidden items-center gap-1.5 text-sm font-medium xl:flex">
                {navLinks.map((item) => (
                  <Link key={item.to} to={item.to} className="rounded-full px-3 py-1.5 hover:bg-muted/80">
                    {item.label}
                  </Link>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleThemeCycle}
                  disabled={themeUpdating || !preferences}
                  className="gap-2"
                >
                  {modeIcon}
                  <span className="capitalize">{preferences?.theme ?? "mode"}</span>
                </Button>
                {user.isAdmin === 1 ? (
                  <Link
                    to="/admin"
                    className="rounded-full border border-border/70 bg-card px-3 py-1.5 font-semibold"
                  >
                    Admin
                  </Link>
                ) : null}
                <Button variant="outline" size="sm" onClick={logout}>
                  Log out
                </Button>
              </nav>

              <div className="flex items-center gap-2 xl:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleThemeCycle}
                  disabled={themeUpdating || !preferences}
                  className="h-9 w-9 rounded-full p-0"
                  aria-label="Toggle theme mode"
                >
                  {modeIcon}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                >
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </>
          ) : (
            <nav className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium hover:text-foreground">
                Log in
              </Link>
              <Button asChild size="sm">
                <Link to="/register">Register</Link>
              </Button>
            </nav>
          )}
        </div>

        {user && mobileMenuOpen ? (
          <div className="border-t border-border/60 bg-background/95 px-4 py-3 xl:hidden">
            <div className="mx-auto grid w-full max-w-7xl gap-2 sm:grid-cols-2">
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm font-medium hover:bg-card"
                >
                  {item.label}
                </Link>
              ))}
              {user.isAdmin === 1 ? (
                <Link
                  to="/admin"
                  className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm font-semibold hover:bg-card"
                >
                  Admin
                </Link>
              ) : null}
              <Button variant="outline" size="sm" className="justify-start rounded-xl" onClick={logout}>
                Log out
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">{children}</main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} Sypev. Precision SAT & admissions platform.</p>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link to="/tutor" className="hover:text-foreground">
              AI Tutor
            </Link>
            <Link to="/account" className="hover:text-foreground">
              Settings
            </Link>
          </div>
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
