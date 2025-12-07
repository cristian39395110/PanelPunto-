import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./VendedorHomePage.css";

const API_URL = import.meta.env.VITE_API_URL;

interface VentaVendedor {
  id: number;
  nombreNegocio: string;
  fechaVenta: string;
  comision: number;
  pagado: boolean;
}

const VendedorHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<VentaVendedor[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("panelToken");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    cargarVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarVentas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/vendedor/mias`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      // Me aseguro que vengan ordenadas de la más nueva a la más vieja
      const lista = (data.ventas || []).sort(
        (a: VentaVendedor, b: VentaVendedor) =>
          new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime()
      );

      setVentas(lista);
    } catch (error) {
      console.error("Error cargando ventas:", error);
    }

    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // 📊 Métricas rápidas
  const totalVentas = ventas.length;
  const ventasPagadas = ventas.filter((v) => v.pagado).length;
  const ventasPendientes = totalVentas - ventasPagadas;

  // Formateo de fecha y dinero (por si querés dejarlo más prolijo)
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

  return (
    <div className="vend-container">
      <header className="vend-header">
        <div>
          <h1 className="vend-title">Mis ventas</h1>
          <p className="vend-subtitle">
            Resumen de negocios que cargaste en Punto+.
          </p>
        </div>

        <button className="vend-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>

      <main className="vend-main">
        {loading ? (
          <p className="vend-cargando">Cargando tus ventas...</p>
        ) : ventas.length === 0 ? (
          <p className="vend-empty">
            Todavía no registraste ventas. Tocá <strong>+ Nuevo</strong> para
            cargar tu primer negocio.
          </p>
        ) : (
          <>
            {/* 📊 RESUMEN ARRIBA */}
            <section className="vend-resumen">
              <div className="vend-resumen-item">
                <span className="vend-resumen-label">Total ventas</span>
                <span className="vend-resumen-value">{totalVentas}</span>
              </div>
              <div className="vend-resumen-item">
                <span className="vend-resumen-label">Pagadas</span>
                <span className="vend-resumen-value vend-resumen-ok">
                  {ventasPagadas}
                </span>
              </div>
              <div className="vend-resumen-item">
                <span className="vend-resumen-label">Pendientes</span>
                <span className="vend-resumen-value vend-resumen-pendiente">
                  {ventasPendientes}
                </span>
              </div>
            </section>

            {/* LISTADO DE VENTAS */}
            <div className="vend-list">
              {ventas.map((v, index) => {
                // Numero de venta: la última (más nueva) es la #total
                const numeroVenta = totalVentas - index;

                return (
                  <article
                    key={v.id}
                    className={`vend-card ${
                      v.pagado ? "vend-card--pagado" : "vend-card--nopagado"
                    }`}
                  >
                    <header className="vend-card-header">
                      <span className="vend-card-badge">
                        Venta #{numeroVenta}
                      </span>
                      <h3 className="vend-card-title">{v.nombreNegocio}</h3>
                    </header>

                    <p className="vend-card-line">
                      <span>Fecha</span>
                      <span>{formatDate(v.fechaVenta)}</span>
                    </p>
                    <p className="vend-card-line">
                      <span>Comisión</span>
                      <span>{formatMoney(Number(v.comision || 0))}</span>
                    </p>
                    <p className="vend-card-status">
                      {v.pagado ? "Pagado ✔" : "Pendiente ✖"}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Botón flotante */}
      <button
        className="vend-btn-float"
        onClick={() => navigate("/vendedor/alta-negocio")}
      >
        + Nuevo
      </button>
    </div>
  );
};

export default VendedorHomePage;
