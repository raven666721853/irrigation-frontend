// ============================================================
// FILE: frontend/src/components/Admin.jsx  (NEW FILE)
//
// Add to your App.js routes:
//   import Admin from "./components/Admin";
//   <Route path="/admin" element={<Admin />} />
//
// Add a link in Dashboard header or sidebar:
//   <a href="/admin">⚙️ Admin</a>
// ============================================================

import { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab]         = useState("stats");
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // Password reset modal
  const [resetModal, setResetModal]   = useState(null); // userId
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg]       = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const r = await API.get("/admin/stats");
      setStats(r.data);
    } catch { setError("Failed to load stats"); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const r = await API.get("/admin/users");
      setUsers(r.data);
    } catch { setError("Failed to load users"); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await API.get("/admin/logs");
      setLogs(r.data);
    } catch { setError("Failed to load logs"); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(), fetchLogs()])
      .finally(() => setLoading(false));
  }, [fetchStats, fetchUsers, fetchLogs]);

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers((u) => u.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.response?.data?.error || "Delete failed");
    }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetMsg("Password must be at least 6 characters");
      return;
    }
    try {
      await API.put(`/admin/users/${resetModal}/password`, { newPassword });
      setResetMsg("✅ Password updated successfully");
      setTimeout(() => { setResetModal(null); setNewPassword(""); setResetMsg(""); }, 1500);
    } catch (e) {
      setResetMsg(e.response?.data?.error || "Failed to reset password");
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const statusColor = (s) => {
    if (!s) return "#888";
    if (s.includes("ON"))  return "#22c55e";
    if (s.includes("OFF")) return "#6b7280";
    return "#888";
  };

  const statusBg = (s) => {
    if (!s) return "#1f2937";
    if (s === "SMART ON")  return "#14532d";
    if (s === "SMART OFF") return "#1f2937";
    if (s === "MANUAL ON") return "#1e3a5f";
    if (s === "MANUAL OFF")return "#2d1b4e";
    return "#1f2937";
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>⚙️</span>
          <div>
            <div style={styles.headerTitle}>Admin Panel</div>
            <div style={styles.headerSub}>SmartIrrig System Management</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userBadge}>👤 {user.name || user.email}</span>
          <button style={styles.backBtn} onClick={() => navigate("/")}>
            ← Dashboard
          </button>
          <button style={styles.logoutBtn} onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}>
            Logout
          </button>
        </div>
      </div>

      {loading && <div style={styles.loadingBar} />}
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {["stats", "users", "logs"].map((t) => (
          <button
            key={t}
            style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === "stats" && "📊 "}{t === "users" && "👥 "}{t === "logs" && "📋 "}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>

        {/* ── STATS TAB ── */}
        {tab === "stats" && stats && (
          <div>
            <div style={styles.statGrid}>
              {[
                { label: "Total Users",        value: stats.totalUsers?.count,        icon: "👥", color: "#3b82f6" },
                { label: "Total Farms",        value: stats.totalFarms?.count,        icon: "🌾", color: "#22c55e" },
                { label: "Total Zones",        value: stats.totalZones?.count,        icon: "📍", color: "#f59e0b" },
                { label: "Total Irrigations",  value: stats.totalIrrigations?.count,  icon: "💧", color: "#06b6d4" },
                { label: "SMART Activations",  value: stats.smartOns?.count,          icon: "🤖", color: "#8b5cf6" },
                { label: "Manual Activations", value: stats.manualOns?.count,         icon: "🖐️", color: "#ec4899" },
                { label: "Today's Actions",    value: stats.todayLogs?.count,         icon: "📅", color: "#f97316" },
                { label: "Water Today (L)",    value: parseFloat(stats.waterToday?.total || 0).toFixed(1), icon: "🚿", color: "#14b8a6" },
                { label: "Water This Week (L)",value: parseFloat(stats.waterWeek?.total || 0).toFixed(1), icon: "📦", color: "#84cc16" },
              ].map((s) => (
                <div key={s.label} style={{ ...styles.statCard, borderTop: `3px solid ${s.color}` }}>
                  <div style={styles.statIcon}>{s.icon}</div>
                  <div style={{ ...styles.statValue, color: s.color }}>{s.value ?? "—"}</div>
                  <div style={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={styles.sectionTitle}>Recent Activity</div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Zone", "Farm", "Status", "Reason", "Time"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats.recentLogs || []).map((l, i) => (
                    <tr key={i} style={{ background: statusBg(l.status) }}>
                      <td style={styles.td}>Zone {l.zone}</td>
                      <td style={styles.td}>{l.farm_name || "—"}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, color: statusColor(l.status) }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: 12, color: "#9ca3af" }}>
                        {l.decision_reason || "—"}
                      </td>
                      <td style={{ ...styles.td, fontSize: 12, color: "#6b7280" }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div>
            <div style={styles.sectionTitle}>
              Registered Users
              <span style={styles.countBadge}>{users.length}</span>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["ID", "Name", "Email", "Joined", "Actions"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ background: u.id === user.id ? "#1a2f1a" : "transparent" }}>
                      <td style={styles.td}><span style={styles.idBadge}>#{u.id}</span></td>
                      <td style={styles.td}>
                        {u.name}
                        {u.id === user.id && <span style={styles.youBadge}> YOU</span>}
                      </td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={{ ...styles.td, fontSize: 12, color: "#6b7280" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionBtns}>
                          <button
                            style={styles.resetBtn}
                            onClick={() => { setResetModal(u.id); setResetMsg(""); setNewPassword(""); }}
                          >
                            🔑 Reset PW
                          </button>
                          {u.id !== user.id && (
                            <button
                              style={styles.deleteBtn}
                              onClick={() => deleteUser(u.id, u.name)}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {tab === "logs" && (
          <div>
            <div style={styles.sectionTitle}>
              Irrigation Logs
              <span style={styles.countBadge}>{logs.length}</span>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["#", "Zone", "Farm", "Status", "Score", "Reason", "Time"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} style={{ background: statusBg(l.status) }}>
                      <td style={{ ...styles.td, color: "#4b5563", fontSize: 12 }}>{l.id}</td>
                      <td style={styles.td}>Zone {l.zone}</td>
                      <td style={styles.td}>{l.farm_name || "—"}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, color: statusColor(l.status) }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {l.decision_score != null ? (
                          <span style={{
                            ...styles.scoreBadge,
                            background: l.decision_score > 40 ? "#14532d" : "#1f2937",
                            color: l.decision_score > 40 ? "#4ade80" : "#9ca3af",
                          }}>
                            {l.decision_score}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ ...styles.td, fontSize: 11, color: "#9ca3af", maxWidth: 260 }}>
                        {l.decision_reason || "—"}
                      </td>
                      <td style={{ ...styles.td, fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetModal && (
        <div style={styles.modalOverlay} onClick={() => setResetModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>🔑 Reset Password</div>
            <div style={styles.modalSub}>
              For user #{resetModal}
            </div>
            <input
              style={styles.input}
              type="password"
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && resetPassword()}
            />
            {resetMsg && (
              <div style={{
                ...styles.resetMsg,
                color: resetMsg.startsWith("✅") ? "#4ade80" : "#f87171",
              }}>
                {resetMsg}
              </div>
            )}
            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} onClick={() => setResetModal(null)}>
                Cancel
              </button>
              <button style={styles.confirmBtn} onClick={resetPassword}>
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0f1a",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    background: "#0f172a",
    borderBottom: "1px solid #1e293b",
    flexWrap: "wrap",
    gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  logo:        { fontSize: 28 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: "#f1f5f9" },
  headerSub:   { fontSize: 12, color: "#64748b" },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  userBadge: {
    fontSize: 13, color: "#94a3b8",
    background: "#1e293b", padding: "6px 12px", borderRadius: 6,
  },
  backBtn: {
    padding: "7px 14px", borderRadius: 6, border: "1px solid #334155",
    background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13,
  },
  logoutBtn: {
    padding: "7px 14px", borderRadius: 6, border: "none",
    background: "#7f1d1d", color: "#fca5a5", cursor: "pointer", fontSize: 13,
    fontWeight: 600,
  },
  loadingBar: {
    height: 3, background: "linear-gradient(90deg,#3b82f6,#06b6d4)",
    animation: "none",
  },
  errorBanner: {
    background: "#7f1d1d", color: "#fca5a5", padding: "10px 32px", fontSize: 13,
  },
  tabBar: {
    display: "flex", gap: 4, padding: "16px 32px 0",
    borderBottom: "1px solid #1e293b",
  },
  tabBtn: {
    padding: "8px 20px", border: "none", borderRadius: "6px 6px 0 0",
    background: "transparent", color: "#64748b", cursor: "pointer",
    fontSize: 14, fontWeight: 500,
  },
  tabBtnActive: {
    background: "#1e293b", color: "#f1f5f9",
    borderBottom: "2px solid #3b82f6",
  },
  content: { padding: "24px 32px" },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 16, marginBottom: 32,
  },
  statCard: {
    background: "#0f172a", borderRadius: 10, padding: "18px 16px",
    textAlign: "center",
  },
  statIcon:  { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: 800, lineHeight: 1.1 },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 4 },
  sectionTitle: {
    fontSize: 16, fontWeight: 700, color: "#f1f5f9",
    marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
  },
  countBadge: {
    fontSize: 12, background: "#1e293b", color: "#94a3b8",
    padding: "2px 8px", borderRadius: 10,
  },
  tableWrap: { overflowX: "auto", borderRadius: 8, border: "1px solid #1e293b" },
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "10px 14px", textAlign: "left",
    background: "#0f172a", color: "#64748b",
    borderBottom: "1px solid #1e293b", fontWeight: 600, fontSize: 11,
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  td: {
    padding: "10px 14px", borderBottom: "1px solid #111827",
    verticalAlign: "top",
  },
  badge: { fontWeight: 700, fontSize: 12 },
  scoreBadge: {
    display: "inline-block", padding: "2px 8px", borderRadius: 6,
    fontSize: 12, fontWeight: 700,
  },
  idBadge: {
    background: "#1e293b", color: "#64748b",
    padding: "2px 6px", borderRadius: 4, fontSize: 11,
  },
  youBadge: {
    background: "#14532d", color: "#4ade80",
    padding: "1px 5px", borderRadius: 4, fontSize: 10, marginLeft: 6,
  },
  actionBtns: { display: "flex", gap: 6 },
  resetBtn: {
    padding: "5px 10px", borderRadius: 5, border: "none",
    background: "#1e3a5f", color: "#93c5fd", cursor: "pointer", fontSize: 12,
  },
  deleteBtn: {
    padding: "5px 10px", borderRadius: 5, border: "none",
    background: "#450a0a", color: "#f87171", cursor: "pointer", fontSize: 12,
  },
  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#0f172a", border: "1px solid #1e293b",
    borderRadius: 12, padding: 28, width: 360, maxWidth: "90vw",
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 },
  modalSub:   { fontSize: 13, color: "#64748b", marginBottom: 16 },
  input: {
    width: "100%", padding: "10px 12px", borderRadius: 6,
    border: "1px solid #334155", background: "#1e293b",
    color: "#f1f5f9", fontSize: 14, boxSizing: "border-box",
    outline: "none",
  },
  resetMsg: { fontSize: 13, marginTop: 8 },
  modalBtns: { display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" },
  cancelBtn: {
    padding: "8px 16px", borderRadius: 6, border: "1px solid #334155",
    background: "transparent", color: "#94a3b8", cursor: "pointer",
  },
  confirmBtn: {
    padding: "8px 16px", borderRadius: 6, border: "none",
    background: "#1d4ed8", color: "#fff", cursor: "pointer", fontWeight: 600,
  },
};