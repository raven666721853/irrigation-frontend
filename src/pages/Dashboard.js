// ============================================================
// FILE: frontend/src/pages/Dashboard.js  (FULL REPLACEMENT)
// ✅ Blue theme
// ✅ Logout works (clears token + navigate)
// ✅ History filter fixed (auto/manual actually filters)
// ✅ No emoji icons in history filter buttons
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

// ─── Leaflet CDN loader ───────────────────────────────────────
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
    script.src    = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

// ─── Styles (Blue Theme) ──────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');

  :root {
    --bg:        #070b14;
    --surface:   #0d1422;
    --surface2:  #111c2e;
    --surface3:  #172338;
    --accent:    #3b82f6;
    --accent2:   #2563eb;
    --accent3:   #1d4ed8;
    --accent-dim:#0d1a3d;
    --cyan:      #22d3ee;
    --amber:     #fbbf24;
    --red:       #f87171;
    --green:     #4ade80;
    --purple:    #a78bfa;
    --text:      #e2e8f8;
    --muted:     #4a6080;
    --border:    #1a2d4a;
    --font:      'Inter', sans-serif;
    --mono:      'IBM Plex Mono', monospace;
  }

  .irr-app * { box-sizing: border-box; margin: 0; padding: 0; }
  .irr-app { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }

  /* ── Header ── */
  .irr-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 28px; border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-wrap: wrap; gap: 10px;
  }
  .irr-logo { display: flex; align-items: center; gap: 12px; }
  .irr-logo-icon {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, var(--accent), var(--cyan));
    border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;
  }
  .irr-logo-text { font-size: 15px; font-weight: 700; letter-spacing: -.3px; color: var(--text); }
  .irr-logo-sub  { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  .irr-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  .irr-weather-pill {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text);
    font-family: var(--mono); background: var(--surface2); padding: 5px 12px;
    border-radius: 20px; border: 1px solid var(--border);
  }
  .irr-status-pill {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--cyan);
    font-family: var(--mono); background: #0a1f2d; padding: 5px 12px;
    border-radius: 20px; border: 1px solid #164e63;
  }
  .irr-pulse { width: 7px; height: 7px; background: var(--cyan); border-radius: 50%; animation: irrPulse 2s infinite; }
  @keyframes irrPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

  .irr-user-chip {
    font-size: 11px; font-family: var(--mono); color: var(--muted);
    background: var(--surface2); padding: 5px 12px; border-radius: 20px;
    border: 1px solid var(--border);
  }
  .irr-header-btn {
    font-size: 12px; font-family: var(--mono); padding: 6px 14px; border-radius: 7px;
    border: 1px solid var(--border); background: var(--surface2); color: var(--muted);
    cursor: pointer; transition: all .15s;
  }
  .irr-header-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
  .irr-logout-btn {
    font-size: 12px; font-family: var(--mono); padding: 6px 14px; border-radius: 7px;
    border: 1px solid #7f1d1d; background: #1a0808; color: #f87171;
    cursor: pointer; font-weight: 600; transition: all .15s;
  }
  .irr-logout-btn:hover { background: #450a0a; }

  /* ── Nav ── */
  .irr-nav {
    display: flex; gap: 0; padding: 0 28px;
    background: var(--surface); border-bottom: 1px solid var(--border); overflow-x: auto;
  }
  .irr-tab {
    padding: 13px 20px; font-size: 13px; font-weight: 500; color: var(--muted);
    cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s;
    user-select: none; display: flex; align-items: center; gap: 7px; white-space: nowrap;
  }
  .irr-tab:hover { color: var(--text); }
  .irr-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .irr-alert-badge {
    background: #2d0d0d; color: #f87171; border-radius: 20px;
    padding: 1px 7px; font-size: 10px; font-family: var(--mono);
  }

  /* ── Content ── */
  .irr-content { padding: 28px; }

  /* ── Farm bar ── */
  .irr-farm-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; }
  .irr-farm-label { font-size: 12px; color: var(--muted); font-family: var(--mono); white-space: nowrap; }
  .irr-farm-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .irr-farm-pill {
    font-size: 12px; font-family: var(--mono); padding: 4px 14px; border-radius: 20px;
    border: 1px solid var(--border); color: var(--muted); background: var(--surface2);
    cursor: pointer; transition: all .15s;
  }
  .irr-farm-pill:hover { border-color: var(--accent2); color: var(--accent); }
  .irr-farm-pill.active { border-color: var(--accent2); color: var(--accent); background: var(--accent-dim); }

  /* ── Stats ── */
  .irr-stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; margin-bottom: 24px; }
  @media(max-width:900px){ .irr-stats{grid-template-columns:repeat(3,1fr)} }
  @media(max-width:600px){ .irr-stats{grid-template-columns:repeat(2,1fr)} }
  .irr-stat-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
    padding: 18px 16px; position: relative; overflow: hidden;
  }
  .irr-stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--cyan));
  }
  .irr-stat-label { font-size: 10px; font-family: var(--mono); color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .irr-stat-value { font-size: 28px; font-weight: 700; line-height: 1; }
  .irr-stat-change { font-size: 11px; color: var(--muted); margin-top: 5px; font-family: var(--mono); }
  .irr-val-blue   { color: var(--accent); }
  .irr-val-cyan   { color: var(--cyan); }
  .irr-val-amber  { color: var(--amber); }
  .irr-val-red    { color: var(--red); }
  .irr-val-green  { color: var(--green); }
  .irr-val-purple { color: var(--purple); }

  /* ── Charts ── */
  .irr-charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 24px; }
  @media(max-width:768px){ .irr-charts-row{grid-template-columns:1fr} }
  .irr-chart-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 20px;
  }
  .irr-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .irr-card-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .irr-legend { display: flex; gap: 16px; flex-wrap: wrap; }
  .irr-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); font-family: var(--mono); }
  .irr-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* ── Zone grid ── */
  .irr-zone-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
  @media(max-width:900px){ .irr-zone-grid{grid-template-columns:repeat(2,1fr)} }
  @media(max-width:600px){ .irr-zone-grid{grid-template-columns:1fr} }

  .irr-zone-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
    padding: 16px; transition: border-color .2s, box-shadow .2s;
  }
  .irr-zone-card:hover { border-color: var(--accent2); box-shadow: 0 0 0 1px var(--accent-dim); }
  .irr-zone-card.irr-alert-zone   { border-color: var(--red);   background: #140a0a; }
  .irr-zone-card.irr-offline-zone { border-color: var(--muted); background: #0e0e12; opacity: .75; }

  .irr-zone-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 6px; }
  .irr-zone-name { font-size: 13px; font-weight: 600; font-family: var(--mono); }
  .irr-zone-badges { display: flex; gap: 4px; flex-wrap: wrap; }
  .irr-zone-badge { font-size: 10px; padding: 2px 9px; border-radius: 20px; font-family: var(--mono); font-weight: 600; }
  .irr-badge-ok      { background: #052e16; color: var(--green);  border: 1px solid #166534; }
  .irr-badge-dry     { background: #2d0d0d; color: var(--red);    border: 1px solid #7f1d1d; }
  .irr-badge-offline { background: #111; color: var(--muted);     border: 1px solid #333; }

  .irr-zone-metrics { display: flex; gap: 16px; margin-bottom: 12px; }
  .irr-metric { flex: 1; }
  .irr-metric-label { font-size: 10px; color: var(--muted); font-family: var(--mono); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
  .irr-metric-val { font-size: 20px; font-weight: 600; }
  .irr-val-water { color: var(--accent); }

  .irr-moisture-bar { margin-top: 6px; height: 4px; background: var(--surface3); border-radius: 2px; }
  .irr-moisture-fill { height: 100%; border-radius: 2px; transition: width .6s; background: linear-gradient(90deg, var(--accent), var(--cyan)); }
  .irr-moisture-fill.irr-low { background: var(--red); }

  .irr-zone-controls { display: flex; gap: 8px; margin-top: 12px; }
  .irr-ctrl-btn {
    flex: 1; font-size: 11px; font-family: var(--mono); padding: 6px 0;
    border-radius: 7px; border: 1px solid var(--border); color: var(--muted);
    background: var(--surface3); cursor: pointer; transition: all .15s; text-align: center; font-weight: 500;
  }
  .irr-ctrl-btn:hover { opacity: .85; }
  .irr-ctrl-btn.on  { border-color: var(--accent2); color: var(--accent); background: var(--accent-dim); }
  .irr-ctrl-btn.off { border-color: #7f1d1d; color: var(--red); background: #2d0d0d; }
  .irr-ctrl-btn:disabled { opacity: .35; cursor: not-allowed; }

  /* ── Alerts ── */
  .irr-alerts-header { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
  .irr-alerts-title { font-size: 15px; font-weight: 600; }
  .irr-alert-count-pill {
    background: #2d0d0d; color: var(--red); border: 1px solid #7f1d1d;
    border-radius: 20px; padding: 2px 12px; font-size: 12px; font-family: var(--mono);
  }
  .irr-alert-list { display: flex; flex-direction: column; gap: 10px; }
  .irr-alert-item {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
    padding: 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }
  .irr-alert-item.irr-critical { border-left: 3px solid var(--red); }
  .irr-alert-item.irr-warning  { border-left: 3px solid var(--amber); }
  .irr-alert-icon { width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
  .irr-icon-crit { background: #2d0d0d; }
  .irr-icon-warn { background: #2d1f0d; }
  .irr-alert-body { flex: 1; min-width: 150px; }
  .irr-alert-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
  .irr-alert-meta  { font-size: 12px; color: var(--muted); font-family: var(--mono); }
  .irr-action-btn {
    font-size: 11px; font-family: var(--mono); padding: 6px 14px; border-radius: 7px;
    border: 1px solid var(--accent2); color: var(--accent); background: var(--accent-dim);
    cursor: pointer; white-space: nowrap; font-weight: 600;
  }
  .irr-no-alerts { text-align: center; padding: 60px; color: var(--muted); font-size: 14px; }
  .irr-no-alerts-icon { font-size: 44px; margin-bottom: 14px; opacity: .5; }

  /* ── History ── */
  .irr-hist-controls { display: flex; gap: 8px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
  .irr-filter-btn {
    font-size: 12px; font-family: var(--mono); padding: 6px 16px; border-radius: 7px;
    border: 1px solid var(--border); color: var(--muted); background: var(--surface2);
    cursor: pointer; transition: all .2s; font-weight: 500;
  }
  .irr-filter-btn:hover { border-color: var(--accent2); color: var(--accent); }
  .irr-filter-btn.active { border-color: var(--accent2); color: var(--accent); background: var(--accent-dim); }
  .irr-export-btn {
    margin-left: auto; font-size: 12px; font-family: var(--mono); padding: 6px 16px;
    border-radius: 7px; border: 1px solid var(--cyan); color: var(--cyan);
    background: #0a1f2d; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 6px;
  }
  .irr-export-btn:hover { background: #0d2a3d; }

  .irr-hist-table { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; overflow: auto; }
  .irr-hist-table table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 700px; }
  .irr-hist-table th {
    font-size: 10px; font-family: var(--mono); color: var(--muted); padding: 12px 16px;
    text-align: left; border-bottom: 1px solid var(--border); text-transform: uppercase;
    letter-spacing: .8px; white-space: nowrap; background: var(--surface3);
  }
  .irr-hist-table td { font-size: 12px; padding: 11px 16px; border-bottom: 1px solid var(--border); font-family: var(--mono); vertical-align: top; }
  .irr-hist-table tr:last-child td { border-bottom: none; }
  .irr-hist-table tr:hover td { background: var(--surface3); }

  .irr-status-badge { font-size: 10px; padding: 2px 9px; border-radius: 20px; font-weight: 600; }
  .irr-badge-smart  { background: #1a0d2d; color: var(--purple); border: 1px solid #5b21b6; }
  .irr-badge-auto   { background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent3); }
  .irr-badge-manual { background: #0a1f2d; color: var(--cyan); border: 1px solid #164e63; }
  .irr-badge-off    { background: #111; color: var(--muted); border: 1px solid #333; }
  .irr-empty-hist { text-align: center; padding: 40px; color: var(--muted); font-size: 13px; }

  /* ── Farms ── */
  .irr-farms-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 10px; }
  .irr-farms-title  { font-size: 15px; font-weight: 600; }
  .irr-add-btn {
    font-size: 12px; font-family: var(--mono); padding: 7px 18px; border-radius: 8px;
    border: 1px solid var(--accent2); color: var(--accent); background: var(--accent-dim);
    cursor: pointer; transition: all .15s; font-weight: 600;
  }
  .irr-add-btn:hover { background: #0d2050; }

  .irr-farms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px,1fr)); gap: 18px; }
  .irr-farm-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: border-color .2s; }
  .irr-farm-card:hover { border-color: var(--accent2); }
  .irr-farm-card-head { padding: 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .irr-farm-card-info { flex: 1; min-width: 0; }
  .irr-farm-card-name { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
  .irr-farm-card-loc  { font-size: 11px; color: var(--muted); font-family: var(--mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .irr-farm-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .irr-icon-btn {
    width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border);
    background: var(--surface3); color: var(--muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 13px; transition: all .15s;
  }
  .irr-icon-btn:hover { border-color: var(--accent2); color: var(--accent); }
  .irr-icon-btn.del:hover { border-color: #7f1d1d; color: var(--red); }

  .irr-map-preview { height: 160px; width: 100%; background: var(--surface3); position: relative; }
  .irr-map-no-loc  { height: 120px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; font-family: var(--mono); background: var(--surface3); }

  .irr-farm-zones { padding: 14px 16px; }
  .irr-farm-zones-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .irr-farm-zones-title { font-size: 11px; color: var(--muted); font-family: var(--mono); text-transform: uppercase; letter-spacing: .8px; }
  .irr-zone-list { display: flex; flex-direction: column; gap: 6px; }
  .irr-zone-row {
    display: flex; align-items: center; justify-content: space-between; padding: 9px 12px;
    background: var(--surface3); border-radius: 8px; border: 1px solid var(--border);
  }
  .irr-zone-row-name { font-size: 12px; font-family: var(--mono); font-weight: 500; }
  .irr-zone-row-stats { font-size: 11px; color: var(--muted); font-family: var(--mono); display: flex; gap: 12px; margin-top: 2px; }
  .irr-zone-del-btn {
    width: 22px; height: 22px; border-radius: 4px; border: 1px solid transparent;
    background: transparent; color: var(--muted); cursor: pointer; font-size: 12px;
    display: flex; align-items: center; justify-content: center; transition: all .15s;
  }
  .irr-zone-del-btn:hover { border-color: #7f1d1d; color: var(--red); background: #2d0d0d; }
  .irr-no-zones { font-size: 12px; color: var(--muted); font-family: var(--mono); text-align: center; padding: 14px 0; }

  /* ── Modal ── */
  .irr-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 1000;
    display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(6px);
  }
  .irr-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
  .irr-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 26px; border-bottom: 1px solid var(--border); }
  .irr-modal-title { font-size: 15px; font-weight: 700; }
  .irr-modal-close { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface2); color: var(--muted); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
  .irr-modal-body { padding: 24px 26px; display: flex; flex-direction: column; gap: 16px; }
  .irr-field { display: flex; flex-direction: column; gap: 6px; }
  .irr-field label { font-size: 11px; font-family: var(--mono); color: var(--muted); text-transform: uppercase; letter-spacing: .7px; }
  .irr-field input {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-family: var(--mono); font-size: 13px; padding: 10px 13px;
    outline: none; transition: border-color .15s; width: 100%;
  }
  .irr-field input:focus { border-color: var(--accent2); }
  .irr-map-hint { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 4px; }
  .irr-modal-footer { padding: 16px 26px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
  .irr-btn-cancel { font-size: 12px; font-family: var(--mono); padding: 8px 18px; border-radius: 8px; border: 1px solid var(--border); color: var(--muted); background: var(--surface2); cursor: pointer; }
  .irr-btn-save   { font-size: 12px; font-family: var(--mono); padding: 8px 22px; border-radius: 8px; border: 1px solid var(--accent2); color: var(--accent); background: var(--accent-dim); cursor: pointer; font-weight: 600; }
  .irr-btn-save:hover { background: #0d2050; }
`;

// ─── Chart options (blue theme) ───────────────────────────────
const chartTooltip = {
  backgroundColor: "#111c2e", borderColor: "#1a2d4a", borderWidth: 1,
  titleColor: "#e2e8f8", bodyColor: "#4a6080",
  titleFont: { family: "IBM Plex Mono", size: 11 },
  bodyFont:  { family: "IBM Plex Mono", size: 11 },
};
const lineOptions = {
  responsive: true, animation: { duration: 300 },
  plugins: { legend: { display: false }, tooltip: chartTooltip },
  scales: {
    x: { ticks: { color: "#4a6080", font: { family: "IBM Plex Mono", size: 10 } }, grid: { color: "rgba(26,45,74,.5)" } },
    y: { ticks: { color: "#4a6080", font: { family: "IBM Plex Mono", size: 10 } }, grid: { color: "rgba(26,45,74,.5)" }, min: 0, max: 100 },
  },
};
const barOptions = {
  responsive: true, animation: { duration: 300 },
  plugins: { legend: { display: false }, tooltip: { ...chartTooltip, callbacks: { label: (ctx) => ` ${ctx.parsed.y.toFixed(1)} L` } } },
  scales: {
    x: { ticks: { color: "#4a6080", font: { family: "IBM Plex Mono", size: 9 } }, grid: { color: "rgba(26,45,74,.5)" } },
    y: { ticks: { color: "#4a6080", font: { family: "IBM Plex Mono", size: 10 } }, grid: { color: "rgba(26,45,74,.5)" }, beginAtZero: true },
  },
};

// ─── Helpers ──────────────────────────────────────────────────
function isOffline(lastSeen) {
  if (!lastSeen) return true;
  return (Date.now() - new Date(lastSeen).getTime()) / 1000 > 120;
}
function getStatusBadgeClass(status) {
  if (!status) return "irr-badge-off";
  const s = status.toUpperCase();
  if (s.includes("SMART"))                          return "irr-badge-smart";
  if (s.includes("MANUAL") && !s.includes("OFF"))  return "irr-badge-manual";
  if (s.includes("OFF"))                            return "irr-badge-off";
  return "irr-badge-auto";
}

// ─── MapPicker ────────────────────────────────────────────────
function MapPicker({ lat, lng, onChange, containerId }) {
  const mapRef = useRef(null);
  useEffect(() => {
    loadLeaflet().then(() => {
      const L = window.L;
      if (!L || mapRef.current) return;
      const map = L.map(containerId).setView([lat || 35.1722, lng || 8.8306], 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM", maxZoom: 18 }).addTo(map);
      const marker = L.marker([lat || 35.1722, lng || 8.8306], { draggable: true }).addTo(map);
      marker.on("dragend", (e) => { const p = e.target.getLatLng(); onChange(p.lat, p.lng); });
      map.on("click", (e) => { marker.setLatLng(e.latlng); onChange(e.latlng.lat, e.latlng.lng); });
      mapRef.current = map;
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [containerId]);
  return null;
}

// ─── MapPreview ───────────────────────────────────────────────
function MapPreview({ lat, lng, containerId }) {
  const mapRef = useRef(null);
  useEffect(() => {
    if (!lat || !lng) return;
    loadLeaflet().then(() => {
      const L = window.L;
      if (!L || mapRef.current) return;
      const map = L.map(containerId, { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView([lat, lng], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      L.marker([lat, lng]).addTo(map);
      mapRef.current = map;
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng, containerId]);
  return null;
}

// ─── FarmModal ────────────────────────────────────────────────
function FarmModal({ farm, onClose, onSave }) {
  const [name,     setName]     = useState(farm?.name     || "");
  const [location, setLocation] = useState(farm?.location || "");
  const [lat,      setLat]      = useState(farm?.lat      || 35.1722);
  const [lng,      setLng]      = useState(farm?.lng      || 8.8306);
  const [saving,   setSaving]   = useState(false);
  const [locating, setLocating] = useState(false);
  const [error,    setError]    = useState("");
  const mapId     = useRef(`farm-map-${Math.random().toString(36).slice(2)}`).current;
  const mapRef    = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    loadLeaflet().then(() => {
      const L = window.L;
      if (!L) return;
      const init = () => {
        const el = document.getElementById(mapId);
        if (!el) { setTimeout(init, 50); return; }
        if (mapRef.current) return;
        const iLat = farm?.lat || 35.1722;
        const iLng = farm?.lng || 8.8306;
        const map = L.map(mapId).setView([iLat, iLng], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM", maxZoom: 18 }).addTo(map);
        const marker = L.marker([iLat, iLng], { draggable: true }).addTo(map);
        marker.on("dragend", (e) => { const p = e.target.getLatLng(); setLat(+p.lat.toFixed(5)); setLng(+p.lng.toFixed(5)); });
        map.on("click", (e) => { marker.setLatLng(e.latlng); setLat(+e.latlng.lat.toFixed(5)); setLng(+e.latlng.lng.toFixed(5)); });
        mapRef.current = map; markerRef.current = marker;
      };
      setTimeout(init, 100);
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; } };
  }, []);

  useEffect(() => {
    if (markerRef.current && lat && lng) { markerRef.current.setLatLng([lat, lng]); mapRef.current?.panTo([lat, lng]); }
  }, [lat, lng]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = +pos.coords.latitude.toFixed(5);
        const ln = +pos.coords.longitude.toFixed(5);
        setLat(la); setLng(ln); setLocating(false);
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json`)
          .then(r => r.json())
          .then(d => { const c = d.address?.city || d.address?.town || d.address?.village || ""; const co = d.address?.country || ""; if (c || co) setLocation(`${c}${c && co ? ", " : ""}${co}`); })
          .catch(() => {});
      },
      (err) => { setLocating(false); alert("Location error: " + err.message); }
    );
  };

  const handleSave = () => {
    if (!name.trim()) { setError("Farm name is required"); return; }
    setSaving(true);
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
            <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Ferme Nord" autoFocus />
            {error && <span style={{ color:"var(--red)", fontSize:11, fontFamily:"var(--mono)" }}>{error}</span>}
          </div>
          <div className="irr-field">
            <label>Location Description</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kasserine, Tunisie" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10, alignItems:"end" }}>
            <div className="irr-field">
              <label>Latitude</label>
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="irr-field">
              <label>Longitude</label>
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(parseFloat(e.target.value) || 0)} />
            </div>
            <button onClick={handleLocateMe} disabled={locating}
              style={{ padding:"10px 12px", borderRadius:8, border:"1px solid var(--accent)", background:"var(--accent-dim)", color:"var(--accent)", cursor:"pointer", fontFamily:"var(--mono)", fontSize:11, whiteSpace:"nowrap", opacity: locating ? 0.6 : 1 }}>
              {locating ? "Locating..." : "Use My Location"}
            </button>
          </div>
          <div className="irr-field">
            <label>Pick on Map — click to set location</label>
            <div id={mapId} style={{ height:220, borderRadius:8, overflow:"hidden", border:"1px solid var(--border)", marginTop:4, background:"var(--surface3)" }} />
            <div className="irr-map-hint">{lat?.toFixed(4)}, {lng?.toFixed(4)} — click map or drag marker</div>
          </div>
        </div>
        <div className="irr-modal-footer">
          <button className="irr-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="irr-btn-save" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : farm ? "Update Farm" : "Save Farm"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── AddZoneModal ─────────────────────────────────────────────
function AddZoneModal({ farmId, onClose, onSave }) {
  const [zoneNum,  setZoneNum]  = useState("");
  const [zoneName, setZoneName] = useState("");
  const [error,    setError]    = useState("");
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
            {error && <span style={{ color:"var(--red)", fontSize:11, fontFamily:"var(--mono)" }}>{error}</span>}
          </div>
          <div className="irr-field">
            <label>Zone Name (optional)</label>
            <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="e.g. Parcelle Nord" />
          </div>
        </div>
        <div className="irr-modal-footer">
          <button className="irr-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="irr-btn-save" onClick={handleSave}>Add Zone</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function Dashboard({ setIsAuth }) {
  const navigate = useNavigate();

  const [activeTab,     setActiveTab]     = useState("overview");
  const [zones,         setZones]         = useState([]);
  const [allZones,      setAllZones]      = useState([]);
  const [farms,         setFarms]         = useState([]);
  const [selectedFarm,  setSelectedFarm]  = useState("all");
  const [alerts,        setAlerts]        = useState([]);
  const [historyRecords,setHistory]       = useState([]);
  const [histFilter,    setHistFilter]    = useState("all");
  const [historyData,   setHistoryData]   = useState({ time: [], moisture: [], temperature: [] });
  const [waterStats,    setWaterStats]    = useState(null);
  const [weather,       setWeather]       = useState(null);
  const [irrigating,    setIrrigating]    = useState({});
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [editingFarm,   setEditingFarm]   = useState(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneModalFarmId, setZoneModalFarmId] = useState(null);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (setIsAuth) setIsAuth(false);
    navigate("/login");
  };

  // ── Farms ─────────────────────────────────────────────────
  const fetchFarms = useCallback(() => {
    API.get("/farms").then((r) => setFarms(r.data)).catch(console.error);
  }, []);
  useEffect(() => { fetchFarms(); }, [fetchFarms]);

  // ── Zones ─────────────────────────────────────────────────
  useEffect(() => {
    const load = () => {
      const url = selectedFarm === "all" ? "/zones" : `/zones?farm=${selectedFarm}`;
      API.get(url).then((res) => {
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
      }).catch(console.error);
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [selectedFarm]);

  // ── Alerts ────────────────────────────────────────────────
  useEffect(() => {
    const f = () => API.get("/alerts").then((r) => setAlerts(r.data)).catch(console.error);
    f(); const id = setInterval(f, 5000); return () => clearInterval(id);
  }, []);

  // ── History — re-fetches when histFilter changes ──────────
  useEffect(() => {
    const f = () => {
      const url = histFilter === "all" ? "/history" : `/history?filter=${histFilter}`;
      API.get(url).then((r) => setHistory(r.data)).catch(console.error);
    };
    f();
    const id = setInterval(f, 5000);
    return () => clearInterval(id);
  }, [histFilter]);

  // ── Water stats ───────────────────────────────────────────
  useEffect(() => {
    const f = () => API.get("/water-stats").then((r) => setWaterStats(r.data)).catch(console.error);
    f(); const id = setInterval(f, 30000); return () => clearInterval(id);
  }, []);

  // ── Weather ───────────────────────────────────────────────
  useEffect(() => {
    API.get("/weather").then((r) => setWeather(r.data)).catch(console.error);
  }, []);

  // ── Manual irrigation ─────────────────────────────────────
  const handleManual = useCallback((zone, onOff) => {
    setIrrigating((prev) => ({ ...prev, [zone]: onOff }));
    API.post("/irrigation", { zone, action: onOff.toLowerCase() })
      .then(() => setTimeout(() => setIrrigating((prev) => ({ ...prev, [zone]: null })), 3000))
      .catch(() => setIrrigating((prev) => ({ ...prev, [zone]: null })));
  }, []);

  // ── CSV export ────────────────────────────────────────────
  const handleExportCSV = () => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.REACT_APP_API_URL}/api/export/csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `irrigation_history_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href); })
      .catch(console.error);
  };

  // ── Farm CRUD ─────────────────────────────────────────────
  const handleSaveFarm = (data) => {
    const req = editingFarm ? API.put(`/farms/${editingFarm.id}`, data) : API.post("/farms", data);
    req.then(() => { fetchFarms(); setShowFarmModal(false); setEditingFarm(null); }).catch(console.error);
  };
  const handleDeleteFarm = (id) => {
    if (!window.confirm("Delete this farm? Its zones will be unassigned.")) return;
    API.delete(`/farms/${id}`).then(fetchFarms).catch(console.error);
  };

  // ── Zone CRUD ─────────────────────────────────────────────
  const handleAddZone = (farmId, zone, name) => {
    API.post(`/farms/${farmId}/zones`, { zone, name })
      .then(() => { fetchFarms(); setShowZoneModal(false); })
      .catch((err) => alert(err.response?.data?.error || "Error adding zone"));
  };
  const handleDeleteZone = (farmId, zoneNum) => {
    if (!window.confirm(`Delete Zone ${zoneNum}?`)) return;
    API.delete(`/farms/${farmId}/zones/${zoneNum}`).then(fetchFarms).catch(console.error);
  };

  // ── Derived stats ─────────────────────────────────────────
  const avgMoisture  = zones.length ? Math.round(zones.reduce((s, z) => s + z.moisture,    0) / zones.length) : null;
  const avgTemp      = zones.length ? Math.round(zones.reduce((s, z) => s + z.temperature, 0) / zones.length) : null;
  const healthyZones = zones.filter((z) => z.moisture >= 40).length;
  const dryZones     = zones.filter((z) => z.moisture <  40).length;
  const offlineCount = zones.filter((z) => isOffline(z.last_seen)).length;

  const lineChartData = {
    labels: historyData.time,
    datasets: [
      { label:"Moisture %",     data:historyData.moisture,    borderColor:"#3b82f6", backgroundColor:"rgba(59,130,246,.08)", tension:0.4, pointRadius:3, pointBackgroundColor:"#3b82f6", borderWidth:2 },
      { label:"Temperature °C", data:historyData.temperature, borderColor:"#fbbf24", backgroundColor:"rgba(251,191,36,.08)",  tension:0.4, pointRadius:3, pointBackgroundColor:"#fbbf24", borderWidth:2 },
    ],
  };
  const weeklyLabels = waterStats?.weekly?.map((r) => new Date(r.day).toLocaleDateString("fr-FR",{month:"short",day:"numeric"})) || [];
  const weeklyLiters = waterStats?.weekly?.map((r) => r.liters) || [];
  const barChartData = {
    labels: weeklyLabels,
    datasets: [{ label:"Liters", data:weeklyLiters, backgroundColor:"rgba(59,130,246,.45)", borderColor:"#3b82f6", borderWidth:1, borderRadius:5 }],
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="irr-app">
      <style>{styles}</style>

      {/* Header */}
      <div className="irr-header">
        <div className="irr-logo">
          <div className="irr-logo-icon">💧</div>
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
          {currentUser?.name && <div className="irr-user-chip">👤 {currentUser.name}</div>}
          <button className="irr-header-btn" onClick={() => navigate("/admin")}>Admin</button>
          <button className="irr-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Nav */}
      <div className="irr-nav">
        {[
          { id:"overview", label:"Overview" },
          { id:"alerts",   label:<>Alerts <span className="irr-alert-badge">{dryZones + offlineCount}</span></> },
          { id:"history",  label:"History" },
          { id:"farms",    label:`Farms (${farms.length})` },
        ].map(({ id, label }) => (
          <div key={id} className={`irr-tab ${activeTab===id?"active":""}`} onClick={() => setActiveTab(id)}>
            {label}
          </div>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="irr-content">
          {farms.length > 0 && (
            <div className="irr-farm-bar">
              <div className="irr-farm-label">Farm:</div>
              <div className="irr-farm-pills">
                <div className={`irr-farm-pill ${selectedFarm==="all"?"active":""}`} onClick={() => setSelectedFarm("all")}>All Farms</div>
                {farms.map((f) => (
                  <div key={f.id} className={`irr-farm-pill ${selectedFarm===f.id?"active":""}`} onClick={() => setSelectedFarm(f.id)}>
                    {f.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="irr-stats">
            <div className="irr-stat-card">
              <div className="irr-stat-label">Avg Moisture</div>
              <div className={`irr-stat-value ${avgMoisture!==null&&avgMoisture<40?"irr-val-red":"irr-val-blue"}`}>{avgMoisture!=null?`${avgMoisture}%`:"—"}</div>
              <div className="irr-stat-change">avg across zones</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Avg Temp</div>
              <div className="irr-stat-value irr-val-amber">{avgTemp!=null?`${avgTemp}°C`:"—"}</div>
              <div className="irr-stat-change">current reading</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Healthy Zones</div>
              <div className="irr-stat-value irr-val-green">{healthyZones}</div>
              <div className="irr-stat-change">moisture ≥ 40%</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Dry Alerts</div>
              <div className="irr-stat-value irr-val-red">{dryZones}</div>
              <div className="irr-stat-change">need irrigation</div>
            </div>
            <div className="irr-stat-card">
              <div className="irr-stat-label">Water Today</div>
              <div className="irr-stat-value irr-val-cyan">{waterStats!=null?`${waterStats.today}L`:"—"}</div>
              <div className="irr-stat-change">@ 2 L/min</div>
            </div>
          </div>

          <div className="irr-charts-row">
            <div className="irr-chart-card">
              <div className="irr-card-header">
                <div className="irr-card-title">Moisture & Temperature</div>
                <div className="irr-legend">
                  <div className="irr-legend-item"><div className="irr-legend-dot" style={{background:"#3b82f6"}}/>Moisture %</div>
                  <div className="irr-legend-item"><div className="irr-legend-dot" style={{background:"#fbbf24"}}/>Temp °C</div>
                </div>
              </div>
              <Line data={lineChartData} options={lineOptions} />
            </div>
            <div className="irr-chart-card">
              <div className="irr-card-header"><div className="irr-card-title">Water — last 7 days</div></div>
              {weeklyLiters.length > 0
                ? <Bar data={barChartData} options={barOptions} />
                : <div style={{color:"var(--muted)",fontSize:12,fontFamily:"var(--mono)",paddingTop:20,textAlign:"center"}}>No data yet</div>
              }
            </div>
          </div>

          {zones.length === 0
            ? <div style={{textAlign:"center",padding:"60px 0",color:"var(--muted)",fontFamily:"var(--mono)",fontSize:13}}>
                No zones found. Go to <strong style={{color:"var(--accent)"}}>Farms</strong> tab to add farms and zones.
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
                          {offline  && <div className="irr-zone-badge irr-badge-offline">OFFLINE</div>}
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
                        <button className="irr-ctrl-btn on"  disabled={!!busy} onClick={() => handleManual(z.zone,"ON")}>{busy==="ON"?"Sending...":"Irrigate ON"}</button>
                        <button className="irr-ctrl-btn off" disabled={!!busy} onClick={() => handleManual(z.zone,"OFF")}>{busy==="OFF"?"Sending...":"Stop OFF"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ── ALERTS ── */}
      {activeTab === "alerts" && (
        <div className="irr-content">
          <div className="irr-alerts-header">
            <div className="irr-alerts-title">Active Alerts</div>
            <div className="irr-alert-count-pill">{dryZones + offlineCount} alert{dryZones+offlineCount!==1?"s":""}</div>
          </div>
          <div className="irr-alert-list">
            {dryZones === 0 && offlineCount === 0
              ? <div className="irr-no-alerts"><div className="irr-no-alerts-icon">✅</div>All zones healthy</div>
              : <>
                  {zones.filter((z) => isOffline(z.last_seen)).map((z) => (
                    <div key={`off-${z.zone}`} className="irr-alert-item irr-warning">
                      <div className="irr-alert-icon irr-icon-warn">📡</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">{z.name} — Sensor offline</div>
                        <div className="irr-alert-meta">last seen: {z.last_seen ? new Date(z.last_seen).toLocaleString() : "never"}</div>
                      </div>
                    </div>
                  ))}
                  {zones.filter((z) => z.moisture < 40 && !isOffline(z.last_seen)).map((z) => (
                    <div key={z.zone} className="irr-alert-item irr-critical">
                      <div className="irr-alert-icon irr-icon-crit">🌵</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">{z.name} — Low moisture</div>
                        <div className="irr-alert-meta">moisture: {Math.round(z.moisture)}% · temp: {Math.round(z.temperature)}°C</div>
                      </div>
                      <button className="irr-action-btn" onClick={() => handleManual(z.zone,"ON")}>Irrigate now</button>
                    </div>
                  ))}
                  {zones.filter((z) => z.temperature > 30 && z.moisture >= 40 && !isOffline(z.last_seen)).map((z) => (
                    <div key={`warn-${z.zone}`} className="irr-alert-item irr-warning">
                      <div className="irr-alert-icon irr-icon-warn">🌡️</div>
                      <div className="irr-alert-body">
                        <div className="irr-alert-title">{z.name} — High temperature</div>
                        <div className="irr-alert-meta">temp: {Math.round(z.temperature)}°C · moisture: {Math.round(z.moisture)}%</div>
                      </div>
                      <button className="irr-action-btn" onClick={() => handleManual(z.zone,"ON")}>Irrigate</button>
                    </div>
                  ))}
                </>
            }
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === "history" && (
        <div className="irr-content">
          <div className="irr-hist-controls">
            {[
              { label: "All",    value: "all"    },
              { label: "Smart",  value: "auto"   },
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
            <button className="irr-export-btn" onClick={handleExportCSV}>Export CSV</button>
          </div>
          <div className="irr-hist-table">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Zone</th><th>Status</th><th>Score</th><th>Duration</th><th>Reason</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.length === 0
                  ? <tr><td colSpan={7} className="irr-empty-hist">No records yet</td></tr>
                  : historyRecords.map((r, i) => (
                      <tr key={r.id || i}>
                        <td style={{color:"var(--muted)"}}>#{r.id || i+1}</td>
                        <td>Zone {r.zone}</td>
                        <td><span className={`irr-status-badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span></td>
                        <td style={{color: r.decision_score > 40 ? "var(--accent)" : "var(--muted)"}}>
                          {r.decision_score != null ? r.decision_score : "—"}
                        </td>
                        <td style={{color:"var(--muted)"}}>{r.duration_seconds ? `${r.duration_seconds}s` : "—"}</td>
                        <td style={{color:"var(--muted)",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.decision_reason || r.reason || ""}>
                          {r.decision_reason || r.reason || "—"}
                        </td>
                        <td style={{whiteSpace:"nowrap"}}>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FARMS ── */}
      {activeTab === "farms" && (
        <div className="irr-content">
          <div className="irr-farms-header">
            <div className="irr-farms-title">Farm & Zone Management</div>
            <button className="irr-add-btn" onClick={() => { setEditingFarm(null); setShowFarmModal(true); }}>+ Add Farm</button>
          </div>
          {farms.length === 0
            ? <div style={{textAlign:"center",padding:"80px 0",color:"var(--muted)",fontFamily:"var(--mono)",fontSize:13}}>
                No farms yet. Click <strong style={{color:"var(--accent)"}}>+ Add Farm</strong> to create your first.
              </div>
            : <div className="irr-farms-grid">
                {farms.map((farm) => (
                  <div key={farm.id} className="irr-farm-card">
                    <div className="irr-farm-card-head">
                      <div className="irr-farm-card-info">
                        <div className="irr-farm-card-name">{farm.name}</div>
                        <div className="irr-farm-card-loc">{farm.location || "No location set"}</div>
                      </div>
                      <div className="irr-farm-card-actions">
                        <button className="irr-icon-btn" title="Edit" onClick={() => { setEditingFarm(farm); setShowFarmModal(true); }}>✏️</button>
                        <button className="irr-icon-btn del" title="Delete" onClick={() => handleDeleteFarm(farm.id)}>🗑️</button>
                      </div>
                    </div>
                    {farm.lat && farm.lng
                      ? <div className="irr-map-preview" id={`preview-${farm.id}`}><MapPreview lat={farm.lat} lng={farm.lng} containerId={`preview-${farm.id}`} /></div>
                      : <div className="irr-map-no-loc">No location — click edit to add</div>
                    }
                    <div className="irr-farm-zones">
                      <div className="irr-farm-zones-head">
                        <div className="irr-farm-zones-title">Zones ({allZones.filter((z) => z.farm_id === farm.id).length})</div>
                        <button className="irr-add-btn" style={{fontSize:11,padding:"4px 12px"}} onClick={() => { setZoneModalFarmId(farm.id); setShowZoneModal(true); }}>+ Add Zone</button>
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
                                  <button className="irr-zone-del-btn" onClick={() => handleDeleteZone(farm.id, z.zone)}>✕</button>
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

      {showFarmModal && (
        <FarmModal farm={editingFarm} onClose={() => { setShowFarmModal(false); setEditingFarm(null); }} onSave={handleSaveFarm} />
      )}
      {showZoneModal && (
        <AddZoneModal farmId={zoneModalFarmId} onClose={() => setShowZoneModal(false)} onSave={handleAddZone} />
      )}
    </div>
  );
}
