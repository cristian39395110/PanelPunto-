// src/pages/AdminVendedorDetallePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AdminVendedorDetallePage.css";

const API_URL = import.meta.env.VITE_API_URL;

interface VendedorInfo {
  id: number;
  nombre: string;
  email: string;
  localidad: string | null;
  provincia?: string | null;
}

interface VentaApi {
  id: number;
  fecha: string; // ISO
  negocioNombre: string | null;
  montoVenta?: number | null;

  // vienen del backend
  negocioLocalidad?: string | null;
  negocioProvincia?: string | null;

  comisionSupervisor?: number | null;
  pagadaSupervisor?: boolean;
  pagadoSupervisor?: boolean;
  pagadaVendedor?: boolean;
  pagado?: boolean;
}

interface VentaDetalle extends VentaApi {
  comisionVendedor: number; // normalizado a 15000
  comisionSupervisor: number; // normalizado a 5000 si falta
  pagadaVendedor: boolean;
  pagadaSupervisor: boolean;
}

interface PagoSupervisor {
  id: number;
  fechaPago: string;
  monto: number;
  observacion?: string;
}

interface DetalleResponse {
  vendedor: VendedorInfo;
  ventas: VentaApi[];
  pagosSupervisor?: PagoSupervisor[];
  pagos?: PagoSupervisor[]; // compatibilidad
}

type ModoPago = "vendedor" | "supervisor";

const AdminVendedorDetallePage: React.FC = () => {
  const params = useParams<{ id?: string; vendedorId?: string }>();
  const vendedorId = params.id || params.vendedorId;
  const navigate = useNavigate();
  const token = localStorage.getItem("panelToken");

  const [vendedor, setVendedor] = useState<VendedorInfo | null>(null);
  const [ventas, setVentas] = useState<VentaDetalle[]>([]);
  const [pagosSupervisor, setPagosSupervisor] = useState<PagoSupervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modo, setModo] = useState<ModoPago>("vendedor");
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);

  // 🔹 Filtro por fecha
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    if (!vendedorId) return;
    cargarDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendedorId]);

  const cargarDetalle = async () => {
    if (!token || !vendedorId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/api/admin-supervisor/vendedor/${vendedorId}/detalle`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data: DetalleResponse | any = await res.json();

      if (!res.ok) {
        setError(data.error || "Error cargando detalle de vendedor");
      } else {
        setVendedor(data.vendedor);

        const ventasApi: VentaApi[] = data.ventas || [];

        const ventasNorm: VentaDetalle[] = ventasApi.map((v) => {
          const comVend = 15000;
          const comSup =
            typeof v.comisionSupervisor === "number" &&
            v.comisionSupervisor > 0
              ? v.comisionSupervisor
              : 5000;

          const pagVend =
            typeof v.pagadaVendedor === "boolean"
              ? v.pagadaVendedor
              : !!v.pagado;

          const pagSup =
            typeof v.pagadaSupervisor === "boolean"
              ? v.pagadaSupervisor
              : !!v.pagadoSupervisor;

          return {
            ...v,
            comisionVendedor: comVend,
            comisionSupervisor: comSup,
            pagadaVendedor: pagVend,
            pagadaSupervisor: pagSup,
          };
        });

        setVentas(ventasNorm);
        setPagosSupervisor(data.pagosSupervisor || data.pagos || []);
        setSeleccionadas([]);
      }
    } catch (err) {
      console.error("Error cargando detalle de vendedor:", err);
      setError("No se pudo cargar el detalle. Probá de nuevo más tarde.");
    }

    setLoading(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatMoney = (n: number) =>
    n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });

  // 🔹 Aplico filtro por fecha sobre ventas
  const ventasFiltradas = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return ventas;

    let desdeDate: Date | null = null;
    let hastaDate: Date | null = null;

    if (fechaDesde) {
      desdeDate = new Date(`${fechaDesde}T00:00:00`);
    }
    if (fechaHasta) {
      hastaDate = new Date(`${fechaHasta}T23:59:59`);
    }

    return ventas.filter((v) => {
      const fv = new Date(v.fecha);
      if (isNaN(fv.getTime())) return false;

      if (desdeDate && fv < desdeDate) return false;
      if (hastaDate && fv > hastaDate) return false;

      return true;
    });
  }, [ventas, fechaDesde, fechaHasta]);

  const ventasOrdenadas = useMemo(
    () =>
      [...ventasFiltradas].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ),
    [ventasFiltradas]
  );

  const totalComisionVendedor = useMemo(
    () => ventasFiltradas.reduce((acc, v) => acc + v.comisionVendedor, 0),
    [ventasFiltradas]
  );

  const totalPagadoVendedor = useMemo(
    () =>
      ventasFiltradas
        .filter((v) => v.pagadaVendedor)
        .reduce((acc, v) => acc + v.comisionVendedor, 0),
    [ventasFiltradas]
  );

  const totalPendienteVendedor =
    totalComisionVendedor - totalPagadoVendedor;

  const totalComisionSupervisor = useMemo(
    () =>
      ventasFiltradas.reduce((acc, v) => acc + v.comisionSupervisor, 0),
    [ventasFiltradas]
  );

  const totalPagadoSupervisor = useMemo(
    () =>
      ventasFiltradas
        .filter((v) => v.pagadaSupervisor)
        .reduce((acc, v) => acc + v.comisionSupervisor, 0),
    [ventasFiltradas]
  );

  const totalPendienteSupervisor =
    totalComisionSupervisor - totalPagadoSupervisor;

  const toggleSeleccion = (ventaId: number) => {
    setSeleccionadas((prev) =>
      prev.includes(ventaId)
        ? prev.filter((id) => id !== ventaId)
        : [...prev, ventaId]
    );
  };

  // 👉 ahora usa SOLO las ventas filtradas (por fechas)
  const seleccionarPendientes = () => {
    const ids = ventasFiltradas
      .filter((v) =>
        modo === "vendedor" ? !v.pagadaVendedor : !v.pagadaSupervisor
      )
      .map((v) => v.id);
    setSeleccionadas(ids);
  };

  const limpiarSeleccion = () => setSeleccionadas([]);

  const totalSeleccionado = useMemo(
    () =>
      ventas
        .filter((v) => seleccionadas.includes(v.id))
        .reduce((acc, v) => {
          const monto =
            modo === "vendedor"
              ? v.comisionVendedor
              : v.comisionSupervisor;
          return acc + monto;
        }, 0),
    [ventas, seleccionadas, modo]
  );

  const handlePagar = async () => {
    if (!token || !vendedorId) return;
    if (seleccionadas.length === 0) return;

    const texto =
      modo === "vendedor"
        ? `¿Confirmás marcar como pagadas al vendedor ${seleccionadas.length} ventas por un total de ${formatMoney(
            totalSeleccionado
          )}?`
        : `¿Confirmás marcar como pagadas al supervisor ${seleccionadas.length} ventas por un total de ${formatMoney(
            totalSeleccionado
          )}?`;

    if (!window.confirm(texto)) return;

    try {
      setGuardando(true);

      const url =
        modo === "vendedor"
          ? `${API_URL}/api/admin-supervisor/ventas/pagar-multiple-vendedor`
          : `${API_URL}/api/admin-supervisor/ventas/pagar-multiple`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ventasIds: seleccionadas }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No se pudo registrar el pago.");
      } else {
        await cargarDetalle();
      }
    } catch (err) {
      console.error("Error registrando pago:", err);
      alert("Error interno al registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  const irAtras = () => {
    navigate("/admin/vendedores");
  };

  // 🔹 Filtros rápidos de fechas
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

  if (!token) return null;

  return (
    <div className="sv-container">
      <header className="sv-header">
        <div>
          <button className="sv-btn-link" onClick={irAtras}>
            ← Volver a la lista de vendedores
          </button>
          <h2>Detalle de vendedor</h2>
          <p className="sv-subtitle">
            Elegí si estás pagando al <strong>vendedor</strong> (15.000 por
            venta) o al <strong>supervisor</strong> (5.000 por venta), marcá las
            ventas y confirmá. Podés filtrar por rango de fechas.
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

      {loading ? (
        <p className="sv-loading">Cargando detalle...</p>
      ) : error ? (
        <p className="sv-empty sv-error">{error}</p>
      ) : !vendedor ? (
        <p className="sv-empty">No se encontró el vendedor.</p>
      ) : (
        <>
          <section className="sv-resumen-global">
            <h3>Resumen de {vendedor.nombre}</h3>
            <p className="sv-email">{vendedor.email}</p>
            {(vendedor.localidad || vendedor.provincia) && (
              <p className="sv-localidad">
                📍 {vendedor.localidad || "-"}{" "}
                {vendedor.provincia ? `(${vendedor.provincia})` : ""}
              </p>
            )}

            <div className="sv-resumen-grid">
              <div className="sv-resumen-card">
                <span className="sv-resumen-label">Total ventas</span>
                <strong>{ventasFiltradas.length}</strong>
              </div>

              <div className="sv-resumen-card">
                <span className="sv-resumen-label">Comisión vendedor</span>
                <strong>{formatMoney(totalComisionVendedor)}</strong>
              </div>
              <div className="sv-resumen-card">
                <span className="sv-resumen-label">Pagado al vendedor</span>
                <strong>{formatMoney(totalPagadoVendedor)}</strong>
              </div>
              <div className="sv-resumen-card pendiente">
                <span className="sv-resumen-label">Pendiente vendedor</span>
                <strong>{formatMoney(totalPendienteVendedor)}</strong>
              </div>

              <div className="sv-resumen-card">
                <span className="sv-resumen-label">Comisión supervisor</span>
                <strong>{formatMoney(totalComisionSupervisor)}</strong>
              </div>
              <div className="sv-resumen-card">
                <span className="sv-resumen-label">Pagado al supervisor</span>
                <strong>{formatMoney(totalPagadoSupervisor)}</strong>
              </div>
              <div className="sv-resumen-card pendiente">
                <span className="sv-resumen-label">Pendiente supervisor</span>
                <strong>{formatMoney(totalPendienteSupervisor)}</strong>
              </div>
            </div>
          </section>

          {/* 🔹 Filtros por fecha para este vendedor */}
          <section className="sv-filters">
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
              <button
                type="button"
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                }}
              >
                Limpiar fechas
              </button>
            </div>
          </section>

          <section className="sv-detalle-actions">
            <div className="sv-detalle-actions-left">
              <div className="sv-toggle-modo">
                <button
                  className={
                    modo === "vendedor"
                      ? "sv-toggle-btn sv-toggle-btn-active"
                      : "sv-toggle-btn"
                  }
                  onClick={() => {
                    setModo("vendedor");
                    setSeleccionadas([]);
                  }}
                >
                  Pagar vendedor
                </button>
                <button
                  className={
                    modo === "supervisor"
                      ? "sv-toggle-btn sv-toggle-btn-active"
                      : "sv-toggle-btn"
                  }
                  onClick={() => {
                    setModo("supervisor");
                    setSeleccionadas([]);
                  }}
                >
                  Pagar supervisor
                </button>
              </div>

              <p className="sv-modo-help">
                Modo actual:{" "}
                <strong>
                  {modo === "vendedor"
                    ? "Vendedor (15.000 por venta)"
                    : "Supervisor (5.000 por venta)"}
                </strong>
              </p>

              <button
                className="sv-btn sv-btn-secondary"
                onClick={seleccionarPendientes}
              >
                Seleccionar todas las pendientes ({modo})
              </button>
              <button
                className="sv-btn sv-btn-ghost"
                onClick={limpiarSeleccion}
              >
                Limpiar selección
              </button>
            </div>

            <div className="sv-detalle-actions-right">
              <p>
                Seleccionadas:{" "}
                <strong>{seleccionadas.length} ventas</strong>{" "}
                {seleccionadas.length > 0 && (
                  <>
                    – Total{" "}
                    <strong>{formatMoney(totalSeleccionado)}</strong>
                  </>
                )}
              </p>
              <button
                className="sv-btn sv-btn-primary"
                disabled={seleccionadas.length === 0 || guardando}
                onClick={handlePagar}
              >
                {guardando
                  ? "Registrando pago..."
                  : modo === "vendedor"
                  ? "Registrar pago al vendedor"
                  : "Registrar pago al supervisor"}
              </button>
            </div>
          </section>

          <section className="sv-list sv-list-detalle">
            <h3>Ventas del vendedor</h3>
            {ventasOrdenadas.length === 0 ? (
              <p className="sv-empty">
                No hay ventas en el rango de fechas seleccionado.
              </p>
            ) : (
              <div className="sv-table-wrapper">
                <table className="sv-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Negocio</th>
                      <th>Monto venta</th>
                      <th>Comisión vendedor</th>
                      <th>Comisión supervisor</th>
                      <th style={{ textAlign: "center" }}>
                        Seleccionar ({modo})
                      </th>
                      <th>Estado vendedor</th>
                      <th>Estado supervisor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasOrdenadas.map((v) => {
                      const disabled =
                        modo === "vendedor"
                          ? v.pagadaVendedor
                          : v.pagadaSupervisor;

                      return (
                        <tr key={v.id}>
                          <td>{formatDate(v.fecha)}</td>
                          <td>
                            {v.negocioNombre
                              ? `${v.negocioNombre} (${
                                  v.negocioLocalidad || "-"
                                } - ${v.negocioProvincia || "-"})`
                              : "-"}
                          </td>
                          <td>
                            {typeof v.montoVenta === "number"
                              ? formatMoney(v.montoVenta)
                              : "-"}
                          </td>
                          <td>{formatMoney(v.comisionVendedor)}</td>
                          <td>{formatMoney(v.comisionSupervisor)}</td>
                          <td style={{ textAlign: "center" }}>
                            {!disabled && (
                              <input
                                type="checkbox"
                                checked={seleccionadas.includes(v.id)}
                                onChange={() => toggleSeleccion(v.id)}
                              />
                            )}
                          </td>
                          <td>
                            {v.pagadaVendedor ? (
                              <span className="sv-badge sv-badge-ok">
                                Pagado
                              </span>
                            ) : (
                              <span className="sv-badge sv-badge-pend">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td>
                            {v.pagadaSupervisor ? (
                              <span className="sv-badge sv-badge-ok">
                                Pagado
                              </span>
                            ) : (
                              <span className="sv-badge sv-badge-pend">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {pagosSupervisor && pagosSupervisor.length > 0 && (
            <section className="sv-detalle-pagos-historial">
              <h3>Historial de pagos al supervisor</h3>
              <ul className="sv-pagos-list">
                {pagosSupervisor.map((p) => (
                  <li key={p.id} className="sv-pago-item">
                    <div className="sv-pago-header">
                      <strong>{formatMoney(p.monto)}</strong>
                      <span>{formatDate(p.fechaPago)}</span>
                    </div>
                    {p.observacion && (
                      <p className="sv-pago-observacion">
                        {p.observacion}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default AdminVendedorDetallePage;
