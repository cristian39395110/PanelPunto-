import React, { useMemo, useState } from "react";
import "./AdminSorteosPage.css";

const API = import.meta.env.VITE_API_URL;
export const API_URL = API ? API : "http://localhost:3000";

interface UsuarioLight {
  id: number;
  nombre: string;
  localidad?: string | null;
  provincia?: string | null;
  fotoPerfil?: string | null;
}

interface GanadorSorteo {
  id: number;
  usuarioId: number;
  puesto: number;
  puntosMes: number;
  comprasMes: number;
  provincia: string;
  localidad: string | null;
  premio?: string | null;
  usuario?: UsuarioLight;
}

interface PremioConfig {
  puesto: number;
  descripcion: string;
}

const PROVINCIAS_ARG = [
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

const AdminSorteosPage: React.FC = () => {
  // Provincias seleccionadas (1, varias o todas)
  const [provinciasSeleccionadas, setProvinciasSeleccionadas] = useState<string[]>([
    "San Luis",
  ]);
  const [todasProvincias, setTodasProvincias] = useState(false);

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

  // ✅ Cantidad de ganadores configurable
  const [cantidadGanadores, setCantidadGanadores] = useState<number>(3);

  // Config base de premios (luego la UI lo ajusta según cantidadGanadores)
  const [premiosConfig, setPremiosConfig] = useState<PremioConfig[]>([
    { puesto: 1, descripcion: "Primer lugar: $300.000" },
    { puesto: 2, descripcion: "Segundo lugar: freidora de aire" },
    { puesto: 3, descripcion: "Tercer lugar: orden de compra $50.000" },
  ]);

  const [ganadores, setGanadores] = useState<GanadorSorteo[]>([]);
  const [loading, setLoading] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const token = useMemo(() => localStorage.getItem("panelToken"), []);

  // ==========================
  // PREMIOS: helpers
  // ==========================

  const premioPorPuesto = useMemo(() => {
    const map: Record<number, string> = {};
    for (const p of premiosConfig) {
      if (p.descripcion.trim()) {
        map[p.puesto] = p.descripcion.trim();
      }
    }
    return map;
  }, [premiosConfig]);

  const getPremioDescripcion = (puesto: number) => {
    const encontrado = premiosConfig.find((p) => p.puesto === puesto);
    return encontrado ? encontrado.descripcion : "";
  };

  const handlePremioConfigChange = (puesto: number, value: string) => {
    setPremiosConfig((prev) => {
      const idx = prev.findIndex((p) => p.puesto === puesto);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], descripcion: value };
        return copia;
      }
      return [...prev, { puesto, descripcion: value }];
    });
  };

  // ==========================
  // Provincias helpers
  // ==========================

  const provinciasDestino = todasProvincias
    ? PROVINCIAS_ARG
    : provinciasSeleccionadas;

  const toggleProvincia = (prov: string) => {
    setTodasProvincias(false);
    setProvinciasSeleccionadas((prev) =>
      prev.includes(prov)
        ? prev.filter((p) => p !== prov)
        : [...prev, prov]
    );
  };

  const handleToggleTodas = (checked: boolean) => {
    setTodasProvincias(checked);
    if (checked) {
      setProvinciasSeleccionadas(PROVINCIAS_ARG);
    }
  };

  // ==========================
  // Cargar ganadores guardados
  // ==========================

  const handleLoadGanadores = async () => {
    if (!provinciasDestino.length) {
      alert("Seleccioná al menos una provincia.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMensaje(null);
      setGanadores([]);

      const acumulados: GanadorSorteo[] = [];

      for (const provincia of provinciasDestino) {
        const params = new URLSearchParams({
          provincia,
          mes: String(mes),
          anio: String(anio),
        });

        const resp = await fetch(
          `${API_URL}/api/admin/sorteos/provincia?${params.toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!resp.ok) {
          throw new Error(
            `No se pudieron traer los ganadores guardados para ${provincia}`
          );
        }

        const data = await resp.json();

        const lista: GanadorSorteo[] = (data.ganadores || []).map((g: any) => ({
          id: g.id,
          usuarioId: g.usuarioId,
          puesto: g.puesto,
          puntosMes: g.puntosMes,
          comprasMes: g.comprasMes,
          provincia: g.provincia,
          localidad: g.localidad ?? null,
          premio:
            g.premio && g.premio.trim()
              ? g.premio
              : (premioPorPuesto[g.puesto] ?? ""),
          usuario: g.usuario
            ? {
                id: g.usuario.id,
                nombre: g.usuario.nombre,
                localidad: g.usuario.localidad,
                provincia: g.usuario.provincia,
                fotoPerfil: g.usuario.fotoPerfil,
              }
            : undefined,
        }));

        acumulados.push(...lista);
      }

      acumulados.sort((a, b) => {
        if (a.provincia === b.provincia) {
          return a.puesto - b.puesto;
        }
        return a.provincia.localeCompare(b.provincia);
      });

      setGanadores(acumulados);
      setMensaje("Ganadores cargados desde la base de datos.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error obteniendo ganadores");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Ejecutar sorteo
  // ==========================

  const handleEjecutarSorteo = async () => {
    if (!provinciasDestino.length) {
      alert("Seleccioná al menos una provincia para ejecutar el sorteo.");
      return;
    }

    if (cantidadGanadores <= 0) {
      alert("La cantidad de ganadores tiene que ser mayor a 0.");
      return;
    }

    const textoProv = todasProvincias
      ? "TODAS las provincias configuradas"
      : provinciasDestino.join(", ");

    const ok = window.confirm(
      `¿Ejecutar sorteo para ${textoProv} - ${mes}/${anio}?\n\n` +
        `Cantidad de ganadores por provincia: ${cantidadGanadores}\n\n` +
        `Premios del sorteo:\n` +
        Array.from({ length: cantidadGanadores }, (_, i) => i + 1)
          .map(
            (puesto) =>
              `${puesto}º: ${
                getPremioDescripcion(puesto) || "(sin premio definido)"
              }`
          )
          .join("\n") +
        `\n\nEsto recalcula los ganadores de ese mes para cada provincia seleccionada.`
    );
    if (!ok) return;

    try {
      setEjecutando(true);
      setError(null);
      setMensaje(null);
      setGanadores([]);

      const acumulados: GanadorSorteo[] = [];

      // armamos payload de premios simple para el backend
      const premiosPayload: Record<number, string> = {};
      for (let puesto = 1; puesto <= cantidadGanadores; puesto++) {
        const desc = getPremioDescripcion(puesto).trim();
        if (desc) {
          premiosPayload[puesto] = desc;
        }
      }

      for (const provincia of provinciasDestino) {
        const resp = await fetch(
          `${API_URL}/api/admin/sorteos/provincia/ejecutar`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              provincia,
              mes,
              anio,
              cantidadGanadores,
              premiosPorPuesto: premiosPayload,
            }),
          }
        );

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(
            txt ||
              `No se pudo ejecutar el sorteo para la provincia ${provincia}`
          );
        }

        const data = await resp.json();

        const lista: GanadorSorteo[] = (data.ganadores || []).map((g: any) => ({
          id: g.id || 0,
          usuarioId: g.usuarioId,
          puesto: g.puesto,
          puntosMes: g.puntosMes,
          comprasMes: g.comprasMes,
          provincia: g.provincia,
          localidad: g.localidad ?? null,
          premio:
            g.premio && g.premio.trim()
              ? g.premio
              : premiosPayload[g.puesto] || "",
        }));

        acumulados.push(...lista);
      }

      acumulados.sort((a, b) => {
        if (a.provincia === b.provincia) {
          return a.puesto - b.puesto;
        }
        return a.provincia.localeCompare(b.provincia);
      });

      setGanadores(acumulados);
      setMensaje("Sorteo ejecutado. Ganadores calculados para ese mes.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error ejecutando sorteo");
    } finally {
      setEjecutando(false);
    }
  };

  // ==========================
  // Guardar premio individual (después del sorteo)
  // ==========================

  const handlePremioChange = (id: number, value: string) => {
    setGanadores((prev) =>
      prev.map((g) => (g.id === id ? { ...g, premio: value } : g))
    );
  };

  const handleGuardarPremio = async (id: number) => {
    const ganador = ganadores.find((g) => g.id === id);
    if (!ganador) return;

    if (!ganador.premio || !ganador.premio.trim()) {
      alert("Ingresá una descripción de premio antes de guardar.");
      return;
    }

    try {
      setError(null);
      setMensaje(null);

      const resp = await fetch(
        `${API_URL}/api/admin/sorteos/provincia/${id}/premio`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ premio: ganador.premio }),
        }
      );

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "No se pudo guardar el premio");
      }

      const data = await resp.json();

      setMensaje("Premio guardado correctamente.");
      setGanadores((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, premio: data.ganador?.premio || g.premio } : g
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error guardando premio");
    }
  };

  // ==========================
  // Label mes / texto provincias
  // ==========================

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

  const textoProvinciasEnTitulo = todasProvincias
    ? "Todas las provincias"
    : provinciasDestino.join(", ");

  // ==========================
  // Render
  // ==========================

  return (
    <div className="admin-sorteos">
      <h2 className="admin-sorteos-title">Sorteos mensuales por provincia</h2>

      {/* CONFIGURACIÓN DE PREMIOS */}
      <section className="admin-sorteos-premios">
        <h3>Premios de este sorteo</h3>
        <p className="admin-sorteos-subtitle">
          Definí cuántos ganadores querés por provincia y qué se lleva cada
          puesto.
        </p>

        <div className="filtro-group" style={{ marginBottom: 10 }}>
          <label>Cantidad de ganadores por provincia</label>
          <input
            type="number"
            min={1}
            max={20}
            value={cantidadGanadores}
            onChange={(e) => {
              const num = Number(e.target.value);
              if (!Number.isNaN(num) && num > 0 && num <= 20) {
                setCantidadGanadores(num);
              }
            }}
          />
        </div>

        <table className="premios-table">
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Premio</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cantidadGanadores }, (_, i) => i + 1).map(
              (puesto) => (
                <tr key={puesto}>
                  <td>{puesto}º</td>
                  <td>
                    <input
                      type="text"
                      value={getPremioDescripcion(puesto)}
                      onChange={(e) =>
                        handlePremioConfigChange(puesto, e.target.value)
                      }
                      placeholder={`Premio para el puesto ${puesto}`}
                    />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>

      {/* FILTROS */}
      <section className="admin-sorteos-filtros">
        <div className="filtro-group">
          <label>Provincias</label>
          <div className="filtro-provincias-multi">
            <label className="prov-item prov-item-all">
              <input
                type="checkbox"
                checked={todasProvincias}
                onChange={(e) => handleToggleTodas(e.target.checked)}
              />
              Todas las provincias
            </label>

            <div className="prov-list">
              {PROVINCIAS_ARG.map((prov) => (
                <label key={prov} className="prov-item">
                  <input
                    type="checkbox"
                    checked={provinciasSeleccionadas.includes(prov)}
                    onChange={() => toggleProvincia(prov)}
                    disabled={todasProvincias}
                  />
                  {prov}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="filtro-group">
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

        <div className="filtro-group">
          <label>Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
          />
        </div>

        <div className="admin-sorteos-actions">
          <button
            type="button"
            onClick={handleLoadGanadores}
            disabled={loading || ejecutando}
          >
            Ver ganadores guardados
          </button>
          <button
            type="button"
            className="danger"
            onClick={handleEjecutarSorteo}
            disabled={loading || ejecutando}
          >
            {ejecutando ? "Ejecutando..." : "Ejecutar sorteo de este mes"}
          </button>
        </div>
      </section>

      {/* STATUS */}
      {loading && <p className="admin-sorteos-status">Cargando...</p>}
      {error && <p className="admin-sorteos-error">{error}</p>}
      {mensaje && <p className="admin-sorteos-ok">{mensaje}</p>}

      {/* LISTA DE GANADORES */}
      {ganadores.length > 0 && (
        <section className="admin-sorteos-ganadores">
          <h3>
            Ganadores – {labelMes} {anio}
          </h3>
          <p className="admin-sorteos-subtitle">
            Provincias: {textoProvinciasEnTitulo}
          </p>

          <table className="ganadores-table">
            <thead>
              <tr>
                <th>Provincia</th>
                <th>Puesto</th>
                <th>Usuario</th>
                <th>Ciudad</th>
                <th>Compras</th>
                <th>Puntos</th>
                <th>Premio</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {ganadores
                .sort((a, b) => {
                  if (a.provincia === b.provincia) {
                    return a.puesto - b.puesto;
                  }
                  return a.provincia.localeCompare(b.provincia);
                })
                .map((g) => (
                  <tr
                    key={g.id || `${g.usuarioId}-${g.provincia}-${g.puesto}`}
                  >
                    <td data-label="Provincia">{g.provincia}</td>
                    <td data-label="Puesto">{g.puesto}º</td>
                    <td data-label="Usuario">
                      <div className="ganador-user">
                        {g.usuario?.fotoPerfil && (
                          <img
                            src={g.usuario.fotoPerfil}
                            alt={g.usuario.nombre}
                            className="ganador-avatar"
                          />
                        )}
                        <span>
                          {g.usuario?.nombre || `Usuario #${g.usuarioId}`}
                        </span>
                      </div>
                    </td>
                    <td data-label="Ciudad">
                      {g.usuario?.localidad || g.localidad || "-"},{" "}
                      {g.usuario?.provincia || g.provincia}
                    </td>
                    <td data-label="Compras">{g.comprasMes}</td>
                    <td data-label="Puntos">{g.puntosMes}</td>
                    <td data-label="Premio">
                      <input
                        type="text"
                        value={g.premio || ""}
                        onChange={(e) =>
                          handlePremioChange(g.id, e.target.value)
                        }
                        placeholder={
                          premioPorPuesto[g.puesto]
                            ? `Sugerido: ${premioPorPuesto[g.puesto]}`
                            : "Ingresá el premio"
                        }
                      />
                    </td>
                    <td data-label="Acción">
                      <button
                        type="button"
                        onClick={() => handleGuardarPremio(g.id)}
                      >
                        Guardar premio
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {!loading && !error && ganadores.length === 0 && (
        <p className="admin-sorteos-status">
          No hay ganadores cargados todavía para esos filtros.
        </p>
      )}
    </div>
  );
};

export default AdminSorteosPage;
