import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./assets/pages/LoginPage";

// Vendedor
import VendedorHomePage from "./assets/pages/Vendedor/VendedorHomePage";
import VendedorAltaNegocioPage from "./assets/pages/Vendedor/AltaNegocioPage";
import CambiarPasswordPage from "./assets/pages/Vendedor/CambiarPasswordPage";

// Admin
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboardPage from "./assets/pages/Administrador/AdminDashboardPage";
import AdminSorteosPage from "./assets/pages/Administrador/AdminSorteosPage";
import AdminRetosPage from "./assets/pages/Administrador/AdminRetosPage";
import AdminVendedoresPage from "./assets/pages/Administrador/AdminVendedoresPage";
import AdminVendedorDetallePage from "./assets/pages/Administrador/AdminVendedorDetallePage";
import AdminAlertasPage from "./assets/pages/Administrador/AdminAlertasPage";
import AdminNegociosPage from "./assets/pages/Administrador/AdminNegociosPage"; // 👈 NUEVO
import AdminEstadisticasPage from "./assets/pages/Administrador/AdminEstadisticasPage"; 

// Supervisor
import SupervisorLayout from "./layouts/SupervisorLayout";
import SupervisorHomePage from "./assets/pages/Supervisor/SupervisorHomePage";
import SupervisorVendedorPage from "./assets/pages/Supervisor/SupervisorVendedorPage";
import SupervisorGestionVendedoresPage from "./assets/pages/Supervisor/SupervisorGestionVendedoresPage";
import SupervisorAlertasPage from "./assets/pages/Supervisor/SupervisorAlertasPage";
import SupervisorVendedorDetallePage from "./assets/pages/Supervisor/SupervisorVendedorDetallePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cambiar-password" element={<CambiarPasswordPage />} />

        {/* ROL VENDEDOR */}
        <Route path="/vendedor-home" element={<VendedorHomePage />} />
        <Route
          path="/vendedor/alta-negocio"
          element={<VendedorAltaNegocioPage />}
        />

        {/* Redirección vieja → supervisor */}
        <Route
          path="/supervisor-vendedores"
          element={<Navigate to="/supervisor/vendedores" replace />}
        />

        {/* PANEL ADMIN (layout + rutas hijas) */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* /admin → dashboard */}
          <Route index element={<AdminDashboardPage />} />

          {/* hijos RELATIVOS */}
          <Route path="sorteos" element={<AdminSorteosPage />} />
          <Route path="retos" element={<AdminRetosPage />} />
          <Route path="vendedores" element={<AdminVendedoresPage />} />
          <Route
            path="vendedor/:vendedorId"
            element={<AdminVendedorDetallePage />}
          />
          
           <Route path="usuario" element={<AdminEstadisticasPage />} />
          <Route path="alertas" element={<AdminAlertasPage />} />
          <Route path="negocios" element={<AdminNegociosPage />} /> {/* 👈 NUEVA PAGE */}
        </Route>

        {/* PANEL SUPERVISOR */}
        <Route path="/supervisor" element={<SupervisorLayout />}>
          {/* /supervisor → HOME */}
          <Route index element={<SupervisorHomePage />} />
          <Route path="ventas" element={<SupervisorHomePage />} />
          <Route path="vendedores" element={<SupervisorVendedorPage />} />
          <Route path="alertas" element={<SupervisorAlertasPage />} />
          <Route
            path="vendedor/:vendedorId"
            element={<SupervisorVendedorDetallePage />}
          />
          <Route
            path="gestion-vendedores"
            element={<SupervisorGestionVendedoresPage />}
          />
        </Route>

        {/* DEFAULT */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
