// src/pages/AdminVendedoresPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminVendedoresPage.css"; // reutilizamos estilos sv-*
const API_URL = import.meta.env.VITE_API_URL;

// Lista fija de provincias de Argentina (solo frontend)
const PROVINCIAS_ARG = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

interface VendedorResumen {
  id: number;
  nombre: string;
  email: string;
  localidad: string | null;
  provincia?: string | null;

  totalVentas: number;

  // 💰 vendedor
  totalComisionVendedor: number;
  totalPagadoVendedor: number;
  totalPendienteVendedor: number;

  // 💰 supervisor
  totalComisionSupervisor: number;
  totalPagadoSupervisor: number;
  totalPendienteSupervisor: number;
}

const AdminVendedoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [vendedores, setVendedores] = useState<VendedorResumen[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [busqueda, setBusqueda] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState(""); // filtro de provincia
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const token = localStorage.getItem("panelToken");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    cargarVendedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarVendedores = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (busqueda) params.set("q", busqueda); // nombre o email
      if (localidad) params.set("localidad", localidad);
      if (provincia) params.set("provincia", provincia); // enviamos provincia si está seleccionada
      if (fechaDesde) params.set("desde", fechaDesde);
      if (fechaHasta) params.set("hasta", fechaHasta);

      const res = await fetch(
        `${API_URL}/api/admin-supervisor/vendedores-resumen?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setVendedores(data.vendedores || []);
      } else {
        console.error(data.error || "Error cargando vendedores (admin)");
      }
    } catch (err) {
      console.error("Error cargando vendedores (admin):", err);
    }

    setLoading(false);
  };

  const formatMoney = (n: number) =>
    n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

  // Totales globales
  const totals = vendedores.reduce(
    (acc, v) => {
      acc.totalVentas += v.totalVentas;

      acc.totalComisionVendedor += v.totalComisionVendedor;
      acc.totalPagadoVendedor += v.totalPagadoVendedor;
      acc.totalPendienteVendedor += v.totalPendienteVendedor;

      acc.totalComisionSupervisor += v.totalComisionSupervisor;
      acc.totalPagadoSupervisor += v.totalPagadoSupervisor;
      acc.totalPendienteSupervisor += v.totalPendienteSupervisor;
      return acc;
    },
    {
      totalVentas: 0,
      totalComisionVendedor: 0,
      totalPagadoVendedor: 0,
      totalPendienteVendedor: 0,
      totalComisionSupervisor: 0,
      totalPagadoSupervisor: 0,
      totalPendienteSupervisor: 0,
    }
  );

  const irADetalleVendedor = (vendedorId: number) => {
    navigate(`/admin/vendedor/${vendedorId}`);
  };

  return (
    <div className="sv-container">
      <header className="sv-header">
        <div>
          <h2>Administrar pagos a vendedores y supervisores</h2>
          <p className="sv-subtitle">
            Acá ves cuántas ventas hizo cada vendedor, cuánto le debés a él
            (15.000 por venta) y cuánto le debés al supervisor (5.000 por
            venta).
          </p>
        </div>
        <button
          className="sv-logout"
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
        >
          Cerrar sesión
        </button>
      </header>

      {/* FILTROS */}
      <section className="sv-filters">
        <div className="sv-field">
          <label>Buscar (nombre o email)</label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: juan@correo.com"
          />
        </div>

        <div className="sv-field">
          <label>Localidad</label>
          <input
            type="text"
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            placeholder="Ej: San Luis"
          />
        </div>

        {/* Select de provincia (Argentina) */}
        <div className="sv-field">
          <label>Provincia</label>
          <select
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
          >
            <option value="">Todas</option>
            {PROVINCIAS_ARG.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="sv-dates-row">
          <div className="sv-field">
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="sv-field">
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>

        <button className="sv-btn sv-btn-primary" onClick={cargarVendedores}>
          Aplicar filtros
        </button>
      </section>

      {/* RESUMEN GLOBAL */}
      <section className="sv-resumen-global">
        <h3>Resumen general</h3>
        <div className="sv-resumen-grid">
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Total ventas</span>
            <strong>{totals.totalVentas}</strong>
          </div>

          {/* Bloque vendedor */}
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Comisión total vendedores</span>
            <strong>{formatMoney(totals.totalComisionVendedor)}</strong>
          </div>
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Pagado a vendedores</span>
            <strong>{formatMoney(totals.totalPagadoVendedor)}</strong>
          </div>
          <div className="sv-resumen-card pendiente">
            <span className="sv-resumen-label">Pendiente vendedores</span>
            <strong>{formatMoney(totals.totalPendienteVendedor)}</strong>
          </div>

          {/* Bloque supervisor */}
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">
              Comisión total supervisores
            </span>
            <strong>{formatMoney(totals.totalComisionSupervisor)}</strong>
          </div>
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Pagado a supervisores</span>
            <strong>{formatMoney(totals.totalPagadoSupervisor)}</strong>
          </div>
          <div className="sv-resumen-card pendiente">
            <span className="sv-resumen-label">Pendiente supervisores</span>
            <strong>
              {formatMoney(totals.totalPendienteSupervisor)}
            </strong>
          </div>
        </div>
      </section>

      {/* LISTA DE VENDEDORES */}
      {loading ? (
        <p className="sv-loading">Cargando vendedores...</p>
      ) : vendedores.length === 0 ? (
        <p className="sv-empty">No hay resultados con esos filtros por ahora.</p>
      ) : (
        <section className="sv-list">
          {vendedores.map((v) => (
            <article key={v.id} className="sv-card">
              <div className="sv-card-header">
                <div>
                  <h3>{v.nombre}</h3>
                  <p className="sv-email">{v.email}</p>
                  {v.localidad && (
                    <p className="sv-localidad">📍 {v.localidad}</p>
                  )}
                  {v.provincia && (
                    <p className="sv-localidad">🗺 {v.provincia}</p>
                  )}
                </div>
              </div>

              <div className="sv-card-body">
                <div className="sv-card-row">
                  <span>Ventas registradas:</span>
                  <strong>{v.totalVentas}</strong>
                </div>

                {/* 💰 bloque vendedor */}
                <div className="sv-card-row">
                  <span>Comisión vendedor:</span>
                  <strong>{formatMoney(v.totalComisionVendedor)}</strong>
                </div>
                <div className="sv-card-row">
                  <span>Pagado al vendedor:</span>
                  <strong>{formatMoney(v.totalPagadoVendedor)}</strong>
                </div>
                <div className="sv-card-row">
                  <span>Pendiente vendedor:</span>
                  <strong
                    className={
                      v.totalPendienteVendedor > 0
                        ? "sv-pendiente"
                        : "sv-pendiente sv-pendiente-cero"
                    }
                  >
                    {formatMoney(v.totalPendienteVendedor)}
                  </strong>
                </div>

                {/* 💰 bloque supervisor */}
                <div className="sv-card-row">
                  <span>Comisión supervisor:</span>
                  <strong>{formatMoney(v.totalComisionSupervisor)}</strong>
                </div>
                <div className="sv-card-row">
                  <span>Pagado al supervisor:</span>
                  <strong>{formatMoney(v.totalPagadoSupervisor)}</strong>
                </div>
                <div className="sv-card-row">
                  <span>Pendiente supervisor:</span>
                  <strong
                    className={
                      v.totalPendienteSupervisor > 0
                        ? "sv-pendiente"
                        : "sv-pendiente sv-pendiente-cero"
                    }
                  >
                    {formatMoney(v.totalPendienteSupervisor)}
                  </strong>
                </div>
              </div>

              <div className="sv-card-footer">
                <button
                  className="sv-btn sv-btn-primary"
                  onClick={() => irADetalleVendedor(v.id)}
                >
                  Ver ventas / marcar pagado
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default AdminVendedoresPage;
