/* =========================================================================
   Vista: Proyectos (hub de células / ecosistemas)
   ========================================================================= */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { icons, Icon } from "@/components/icons";
import { BudgetBar, OverFlag, InfoBox, LoadState, YearSelect } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { cellIconName } from "@/features/projects/cellIcons";
import { money } from "@/lib/format";
import { summarizeRows, useYearRows } from "@/features/projects/useYearRows";

export function ProjectsPage() {
  const { ecosystems, selectedYear, setSelectedYear, accessibleProjects, canManagePortfolio, canManageProjects } = useStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { rows: yearRows, loading, error, retry } = useYearRows(selectedYear);

  const projectsByCell = (name: string) => accessibleProjects().filter((p) => p.ecosystem === name);
  const cells = ecosystems.filter((name) => canManagePortfolio || projectsByCell(name).length > 0);

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
      <YearSelect value={selectedYear} onChange={setSelectedYear} />
    </div>

    {error && <LoadState error={`No fue posible cargar las cifras de la vigencia ${selectedYear}. ${error}`} onRetry={retry} />}
    {cells.length === 0 && <InfoBox>{canManagePortfolio ? "Aún no hay células registradas. Créalas en Catálogos." : "Aún no tienes proyectos asignados."}</InfoBox>}

    <div className="cell-grid">
      {cells.map((name) => {
        const count = projectsByCell(name).length;
        const summary = summarizeRows(yearRows.filter((r) => r.ecosystem === name));
        return <button key={name} className={`cell-card ${summary.over ? "over" : ""}`} onClick={() => navigate(`/projects/cell/${encodeURIComponent(name)}`)}>
          {/* Dentro de <button> solo se permite contenido en línea: se usan <span> con display por CSS. */}
          <span className="cell-card-top">
            <span className="cell-ico"><Icon name={cellIconName(name)} /></span>
            <span className="cell-text">
              <span className="cell-name">{name}</span>
              <span className="cell-count">{count} proyecto{count === 1 ? "" : "s"} · {summary.activeCycles} vigencia{summary.activeCycles === 1 ? "" : "s"} abierta{summary.activeCycles === 1 ? "" : "s"}</span>
            </span>
            {summary.over > 0 && <OverFlag />}
          </span>
          <span className="cell-fin">
            <span className="cell-stat"><span className="k">Presupuesto</span><span className="v">{loading || error ? "—" : money(summary.budget)}</span></span>
            <span className="cell-stat"><span className="k">Ejecutado</span><span className="v">{loading || error ? "—" : money(summary.executed)}</span></span>
          </span>
          {loading ? <span className="help block">Cargando cifras…</span> : error ? <span className="help block">Cifras no disponibles.</span> : summary.budget
            ? <BudgetBar budget={summary.budget} totals={{ committed: summary.committed, executed: summary.executed, used: summary.used, available: summary.available }} />
            : <span className="help block">Sin presupuesto en la vigencia {selectedYear}.</span>}
          <span className="cell-card-cta">Ver proyectos <icons.arrowRight /></span>
        </button>;
      })}
    </div>

    {creating && <ProjectFormModal onClose={() => setCreating(false)} />}
  </>;
}
