/* =========================================================================
   AppShell · estructura general de las vistas autenticadas
   Sidebar + topbar + área de contenido con las rutas hijas (Outlet).
   ========================================================================= */
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell() {
  return <div className="shell">
    <Sidebar />
    <main className="main">
      <Topbar />
      <section className="content"><Outlet /></section>
    </main>
  </div>;
}
