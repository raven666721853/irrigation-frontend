// FILE: frontend/src/services/api.js

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

// Only redirect to login on 401 if we're NOT already on login page
// and only for auth-required routes (not weather, alerts, etc.)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Don't redirect if already on login or register
      if (currentPath !== "/login" && currentPath !== "/register") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default API;