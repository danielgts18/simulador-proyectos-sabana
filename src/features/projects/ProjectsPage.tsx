/* =========================================================================
   Vista: Proyectos (hub de células / ecosistemas)
   ========================================================================= */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { icons, Icon } from "@/components/icons";
import { BudgetBar, OverFlag } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { cellIconName } from "@/features/projects/cellIcons";
import { money } from "@/lib/format";
import { cellSummary } from "@/lib/calculations";

const YEAR_RANGE = ["2024", "2025", "2026", "2027", "2028"];

export function ProjectsPage() {
  const { ecosystems, selectedYear, setSelectedYear, accessibleProjects, canManagePortfolio, canManageProjects } = useStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const projectsByCell = (name: string) => accessibleProjects().filter((p) => p.ecosystem === name);
  const cells = ecosystems.filter((name) => canManagePortfolio || projectsByCell(name).length > 0);

  // Incluir el año seleccionado aunque no esté en el rango fijo
  const yearOptions = YEAR_RANGE.includes(selectedYear) ? YEAR_RANGE : [...YEAR_RANGE, selectedYear].sort((a, b) => Number(b) - Number(a));

  return <>
    <div className="page-head">
      <div className="titles">
        <div className="eyebrow">Portafolio por células</div>
        <h1>Proyectos</h1>
        <p className="subtitle">Selecciona una célula para ver y gestionar sus proyectos. Cifras de la vigencia {selectedYear}.</p>
      </div>
      {canManageProjects && <button className="button" onClick={() => setCreating(true)}><icons.plus /> Crear proyecto</button>}
    </div>

    <div className="filters">
      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
        {yearOptions.map((year) => <option key={year} value={year}>Vigencia {year}</option>)}
      </select>
    </div>

    <div className="cell-grid">
      {cells.map((name) => {
        const summary = cellSummary(name, projectsByCell(name), selectedYear);
        return <button key={name} className={`cell-card ${summary.over ? "over" : ""}`} onClick={() => navigate(`/projects/cell/${encodeURIComponent(name)}`)}>
          <div className="cell-card-top">
            <div className="cell-ico"><Icon name={cellIconName(name)} /></div>
            <div>
              <div className="cell-name">{name}</div>
              <div className="cell-count">{summary.count} proyecto{summary.count === 1 ? "" : "s"} · {summary.activeCycles} vigencia{summary.activeCycles === 1 ? "" : "s"} abierta{summary.activeCycles === 1 ? "" : "s"}</div>
            </div>
            {summary.over > 0 && <OverFlag />}
          </div>
          <div className="cell-fin">
            <div className="cell-stat"><div className="k">Presupuesto</div><div className="v">{money(summary.budget)}</div></div>
            <div className="cell-stat"><div className="k">Ejecutado</div><div className="v">{money(summary.executed)}</div></div>
          </div>
          {summary.budget
            ? <BudgetBar budget={summary.budget} totals={{ committed: summary.committed, executed: summary.executed, used: summary.used, available: summary.available }} />
            : <p className="help">Sin presupuesto en la vigencia {selectedYear}.</p>}
          <span className="cell-card-cta">Ver proyectos <icons.arrowRight /></span>
        </button>;
      })}
    </div>

    {creating && <ProjectFormModal onClose={() => setCreating(false)} />}
  </>;
}
