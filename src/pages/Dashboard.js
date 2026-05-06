import { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import FarmMap from "../components/FarmMap";
 
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);
 
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
 
  :root {
  --bg: linear-gradient(135deg, #0f172a, #020617);
  --glass: rgba(255,255,255,0.05);
  --border: rgba(255,255,255,0.1);
  --blue: #38bdf8;
  --purple: #a78bfa;
  --green: #4ade80;
  --red: #f87171;
  --text: #e5e7eb;
  --muted: #94a3b8;
}

.irr-app {
 max-width: 100vw;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-family: "Segoe UI", sans-serif;
   overflow-x: hidden;
}

/* HEADER */
.irr-header {
  display: flex;
  justify-content: space-between;
  padding: 20px;
  backdrop-filter: blur(12px);
  background: var(--glass);
  border-bottom: 1px solid var(--border);
}

.irr-logo-text {
  font-size: 18px;
  font-weight: bold;
}

.irr-logo-sub {
  font-size: 12px;
  color: var(--muted);
}

/* LIVE BADGE */
.irr-status-pill {
  background: rgba(56,189,248,0.1);
  color: var(--blue);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
}

/* NAV */
.irr-nav {
  display: flex;
  gap: 10px;
  padding: 10px 20px;
}

.irr-tab {
  padding: 10px 16px;
  border-radius: 10px;
  color: var(--muted);
  cursor: pointer;
}

.irr-tab.active {
  background: var(--glass);
  color: var(--blue);
}

/* STATS */
.irr-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  padding: 20px;
}

.irr-stat-card {
  background: var(--glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  transition: 0.3s;
}

.irr-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 20px rgba(56,189,248,0.2);
}

.irr-stat-label {
  font-size: 12px;
  color: var(--muted);
}

.irr-stat-value {
  font-size: 28px;
  margin-top: 6px;
}

/* CHART */
.irr-chart-card {
  margin: 20px;
  padding: 20px;
  background: var(--glass);
  border-radius: 16px;
  border: 1px solid var(--border);
}

/* ZONES */
.irr-zone-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  padding: 20px;
}

.irr-zone-card {
  background: var(--glass);
  border-radius: 16px;
  padding: 18px;
  border: 1px solid var(--border);
  transition: 0.3s;
  overflow: hidden; 
}

.irr-zone-card:hover {
  box-shadow: 0 0 20px rgba(167,139,250,0.2);
}

.irr-zone-name {
  font-size: 14px;
  font-weight: bold;
}

.irr-metric-val {
  font-size: 20px;
}

/* STATUS */
.irr-badge-ok {
  color: var(--green);
}

.irr-badge-dry {
  color: var(--red);
}

/* PROGRESS BAR */
.irr-moisture-bar {
  height: 6px;
  background: #1e293b;
  border-radius: 10px;
  margin-top: 10px;
  overflow: hidden; 
}

.irr-moisture-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--blue), var(--purple));
  border-radius: 10px;
}

/* ALERTS */
.irr-alert-item {
  background: var(--glass);
  border-radius: 12px;
  padding: 16px;
  border-left: 3px solid var(--red);
}

/* HISTORY */
.irr-hist-table {
  margin: 20px;
  border-radius: 12px;
  overflow: hidden;
}
  .irr-hist-table table {
  width: 100%;
  border-collapse: collapse;
}

.irr-hist-table th,
.irr-hist-table td {
  padding: 10px;
  text-align: left;
}

.irr-hist-table tr {
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
  .irr-forecast {
  display: flex;
  gap: 12px;
  overflow-x: auto;   /* 🔥 allows horizontal scroll */
  padding: 10px 0;
}

.irr-forecast-item {
  min-width: 80px;
  text-align: center;
  background: rgba(255,255,255,0.05);
  padding: 8px;
  border-radius: 10px;
  flex-shrink: 0; /* 🔥 prevents stretching */
}
  .irr-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.irr-btn.on {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.irr-btn.off {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}
`;
 
// ─── Chart options ────────────────────────────────────────────────────────────
const chartOptions = {
  responsive: true,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#182018",
      borderColor: "#1f321f",
      borderWidth: 1,
      titleColor: "#e2f0e2",
      bodyColor: "#6b8b6b",
      titleFont: { family: "IBM Plex Mono", size: 11 },
      bodyFont:  { family: "IBM Plex Mono", size: 11 },
    },
  },
  scales: {
    x: {
      ticks: { color: "#6b8b6b", font: { family: "IBM Plex Mono", size: 10 } },
      grid:  { color: "rgba(31,50,31,.6)" },
    },
    y: {
      ticks: { color: "#6b8b6b", font: { family: "IBM Plex Mono", size: 10 } },
      grid:  { color: "rgba(31,50,31,.6)" },
      min: 0, max: 100,
    },
  },
};
 
// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard({ setIsAuth }) {
 const [coords, setCoords] = useState({
  lat: localStorage.getItem("lat"),
  lon: localStorage.getItem("lon"),
});
  const [forecast, setForecast] = useState([]);
  
  const [weather, setWeather] = useState(null);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [zones, setZones]         = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [histFilter, setHistFilter]         = useState("all");
  const [loadingZone, setLoadingZone] = useState(null);
  const [historyData, setHistoryData] = useState({ time: [], moisture: [], temperature: []
    
  
   });
    const [waterStats, setWaterStats] = useState({
  today: 0,
  weekly: []
});
   
   const [weatherHistory, setWeatherHistory] = useState({
  time: [],
  temp: []
});
 const calculateNextIrrigation = () => {
    if (!forecast.length || !zones.length) return "Calculating...";

    const avgMoisture =
      zones.reduce((sum, z) => sum + z.moisture, 0) / zones.length;

    const avgTemp =
      zones.reduce((sum, z) => sum + z.temperature, 0) / zones.length;

    const willRain = forecast.some(f => f.condition === "Rain");

    let hoursToWait = 6;

    if (willRain) {
      hoursToWait = 24;
    } else if (avgMoisture < 40) {
      hoursToWait = 1;
    } else if (avgTemp > 30) {
      hoursToWait = 3;
    }

    const next = new Date();
    next.setHours(next.getHours() + hoursToWait);

    return next.toLocaleString();
  };
 



   

   // 📍 Get user location once
useEffect(() => {
  const lat = localStorage.getItem("lat");
  const lon = localStorage.getItem("lon");

  // ✅ If already saved → DO NOTHING
  if (lat && lon) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const newLat = pos.coords.latitude;
      const newLon = pos.coords.longitude;

      localStorage.setItem("lat", newLat);
      localStorage.setItem("lon", newLon);

      console.log("📍 Saved location:", newLat, newLon);
    },
    (err) => console.log("❌ Location error:", err)
  );
}, []);
 
  // ── Fetch zones (real-time) ──────────────────────────────────────────────
  useEffect(() => {
    const fetchZones = () => {
      API.get("/zones")
        .then((res) => {
          const clean = res.data.map((z) => ({
            zone:        Number(z.zone),
            moisture:    Number(z.moisture),
            temperature: Number(z.temperature || 0),
          }));
          setZones(clean);
 
          const avgM = clean.reduce((s, z) => s + z.moisture,    0) / clean.length;
          const avgT = clean.reduce((s, z) => s + z.temperature, 0) / clean.length;
          const now  = new Date().toLocaleTimeString();
 
          setHistoryData((prev) => ({
            time:        [...prev.time.slice(-10),        now],
            moisture:    [...prev.moisture.slice(-10),    avgM],
            temperature: [...prev.temperature.slice(-10), avgT],
          }));
        })
        .catch(console.error);
    };
 
    useEffect(() => {
  const eventSource = new EventSource(
    "https://smart-irrigation-backend-wra6.onrender.com/api/stream"
  );

  eventSource.onmessage = (event) => {
    const raw = JSON.parse(event.data);

    const clean = raw.map((z) => ({
      zone: Number(z.zone),
      moisture: Number(z.moisture),
      temperature: Number(z.temperature || 0),
    }));

    // ✅ update zones (same as before)
    setZones(clean);

    // ✅ KEEP YOUR CHART LOGIC
    const avgM =
      clean.reduce((s, z) => s + z.moisture, 0) / clean.length;

    const avgT =
      clean.reduce((s, z) => s + z.temperature, 0) / clean.length;

    const now = new Date().toLocaleTimeString();

    setHistoryData((prev) => ({
      time: [...prev.time.slice(-10), now],
      moisture: [...prev.moisture.slice(-10), avgM],
      temperature: [...prev.temperature.slice(-10), avgT],
    }));
  };

  eventSource.onerror = (err) => {
    console.error("SSE error:", err);
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}, []);
  }, []);
 
  // ── Fetch alerts ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAlerts = () => {
      API.get("/alerts")
        .then((res) => setAlerts(res.data))
        .catch(console.error);
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);
 
  // ── Fetch irrigation history ──────────────────────────────────────────────
  useEffect(() => {
    const fetchHistory = () => {
      API.get("/history")
        .then((res) => setHistoryRecords(res.data))
        .catch(console.error);
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
  const fetchWater = () => {
    API.get("/water-stats")
      .then(res => setWaterStats(res.data))
      .catch(console.error);
  };

  fetchWater();
  const interval = setInterval(fetchWater, 10000);

  return () => clearInterval(interval);
}, []);


 useEffect(() => {
  const lat = localStorage.getItem("lat");
  const lon = localStorage.getItem("lon");

  if (!lat || !lon) return;

  API.get(`/forecast?lat=${lat}&lon=${lon}`)
    .then(res => {
      console.log("FORECAST:", res.data);
      setForecast(res.data);
    })
    .catch(console.error);
}, []);

useEffect(() => {
  const fetchWeather = () => {
    const lat = localStorage.getItem("lat");
    const lon = localStorage.getItem("lon");

    if (!lat || !lon) return;

    API.get(`/weather?lat=${lat}&lon=${lon}`)
      .then(res => {
        setWeather(res.data);

        const now = new Date().toLocaleTimeString();

        setWeatherHistory(prev => ({
          time: [...prev.time.slice(-10), now],
          temp: [...prev.temp.slice(-10), res.data.temp]
        }));
      })
      .catch(console.error);
  };

  fetchWeather();
  const interval = setInterval(fetchWeather, 10000);

  return () => clearInterval(interval);
}, []);


 
  // ── Derived stats ─────────────────────────────────────────────────────────
  const avgMoisture = zones.length
    ? Math.round(zones.reduce((s, z) => s + z.moisture,    0) / zones.length)
    : null;
  const avgTemp = zones.length
    ? Math.round(zones.reduce((s, z) => s + z.temperature, 0) / zones.length)
    : null;
  const healthyZones = zones.filter((z) => z.moisture >= 40).length;
  const dryZones     = zones.filter((z) => z.moisture <  40).length;
 
  // ── Filtered history ──────────────────────────────────────────────────────
 const filteredHistory =
  histFilter === "all"
    ? historyRecords
    : historyRecords.filter((r) =>
        histFilter === "manual"
          ? r.reason === "MANUAL"
          : r.reason === "AUTO"
      );
 
  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = {
    labels: historyData.time,
    datasets: [
      {
        label: "Moisture %",
        data: historyData.moisture,
        borderColor: "#60a5fa",
        backgroundColor: "rgba(96,165,250,.08)",
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#60a5fa",
        borderWidth: 2,
      },
      {
        label: "Temperature °C",
        data: historyData.temperature,
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251,191,36,.08)",
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#fbbf24",
        borderWidth: 2,
      },
    ],
  };
 
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="irr-app">
      <Navbar setIsAuth={setIsAuth} />
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
        <div className="irr-status-pill">
          <span className="irr-pulse" />
          Live · 3s refresh
        </div>
      </div>
 
      {/* ── Nav tabs ── */}
      <div className="irr-nav">
  <div
    className={`irr-tab ${activeTab === "overview" ? "active" : ""}`}
    onClick={() => setActiveTab("overview")}
  >
    Overview
  </div>

  <div
    className={`irr-tab ${activeTab === "alerts" ? "active" : ""}`}
    onClick={() => setActiveTab("alerts")}
  >
    Alerts
  </div>

  <div
    className={`irr-tab ${activeTab === "history" ? "active" : ""}`}
    onClick={() => setActiveTab("history")}
  >
    History
  </div>
</div>
 




{activeTab === "overview" && (
  <div className="irr-content">

    {/* 🌦 WEATHER */}
    <div className="irr-chart-card">
      <div className="irr-card-header">
        <div className="irr-card-title">🌍 Weather — {weather?.city || "Loading..."}</div>
      </div>

      <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
        <div>🌡 {weather?.temp ?? "--"}°C</div>
        <div>💧 {weather?.humidity ?? "--"}%</div>
        <div>{weather?.rain ? "🌧 Rain" : "☀️ Clear"}</div>
      </div>
    </div>

    {/* 🌤 FORECAST */}
    <div className="irr-chart-card">
      <div className="irr-card-title">🌦️ Forecast</div>

    <div className="irr-forecast">
  {forecast.slice(0, 12).map((f, i) => (
      <div key={i} className="irr-forecast-item">

    {/* TIME */}
    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
      {f.time
        ? new Date(f.time * 1000).getHours() + "h"
        : "--"}
    </div>

    {/* TEMP */}
    <div>
      {f.temp !== undefined
        ? Math.round(f.temp) + "°C"
        : "--"}
    </div>

    {/* WEATHER */}
    <div style={{ fontSize: "12px" }}>
      {f.condition || "--"}
    </div>

  </div>
))}
</div>
    </div>
   


    {/* ⏱ NEXT IRRIGATION */}
    <div className="irr-chart-card">
      <div className="irr-card-title">Next Irrigation</div>
        <div style={{ marginTop: "10px" }}>
    {calculateNextIrrigation()}
  </div>

      {historyRecords
        .filter(r => r.status === "SMART ON" || r.status === "AUTO ON")
        .slice(0, 1)
        .map(r => {
          const next = r.reason?.split("Next irrigation:")[1];
          return (
            <div key={r.id} style={{ marginTop: "10px" }}>
              {next ? next : "Calculating..."}
            </div>
          );
        })}
    </div>
    <div className="irr-chart-card">
  <div className="irr-card-title">🗺 Select Farm Location</div>

  <FarmMap coords={coords} setCoords={setCoords} />

  <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--muted)" }}>
    📍 {coords?.lat && coords?.lon
      ? `${coords.lat}, ${coords.lon}`
      : "Click on map to select farm"}
  </div>
</div>

    
          {/* Stats row */}
          <div className="irr-stats">
            <div className="irr-stat-card">
              <div className="irr-stat-label">Avg moisture</div>
              <div className={`irr-stat-value ${avgMoisture < 40 ? "irr-val-red" : "irr-val-green"}`}>
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
              <div className="irr-stat-value">{healthyZones}</div>
              <div className="irr-stat-change">moisture ≥ 40%</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Dry alerts</div>
              <div className="irr-stat-value irr-val-red">{dryZones}</div>
              <div className="irr-stat-change">need irrigation</div>
            </div>
            <div className="irr-stat-card">
  <div className="irr-stat-label">Water Usage Today</div>
  <div className="irr-stat-value">
    {waterStats.today.toFixed(2)} L
  </div>
  <div className="irr-stat-change">live consumption</div>
</div>
          </div>
 
          {/* Chart */}
          <div className="irr-chart-card">
            <div className="irr-card-header">
              <div className="irr-card-title">Moisture & Temperature — last 10 readings</div>
              <div className="irr-legend">
                <div className="irr-legend-item">
                  <div className="irr-legend-dot" style={{ background: "#60a5fa" }} />
                  Moisture %
                </div>
                <div className="irr-legend-item">
                  <div className="irr-legend-dot" style={{ background: "#fbbf24" }} />
                  Temperature °C
                </div>
              </div>
            </div>
            <Line data={chartData} options={chartOptions} />
          </div>
          <div className="irr-chart-card">
  <div className="irr-card-title">💧 Weekly Water Usage</div>

  <Line
    data={{
      labels: waterStats.weekly.map(w =>
        new Date(w.day).toLocaleDateString()
      ),
      datasets: [
        {
          label: "Liters",
          data: waterStats.weekly.map(w => w.liters),
          borderColor: "#4ade80",
          backgroundColor: "rgba(74,222,128,0.1)",
          tension: 0.4,
        },
      ],
    }}
    options={chartOptions}
  />
</div>
 
          {/* Zone cards */}
          <div className="irr-zone-grid">
            {zones.map((z) => {
              const dry = z.moisture < 40;
              const m   = Math.round(z.moisture);
              return (
                <div key={z.zone} className={`irr-zone-card ${dry ? "irr-alert-zone" : ""}`}>
                  <div className="irr-zone-head">
                    <div className="irr-zone-name">ZONE {z.zone}</div>
                    <div className={`irr-zone-badge ${dry ? "irr-badge-dry" : "irr-badge-ok"}`}>
                      {dry ? "DRY" : "GOOD"}
                    </div>
                  </div>
                  <div className="irr-zone-metrics">
                    <div className="irr-metric">
                      <div className="irr-metric-label">Moisture</div>
                      <div className="irr-metric-val irr-val-water">{m}%</div>
                    </div>
                    <div className="irr-metric">
                      <div className="irr-metric-label">Temp</div>
                      <div className="irr-metric-val irr-val-amber">
                        {Math.round(z.temperature)}°C
                      </div>
                    </div>
                  </div>
                  <div className="irr-moisture-bar">
                    <div
                      className={`irr-moisture-fill ${dry ? "irr-low" : ""}`}
                      style={{ width: `${m}%` }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
  
  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>

  <button
    className="irr-btn on"
    disabled={loadingZone === z.zone}
    onClick={async () => {
      setLoadingZone(z.zone);
      await API.post("/irrigation", {
        zone: z.zone,
        status: "MANUAL ON",
      });
      setLoadingZone(null);
    }}
  >
    {loadingZone === z.zone ? "..." : "ON"}
  </button>

  <button
    className="irr-btn off"
    disabled={loadingZone === z.zone}
    onClick={async () => {
      setLoadingZone(z.zone);
      await API.post("/irrigation", {
        zone: z.zone,
        status: "MANUAL OFF",
      });
      setLoadingZone(null);
    }}
  >
    {loadingZone === z.zone ? "..." : "OFF"}
  </button>

</div>

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
            <div className="irr-alert-count-pill">{dryZones} alert{dryZones !== 1 ? "s" : ""}</div>
          </div>
 
          <div className="irr-alert-list">
            {dryZones === 0 && alerts.length === 0 ? (
              <div className="irr-no-alerts">
                <div className="irr-no-alerts-icon">✅</div>
                All zones healthy — moisture above threshold
              </div>
            ) : (
              <>
                {/* Zones below threshold (from live data) */}
                {zones
                  .filter((z) => z.moisture < 40)
                  .map((z) => (
                    <div key={z.zone} className="irr-alert-item irr-critical">
                      <div className="irr-alert-icon irr-icon-crit">🌵</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">Zone {z.zone} — Low moisture detected</div>
                        <div className="irr-alert-meta">
                          moisture: {Math.round(z.moisture)}% · threshold: 40% · temp:{" "}
                          {Math.round(z.temperature)}°C
                        </div>
                      </div>
                      <button
                        className="irr-action-btn"
                        onClick={() =>
                          API.post("/irrigation", { zone: z.zone, status: "MANUAL ON" }).catch(
                            console.error
                          )
                        }
                      >
                        Irrigate now
                      </button>
                    </div>
                  ))}
 
                {/* High temperature warnings */}
                {zones
                  .filter((z) => z.temperature > 30 && z.moisture >= 40)
                  .map((z) => (
                    <div key={`warn-${z.zone}`} className="irr-alert-item irr-warning">
                      <div className="irr-alert-icon irr-icon-warn">🌡️</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">Zone {z.zone} — High temperature</div>
                        <div className="irr-alert-meta">
                          temp: {Math.round(z.temperature)}°C · moisture:{" "}
                          {Math.round(z.moisture)}% · monitor closely
                        </div>
                      </div>
                      <button className="irr-action-btn">Schedule check</button>
                    </div>
                  ))}
 
                {/* Alerts from backend /api/alerts */}
                {alerts
                  .filter(
                    (a) => !zones.find((z) => z.zone === Number(a.zone) && z.moisture < 40)
                  )
                  .map((a) => (
                    <div key={`api-${a.zone}`} className="irr-alert-item irr-critical">
                      <div className="irr-alert-icon irr-icon-crit">⚠️</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">Zone {a.zone} — Alert from server</div>
                        <div className="irr-alert-meta">moisture: {a.moisture}%</div>
                      </div>
                    </div>
                  ))}
              </>
            )}
            {/* 🤖 SMART / AUTO irrigation alerts */}
{historyRecords
  .filter(r => r.status === "SMART ON" || r.status === "AUTO ON")
  .slice(0, 5)
  .map((r) => (
    <div key={`smart-${r.id}`} className="irr-alert-item irr-critical">
      
      <div className="irr-alert-icon irr-icon-crit">🤖</div>

      <div className="irr-alert-body">
        <div className="irr-alert-title">
          Auto Irrigation — Zone {r.zone}
        </div>

        <div className="irr-alert-meta">
          {r.reason ? r.reason : "Triggered automatically (no details available)"}
        </div>
      </div>

    </div>
  ))}
          </div>
        </div>
      )}
 
      {/* ──────────── HISTORY ──────────── */}
      {activeTab === "history" && (
  <div className="irr-content">

    <div className="irr-hist-controls">
      {[
        { label: "All", value: "all" },
        { label: "Auto", value: "smart" },
        { label: "Manual", value: "manual" },
      ].map(({ label, value }) => (
        <button
          key={value}
          className={`irr-filter-btn ${histFilter === value ? "active" : ""}`}
          onClick={() => setHistFilter(value)}
        >
          {label}
        </button>
      ))}
    </div>
 
         <div className="irr-hist-table">
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Zone</th>
        <th>Status</th>
        <th>Time</th>
        <th>Water Used 💧</th>  
        <th>Reason</th>
      </tr>
    </thead>

   <tbody>
  {filteredHistory.length === 0 ? (
    <tr>
      <td colSpan={5} className="irr-empty-hist">
        No irrigation records yet
      </td>
    </tr>
  ) : (
    filteredHistory.map((r, i) => (
      <tr key={r.id || i}>

        {/* # */}
        <td>{i + 1}</td>

        {/* Zone */}
        <td>Zone {r.zone}</td>

        {/* Status */}
        <td>
          <span
            className={`irr-status-badge ${
              r.reason === "AUTO"
                ? "irr-badge-auto"
                : "irr-badge-manual"
            }`}
          >
            {r.status}
          </span>
        </td>

        {/* Time */}
        <td>
          {r.created_at
            ? new Date(r.created_at).toLocaleString()
            : "—"}
        </td>
        {/* Water Usage */}
<td>
  {r.duration_seconds
    ? `${((r.duration_seconds / 60) * 2).toFixed(2)} L`
    : "-"}
</td>

        {/* Reason */}
        <td style={{ fontSize: "12px", color: "var(--muted)" }}>
          {r.reason || "-"}
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