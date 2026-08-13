/* Guarda de sesión: redirige al login si no hay usuario activo. */
import { Navigate, Outlet } from "react-router-dom";
import { useStore } from "@/store/apiStore";

export function RequireAuth() {
  const { activeUser } = useStore();
  if (!activeUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}
