import React, { useEffect, useState } from "react";
import "./AdminDashboardPage.css";

const API = import.meta.env.VITE_API_URL;
export const API_URL = API ? API : "http://localhost:3000";

interface AdminDashboardResumen {
  totalNegociosActivos: number;
  totalNegociosInactivos: number;
  totalNegociosPremium: number;
  totalVendedores: number;
  ventasMesMonto: number;
  ventasMesComision: number;
  puntosMesTotales: number;
  proximaFechaSorteo: string | null;

  // 💰 suscripciones / ingresos
  precioPlanMensual: number;
  ingresosMesActual: number;
  ingresosMesAnterior: number;
  ingresosEstimadoProximoMes: number;

  // negocios como suscripción
  negociosMesActual: number;
  negociosMesAnterior: number;

  // 🔥 ESTADO PREMIUM
  negociosPremiumActivos: number;
  negociosPremiumVencidos: number;
  negociosPremiumPorVencer: number;
  negociosPremiumAlDia: number;
}

const AdminDashboardPage: React.FC = () => {
  const [resumen, setResumen] = useState<AdminDashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarResumen = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("panelToken");

        const resp = await fetch(`${API_URL}/api/admin/dashboard-resumen`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!resp.ok) {
          throw new Error("No se pudo obtener el resumen de admin");
        }

        const data = await resp.json();
        setResumen(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error cargando dashboard");
      } finally {
        setLoading(false);
      }
    };

    cargarResumen();
  }, []);

  const formatNumber = (n: number | undefined) =>
    typeof n === "number"
      ? n.toLocaleString("es-AR", { maximumFractionDigits: 0 })
      : "-";

  const formatMoney = (n: number | undefined) =>
    typeof n === "number"
      ? n.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        })
      : "-";

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="admin-dashboard">
      <h2 className="admin-dashboard-title">Resumen general</h2>

      {loading && <p className="admin-dashboard-status">Cargando...</p>}
      {error && <p className="admin-dashboard-error">{error}</p>}

      {resumen && !loading && !error && (
        <>
          {/* ========================================
              BLOQUE 1: NEGOCIOS + ESTADO PREMIUM
             ======================================== */}
          <section className="admin-dashboard-grid">
            <div className="admin-card primary">
              <h3>Negocios</h3>
              <p className="admin-card-main">
                {formatNumber(resumen.totalNegociosActivos)}
              </p>
              <p className="admin-card-sub">
                activos /{" "}
                <span>{formatNumber(resumen.totalNegociosInactivos)} inactivos</span>
              </p>
            </div>

            <div className="admin-card">
              <h3>Total premium</h3>
              <p className="admin-card-main">
                {formatNumber(resumen.totalNegociosPremium)}
              </p>
              <p className="admin-card-sub">vigentes + vencidos</p>
            </div>

            <div className="admin-card success">
              <h4>Premium activos</h4>
              <p className="admin-card-main">
                {formatNumber(resumen.negociosPremiumActivos)}
              </p>
              <p className="admin-card-sub">vigentes hoy</p>
            </div>

            <div className="admin-card warning">
              <h4>Premium por vencer</h4>
              <p className="admin-card-main">
                {formatNumber(resumen.negociosPremiumPorVencer)}
              </p>
              <p className="admin-card-sub">vencen en 7 días</p>
            </div>

            <div className="admin-card">
              <h4>Premium al día</h4>
              <p className="admin-card-main">
                {formatNumber(resumen.negociosPremiumAlDia)}
              </p>
              <p className="admin-card-sub">sin vencimiento cercano</p>
            </div>

            <div className="admin-card danger">
              <h4>Premium vencidos</h4>
              <p className="admin-card-main">
                {formatNumber(resumen.negociosPremiumVencidos)}
              </p>
              <p className="admin-card-sub">necesitan renovar</p>
            </div>
          </section>

          {/* ========================================
              BLOQUE 2: PUNTOS / VENTAS
             ======================================== */}
          <section className="admin-dashboard-grid">
            <div className="admin-card">
              <h3>Vendedores</h3>
              <p className="admin-card-main">
                {formatNumber(resumen.totalVendedores)}
              </p>
            </div>

            <div className="admin-card">
              <h3>Ventas del mes</h3>
              <p className="admin-card-main">
                {formatMoney(resumen.ventasMesMonto)}
              </p>
              <p className="admin-card-sub">
                Comisiones: {formatMoney(resumen.ventasMesComision)}
              </p>
            </div>

            <div className="admin-card">
              <h3>Puntos del mes</h3>
              <p className="admin-card-main">
                {formatNumber(resumen.puntosMesTotales)}
              </p>
            </div>

            <div className="admin-card">
              <h3>Próximo sorteo</h3>
              <p className="admin-card-main">
                {formatDate(resumen.proximaFechaSorteo)}
              </p>
            </div>
          </section>

          {/* ========================================
              BLOQUE 3: SUSCRIPCIONES / INGRESOS
             ======================================== */}
          <section className="admin-dashboard-grid">
            <div className="admin-card">
              <h4>Precio plan mensual</h4>
              <p className="admin-card-main">
                {formatMoney(resumen.precioPlanMensual)}
              </p>
            </div>

            <div className="admin-card">
              <h4>Ingresos mes actual</h4>
              <p className="admin-card-main">
                {formatMoney(resumen.ingresosMesActual)}
              </p>
              <p className="admin-card-sub">
                altas: {formatNumber(resumen.negociosMesActual)}
              </p>
            </div>

            <div className="admin-card">
              <h4>Ingresos mes anterior</h4>
              <p className="admin-card-main">
                {formatMoney(resumen.ingresosMesAnterior)}
              </p>
              <p className="admin-card-sub">
                altas: {formatNumber(resumen.negociosMesAnterior)}
              </p>
            </div>

            <div className="admin-card primary">
              <h4>MRR (proyección)</h4>
              <p className="admin-card-main">
                {formatMoney(resumen.ingresosEstimadoProximoMes)}
              </p>
              <p className="admin-card-sub">
                con {formatNumber(resumen.negociosPremiumActivos)} suscripciones activas
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
