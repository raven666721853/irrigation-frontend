import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Zone() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const zoneId      = Number(id);

  const [zonesData,    setZonesData]    = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [irrigating,   setIrrigating]   = useState(false);

  // ── Live data fetch every 3s ────────────────────────────────
  useEffect(() => {
    const load = () => {
      API.get("/zones")                       // ✅ was "/api/zones" — baseURL already has /api
        .then((res) => setZonesData(res.data))
        .catch((err) => console.error("Zones fetch error:", err));
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Zone helpers ─────────────────────────────────────────────
  const getZoneData = (num) => zonesData.find((z) => z.zone === num);

  const isOffline = (zoneNum) => {
    const z = getZoneData(zoneNum);
    if (!z?.last_seen) return true;
    return (Date.now() - new Date(z.last_seen).getTime()) > 2 * 60 * 1000;
  };

  // ── Manual irrigation ────────────────────────────────────────
  const handleIrrigate = (zoneNum, action) => {
    setIrrigating(true);
    API.post("/irrigation", {
      zone:   zoneNum,
      action: action,          // ✅ was { status: "ON" } — backend expects { action: "on"/"off" }
    })
      .then(() => alert(`Zone ${zoneNum} irrigation ${action === "on" ? "started 💧" : "stopped 🛑"}`))
      .catch(() => alert("Error — check your connection ❌"))
      .finally(() => setIrrigating(false));
  };

  const currentZoneData = getZoneData(zoneId);

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", padding: 24, fontFamily: "sans-serif" }}>

      {/* Back */}
      <button
        onClick={() => navigate("/dashboard")}
        style={{ marginBottom: 16, padding: "8px 16px", background: "#1f2937", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
      >
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        🌱 Zone {zoneId} Detail
      </h1>

      {/* Current zone live stats */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid #d1fae5", maxWidth: 400 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Live Sensor Data</h2>

        {isOffline(zoneId) && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            ⚠️ Sensor offline — last seen: {currentZoneData?.last_seen ? new Date(currentZoneData.last_seen).toLocaleString() : "never"}
          </div>
        )}

        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>MOISTURE</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: currentZoneData?.moisture < 40 ? "#ef4444" : "#3b82f6" }}>
              {currentZoneData ? `${Math.round(currentZoneData.moisture)}%` : "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>TEMPERATURE</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>
              {currentZoneData ? `${Math.round(currentZoneData.temperature)}°C` : "—"}
            </div>
          </div>
        </div>

        {/* Moisture bar */}
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, marginBottom: 16 }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${Math.round(currentZoneData?.moisture || 0)}%`,
            background: currentZoneData?.moisture < 40 ? "#ef4444" : "#3b82f6",
            transition: "width .6s"
          }} />
        </div>

        {/* Manual controls */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => handleIrrigate(zoneId, "on")}
            disabled={irrigating}
            style={{ flex: 1, padding: "10px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: irrigating ? "not-allowed" : "pointer", fontWeight: 600, opacity: irrigating ? 0.6 : 1 }}
          >
            {irrigating ? "Sending..." : "💧 Irrigate ON"}
          </button>
          <button
            onClick={() => handleIrrigate(zoneId, "off")}
            disabled={irrigating}
            style={{ flex: 1, padding: "10px 0", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, cursor: irrigating ? "not-allowed" : "pointer", fontWeight: 600, opacity: irrigating ? 0.6 : 1 }}
          >
            {irrigating ? "Sending..." : "🛑 Stop OFF"}
          </button>
        </div>
      </div>

      {/* All zones grid */}
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>All Zones — click to view</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 400 }}>
        {zonesData.length === 0
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ background: "#e5e7eb", borderRadius: 10, height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                Zone {i + 1}
              </div>
            ))
          : zonesData.map((z) => {
              const dry     = z.moisture < 40;
              const offline = isOffline(z.zone);
              const active  = z.zone === zoneId;
              return (
                <div
                  key={z.zone}
                  onClick={() => navigate(`/zone/${z.zone}`)}
                  style={{
                    background: active ? "#1d4ed8" : offline ? "#374151" : dry ? "#7f1d1d" : "#166534",
                    borderRadius: 10, padding: 12, cursor: "pointer", color: "#fff",
                    border: active ? "2px solid #60a5fa" : "2px solid transparent",
                    transition: "transform .15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Zone {z.zone}</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>{offline ? "OFFLINE" : `${Math.round(z.moisture)}% moisture`}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{offline ? "" : `${Math.round(z.temperature)}°C`}</div>
                </div>
              );
            })
        }
      </div>

      {/* Selected zone popup (from old code — kept for compatibility) */}
      {selectedZone && selectedZone !== zoneId && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.5)" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, width: 320, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Zone {selectedZone}</h2>
            <p style={{ marginBottom: 8 }}>💧 Moisture: {getZoneData(selectedZone)?.moisture ?? "—"}%</p>
            <p style={{ marginBottom: 16 }}>🌡️ Temp: {getZoneData(selectedZone)?.temperature ?? "—"}°C</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { navigate(`/zone/${selectedZone}`); setSelectedZone(null); }}
                style={{ flex: 1, padding: "9px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                Open Zone
              </button>
              <button
                onClick={() => setSelectedZone(null)}
                style={{ padding: "9px 16px", background: "#e5e7eb", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
