import React, { useEffect, useMemo, useState } from "react";
import "./AdminNegociosPage.css";

const API_URL = import.meta.env.VITE_API_URL;

interface VendedorBasic {
  id: number;
  nombre: string;
  email: string;
}

interface OwnerBasic {
  id: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  puntos?: number;
  esPremium?: boolean;
  fechaFinPremium?: string | null;
}

type EstadoPlan = "sin_plan" | "al_dia" | "por_vencer" | "vencido";

interface NegocioItem {
  id: number;
  nombre: string;
  rubro?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  planId?: number | null;
  planNombre?: string | null;
  estadoPlan: EstadoPlan;
  fechaAlta: string;
  origen: "vendedor" | "app" | "desconocido";
  vendedor?: VendedorBasic | null;
  owner?: OwnerBasic | null;
  puntosMes?: number;
  clientesActivos?: number;
}

interface RespuestaNegocios {
  ok: boolean;
  negocios: NegocioItem[];
  filtrosAux: {
    provincias: string[];
    vendedores: VendedorBasic[];
  };
  stats?: {
    totalNegocios: number;
    conPlan: number;
    sinPlan: number;
    porVencer: number;
    vencidos: number;
  };
}

type FiltroEstadoPlan = "todos" | EstadoPlan;
type FiltroOrigen = "todos" | "vendedor" | "app";

interface RankingVendedor {
  vendedorId: number;
  nombre: string;
  email: string;
  cantidadNegocios: number;
  conPlan: number;
}



const AdminNegociosPage: React.FC = () => {
  const token = localStorage.getItem("panelToken");

  const [negocios, setNegocios] = useState<NegocioItem[]>([]);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [vendedores, setVendedores] = useState<VendedorBasic[]>([]);

  // filtros UI
  const [busqueda, setBusqueda] = useState("");
  const [filtroProvincia, setFiltroProvincia] = useState("");
  const [filtroVendedorId, setFiltroVendedorId] = useState<number | "">("");
  const [filtroEstadoPlan, setFiltroEstadoPlan] =
    useState<FiltroEstadoPlan>("todos");
  const [filtroOrigen, setFiltroOrigen] = useState<FiltroOrigen>("todos");
  const [orden, setOrden] = useState<"recientes" | "crecimiento">("recientes");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    // ---------- HEATMAP por provincias ----------
  const provinciasHeatmap = useMemo(() => {
    const counts = negocios.reduce<Record<string, number>>((acc, n) => {
      if (!n.provincia) return acc;
      acc[n.provincia] = (acc[n.provincia] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = entries.length > 0 ? entries[0][1] : 0;

    return {
      max,
      items: entries, // [ [provincia, cantidad], ... ]
    };
  }, [negocios]);


  // ---------- CARGAR LISTADO ----------
  const cargarNegocios = async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (busqueda.trim()) params.append("q", busqueda.trim());
      if (filtroProvincia) params.append("provincia", filtroProvincia);
      if (filtroVendedorId) params.append("vendedorId", String(filtroVendedorId));
      if (filtroEstadoPlan !== "todos")
        params.append("estadoPlan", filtroEstadoPlan);
      if (filtroOrigen !== "todos") params.append("origen", filtroOrigen);
      if (orden) params.append("orden", orden);

      const res = await fetch(
        `${API_URL}/api/admin-supervisor/negocios?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: RespuestaNegocios = await res.json();
     console.log(data)

      if (!res.ok || !data.ok) {
        setError(data && !data.ok ? "Error cargando negocios" : "Error interno");
        setNegocios([]);
      } else {
        setNegocios(data.negocios || []);
        setProvincias(data.filtrosAux?.provincias || []);
        setVendedores(data.filtrosAux?.vendedores || []);
      }
    } catch (err) {
      console.error("Error cargando negocios:", err);
      setError("No se pudieron cargar los negocios.");
      setNegocios([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!token) return;
    cargarNegocios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- FILTROS EN MEMORIA (por si queremos refinar sin pegarle al back) ----------
  const negociosFiltrados = useMemo(() => {
    return negocios.filter((n) => {
      if (filtroProvincia && n.provincia !== filtroProvincia) return false;
      if (
        filtroVendedorId &&
        (!n.vendedor || n.vendedor.id !== filtroVendedorId)
      )
        return false;
      if (
        filtroEstadoPlan !== "todos" &&
        n.estadoPlan &&
        n.estadoPlan !== filtroEstadoPlan
      )
        return false;
      if (filtroOrigen !== "todos" && n.origen !== filtroOrigen) return false;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const texto =
          `${n.nombre} ${n.localidad || ""} ${n.provincia || ""} ${
            n.vendedor?.nombre || ""
          }`.toLowerCase();
        if (!texto.includes(q)) return false;
      }

      return true;
    });
  }, [negocios, busqueda, filtroProvincia, filtroVendedorId, filtroEstadoPlan, filtroOrigen]);

  // ---------- RANKING Vendedores ----------
  const rankingVendedores: RankingVendedor[] = useMemo(() => {
    const map = new Map<number, RankingVendedor>();

    negocios.forEach((n) => {
      if (!n.vendedor) return;
      const id = n.vendedor.id;
      const item = map.get(id) || {
        vendedorId: id,
        nombre: n.vendedor.nombre,
        email: n.vendedor.email,
        cantidadNegocios: 0,
        conPlan: 0,
      };
      item.cantidadNegocios += 1;
      if (n.estadoPlan === "al_dia" || n.estadoPlan === "por_vencer") {
        item.conPlan += 1;
      }
      map.set(id, item);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.cantidadNegocios - a.cantidadNegocios
    );
  }, [negocios]);

  // ---------- RANKING Negocios que más crecieron ----------
  const rankingNegociosTop = useMemo(() => {
    const copia = [...negocios];
    copia.sort((a, b) => (b.puntosMes || 0) - (a.puntosMes || 0));
    return copia.slice(0, 5);
  }, [negocios]);

  // ---------- EXPORTAR ----------
  const exportarExcel = () => {
    if (!token) return;

    const params = new URLSearchParams();
    if (busqueda.trim()) params.append("q", busqueda.trim());
    if (filtroProvincia) params.append("provincia", filtroProvincia);
    if (filtroVendedorId) params.append("vendedorId", String(filtroVendedorId));
    if (filtroEstadoPlan !== "todos")
      params.append("estadoPlan", filtroEstadoPlan);
    if (filtroOrigen !== "todos") params.append("origen", filtroOrigen);

    window.open(
      `${API_URL}/api/admin-supervisor/negocios/export?${params.toString()}`,
      "_blank"
    );
  };

  // ---------- UI ----------
  return (
    <div className="neg-page">
      <header className="neg-header">
        <div>
          <h2>🏪 Negocios adheridos</h2>
          <p className="neg-subtitle">
            Acá ves todos los negocios cargados, quién los trajo, qué plan
            tienen y cómo viene su actividad.
          </p>
        </div>

        <div className="neg-header-actions">
          <button className="neg-btn ghost" onClick={cargarNegocios}>
            ⟳ Recargar
          </button>
          <button className="neg-btn primary" onClick={exportarExcel}>
            ⬇ Exportar Excel
          </button>
        </div>
      </header>

      {/* FILTROS */}
      <section className="neg-filters">
        <div className="neg-filter-row">
          <div className="neg-filter-item">
            <label>Buscar</label>
            <input
              type="text"
              placeholder="Nombre, localidad, vendedor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="neg-filter-item">
            <label>Provincia</label>
            <select
              value={filtroProvincia}
              onChange={(e) => setFiltroProvincia(e.target.value)}
            >
              <option value="">Todas</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="neg-filter-item">
            <label>Vendedor</label>
            <select
              value={filtroVendedorId}
              onChange={(e) =>
                setFiltroVendedorId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            >
              <option value="">Todos</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} ({v.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="neg-filter-row">
          <div className="neg-filter-item">
            <label>Estado del plan</label>
            <select
              value={filtroEstadoPlan}
              onChange={(e) =>
                setFiltroEstadoPlan(e.target.value as FiltroEstadoPlan)
              }
            >
              <option value="todos">Todos</option>
              <option value="al_dia">Al día</option>
              <option value="por_vencer">Por vencer</option>
              <option value="vencido">Vencido</option>
              <option value="sin_plan">Sin plan</option>
            </select>
          </div>

          <div className="neg-filter-item">
            <label>Origen</label>
            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value as FiltroOrigen)}
            >
              <option value="todos">Todos</option>
              <option value="vendedor">Captado por vendedor</option>
              <option value="app">Alta desde la app</option>
            </select>
          </div>

          <div className="neg-filter-item">
            <label>Ordenar por</label>
            <select
              value={orden}
              onChange={(e) =>
                setOrden(e.target.value as "recientes" | "crecimiento")
              }
            >
              <option value="recientes">Más recientes</option>
              <option value="crecimiento">Mayor crecimiento (puntos)</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="neg-loading">Cargando negocios...</p>
      ) : error ? (
        <p className="neg-error">{error}</p>
      ) : (
        <div className="neg-layout-main">
          {/* LISTA PRINCIPAL */}
          <section className="neg-table-section">
            {negociosFiltrados.length === 0 ? (
              <p className="neg-empty">No hay negocios con esos filtros.</p>
            ) : (
              <div className="neg-table-wrapper">
                <table className="neg-table">
                  <thead>
                    <tr>
                      <th>Negocio</th>
                      <th>Zona</th>
                      <th>Vendedor</th>
                      <th>Plan</th>
                      <th>Estado plan</th>
                      <th>Origen</th>
                      <th>Contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {negociosFiltrados.map((n) => (
                      <tr key={n.id}>
                        <td>
                          <div className="neg-col-main">
                            <span className="neg-negocio-nombre">
                              {n.nombre}
                            </span>
                            {n.rubro && (
                              <span className="neg-chip small">
                                {n.rubro}
                              </span>
                            )}
                            <span className="neg-negocio-fecha">
                              Alta:{" "}
                              {new Date(n.fechaAlta).toLocaleDateString(
                                "es-AR"
                              )}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="neg-col-sub">
                            <span>
                              {n.localidad || "—"} {n.provincia && "·"}{" "}
                              {n.provincia}
                            </span>
                            {n.direccion && (
                              <span className="neg-sub-muted">
                                {n.direccion}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {n.vendedor ? (
                            <div className="neg-col-sub">
                              <span>{n.vendedor.nombre}</span>
                              <span className="neg-sub-muted">
                                {n.vendedor.email}
                              </span>
                            </div>
                          ) : (
                            <span className="neg-sub-muted">—</span>
                          )}
                        </td>
                        <td>
                          {n.planNombre ? (
                            <span className="neg-chip">{n.planNombre}</span>
                          ) : (
                            <span className="neg-sub-muted">Sin plan</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              "neg-badge " +
                              (n.estadoPlan === "al_dia"
                                ? "ok"
                                : n.estadoPlan === "por_vencer"
                                ? "warn"
                                : n.estadoPlan === "vencido"
                                ? "bad"
                                : "neutral")
                            }
                          >
                            {n.estadoPlan === "al_dia" && "Al día"}
                            {n.estadoPlan === "por_vencer" && "Por vencer"}
                            {n.estadoPlan === "vencido" && "Vencido"}
                            {n.estadoPlan === "sin_plan" && "Sin plan"}
                          </span>
                        </td>
                        <td>
                          {n.origen === "vendedor"
                            ? "Vendedor"
                            : n.origen === "app"
                            ? "App"
                            : "N/D"}
                        </td>
                        <td>
                          <div className="neg-col-sub">
                            {n.telefono && (
                              <span className="neg-sub-muted">
                                Tel: {n.telefono}
                              </span>
                            )}
                            {n.whatsapp && (
                              <a
                                href={`https://wa.me/${n.whatsapp}`}
                                target="_blank"
                                rel="noreferrer"
                                className="neg-link-wsp"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* PANEL DERECHO: RANKINGS */}
          <aside className="neg-side">
            <div className="neg-card">
              <h3>🏅 Ranking de vendedores</h3>
              {rankingVendedores.length === 0 ? (
                <p className="neg-sub-muted">
                  Todavía no hay vendedores con negocios.
                </p>
              ) : (
                <ul className="neg-ranking-list">
                  {rankingVendedores.slice(0, 5).map((r, idx) => (
                    <li key={r.vendedorId} className="neg-ranking-item">
                      <span className="neg-ranking-position">
                        #{idx + 1}
                      </span>
                      <div className="neg-ranking-main">
                        <strong>{r.nombre}</strong>
                        <span className="neg-sub-muted">{r.email}</span>
                      </div>
                      <div className="neg-ranking-meta">
                        <span>{r.cantidadNegocios} neg.</span>
                        <span>{r.conPlan} con plan</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="neg-card">
              <h3>📈 Negocios que más crecieron</h3>
              {rankingNegociosTop.length === 0 ? (
                <p className="neg-sub-muted">
                  Aún no hay datos de crecimiento.
                </p>
              ) : (
                <ul className="neg-ranking-list">
                  {rankingNegociosTop.map((n, idx) => (
                    <li key={n.id} className="neg-ranking-item">
                      <span className="neg-ranking-position">
                        #{idx + 1}
                      </span>
                      <div className="neg-ranking-main">
                        <strong>{n.nombre}</strong>
                        <span className="neg-sub-muted">
                          {n.localidad || ""} {n.provincia && `- ${n.provincia}`}
                        </span>
                      </div>
                      <div className="neg-ranking-meta">
                        <span>{n.puntosMes || 0} pts/mes</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="neg-card">
              <h3>🗺️ Mapa de calor por provincia</h3>

              {provinciasHeatmap.items.length === 0 ? (
                <p className="neg-sub-muted small">
                  Todavía no hay datos suficientes para el mapa de calor.
                </p>
              ) : (
                <div className="neg-heatmap">
                  {provinciasHeatmap.items.map(([prov, cant]) => {
                    const porcentaje =
                      provinciasHeatmap.max > 0
                        ? (cant / provinciasHeatmap.max) * 100
                        : 0;

                    return (
                      <div key={prov} className="neg-heatmap-row">
                        <div className="neg-heatmap-label">
                          <span>{prov}</span>
                          <span className="neg-heatmap-count">
                            {cant} neg.
                          </span>
                        </div>
                        <div className="neg-heatmap-bar-wrapper">
                          <div
                            className="neg-heatmap-bar"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="neg-sub-muted small">
                El color y el largo de la barra muestran dónde se concentra la
                mayor cantidad de negocios.
              </p>
            </div>

          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminNegociosPage;
