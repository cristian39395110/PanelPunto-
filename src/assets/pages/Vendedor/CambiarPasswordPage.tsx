import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../LoginPage.css";

const API_URL = import.meta.env.VITE_API_URL;

const CambiarPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordRepetir, setPasswordRepetir] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("panelToken");
  const rol = localStorage.getItem("panelRol");
  const debeCambiar = localStorage.getItem("panelDebeCambiarPassword") === "1";

  // Si no hay token, afuera
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // 👉 helper para mandar al home según rol
  const irAlHome = () => {
    if (rol === "admin") navigate("/admin");
    else if (rol === "supervisor") navigate("/supervisor-vendedores");
    else if (rol === "vendedor") navigate("/vendedor-home");
    else navigate("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOkMsg("");

    if (!token) {
      setError("Sesión no válida, iniciá sesión de nuevo.");
      return;
    }

    if (!passwordNueva.trim() || !passwordRepetir.trim()) {
      setError("Completá la nueva contraseña en ambos campos.");
      return;
    }

    if (passwordNueva.trim().length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordNueva.trim() !== passwordRepetir.trim()) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const body: any = {
        passwordNueva: passwordNueva.trim(),
      };

      const res = await fetch(
        `${API_URL}/api/tecnicocomercio/cambiar-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error || "No se pudo actualizar la contraseña.");
        setLoading(false);
        return;
      }

      setOkMsg("✅ Contraseña actualizada correctamente.");
      localStorage.setItem("panelDebeCambiarPassword", "0");

      setTimeout(() => {
        irAlHome();
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Error de conexión.");
    }

    setLoading(false);
  };

  // 👇 Si YA NO debe cambiar password, no mostramos formulario
  if (!debeCambiar) {
    return (
      <div className="login-page">
        <div className="login-page-inner">
          <div className="login-brand">
            <div className="login-logo-circle">
              <span className="login-logo-text">P+</span>
            </div>
            <h1 className="login-brand-title">Punto+ Admin</h1>
            <p className="login-brand-subtitle">
              Gestión de contraseñas de vendedores.
            </p>
          </div>

          <div className="login-card">
            <h2 className="login-title">Contraseña fija</h2>
            <p style={{ marginBottom: 16 }}>
              Ya configuraste tu contraseña. <br />
              Si necesitás cambiarla, hablá con tu supervisor para que la
              resetee desde el panel.
            </p>
            <button className="form-button" onClick={irAlHome}>
              Ir al panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 👉 Caso normal: PRIMER login, lo obligamos a cambiar
  return (
    <div className="login-page">
      <div className="login-page-inner">
        <div className="login-brand">
          <div className="login-logo-circle">
            <span className="login-logo-text">P+</span>
          </div>
          <h1 className="login-brand-title">Punto+ Admin</h1>
          <p className="login-brand-subtitle">
            Cambiá tu contraseña para seguir usando el panel.
          </p>
        </div>

        <div className="login-card">
          <h2 className="login-title">Creá tu nueva contraseña</h2>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="passwordNueva" className="form-label">
                Nueva contraseña
              </label>
              <input
                id="passwordNueva"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                className="form-input"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="passwordRepetir" className="form-label">
                Repetir nueva contraseña
              </label>
              <input
                id="passwordRepetir"
                type="password"
                placeholder="Repetí la nueva contraseña"
                value={passwordRepetir}
                onChange={(e) => setPasswordRepetir(e.target.value)}
                className="form-input"
                autoComplete="new-password"
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            {okMsg && (
              <p className="form-success" style={{ marginTop: 8 }}>
                {okMsg}
              </p>
            )}

            <button type="submit" className="form-button" disabled={loading}>
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CambiarPasswordPage;
