import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const API_URL = import.meta.env.VITE_API_URL;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/tecnicocomercio/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

 
console.log("🔵 LOGIN DATA:", data);

      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas");
        setLoading(false);
        return;
      }

      // Guardamos token y datos básicos
      localStorage.setItem("panelToken", data.token);
      localStorage.setItem("panelRol", data.rol);
      localStorage.setItem("panelNombre", data.nombre);
      localStorage.setItem(
        "panelDebeCambiarPassword",
        data.debeCambiarPassword ? "1" : "0"
      );

      // 👉 Si es primer login (viene con debeCambiarPassword=true)
      if (data.debeCambiarPassword) {
        // lo mandamos sí o sí a cambiar contraseña
        navigate("/cambiar-password");
        setLoading(false);
        return;
      }

      // Redirección según rol (login normal)
      if (data.rol === "admin") navigate("/admin");
      else if (data.rol === "supervisor") navigate("/supervisor-vendedores");
      else if (data.rol === "vendedor") navigate("/vendedor-home");
      else navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-page-inner">
        <div className="login-brand">
          <div className="login-logo-circle">
            <span className="login-logo-text">P+</span>
          </div>
          <h1 className="login-brand-title">Punto+ Admin</h1>
          <p className="login-brand-subtitle">
            Panel para admins, supervisores y vendedores.
          </p>
        </div>

        <div className="login-card">
          <h2 className="login-title">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="tuemail@punto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                autoComplete="current-password"
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="form-button" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="login-footer-text">
            Acceso restringido al equipo de Punto+.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
