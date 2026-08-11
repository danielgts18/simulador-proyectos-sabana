/* =========================================================================
   Vista: Proyectos (hub de células / ecosistemas)
   ========================================================================= */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/store";
import { icons, Icon } from "@/components/icons";
import { BudgetBar, OverFlag } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { cellIconName } from "@/features/projects/cellIcons";
import { money } from "@/lib/format";
import { availableYears, cellSummary } from "@/lib/calculations";

export function ProjectsPage() {
  const { state, accessibleProjects, canManagePortfolio, setSelectedYear } = useStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const projectsByCell = (name: string) => accessibleProjects().filter((project) => project.ecosystem === name);
  const cells = state.ecosystems.filter((name) => canManagePortfolio || projectsByCell(name).length > 0);

  return <>
    <div className="page-head">
      <div className="titles">
        <div className="eyebrow">Portafolio por células</div>
        <h1>Proyectos</h1>
        <p className="subtitle">Selecciona una célula para ver y gestionar sus proyectos. Cifras de la vigencia {state.selectedYear}.</p>
      </div>
      {canManagePortfolio && <button className="button" onClick={() => setCreating(true)}><icons.plus /> Crear proyecto</button>}
    </div>

    <div className="filters">
      <select value={state.selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
        {availableYears(state.projects).map((year) => <option key={year} value={String(year)}>Vigencia {year}</option>)}
      </select>
    </div>

    <div className="cell-grid">
      {cells.map((name) => {
        const summary = cellSummary(name, projectsByCell(name), state.selectedYear);
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
            : <p className="help">Sin presupuesto en la vigencia {state.selectedYear}.</p>}
          <span className="cell-card-cta">Ver proyectos <icons.arrowRight /></span>
        </button>;
      })}
    </div>

    {creating && <ProjectFormModal onClose={() => setCreating(false)} />}
  </>;
}
