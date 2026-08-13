/* =========================================================================
   App · árbol de rutas (HashRouter para despliegue estático portable)
   ========================================================================= */
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "@/store/apiStore";
import { ToastProvider } from "@/components/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/app/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { CellPage } from "@/features/projects/CellPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { CycleDetailPage } from "@/features/cycles/CycleDetailPage";
import { CatalogsPage } from "@/features/catalogs/CatalogsPage";
import { UsersPage } from "@/features/users/UsersPage";

export function App() {
  return <StoreProvider>
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/cell/:cell" element={<CellPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/projects/:projectId/cycles/:cycleId" element={<CycleDetailPage />} />
              <Route path="/catalogs" element={<CatalogsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  </StoreProvider>;
}
