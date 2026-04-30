import { useEffect, useState } from "react";
import API from "../services/api";

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    API.get("/api/history")
      .then(res => setHistory(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Irrigation History</h1>

      <div className="bg-white rounded-xl shadow p-4">
        {history.map((item, index) => (
          <div key={index} className="border-b py-2">
            🌱 Zone {item.zone} — {item.status}  
            <br />
            <span className="text-gray-500 text-sm">
              {new Date(item.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}