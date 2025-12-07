import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SupervisorAlertasPage.css";

const API_URL = import.meta.env.VITE_API_URL;

type TipoAlerta =
  | "vendedor_bloqueado"
  | "vendedor_solicita_baja"
  | "venta_sospechosa"
  | "faltan_pagos"
  | "otro";

interface VendedorInfo {
  id: number;
  nombre: string;
  email: string;
  provincia?: string | null;
  localidad?: string | null;
  bloqueado?: boolean;
  documento?: string | null;
  telefono?: string | null;
}

interface AlertaSupervisor {
  id: number;
  supervisorId: number;
  vendedorId: number | null;
  tipo: TipoAlerta;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  observacion?: string | null; 
  vendedor?: VendedorInfo; // 👈 alias en minúscula (as: "vendedor")
}

type FiltroEstado = "pendientes" | "resueltas" | "todas";

const SupervisorAlertasPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("panelToken");

  const [alertas, setAlertas] = useState<AlertaSupervisor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // filtros
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("pendientes");
  const [filtroProvincia, setFiltroProvincia] = useState<string>("");
  const [filtroEmail, setFiltroEmail] = useState<string>("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
  }, [token, navigate]);

  const cargarAlertas = async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (filtroEstado !== "todas") {
        params.append("estado", filtroEstado); // pendientes | resueltas
      }
      if (filtroProvincia.trim()) {
        params.append("provincia", filtroProvincia.trim());
      }
      if (filtroEmail.trim()) {
        params.append("email", filtroEmail.trim());
      }

      const res = await fetch(
        `${API_URL}/api/supervisor/alertas?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error || "No se pudieron cargar las alertas.");
        setAlertas([]);
      } else {
        setAlertas(data.alertas || []);
      }
    } catch (err) {
      console.error("Error cargando alertas:", err);
      setError("Error de conexión al cargar alertas.");
      setAlertas([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    cargarAlertas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const provinciasDisponibles = useMemo(() => {
    const setProv = new Set<string>();
    alertas.forEach((a) => {
      const prov =
        a.vendedor?.provincia ||
        a.vendedor?.localidad ||
        ""; // lo que tengas más consistente
      if (prov) setProv.add(prov);
    });
    return Array.from(setProv).sort();
  }, [alertas]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarAlertas();
  };

const marcarComoResuelta = async (alertaId: number) => {
  if (!token) return;

  // 1️⃣ Pedimos cómo la resolvió
  const observacion = window.prompt(
    "Contá brevemente cómo se resolvió esta alerta (obligatorio):"
  );

  if (!observacion || observacion.trim().length < 3) {
    alert("Debés escribir un motivo válido (mínimo 3 caracteres).");
    return;
  }

  try {
    const res = await fetch(
      `${API_URL}/api/supervisor/alertas/${alertaId}/marcar-leida`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ observacion }), // 👈 se envía al backend
      }
    );

    const data = await res.json();
    if (!res.ok || data.ok === false) {
      alert(data.error || "No se pudo marcar como resuelta.");
      return;
    }

    // 2️⃣ Actualizar en memoria también
    setAlertas((prev) =>
      prev.map((a) =>
        a.id === alertaId
          ? {
              ...a,
              leida: true,
              // si tenés el campo en el tipo:
              // observacion,
            }
          : a
      )
    );
  } catch (err) {
    console.error("Error marcando alerta resuelta:", err);
    alert("Error de conexión.");
  }
};


const desbloquearVendedor = async (alerta: AlertaSupervisor) => {
  if (!token || !alerta.vendedorId) return;

  // 1️⃣ Confirmación inicial
  const confirmar = window.confirm(
    `¿Seguro que querés desbloquear al vendedor ${alerta.vendedor?.nombre || ""}?`
  );
  if (!confirmar) return;

  // 2️⃣ Pedir MOTIVO / OBSERVACIÓN
  const observacion = window.prompt(
    "Escribí el motivo del desbloqueo (obligatorio):"
  );

  if (!observacion || observacion.trim().length < 3) {
    alert("Debés escribir un motivo válido (mínimo 3 caracteres).");
    return;
  }

  try {
    const res = await fetch(
      `${API_URL}/api/supervisor/alertas/${alerta.id}/desbloquear-vendedor`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ observacion }), // 👈 SE ENVÍA AL BACKEND
      }
    );

    const data = await res.json();
    if (!res.ok || data.ok === false) {
      alert(data.error || "No se pudo desbloquear al vendedor.");
      return;
    }

    // 3️⃣ Refrescar alertas
    await cargarAlertas();
    alert("Vendedor desbloqueado y alerta actualizada.");
  } catch (err) {
    console.error("Error desbloqueando vendedor:", err);
    alert("Error de conexión.");
  }
};

const irAlVendedor = (vendedorId?: number | null) => {
  if (!vendedorId) return;
  navigate(`/supervisor/vendedor/${vendedorId}`);
};


  return (
    <div className="sup-alertas-page">
      <header className="sup-alertas-header">
        <h2>⚠️ Alertas de vendedores</h2>
        <p>
          Acá ves los bloqueos, pedidos de baja, ventas sospechosas y más. Las
          <strong> pendientes</strong> se muestran primero.
        </p>
      </header>

      <section className="sup-alertas-filtros">
        <form className="sup-alertas-filtros-form" onSubmit={handleBuscar}>
          <div className="sup-filtro-item">
            <label>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
            >
              <option value="pendientes">Pendientes</option>
              <option value="resueltas">Resueltas</option>
              <option value="todas">Todas</option>
            </select>
          </div>

          <div className="sup-filtro-item">
            <label>Provincia / localidad</label>
            <select
              value={filtroProvincia}
              onChange={(e) => setFiltroProvincia(e.target.value)}
            >
              <option value="">(Todas)</option>
              {provinciasDisponibles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="sup-filtro-item">
            <label>Email vendedor</label>
            <input
              type="email"
              placeholder="filtrar por email"
              value={filtroEmail}
              onChange={(e) => setFiltroEmail(e.target.value)}
            />
          </div>

          <button type="submit" className="sup-filtro-btn">
            Buscar
          </button>
        </form>
      </section>

      {loading ? (
        <p className="sup-alertas-loading">Cargando alertas...</p>
      ) : error ? (
        <p className="sup-alertas-error">{error}</p>
      ) : alertas.length === 0 ? (
        <p className="sup-alertas-empty">
          No hay alertas con los filtros seleccionados.
        </p>
      ) : (
        <section className="sup-alertas-lista">
          {alertas.map((a) => {
            const esPendiente = !a.leida;
            const vendedor = a.vendedor;

            return (
              <article
                key={a.id}
                className={
                  "sup-alerta-card" + (esPendiente ? " sup-alerta-pendiente" : "")
                }
              >
                <header className="sup-alerta-header">
                  <div>
                    <h3>
                      {a.tipo === "vendedor_bloqueado"
                        ? "Vendedor bloqueado"
                        : a.tipo === "vendedor_solicita_baja"
                        ? "Solicitud de baja"
                        : a.tipo === "venta_sospechosa"
                        ? "Venta sospechosa"
                        : a.tipo === "faltan_pagos"
                        ? "Faltan pagos"
                        : "Alerta"}
                    </h3>
                    <p className="sup-alerta-fecha">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <span
                    className={
                      "sup-alerta-estado " +
                      (esPendiente
                        ? "sup-alerta-estado-pendiente"
                        : "sup-alerta-estado-resuelta")
                    }
                  >
                    {esPendiente ? "Pendiente" : "Resuelta"}
                  </span>
                </header>

                <p className="sup-alerta-mensaje">{a.mensaje}</p>

                {vendedor && (
                  <div className="sup-alerta-vendedor">
                    <p>
                      <strong>Vendedor:</strong> {vendedor.nombre} (
                      {vendedor.email})
                    </p>
                    <p>
                      <strong>DNI / Doc:</strong>{" "}
                      {vendedor.documento || "—"}
                    </p>
                    <p>
                      <strong>Zona:</strong>{" "}
                      {vendedor.provincia ||
                        vendedor.localidad ||
                        "—"}
                    </p>
                    <p>
                      <strong>Estado vendedor:</strong>{" "}
                      {vendedor.bloqueado ? "Bloqueado" : "Activo"}
                    </p>
                   
                    <p>
  <strong>Teléfono:</strong> {vendedor.telefono ? vendedor.telefono : "No informado"}
</p>

                  </div>
                )}

                <div className="sup-alerta-acciones">
                  {vendedor && (
                    <button
                      type="button"
                      className="sup-btn-link"
                      onClick={() => irAlVendedor(vendedor.id)}
                    >
                      Ver detalle vendedor
                    </button>
                  )}

                  {vendedor && vendedor.bloqueado && (
                    <button
                      type="button"
                      className="sup-btn-primario"
                      onClick={() => desbloquearVendedor(a)}
                    >
                      🔓 Desbloquear
                    </button>
                  )}

                  {esPendiente && (
                    <button
                      type="button"
                      className="sup-btn-secundario"
                      onClick={() => marcarComoResuelta(a.id)}
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

export default SupervisorAlertasPage;
