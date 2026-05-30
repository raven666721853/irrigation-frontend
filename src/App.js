import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem("token"));

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = isAuth && user.role === "admin";
  const isUser  = isAuth && user.role !== "admin";

  return (
    <Router>
      <Routes>

        {/* "/" — only regular users, admins get sent to /admin */}
        <Route
          path="/"
          element={
            !isAuth   ? <Navigate to="/login" /> :
            isAdmin   ? <Navigate to="/admin" /> :
            <Dashboard setIsAuth={setIsAuth} />
          }
        />

        {/* "/admin" — only admins, regular users get sent to "/" */}
        <Route
          path="/admin"
          element={
            !isAuth   ? <Navigate to="/login" /> :
            isUser    ? <Navigate to="/" /> :
            <Admin setIsAuth={setIsAuth} />
          }
        />

        {/* Public */}
        <Route
          path="/login"
          element={
            isAdmin ? <Navigate to="/admin" /> :
            isUser  ? <Navigate to="/" /> :
            <Login setIsAuth={setIsAuth} />
          }
        />

        <Route path="/register" element={<Register />} />

      </Routes>
    </Router>
  );
}

export default App;
