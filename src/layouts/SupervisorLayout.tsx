import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./AdminLayout.css"; // mismo CSS que el admin

const API_URL = import.meta.env.VITE_API_URL;

const SupervisorLayout: React.FC = () => {
  const navigate = useNavigate();
  const [alertasNoLeidas, setAlertasNoLeidas] = useState<number>(0);

  const token = localStorage.getItem("panelToken");

  const handleLogout = () => {
    localStorage.removeItem("panelToken");
    navigate("/login");
  };

  useEffect(() => {
    if (!token) return;

    const fetchAlertas = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/supervisor/alertas/no-leidas`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (res.ok && typeof data.noLeidas === "number") {
          setAlertasNoLeidas(data.noLeidas);
        } else {
          setAlertasNoLeidas(0);
        }
      } catch (error) {
        console.error("Error consultando alertas del supervisor:", error);
      }
    };

    // primera carga
    fetchAlertas();
    // refresco cada 20s (podés cambiar el tiempo o sacarlo)
    const interval = setInterval(fetchAlertas, 20000);
    return () => clearInterval(interval);
  }, [token]);

  const tieneAlertas = alertasNoLeidas > 0;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-logo-main">Punto+</span>
          <span className="admin-logo-sub">Supervisor</span>
        </div>

        <nav className="admin-nav">
        

          <NavLink
            to="/supervisor/vendedores"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            🧑‍💼 Vendedores
          </NavLink>

          {/* 👉 NUEVO: MENÚ DE ALERTAS CON BADGE */}
          <NavLink
            to="/supervisor/alertas"
            className={({ isActive }) =>
              "admin-nav-link" +
              (isActive ? " active" : "") +
              (tieneAlertas ? " has-alerts" : "")
            }
          >
            <span className="admin-nav-text">
              ⚠️ Alertas
              {tieneAlertas && (
                <span className="admin-alert-badge">
                  {alertasNoLeidas > 9 ? "9+" : alertasNoLeidas}
                </span>
              )}
            </span>
          </NavLink>

          {/* Alta / baja vendedores */}
          <NavLink
            to="/supervisor/gestion-vendedores"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            ➕ Alta / baja
          </NavLink>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">Panel de supervisor</h1>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SupervisorLayout;
