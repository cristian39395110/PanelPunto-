import React, { useEffect, useMemo, useState } from "react";
const API = import.meta.env.VITE_API_URL;
export const API_URL = API ? API : "http://localhost:3000";
import "./AdminRetosPage.css";

type TipoReto =
  | "visitas"
  | "movimiento_distancia"
  | "puntos"
  | "destino_unico"
  | "general";

interface Reto {
  id: number;
  titulo: string;
  descripcion: string;
  puntos: number;
  tipo: TipoReto;
  meta?: number | null;
  rangoDias?: number | null;
  destinoLatitud?: number | null | string;
  destinoLongitud?: number | null | string;
  destinoRadioMetros?: number | null;
  activo: boolean;
  provincia: string | null;
  localidad?: string | null;
  createdAt?: string;

  // 👇 nuevo
  statsUsuarios?: {
    total: number;
    porProvincia: Record<string, number>;
  };
}


interface ProgresoUsuario {
  usuarioId: number;
  nombre: string;
  provincia?: string | null;
  localidad?: string | null;
  puntosOtorgados: number;
}

interface ProgresoResponse {
  ok: boolean;
  reto: Reto;
  progresos: {
    usuarioId: number;
    puntosOtorgados: number;
    usuario?: {
      id: number;
      nombre: string;
      provincia?: string | null;
      localidad?: string | null;
    };
  }[];
}

// Provincias en array para el <select>
const PROVINCIAS_AR = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
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

// valor especial para "todas las provincias"
const TODAS_PROVINCIAS = "__TODAS__";

type PlantillaReto = "" | "VISITA_1" | "VISITA_3" | "CAMINAR_3KM";

interface NuevoRetoState {
  titulo: string;
  descripcion: string;
  puntos: number;
  tipo: TipoReto;
  meta: number | null;
  rangoDias: number | null;
  destinoLatitud: number | null;
  destinoLongitud: number | null;
  destinoRadioMetros: number | null;
  provincia: string;
  localidad: string;
}

const AdminRetosPage: React.FC = () => {
  const token = useMemo(() => localStorage.getItem("panelToken") || "", []);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // filtros
  const [provinciaFiltro, setProvinciaFiltro] =
    useState<string>(TODAS_PROVINCIAS);

  // estado base
  const [retos, setRetos] = useState<Reto[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // modal crear reto
  const [mostrarModalReto, setMostrarModalReto] = useState(false);
  const [plantilla, setPlantilla] = useState<PlantillaReto>("");

  const [nuevoReto, setNuevoReto] = useState<NuevoRetoState>({
    titulo: "",
    descripcion: "",
    puntos: 100,
    tipo: "visitas",
    meta: 3,
    rangoDias: 7,
    destinoLatitud: null,
    destinoLongitud: null,
    destinoRadioMetros: 100,
    provincia: TODAS_PROVINCIAS, // por defecto, reto nacional
    localidad: "",
  });

  // progreso de un reto
  const [retoSeleccionado, setRetoSeleccionado] = useState<Reto | null>(null);
  const [progreso, setProgreso] = useState<ProgresoUsuario[]>([]);
  const [cargandoProgreso, setCargandoProgreso] = useState(false);

  // ===================== CARGAR RETOS =====================
  const cargarRetos = async () => {
    try {
      setLoading(true);
      setError(null);
      setMensaje(null);

      const params = new URLSearchParams();

      // si NO es "todas", agrego la provincia al query
      if (provinciaFiltro && provinciaFiltro !== TODAS_PROVINCIAS) {
        params.set("provincia", provinciaFiltro);
      }

      // armamos la URL final
      const url = params.toString()
        ? `${API_URL}/api/admin/retos?${params.toString()}`
        : `${API_URL}/api/admin/retos`;

      const resp = await fetch(url, { headers });

      if (!resp.ok) {
        throw new Error("No se pudieron cargar los retos");
      }

      const data: { ok?: boolean; retos?: Reto[] } | Reto[] = await resp.json();

      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data.retos)
        ? data.retos
        : [];

      setRetos(lista);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error cargando retos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    cargarRetos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinciaFiltro, token]);

  // ===================== PLANTILLAS =====================
  const aplicarPlantilla = (p: PlantillaReto) => {
    setPlantilla(p);

    if (p === "VISITA_1") {
      setNuevoReto((prev) => ({
        ...prev,
        titulo: "Visitá 1 negocio",
        descripcion:
          "Pasá por al menos un negocio adherido en tu provincia y escaneá tu QR.",
        tipo: "visitas",
        meta: 1,
        rangoDias: 7,
        puntos: 100,
      }));
    } else if (p === "VISITA_3") {
      setNuevoReto((prev) => ({
        ...prev,
        titulo: "Comprá en 3 negocios distintos",
        descripcion:
          "Comprá en 3 negocios distintos adheridos en tu provincia y escaneá tu QR.",
        tipo: "visitas",
        meta: 3,
        rangoDias: 10,
        puntos: 300,
      }));
    } else if (p === "CAMINAR_3KM") {
      const km = 3;
      setNuevoReto((prev) => ({
        ...prev,
        titulo: `Caminá ${km} km`,
        descripcion: `Sumá al menos ${km} km caminados usando la app dentro del plazo del reto.`,
        tipo: "movimiento_distancia",
        meta: km * 1000, // metros
        rangoDias: 5,
        puntos: 200,
      }));
    }
  };

  // ===================== CREAR RETO =====================
  const crearReto = async () => {
    try {
      setError(null);
      setMensaje(null);

      if (!nuevoReto.titulo.trim() || !nuevoReto.descripcion.trim()) {
        alert("Completá título y descripción");
        return;
      }
      if (!nuevoReto.provincia) {
        alert("Seleccioná una provincia (o Todas)");
        return;
      }

      const body = {
        titulo: nuevoReto.titulo.trim(),
        descripcion: nuevoReto.descripcion.trim(),
        puntos: nuevoReto.puntos,
        tipo: nuevoReto.tipo,
        meta: nuevoReto.meta,
        rangoDias: nuevoReto.rangoDias,
        destinoLatitud: nuevoReto.destinoLatitud,
        destinoLongitud: nuevoReto.destinoLongitud,
        destinoRadioMetros: nuevoReto.destinoRadioMetros,
        // si eligió "Todas las provincias", mandamos null al backend
        provincia:
          nuevoReto.provincia === TODAS_PROVINCIAS
            ? null
            : nuevoReto.provincia,
        localidad: nuevoReto.localidad.trim() || null,
      };

      const resp = await fetch(`${API_URL}/api/admin/retos/crear`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "No se pudo crear el reto");
      }

      const data: Reto = await resp.json();
      setRetos((prev) => [data, ...prev]);
      setMensaje("Reto creado correctamente");
      setMostrarModalReto(false);
      setPlantilla("");
      setNuevoReto({
        titulo: "",
        descripcion: "",
        puntos: 100,
        tipo: "visitas",
        meta: 3,
        rangoDias: 7,
        destinoLatitud: null,
        destinoLongitud: null,
        destinoRadioMetros: 100,
        provincia:
          provinciaFiltro === TODAS_PROVINCIAS
            ? TODAS_PROVINCIAS
            : provinciaFiltro,
        localidad: "",
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudo crear el reto");
    }
  };

  // ===================== ACTIVAR / DESACTIVAR =====================
  const activarReto = async (id: number) => {
    try {
      setError(null);
      const resp = await fetch(`${API_URL}/api/admin/retos/${id}/activar`, {
        method: "PATCH",
        headers,
      });
      if (!resp.ok) throw new Error("No se pudo activar el reto");
      setMensaje("Reto activado");
      cargarRetos();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error activando reto");
    }
  };

  const desactivarReto = async (id: number) => {
    try {
      setError(null);
      const resp = await fetch(
        `${API_URL}/api/admin/retos/${id}/desactivar`,
        {
          method: "PATCH",
          headers,
        }
      );
      if (!resp.ok) throw new Error("No se pudo desactivar el reto");
      setMensaje("Reto desactivado");
      cargarRetos();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error desactivando reto");
    }
  };

  // ===================== PROGRESO =====================
  const verProgresoReto = async (reto: Reto) => {
    try {
      setRetoSeleccionado(reto);
      setCargandoProgreso(true);
      setProgreso([]);
      setError(null);
      setMensaje(null);

      const resp = await fetch(
        `${API_URL}/api/admin/retos/${reto.id}/progreso`,
        { headers }
      );

      if (!resp.ok) {
        throw new Error("No se pudo obtener el progreso del reto");
      }

      const data: ProgresoResponse = await resp.json();

      const lista: ProgresoUsuario[] = (data.progresos || []).map((p) => ({
        usuarioId: p.usuarioId,
        nombre: p.usuario?.nombre || `Usuario #${p.usuarioId}`,
        provincia: p.usuario?.provincia ?? null,
        localidad: p.usuario?.localidad ?? null,
        puntosOtorgados: p.puntosOtorgados,
      }));

      setProgreso(lista);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error cargando progreso del reto");
    } finally {
      setCargandoProgreso(false);
    }
  };

  // ===================== EJECUTAR GANADORES =====================
  const ejecutarGanadores = async (reto: Reto) => {
    const ok = window.confirm(
      `¿Ejecutar ganadores para el reto "${reto.titulo}"?\nSe guardará el historial de posiciones según puntos del reto.`
    );
    if (!ok) return;

    try {
      setError(null);
      setMensaje(null);
      const resp = await fetch(
        `${API_URL}/api/admin/retos/${reto.id}/ganadores`,
        {
          method: "POST",
          headers,
        }
      );
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "No se pudo ejecutar ganadores");
      }
      setMensaje("Ganadores del reto calculados y guardados.");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error ejecutando ganadores del reto");
    }
  };

  // ===================== UI HELPERS =====================
  const labelTipo = (t: TipoReto) => {
    switch (t) {
      case "visitas":
        return "🛒 Visitas a negocios";
      case "movimiento_distancia":
        return "🚶‍♀️ Movimiento / distancia";
      case "puntos":
        return "⭐ Acumular puntos";
      case "destino_unico":
        return "📍 Destino único";
      case "general":
      default:
        return "📦 General";
    }
  };

  return (
    <div className="admin-retos">
      <h2 className="admin-retos-title">Retos por provincia</h2>

      {/* FILTROS */}
      <section className="admin-retos-filtros">
        <div className="filtro-group">
          <label>Provincia</label>
          <select
            value={provinciaFiltro}
            onChange={(e) => setProvinciaFiltro(e.target.value)}
          >
            <option value={TODAS_PROVINCIAS}>🌎 Todas las provincias</option>
            {PROVINCIAS_AR.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-retos-actions">
          <button
            type="button"
            onClick={cargarRetos}
            disabled={loading}
          >
            Recargar retos
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setMostrarModalReto(true);
              setNuevoReto((prev) => ({
                ...prev,
                provincia:
                  provinciaFiltro === TODAS_PROVINCIAS
                    ? TODAS_PROVINCIAS
                    : provinciaFiltro,
              }));
            }}
          >
            ➕ Nuevo reto
          </button>
        </div>
      </section>

      {/* STATUS */}
      {loading && <p className="admin-retos-status">Cargando...</p>}
      {error && <p className="admin-retos-error">{error}</p>}
      {mensaje && <p className="admin-retos-ok">{mensaje}</p>}

      {/* LISTA RETOS */}
      <section className="admin-retos-lista">
        {retos.length === 0 && !loading ? (
          <p className="admin-retos-status">
            No hay retos para ese filtro todavía.
          </p>
        ) : (
          retos.map((r) => (
            <div
              key={r.id}
              className={`reto-card-admin ${r.activo ? "active" : "inactive"}`}
            >
              <div className="reto-card-header">
                <div>
                  <div className="reto-titulo">{r.titulo}</div>
                  <div className="reto-sub">
                    {labelTipo(r.tipo)} · {r.puntos} pts
                  </div>
                  <div className="reto-sub">
                    {r.provincia ? r.provincia : "🌎 Todas las provincias"}
                    {r.localidad ? ` · ${r.localidad}` : ""}
                  </div>
                </div>
                <div>
                  {r.activo ? (
                    <span className="badge badge-ok">Activo</span>
                  ) : (
                    <span className="badge badge-off">Inactivo</span>
                  )}
                </div>
              </div>

              <div className="reto-desc">{r.descripcion}</div>

          <div className="reto-meta-row">
  {typeof r.meta === "number" && r.meta > 0 && (
    <span className="pill pill-light">
      {r.tipo === "movimiento_distancia"
        ? `${(r.meta / 1000).toFixed(1)} km`
        : `Meta: ${r.meta}`}
    </span>
  )}
  {typeof r.rangoDias === "number" && r.rangoDias > 0 && (
    <span className="pill pill-light">
      Ventana: {r.rangoDias} días
    </span>
  )}
  {r.tipo === "destino_unico" &&
    r.destinoLatitud != null &&
    r.destinoLongitud != null && (() => {
      const lat = Number(r.destinoLatitud);
      const lng = Number(r.destinoLongitud);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return (
        <span className="pill pill-light">
          📍 {lat.toFixed(4)} / {lng.toFixed(4)}
        </span>
      );
    })()}
</div>

{/* 👇 NUEVO BLOQUE: stats de usuarios */}
{r.statsUsuarios && r.statsUsuarios.total > 0 && (
  <div className="reto-meta-row">
    <span className="pill pill-outline">
      👥 {r.statsUsuarios.total} usuarios con puntos
    </span>

    {/* Si querés ver top 3 provincias */}
    {Object.entries(r.statsUsuarios.porProvincia)
      .slice(0, 3)
      .map(([prov, cant]) => (
        <span key={prov} className="pill pill-mini">
          {prov}: {cant}
        </span>
      ))}
  </div>
)}


              <div className="reto-actions">
                {r.activo ? (
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => desactivarReto(r.id)}
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => activarReto(r.id)}
                  >
                    Activar
                  </button>
                )}

                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => verProgresoReto(r)}
                >
                  Ver progreso
                </button>

                <button
                  type="button"
                  className="btn small warning"
                  onClick={() => ejecutarGanadores(r)}
                >
                  Ejecutar ganadores
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* PROGRESO DEL RETO SELECCIONADO */}
      {retoSeleccionado && (
        <section className="admin-retos-progreso">
          <div className="progreso-header">
            <h3>
              Progreso reto:{" "}
              <span className="highlight">{retoSeleccionado.titulo}</span>
            </h3>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setRetoSeleccionado(null);
                setProgreso([]);
              }}
            >
              Cerrar
            </button>
          </div>

          {cargandoProgreso ? (
            <p className="admin-retos-status">Cargando progreso...</p>
          ) : progreso.length === 0 ? (
            <p className="admin-retos-status">
              Aún no hay usuarios con puntos para este reto.
            </p>
          ) : (
            <table className="progreso-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Usuario</th>
                  <th>Localidad</th>
                  <th>Puntos del reto</th>
                </tr>
              </thead>
              <tbody>
                {progreso
                  .sort((a, b) => b.puntosOtorgados - a.puntosOtorgados)
                  .map((u, idx) => (
                    <tr key={u.usuarioId}>
                      <td>{idx + 1}</td>
                      <td>{u.nombre}</td>
                      <td>
                        {u.localidad || "-"},{" "}
                        {u.provincia || retoSeleccionado.provincia}
                      </td>
                      <td>{u.puntosOtorgados}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* MODAL CREAR RETO */}
      {mostrarModalReto && (
        <div
          className="admin-modal-overlay"
          onClick={() => setMostrarModalReto(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>➕ Crear nuevo reto</h3>

            {/* plantillas */}
            <div className="plantillas-row">
              <span>Plantillas rápidas:</span>
              <button
                type="button"
                className={`pill-btn ${
                  plantilla === "VISITA_1" ? "active" : ""
                }`}
                onClick={() => aplicarPlantilla("VISITA_1")}
              >
                1 visita
              </button>
              <button
                type="button"
                className={`pill-btn ${
                  plantilla === "VISITA_3" ? "active" : ""
                }`}
                onClick={() => aplicarPlantilla("VISITA_3")}
              >
                3 visitas
              </button>
              <button
                type="button"
                className={`pill-btn ${
                  plantilla === "CAMINAR_3KM" ? "active" : ""
                }`}
                onClick={() => aplicarPlantilla("CAMINAR_3KM")}
              >
                Caminar 3 km
              </button>
            </div>

            <div className="field-group">
              <label>Título</label>
              <input
                value={nuevoReto.titulo}
                onChange={(e) =>
                  setNuevoReto((prev) => ({
                    ...prev,
                    titulo: e.target.value,
                  }))
                }
                placeholder="Ej: Visitá 3 negocios distintos"
              />
            </div>

            <div className="field-group">
              <label>Descripción</label>
              <textarea
                value={nuevoReto.descripcion}
                onChange={(e) =>
                  setNuevoReto((prev) => ({
                    ...prev,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Explicale al usuario qué tiene que hacer para ganar"
              />
            </div>

            <div className="field-inline">
              <div className="field-group">
                <label>Puntos que otorga</label>
                <input
                  type="number"
                  min={0}
                  value={nuevoReto.puntos}
                  onChange={(e) =>
                    setNuevoReto((prev) => ({
                      ...prev,
                      puntos: Number(e.target.value) || 0,
                    }))}
                />
              </div>

              <div className="field-group">
                <label>Tipo de reto</label>
                <select
                  value={nuevoReto.tipo}
                  onChange={(e) =>
                    setNuevoReto((prev) => ({
                      ...prev,
                      tipo: e.target.value as TipoReto,
                    }))
                  }
                >
                  <option value="visitas">🛒 Visitas a negocios</option>
                  <option value="movimiento_distancia">
                    🚶‍♀️ Movimiento (distancia)
                  </option>
                  <option value="puntos">⭐ Acumular puntos</option>
                  <option value="destino_unico">📍 Destino único</option>
                  <option value="general">📦 General</option>
                </select>
              </div>
            </div>

            {/* Campos según tipo */}
            {nuevoReto.tipo === "visitas" && (
              <div className="field-group">
                <label>Cantidad de negocios distintos</label>
                <input
                  type="number"
                  min={1}
                  value={nuevoReto.meta ?? 1}
                  onChange={(e) =>
                    setNuevoReto((prev) => ({
                      ...prev,
                      meta: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            )}

            {nuevoReto.tipo === "movimiento_distancia" && (
              <div className="field-group">
                <label>Distancia total (km)</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={(nuevoReto.meta || 0) / 1000 || 1}
                  onChange={(e) => {
                    const km = Number(e.target.value) || 0;
                    setNuevoReto((prev) => ({
                      ...prev,
                      meta: Math.round(km * 1000),
                    }));
                  }}
                />
              </div>
            )}

            {nuevoReto.tipo === "puntos" && (
              <div className="field-group">
                <label>Puntos a acumular</label>
                <input
                  type="number"
                  min={10}
                  value={nuevoReto.meta ?? 100}
                  onChange={(e) =>
                    setNuevoReto((prev) => ({
                      ...prev,
                      meta: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            )}

            {nuevoReto.tipo === "destino_unico" && (
              <>
                <div className="field-inline">
                  <div className="field-group">
                    <label>Latitud</label>
                    <input
                      type="number"
                      value={nuevoReto.destinoLatitud ?? ""}
                      onChange={(e) =>
                        setNuevoReto((prev) => ({
                          ...prev,
                          destinoLatitud:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="field-group">
                    <label>Longitud</label>
                    <input
                      type="number"
                      value={nuevoReto.destinoLongitud ?? ""}
                      onChange={(e) =>
                        setNuevoReto((prev) => ({
                          ...prev,
                          destinoLongitud:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="field-group">
                  <label>Radio (metros)</label>
                  <input
                    type="number"
                    min={20}
                    value={nuevoReto.destinoRadioMetros ?? 100}
                    onChange={(e) =>
                      setNuevoReto((prev) => ({
                        ...prev,
                        destinoRadioMetros: Number(e.target.value) || 50,
                      }))
                    }
                  />
                </div>
              </>
            )}

            <div className="field-inline">
              <div className="field-group">
                <label>Rango de días</label>
                <input
                  type="number"
                  min={1}
                  value={nuevoReto.rangoDias ?? 7}
                  onChange={(e) =>
                    setNuevoReto((prev) => ({
                      ...prev,
                      rangoDias: Number(e.target.value) || null,
                    }))
                  }
                />
              </div>

              <div className="field-group">
                <label>Provincia</label>
                <select
                  value={nuevoReto.provincia}
                  onChange={(e) =>
                    setNuevoReto((prev) => ({
                      ...prev,
                      provincia: e.target.value,
                    }))
                  }
                >
                  <option value={TODAS_PROVINCIAS}>
                    🌎 Todas las provincias
                  </option>
                  {PROVINCIAS_AR.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Localidad (opcional)</label>
                <input
                  value={nuevoReto.localidad}
                  onChange={(e) =>
                    setNuevoReto((prev) => ({
                      ...prev,
                      localidad: e.target.value,
                    }))
                  }
                  placeholder="Ej: San Luis, Villa Mercedes..."
                />
              </div>
            </div>

            <div className="admin-modal-buttons">
              <button type="button" className="btn primary" onClick={crearReto}>
                Crear reto
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setMostrarModalReto(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRetosPage;
