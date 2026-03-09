import React from "react";
import { useNavigate } from "react-router-dom";
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
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(ts?: number | null) {
  if (!ts) return "—";
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

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border p-5 flex items-center gap-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      </div>
    </div>
  );
}

function AddUniversityModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
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

  const inp =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.state.trim()) {
      setErr("Name and state are required");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      await adminAddUniversity({
        name: form.name.trim(),
        state: form.state.trim(),
        tuitionUsd: form.tuitionUsd ? Number(form.tuitionUsd) : undefined,
        aidPolicy: form.aidPolicy || undefined,
        satRangeMin: form.satRangeMin ? Number(form.satRangeMin) : undefined,
        satRangeMax: form.satRangeMax ? Number(form.satRangeMax) : undefined,
        englishReq: form.englishReq || undefined,
        applicationDeadline: form.applicationDeadline || undefined,
        description: form.description || undefined,
      });
      onAdded();
      onClose();
    } catch (error: any) {
      setErr(error?.message || "Failed to add university");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f1117] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Add University</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="Name *" value={form.name} onChange={inp("name")} />
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="State *" value={form.state} onChange={inp("state")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="Tuition USD" value={form.tuitionUsd} onChange={inp("tuitionUsd")} />
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="Aid Policy" value={form.aidPolicy} onChange={inp("aidPolicy")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="SAT Min" value={form.satRangeMin} onChange={inp("satRangeMin")} />
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="SAT Max" value={form.satRangeMax} onChange={inp("satRangeMax")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="English Requirement" value={form.englishReq} onChange={inp("englishReq")} />
            <input className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" placeholder="Application Deadline" value={form.applicationDeadline} onChange={inp("applicationDeadline")} />
          </div>
          <textarea className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white min-h-[90px]" placeholder="Description" value={form.description} onChange={inp("description")} />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/15 bg-white/5 py-2 text-sm text-white/80">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Adding..." : "Add University"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

type Tab = "overview" | "users" | "universities" | "observability";

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

  const tabButton = (value: Tab, title: string) => (
    <button
      key={value}
      onClick={() => {
        setTab(value);
        setSearch("");
      }}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
        tab === value ? "bg-indigo-500 text-white" : "bg-transparent text-white/60"
      }`}
    >
      {title}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0c14] via-[#0d1120] to-[#0a0c14] text-white">
      {showAddUni && <AddUniversityModal onClose={() => setShowAddUni(false)} onAdded={loadUniversities} />}

      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0c14]/85 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center text-sm font-bold">⚡</div>
          <p className="text-lg font-semibold">Sypev Admin</p>
          <span className="rounded-full bg-red-500/15 text-red-300 px-2 py-0.5 text-xs font-semibold">RESTRICTED</span>
        </div>
        <button onClick={handleAdminLogout} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300">
          Sign Out
        </button>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 w-fit">
          {tabButton("overview", "Overview")}
          {tabButton("users", "Users")}
          {tabButton("universities", "Universities")}
          {tabButton("observability", "Observability")}
        </div>

        {loading && <p className="text-sm text-white/60 mb-4">Loading...</p>}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Total Users" value={stats?.users ?? 0} icon="👥" color="#6366f1" />
              <StatCard label="Universities" value={stats?.universities ?? 0} icon="🎓" color="#8b5cf6" />
              <StatCard label="Recent Errors" value={stats?.recentErrors ?? 0} icon="🚨" color="#ef4444" />
            </div>

            <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">AI Product Insight</h2>
                <button
                  onClick={() => loadOverview().catch(() => {})}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs"
                >
                  Refresh
                </button>
              </div>
              <p className="text-xs text-white/60 mb-2">
                Generated: {fmtDateTime(insight?.generatedAt)} | Mode: {insight?.mode || "N/A"}
              </p>
              <pre className="whitespace-pre-wrap text-sm leading-6 text-white/90 bg-black/20 rounded-xl p-4 border border-white/10">
                {insight?.summary || "No insight yet."}
              </pre>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold mb-3">Latest Events</h3>
                <div className="space-y-2 max-h-[360px] overflow-auto">
                  {events.slice(0, 12).map((event) => (
                    <div key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{event.type}</span>
                        <span className="text-xs text-white/50">{fmtDateTime(event.createdAt)}</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">Level: {event.level} | User: {event.userId || "system"}</p>
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-sm text-white/50">No events</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold mb-3">Latest Errors & Fix Hints</h3>
                <div className="space-y-2 max-h-[360px] overflow-auto">
                  {errors.slice(0, 12).map((error) => (
                    <div key={error.id} className="rounded-lg border border-red-300/20 bg-red-500/10 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-red-200">{error.code}</span>
                        <span className="text-xs text-red-200/70">{fmtDateTime(error.createdAt)}</span>
                      </div>
                      <p className="text-sm text-red-100 mt-1">{error.message}</p>
                      <p className="text-xs text-red-100/80 mt-2">Fix: {error.fixHint}</p>
                    </div>
                  ))}
                  {errors.length === 0 && <p className="text-sm text-white/50">No errors</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Users ({filteredUsers.length})</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user/email..."
                className="rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm w-72"
              />
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/60 border-b border-white/10">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Providers</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Joined</th>
                    <th className="text-left py-2">Last Sign-In</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 text-white/70">{u.email || "—"}</td>
                      <td className="py-2 text-white/70">{(u.providers || []).join(", ") || "—"}</td>
                      <td className="py-2">{u.isAdmin ? "Admin" : "User"}</td>
                      <td className="py-2 text-white/70">{fmtDate(u.createdAt)}</td>
                      <td className="py-2 text-white/70">{fmtDateTime(u.lastSignInAt)}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => toggleAdmin(u.id)} className="rounded-md px-2 py-1 text-xs bg-indigo-500/20 border border-indigo-300/30">
                            {u.isAdmin ? "Revoke Admin" : "Make Admin"}
                          </button>
                          {!u.isAdmin && (
                            <button onClick={() => deleteUser(u.id)} className="rounded-md px-2 py-1 text-xs bg-red-500/20 border border-red-300/30">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="text-sm text-white/50 py-8 text-center">No users</p>}
            </div>
          </div>
        )}

        {tab === "universities" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Universities ({filteredUniversities.length})</h2>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search university..."
                  className="rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm w-72"
                />
                <button onClick={() => setShowAddUni(true)} className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold">
                  Add University
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/60 border-b border-white/10">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">State</th>
                    <th className="text-left py-2">Tuition</th>
                    <th className="text-left py-2">SAT</th>
                    <th className="text-left py-2">Aid</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUniversities.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 text-white/70">{u.state}</td>
                      <td className="py-2 text-white/70">{u.tuitionUsd ? `$${u.tuitionUsd.toLocaleString()}` : "—"}</td>
                      <td className="py-2 text-white/70">{u.satRangeMin && u.satRangeMax ? `${u.satRangeMin}–${u.satRangeMax}` : "—"}</td>
                      <td className="py-2 text-white/70">{u.aidPolicy || "—"}</td>
                      <td className="py-2">
                        <button onClick={() => deleteUniversity(u.id)} className="rounded-md px-2 py-1 text-xs bg-red-500/20 border border-red-300/30">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUniversities.length === 0 && <p className="text-sm text-white/50 py-8 text-center">No universities</p>}
            </div>
          </div>
        )}

        {tab === "observability" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => loadObservability().catch(() => {})} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm">
                Refresh Logs
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold mb-3">Errors ({errors.length})</h3>
              <div className="space-y-2 max-h-[320px] overflow-auto">
                {errors.map((error) => (
                  <div key={error.id} className="rounded-lg border border-red-300/20 bg-red-500/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-200">{error.code}</span>
                      <span className="text-xs text-red-200/70">{fmtDateTime(error.createdAt)}</span>
                    </div>
                    <p className="text-sm text-red-100 mt-1">{error.message}</p>
                    <p className="text-xs text-red-100/80 mt-2">Fix: {error.fixHint}</p>
                  </div>
                ))}
                {errors.length === 0 && <p className="text-sm text-white/50">No errors</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold mb-3">Events ({events.length})</h3>
              <div className="space-y-2 max-h-[320px] overflow-auto">
                {events.map((event) => (
                  <div key={event.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{event.type}</span>
                      <span className="text-xs text-white/60">{fmtDateTime(event.createdAt)}</span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">Level: {event.level} | User: {event.userId || "system"}</p>
                    <pre className="text-xs text-white/70 mt-2 whitespace-pre-wrap break-all">{safeJson(event.details)}</pre>
                  </div>
                ))}
                {events.length === 0 && <p className="text-sm text-white/50">No events</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold mb-3">Audit Logs ({auditLogs.length})</h3>
              <div className="space-y-2 max-h-[340px] overflow-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{log.action}</span>
                      <span className="text-xs text-white/60">{fmtDateTime(log.createdAt)}</span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      Level: {log.level} | User: {log.userId || "system"} | IP: {log.ip || "—"}
                    </p>
                    <pre className="text-xs text-white/70 mt-2 whitespace-pre-wrap break-all">{safeJson(log.metadata)}</pre>
                  </div>
                ))}
                {auditLogs.length === 0 && <p className="text-sm text-white/50">No logs</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
