import axios from "axios";

// ✅ Vite uses import.meta.env, NOT process.env
// Set VITE_API_URL in your .env file and in Vercel environment variables
const BASE = import.meta.env.VITE_API_URL || "https://smart-irrigation-backend-wra6.onrender.com";

const API = axios.create({
  baseURL: BASE + "/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    // Auto-logout on 401
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;
