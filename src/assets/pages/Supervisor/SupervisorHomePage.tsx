import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SupervisorHomePage.css";

const API_URL = import.meta.env.VITE_API_URL;

interface Venta {
  id: number;
  nombreNegocio: string;
  fechaVenta: string;
  vendedorNombre: string;
  comisionSupervisor: number;
  pagadoSupervisor: boolean;
  fechaPagoSupervisor: string | null;
}

const SupervisorHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("panelToken");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/supervisor/ventas`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setVentas(data.ventas || []);
    } catch (error) {
      console.error("Error cargando ventas del supervisor:", error);
    }

    setLoading(false);
  };

  const marcarPagado = async (ventaId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/supervisor/pagar/${ventaId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        cargarVentas();
      } else {
        alert(data.error || "No se pudo marcar como pagado");
      }
    } catch (error) {
      console.error("Error pagando comisión:", error);
    }
  };

  return (
    <div className="sup-container">
      <header className="sup-header">
        <h2>Ventas de Vendedores</h2>
        <button
          className="sup-logout"
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
        >
          Cerrar sesión
        </button>
      </header>

      {loading ? (
        <p className="sup-cargando">Cargando...</p>
      ) : ventas.length === 0 ? (
        <p className="sup-empty">Aún no hay ventas registradas.</p>
      ) : (
        <div className="sup-list">
          {ventas.map((v) => (
            <div key={v.id} className="sup-card">
              <h3>{v.nombreNegocio}</h3>

              <p><strong>Fecha:</strong> {v.fechaVenta}</p>
              <p><strong>Vendedor:</strong> {v.vendedorNombre}</p>
              <p><strong>Comisión Supervisor:</strong> ${v.comisionSupervisor}</p>

              <p
                className={
                  v.pagadoSupervisor ? "sup-pagado" : "sup-no-pagado"
                }
              >
                {v.pagadoSupervisor ? "Pagado ✔" : "Pendiente ✖"}
              </p>

              {!v.pagadoSupervisor && (
                <button
                  className="sup-btn-pagar"
                  onClick={() => marcarPagado(v.id)}
                >
                  Marcar como Pagado
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupervisorHomePage;
