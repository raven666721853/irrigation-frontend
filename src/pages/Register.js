import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleRegister = () => {
    API.post("/auth/register", form)
      .then(() => {
        alert("Account created ✅");
        navigate("/login");
      })
      .catch(() => alert("Error creating account ❌"));
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <h2>Create Account</h2>

        <input
          placeholder="Name"
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        <input
          placeholder="Email"
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button onClick={handleRegister}>
          Register
        </button>

      </div>
    </div>
  );
}