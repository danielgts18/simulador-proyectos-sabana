/* =========================================================================
   AppShell · estructura general de las vistas autenticadas
   Sidebar + topbar + área de contenido con las rutas hijas (Outlet).
   ========================================================================= */
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { LoadState } from "@/components/ui";
import { useStore } from "@/store/apiStore";

export function AppShell() {
  const { loadError, reloadData } = useStore();
  return <div className="shell">
    <Sidebar />
    <main className="main">
      <Topbar />
      <section className="content">
        {loadError && <LoadState error={`No fue posible cargar proyectos y catálogos. ${loadError}`} onRetry={() => { void reloadData(); }} />}
        <Outlet />
      </section>
    </main>
  </div>;
}
