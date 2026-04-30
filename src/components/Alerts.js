import { useEffect, useState } from "react";
import API from "../services/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = () => {
      API.get("/alerts")
        .then(res => setAlerts(res.data))
        .catch(err => console.log("Alerts error:", err));
    };

    fetchAlerts(); // first load

    const interval = setInterval(fetchAlerts, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-red-100 p-4 rounded-xl mb-4">
      <h2 className="font-bold text-red-600">🚨 Alerts</h2>

      {alerts.length === 0 ? (
        <p className="text-green-600">All good ✅</p>
      ) : (
        alerts.map((a, i) => (
          <p key={i}>
            ⚠️ Zone {a.zone} is dry ({a.moisture}%)
          </p>
        ))
      )}
    </div>
  );
}