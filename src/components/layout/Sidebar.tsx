/* =========================================================================
   Sidebar institucional · marca, navegación y frase de propósito
   ========================================================================= */
import { NavLink } from "react-router-dom";
import { icons, type IconName } from "@/components/icons";
import { useStore } from "@/store/store";
import logoWhite from "@/assets/brand/NEGATIVO-HORIZONTAL-BLANCO.png";

type Item = { to: string; label: string; icon: IconName; show: boolean };

export function Sidebar() {
  const { canManagePortfolio, isJefatura } = useStore();
  const items: Item[] = [
    { to: "/dashboard", label: "Inicio", icon: "home", show: true },
    { to: "/projects", label: "Proyectos", icon: "folder", show: true },
    { to: "/catalogs", label: "Catálogos", icon: "tags", show: canManagePortfolio },
    { to: "/users", label: "Usuarios", icon: "user", show: isJefatura },
  ];

  return <aside className="sidebar">
    <div className="brand">
      <img src={logoWhite} alt="Universidad de La Sabana" />
      <div className="brand-sub">Jefatura de Innovación<br />Seguimiento presupuestal</div>
    </div>
    <nav className="nav">
      <div className="nav-label">Navegación</div>
      {items.filter((item) => item.show).map(({ to, label, icon }) => {
        const IconCmp = icons[icon];
        return <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
          <IconCmp /><span>{label}</span>
        </NavLink>;
      })}
    </nav>
    <div className="side-foot">
      <p className="purpose">Innovamos para crear. Creamos para servir.</p>
      <small>Tu avance se guarda automáticamente en este equipo.</small>
    </div>
  </aside>;
}
