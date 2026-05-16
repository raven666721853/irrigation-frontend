// ============================================================
// FILE: frontend/src/components/Dashboard.jsx  (FULL REPLACEMENT)
//
// FIXES vs original:
//   ✅ Offline badge per zone (last_seen > 2 min)
//   ✅ Manual ON/OFF buttons per zone in Overview
//   ✅ Water stats card (today liters, weekly chart)
//   ✅ CSV export button in History tab
//   ✅ SMART ON / SMART OFF badge style
//   ✅ History filter values fixed: "SMART ON","MANUAL ON","AUTO ON"
//   ✅ Weather widget in header area
//   ✅ JWT handled by api.js interceptor (no change needed here)
// ============================================================

import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  LineElement, BarElement,
  CategoryScale, LinearScale,
  PointElement, Tooltip, Legend
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --bg: #0a0f0a;
    --surface: #111811;
    --surface2: #182018;
    --surface3: #1e281e;
    --green: #4ade80;
    --green2: #22c55e;
    --green3: #16a34a;
    --green-dim: #0d2d0d;
    --amber: #fbbf24;
    --red: #f87171;
    --blue: #60a5fa;
    --purple: #a78bfa;
    --text: #e2f0e2;
    --muted: #6b8b6b;
    --border: #1f321f;
    --font: 'DM Sans', sans-serif;
    --mono: 'IBM Plex Mono', monospace;
  }

  .irr-app * { box-sizing: border-box; margin: 0; padding: 0; }
  .irr-app {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    min-height: 100vh;
  }

  /* Header */
  .irr-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-wrap: wrap; gap: 10px;
  }
  .irr-logo { display: flex; align-items: center; gap: 10px; }
  .irr-logo-icon {
    width: 28px; height: 28px;
    background: var(--green);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .irr-logo-text { font-size: 15px; font-weight: 600; letter-spacing: -.3px; }
  .irr-logo-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  .irr-header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

  .irr-weather-pill {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text);
    font-family: var(--mono);
    background: var(--surface2);
    padding: 4px 10px; border-radius: 20px;
    border: 1px solid var(--border);
  }

  .irr-status-pill {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--green);
    font-family: var(--mono);
    background: var(--green-dim);
    padding: 4px 10px; border-radius: 20px;
    border: 1px solid var(--green3);
  }
  .irr-pulse {
    width: 7px; height: 7px;
    background: var(--green); border-radius: 50%;
    animation: irrPulse 2s infinite;
  }
  @keyframes irrPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .6; transform: scale(.85); }
  }

  /* Nav */
  .irr-nav {
    display: flex; gap: 2px;
    padding: 0 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }
  .irr-tab {
    padding: 12px 18px;
    font-size: 13px; font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all .2s;
    user-select: none;
    display: flex; align-items: center; gap: 6px;
    white-space: nowrap;
  }
  .irr-tab:hover { color: var(--text); }
  .irr-tab.active { color: var(--green); border-bottom-color: var(--green); }
  .irr-alert-badge {
    background: #2d0d0d; color: #f87171;
    border-radius: 20px; padding: 1px 7px;
    font-size: 10px; font-family: var(--mono);
  }

  /* Content */
  .irr-content { padding: 24px; }

  /* Stats grid */
  .irr-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) {
    .irr-stats { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 600px) {
    .irr-stats { grid-template-columns: repeat(2, 1fr); }
    .irr-zone-grid { grid-template-columns: 1fr !important; }
  }
  .irr-stat-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }
  .irr-stat-label {
    font-size: 11px; font-family: var(--mono);
    color: var(--muted); margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: .8px;
  }
  .irr-stat-value { font-size: 26px; font-weight: 600; line-height: 1; }
  .irr-stat-change { font-size: 11px; color: var(--muted); margin-top: 4px; font-family: var(--mono); }
  .irr-val-green  { color: var(--green); }
  .irr-val-amber  { color: var(--amber); }
  .irr-val-red    { color: var(--red); }
  .irr-val-blue   { color: var(--blue); }
  .irr-val-purple { color: var(--purple); }

  /* Chart card */
  .irr-chart-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 24px;
  }
  .irr-card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
  }
  .irr-card-title { font-size: 14px; font-weight: 500; }
  .irr-legend { display: flex; gap: 16px; flex-wrap: wrap; }
  .irr-legend-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--muted); font-family: var(--mono);
  }
  .irr-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* Two column layout for charts */
  .irr-charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
  @media (max-width: 768px) {
    .irr-charts-row { grid-template-columns: 1fr; }
  }

  /* Zone grid */
  .irr-zone-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (max-width: 768px) {
    .irr-zone-grid { grid-template-columns: repeat(2, 1fr); }
  }
  .irr-zone-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    transition: border-color .2s;
  }
  .irr-zone-card:hover { border-color: var(--green3); }
  .irr-zone-card.irr-alert-zone  { border-color: var(--red);    background: #1a0f0f; }
  .irr-zone-card.irr-offline-zone{ border-color: var(--muted);  background: #141414; opacity: .8; }

  .irr-zone-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px; flex-wrap: wrap; gap: 6px;
  }
  .irr-zone-name { font-size: 13px; font-weight: 600; font-family: var(--mono); }
  .irr-zone-badges { display: flex; gap: 4px; flex-wrap: wrap; }

  .irr-zone-badge {
    font-size: 10px; padding: 2px 8px; border-radius: 20px; font-family: var(--mono);
  }
  .irr-badge-ok      { background: #0d2d0d;  color: var(--green);  border: 1px solid var(--green3); }
  .irr-badge-dry     { background: #2d0d0d;  color: var(--red);    border: 1px solid #7f1d1d; }
  .irr-badge-offline { background: #1c1c1c;  color: var(--muted);  border: 1px solid #333; }

  .irr-zone-metrics { display: flex; gap: 16px; margin-bottom: 10px; }
  .irr-metric { flex: 1; }
  .irr-metric-label {
    font-size: 10px; color: var(--muted); font-family: var(--mono);
    margin-bottom: 4px; text-transform: uppercase;
  }
  .irr-metric-val { font-size: 18px; font-weight: 500; }
  .irr-val-water { color: var(--blue); }
  .irr-moisture-bar {
    margin-top: 4px; height: 4px;
    background: var(--surface3); border-radius: 2px;
  }
  .irr-moisture-fill {
    height: 100%; border-radius: 2px;
    transition: width .5s;
    background: var(--green2);
  }
  .irr-moisture-fill.irr-low { background: var(--red); }

  /* Zone control buttons */
  .irr-zone-controls {
    display: flex; gap: 6px; margin-top: 10px;
  }
  .irr-ctrl-btn {
    flex: 1;
    font-size: 11px; font-family: var(--mono);
    padding: 5px 0; border-radius: 6px;
    border: 1px solid var(--border);
    color: var(--muted); background: var(--surface3);
    cursor: pointer; transition: all .15s;
    text-align: center;
  }
  .irr-ctrl-btn:hover { opacity: .85; }
  .irr-ctrl-btn.on  { border-color: var(--green3); color: var(--green); background: var(--green-dim); }
  .irr-ctrl-btn.off { border-color: #7f1d1d;       color: var(--red);   background: #2d0d0d; }
  .irr-ctrl-btn:disabled { opacity: .4; cursor: not-allowed; }

  /* Alerts */
  .irr-alerts-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .irr-alerts-title { font-size: 15px; font-weight: 500; }
  .irr-alert-count-pill {
    background: #2d0d0d; color: var(--red);
    border: 1px solid #7f1d1d;
    border-radius: 20px; padding: 2px 10px;
    font-size: 12px; font-family: var(--mono);
  }
  .irr-alert-list { display: flex; flex-direction: column; gap: 10px; }
  .irr-alert-item {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }
  .irr-alert-item.irr-critical { border-left: 3px solid var(--red); }
  .irr-alert-item.irr-warning  { border-left: 3px solid var(--amber); }
  .irr-alert-icon {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .irr-icon-crit { background: #2d0d0d; }
  .irr-icon-warn { background: #2d1f0d; }
  .irr-alert-body { flex: 1; min-width: 150px; }
  .irr-alert-title { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .irr-alert-meta  { font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .irr-action-btn {
    font-size: 11px; font-family: var(--mono);
    padding: 5px 12px; border-radius: 6px;
    border: 1px solid var(--green3);
    color: var(--green); background: var(--green-dim);
    cursor: pointer; white-space: nowrap;
  }
  .irr-no-alerts {
    text-align: center; padding: 60px;
    color: var(--muted); font-size: 14px;
  }
  .irr-no-alerts-icon { font-size: 40px; margin-bottom: 12px; opacity: .5; }

  /* History */
  .irr-hist-controls {
    display: flex; gap: 10px; margin-bottom: 20px;
    align-items: center; flex-wrap: wrap;
  }
  .irr-filter-btn {
    font-size: 11px; font-family: var(--mono);
    padding: 5px 12px; border-radius: 6px;
    border: 1px solid var(--border);
    color: var(--muted); background: var(--surface2);
    cursor: pointer; transition: all .2s;
  }
  .irr-filter-btn.active {
    border-color: var(--green3); color: var(--green); background: var(--green-dim);
  }
  .irr-export-btn {
    margin-left: auto;
    font-size: 11px; font-family: var(--mono);
    padding: 5px 14px; border-radius: 6px;
    border: 1px solid var(--blue);
    color: var(--blue); background: #0d1a2d;
    cursor: pointer; transition: all .2s;
    display: flex; align-items: center; gap: 6px;
  }
  .irr-export-btn:hover { background: #0d2040; }

  .irr-hist-table {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
  }
  .irr-hist-table table { width: 100%; border-collapse: collapse; }
  .irr-hist-table th {
    font-size: 11px; font-family: var(--mono);
    color: var(--muted); padding: 12px 16px;
    text-align: left; border-bottom: 1px solid var(--border);
    text-transform: uppercase; letter-spacing: .6px;
  }
  .irr-hist-table td {
    font-size: 13px; padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    font-family: var(--mono);
  }
  .irr-hist-table tr:last-child td { border-bottom: none; }
  .irr-hist-table tr:hover td { background: var(--surface3); }

  /* Status badges — all types */
  .irr-status-badge {
    font-size: 10px; padding: 2px 8px;
    border-radius: 20px; font-family: var(--mono);
  }
  .irr-badge-smart  { background: #1a0d2d; color: var(--purple); border: 1px solid #5b21b6; }
  .irr-badge-auto   { background: #0d2d0d; color: var(--green);  border: 1px solid var(--green3); }
  .irr-badge-manual { background: #0d1a2d; color: var(--blue);   border: 1px solid #1d4ed8; }
  .irr-badge-off    { background: #1c1c1c; color: var(--muted);  border: 1px solid #333; }

  .irr-empty-hist {
    text-align: center; padding: 40px;
    color: var(--muted); font-size: 13px;
    font-family: var(--mono);
  }
`;

// ─── Chart options ────────────────────────────────────────────────────────────
const lineOptions = {
  responsive: true,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#182018", borderColor: "#1f321f", borderWidth: 1,
      titleColor: "#e2f0e2", bodyColor: "#6b8b6b",
      titleFont: { family: "IBM Plex Mono", size: 11 },
      bodyFont:  { family: "IBM Plex Mono", size: 11 },
    },
  },
  scales: {
    x: { ticks: { color: "#6b8b6b", font: { family: "IBM Plex Mono", size: 10 } }, grid: { color: "rgba(31,50,31,.6)" } },
    y: { ticks: { color: "#6b8b6b", font: { family: "IBM Plex Mono", size: 10 } }, grid: { color: "rgba(31,50,31,.6)" }, min: 0, max: 100 },
  },
};

const barOptions = {
  responsive: true,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#182018", borderColor: "#1f321f", borderWidth: 1,
      titleColor: "#e2f0e2", bodyColor: "#6b8b6b",
      titleFont: { family: "IBM Plex Mono", size: 11 },
      bodyFont:  { family: "IBM Plex Mono", size: 11 },
      callbacks: { label: (ctx) => ` ${ctx.parsed.y.toFixed(1)} L` },
    },
  },
  scales: {
    x: { ticks: { color: "#6b8b6b", font: { family: "IBM Plex Mono", size: 9 } }, grid: { color: "rgba(31,50,31,.6)" } },
    y: { ticks: { color: "#6b8b6b", font: { family: "IBM Plex Mono", size: 10 } }, grid: { color: "rgba(31,50,31,.6)" }, beginAtZero: true },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isOffline(lastSeen) {
  if (!lastSeen) return true;
  const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  return diff > 120; // > 2 minutes
}

function getStatusBadgeClass(status) {
  if (!status) return "irr-badge-off";
  const s = status.toUpperCase();
  if (s.includes("SMART"))  return "irr-badge-smart";
  if (s.includes("AUTO"))   return "irr-badge-auto";
  if (s.includes("MANUAL") && !s.includes("OFF")) return "irr-badge-manual";
  return "irr-badge-off";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab]     = useState("overview");
  const [zones, setZones]             = useState([]);
  const [alerts, setAlerts]           = useState([]);
  const [historyRecords, setHistory]  = useState([]);
  const [histFilter, setHistFilter]   = useState("all");
  const [historyData, setHistoryData] = useState({ time: [], moisture: [], temperature: [] });
  const [waterStats, setWaterStats]   = useState(null);
  const [weather, setWeather]         = useState(null);
  const [irrigating, setIrrigating]   = useState({}); // zone -> "ON"|"OFF"|null

  // ── Fetch zones every 3s ─────────────────────────────────────────────────
  useEffect(() => {
    const fetch = () => {
      API.get("/zones")
        .then((res) => {
          const clean = res.data.map((z) => ({
            zone:        Number(z.zone),
            moisture:    Number(z.moisture),
            temperature: Number(z.temperature || 0),
            last_seen:   z.last_seen,
          }));
          setZones(clean);

          const avgM = clean.reduce((s, z) => s + z.moisture,    0) / clean.length;
          const avgT = clean.reduce((s, z) => s + z.temperature, 0) / clean.length;
          const now  = new Date().toLocaleTimeString();
          setHistoryData((prev) => ({
            time:        [...prev.time.slice(-10), now],
            moisture:    [...prev.moisture.slice(-10), avgM],
            temperature: [...prev.temperature.slice(-10), avgT],
          }));
        })
        .catch(console.error);
    };
    fetch();
    const id = setInterval(fetch, 3000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch alerts every 5s ────────────────────────────────────────────────
  useEffect(() => {
    const fetch = () => API.get("/alerts").then((r) => setAlerts(r.data)).catch(console.error);
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch history every 5s ───────────────────────────────────────────────
  useEffect(() => {
    const fetch = () => API.get("/history").then((r) => setHistory(r.data)).catch(console.error);
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch water stats every 30s ──────────────────────────────────────────
  useEffect(() => {
    const fetch = () =>
      API.get("/water-stats")
        .then((r) => setWaterStats(r.data))
        .catch(console.error);
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch weather once ───────────────────────────────────────────────────
  useEffect(() => {
    API.get("/weather").then((r) => setWeather(r.data)).catch(console.error);
  }, []);

  // ── Manual irrigation ────────────────────────────────────────────────────
  const handleManual = useCallback((zone, onOff) => {
    const status = onOff === "ON" ? "MANUAL ON" : "MANUAL OFF";
    setIrrigating((prev) => ({ ...prev, [zone]: onOff }));
    API.post("/irrigation", { zone, status })
      .then(() => {
        setTimeout(() => setIrrigating((prev) => ({ ...prev, [zone]: null })), 3000);
      })
      .catch(() => setIrrigating((prev) => ({ ...prev, [zone]: null })));
  }, []);

  // ── CSV export ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const token = localStorage.getItem("token");
    const base  = process.env.REACT_APP_API_URL;
    const url   = `${base}/api/export/csv`;

    // Fetch with auth header then trigger download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `irrigation_history_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(console.error);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const avgMoisture  = zones.length ? Math.round(zones.reduce((s, z) => s + z.moisture,    0) / zones.length) : null;
  const avgTemp      = zones.length ? Math.round(zones.reduce((s, z) => s + z.temperature, 0) / zones.length) : null;
  const healthyZones = zones.filter((z) => z.moisture >= 40).length;
  const dryZones     = zones.filter((z) => z.moisture <  40).length;
  const offlineZones = zones.filter((z) => isOffline(z.last_seen)).length;

  // ── Filtered history ──────────────────────────────────────────────────────
  const filteredHistory = histFilter === "all"
    ? historyRecords
    : historyRecords.filter((r) => r.status === histFilter);

  // ── Chart data ────────────────────────────────────────────────────────────
  const lineChartData = {
    labels: historyData.time,
    datasets: [
      { label: "Moisture %",   data: historyData.moisture,    borderColor: "#60a5fa", backgroundColor: "rgba(96,165,250,.08)", tension: 0.4, pointRadius: 3, pointBackgroundColor: "#60a5fa", borderWidth: 2 },
      { label: "Temperature °C", data: historyData.temperature, borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,.08)",  tension: 0.4, pointRadius: 3, pointBackgroundColor: "#fbbf24", borderWidth: 2 },
    ],
  };

  const weeklyLabels = waterStats?.weekly?.map((r) =>
    new Date(r.day).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })
  ) || [];
  const weeklyData   = waterStats?.weekly?.map((r) => r.liters) || [];

  const barChartData = {
    labels: weeklyLabels,
    datasets: [
      { label: "Liters", data: weeklyData, backgroundColor: "rgba(96,165,250,.5)", borderColor: "#60a5fa", borderWidth: 1, borderRadius: 4 },
    ],
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="irr-app">
      <style>{styles}</style>

      {/* ── Header ── */}
      <div className="irr-header">
        <div className="irr-logo">
          <div className="irr-logo-icon">🌿</div>
          <div>
            <div className="irr-logo-text">SmartIrrig</div>
            <div className="irr-logo-sub">Autonomous irrigation system</div>
          </div>
        </div>
        <div className="irr-header-right">
          {weather && (
            <div className="irr-weather-pill">
              {weather.rain ? "🌧️" : weather.condition === "Clouds" ? "☁️" : "☀️"}
              &nbsp;{weather.city} · {Math.round(weather.temp)}°C · {weather.humidity}% RH
            </div>
          )}
          <div className="irr-status-pill">
            <span className="irr-pulse" />
            Live · 3s refresh
          </div>
        </div>
      </div>

      {/* ── Nav tabs ── */}
      <div className="irr-nav">
        {["overview", "alerts", "history"].map((tab) => (
          <div
            key={tab}
            className={`irr-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" && "Overview"}
            {tab === "alerts"   && <>Alerts <span className="irr-alert-badge">{dryZones}</span></>}
            {tab === "history"  && "History"}
          </div>
        ))}
      </div>

      {/* ──────────── OVERVIEW ──────────── */}
      {activeTab === "overview" && (
        <div className="irr-content">

          {/* Stats row — now 5 cards incl. water today */}
          <div className="irr-stats">
            <div className="irr-stat-card">
              <div className="irr-stat-label">Avg moisture</div>
              <div className={`irr-stat-value ${avgMoisture !== null && avgMoisture < 40 ? "irr-val-red" : "irr-val-green"}`}>
                {avgMoisture != null ? `${avgMoisture}%` : "—"}
              </div>
              <div className="irr-stat-change">avg across all zones</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Avg temp</div>
              <div className="irr-stat-value irr-val-amber">
                {avgTemp != null ? `${avgTemp}°C` : "—"}
              </div>
              <div className="irr-stat-change">current reading</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Healthy zones</div>
              <div className="irr-stat-value irr-val-green">{healthyZones}</div>
              <div className="irr-stat-change">moisture ≥ 40%</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Dry alerts</div>
              <div className="irr-stat-value irr-val-red">{dryZones}</div>
              <div className="irr-stat-change">need irrigation</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Water today</div>
              <div className="irr-stat-value irr-val-blue">
                {waterStats != null ? `${waterStats.today.toFixed(1)}L` : "—"}
              </div>
              <div className="irr-stat-change">@ {2} L/min flow rate</div>
            </div>
          </div>

          {/* Charts row — moisture/temp line + weekly water bar */}
          <div className="irr-charts-row">
            <div className="irr-chart-card" style={{ margin: 0 }}>
              <div className="irr-card-header">
                <div className="irr-card-title">Moisture & Temperature — last 10 readings</div>
                <div className="irr-legend">
                  <div className="irr-legend-item"><div className="irr-legend-dot" style={{ background: "#60a5fa" }} />Moisture %</div>
                  <div className="irr-legend-item"><div className="irr-legend-dot" style={{ background: "#fbbf24" }} />Temp °C</div>
                </div>
              </div>
              <Line data={lineChartData} options={lineOptions} />
            </div>

            <div className="irr-chart-card" style={{ margin: 0 }}>
              <div className="irr-card-header">
                <div className="irr-card-title">Water used — last 7 days</div>
              </div>
              {weeklyData.length > 0
                ? <Bar data={barChartData} options={barOptions} />
                : <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)", paddingTop: 20, textAlign: "center" }}>No data yet</div>
              }
            </div>
          </div>

          {/* Zone cards */}
          <div className="irr-zone-grid">
            {zones.map((z) => {
              const dry     = z.moisture < 40;
              const offline = isOffline(z.last_seen);
              const m       = Math.round(z.moisture);
              const busy    = irrigating[z.zone];

              return (
                <div
                  key={z.zone}
                  className={`irr-zone-card ${offline ? "irr-offline-zone" : dry ? "irr-alert-zone" : ""}`}
                >
                  <div className="irr-zone-head">
                    <div className="irr-zone-name">ZONE {z.zone}</div>
                    <div className="irr-zone-badges">
                      {offline && <div className="irr-zone-badge irr-badge-offline">OFFLINE</div>}
                      {!offline && <div className={`irr-zone-badge ${dry ? "irr-badge-dry" : "irr-badge-ok"}`}>{dry ? "DRY" : "GOOD"}</div>}
                    </div>
                  </div>

                  <div className="irr-zone-metrics">
                    <div className="irr-metric">
                      <div className="irr-metric-label">Moisture</div>
                      <div className="irr-metric-val irr-val-water">{m}%</div>
                    </div>
                    <div className="irr-metric">
                      <div className="irr-metric-label">Temp</div>
                      <div className="irr-metric-val irr-val-amber">{Math.round(z.temperature)}°C</div>
                    </div>
                    {z.last_seen && (
                      <div className="irr-metric">
                        <div className="irr-metric-label">Last seen</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                          {new Date(z.last_seen).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="irr-moisture-bar">
                    <div className={`irr-moisture-fill ${dry ? "irr-low" : ""}`} style={{ width: `${m}%` }} />
                  </div>

                  {/* Manual ON/OFF buttons */}
                  <div className="irr-zone-controls">
                    <button
                      className={`irr-ctrl-btn on`}
                      disabled={!!busy}
                      onClick={() => handleManual(z.zone, "ON")}
                    >
                      {busy === "ON" ? "⏳ ON" : "💧 ON"}
                    </button>
                    <button
                      className={`irr-ctrl-btn off`}
                      disabled={!!busy}
                      onClick={() => handleManual(z.zone, "OFF")}
                    >
                      {busy === "OFF" ? "⏳ OFF" : "⛔ OFF"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────── ALERTS ──────────── */}
      {activeTab === "alerts" && (
        <div className="irr-content">
          <div className="irr-alerts-header">
            <div className="irr-alerts-title">Active Alerts</div>
            <div className="irr-alert-count-pill">{dryZones + offlineZones} alert{dryZones + offlineZones !== 1 ? "s" : ""}</div>
          </div>

          <div className="irr-alert-list">
            {dryZones === 0 && offlineZones === 0 && alerts.length === 0 ? (
              <div className="irr-no-alerts">
                <div className="irr-no-alerts-icon">✅</div>
                All zones healthy — moisture above threshold
              </div>
            ) : (
              <>
                {/* Offline zone alerts */}
                {zones.filter((z) => isOffline(z.last_seen)).map((z) => (
                  <div key={`offline-${z.zone}`} className="irr-alert-item irr-warning">
                    <div className="irr-alert-icon irr-icon-warn">📡</div>
                    <div className="irr-alert-body">
                      <div className="irr-alert-title">Zone {z.zone} — Sensor offline</div>
                      <div className="irr-alert-meta">
                        last seen: {z.last_seen ? new Date(z.last_seen).toLocaleString() : "never"}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Dry zone alerts */}
                {zones.filter((z) => z.moisture < 40 && !isOffline(z.last_seen)).map((z) => (
                  <div key={z.zone} className="irr-alert-item irr-critical">
                    <div className="irr-alert-icon irr-icon-crit">🌵</div>
                    <div className="irr-alert-body">
                      <div className="irr-alert-title">Zone {z.zone} — Low moisture detected</div>
                      <div className="irr-alert-meta">
                        moisture: {Math.round(z.moisture)}% · threshold: 40% · temp: {Math.round(z.temperature)}°C
                      </div>
                    </div>
                    <button
                      className="irr-action-btn"
                      onClick={() => handleManual(z.zone, "ON")}
                    >
                      Irrigate now
                    </button>
                  </div>
                ))}

                {/* High temp warnings */}
                {zones.filter((z) => z.temperature > 30 && z.moisture >= 40 && !isOffline(z.last_seen)).map((z) => (
                  <div key={`warn-${z.zone}`} className="irr-alert-item irr-warning">
                    <div className="irr-alert-icon irr-icon-warn">🌡️</div>
                    <div className="irr-alert-body">
                      <div className="irr-alert-title">Zone {z.zone} — High temperature</div>
                      <div className="irr-alert-meta">
                        temp: {Math.round(z.temperature)}°C · moisture: {Math.round(z.moisture)}% · monitor closely
                      </div>
                    </div>
                    <button className="irr-action-btn" onClick={() => handleManual(z.zone, "ON")}>Schedule irrigation</button>
                  </div>
                ))}

                {/* Server alerts not already shown */}
                {alerts.filter((a) => !zones.find((z) => z.zone === Number(a.zone) && z.moisture < 40)).map((a) => (
                  <div key={`api-${a.zone}`} className="irr-alert-item irr-critical">
                    <div className="irr-alert-icon irr-icon-crit">⚠️</div>
                    <div className="irr-alert-body">
                      <div className="irr-alert-title">Zone {a.zone} — Alert from server</div>
                      <div className="irr-alert-meta">moisture: {a.moisture}% · type: {a.type}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ──────────── HISTORY ──────────── */}
      {activeTab === "history" && (
        <div className="irr-content">
          <div className="irr-hist-controls">
            {[
              { label: "All",      value: "all"       },
              { label: "Smart",    value: "SMART ON"  },
              { label: "Manual",   value: "MANUAL ON" },
              { label: "Off",      value: "SMART OFF" },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`irr-filter-btn ${histFilter === value ? "active" : ""}`}
                onClick={() => setHistFilter(value)}
              >
                {label}
              </button>
            ))}
            <button className="irr-export-btn" onClick={handleExportCSV}>
              ⬇ Export CSV
            </button>
          </div>

          <div className="irr-hist-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Zone</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Time</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="irr-empty-hist">No irrigation records yet</td>
                  </tr>
                ) : (
                  filteredHistory.map((r, i) => (
                    <tr key={r.id || i}>
                      <td style={{ color: "var(--muted)" }}>#{r.id || i + 1}</td>
                      <td>Zone {r.zone}</td>
                      <td>
                        <span className={`irr-status-badge ${getStatusBadgeClass(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)" }}>
                        {r.duration_seconds ? `${r.duration_seconds}s` : "—"}
                      </td>
                      <td>
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                      </td>
                      <td style={{ color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.reason || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}