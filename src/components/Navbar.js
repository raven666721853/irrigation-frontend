import { useNavigate } from "react-router-dom";

export default function Navbar({ setIsAuth }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsAuth(false); // 🔥 CRITICAL
    navigate("/login");
  };

  return (
    <div style={styles.nav}>

      <div style={styles.logo}>🌱 SmartIrrig</div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        
        <img
          src={`https://ui-avatars.com/api/?name=${user?.name}`}
          alt="avatar"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
          }}
        />

        <span>{user?.name}</span>

        <button onClick={logout} style={styles.btn}>
          Logout
        </button>

      </div>

    </div>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px 20px",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  logo: {
    fontWeight: "bold",
  },
  btn: {
    background: "linear-gradient(90deg, #38bdf8, #a78bfa)",
    border: "none",
    padding: "8px 15px",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
  },
};