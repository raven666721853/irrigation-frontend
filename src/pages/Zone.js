import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import farm from "../assets/farm.png";
import API from "../services/api";

export default function Zone() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [selectedZone, setSelectedZone] = useState(null);
  const [zonesData, setZonesData] = useState([]);

  // 🔥 LIVE DATA FETCH (REAL-TIME)
  useEffect(() => {
    const interval = setInterval(() => {
      API.get("/api/zones")
        .then((res) => setZonesData(res.data))
        .catch((err) => console.log(err));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 🔥 GET CURRENT ZONE DATA FROM URL
  const zoneInfo = zonesData.find(z => z.zone === Number(id));
  const isOffline =
  !zoneInfo?.last_seen ||
  (new Date() - new Date(zoneInfo.last_seen)) >
    2 * 60 * 1000;

  return (
    <div className="min-h-screen bg-green-100 p-6">

      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-black transition"
      >
        ⬅ Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        🌱 Farm Overview (Zone {id})
      </h1>

      {/* FARM MAP */}
      <div className="relative w-full max-w-xl mx-auto">

        {/* IMAGE */}
        <img
          src={farm}
          alt="farm"
          className="w-full rounded-xl"
        />

        {/* SVG ZONES */}
        <svg
          className="absolute top-0 left-0 w-full h-full"
          viewBox="0 0 300 300"
        >
          {[...Array(9)].map((_, index) => {
            const zoneNumber = index + 1;

            const isMainSelected = zoneNumber === Number(id);
            const isClicked = selectedZone === zoneNumber;

            const x = (index % 3) * 100;
            const y = Math.floor(index / 3) * 100;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width="90"
                  height="90"
                  rx="12"
                  onClick={() => setSelectedZone(zoneNumber)}
                  fill={
                    isMainSelected
                      ? "#2563eb" // selected page
                      : isClicked
                      ? "#22c55e"
                      : "#16a34a"
                  }
                  opacity={isMainSelected ? 0.9 : 0.5}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: "pointer" }}
                />

                <text
                  x={x + 40}
                  y={y + 55}
                  fill="white"
                  fontSize="16"
                  textAnchor="middle"
                >
                  {zoneNumber}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 📦 POPUP */}
      {selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">

          <div className="bg-white p-6 rounded-xl w-80 shadow-xl">

            <h2 className="text-xl font-bold mb-4">
              🌱 Zone {selectedZone}
            </h2>
            {isOffline && (
  <div className="bg-red-500 text-white px-3 py-2 rounded mb-4">
    ⚠️ Sensor Offline
  </div>
)}

            {/* 💧 REAL DATA */}
            <p className="mb-2">
              💧 Moisture: {zoneInfo ? zoneInfo.moisture : "--"}%
            </p>

            {/* 🤖 AI STATUS */}
            <p className="mb-4">
              ⚡ Status: {zoneInfo && zoneInfo.moisture < 40 ? "AUTO ON 🤖" : "OFF"}
            </p>

            <div className="flex justify-between">

              {/* 🔘 MANUAL IRRIGATION */}
              <button
                onClick={() => {
                  API.post("/api/irrigation", {
                    zone: Number(id),
                    status: "ON"
                  })
                    .then(() => alert("Irrigation started 💧"))
                    .catch(() => alert("Error ❌"));
                }}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Start Irrigation
              </button>

              <button
                onClick={() => setSelectedZone(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
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