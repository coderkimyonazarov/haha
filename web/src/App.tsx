import { gsap } from "gsap";
import React from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Button } from "./components/ui/button";
import { AuthProvider, useAuth } from "./lib/auth";
import { adminMe, adminLogout } from "./api";
import Admissions from "./routes/Admissions";
import AdminPanel from "./routes/AdminPanel";
import Dashboard from "./routes/Dashboard";
import Login from "./routes/Login";
import Profile from "./routes/Profile";
import Register from "./routes/Register";
import StudySat from "./routes/StudySat";
import Tutor from "./routes/Tutor";
import Universities from "./routes/Universities";
import UniversityDetail from "./routes/UniversityDetail";
import AdminLogin from "./routes/AdminLogin";

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="p-10 text-muted-foreground">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
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

  if (adminOk === null)
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
        Authenticating…
      </div>
    );
  if (!adminOk) return <Navigate to="/admin/login" replace />;
  return children;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const shellRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!shellRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-shell='nav']", {
        y: -18,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
    }, shellRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={shellRef}
      className="relative min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_transparent_55%),radial-gradient(circle_at_20%_20%,_#fef3c7,_transparent_45%),radial-gradient(circle_at_80%_30%,_#ccfbf1,_transparent_55%)]"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        aria-hidden
      />
      <header
        className="sticky top-0 z-20 border-b border-white/40 bg-white/70 backdrop-blur"
        data-shell="nav"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 text-lg font-semibold tracking-tight"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              S
            </span>
            Sypev
          </Link>
          {user ? (
            <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
              <Link
                to="/dashboard"
                className="rounded-full px-3 py-1 hover:bg-primary/10 hover:text-primary"
              >
                Dashboard
              </Link>
              <Link
                to="/study/sat"
                className="rounded-full px-3 py-1 hover:bg-primary/10 hover:text-primary"
              >
                SAT Study
              </Link>
              <Link
                to="/admissions"
                className="rounded-full px-3 py-1 hover:bg-primary/10 hover:text-primary"
              >
                Admissions
              </Link>
              <Link
                to="/universities"
                className="rounded-full px-3 py-1 hover:bg-primary/10 hover:text-primary"
              >
                Universities
              </Link>
              <Link
                to="/tutor"
                className="rounded-full px-3 py-1 hover:bg-primary/10 hover:text-primary"
              >
                AI Tutor
              </Link>
              {user.isAdmin === 1 && (
                <Link
                  to="/admin"
                  className="rounded-full px-3 py-1 font-semibold"
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "white",
                  }}
                >
                  ⚡ Admin
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </nav>
          ) : (
            <nav className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium hover:text-primary"
              >
                Log in
              </Link>
              <Button asChild size="sm">
                <Link to="/register">Register</Link>
              </Button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

import { useGoogleAnalytics } from "./lib/analytics";

export default function App() {
  useGoogleAnalytics();
  return (
    <AuthProvider>
      <Routes>
        {/* ── Admin routes — standalone, no Layout wrapper ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        {/* ── Regular routes — wrapped in Layout ── */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
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
                  path="/tutor"
                  element={
                    <ProtectedRoute>
                      <Tutor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
