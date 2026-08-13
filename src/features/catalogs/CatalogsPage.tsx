/* =========================================================================
   Vista: Catálogos (células y tipos de gasto)
   ========================================================================= */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons, Icon, type IconName } from "@/components/icons";

type CatalogType = "ecosystems" | "expenseTypes";

interface CardProps {
  title: string;
  subtitle: string;
  icon: IconName;
  type: CatalogType;
  items: string[];
}

function CatalogCard({ title, subtitle, icon, type, items }: CardProps) {
  const { addCatalog, deactivateCatalog, deleteCell, accessibleProjects } = useStore();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const visible = items.filter((item) => !term || item.toLowerCase().includes(term));
  const isCells = type === "ecosystems";

  const onAdd = async () => {
    const name = window.prompt("Nombre del nuevo registro:");
    if (name?.trim()) {
      await addCatalog(type, name.trim());
      notify("Registro agregado al catálogo.");
    }
  };

  const onRemove = async (item: string) => {
    if (isCells) {
      const projects = accessibleProjects().filter((p) => p.ecosystem === item);
      const cycleCount = projects.reduce((t, p) => t + p.cycles.length, 0);
      const expenseCount = projects.reduce((t, p) => t + p.cycles.reduce((s, c) => s + c.expenses.length, 0), 0);
      if (window.confirm(`Eliminar la célula "${item}" también borrará ${projects.length} proyecto(s), ${cycleCount} vigencia(s) y ${expenseCount} gasto(s). Esta acción no se puede deshacer. ¿Continuar?`)) {
        await deleteCell(item);
        notify(`Célula eliminada junto con ${projects.length} proyecto(s) asociados.`);
      }
    } else {
      await deactivateCatalog(type, item);
      notify("El registro fue desactivado.");
    }
  };

  return <section className="catalog-card">
    <div className="catalog-card-head">
      <span className="catalog-icon"><Icon name={icon} /></span>
      <div className="catalog-heading"><h2>{title}</h2><p>{subtitle}</p></div>
      <span className="catalog-count">{items.length}</span>
    </div>
    <div className="catalog-toolbar">
      <div className="filter-search catalog-search"><span className="cat-search-icon"><icons.search /></span><input type="search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label={`Buscar en ${title}`} /></div>
      <button className="button sm" onClick={() => { void onAdd(); }}><icons.plus /> Agregar</button>
    </div>
    <div className="chip-set">
      {items.length === 0
        ? <p className="help">Sin registros activos.</p>
        : visible.length === 0
          ? <p className="chip-empty">Ningún registro coincide con la búsqueda.</p>
          : visible.map((item) => <span key={item} className="chip">
            <span className="chip-label">{item}</span>
            <button className="chip-remove" onClick={() => { void onRemove(item); }} title={`${isCells ? "Eliminar" : "Desactivar"} ${item}`} aria-label={`${isCells ? "Eliminar" : "Desactivar"} ${item}`}>×</button>
          </span>)}
    </div>
  </section>;
}

export function CatalogsPage() {
  const { ecosystems, expenseTypes, canManagePortfolio } = useStore();
  if (!canManagePortfolio) return <Navigate to="/dashboard" replace />;
  return <>
    <div className="page-head">
      <div className="titles">
        <div className="eyebrow">Administración</div>
        <h1>Catálogos</h1>
        <p className="subtitle">Gestiona las células del portafolio y los tipos disponibles para clasificar gastos.</p>
      </div>
    </div>
    <div className="catalog-grid">
      <CatalogCard title="Ecosistemas / células" subtitle="Agrupan los proyectos por célula de innovación" icon="layers" type="ecosystems" items={ecosystems} />
      <CatalogCard title="Tipos de gasto" subtitle="Clasifican cada gasto registrado en las vigencias" icon="tags" type="expenseTypes" items={expenseTypes} />
    </div>
  </>;
}
