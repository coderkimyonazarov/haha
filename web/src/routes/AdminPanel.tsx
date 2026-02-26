import React from "react";
import { useNavigate } from "react-router-dom";
import {
  adminGetStats,
  adminGetUsers,
  adminDeleteUser,
  adminToggleAdmin,
  adminGetUniversities,
  adminAddUniversity,
  adminDeleteUniversity,
  adminLogout,
  type AdminStats,
  type AdminUser,
  type AdminUniversity,
} from "../api";

/* ─── tiny helpers ────────────────────────────────────────────────────── */
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ─── stat card ────────────────────────────────────────────────────────── */
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
      className="rounded-2xl border p-6 flex items-center gap-5 transition-all hover:scale-[1.02]"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ background: color + "22", color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-3xl font-bold text-white">{value}</div>
        <div
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* ─── add university modal ──────────────────────────────────────────────── */
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
    } catch (e: any) {
      setErr(e?.message || "Failed to add university");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "white",
    padding: "10px 14px",
    width: "100%",
    fontSize: 14,
    outline: "none",
  };
  const label = (txt: string) => (
    <label
      style={{
        fontSize: 12,
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      {txt}
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl p-8 shadow-2xl"
        style={{
          background: "#0f1117",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6">Add University</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              {label("Name *")}
              <input
                style={fieldStyle}
                value={form.name}
                onChange={inp("name")}
                placeholder="Harvard University"
              />
            </div>
            <div className="flex flex-col gap-1">
              {label("State *")}
              <input
                style={fieldStyle}
                value={form.state}
                onChange={inp("state")}
                placeholder="Massachusetts"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              {label("Tuition (USD)")}
              <input
                style={fieldStyle}
                type="number"
                value={form.tuitionUsd}
                onChange={inp("tuitionUsd")}
                placeholder="55000"
              />
            </div>
            <div className="flex flex-col gap-1">
              {label("Aid Policy")}
              <input
                style={fieldStyle}
                value={form.aidPolicy}
                onChange={inp("aidPolicy")}
                placeholder="Need-blind"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              {label("SAT Min")}
              <input
                style={fieldStyle}
                type="number"
                value={form.satRangeMin}
                onChange={inp("satRangeMin")}
                placeholder="1400"
              />
            </div>
            <div className="flex flex-col gap-1">
              {label("SAT Max")}
              <input
                style={fieldStyle}
                type="number"
                value={form.satRangeMax}
                onChange={inp("satRangeMax")}
                placeholder="1570"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              {label("English Req")}
              <input
                style={fieldStyle}
                value={form.englishReq}
                onChange={inp("englishReq")}
                placeholder="IELTS 7.0"
              />
            </div>
            <div className="flex flex-col gap-1">
              {label("App Deadline")}
              <input
                style={fieldStyle}
                value={form.applicationDeadline}
                onChange={inp("applicationDeadline")}
                placeholder="Jan 1, 2026"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {label("Description")}
            <textarea
              style={{ ...fieldStyle, resize: "none", height: 80 }}
              value={form.description}
              onChange={inp("description")}
              placeholder="Brief description…"
            />
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "white",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Adding…" : "Add University"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── main admin panel ──────────────────────────────────────────────────── */
type Tab = "overview" | "users" | "universities";

export default function AdminPanel() {
  const navigate = useNavigate();

  const [tab, setTab] = React.useState<Tab>("overview");
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [unis, setUnis] = React.useState<AdminUniversity[]>([]);
  const [search, setSearch] = React.useState("");
  const [loadingData, setLoadingData] = React.useState(false);
  const [showAddUni, setShowAddUni] = React.useState(false);

  async function handleAdminLogout() {
    await adminLogout().catch(() => {});
    navigate("/admin/login");
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    load();
  }, [tab]);

  async function load() {
    setLoadingData(true);
    try {
      if (tab === "overview") {
        const s = await adminGetStats();
        setStats(s);
      } else if (tab === "users") {
        const u = await adminGetUsers({ limit: 100 });
        setUsers(u);
      } else if (tab === "universities") {
        const list = await adminGetUniversities();
        setUnis(list);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingData(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user permanently?")) return;
    await adminDeleteUser(id);
    setUsers((u) => u.filter((x) => x.id !== id));
  }

  async function toggleAdmin(id: string) {
    const updated = await adminToggleAdmin(id);
    setUsers((u) =>
      u.map((x) => (x.id === id ? { ...x, isAdmin: updated.isAdmin } : x)),
    );
  }

  async function deleteUni(id: string) {
    if (!confirm("Delete this university?")) return;
    await adminDeleteUniversity(id);
    setUnis((u) => u.filter((x) => x.id !== id));
  }

  const filteredUsers = users.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())),
  );
  const filteredUnis = unis.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase()),
  );

  const panelBg: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0a0c14 0%,#0d1120 50%,#0a0c14 100%)",
    fontFamily: "'Space Grotesk', sans-serif",
  };

  const tabBtn = (t: Tab, label: string, icon: string) => (
    <button
      onClick={() => {
        setTab(t);
        setSearch("");
      }}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={
        tab === t
          ? {
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "white",
            }
          : { color: "rgba(255,255,255,0.5)", background: "transparent" }
      }
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  const thStyle: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  };
  const badgeStyle = (isAdmin: number): React.CSSProperties => ({
    padding: "3px 10px",
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 600,
    background: isAdmin ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)",
    color: isAdmin ? "#a5b4fc" : "rgba(255,255,255,0.4)",
  });

  return (
    <div style={panelBg}>
      {showAddUni && (
        <AddUniversityModal
          onClose={() => setShowAddUni(false)}
          onAdded={load}
        />
      )}

      {/* Top bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-8 py-4"
        style={{
          background: "rgba(10,12,20,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "white",
            }}
          >
            ⚡
          </div>
          <span className="text-white font-bold text-lg">Sypev Admin</span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
          >
            RESTRICTED
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <span>👤</span>
            <span>Admin</span>
          </div>
          <button
            onClick={handleAdminLogout}
            className="rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Tab navigation */}
        <div
          className="flex gap-1 rounded-2xl p-1.5 mb-8 w-fit"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {tabBtn("overview", "Overview", "📊")}
          {tabBtn("users", "Users", "👥")}
          {tabBtn("universities", "Universities", "🎓")}
        </div>

        {/* Loading */}
        {loadingData && (
          <div
            className="flex items-center gap-2 mb-6"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <div
              className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#6366f1", borderTopColor: "transparent" }}
            />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {/* ── Overview ── */}
        {tab === "overview" && stats && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">
              Dashboard Overview
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <StatCard
                label="Total Users"
                value={stats.users}
                icon="👥"
                color="#6366f1"
              />
              <StatCard
                label="Universities"
                value={stats.universities}
                icon="🎓"
                color="#8b5cf6"
              />
              <StatCard
                label="Active Sessions"
                value={stats.activeSessions}
                icon="🔐"
                color="#06b6d4"
              />
            </div>

            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <h2 className="text-lg font-semibold text-white mb-2">
                🔑 Security Notice
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                This admin panel is protected by server-side{" "}
                <code
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  requireAdmin
                </code>{" "}
                middleware. All API requests without a valid admin session
                return <strong style={{ color: "#f87171" }}>HTTP 403</strong>.
                Users cannot gain admin access without running the{" "}
                <code
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  setAdmin.ts
                </code>{" "}
                CLI script on the server.
              </p>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">
                Users{" "}
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>
                  ({filteredUsers.length})
                </span>
              </h1>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="rounded-xl px-4 py-2.5 text-sm w-64"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  outline: "none",
                }}
              />
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <table className="w-full">
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Joined</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td style={tdStyle}>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              background: "rgba(99,102,241,0.2)",
                              color: "#a5b4fc",
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td
                        style={{ ...tdStyle, color: "rgba(255,255,255,0.5)" }}
                      >
                        {u.email || "—"}
                      </td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(u.isAdmin)}>
                          {u.isAdmin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td
                        style={{ ...tdStyle, color: "rgba(255,255,255,0.4)" }}
                      >
                        {fmtDate(u.createdAt)}
                      </td>
                      <td style={tdStyle}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleAdmin(u.id)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                            style={{
                              background: "rgba(99,102,241,0.15)",
                              color: "#a5b4fc",
                              border: "1px solid rgba(99,102,241,0.3)",
                            }}
                          >
                            {u.isAdmin ? "Revoke Admin" : "Make Admin"}
                          </button>
                          {user.id !== u.id && (
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                              style={{
                                background: "rgba(239,68,68,0.12)",
                                color: "#f87171",
                                border: "1px solid rgba(239,68,68,0.25)",
                              }}
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
              {filteredUsers.length === 0 && !loadingData && (
                <div
                  className="py-12 text-center"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  No users found
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Universities ── */}
        {tab === "universities" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">
                Universities{" "}
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>
                  ({filteredUnis.length})
                </span>
              </h1>
              <div className="flex items-center gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="rounded-xl px-4 py-2.5 text-sm w-52"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => setShowAddUni(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "white",
                  }}
                >
                  ＋ Add University
                </button>
              </div>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <table className="w-full">
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>State</th>
                    <th style={thStyle}>Tuition</th>
                    <th style={thStyle}>SAT Range</th>
                    <th style={thStyle}>Aid</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnis.map((u) => (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td
                        style={{ ...tdStyle, fontWeight: 500, color: "white" }}
                      >
                        {u.name}
                      </td>
                      <td
                        style={{ ...tdStyle, color: "rgba(255,255,255,0.5)" }}
                      >
                        {u.state}
                      </td>
                      <td
                        style={{ ...tdStyle, color: "rgba(255,255,255,0.6)" }}
                      >
                        {u.tuitionUsd
                          ? `$${u.tuitionUsd.toLocaleString()}`
                          : "—"}
                      </td>
                      <td
                        style={{ ...tdStyle, color: "rgba(255,255,255,0.5)" }}
                      >
                        {u.satRangeMin && u.satRangeMax
                          ? `${u.satRangeMin}–${u.satRangeMax}`
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        {u.aidPolicy ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              background: "rgba(6,182,212,0.15)",
                              color: "#67e8f9",
                            }}
                          >
                            {u.aidPolicy}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => deleteUni(u.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                          style={{
                            background: "rgba(239,68,68,0.12)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.25)",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUnis.length === 0 && !loadingData && (
                <div
                  className="py-12 text-center"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  No universities found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
