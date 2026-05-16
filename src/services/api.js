// ============================================================
// FILE: frontend/src/services/api.js  (FULL REPLACEMENT)
// WHAT: Adds JWT Authorization header to every request
//       automatically, so Dashboard.jsx works with protected routes.
// ============================================================

import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL + "/api",
});

// Attach JWT token on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If 401, redirect to login
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;