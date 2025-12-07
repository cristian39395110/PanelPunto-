// src/assets/pages/Supervisor/SupervisorVendedorDetallePage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./SupervisorVendedorDetallePage.css";

const API_URL = import.meta.env.VITE_API_URL;

interface VendedorDetalle {
  id: number;
  nombre: string;
  email: string;
  documento?: string | null;
  telefono?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  bloqueado?: boolean;
}

interface VentaResumen {
  id: number;
  fechaVenta: string;
  comision: number;
  pagado: boolean;
  Negocio?: {
    id: number;
    nombre: string;
  };
}

const SupervisorVendedorDetallePage: React.FC = () => {
  const { vendedorId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("panelToken");

  const [vendedor, setVendedor] = useState<VendedorDetalle | null>(null);
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!vendedorId) return;

    const cargar = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/supervisor/vendedor/${vendedorId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok || data.ok === false) {
          setError(data.error || "No se pudo cargar el vendedor.");
          setVendedor(null);
          setVentas([]);
        } else {
          setVendedor(data.vendedor);
          setVentas(data.ventas || []);
        }
      } catch (err) {
        console.error(err);
        setError("Error de conexión.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [vendedorId, token, navigate]);

  if (loading) return <p>Cargando vendedor...</p>;
  if (error) return <p>{error}</p>;
  if (!vendedor) return <p>No se encontró el vendedor.</p>;

  return (
    <div className="sup-vendedor-detalle-page">
      <h2>Detalle del vendedor</h2>

      <div className="sup-vendedor-detalle-card">
        <p>
          <strong>Nombre:</strong> {vendedor.nombre}
        </p>
        <p>
          <strong>Email:</strong> {vendedor.email}
        </p>
        <p>
          <strong>Documento:</strong> {vendedor.documento || "—"}
        </p>
        <p>
          <strong>Teléfono:</strong> {vendedor.telefono || "No informado"}
        </p>
        <p>
          <strong>Provincia:</strong> {vendedor.provincia || "—"}
        </p>
        <p>
          <strong>Localidad:</strong> {vendedor.localidad || "—"}
        </p>
        <p>
          <strong>Estado:</strong> {vendedor.bloqueado ? "Bloqueado" : "Activo"}
        </p>
      </div>

      <h3>Ventas del vendedor</h3>
      {ventas.length === 0 ? (
        <p>Este vendedor todavía no tiene ventas registradas.</p>
      ) : (
        <ul className="sup-vendedor-ventas-lista">
          {ventas.map((v) => (
            <li key={v.id} className="sup-vendedor-venta-item">
              <p>
                <strong>Negocio:</strong> {v.Negocio?.nombre || "—"}
              </p>
              <p>
                <strong>Fecha:</strong>{" "}
                {new Date(v.fechaVenta).toLocaleString()}
              </p>
              <p>
                <strong>Comisión:</strong> ${v.comision}
              </p>
              <p>
                <strong>Estado pago:</strong> {v.pagado ? "Pagado" : "Pendiente"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => navigate(-1)}>⬅ Volver</button>
    </div>
  );
};

export default SupervisorVendedorDetallePage;
