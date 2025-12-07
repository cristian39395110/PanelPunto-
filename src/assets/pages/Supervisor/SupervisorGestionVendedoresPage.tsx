import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SupervisorVendedorPage.css"; // reutilizamos estilos sv-*

const API_URL = import.meta.env.VITE_API_URL;

interface VendedorGestion {
  id: number;
  nombre: string;
  email: string;
  provincia: string | null;
  aliasPago?: string | null;
  documento?: string | null;
  activo: boolean;
  telefono?: string | null; // 👈 por si después lo querés mostrar
}

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

const SupervisorGestionVendedoresPage: React.FC = () => {
  const navigate = useNavigate();

  // provincia para FILTRAR y ver la lista
  const [provincia, setProvincia] = useState<string>("");

  // provincia para el ALTA (select dentro del form)
  const [provinciaAlta, setProvinciaAlta] = useState<string>("");

  const [busqueda, setBusqueda] = useState<string>("");

  const [vendedores, setVendedores] = useState<VendedorGestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Alta
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoDocumento, setNuevoDocumento] = useState("");
  const [nuevoAliasPago, setNuevoAliasPago] = useState("");
  const [feedbackAlta, setFeedbackAlta] = useState("");

  const token = localStorage.getItem("panelToken");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
  }, []);

  // Si cambias la provincia del filtro, la uso como valor por defecto del alta
  useEffect(() => {
    if (provincia && !provinciaAlta) {
      setProvinciaAlta(provincia);
    }
  }, [provincia, provinciaAlta]);

  // Cargar vendedores cuando cambie provincia o búsqueda (debounce)
  useEffect(() => {
    if (!token || !provincia) return;
    const timer = setTimeout(() => {
      cargarVendedores();
    }, 400);
    return () => clearTimeout(timer);
  }, [provincia, busqueda]);

  const cargarVendedores = async () => {
    if (!token || !provincia) return;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("provincia", provincia);
      if (busqueda) params.set("q", busqueda);

      const res = await fetch(
        `${API_URL}/api/supervisor/gestion-vendedores?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error cargando vendedores.");
        setVendedores([]);
      } else {
        setVendedores(data.vendedores || []);
      }
    } catch (err) {
      console.error("Error cargando vendedores (gestión):", err);
      setError("No se pudieron cargar los vendedores.");
    }

    setLoading(false);
  };

  const limpiarFormAlta = () => {
    setNuevoNombre("");
    setNuevoTelefono("");
    setNuevoEmail("");
    setNuevoDocumento("");
    setNuevoAliasPago("");
    setFeedbackAlta("");
    // no limpio provinciaAlta para que quede seleccionada
  };

  const handleAltaVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!provinciaAlta) {
      setFeedbackAlta("Elegí la provincia del vendedor.");
      return;
    }
    if (!nuevoNombre.trim() || !nuevoEmail.trim()) {
      setFeedbackAlta("Completá nombre y email.");
      return;
    }
    if (!nuevoTelefono.trim()) {
      setFeedbackAlta("Completá el teléfono del vendedor.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/supervisor/gestion-vendedores`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          email: nuevoEmail.trim(),
          telefono: nuevoTelefono.trim(),
          documento: nuevoDocumento.trim() || null,
          provincia: provinciaAlta,
          aliasPago: nuevoAliasPago.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedbackAlta(data.error || "No se pudo dar de alta al vendedor.");
      } else {
        setFeedbackAlta("✅ Vendedor dado de alta correctamente.");
        limpiarFormAlta();
        // si la provincia del alta coincide con la del filtro, recargo lista
        if (provinciaAlta === provincia) {
          cargarVendedores();
        }
      }
    } catch (err) {
      console.error("Error en alta de vendedor:", err);
      setFeedbackAlta("Error de conexión al dar de alta.");
    }
  };

  const toggleEstadoVendedor = async (vendedor: VendedorGestion) => {
    if (!token) return;

    const accion = vendedor.activo ? "dar de baja" : "activar";
    const ok = window.confirm(
      `¿Seguro que querés ${accion} al vendedor ${vendedor.nombre}?`
    );
    if (!ok) return;

    try {
      const res = await fetch(
        `${API_URL}/api/supervisor/gestion-vendedores/${vendedor.id}/estado`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activo: !vendedor.activo,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No se pudo actualizar el estado del vendedor.");
        return;
      }

      setVendedores((prev) =>
        prev.map((v) =>
          v.id === vendedor.id ? { ...v, activo: !vendedor.activo } : v
        )
      );
    } catch (err) {
      console.error("Error cambiando estado del vendedor:", err);
      alert("Error de conexión al cambiar el estado del vendedor.");
    }
  };

  return (
    <div className="sv-container">
      <header className="sv-header">
        <div>
          <h2>Alta / baja de vendedores</h2>
          <p className="sv-subtitle">
            Gestioná los vendedores por provincia. Podés darlos de alta o
            bloquearlos cuando haga falta.
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

      {/* FILTROS PARA LISTAR / DAR DE BAJA */}
      <section className="sv-filters">
        <div className="sv-field">
          <label>Provincia (para ver la lista)</label>
          <select
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
          >
            <option value="">Seleccioná una provincia</option>
            {PROVINCIAS_AR.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="sv-field">
          <label>Buscar por nombre o email</label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: juan@correo.com"
          />
        </div>

        {provincia && (
          <button className="sv-btn sv-btn-primary" onClick={cargarVendedores}>
            Recargar lista
          </button>
        )}
      </section>

      {/* FORMULARIO DE ALTA – NUEVO ESTILO */}
      <section className="sv-alta-section">
        <div className="sv-alta-card">
          <div className="sv-alta-header">
            <h3>Alta de vendedor</h3>
            <p>
              Cargá un nuevo vendedor. Se creará su usuario de panel con estos
              datos y se asociará a la provincia elegida.
            </p>
          </div>

          <form className="sv-alta-form" onSubmit={handleAltaVendedor}>
            <div className="sv-alta-grid">
              <div className="sv-field">
                <label>Provincia del vendedor</label>
                <select
                  value={provinciaAlta}
                  onChange={(e) => setProvinciaAlta(e.target.value)}
                >
                  <option value="">Seleccioná una provincia</option>
                  {PROVINCIAS_AR.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sv-field">
                <label>Nombre</label>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="sv-field">
                <label>Email</label>
                <input
                  type="email"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  placeholder="Ej: juan@correo.com"
                />
              </div>

              <div className="sv-field">
                <label>Teléfono</label>
                <input
                  type="text"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  placeholder="Ej: 2664..."
                />
              </div>

              <div className="sv-field">
                <label>Documento (DNI / CUIT)</label>
                <input
                  type="text"
                  value={nuevoDocumento}
                  onChange={(e) => setNuevoDocumento(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="sv-field">
                <label>Alias / CBU / CVU para pagos</label>
                <input
                  type="text"
                  value={nuevoAliasPago}
                  onChange={(e) => setNuevoAliasPago(e.target.value)}
                  placeholder="Ej: alias.mercadopago"
                />
              </div>
            </div>

            {feedbackAlta && (
              <p className="sv-alert-feedback" style={{ marginTop: 8 }}>
                {feedbackAlta}
              </p>
            )}

            <div className="sv-alta-actions">
              <button type="submit" className="sv-btn sv-btn-primary">
                Dar de alta vendedor
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* LISTA DE VENDEDORES DE ESA PROVINCIA (FILTRO DE ARRIBA) */}
      {provincia ? (
        loading ? (
          <p className="sv-loading">Cargando vendedores...</p>
        ) : error ? (
          <p className="sv-error">{error}</p>
        ) : vendedores.length === 0 ? (
          <p className="sv-empty">
            No hay vendedores cargados para esta provincia todavía.
          </p>
        ) : (
          <section className="sv-list">
            {vendedores.map((v) => (
              <article key={v.id} className="sv-card">
                <div className="sv-card-header">
                  <div>
                    <h3>{v.nombre}</h3>
                    <p className="sv-email">{v.email}</p>
                    {v.provincia && (
                      <p className="sv-localidad">📍 {v.provincia}</p>
                    )}
                    {v.telefono && (
                      <p className="sv-doc">📞 {v.telefono}</p>
                    )}
                    {v.documento && (
                      <p className="sv-doc">🪪 {v.documento}</p>
                    )}
                    {v.aliasPago && (
                      <p className="sv-alias">💰 {v.aliasPago}</p>
                    )}
                  </div>
                  <div>
                    <span
                      className={
                        v.activo
                          ? "sv-badge sv-badge-ok"
                          : "sv-badge sv-badge-pend"
                      }
                    >
                      {v.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>

                <div className="sv-card-footer">
                  <button
                    className="sv-btn sv-btn-alerta"
                    onClick={() => toggleEstadoVendedor(v)}
                  >
                    {v.activo ? "Dar de baja" : "Reactivar"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )
      ) : (
        <p className="sv-empty">
          Elegí una provincia (arriba) para ver y gestionar vendedores.
        </p>
      )}
    </div>
  );
};

export default SupervisorGestionVendedoresPage;
