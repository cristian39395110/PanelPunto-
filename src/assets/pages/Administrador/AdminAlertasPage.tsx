// src/assets/pages/Administrador/AdminAlertasPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import type { AdminOutletContext } from "../../../layouts/AdminLayout";
    
import "./AdminVendedoresPage.css"; // o tu CSS de alertas admin

const API_URL = import.meta.env.VITE_API_URL;

interface PersonaBasica {
  id: number;
  nombre: string;
  email: string;
  localidad?: string | null;
}

interface Alerta {
  id: number;
  tipo: string;
  mensaje: string;
  leida?: boolean;
  createdAt?: string;
  estado?: "pendiente" | "resuelta" | string;
  notaAdmin?: string | null;
  observacion?: string | null;
  supervisor?: PersonaBasica | null;
  vendedor?: PersonaBasica | null;
}

type FiltroEstado = "todas" | "pendiente" | "resuelta";

const AdminAlertasPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("panelToken");

  const { recargarAlertasPendientes } =
    useOutletContext<AdminOutletContext>();

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("pendiente");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    cargarAlertas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarAlertas = async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/admin-supervisor/alertas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error cargando alertas");
      } else {
        setAlertas(data.alertas || []);
      }
    } catch (err) {
      console.error("Error cargando alertas:", err);
      setError("No se pudieron cargar las alertas.");
    }

    setLoading(false);
  };

  const alertasFiltradas = useMemo(
    () =>
      alertas.filter((a) => {
        const leida = !!a.leida;
        const estado = a.estado || (leida ? "resuelta" : "pendiente");

        if (filtroEstado === "pendiente") return estado === "pendiente";
        if (filtroEstado === "resuelta") return estado === "resuelta";
        return true;
      }),
    [alertas, filtroEstado]
  );

  const marcarResuelta = async (alertaId: number) => {
    if (!token) return;

    const notaAdmin = window.prompt(
      "Podés agregar una nota (opcional) sobre cómo se resolvió:"
    );

    try {
      const res = await fetch(
        `${API_URL}/api/admin-supervisor/alertas/${alertaId}/resolver`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notaAdmin:
              notaAdmin && notaAdmin.trim() ? notaAdmin.trim() : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No se pudo marcar como resuelta.");
        return;
      }

      // actualizar en memoria
      setAlertas((prev) =>
        prev.map((a) =>
          a.id === alertaId
            ? {
                ...a,
                leida: true,
                estado: "resuelta",
                notaAdmin:
                  notaAdmin && notaAdmin.trim()
                    ? notaAdmin.trim()
                    : a.notaAdmin,
              }
            : a
        )
      );

      // 🔔 actualizar badge del menú
      recargarAlertasPendientes();
    } catch (err) {
      console.error("Error marcando alerta como resuelta:", err);
      alert("Error de conexión al marcar la alerta.");
    }
  };

  const irDashboard = () => {
    navigate("/admin");
  };

  if (!token) {
    return (
      <div className="sv-container">
        <p className="sv-loading">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="sv-container">
      <header className="sv-header">
        <div>
          <button className="sv-btn-link" onClick={irDashboard}>
            ← Volver al panel
          </button>
          <h2>Alertas de supervisores</h2>
          <p className="sv-subtitle">
            Acá ves los reportes que envían los supervisores sobre vendedores,
            pagos o situaciones sospechosas.
          </p>
        </div>
        <button
          className="sv-logout"
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
        >
          Cerrar sesión
        </button>
      </header>

      {/* filtros */}
      <section className="sv-filters">
        <div style={{ marginBottom: 10, fontSize: 14 }}>Ver:</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="sv-btn"
            style={{
              background: filtroEstado === "pendiente" ? "#fbc531" : "#2a2a2a",
              color: "#fff",
            }}
            onClick={() => setFiltroEstado("pendiente")}
          >
            Pendientes
          </button>
          <button
            className="sv-btn"
            style={{
              background: filtroEstado === "resuelta" ? "#2ecc71" : "#2a2a2a",
              color: "#fff",
            }}
            onClick={() => setFiltroEstado("resuelta")}
          >
            Resueltas
          </button>
          <button
            className="sv-btn"
            style={{
              background: filtroEstado === "todas" ? "#4ea1ff" : "#2a2a2a",
              color: "#fff",
            }}
            onClick={() => setFiltroEstado("todas")}
          >
            Todas
          </button>
          <button className="sv-btn sv-btn-primary" onClick={cargarAlertas}>
            Recargar
          </button>
        </div>
      </section>

      {loading ? (
        <p className="sv-loading">Cargando alertas...</p>
      ) : error ? (
        <p className="sv-error">{error}</p>
      ) : alertasFiltradas.length === 0 ? (
        <p className="sv-empty">No hay alertas con ese filtro por ahora.</p>
      ) : (
        <section className="sv-list">
          {alertasFiltradas.map((a) => {
            const pendiente = (a.estado || (!a.leida ? "pendiente" : "resuelta")) === "pendiente";
            return (
              <article key={a.id} className="sv-card">
                <div className="sv-card-header">
                  <div>
                    <h3>{a.tipo}</h3>
                    {a.supervisor && (
                      <p className="sv-email">
                        Supervisor: {a.supervisor.nombre} ({a.supervisor.email})
                      </p>
                    )}
                    {a.vendedor && (
                      <p className="sv-localidad">
                        Vendedor: {a.vendedor.nombre} ({a.vendedor.email})
                        {a.vendedor.localidad
                          ? ` - 📍 ${a.vendedor.localidad}`
                          : ""}
                      </p>
                    )}
                    {a.createdAt && (
                      <p className="sv-localidad">
                        Fecha: {new Date(a.createdAt).toLocaleString("es-AR")}
                      </p>
                    )}
                    {a.observacion && (
                      <p className="sv-observacion">
                        <strong>Obs. supervisor:</strong> {a.observacion}
                      </p>
                    )}
                    {a.notaAdmin && (
                      <p className="sv-observacion">
                        <strong>Nota admin:</strong> {a.notaAdmin}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      className={
                        pendiente
                          ? "sv-badge sv-badge-pend"
                          : "sv-badge sv-badge-ok"
                      }
                    >
                      {pendiente ? "Pendiente" : "Resuelta"}
                    </span>
                  </div>
                </div>

                <div className="sv-card-body">
                  <p style={{ marginTop: 6, fontSize: 14 }}>{a.mensaje}</p>
                </div>

                <div className="sv-card-footer">
                  {pendiente && (
                    <button
                      className="sv-btn sv-btn-primary"
                      onClick={() => marcarResuelta(a.id)}
                    >
                      Marcar como resuelta
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default AdminAlertasPage;
