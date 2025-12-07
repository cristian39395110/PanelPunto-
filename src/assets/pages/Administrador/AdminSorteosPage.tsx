import React, {  useMemo, useState } from "react";
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

const AdminSorteosPage: React.FC = () => {
  // 👉 filtros
  const [provincia, setProvincia] = useState("San Luis");
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

  const [ganadores, setGanadores] = useState<GanadorSorteo[]>([]);
  const [loading, setLoading] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const token = useMemo(() => localStorage.getItem("panelToken"), []);

  const handleLoadGanadores = async () => {
    try {
      setLoading(true);
      setError(null);
      setMensaje(null);

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
        throw new Error("No se pudieron traer los ganadores guardados");
      }

      const data = await resp.json();

      // data.ganadores es un array de SorteoMensualProvincia + include usuario
      const lista: GanadorSorteo[] = (data.ganadores || []).map((g: any) => ({
        id: g.id,
        usuarioId: g.usuarioId,
        puesto: g.puesto,
        puntosMes: g.puntosMes,
        comprasMes: g.comprasMes,
        provincia: g.provincia,
        localidad: g.localidad ?? null,
        premio: g.premio ?? "",
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

      setGanadores(lista);
      setMensaje("Ganadores cargados desde la base de datos.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error obteniendo ganadores");
    } finally {
      setLoading(false);
    }
  };

  const handleEjecutarSorteo = async () => {
    const ok = window.confirm(
      `¿Ejecutar sorteo para ${provincia} - ${mes}/${anio}? 
Esto recalcula los ganadores de ese mes.`
    );
    if (!ok) return;

    try {
      setEjecutando(true);
      setError(null);
      setMensaje(null);

      const resp = await fetch(
        `${API_URL}/api/admin/sorteos/provincia/ejecutar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ provincia, mes, anio }),
        }
      );

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "No se pudo ejecutar el sorteo");
      }

      const data = await resp.json();

      const lista: GanadorSorteo[] = (data.ganadores || []).map((g: any) => ({
        id: g.id || 0, // si en el POST no devolvés id DB, luego al cargar se corrige
        usuarioId: g.usuarioId,
        puesto: g.puesto,
        puntosMes: g.puntosMes,
        comprasMes: g.comprasMes,
        provincia: g.provincia,
        localidad: g.localidad ?? null,
        premio: g.premio ?? "",
      }));

      setGanadores(lista);
      setMensaje("Sorteo ejecutado. Ganadores calculados para ese mes.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error ejecutando sorteo");
    } finally {
      setEjecutando(false);
    }
  };

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
      // opcionalmente, sincronizar con lo que devuelve el backend
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

  return (
    <div className="admin-sorteos">
      <h2 className="admin-sorteos-title">Sorteos mensuales por provincia</h2>

      {/* FILTROS */}
      <section className="admin-sorteos-filtros">
        <div className="filtro-group">
          <label>Provincia</label>
       <select
  value={provincia}
  onChange={(e) => setProvincia(e.target.value)}
>
  {PROVINCIAS_ARG.map((prov) => (
    <option key={prov} value={prov}>
      {prov}
    </option>
  ))}
</select>

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
            Ganadores {provincia} – {labelMes} {anio}
          </h3>

          <table className="ganadores-table">
            <thead>
              <tr>
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
                .sort((a, b) => a.puesto - b.puesto)
                .map((g) => (
                  <tr key={g.id || `${g.usuarioId}-${g.puesto}`}>
                    <td>{g.puesto}°</td>
                    <td>
                      <div className="ganador-user">
                        {g.usuario?.fotoPerfil && (
                          <img
                            src={g.usuario.fotoPerfil}
                            alt={g.usuario.nombre}
                            className="ganador-avatar"
                          />
                        )}
                        <span>{g.usuario?.nombre || `Usuario #${g.usuarioId}`}</span>
                      </div>
                    </td>
                    <td>
                      {g.usuario?.localidad || g.localidad || "-"},{" "}
                      {g.usuario?.provincia || g.provincia}
                    </td>
                    <td>{g.comprasMes}</td>
                    <td>{g.puntosMes}</td>
                    <td>
                      <input
                        type="text"
                        value={g.premio || ""}
                        onChange={(e) =>
                          handlePremioChange(g.id, e.target.value)
                        }
                        placeholder="Ej: Orden de compra $50.000"
                      />
                    </td>
                    <td>
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
