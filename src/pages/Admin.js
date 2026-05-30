import { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const TABS = [
  { id: "overview",  icon: "▣",  label: "Overview"     },
  { id: "users",     icon: "◈",  label: "Users"        },
  { id: "farms",     icon: "◉",  label: "Farms & Zones"},
  { id: "devices",   icon: "◎",  label: "ESP32 Devices"},
  { id: "logs",      icon: "≡",  label: "Logs"         },
  { id: "alerts",    icon: "⚠",  label: "Alerts"       },
];

export default function Admin() {
  const navigate  = useNavigate();
  const [tab, setTab]         = useState("overview");
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [farms, setFarms]     = useState([]);
  const [zones, setZones]     = useState([]);
  const [logs,  setLogs]      = useState([]);
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  // Modals
  const [resetModal,   setResetModal]   = useState(null);
  const [newPassword,  setNewPassword]  = useState("");
  const [resetMsg,     setResetMsg]     = useState("");
  const [userModal,    setUserModal]    = useState(null); // view user farms/zones
  const [deleteConfirm,setDeleteConfirm]= useState(null);

  const me = JSON.parse(localStorage.getItem("user") || "{}");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sR, uR, zR, lR, aR, fR] = await Promise.allSettled([
        API.get("/admin/stats"),
        API.get("/admin/users"),
        API.get("/zones"),
        API.get("/admin/logs"),
        API.get("/alerts"),
        API.get("/farms"),
      ]);
      if (sR.status === "fulfilled") setStats(sR.value.data);
      if (uR.status === "fulfilled") setUsers(uR.value.data);
      if (zR.status === "fulfilled") setZones(zR.value.data);
      if (lR.status === "fulfilled") setLogs(lR.value.data);
      if (aR.status === "fulfilled") setAlerts(aR.value.data);
      if (fR.status === "fulfilled") setFarms(fR.value.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Actions ─────────────────────────────────────────────────
  const deleteUser = async (id, name) => {
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers(u => u.filter(x => x.id !== id));
      setDeleteConfirm(null);
      showToast(`User "${name}" deleted`);
    } catch (e) { showToast(e.response?.data?.error || "Delete failed", "error"); }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetMsg("Min 6 characters"); return;
    }
    try {
      await API.put(`/admin/users/${resetModal.id}/password`, { newPassword });
      setResetMsg("✓ Updated");
      setTimeout(() => { setResetModal(null); setNewPassword(""); setResetMsg(""); }, 1200);
      showToast("Password updated");
    } catch (e) { setResetMsg(e.response?.data?.error || "Failed"); }
  };

  const deleteFarm = async (id, name) => {
    try {
      await API.delete(`/farms/${id}`);
      setFarms(f => f.filter(x => x.id !== id));
      showToast(`Farm "${name}" deleted`);
    } catch (e) { showToast("Delete failed", "error"); }
  };

  const forceSensor = async (zone, val) => {
    try {
      await API.post(`/sensor`, { zone, moisture: val, temperature: 25 });
      showToast(`Zone ${zone} moisture forced to ${val}%`);
      load();
    } catch (e) { showToast("Failed to update sensor", "error"); }
  };

  // ── Derived ──────────────────────────────────────────────────
  const onlineZones  = zones.filter(z => {
    if (!z.last_seen) return false;
    return (Date.now() - new Date(z.last_seen)) < 5 * 60 * 1000;
  });
  const offlineZones = zones.filter(z => {
    if (!z.last_seen) return true;
    return (Date.now() - new Date(z.last_seen)) >= 5 * 60 * 1000;
  });
  const dryZones     = zones.filter(z => z.moisture < 40);
  const avgMoisture  = zones.length ? Math.round(zones.reduce((a, z) => a + z.moisture, 0) / zones.length) : 0;

  const statusColor = s => {
    if (!s) return "#6b7280";
    if (s.includes("ON"))  return "#22c55e";
    if (s.includes("OFF")) return "#6b7280";
    return "#f59e0b";
  };

  const ago = d => {
    if (!d) return "Never";
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400)return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div style={S.page}>
      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#7f1d1d" : "#14532d",
          borderColor: toast.type === "error" ? "#ef4444" : "#22c55e" }}>
          {toast.type === "error" ? "✗" : "✓"} {toast.msg}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logoBox}>
            <span style={S.logoGlyph}>⬡</span>
          </div>
          <div>
            <div style={S.headerTitle}>System Control</div>
            <div style={S.headerSub}>SmartIrrig · Administrator</div>
          </div>
        </div>
        <div style={S.headerRight}>
          <div style={S.adminChip}>
            <span style={S.adminDot}/>
            {me.name || me.email || "Admin"}
          </div>
          {loading && <div style={S.spinner}/>}
          <button style={S.btnSecondary} onClick={() => navigate("/")}>← Dashboard</button>
          <button style={S.btnDanger} onClick={() => {
            localStorage.clear(); navigate("/login");
          }}>Logout</button>
        </div>
      </div>

      {/* ── Sidebar + Content ─────────────────────────────── */}
      <div style={S.layout}>
        <nav style={S.sidebar}>
          {TABS.map(t => (
            <button key={t.id} style={{ ...S.navItem, ...(tab === t.id ? S.navItemActive : {}) }}
              onClick={() => setTab(t.id)}>
              <span style={S.navIcon}>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === "alerts"  && alerts.length  > 0 && <span style={S.navBadge}>{alerts.length}</span>}
              {t.id === "devices" && offlineZones.length > 0 && <span style={{ ...S.navBadge, background: "#ef4444" }}>{offlineZones.length}</span>}
            </button>
          ))}
          <div style={S.sidebarDivider}/>
          <button style={S.navItem} onClick={load}>
            <span style={S.navIcon}>↺</span> Refresh
          </button>
        </nav>

        <main style={S.main}>

          {/* ══ OVERVIEW ══════════════════════════════════════ */}
          {tab === "overview" && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>System Overview</h2>
                <span style={S.pageDate}>{new Date().toLocaleDateString("en-GB", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</span>
              </div>

              {/* KPI Grid */}
              <div style={S.kpiGrid}>
                {[
                  { label:"Total Users",       val: stats?.totalUsers?.count     ?? "—", icon:"◈", color:"#6366f1", sub:"registered accounts" },
                  { label:"Total Farms",        val: stats?.totalFarms?.count     ?? "—", icon:"◉", color:"#10b981", sub:"active farms" },
                  { label:"Total Zones",        val: stats?.totalZones?.count     ?? "—", icon:"◎", color:"#f59e0b", sub:`${onlineZones.length} online` },
                  { label:"Irrigations",        val: stats?.totalIrrigations?.count ?? "—", icon:"◆", color:"#06b6d4", sub:"total events" },
                  { label:"Water Today",        val: `${parseFloat(stats?.waterToday?.total||0).toFixed(1)}L`, icon:"◇", color:"#3b82f6", sub:"estimated usage" },
                  { label:"Avg Moisture",       val: `${avgMoisture}%`,          icon:"●", color:"#8b5cf6", sub:`${dryZones.length} zones dry` },
                  { label:"SMART Activations",  val: stats?.smartOns?.count      ?? "—", icon:"⬡", color:"#22c55e", sub:"AI decisions" },
                  { label:"Manual Activations", val: stats?.manualOns?.count     ?? "—", icon:"⬢", color:"#f97316", sub:"user-triggered" },
                  { label:"Today's Actions",    val: stats?.todayLogs?.count     ?? "—", icon:"◈", color:"#ec4899", sub:"in last 24h" },
                ].map(k => (
                  <div key={k.label} style={{ ...S.kpiCard, borderTopColor: k.color }}>
                    <div style={{ ...S.kpiIcon, color: k.color }}>{k.icon}</div>
                    <div style={{ ...S.kpiVal, color: k.color }}>{k.val}</div>
                    <div style={S.kpiLabel}>{k.label}</div>
                    <div style={S.kpiSub}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Zone Health Bar */}
              <div style={S.card}>
                <div style={S.cardTitle}>Zone Health</div>
                <div style={S.zoneHealthRow}>
                  <div style={S.healthItem}>
                    <div style={{ ...S.healthNum, color:"#22c55e" }}>{onlineZones.length}</div>
                    <div style={S.healthLabel}>Online</div>
                  </div>
                  <div style={S.healthBar}>
                    <div style={{ ...S.healthFill, width: zones.length ? `${(onlineZones.length/zones.length)*100}%` : "0%", background:"#22c55e" }}/>
                  </div>
                  <div style={S.healthItem}>
                    <div style={{ ...S.healthNum, color:"#ef4444" }}>{offlineZones.length}</div>
                    <div style={S.healthLabel}>Offline</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
                  {zones.map(z => {
                    const online = z.last_seen && (Date.now() - new Date(z.last_seen)) < 5 * 60 * 1000;
                    return (
                      <div key={z.zone} style={{ ...S.zonePill, borderColor: online ? "#22c55e" : "#ef4444" }}>
                        <span style={{ color: online ? "#22c55e" : "#ef4444" }}>●</span>
                        {" "}Z{z.zone} · {z.moisture}%
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Logs */}
              <div style={S.card}>
                <div style={S.cardTitle}>Recent Activity</div>
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead><tr>
                      {["Zone","Farm","Status","Reason","Time"].map(h => <th key={h} style={S.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(stats?.recentLogs || []).map((l, i) => (
                        <tr key={i} style={{ background: i%2===0?"#0d1320":"transparent" }}>
                          <td style={S.td}><span style={S.chip}>Z{l.zone}</span></td>
                          <td style={S.td}>{l.farm_name || "—"}</td>
                          <td style={S.td}><span style={{ color: statusColor(l.status), fontWeight:700 }}>{l.status}</span></td>
                          <td style={{ ...S.td, color:"#6b7280", fontSize:11 }}>{l.decision_reason || "—"}</td>
                          <td style={{ ...S.td, color:"#4b5563", fontSize:11 }}>{ago(l.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══════════════════════════════════════════ */}
          {tab === "users" && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>User Management</h2>
                <span style={S.countChip}>{users.length} users</span>
              </div>
              <div style={S.card}>
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead><tr>
                      {["#","Name","Email","Joined","Farms","Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id} style={{ background: i%2===0?"#0d1320":"transparent" }}>
                          <td style={S.td}><span style={S.idChip}>#{u.id}</span></td>
                          <td style={S.td}>
                            <div style={{ fontWeight:600 }}>{u.name}</div>
                            {u.id === me.id && <span style={S.youBadge}>YOU</span>}
                          </td>
                          <td style={{ ...S.td, color:"#9ca3af" }}>{u.email}</td>
                          <td style={{ ...S.td, color:"#6b7280", fontSize:12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td style={S.td}>
                            <button style={S.btnGhost} onClick={() => setUserModal(u)}>
                              View Farms
                            </button>
                          </td>
                          <td style={S.td}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button style={S.btnBlue} onClick={() => { setResetModal(u); setResetMsg(""); setNewPassword(""); }}>
                                🔑 Reset PW
                              </button>
                              {u.id !== me.id && (
                                <button style={S.btnRed} onClick={() => setDeleteConfirm(u)}>
                                  🗑 Delete
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
            </div>
          )}

          {/* ══ FARMS & ZONES ══════════════════════════════════ */}
          {tab === "farms" && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>Farms & Zones</h2>
                <span style={S.countChip}>{farms.length} farms · {zones.length} zones</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
                {farms.map(f => {
                  const fzones = zones.filter(z => z.farm_id === f.id);
                  return (
                    <div key={f.id} style={S.farmCard}>
                      <div style={S.farmCardHeader}>
                        <div>
                          <div style={S.farmName}>{f.name}</div>
                          <div style={S.farmLoc}>{f.location || "No location set"}</div>
                        </div>
                        <button style={S.btnRedSm} onClick={() => deleteFarm(f.id, f.name)}>Delete</button>
                      </div>
                      <div style={S.farmStats}>
                        <span>{fzones.length} zones</span>
                        {f.lat && <span>📍 {parseFloat(f.lat).toFixed(3)}, {parseFloat(f.lng).toFixed(3)}</span>}
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
                        {fzones.map(z => {
                          const online = z.last_seen && (Date.now() - new Date(z.last_seen)) < 5 * 60 * 1000;
                          return (
                            <div key={z.zone} style={S.zoneTag}>
                              <span style={{ color: online ? "#22c55e" : "#ef4444" }}>●</span>
                              {" "}Z{z.zone} · {z.name} · {z.moisture}%
                            </div>
                          );
                        })}
                        {fzones.length === 0 && <span style={{ color:"#4b5563", fontSize:12 }}>No zones assigned</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Unassigned Zones */}
              <div style={{ ...S.card, marginTop:20 }}>
                <div style={S.cardTitle}>Unassigned Zones</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>
                  {zones.filter(z => !z.farm_id).map(z => (
                    <div key={z.zone} style={{ ...S.zoneTag, borderColor:"#f59e0b" }}>
                      ⚠ Z{z.zone} · {z.moisture}%
                    </div>
                  ))}
                  {zones.filter(z => !z.farm_id).length === 0 && (
                    <span style={{ color:"#6b7280", fontSize:13 }}>All zones are assigned ✓</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ ESP32 DEVICES ══════════════════════════════════ */}
          {tab === "devices" && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>ESP32 Device Monitor</h2>
                <span style={S.countChip}>{onlineZones.length}/{zones.length} online</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                {zones.map(z => {
                  const online = z.last_seen && (Date.now() - new Date(z.last_seen)) < 5 * 60 * 1000;
                  const lastSeenMs = z.last_seen ? Date.now() - new Date(z.last_seen) : Infinity;
                  const health = online ? "ONLINE" : lastSeenMs < 30*60*1000 ? "STALE" : "OFFLINE";
                  const hColor = { ONLINE:"#22c55e", STALE:"#f59e0b", OFFLINE:"#ef4444" }[health];
                  return (
                    <div key={z.zone} style={{ ...S.deviceCard, borderTopColor: hColor }}>
                      <div style={S.deviceHeader}>
                        <div style={{ ...S.deviceStatus, color: hColor }}>● {health}</div>
                        <div style={S.deviceId}>ESP32 · Zone {z.zone}</div>
                      </div>
                      <div style={S.deviceName}>{z.name || `Zone ${z.zone}`}</div>
                      <div style={S.deviceMetrics}>
                        <div style={S.metric}>
                          <div style={{ ...S.metricVal, color:"#3b82f6" }}>{z.moisture}%</div>
                          <div style={S.metricLabel}>Moisture</div>
                        </div>
                        <div style={S.metric}>
                          <div style={{ ...S.metricVal, color:"#f59e0b" }}>{z.temperature}°C</div>
                          <div style={S.metricLabel}>Temp</div>
                        </div>
                        <div style={S.metric}>
                          <div style={{ ...S.metricVal, color:"#6b7280", fontSize:12 }}>{ago(z.last_seen)}</div>
                          <div style={S.metricLabel}>Last Ping</div>
                        </div>
                      </div>
                      {/* Moisture bar */}
                      <div style={S.moistureBar}>
                        <div style={{ ...S.moistureFill,
                          width:`${z.moisture}%`,
                          background: z.moisture < 30 ? "#ef4444" : z.moisture < 50 ? "#f59e0b" : "#22c55e"
                        }}/>
                      </div>
                      {/* Force test */}
                      <div style={S.deviceActions}>
                        <span style={{ color:"#4b5563", fontSize:11 }}>Force moisture:</span>
                        {[20, 50, 80].map(v => (
                          <button key={v} style={S.btnForce} onClick={() => forceSensor(z.zone, v)}>
                            {v}%
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ LOGS ══════════════════════════════════════════ */}
          {tab === "logs" && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>Irrigation Logs</h2>
                <span style={S.countChip}>{logs.length} entries</span>
              </div>
              <div style={S.card}>
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead><tr>
                      {["ID","Zone","Farm","Status","Score","Reason","Time"].map(h=><th key={h} style={S.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {logs.map((l, i) => (
                        <tr key={l.id} style={{ background: i%2===0?"#0d1320":"transparent" }}>
                          <td style={{ ...S.td, color:"#374151", fontSize:11 }}>{l.id}</td>
                          <td style={S.td}><span style={S.chip}>Z{l.zone}</span></td>
                          <td style={S.td}>{l.farm_name || "—"}</td>
                          <td style={S.td}><span style={{ color: statusColor(l.status), fontWeight:700, fontSize:12 }}>{l.status}</span></td>
                          <td style={S.td}>
                            {l.decision_score != null ? (
                              <span style={{ ...S.scorePill,
                                background: l.decision_score > 40 ? "#14532d" : "#1f2937",
                                color:      l.decision_score > 40 ? "#4ade80" : "#6b7280" }}>
                                {l.decision_score}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ ...S.td, fontSize:11, color:"#6b7280", maxWidth:240 }}>{l.decision_reason || "—"}</td>
                          <td style={{ ...S.td, fontSize:11, color:"#4b5563", whiteSpace:"nowrap" }}>{ago(l.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ ALERTS ═════════════════════════════════════════ */}
          {tab === "alerts" && (
            <div>
              <div style={S.pageHeader}>
                <h2 style={S.pageTitle}>System Alerts</h2>
                <span style={{ ...S.countChip, background: alerts.length ? "#7f1d1d" : "#14532d",
                  color: alerts.length ? "#fca5a5" : "#4ade80" }}>
                  {alerts.length} active
                </span>
              </div>
              {alerts.length === 0 ? (
                <div style={S.emptyState}>
                  <div style={S.emptyIcon}>✓</div>
                  <div style={S.emptyText}>No active alerts</div>
                  <div style={S.emptySub}>All zones are healthy</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {alerts.map((a, i) => (
                    <div key={i} style={S.alertCard}>
                      <div style={S.alertIcon}>⚠</div>
                      <div style={{ flex:1 }}>
                        <div style={S.alertTitle}>{a.message || `Zone ${a.zone} needs attention`}</div>
                        <div style={S.alertMeta}>Zone {a.zone} · Moisture: {a.moisture}% · {ago(a.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── Reset Password Modal ─────────────────────────── */}
      {resetModal && (
        <div style={S.overlay} onClick={() => setResetModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Reset Password</div>
            <div style={S.modalSub}>for {resetModal.name} ({resetModal.email})</div>
            <input style={S.input} type="password" placeholder="New password (min 6 chars)"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && resetPassword()} autoFocus/>
            {resetMsg && <div style={{ marginTop:8, fontSize:13, color: resetMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{resetMsg}</div>}
            <div style={S.modalBtns}>
              <button style={S.btnSecondary} onClick={() => setResetModal(null)}>Cancel</button>
              <button style={S.btnPrimary} onClick={resetPassword}>Update</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────── */}
      {deleteConfirm && (
        <div style={S.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Delete User</div>
            <div style={S.modalSub}>This will permanently delete <strong style={{ color:"#f1f5f9" }}>{deleteConfirm.name}</strong> and all their data. This cannot be undone.</div>
            <div style={S.modalBtns}>
              <button style={S.btnSecondary} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ ...S.btnPrimary, background:"#7f1d1d", color:"#fca5a5" }}
                onClick={() => deleteUser(deleteConfirm.id, deleteConfirm.name)}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── User Farms Modal ─────────────────────────────── */}
      {userModal && (
        <div style={S.overlay} onClick={() => setUserModal(null)}>
          <div style={{ ...S.modal, maxWidth:500 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>{userModal.name}'s Farms</div>
            <div style={S.modalSub}>{userModal.email}</div>
            {farms.filter(f => f.user_id === userModal.id).length === 0
              ? <div style={{ color:"#6b7280", fontSize:13 }}>No farms registered.</div>
              : farms.filter(f => f.user_id === userModal.id).map(f => (
                <div key={f.id} style={{ background:"#0d1320", borderRadius:8, padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ fontWeight:600, color:"#f1f5f9" }}>{f.name}</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>{f.location || "No location"} · {f.zone_count} zones</div>
                </div>
              ))
            }
            <div style={S.modalBtns}>
              <button style={S.btnPrimary} onClick={() => setUserModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  page: { minHeight:"100vh", background:"#080e1a", color:"#e2e8f0", fontFamily:"'Courier New', 'Lucida Console', monospace" },
  toast: { position:"fixed", top:20, right:20, zIndex:9999, padding:"12px 20px", borderRadius:8, border:"1px solid", fontSize:13, fontWeight:600 },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 24px", background:"#0b1120", borderBottom:"1px solid #1a2540", gap:12, flexWrap:"wrap" },
  headerLeft: { display:"flex", alignItems:"center", gap:14 },
  logoBox: { width:38, height:38, background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" },
  logoGlyph: { fontSize:20, color:"#fff" },
  headerTitle: { fontSize:17, fontWeight:700, color:"#f1f5f9", letterSpacing:"-0.02em" },
  headerSub: { fontSize:11, color:"#475569", letterSpacing:"0.08em", textTransform:"uppercase", marginTop:1 },
  headerRight: { display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
  adminChip: { display:"flex", alignItems:"center", gap:6, background:"#111827", border:"1px solid #1f2937", borderRadius:20, padding:"5px 12px", fontSize:12, color:"#9ca3af" },
  adminDot: { display:"inline-block", width:6, height:6, borderRadius:"50%", background:"#22c55e" },
  spinner: { width:16, height:16, border:"2px solid #1e3a5f", borderTop:"2px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  layout: { display:"flex", minHeight:"calc(100vh - 66px)" },
  sidebar: { width:200, background:"#0b1120", borderRight:"1px solid #1a2540", padding:"16px 0", display:"flex", flexDirection:"column", flexShrink:0 },
  navItem: { display:"flex", alignItems:"center", gap:10, padding:"10px 20px", background:"transparent", border:"none", color:"#6b7280", cursor:"pointer", fontSize:13, fontWeight:500, textAlign:"left", position:"relative", transition:"all 0.15s" },
  navItemActive: { color:"#f1f5f9", background:"#111827", borderRight:"2px solid #3b82f6" },
  navIcon: { fontSize:14, width:16, textAlign:"center" },
  navBadge: { marginLeft:"auto", background:"#f59e0b", color:"#000", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 },
  sidebarDivider: { borderTop:"1px solid #1a2540", margin:"8px 0" },
  main: { flex:1, padding:"24px 28px", overflowY:"auto" },
  pageHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap" },
  pageTitle: { fontSize:20, fontWeight:700, color:"#f1f5f9", margin:0, letterSpacing:"-0.02em" },
  pageDate: { fontSize:12, color:"#4b5563" },
  countChip: { background:"#111827", border:"1px solid #1f2937", color:"#9ca3af", borderRadius:20, padding:"4px 12px", fontSize:12 },
  kpiGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:20 },
  kpiCard: { background:"#0d1624", border:"1px solid #1a2540", borderTop:"3px solid", borderRadius:8, padding:"16px 14px", textAlign:"center" },
  kpiIcon: { fontSize:18, marginBottom:6 },
  kpiVal: { fontSize:26, fontWeight:800, lineHeight:1, letterSpacing:"-0.02em" },
  kpiLabel: { fontSize:10, color:"#6b7280", marginTop:4, textTransform:"uppercase", letterSpacing:"0.05em" },
  kpiSub: { fontSize:10, color:"#374151", marginTop:2 },
  card: { background:"#0d1624", border:"1px solid #1a2540", borderRadius:10, padding:"18px 20px", marginBottom:16 },
  cardTitle: { fontSize:13, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 },
  zoneHealthRow: { display:"flex", alignItems:"center", gap:12 },
  healthItem: { textAlign:"center", minWidth:40 },
  healthNum: { fontSize:20, fontWeight:800 },
  healthLabel: { fontSize:10, color:"#4b5563" },
  healthBar: { flex:1, height:6, background:"#1f2937", borderRadius:3, overflow:"hidden" },
  healthFill: { height:"100%", borderRadius:3, transition:"width 0.5s" },
  zonePill: { border:"1px solid", borderRadius:6, padding:"3px 8px", fontSize:11, color:"#9ca3af" },
  tableWrap: { overflowX:"auto", borderRadius:6, border:"1px solid #1a2540" },
  table: { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th: { padding:"9px 12px", textAlign:"left", background:"#0b1120", color:"#4b5563", borderBottom:"1px solid #1a2540", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" },
  td: { padding:"9px 12px", borderBottom:"1px solid #111827", verticalAlign:"middle", color:"#d1d5db" },
  chip: { background:"#1e3a5f", color:"#93c5fd", borderRadius:4, padding:"2px 6px", fontSize:11, fontWeight:700 },
  idChip: { background:"#111827", color:"#4b5563", borderRadius:4, padding:"2px 6px", fontSize:11 },
  youBadge: { background:"#14532d", color:"#4ade80", borderRadius:4, padding:"1px 5px", fontSize:10, marginLeft:6 },
  scorePill: { borderRadius:4, padding:"2px 7px", fontSize:11, fontWeight:700 },
  farmCard: { background:"#0d1624", border:"1px solid #1a2540", borderRadius:10, padding:"16px 18px" },
  farmCardHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 },
  farmName: { fontSize:15, fontWeight:700, color:"#f1f5f9" },
  farmLoc: { fontSize:11, color:"#4b5563", marginTop:2 },
  farmStats: { display:"flex", gap:12, fontSize:11, color:"#6b7280" },
  zoneTag: { border:"1px solid #1f2937", borderRadius:6, padding:"3px 8px", fontSize:11, color:"#9ca3af" },
  deviceCard: { background:"#0d1624", border:"1px solid #1a2540", borderTop:"3px solid", borderRadius:10, padding:"16px" },
  deviceHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 },
  deviceStatus: { fontSize:11, fontWeight:700, letterSpacing:"0.05em" },
  deviceId: { fontSize:10, color:"#374151" },
  deviceName: { fontSize:15, fontWeight:700, color:"#f1f5f9", marginBottom:12 },
  deviceMetrics: { display:"flex", gap:0, background:"#080e1a", borderRadius:8, overflow:"hidden", marginBottom:10 },
  metric: { flex:1, textAlign:"center", padding:"10px 6px", borderRight:"1px solid #111827" },
  metricVal: { fontSize:18, fontWeight:800, lineHeight:1 },
  metricLabel: { fontSize:9, color:"#374151", marginTop:3, textTransform:"uppercase", letterSpacing:"0.06em" },
  moistureBar: { height:4, background:"#1f2937", borderRadius:2, overflow:"hidden", marginBottom:10 },
  moistureFill: { height:"100%", borderRadius:2, transition:"width 0.5s" },
  deviceActions: { display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" },
  alertCard: { display:"flex", alignItems:"flex-start", gap:14, background:"#1a0a0a", border:"1px solid #7f1d1d", borderRadius:10, padding:"14px 16px" },
  alertIcon: { fontSize:18, color:"#ef4444", flexShrink:0, marginTop:1 },
  alertTitle: { fontSize:14, fontWeight:600, color:"#fca5a5" },
  alertMeta: { fontSize:11, color:"#6b7280", marginTop:3 },
  emptyState: { textAlign:"center", padding:"60px 20px" },
  emptyIcon: { fontSize:40, color:"#22c55e", marginBottom:10 },
  emptyText: { fontSize:18, fontWeight:700, color:"#f1f5f9" },
  emptySub: { fontSize:13, color:"#6b7280", marginTop:4 },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal: { background:"#0d1624", border:"1px solid #1e293b", borderRadius:12, padding:"28px 28px", width:400, maxWidth:"92vw" },
  modalTitle: { fontSize:17, fontWeight:700, color:"#f1f5f9", marginBottom:4 },
  modalSub: { fontSize:13, color:"#64748b", marginBottom:16, lineHeight:1.5 },
  input: { width:"100%", padding:"10px 12px", borderRadius:6, border:"1px solid #1e3a5f", background:"#080e1a", color:"#f1f5f9", fontSize:13, boxSizing:"border-box", outline:"none", fontFamily:"inherit" },
  modalBtns: { display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" },
  btnPrimary: { padding:"8px 18px", borderRadius:6, border:"none", background:"#1d4ed8", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 },
  btnSecondary: { padding:"8px 18px", borderRadius:6, border:"1px solid #1e3a5f", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:13 },
  btnDanger: { padding:"7px 14px", borderRadius:6, border:"none", background:"#7f1d1d", color:"#fca5a5", cursor:"pointer", fontSize:12, fontWeight:700 },
  btnBlue: { padding:"5px 10px", borderRadius:5, border:"none", background:"#1e3a5f", color:"#93c5fd", cursor:"pointer", fontSize:11 },
  btnRed: { padding:"5px 10px", borderRadius:5, border:"none", background:"#450a0a", color:"#f87171", cursor:"pointer", fontSize:11 },
  btnRedSm: { padding:"4px 10px", borderRadius:5, border:"none", background:"#450a0a", color:"#f87171", cursor:"pointer", fontSize:11 },
  btnGhost: { padding:"4px 10px", borderRadius:5, border:"1px solid #1e3a5f", background:"transparent", color:"#6b7280", cursor:"pointer", fontSize:11 },
  btnForce: { padding:"3px 8px", borderRadius:4, border:"1px solid #1f2937", background:"transparent", color:"#6b7280", cursor:"pointer", fontSize:11 },
};
