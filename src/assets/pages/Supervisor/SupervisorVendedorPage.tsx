import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SupervisorVendedorPage.css";

const API_URL = import.meta.env.VITE_API_URL;

interface VendedorResumen {
  id: number;
  nombre: string;
  email: string;
  localidad: string | null;
  totalVentas: number;

  // SUPERVISOR
  totalComisionSupervisor: number;
  totalPagadoSupervisor: number;
  totalPendienteSupervisor: number;

  // VENDEDOR
  totalComisionVendedor: number;
  totalPagadoVendedor: number;
  totalPendienteVendedor: number;

  provincia?: string | null;
}

type TipoAlerta =
  | "vendedor_bloqueado"
  | "vendedor_solicita_baja"
  | "venta_sospechosa"
  | "faltan_pagos"
  | "otro";

const PROVINCIAS_AR = [
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

const SupervisorVendedorPage: React.FC = () => {
  const navigate = useNavigate();
  const [vendedores, setVendedores] = useState<VendedorResumen[]>([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [provincia, setProvincia] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [soloConDeuda, setSoloConDeuda] = useState(false); // deuda al vendedor

  // 🆕 filtro puntual por vendedor
  const [vendedorId, setVendedorId] = useState<string>("");

  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertTipo, setAlertTipo] = useState<TipoAlerta>("faltan_pagos");
  const [alertMensaje, setAlertMensaje] = useState("");
  const [alertVendedor, setAlertVendedor] = useState<VendedorResumen | null>(
    null
  );
  const [alertFeedback, setAlertFeedback] = useState("");

  const token = localStorage.getItem("panelToken");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    cargarVendedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recarga cuando cambian filtros rápidos (texto / provincia / vendedorId)
  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      cargarVendedores();
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, provincia, vendedorId]);

  const cargarVendedores = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (busqueda) params.set("q", busqueda); // nombre o email
      if (provincia) params.set("provincia", provincia); // filtro por provincia
      if (fechaDesde) params.set("desde", fechaDesde);
      if (fechaHasta) params.set("hasta", fechaHasta);
      if (vendedorId) params.set("vendedorId", vendedorId); // 🆕 filtro puntual

      const res = await fetch(
        `${API_URL}/api/supervisor/vendedores-resumen?${params.toString()}`,
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
        console.error(data.error || "Error cargando vendedores");
      }
    } catch (err) {
      console.error("Error cargando vendedores:", err);
    }

    setLoading(false);
  };

  const abrirModalAlerta = (vendedor: VendedorResumen) => {
    setAlertVendedor(vendedor);
    setAlertTipo("faltan_pagos");
    setAlertMensaje("");
    setAlertFeedback("");
    setAlertModalOpen(true);
  };

  const enviarAlerta = async () => {
    if (!token || !alertVendedor) return;
    if (!alertMensaje.trim()) {
      setAlertFeedback("Escribí un mensaje para el administrador.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/supervisor/alertas`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendedorId: alertVendedor.id,
          tipo: alertTipo,
          mensaje: alertMensaje,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAlertFeedback("✅ Alerta enviada al administrador.");
        setAlertMensaje("");
        setTimeout(() => {
          setAlertModalOpen(false);
          setAlertFeedback("");
        }, 1200);
      } else {
        setAlertFeedback(data.error || "No se pudo enviar la alerta.");
      }
    } catch (err) {
      console.error("Error enviando alerta:", err);
      setAlertFeedback("Error de conexión al enviar la alerta.");
    }
  };

  // Totales globales (vendedor + supervisor)
  const totals = vendedores.reduce(
    (acc, v) => {
      // vendedor
      acc.totalVentas += v.totalVentas;
      acc.totalComisionVendedor += v.totalComisionVendedor;
      acc.totalPagadoVendedor += v.totalPagadoVendedor;
      acc.totalPendienteVendedor += v.totalPendienteVendedor;

      // supervisor
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

  // Métricas de estado
  const vendedoresConDeudaVendedor = vendedores.filter(
    (v) => v.totalPendienteVendedor > 0
  ).length;
  const vendedoresAlDiaVendedor = vendedores.length - vendedoresConDeudaVendedor;

  const vendedoresConDeudaSupervisor = vendedores.filter(
    (v) => v.totalPendienteSupervisor > 0
  ).length;

  // Orden y filtro para la lista (por deuda al vendedor)
  const vendedoresOrdenados = vendedores
    .filter((v) => !soloConDeuda || v.totalPendienteVendedor > 0)
    .sort((a, b) => b.totalPendienteVendedor - a.totalPendienteVendedor);

  // Helpers de fechas rápidas (solo setean fecha, después usás "Aplicar filtros")
  const aplicarRangoHoy = () => {
    const hoy = new Date();
    const iso = hoy.toISOString().slice(0, 10);
    setFechaDesde(iso);
    setFechaHasta(iso);
  };

  const aplicarRangoAyer = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const iso = d.toISOString().slice(0, 10);
    setFechaDesde(iso);
    setFechaHasta(iso);
  };

  const aplicarRangoUltimos7 = () => {
    const hoy = new Date();
    const d = new Date();
    d.setDate(hoy.getDate() - 7);
    const desde = d.toISOString().slice(0, 10);
    const hasta = hoy.toISOString().slice(0, 10);
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  return (
    <div className="sv-container">
      <header className="sv-header">
        <div>
          <h2>Supervisión de Vendedores</h2>
          <p className="sv-subtitle">
            Ve lo que se debe a cada vendedor y las comisiones del supervisor.
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
          <label>Provincia</label>
          <select
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
          >
            <option value="">Todas las provincias</option>
            {PROVINCIAS_AR.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
        </div>

        {/* 🆕 Filtro puntual por vendedor */}
        <div className="sv-field">
          <label>Vendedor específico</label>
          <select
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
          >
            <option value="">Todos los vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre} ({v.email})
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

        {/* Filtros rápidos de fechas */}
        <div className="sv-quick-filters">
          <button type="button" onClick={aplicarRangoHoy}>
            Hoy
          </button>
          <button type="button" onClick={aplicarRangoAyer}>
            Ayer
          </button>
          <button type="button" onClick={aplicarRangoUltimos7}>
            Últimos 7 días
          </button>
        </div>

        <div className="sv-field sv-field-inline">
          <label className="sv-checkbox-label">
            <input
              type="checkbox"
              checked={soloConDeuda}
              onChange={(e) => setSoloConDeuda(e.target.checked)}
            />
            Ver solo vendedores con deuda (al vendedor)
          </label>
        </div>

        <button className="sv-btn sv-btn-primary" onClick={cargarVendedores}>
          Aplicar filtros
        </button>
      </section>

      {/* RESUMEN GLOBAL */}
      <section className="sv-resumen-global">
        <h3>Resumen general</h3>

        <div className="sv-resumen-grid">
          {/* Bloque VENDEDOR */}
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Total ventas</span>
            <strong>{totals.totalVentas}</strong>
          </div>
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Comisión vendedor</span>
            <strong>${totals.totalComisionVendedor}</strong>
          </div>
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Pagado a vendedores</span>
            <strong>${totals.totalPagadoVendedor}</strong>
          </div>
          <div className="sv-resumen-card pendiente">
            <span className="sv-resumen-label">Pendiente a vendedores</span>
            <strong>${totals.totalPendienteVendedor}</strong>
          </div>

          {/* Bloque SUPERVISOR */}
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Comisión supervisor</span>
            <strong>${totals.totalComisionSupervisor}</strong>
          </div>
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">Pagado al supervisor</span>
            <strong>${totals.totalPagadoSupervisor}</strong>
          </div>
          <div className="sv-resumen-card pendiente">
            <span className="sv-resumen-label">Pendiente al supervisor</span>
            <strong>${totals.totalPendienteSupervisor}</strong>
          </div>

          {/* Estado por vendedores */}
          <div className="sv-resumen-card ok">
            <span className="sv-resumen-label">
              Vendedores al día (vendedor)
            </span>
            <strong>{vendedoresAlDiaVendedor}</strong>
          </div>
          <div className="sv-resumen-card pendiente">
            <span className="sv-resumen-label">
              Vendedores con deuda (vendedor)
            </span>
            <strong>{vendedoresConDeudaVendedor}</strong>
          </div>
          <div className="sv-resumen-card">
            <span className="sv-resumen-label">
              Vendedores con deuda (supervisor)
            </span>
            <strong>{vendedoresConDeudaSupervisor}</strong>
          </div>
        </div>
      </section>

      {/* LISTA DE VENDEDORES */}
      {loading ? (
        <p className="sv-loading">Cargando vendedores...</p>
      ) : vendedoresOrdenados.length === 0 ? (
        <p className="sv-empty">
          No hay resultados con esos filtros por ahora.
        </p>
      ) : (
        <section className="sv-list">
          {vendedoresOrdenados.map((v) => {
            const tieneDeudaVendedor = v.totalPendienteVendedor > 0;
            return (
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

                  <div
                    className={
                      tieneDeudaVendedor
                        ? "sv-status-badge deuda"
                        : "sv-status-badge ok"
                    }
                  >
                    {tieneDeudaVendedor ? "Con deuda al vendedor" : "Al día"}
                  </div>
                </div>

                <div className="sv-card-body">
                  <div className="sv-card-row">
                    <span>Ventas registradas:</span>
                    <strong>{v.totalVentas}</strong>
                  </div>

                  {/* 💵 VENDEDOR */}
                  <div className="sv-card-row">
                    <span>Vendedor (total / pagado / pendiente):</span>
                    <strong>
                      ${v.totalComisionVendedor} / ${v.totalPagadoVendedor} /{" "}
                      <span className="sv-pendiente">
                        ${v.totalPendienteVendedor}
                      </span>
                    </strong>
                  </div>

                  {/* 💰 SUPERVISOR */}
                  <div className="sv-card-row">
                    <span>Supervisor (total / pagado / pendiente):</span>
                    <strong>
                      ${v.totalComisionSupervisor} / ${v.totalPagadoSupervisor} /{" "}
                      <span className="sv-pendiente">
                        ${v.totalPendienteSupervisor}
                      </span>
                    </strong>
                  </div>
                </div>

                <div className="sv-card-footer">
                  <button
                    className="sv-btn sv-btn-alerta"
                    onClick={() => abrirModalAlerta(v)}
                  >
                    Enviar alerta al administrador
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* MODAL ALERTA */}
      {alertModalOpen && alertVendedor && (
        <div
          className="sv-modal-overlay"
          onClick={() => setAlertModalOpen(false)}
        >
          <div className="sv-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Alerta sobre {alertVendedor.nombre}</h3>
            <p className="sv-modal-sub">
              Esto se envía al administrador para que revise y actúe.
            </p>

            <div className="sv-field">
              <label>Tipo de alerta</label>
              <select
                value={alertTipo}
                onChange={(e) => setAlertTipo(e.target.value as TipoAlerta)}
              >
                <option value="faltan_pagos">Faltan pagos</option>
                <option value="vendedor_bloqueado">
                  Vendedor bloqueado / problema de acceso
                </option>
                <option value="vendedor_solicita_baja">
                  Vendedor solicita baja
                </option>
                <option value="venta_sospechosa">Venta sospechosa</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="sv-field">
              <label>Mensaje para el administrador</label>
              <textarea
                rows={4}
                value={alertMensaje}
                onChange={(e) => setAlertMensaje(e.target.value)}
                placeholder="Ej: Falta pagarle 3 días, el vendedor reclama que no se le acreditó..."
              />
            </div>

            {alertFeedback && (
              <p className="sv-alert-feedback">{alertFeedback}</p>
            )}

            <div className="sv-modal-actions">
              <button
                className="sv-btn sv-btn-secondary"
                onClick={() => setAlertModalOpen(false)}
              >
                Cancelar
              </button>
              <button className="sv-btn sv-btn-primary" onClick={enviarAlerta}>
                Enviar alerta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorVendedorPage;
