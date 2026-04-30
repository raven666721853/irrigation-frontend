import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem("token"));

  return (
    <Router>
      <Routes>

        {/* 🔐 Protected */}
        <Route
          path="/"
          element={
            isAuth ? (
              <Dashboard setIsAuth={setIsAuth} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* 🔓 Public */}
        <Route
          path="/login"
          element={
            !isAuth ? (
              <Login setIsAuth={setIsAuth} />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route path="/register" element={<Register />} />

      </Routes>
    </Router>
  );
}

export default App;