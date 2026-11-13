/* =========================================================================
   Topbar · breadcrumb derivado de la ruta + usuario y cierre de sesión
   ========================================================================= */
import { Fragment } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { icons } from "@/components/icons";
import { useStore } from "@/store/apiStore";
import { initials } from "@/lib/format";
import { roleLabels } from "@/lib/types";

type Crumb = { label: string; to?: string };

/** location.pathname llega codificado; un nombre con "%" mal formado no debe romper la vista. */
function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

/** Construye la migaja de pan a partir de la ruta actual y el estado. */
function useCrumbs(): Crumb[] {
  const location = useLocation();
  const { getProject } = useStore();
  const parts = location.pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Dashboard", to: "/dashboard" }];

  if (parts[0] === "projects") {
    crumbs.push({ label: "Células", to: "/projects" });
    if (parts[1] === "cell" && parts[2]) {
      crumbs.push({ label: safeDecode(parts[2]) });
    } else if (parts[1]) {
      const project = getProject(Number(parts[1]));
      if (project) {
        crumbs.push({ label: project.ecosystem, to: `/projects/cell/${encodeURIComponent(project.ecosystem)}` });
        if (parts[2] === "cycles" && parts[3]) {
          const cycle = project.cycles.find((c) => c.id === Number(parts[3]));
          crumbs.push({ label: project.name, to: `/projects/${project.id}` });
          crumbs.push({ label: cycle ? `Vigencia ${cycle.year}` : "Vigencia" });
        } else {
          crumbs.push({ label: project.name });
        }
      }
    }
  } else if (parts[0] === "catalogs") {
    crumbs.push({ label: "Catálogos" });
  } else if (parts[0] === "users") {
    crumbs.push({ label: "Usuarios" });
  }
  return crumbs;
}

export function Topbar() {
  const crumbs = useCrumbs();
  const { activeUser, logout } = useStore();
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate("/login"); };

  return <header className="topbar">
    <nav className="crumb" aria-label="Ruta de navegación">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return <Fragment key={`${crumb.label}-${i}`}>
          {i > 0 && <span className="sep"><icons.chevron /></span>}
          {last || !crumb.to
            ? <span className="crumb-current" aria-current={last ? "page" : undefined}>{crumb.label}</span>
            : <Link className="crumb-link" to={crumb.to}>{crumb.label}</Link>}
        </Fragment>;
      })}
    </nav>
    <span className="top-user">
      <span className="avatar">{initials(activeUser?.name)}</span>
      <span className="name">{activeUser?.name}</span>
      <span className="role-label">{activeUser ? roleLabels[activeUser.role] : ""}</span>
      <button className="session-exit" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><icons.arrowRight /></button>
    </span>
  </header>;
}
