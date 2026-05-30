import { useState, useEffect } from "react";
import API from "../services/api";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";

export default function Login({ setIsAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
  try {
    const res = await API.post("/auth/login", {
      email,
      password
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    setIsAuth(true);

    if (res.data.user?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/");
    }

  } catch (err) {
    console.error(err);

    setError(
      err.response?.data?.message || "Login failed"
    );
  }
};

  useEffect(() => {
    if (localStorage.getItem("token")) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      navigate(user.role === "admin" ? "/admin" : "/");
    }
  }, []);

  return (
    <div className="login-container">
      <div className="login-card">

        <h2>🌱 SmartIrrig</h2>
        <p className="subtitle">Secure access to your system</p>

        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button onClick={handleLogin}>Login</button>

      </div>
    </div>
  );
}
