// ============================================================
// FILE: frontend/src/components/Dashboard.jsx  (FULL REPLACEMENT)
//
// NEW in this version:
//   ✅ Farms tab — list all farms, add/edit/delete
//   ✅ Map picker (Leaflet, free, no API key) to set farm location
//   ✅ Zone management per farm — add / delete zones
//   ✅ Farm selector in Overview — filter zones by farm
//   ✅ All previous fixes kept (offline badge, water stats, CSV, SMART badge)
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
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

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

// ─── Leaflet loaded from CDN (no npm needed) ─────────────────────────────────
// We inject the Leaflet CSS + JS once
let leafletLoaded = false;
function loadLeaflet() {
  if (leafletLoaded) return Promise.resolve();
  leafletLoaded = true;
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src  = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

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
  .irr-app { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }

  /* Header */
  .irr-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid var(--border);
    background: var(--surface); flex-wrap: wrap; gap: 10px;
  }
  .irr-logo { display: flex; align-items: center; gap: 10px; }
  .irr-logo-icon { width: 28px; height: 28px; background: var(--green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .irr-logo-text { font-size: 15px; font-weight: 600; letter-spacing: -.3px; }
  .irr-logo-sub  { font-size: 11px; color: var(--muted); font-family: var(--mono); }
  .irr-header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .irr-weather-pill {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text);
    font-family: var(--mono); background: var(--surface2); padding: 4px 10px;
    border-radius: 20px; border: 1px solid var(--border);
  }
  .irr-status-pill {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--green);
    font-family: var(--mono); background: var(--green-dim); padding: 4px 10px;
    border-radius: 20px; border: 1px solid var(--green3);
  }
  .irr-pulse { width: 7px; height: 7px; background: var(--green); border-radius: 50%; animation: irrPulse 2s infinite; }
  @keyframes irrPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }

  /* Nav */
  .irr-nav {
    display: flex; gap: 2px; padding: 0 24px;
    background: var(--surface); border-bottom: 1px solid var(--border); overflow-x: auto;
  }
  .irr-tab {
    padding: 12px 18px; font-size: 13px; font-weight: 500; color: var(--muted);
    cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s;
    user-select: none; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  }
  .irr-tab:hover { color: var(--text); }
  .irr-tab.active { color: var(--green); border-bottom-color: var(--green); }
  .irr-alert-badge { background: #2d0d0d; color: #f87171; border-radius: 20px; padding: 1px 7px; font-size: 10px; font-family: var(--mono); }

  /* Content */
  .irr-content { padding: 24px; }

  /* Farm selector bar */
  .irr-farm-bar {
    display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .irr-farm-label { font-size: 12px; color: var(--muted); font-family: var(--mono); white-space: nowrap; }
  .irr-farm-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .irr-farm-pill {
    font-size: 12px; font-family: var(--mono); padding: 4px 12px; border-radius: 20px;
    border: 1px solid var(--border); color: var(--muted); background: var(--surface2);
    cursor: pointer; transition: all .15s;
  }
  .irr-farm-pill:hover { border-color: var(--green3); color: var(--green); }
  .irr-farm-pill.active { border-color: var(--green3); color: var(--green); background: var(--green-dim); }

  /* Stats grid */
  .irr-stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 24px; }
  @media(max-width:900px){ .irr-stats{grid-template-columns:repeat(3,1fr)} }
  @media(max-width:600px){ .irr-stats{grid-template-columns:repeat(2,1fr)} .irr-zone-grid{grid-template-columns:1fr!important} }
  .irr-stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .irr-stat-label { font-size: 11px; font-family: var(--mono); color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .8px; }
  .irr-stat-value { font-size: 26px; font-weight: 600; line-height: 1; }
  .irr-stat-change { font-size: 11px; color: var(--muted); margin-top: 4px; font-family: var(--mono); }
  .irr-val-green{color:var(--green)} .irr-val-amber{color:var(--amber)} .irr-val-red{color:var(--red)} .irr-val-blue{color:var(--blue)} .irr-val-purple{color:var(--purple)}

  /* Chart card */
  .irr-chart-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 24px; }
  .irr-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .irr-card-title { font-size: 14px; font-weight: 500; }
  .irr-legend { display: flex; gap: 16px; flex-wrap: wrap; }
  .irr-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .irr-legend-dot { width: 8px; height: 8px; border-radius: 50%; }
  .irr-charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 24px; }
  @media(max-width:768px){ .irr-charts-row{grid-template-columns:1fr} }

  /* Zone grid */
  .irr-zone-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  @media(max-width:768px){ .irr-zone-grid{grid-template-columns:repeat(2,1fr)} }
  .irr-zone-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px; transition: border-color .2s; }
  .irr-zone-card:hover { border-color: var(--green3); }
  .irr-zone-card.irr-alert-zone   { border-color: var(--red);   background: #1a0f0f; }
  .irr-zone-card.irr-offline-zone { border-color: var(--muted); background: #141414; opacity: .8; }
  .irr-zone-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 6px; }
  .irr-zone-name { font-size: 13px; font-weight: 600; font-family: var(--mono); }
  .irr-zone-badges { display: flex; gap: 4px; flex-wrap: wrap; }
  .irr-zone-badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-family: var(--mono); }
  .irr-badge-ok      { background: #0d2d0d; color: var(--green);  border: 1px solid var(--green3); }
  .irr-badge-dry     { background: #2d0d0d; color: var(--red);    border: 1px solid #7f1d1d; }
  .irr-badge-offline { background: #1c1c1c; color: var(--muted);  border: 1px solid #333; }
  .irr-zone-metrics { display: flex; gap: 16px; margin-bottom: 10px; }
  .irr-metric { flex: 1; }
  .irr-metric-label { font-size: 10px; color: var(--muted); font-family: var(--mono); margin-bottom: 4px; text-transform: uppercase; }
  .irr-metric-val { font-size: 18px; font-weight: 500; }
  .irr-val-water { color: var(--blue); }
  .irr-moisture-bar { margin-top: 4px; height: 4px; background: var(--surface3); border-radius: 2px; }
  .irr-moisture-fill { height: 100%; border-radius: 2px; transition: width .5s; background: var(--green2); }
  .irr-moisture-fill.irr-low { background: var(--red); }
  .irr-zone-controls { display: flex; gap: 6px; margin-top: 10px; }
  .irr-ctrl-btn { flex:1; font-size:11px; font-family:var(--mono); padding:5px 0; border-radius:6px; border:1px solid var(--border); color:var(--muted); background:var(--surface3); cursor:pointer; transition:all .15s; text-align:center; }
  .irr-ctrl-btn:hover{opacity:.85} .irr-ctrl-btn.on{border-color:var(--green3);color:var(--green);background:var(--green-dim)} .irr-ctrl-btn.off{border-color:#7f1d1d;color:var(--red);background:#2d0d0d} .irr-ctrl-btn:disabled{opacity:.4;cursor:not-allowed}

  /* Alerts */
  .irr-alerts-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .irr-alerts-title { font-size: 15px; font-weight: 500; }
  .irr-alert-count-pill { background: #2d0d0d; color: var(--red); border: 1px solid #7f1d1d; border-radius: 20px; padding: 2px 10px; font-size: 12px; font-family: var(--mono); }
  .irr-alert-list { display: flex; flex-direction: column; gap: 10px; }
  .irr-alert-item { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .irr-alert-item.irr-critical { border-left: 3px solid var(--red); }
  .irr-alert-item.irr-warning  { border-left: 3px solid var(--amber); }
  .irr-alert-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .irr-icon-crit{background:#2d0d0d} .irr-icon-warn{background:#2d1f0d}
  .irr-alert-body { flex: 1; min-width: 150px; }
  .irr-alert-title { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .irr-alert-meta  { font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .irr-action-btn { font-size:11px; font-family:var(--mono); padding:5px 12px; border-radius:6px; border:1px solid var(--green3); color:var(--green); background:var(--green-dim); cursor:pointer; white-space:nowrap; }
  .irr-no-alerts { text-align: center; padding: 60px; color: var(--muted); font-size: 14px; }
  .irr-no-alerts-icon { font-size: 40px; margin-bottom: 12px; opacity: .5; }

  /* History */
  .irr-hist-controls { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
  .irr-filter-btn { font-size:11px; font-family:var(--mono); padding:5px 12px; border-radius:6px; border:1px solid var(--border); color:var(--muted); background:var(--surface2); cursor:pointer; transition:all .2s; }
  .irr-filter-btn.active { border-color:var(--green3); color:var(--green); background:var(--green-dim); }
  .irr-export-btn { margin-left:auto; font-size:11px; font-family:var(--mono); padding:5px 14px; border-radius:6px; border:1px solid var(--blue); color:var(--blue); background:#0d1a2d; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:6px; }
  .irr-export-btn:hover{background:#0d2040}
  .irr-hist-table { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .irr-hist-table table { width: 100%; border-collapse: collapse; }
  .irr-hist-table th { font-size:11px; font-family:var(--mono); color:var(--muted); padding:12px 16px; text-align:left; border-bottom:1px solid var(--border); text-transform:uppercase; letter-spacing:.6px; }
  .irr-hist-table td { font-size:13px; padding:12px 16px; border-bottom:1px solid var(--border); font-family:var(--mono); }
  .irr-hist-table tr:last-child td{border-bottom:none} .irr-hist-table tr:hover td{background:var(--surface3)}
  .irr-status-badge { font-size:10px; padding:2px 8px; border-radius:20px; font-family:var(--mono); }
  .irr-badge-smart  { background:#1a0d2d; color:var(--purple); border:1px solid #5b21b6; }
  .irr-badge-auto   { background:#0d2d0d; color:var(--green);  border:1px solid var(--green3); }
  .irr-badge-manual { background:#0d1a2d; color:var(--blue);   border:1px solid #1d4ed8; }
  .irr-badge-off    { background:#1c1c1c; color:var(--muted);  border:1px solid #333; }
  .irr-empty-hist { text-align:center; padding:40px; color:var(--muted); font-size:13px; font-family:var(--mono); }

  /* ── FARMS TAB ── */
  .irr-farms-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
  .irr-farms-title  { font-size:15px; font-weight:500; }
  .irr-add-btn { font-size:12px; font-family:var(--mono); padding:7px 16px; border-radius:8px; border:1px solid var(--green3); color:var(--green); background:var(--green-dim); cursor:pointer; transition:all .15s; }
  .irr-add-btn:hover{background:#0d3d0d}

  .irr-farms-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
  .irr-farm-card { background:var(--surface2); border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:border-color .2s; }
  .irr-farm-card:hover{border-color:var(--green3)}
  .irr-farm-card-head { padding:16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .irr-farm-card-info { flex:1; min-width:0; }
  .irr-farm-card-name { font-size:14px; font-weight:600; margin-bottom:3px; }
  .irr-farm-card-loc  { font-size:11px; color:var(--muted); font-family:var(--mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .irr-farm-card-actions { display:flex; gap:6px; flex-shrink:0; }
  .irr-icon-btn { width:30px; height:30px; border-radius:6px; border:1px solid var(--border); background:var(--surface3); color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:all .15s; }
  .irr-icon-btn:hover{border-color:var(--green3);color:var(--green)}
  .irr-icon-btn.del:hover{border-color:#7f1d1d;color:var(--red)}

  /* Map inside farm card */
  .irr-map-preview { height:160px; width:100%; background:var(--surface3); position:relative; }
  .irr-map-no-loc  { height:160px; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:12px; font-family:var(--mono); background:var(--surface3); }

  /* Zones list inside farm card */
  .irr-farm-zones { padding:12px 16px; }
  .irr-farm-zones-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .irr-farm-zones-title { font-size:12px; color:var(--muted); font-family:var(--mono); text-transform:uppercase; letter-spacing:.6px; }
  .irr-zone-list { display:flex; flex-direction:column; gap:6px; }
  .irr-zone-row { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--surface3); border-radius:7px; border:1px solid var(--border); }
  .irr-zone-row-name { font-size:12px; font-family:var(--mono); }
  .irr-zone-row-stats { font-size:11px; color:var(--muted); font-family:var(--mono); display:flex; gap:12px; }
  .irr-zone-del-btn { width:22px; height:22px; border-radius:4px; border:1px solid transparent; background:transparent; color:var(--muted); cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .irr-zone-del-btn:hover{border-color:#7f1d1d;color:var(--red);background:#2d0d0d}
  .irr-no-zones { font-size:12px; color:var(--muted); font-family:var(--mono); text-align:center; padding:12px 0; }

  /* Modal */
  .irr-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .irr-modal { background:var(--surface); border:1px solid var(--border); border-radius:14px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; }
  .irr-modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--border); }
  .irr-modal-title { font-size:15px; font-weight:600; }
  .irr-modal-close { width:28px; height:28px; border-radius:6px; border:1px solid var(--border); background:var(--surface2); color:var(--muted); cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; }
  .irr-modal-body { padding:24px; display:flex; flex-direction:column; gap:16px; }
  .irr-field { display:flex; flex-direction:column; gap:6px; }
  .irr-field label { font-size:11px; font-family:var(--mono); color:var(--muted); text-transform:uppercase; letter-spacing:.6px; }
  .irr-field input {
    background:var(--surface2); border:1px solid var(--border); border-radius:8px;
    color:var(--text); font-family:var(--mono); font-size:13px; padding:10px 12px;
    outline:none; transition:border-color .15s; width:100%;
  }
  .irr-field input:focus{border-color:var(--green3)}
  .irr-field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .irr-map-pick { height:220px; border-radius:8px; overflow:hidden; border:1px solid var(--border); margin-top:4px; position:relative; }
  .irr-map-hint { font-size:11px; color:var(--muted); font-family:var(--mono); margin-top:4px; }
  .irr-modal-footer { padding:16px 24px; border-top:1px solid var(--border); display:flex; gap:10px; justify-content:flex-end; }
  .irr-btn-cancel { font-size:12px; font-family:var(--mono); padding:8px 16px; border-radius:8px; border:1px solid var(--border); color:var(--muted); background:var(--surface2); cursor:pointer; }
  .irr-btn-save   { font-size:12px; font-family:var(--mono); padding:8px 20px; border-radius:8px; border:1px solid var(--green3); color:var(--green); background:var(--green-dim); cursor:pointer; font-weight:500; }
  .irr-btn-save:hover{background:#0d3d0d}
`;

// ─── Chart options ────────────────────────────────────────────────────────────
const lineOptions = {
  responsive: true, animation: { duration: 300 },
  plugins: { legend: { display: false }, tooltip: { backgroundColor:"#182018", borderColor:"#1f321f", borderWidth:1, titleColor:"#e2f0e2", bodyColor:"#6b8b6b", titleFont:{family:"IBM Plex Mono",size:11}, bodyFont:{family:"IBM Plex Mono",size:11} } },
  scales: {
    x: { ticks:{color:"#6b8b6b",font:{family:"IBM Plex Mono",size:10}}, grid:{color:"rgba(31,50,31,.6)"} },
    y: { ticks:{color:"#6b8b6b",font:{family:"IBM Plex Mono",size:10}}, grid:{color:"rgba(31,50,31,.6)"}, min:0, max:100 },
  },
};
const barOptions = {
  responsive: true, animation: { duration: 300 },
  plugins: { legend:{display:false}, tooltip:{ backgroundColor:"#182018", borderColor:"#1f321f", borderWidth:1, titleColor:"#e2f0e2", bodyColor:"#6b8b6b", titleFont:{family:"IBM Plex Mono",size:11}, bodyFont:{family:"IBM Plex Mono",size:11}, callbacks:{label:(ctx)=>` ${ctx.parsed.y.toFixed(1)} L`} } },
  scales: {
    x: { ticks:{color:"#6b8b6b",font:{family:"IBM Plex Mono",size:9}}, grid:{color:"rgba(31,50,31,.6)"} },
    y: { ticks:{color:"#6b8b6b",font:{family:"IBM Plex Mono",size:10}}, grid:{color:"rgba(31,50,31,.6)"}, beginAtZero:true },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isOffline(lastSeen) {
  if (!lastSeen) return true;
  return (Date.now() - new Date(lastSeen).getTime()) / 1000 > 120;
}
function getStatusBadgeClass(status) {
  if (!status) return "irr-badge-off";
  const s = status.toUpperCase();
  if (s.includes("SMART"))  return "irr-badge-smart";
  if (s.includes("AUTO"))   return "irr-badge-auto";
  if (s.includes("MANUAL") && !s.includes("OFF")) return "irr-badge-manual";
  return "irr-badge-off";
}

// ─── Map picker component (Leaflet) ───────────────────────────────────────────
function MapPicker({ lat, lng, onChange, containerId }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    loadLeaflet().then(() => {
      const L = window.L;
      if (!L || mapRef.current) return;

      const defaultLat = lat || 35.1722;
      const defaultLng = lng || 8.8306;

      const map = L.map(containerId).setView([defaultLat, defaultLng], 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      marker.on("dragend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        onChange(lat, lng);
      });
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current   = map;
      markerRef.current = marker;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [containerId]);

  return null;
}

// ─── Small read-only map preview ─────────────────────────────────────────────
function MapPreview({ lat, lng, containerId }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;
    loadLeaflet().then(() => {
      const L = window.L;
      if (!L || mapRef.current) return;

      const map = L.map(containerId, { zoomControl: false, dragging: false, scrollWheelZoom: false })
        .setView([lat, lng], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      L.marker([lat, lng]).addTo(map);
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [lat, lng, containerId]);

  return null;
}

// ─── Farm Modal ───────────────────────────────────────────────────────────────
function FarmModal({ farm, onClose, onSave }) {
  const [name,     setName]     = useState(farm?.name     || "");
  const [location, setLocation] = useState(farm?.location || "");
  const [lat,      setLat]      = useState(farm?.lat      || null);
  const [lng,      setLng]      = useState(farm?.lng      || null);
  const mapId = `modal-map-${Date.now()}`;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), location: location.trim(), lat, lng });
  };

  return (
    <div className="irr-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="irr-modal">
        <div className="irr-modal-head">
          <div className="irr-modal-title">{farm ? "Edit Farm" : "Add New Farm"}</div>
          <button className="irr-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="irr-modal-body">
          <div className="irr-field">
            <label>Farm Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ferme Nord" />
          </div>
          <div className="irr-field">
            <label>Location Description</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kasserine, Tunisie" />
          </div>
          <div className="irr-field-row">
            <div className="irr-field">
              <label>Latitude</label>
              <input type="number" step="0.0001" value={lat || ""} onChange={(e) => setLat(parseFloat(e.target.value))} placeholder="35.1722" />
            </div>
            <div className="irr-field">
              <label>Longitude</label>
              <input type="number" step="0.0001" value={lng || ""} onChange={(e) => setLng(parseFloat(e.target.value))} placeholder="8.8306" />
            </div>
          </div>
          <div className="irr-field">
            <label>Pick on Map</label>
            <div className="irr-map-pick" id={mapId}>
              <MapPicker lat={lat} lng={lng} containerId={mapId} onChange={(la, ln) => { setLat(+la.toFixed(5)); setLng(+ln.toFixed(5)); }} />
            </div>
            <div className="irr-map-hint">Click anywhere on the map or drag the marker to set the farm location.</div>
          </div>
        </div>
        <div className="irr-modal-footer">
          <button className="irr-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="irr-btn-save"   onClick={handleSave}>Save Farm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Zone Modal ───────────────────────────────────────────────────────────
function AddZoneModal({ farmId, onClose, onSave }) {
  const [zoneNum, setZoneNum] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!zoneNum) { setError("Zone number is required"); return; }
    onSave(farmId, parseInt(zoneNum), zoneName);
  };

  return (
    <div className="irr-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="irr-modal">
        <div className="irr-modal-head">
          <div className="irr-modal-title">Add Zone to Farm</div>
          <button className="irr-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="irr-modal-body">
          <div className="irr-field">
            <label>Zone Number *</label>
            <input type="number" min="1" value={zoneNum} onChange={(e) => { setZoneNum(e.target.value); setError(""); }} placeholder="e.g. 4" />
            {error && <span style={{color:"var(--red)",fontSize:11,fontFamily:"var(--mono)"}}>{error}</span>}
          </div>
          <div className="irr-field">
            <label>Zone Name (optional)</label>
            <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="e.g. Parcelle Nord" />
          </div>
        </div>
        <div className="irr-modal-footer">
          <button className="irr-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="irr-btn-save"   onClick={handleSave}>Add Zone</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab]     = useState("overview");
  const [zones, setZones]             = useState([]);
  const [allZones, setAllZones]       = useState([]);
  const [farms, setFarms]             = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("all");
  const [alerts, setAlerts]           = useState([]);
  const [historyRecords, setHistory]  = useState([]);
  const [histFilter, setHistFilter]   = useState("all");
  const [historyData, setHistoryData] = useState({ time: [], moisture: [], temperature: [] });
  const [waterStats, setWaterStats]   = useState(null);
  const [weather, setWeather]         = useState(null);
  const [irrigating, setIrrigating]   = useState({});

  // Modal states
  const [showFarmModal, setShowFarmModal]   = useState(false);
  const [editingFarm, setEditingFarm]       = useState(null);
  const [showZoneModal, setShowZoneModal]   = useState(false);
  const [zoneModalFarmId, setZoneModalFarmId] = useState(null);

  // ── Fetch farms ────────────────────────────────────────────────────────────
  const fetchFarms = useCallback(() => {
    API.get("/farms").then((r) => setFarms(r.data)).catch(console.error);
  }, []);

  useEffect(() => { fetchFarms(); }, [fetchFarms]);

  // ── Fetch all zones (for overview) ─────────────────────────────────────────
  useEffect(() => {
    const fetch = () => {
      const url = selectedFarm === "all" ? "/zones" : `/zones?farm=${selectedFarm}`;
      API.get(url)
        .then((res) => {
          const clean = res.data.map((z) => ({
            zone:        Number(z.zone),
            name:        z.name || `Zone ${z.zone}`,
            moisture:    Number(z.moisture),
            temperature: Number(z.temperature || 0),
            last_seen:   z.last_seen,
            farm_id:     z.farm_id,
          }));
          setZones(clean);
          if (selectedFarm === "all") setAllZones(clean);

          const avgM = clean.length ? clean.reduce((s, z) => s + z.moisture,    0) / clean.length : 0;
          const avgT = clean.length ? clean.reduce((s, z) => s + z.temperature, 0) / clean.length : 0;
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
  }, [selectedFarm]);

  // ── Fetch alerts, history, water stats, weather ───────────────────────────
  useEffect(() => {
    const f = () => API.get("/alerts").then((r) => setAlerts(r.data)).catch(console.error);
    f(); const id = setInterval(f, 5000); return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const f = () => API.get("/history").then((r) => setHistory(r.data)).catch(console.error);
    f(); const id = setInterval(f, 5000); return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const f = () => API.get("/water-stats").then((r) => setWaterStats(r.data)).catch(console.error);
    f(); const id = setInterval(f, 30000); return () => clearInterval(id);
  }, []);
  useEffect(() => {
    API.get("/weather").then((r) => setWeather(r.data)).catch(console.error);
  }, []);

  // ── Manual irrigation ──────────────────────────────────────────────────────
  const handleManual = useCallback((zone, onOff) => {
    const status = onOff === "ON" ? "MANUAL ON" : "MANUAL OFF";
    setIrrigating((prev) => ({ ...prev, [zone]: onOff }));
    API.post("/irrigation", { zone, status })
      .then(() => setTimeout(() => setIrrigating((prev) => ({ ...prev, [zone]: null })), 3000))
      .catch(() => setIrrigating((prev) => ({ ...prev, [zone]: null })));
  }, []);

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.REACT_APP_API_URL}/api/export/csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `irrigation_history_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href); })
      .catch(console.error);
  };

  // ── Farm CRUD ──────────────────────────────────────────────────────────────
  const handleSaveFarm = (data) => {
    const req = editingFarm
      ? API.put(`/farms/${editingFarm.id}`, data)
      : API.post("/farms", data);
    req.then(() => { fetchFarms(); setShowFarmModal(false); setEditingFarm(null); }).catch(console.error);
  };

  const handleDeleteFarm = (id) => {
    if (!window.confirm("Delete this farm? Its zones will be unassigned.")) return;
    API.delete(`/farms/${id}`).then(fetchFarms).catch(console.error);
  };

  // ── Zone CRUD ──────────────────────────────────────────────────────────────
  const handleAddZone = (farmId, zone, name) => {
    API.post(`/farms/${farmId}/zones`, { zone, name })
      .then(() => { fetchFarms(); setShowZoneModal(false); })
      .catch((err) => alert(err.response?.data?.error || "Error adding zone"));
  };

  const handleDeleteZone = (farmId, zoneNum) => {
    if (!window.confirm(`Delete Zone ${zoneNum}? This also removes its sensor history link.`)) return;
    API.delete(`/farms/${farmId}/zones/${zoneNum}`).then(fetchFarms).catch(console.error);
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const avgMoisture  = zones.length ? Math.round(zones.reduce((s, z) => s + z.moisture,    0) / zones.length) : null;
  const avgTemp      = zones.length ? Math.round(zones.reduce((s, z) => s + z.temperature, 0) / zones.length) : null;
  const healthyZones = zones.filter((z) => z.moisture >= 40).length;
  const dryZones     = zones.filter((z) => z.moisture <  40).length;
  const offlineCount = zones.filter((z) => isOffline(z.last_seen)).length;

  const filteredHistory = histFilter === "all" ? historyRecords : historyRecords.filter((r) => r.status === histFilter);

  const lineChartData = {
    labels: historyData.time,
    datasets: [
      { label:"Moisture %",    data:historyData.moisture,    borderColor:"#60a5fa", backgroundColor:"rgba(96,165,250,.08)", tension:0.4, pointRadius:3, pointBackgroundColor:"#60a5fa", borderWidth:2 },
      { label:"Temperature °C", data:historyData.temperature, borderColor:"#fbbf24", backgroundColor:"rgba(251,191,36,.08)",  tension:0.4, pointRadius:3, pointBackgroundColor:"#fbbf24", borderWidth:2 },
    ],
  };

  const weeklyLabels = waterStats?.weekly?.map((r) => new Date(r.day).toLocaleDateString("fr-FR",{month:"short",day:"numeric"})) || [];
  const weeklyLiters = waterStats?.weekly?.map((r) => r.liters) || [];
  const barChartData = {
    labels: weeklyLabels,
    datasets: [{ label:"Liters", data:weeklyLiters, backgroundColor:"rgba(96,165,250,.5)", borderColor:"#60a5fa", borderWidth:1, borderRadius:4 }],
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="irr-app">
      <style>{styles}</style>

      {/* Header */}
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
          <div className="irr-status-pill"><span className="irr-pulse" />Live · 3s</div>
        </div>
      </div>

      {/* Nav */}
      <div className="irr-nav">
        {[
          { id:"overview", label:"Overview" },
          { id:"alerts",   label:<>Alerts <span className="irr-alert-badge">{dryZones}</span></> },
          { id:"history",  label:"History" },
          { id:"farms",    label:`Farms (${farms.length})` },
        ].map(({ id, label }) => (
          <div key={id} className={`irr-tab ${activeTab===id?"active":""}`} onClick={() => setActiveTab(id)}>
            {label}
          </div>
        ))}
      </div>

      {/* ──────────── OVERVIEW ──────────── */}
      {activeTab === "overview" && (
        <div className="irr-content">

          {/* Farm selector */}
          {farms.length > 0 && (
            <div className="irr-farm-bar">
              <div className="irr-farm-label">Farm:</div>
              <div className="irr-farm-pills">
                <div className={`irr-farm-pill ${selectedFarm==="all"?"active":""}`} onClick={() => setSelectedFarm("all")}>All Farms</div>
                {farms.map((f) => (
                  <div key={f.id} className={`irr-farm-pill ${selectedFarm===f.id?"active":""}`} onClick={() => setSelectedFarm(f.id)}>
                    🌾 {f.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="irr-stats">
            <div className="irr-stat-card">
              <div className="irr-stat-label">Avg moisture</div>
              <div className={`irr-stat-value ${avgMoisture!==null&&avgMoisture<40?"irr-val-red":"irr-val-green"}`}>{avgMoisture!=null?`${avgMoisture}%`:"—"}</div>
              <div className="irr-stat-change">avg across zones</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Avg temp</div>
              <div className="irr-stat-value irr-val-amber">{avgTemp!=null?`${avgTemp}°C`:"—"}</div>
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
              <div className="irr-stat-value irr-val-blue">{waterStats!=null?`${waterStats.today.toFixed(1)}L`:"—"}</div>
              <div className="irr-stat-change">@ 2 L/min</div>
            </div>
          </div>

          {/* Charts */}
          <div className="irr-charts-row">
            <div className="irr-chart-card" style={{margin:0}}>
              <div className="irr-card-header">
                <div className="irr-card-title">Moisture & Temperature</div>
                <div className="irr-legend">
                  <div className="irr-legend-item"><div className="irr-legend-dot" style={{background:"#60a5fa"}}/>Moisture %</div>
                  <div className="irr-legend-item"><div className="irr-legend-dot" style={{background:"#fbbf24"}}/>Temp °C</div>
                </div>
              </div>
              <Line data={lineChartData} options={lineOptions} />
            </div>
            <div className="irr-chart-card" style={{margin:0}}>
              <div className="irr-card-header"><div className="irr-card-title">Water — last 7 days</div></div>
              {weeklyLiters.length>0
                ? <Bar data={barChartData} options={barOptions} />
                : <div style={{color:"var(--muted)",fontSize:12,fontFamily:"var(--mono)",paddingTop:20,textAlign:"center"}}>No data yet</div>
              }
            </div>
          </div>

          {/* Zone cards */}
          {zones.length === 0
            ? <div style={{textAlign:"center",padding:"60px 0",color:"var(--muted)",fontFamily:"var(--mono)",fontSize:13}}>
                No zones found. Go to the <strong style={{color:"var(--green)"}}>Farms</strong> tab to add farms and zones.
              </div>
            : <div className="irr-zone-grid">
                {zones.map((z) => {
                  const dry     = z.moisture < 40;
                  const offline = isOffline(z.last_seen);
                  const m       = Math.round(z.moisture);
                  const busy    = irrigating[z.zone];
                  return (
                    <div key={z.zone} className={`irr-zone-card ${offline?"irr-offline-zone":dry?"irr-alert-zone":""}`}>
                      <div className="irr-zone-head">
                        <div>
                          <div className="irr-zone-name">{z.name}</div>
                          <div style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)"}}>#{z.zone}</div>
                        </div>
                        <div className="irr-zone-badges">
                          {offline && <div className="irr-zone-badge irr-badge-offline">OFFLINE</div>}
                          {!offline && <div className={`irr-zone-badge ${dry?"irr-badge-dry":"irr-badge-ok"}`}>{dry?"DRY":"GOOD"}</div>}
                        </div>
                      </div>
                      <div className="irr-zone-metrics">
                        <div className="irr-metric"><div className="irr-metric-label">Moisture</div><div className="irr-metric-val irr-val-water">{m}%</div></div>
                        <div className="irr-metric"><div className="irr-metric-label">Temp</div><div className="irr-metric-val irr-val-amber">{Math.round(z.temperature)}°C</div></div>
                        {z.last_seen && <div className="irr-metric"><div className="irr-metric-label">Last seen</div><div style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>{new Date(z.last_seen).toLocaleTimeString()}</div></div>}
                      </div>
                      <div className="irr-moisture-bar"><div className={`irr-moisture-fill ${dry?"irr-low":""}`} style={{width:`${m}%`}}/></div>
                      <div className="irr-zone-controls">
                        <button className="irr-ctrl-btn on"  disabled={!!busy} onClick={() => handleManual(z.zone,"ON")}>{busy==="ON"?"⏳ ON":"💧 ON"}</button>
                        <button className="irr-ctrl-btn off" disabled={!!busy} onClick={() => handleManual(z.zone,"OFF")}>{busy==="OFF"?"⏳ OFF":"⛔ OFF"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ──────────── ALERTS ──────────── */}
      {activeTab === "alerts" && (
        <div className="irr-content">
          <div className="irr-alerts-header">
            <div className="irr-alerts-title">Active Alerts</div>
            <div className="irr-alert-count-pill">{dryZones+offlineCount} alert{dryZones+offlineCount!==1?"s":""}</div>
          </div>
          <div className="irr-alert-list">
            {dryZones===0 && offlineCount===0 && alerts.length===0
              ? <div className="irr-no-alerts"><div className="irr-no-alerts-icon">✅</div>All zones healthy</div>
              : <>
                  {zones.filter((z)=>isOffline(z.last_seen)).map((z)=>(
                    <div key={`off-${z.zone}`} className="irr-alert-item irr-warning">
                      <div className="irr-alert-icon irr-icon-warn">📡</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">{z.name} — Sensor offline</div>
                        <div className="irr-alert-meta">last seen: {z.last_seen?new Date(z.last_seen).toLocaleString():"never"}</div>
                      </div>
                    </div>
                  ))}
                  {zones.filter((z)=>z.moisture<40&&!isOffline(z.last_seen)).map((z)=>(
                    <div key={z.zone} className="irr-alert-item irr-critical">
                      <div className="irr-alert-icon irr-icon-crit">🌵</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">{z.name} — Low moisture</div>
                        <div className="irr-alert-meta">moisture: {Math.round(z.moisture)}% · temp: {Math.round(z.temperature)}°C</div>
                      </div>
                      <button className="irr-action-btn" onClick={()=>handleManual(z.zone,"ON")}>Irrigate now</button>
                    </div>
                  ))}
                  {zones.filter((z)=>z.temperature>30&&z.moisture>=40&&!isOffline(z.last_seen)).map((z)=>(
                    <div key={`warn-${z.zone}`} className="irr-alert-item irr-warning">
                      <div className="irr-alert-icon irr-icon-warn">🌡️</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">{z.name} — High temperature</div>
                        <div className="irr-alert-meta">temp: {Math.round(z.temperature)}°C · moisture: {Math.round(z.moisture)}%</div>
                      </div>
                      <button className="irr-action-btn" onClick={()=>handleManual(z.zone,"ON")}>Irrigate</button>
                    </div>
                  ))}
                </>
            }
          </div>
        </div>
      )}

      {/* ──────────── HISTORY ──────────── */}
      {activeTab === "history" && (
        <div className="irr-content">
          <div className="irr-hist-controls">
            {[{label:"All",value:"all"},{label:"Smart",value:"SMART ON"},{label:"Manual",value:"MANUAL ON"},{label:"Off",value:"SMART OFF"}].map(({label,value})=>(
              <button key={value} className={`irr-filter-btn ${histFilter===value?"active":""}`} onClick={()=>setHistFilter(value)}>{label}</button>
            ))}
            <button className="irr-export-btn" onClick={handleExportCSV}>⬇ Export CSV</button>
          </div>
          <div className="irr-hist-table">
            <table>
              <thead><tr><th>#</th><th>Zone</th><th>Status</th><th>Duration</th><th>Time</th><th>Reason</th></tr></thead>
              <tbody>
                {filteredHistory.length===0
                  ? <tr><td colSpan={6} className="irr-empty-hist">No records yet</td></tr>
                  : filteredHistory.map((r,i)=>(
                      <tr key={r.id||i}>
                        <td style={{color:"var(--muted)"}}>#{r.id||i+1}</td>
                        <td>Zone {r.zone}</td>
                        <td><span className={`irr-status-badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span></td>
                        <td style={{color:"var(--muted)"}}>{r.duration_seconds?`${r.duration_seconds}s`:"—"}</td>
                        <td>{r.created_at?new Date(r.created_at).toLocaleString():"—"}</td>
                        <td style={{color:"var(--muted)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.reason||"—"}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────── FARMS ──────────── */}
      {activeTab === "farms" && (
        <div className="irr-content">
          <div className="irr-farms-header">
            <div className="irr-farms-title">Farm & Zone Management</div>
            <button className="irr-add-btn" onClick={() => { setEditingFarm(null); setShowFarmModal(true); }}>+ Add Farm</button>
          </div>

          {farms.length === 0
            ? <div style={{textAlign:"center",padding:"80px 0",color:"var(--muted)",fontFamily:"var(--mono)",fontSize:13}}>
                No farms yet. Click <strong style={{color:"var(--green)"}}>+ Add Farm</strong> to create your first farm.
              </div>
            : <div className="irr-farms-grid">
                {farms.map((farm) => (
                  <div key={farm.id} className="irr-farm-card">
                    {/* Farm header */}
                    <div className="irr-farm-card-head">
                      <div className="irr-farm-card-info">
                        <div className="irr-farm-card-name">🌾 {farm.name}</div>
                        <div className="irr-farm-card-loc">{farm.location || "No location set"}</div>
                      </div>
                      <div className="irr-farm-card-actions">
                        <button className="irr-icon-btn" title="Edit" onClick={() => { setEditingFarm(farm); setShowFarmModal(true); }}>✏️</button>
                        <button className="irr-icon-btn del" title="Delete" onClick={() => handleDeleteFarm(farm.id)}>🗑️</button>
                      </div>
                    </div>

                    {/* Map preview */}
                    {farm.lat && farm.lng
                      ? <div className="irr-map-preview" id={`preview-${farm.id}`}>
                          <MapPreview lat={farm.lat} lng={farm.lng} containerId={`preview-${farm.id}`} />
                        </div>
                      : <div className="irr-map-no-loc">📍 No location set — click ✏️ to add</div>
                    }

                    {/* Zones list */}
                    <div className="irr-farm-zones">
                      <div className="irr-farm-zones-head">
                        <div className="irr-farm-zones-title">Zones ({farm.zone_count || 0})</div>
                        <button className="irr-add-btn" style={{fontSize:11,padding:"4px 10px"}} onClick={() => { setZoneModalFarmId(farm.id); setShowZoneModal(true); }}>+ Add Zone</button>
                      </div>
                      <div className="irr-zone-list">
                        {allZones.filter((z) => z.farm_id === farm.id).length === 0
                          ? <div className="irr-no-zones">No zones — click + Add Zone</div>
                          : allZones.filter((z) => z.farm_id === farm.id).map((z) => {
                              const dry     = z.moisture < 40;
                              const offline = isOffline(z.last_seen);
                              return (
                                <div key={z.zone} className="irr-zone-row">
                                  <div>
                                    <div className="irr-zone-row-name">{z.name}</div>
                                    <div className="irr-zone-row-stats">
                                      <span style={{color: offline?"var(--muted)":dry?"var(--red)":"var(--green)"}}>
                                        {offline ? "OFFLINE" : dry ? `DRY ${Math.round(z.moisture)}%` : `GOOD ${Math.round(z.moisture)}%`}
                                      </span>
                                      <span>{Math.round(z.temperature)}°C</span>
                                    </div>
                                  </div>
                                  <button className="irr-zone-del-btn" title="Remove zone" onClick={() => handleDeleteZone(farm.id, z.zone)}>✕</button>
                                </div>
                              );
                            })
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Farm modal ── */}
      {showFarmModal && (
        <FarmModal
          farm={editingFarm}
          onClose={() => { setShowFarmModal(false); setEditingFarm(null); }}
          onSave={handleSaveFarm}
        />
      )}

      {/* ── Add zone modal ── */}
      {showZoneModal && (
        <AddZoneModal
          farmId={zoneModalFarmId}
          onClose={() => setShowZoneModal(false)}
          onSave={handleAddZone}
        />
      )}
    </div>
  );
}