/* =========================================================================
   Vista: Células (hub del portafolio)
   ========================================================================= */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { icons, Icon } from "@/components/icons";
import { PageHeader, BudgetBar, OverFlag, EmptyState, LoadState, YearSelect } from "@/components/ui";
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
  const figures = !loading && !error;

  return <>
    <PageHeader
      eyebrow={`Vigencia ${selectedYear}`}
      title="Células"
      subtitle="Selecciona una célula para ver y gestionar sus proyectos."
      actions={<>
        <div className="filters"><YearSelect value={selectedYear} onChange={setSelectedYear} /></div>
        {canManageProjects && <button className="button" onClick={() => setCreating(true)}><icons.plus /> Crear proyecto</button>}
      </>}
    />

    {error && <LoadState error={`No fue posible cargar las cifras de la vigencia ${selectedYear}. ${error}`} onRetry={retry} />}
    {cells.length === 0 && <section className="panel">
      <EmptyState title={canManagePortfolio ? "Aún no hay células" : "Aún no tienes proyectos asignados"}>
        {canManagePortfolio ? "Crea la primera célula en Catálogos." : "Cuando te asignen un proyecto aparecerá aquí."}
      </EmptyState>
    </section>}

    <div className="cell-grid">
      {cells.map((name) => {
        const count = projectsByCell(name).length;
        const summary = summarizeRows(yearRows.filter((r) => r.ecosystem === name));
        return <button key={name} className={`cell-card ${summary.over ? "is-over" : ""}`} onClick={() => navigate(`/projects/cell/${encodeURIComponent(name)}`)}>
          {/* Dentro de <button> solo se permite contenido en línea: se usan <span> con display por CSS. */}
          <span className="cell-card-top">
            <span className="cell-ico"><Icon name={cellIconName(name)} /></span>
            <span className="cell-text">
              <span className="cell-name">{name}</span>
              <span className="cell-count">{count} proyecto{count === 1 ? "" : "s"} · {summary.activeCycles} vigencia{summary.activeCycles === 1 ? "" : "s"} abierta{summary.activeCycles === 1 ? "" : "s"}</span>
            </span>
            {summary.over > 0 && <OverFlag />}
          </span>
          <span className="stats">
            <span className="stat"><span className="k">Presupuesto</span><span className="v">{figures ? money(summary.budget) : "—"}</span></span>
            <span className="stat"><span className="k">Ejecutado</span><span className="v">{figures ? money(summary.executed) : "—"}</span></span>
          </span>
          {loading
            ? <span className="muted-note">Cargando cifras…</span>
            : figures && <BudgetBar budget={summary.budget} executed={summary.executed} committed={summary.committed} meta />}
          <span className="cell-card-cta">Ver proyectos <icons.arrowRight /></span>
        </button>;
      })}
    </div>

    {creating && <ProjectFormModal onClose={() => setCreating(false)} />}
  </>;
}
