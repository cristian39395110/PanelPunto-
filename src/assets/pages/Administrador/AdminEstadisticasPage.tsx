import React, { useEffect, useMemo, useState } from "react";
import "./AdminEstadisticasPage.css";

const API = import.meta.env.VITE_API_URL;
export const API_URL = API ? API : "http://localhost:3000";

interface ProvinciaStat {
  provincia: string;
  cantidad: number;
}

interface RankingItem {
  usuarioId: number;
  nombre: string;
  provincia: string | null;
  localidad: string | null;
  comprasMes: number;
  puntosCheckinMes: number;
  puntosRetosMes: number;
  puntosTotalMes: number;
}

interface RankingResponse {
  ok: boolean;
  provincia: string;
  mes: number;
  anio: number;
  totalUsuariosRanking: number;
  ranking: RankingItem[];
}

const AdminEstadisticasPage: React.FC = () => {
  const [provincias, setProvincias] = useState<ProvinciaStat[]>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(false);

  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>("");
  const [mes, setMes] = useState<number>(() => {
    const hoy = new Date();
    const m = hoy.getMonth() + 1; // 1-12
    return m === 1 ? 12 : m - 1; // mes pasado
  });
  const [anio, setAnio] = useState<number>(() => {
    const hoy = new Date();
    const m = hoy.getMonth() + 1;
    return m === 1 ? hoy.getFullYear() - 1 : hoy.getFullYear();
  });

  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const panelToken = useMemo(
    () => localStorage.getItem("panelToken"),
    []
  );

  const labelMes = useMemo(() => {
    const nombres = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return nombres[mes] || mes;
  }, [mes]);

  // Cargar cantidad de usuarios por provincia
  const cargarProvincias = async () => {
    try {
      setLoadingProvincias(true);
      setError(null);
      setMensaje(null);

      const resp = await fetch(
        `${API_URL}/api/admin/estadisticas/usuarios-negocio/provincias`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(panelToken ? { Authorization: `Bearer ${panelToken}` } : {}),
          },
        }
      );

      if (!resp.ok) {
        throw new Error("No se pudieron obtener las provincias");
      }

      const data = await resp.json();
      const lista: ProvinciaStat[] = (data.provincias || []).map(
        (p: any) => ({
          provincia: p.provincia || "SIN_PROVINCIA",
          cantidad: Number(p.cantidad || 0),
        })
      );

      setProvincias(lista);

      // Si no hay provincia seleccionada aún, ponemos la primera
      if (!provinciaSeleccionada && lista.length > 0) {
        setProvinciaSeleccionada(lista[0].provincia);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error obteniendo estadísticas por provincia");
    } finally {
      setLoadingProvincias(false);
    }
  };

  // Cargar ranking de una provincia
  const cargarRanking = async () => {
    if (!provinciaSeleccionada) {
      setError("Seleccioná una provincia para ver el ranking");
      return;
    }

    try {
      setLoadingRanking(true);
      setError(null);
      setMensaje(null);
      setRanking([]);

      const params = new URLSearchParams({
        provincia: provinciaSeleccionada,
        mes: String(mes),
        anio: String(anio),
      });

      const resp = await fetch(
        `${API_URL}/api/admin/estadisticas/provincia/ranking?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(panelToken ? { Authorization: `Bearer ${panelToken}` } : {}),
          },
        }
      );

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "No se pudo obtener el ranking");
      }

      const data: RankingResponse = await resp.json();
      setRanking(data.ranking || []);
      setMensaje(
        `Ranking cargado para ${data.provincia} – ${labelMes} ${data.anio}`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error obteniendo ranking");
    } finally {
      setLoadingRanking(false);
    }
  };

  useEffect(() => {
    cargarProvincias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClickProvinciaRow = (prov: string) => {
    setProvinciaSeleccionada(prov);
  };

  const totalUsuarios = provincias.reduce(
    (acc, p) => acc + (p.cantidad || 0),
    0
  );

  return (
    <div className="ae-container">
      <header className="ae-header">
        <h1 className="ae-title">Estadísticas de usuarios y puntos</h1>
        <p className="ae-subtitle">
          Vista general de usuarios por provincia y ranking mensual
        </p>
      </header>

      <div className="ae-grid">
        {/* PANEL IZQUIERDO: PROVINCIAS */}
        <section className="ae-card">
          <div className="ae-card-header">
            <div>
              <h2 className="ae-card-title">Usuarios por provincia</h2>
              <p className="ae-card-subtitle">
                Cantidad de usuarios-negocio activos por provincia
              </p>
            </div>
            <button
              type="button"
              className="ae-refresh-btn"
              onClick={cargarProvincias}
              disabled={loadingProvincias}
            >
              {loadingProvincias ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {loadingProvincias && (
            <p className="ae-status ae-status--loading">
              Cargando provincias...
            </p>
          )}

          {!loadingProvincias && provincias.length === 0 && (
            <p className="ae-status">
              No hay usuarios-negocio registrados todavía.
            </p>
          )}

          {!loadingProvincias && provincias.length > 0 && (
            <>
              <div className="ae-total">
                Total usuarios-negocio:{" "}
                <span className="ae-total-number">{totalUsuarios}</span>
              </div>

              <table className="ae-table">
                <thead>
                  <tr>
                    <th>Provincia</th>
                    <th className="ae-th-right">Usuarios</th>
                    <th className="ae-th-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {provincias.map((p) => {
                    const porcentaje =
                      totalUsuarios > 0
                        ? (p.cantidad / totalUsuarios) * 100
                        : 0;
                    const isSelected =
                      provinciaSeleccionada === p.provincia;
                    return (
                      <tr
                        key={p.provincia}
                        className={
                          isSelected
                            ? "ae-row-selectable ae-row-selectable--active"
                            : "ae-row-selectable"
                        }
                        onClick={() =>
                          handleClickProvinciaRow(p.provincia)
                        }
                      >
                        <td>{p.provincia}</td>
                        <td className="ae-td-right">{p.cantidad}</td>
                        <td className="ae-td-right">
                          {porcentaje.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="ae-hint">
                Tip: hacé clic en una provincia para verla en el ranking
                de la derecha.
              </p>
            </>
          )}
        </section>

        {/* PANEL DERECHO: RANKING */}
        <section className="ae-card">
          <div className="ae-card-header">
            <div>
              <h2 className="ae-card-title">
                Ranking mensual por provincia
              </h2>
              <p className="ae-card-subtitle">
                Compras vs retos para el mes seleccionado
              </p>
            </div>
          </div>

          <div className="ae-filtros">
            <div className="ae-filtro">
              <label>Provincia</label>
              <select
                value={provinciaSeleccionada}
                onChange={(e) =>
                  setProvinciaSeleccionada(e.target.value)
                }
              >
                <option value="">Seleccionar...</option>
                {provincias.map((p) => (
                  <option key={p.provincia} value={p.provincia}>
                    {p.provincia}
                  </option>
                ))}
              </select>
            </div>

            <div className="ae-filtro">
              <label>Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
              >
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </select>
            </div>

            <div className="ae-filtro">
              <label>Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
              />
            </div>

            <div className="ae-filtro ae-filtro-btn">
              <button
                type="button"
                onClick={cargarRanking}
                disabled={loadingRanking}
              >
                {loadingRanking ? "Cargando..." : "Ver ranking"}
              </button>
            </div>
          </div>

          {error && (
            <p className="ae-status ae-status--error">{error}</p>
          )}
          {mensaje && (
            <p className="ae-status ae-status--ok">{mensaje}</p>
          )}

          {loadingRanking && (
            <p className="ae-status ae-status--loading">
              Obteniendo ranking...
            </p>
          )}

          {!loadingRanking && ranking.length === 0 && !error && (
            <p className="ae-status">
              No hay usuarios que cumplan las condiciones para ese
              mes/provincia (mínimo 10 compras y puntos &gt; 0), o aún no
              se registraron movimientos.
            </p>
          )}

          {!loadingRanking && ranking.length > 0 && (
            <div className="ae-ranking-wrapper">
              <table className="ae-table ae-table-ranking">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Localidad</th>
                    <th className="ae-th-right">Compras</th>
                    <th className="ae-th-right">Pts compras</th>
                    <th className="ae-th-right">Pts retos</th>
                    <th className="ae-th-right">Total</th>
                    <th>Mix</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, idx) => {
                    const total = r.puntosTotalMes || 0;
                    const pctCheckin =
                      total > 0
                        ? (r.puntosCheckinMes / total) * 100
                        : 0;
                    const pctRetos =
                      total > 0
                        ? (r.puntosRetosMes / total) * 100
                        : 0;

                    return (
                      <tr key={r.usuarioId}>
                        <td>{idx + 1}</td>
                        <td>{r.nombre}</td>
                        <td>
                          {r.localidad
                            ? `${r.localidad} (${r.provincia || ""})`
                            : r.provincia || "-"}
                        </td>
                        <td className="ae-td-right">
                          {r.comprasMes}
                        </td>
                        <td className="ae-td-right">
                          {r.puntosCheckinMes}
                        </td>
                        <td className="ae-td-right">
                          {r.puntosRetosMes}
                        </td>
                        <td className="ae-td-right">
                          {r.puntosTotalMes}
                        </td>
                        <td>
                          {total > 0 ? (
                            <div className="ae-mix-bar">
                              <div
                                className="ae-mix-bar-checkin"
                                style={{
                                  width: `${pctCheckin}%`,
                                }}
                                title={`Compras: ${pctCheckin.toFixed(
                                  1
                                )}%`}
                              />
                              <div
                                className="ae-mix-bar-retos"
                                style={{
                                  width: `${pctRetos}%`,
                                }}
                                title={`Retos: ${pctRetos.toFixed(
                                  1
                                )}%`}
                              />
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="ae-legend">
                <span className="ae-legend-box ae-legend-checkin" />{" "}
                Puntos por compras &nbsp;|&nbsp;
                <span className="ae-legend-box ae-legend-retos" /> Puntos
                por retos
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminEstadisticasPage;
