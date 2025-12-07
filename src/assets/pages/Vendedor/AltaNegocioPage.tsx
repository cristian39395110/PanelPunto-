import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AltaNegocioPage.css";



const API_URL = import.meta.env.VITE_API_URL;

const AltaNegocioPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("panelToken");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const enviarVenta = async () => {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_URL}/api/vendedor/registrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || "Error al registrar venta");
      } else {
        setMsg("Venta registrada correctamente ✔");
        setEmail("");
      }

    } catch (error) {
      setMsg("Error de conexión");
    }

    setLoading(false);
  };

  return (
    <div className="vend-container">

      <header className="vend-header">
        <h2>Registrar Venta</h2>
      </header>

      <div className="vend-form">
        <input
          className="vend-input"
          type="email"
          placeholder="Email del negocio"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {msg && <p className="vend-msg">{msg}</p>}

        <button
          className="vend-btn"
          disabled={loading}
          onClick={enviarVenta}
        >
          {loading ? "Enviando..." : "Registrar Venta"}
        </button>

        <button
          className="vend-btn-back"
          onClick={() => navigate("/vendedor-home")}
        >
          ← Volver
        </button>
      </div>
    </div>
  );
};

export default AltaNegocioPage;
