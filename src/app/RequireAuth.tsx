/* Guarda de sesión: redirige al login si no hay usuario activo. */
import { Navigate, Outlet } from "react-router-dom";
import { useStore } from "@/store/apiStore";

export function RequireAuth() {
  const { activeUser, hydrating } = useStore();
  // Mientras se valida el JWT guardado (tras recargar la página) no redirigimos:
  // evitamos que "actualizar" cierre la sesión.
  if (hydrating) return <div className="auth-hydrating" style={{ padding: 48, textAlign: "center", color: "var(--muted, #64748b)" }}>Restaurando sesión…</div>;
  if (!activeUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}
