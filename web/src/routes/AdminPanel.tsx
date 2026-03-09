import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  Building2,
  CircleUserRound,
  Eye,
  GraduationCap,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import {
  adminAddUniversity,
  adminDeleteUniversity,
  adminDeleteUser,
  adminGetAiInsights,
  adminGetAuditLogs,
  adminGetErrors,
  adminGetEvents,
  adminGetStats,
  adminGetUniversities,
  adminGetUsers,
  adminLogout,
  adminToggleAdmin,
  type AdminAiInsight,
  type AdminAuditLog,
  type AdminErrorItem,
  type AdminEvent,
  type AdminStats,
  type AdminUniversity,
  type AdminUser,
} from "../api";

function fmtDate(ts?: number | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(ts?: number | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type Tab = "overview" | "users" | "universities" | "observability";

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: "cyan" | "indigo" | "rose";
}) {
  const accentMap: Record<"cyan" | "indigo" | "rose", string> = {
    cyan: "from-cyan-300/25 to-sky-400/5 text-cyan-100",
    indigo: "from-indigo-300/30 to-violet-400/5 text-indigo-100",
    rose: "from-rose-300/30 to-fuchsia-400/5 text-rose-100",
  };

  return (
    <div className="admin-glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl border border-white/15 bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-100">{value}</div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-300/75">{label}</div>
        </div>
      </div>
    </div>
  );
}

function AuroraWave() {
  return (
    <svg className="admin-wave" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="adminWave" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.12" />
          <stop offset="42%" stopColor="#818cf8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f9a8d4" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <path d="M0,48 C150,76 330,8 520,34 C710,60 860,95 1080,58 C1240,31 1330,18 1440,42 L1440,96 L0,96 Z" fill="url(#adminWave)" />
      <path d="M0,56 C250,102 490,22 760,48 C970,68 1200,90 1440,52" fill="none" stroke="rgba(226,232,240,0.28)" strokeWidth="2" />
    </svg>
  );
}

function AddUniversityModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}) {
  const [form, setForm] = React.useState({
    name: "",
    state: "",
    tuitionUsd: "",
    aidPolicy: "",
    satRangeMin: "",
    satRangeMax: "",
    englishReq: "",
    applicationDeadline: "",
    description: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const parseOptionalInteger = (raw: string) => {
    const normalized = raw.trim().replace(/,/g, "");
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return Number.NaN;
    return Math.trunc(parsed);
  };

  const inputClass =
    "admin-input rounded-xl px-3.5 py-2.5 text-sm transition-colors";

  const inp =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.state.trim()) {
      setErr("Name va state majburiy");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const tuitionUsd = parseOptionalInteger(form.tuitionUsd);
      const satRangeMin = parseOptionalInteger(form.satRangeMin);
      const satRangeMax = parseOptionalInteger(form.satRangeMax);

      if ([tuitionUsd, satRangeMin, satRangeMax].some((value) => Number.isNaN(value))) {
        setErr("Raqamli maydonlarga faqat to'g'ri son kiriting");
        return;
      }

      if (
        typeof satRangeMin === "number" &&
        typeof satRangeMax === "number" &&
        satRangeMin > satRangeMax
      ) {
        setErr("SAT minimum SAT maximumdan katta bo'lishi mumkin emas");
        return;
      }

      await adminAddUniversity({
        name: form.name.trim(),
        state: form.state.trim(),
        tuitionUsd,
        aidPolicy: form.aidPolicy || undefined,
        satRangeMin,
        satRangeMax,
        englishReq: form.englishReq || undefined,
        applicationDeadline: form.applicationDeadline || undefined,
        description: form.description || undefined,
      });
      await onAdded();
      onClose();
    } catch (error: any) {
      const fieldErrors =
        error?.details && typeof error.details === "object"
          ? Object.values(error.details as Record<string, unknown>)
              .flat()
              .map((item) => String(item))
              .filter(Boolean)
          : [];
      setErr(fieldErrors[0] || error?.message || "Universitet qo'shilmadi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="admin-glass w-full max-w-3xl rounded-3xl p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">University</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Add New University</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
          >
            Close
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="University name *" value={form.name} onChange={inp("name")} autoFocus />
            <input className={inputClass} placeholder="State (e.g. CA) *" value={form.state} onChange={inp("state")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="number" min={1} className={inputClass} placeholder="Tuition USD" value={form.tuitionUsd} onChange={inp("tuitionUsd")} />
            <input className={inputClass} placeholder="Aid policy" value={form.aidPolicy} onChange={inp("aidPolicy")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="number" min={200} max={1600} className={inputClass} placeholder="SAT min" value={form.satRangeMin} onChange={inp("satRangeMin")} />
            <input type="number" min={200} max={1600} className={inputClass} placeholder="SAT max" value={form.satRangeMax} onChange={inp("satRangeMax")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="English requirement" value={form.englishReq} onChange={inp("englishReq")} />
            <input className={inputClass} placeholder="Application deadline" value={form.applicationDeadline} onChange={inp("applicationDeadline")} />
          </div>

          <textarea
            className={`${inputClass} min-h-[100px] w-full`}
            placeholder="Description"
            value={form.description}
            onChange={inp("description")}
          />

          {err && <p className="rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-400/25 via-indigo-400/25 to-fuchsia-300/25 px-4 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add University"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();

  const [tab, setTab] = React.useState<Tab>("overview");
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [universities, setUniversities] = React.useState<AdminUniversity[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AdminAuditLog[]>([]);
  const [events, setEvents] = React.useState<AdminEvent[]>([]);
  const [errors, setErrors] = React.useState<AdminErrorItem[]>([]);
  const [insight, setInsight] = React.useState<AdminAiInsight | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [showAddUni, setShowAddUni] = React.useState(false);

  async function handleAdminLogout() {
    await adminLogout().catch(() => {});
    navigate("/admin/login");
  }

  const loadOverview = React.useCallback(async () => {
    const [s, ai, ev, er] = await Promise.all([
      adminGetStats(),
      adminGetAiInsights(),
      adminGetEvents(40),
      adminGetErrors(20),
    ]);
    setStats(s);
    setInsight(ai);
    setEvents(Array.isArray(ev) ? ev : []);
    setErrors(Array.isArray(er) ? er : []);
  }, []);

  const loadUsers = React.useCallback(async () => {
    const u = await adminGetUsers({ limit: 300 });
    setUsers(Array.isArray(u) ? u : []);
  }, []);

  const loadUniversities = React.useCallback(async () => {
    const list = await adminGetUniversities();
    setUniversities(Array.isArray(list) ? list : []);
  }, []);

  const loadObservability = React.useCallback(async () => {
    const [logs, ev, er] = await Promise.all([
      adminGetAuditLogs(300),
      adminGetEvents(300),
      adminGetErrors(150),
    ]);
    setAuditLogs(Array.isArray(logs) ? logs : []);
    setEvents(Array.isArray(ev) ? ev : []);
    setErrors(Array.isArray(er) ? er : []);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "overview") {
        await loadOverview();
      } else if (tab === "users") {
        await loadUsers();
      } else if (tab === "universities") {
        await loadUniversities();
      } else {
        await loadObservability();
      }
    } finally {
      setLoading(false);
    }
  }, [tab, loadOverview, loadUsers, loadUniversities, loadObservability]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (tab !== "overview") return;
    const timer = window.setInterval(() => {
      loadOverview().catch(() => {});
    }, 90_000);
    return () => window.clearInterval(timer);
  }, [tab, loadOverview]);

  async function deleteUser(id: string) {
    if (!window.confirm("Delete this user permanently?")) return;
    await adminDeleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function toggleAdmin(id: string) {
    const updated = await adminToggleAdmin(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isAdmin: updated.isAdmin } : u)));
  }

  async function deleteUniversity(id: string) {
    if (!window.confirm("Delete this university?")) return;
    await adminDeleteUniversity(id);
    setUniversities((prev) => prev.filter((u) => u.id !== id));
  }

  const userList = Array.isArray(users) ? users : [];
  const uniList = Array.isArray(universities) ? universities : [];

  const filteredUsers = userList.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const filteredUniversities = uniList.filter((u) => {
    if (!search) return true;
    return u.name.toLowerCase().includes(search.toLowerCase());
  });

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: "overview", label: "Overview", icon: <Sparkles className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "universities", label: "Universities", icon: <GraduationCap className="h-4 w-4" /> },
    { key: "observability", label: "Observability", icon: <Eye className="h-4 w-4" /> },
  ];

  const actionBtn =
    "rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-200/10";

  return (
    <div className="admin-cosmos min-h-screen text-slate-100">
      {showAddUni && <AddUniversityModal onClose={() => setShowAddUni(false)} onAdded={loadUniversities} />}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-white/20 bg-gradient-to-br from-cyan-300/30 via-indigo-300/30 to-fuchsia-300/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-slate-100" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-100">Sypev Admin</p>
              <p className="text-xs text-slate-300/75">Control Center</p>
            </div>
            <span className="hidden rounded-full border border-rose-300/35 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-rose-200 sm:inline-flex">
              RESTRICTED
            </span>
          </div>

          <button onClick={handleAdminLogout} className={actionBtn}>
            <span className="inline-flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </span>
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-300/70">Mission Control</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
            <span className="admin-glow-text">Elegant</span> admin workflows for users, universities, and live signals.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-300/80 sm:text-base">
            Premium observability layout with quick decision surfaces, real-time cards, and cleaner operation actions.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="admin-glass rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300/75">Users</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats?.users ?? 0}</p>
            </div>
            <div className="admin-glass rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300/75">Universities</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats?.universities ?? 0}</p>
            </div>
            <div className="admin-glass rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300/75">Recent Errors</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats?.recentErrors ?? 0}</p>
            </div>
          </div>
        </div>
        <AuroraWave />
      </section>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="admin-glass rounded-2xl p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTab(item.key);
                  setSearch("");
                }}
                data-active={tab === item.key}
                className="admin-chip inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="admin-glass rounded-2xl p-3">
            <p className="inline-flex items-center gap-2 text-sm text-slate-200">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading latest admin data...
            </p>
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard label="Total Users" value={stats?.users ?? 0} icon={<Users className="h-5 w-5" />} accent="cyan" />
              <StatCard label="Universities" value={stats?.universities ?? 0} icon={<Building2 className="h-5 w-5" />} accent="indigo" />
              <StatCard label="Recent Errors" value={stats?.recentErrors ?? 0} icon={<AlertOctagon className="h-5 w-5" />} accent="rose" />
            </div>

            <div className="admin-glass rounded-3xl p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-100">
                  <Sparkles className="h-5 w-5 text-indigo-200" /> AI Product Insight
                </h2>
                <button onClick={() => loadOverview().catch(() => {})} className={actionBtn}>
                  <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Refresh</span>
                </button>
              </div>
              <p className="mb-3 text-xs text-slate-300/75">
                Generated: {fmtDateTime(insight?.generatedAt)} | Mode: {insight?.mode || "N/A"}
              </p>
              <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-100">
                {insight?.summary || "No insight yet."}
              </pre>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="admin-glass rounded-3xl p-5">
                <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-white">
                  <Activity className="h-4 w-4 text-cyan-200" /> Latest Events
                </h3>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {events.slice(0, 12).map((event) => (
                    <div key={event.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-100">{event.type}</span>
                        <span className="text-xs text-slate-300/70">{fmtDateTime(event.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300/75">Level: {event.level} | User: {event.userId || "system"}</p>
                    </div>
                  ))}
                  {events.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No events</p>}
                </div>
              </div>

              <div className="admin-glass rounded-3xl p-5">
                <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-white">
                  <AlertOctagon className="h-4 w-4 text-rose-200" /> Latest Errors & Fix Hints
                </h3>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {errors.slice(0, 12).map((error) => (
                    <div key={error.id} className="rounded-xl border border-rose-300/25 bg-rose-500/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-rose-100">{error.code}</span>
                        <span className="text-xs text-rose-100/70">{fmtDateTime(error.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-rose-100">{error.message}</p>
                      <p className="mt-2 text-xs text-rose-100/90">Fix: {error.fixHint}</p>
                    </div>
                  ))}
                  {errors.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No errors</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="admin-glass rounded-3xl p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
                <CircleUserRound className="h-5 w-5 text-cyan-200" /> Users ({filteredUsers.length})
              </h2>
              <label className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user or email..."
                  className="admin-input w-full rounded-xl py-2 pl-9 pr-3 text-sm"
                />
              </label>
            </div>

            <div className="overflow-auto rounded-2xl border border-white/10">
              <table className="admin-table w-full min-w-[860px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-left">Email</th>
                    <th className="text-left">Providers</th>
                    <th className="text-left">Role</th>
                    <th className="text-left">Joined</th>
                    <th className="text-left">Last Sign-In</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td className="text-slate-300">{u.email || "-"}</td>
                      <td className="text-slate-300">{(u.providers || []).join(", ") || "-"}</td>
                      <td>{u.isAdmin ? "Admin" : "User"}</td>
                      <td className="text-slate-300">{fmtDate(u.createdAt)}</td>
                      <td className="text-slate-300">{fmtDateTime(u.lastSignInAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => toggleAdmin(u.id)} className={actionBtn}>
                            {u.isAdmin ? "Revoke Admin" : "Make Admin"}
                          </button>
                          {!u.isAdmin && (
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No users</p>}
          </div>
        )}

        {tab === "universities" && (
          <div className="admin-glass rounded-3xl p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-white">
                <GraduationCap className="h-5 w-5 text-indigo-200" /> Universities ({filteredUniversities.length})
              </h2>

              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <label className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search university..."
                    className="admin-input w-full rounded-xl py-2 pl-9 pr-3 text-sm"
                  />
                </label>
                <button
                  onClick={() => setShowAddUni(true)}
                  className="rounded-xl border border-indigo-300/40 bg-gradient-to-r from-cyan-400/20 via-indigo-400/20 to-fuchsia-300/20 px-3 py-2 text-sm font-semibold text-slate-100"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add University
                  </span>
                </button>
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-white/10">
              <table className="admin-table w-full min-w-[860px] text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-left">State</th>
                    <th className="text-left">Tuition</th>
                    <th className="text-left">SAT</th>
                    <th className="text-left">Aid</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUniversities.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td className="text-slate-300">{u.state}</td>
                      <td className="text-slate-300">{u.tuitionUsd ? `$${u.tuitionUsd.toLocaleString()}` : "-"}</td>
                      <td className="text-slate-300">{u.satRangeMin && u.satRangeMax ? `${u.satRangeMin}-${u.satRangeMax}` : "-"}</td>
                      <td className="text-slate-300">{u.aidPolicy || "-"}</td>
                      <td>
                        <button
                          onClick={() => deleteUniversity(u.id)}
                          className="rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUniversities.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No universities</p>}
          </div>
        )}

        {tab === "observability" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => loadObservability().catch(() => {})} className={actionBtn}>
                <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Refresh Logs</span>
              </button>
            </div>

            <div className="admin-glass rounded-3xl p-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-white">
                <AlertOctagon className="h-4 w-4 text-rose-200" /> Errors ({errors.length})
              </h3>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {errors.map((error) => (
                  <div key={error.id} className="rounded-xl border border-rose-300/25 bg-rose-500/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-rose-100">{error.code}</span>
                      <span className="text-xs text-rose-100/70">{fmtDateTime(error.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-rose-100">{error.message}</p>
                    <p className="mt-2 text-xs text-rose-100/80">Fix: {error.fixHint}</p>
                  </div>
                ))}
                {errors.length === 0 && <p className="text-sm text-slate-400">No errors</p>}
              </div>
            </div>

            <div className="admin-glass rounded-3xl p-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-white">
                <Activity className="h-4 w-4 text-cyan-200" /> Events ({events.length})
              </h3>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-100">{event.type}</span>
                      <span className="text-xs text-slate-300/70">{fmtDateTime(event.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300/75">Level: {event.level} | User: {event.userId || "system"}</p>
                    <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-slate-300/80">{safeJson(event.details)}</pre>
                  </div>
                ))}
                {events.length === 0 && <p className="text-sm text-slate-400">No events</p>}
              </div>
            </div>

            <div className="admin-glass rounded-3xl p-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-white">
                <Eye className="h-4 w-4 text-indigo-200" /> Audit Logs ({auditLogs.length})
              </h3>
              <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-100">{log.action}</span>
                      <span className="text-xs text-slate-300/70">{fmtDateTime(log.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300/75">
                      Level: {log.level} | User: {log.userId || "system"} | IP: {log.ip || "-"}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-slate-300/80">{safeJson(log.metadata)}</pre>
                  </div>
                ))}
                {auditLogs.length === 0 && <p className="text-sm text-slate-400">No logs</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
