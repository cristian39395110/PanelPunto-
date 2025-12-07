// src/layouts/AdminLayout.tsx
import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

const API_URL = import.meta.env.VITE_API_URL;

export interface AdminOutletContext {
  alertasPendientes: number;
  recargarAlertasPendientes: () => void;
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [alertasPendientes, setAlertasPendientes] = useState(0);

  const token = localStorage.getItem("panelToken");

  const cargarContadorAlertas = async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_URL}/api/admin-supervisor/alertas/count-pendientes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        setAlertasPendientes(data.count || 0);
      }
    } catch (err) {
      console.error("Error cargando contador alertas:", err);
    }
  };

  useEffect(() => {
    cargarContadorAlertas();
    // refresco cada 15s por las dudas
    const interval = setInterval(cargarContadorAlertas, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("panelToken");
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-logo-main">Punto+</span>
          <span className="admin-logo-sub">Panel Admin</span>
        </div>

        <nav className="admin-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            📊 Dashboard
          </NavLink>

          {/* 🚨 ALERTAS con badge */}
          <NavLink
            to="/admin/alertas"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            <span>🚨 Alertas</span>
            {alertasPendientes > 0 && (
              <span className="admin-badge">{alertasPendientes}</span>
            )}
          </NavLink>

          <NavLink
            to="/admin/vendedores"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            🧑‍💼 Vendedores
          </NavLink>

          <NavLink
            to="/admin/negocios"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            🏪 Negocios
          </NavLink>


          <NavLink
            to="/admin/retos"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            🏆 Retos
          </NavLink>

          <NavLink
            to="/admin/sorteos"
            className={({ isActive }) =>
              "admin-nav-link" + (isActive ? " active" : "")
            }
          >
            🎰 Sorteos
          </NavLink>
        </nav>
      </aside>

      {/* Contenido principal */}
      <div className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">Panel de administración</h1>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </header>

        <main className="admin-content">
          {/* 👇 Le pasamos contexto al Outlet */}
          <Outlet
            context={
              {
                alertasPendientes,
                recargarAlertasPendientes: cargarContadorAlertas,
              } satisfies AdminOutletContext
            }
          />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
