/* =========================================================================
   Vista: Dashboard (consolidado por vigencia)
   ========================================================================= */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/store";
import { icons, Icon } from "@/components/icons";
import { Metric, ExecCell, Badge, OverFlag, BudgetLegend, EmptyRow } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { money } from "@/lib/format";
import { availableYears, expenseTotals, cycleFlow } from "@/lib/calculations";

export function DashboardPage() {
  const store = useStore();
  const { state, accessibleProjects, canManagePortfolio, setSelectedYear } = store;
  const navigate = useNavigate();
  const [ecoFilter, setEcoFilter] = useState("");
  const [creating, setCreating] = useState(false);

  const cycles = useMemo(
    () => accessibleProjects().flatMap((project) => project.cycles.filter((cycle) => String(cycle.year) === state.selectedYear).map((cycle) => ({ project, cycle }))),
    [state.projects, state.selectedYear, state.activeUserId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const total = cycles.reduce((sum, { cycle }) => sum + (cycle.budget || 0), 0);
  const totals = cycles.reduce((all, { cycle }) => {
    const values = expenseTotals(cycle);
    return { committed: all.committed + values.committed, executed: all.executed + values.executed };
  }, { committed: 0, executed: 0 });
  const over = cycles.filter(({ cycle }) => expenseTotals(cycle).available < 0);
  const available = total - totals.committed - totals.executed;
  const execPct = total ? Math.round((totals.executed / total) * 100) : 0;

  const pending = cycles
    .map(({ project, cycle }) => ({ project, cycle, flow: cycleFlow(cycle) }))
    .filter(({ cycle, flow }) => !cycle.closed && flow.next && flow.stageIndex < 4);

  const visibleRows = cycles.filter(({ project }) => !ecoFilter || project.ecosystem === ecoFilter);

  return <>
    <div className="page-head">
      <div className="titles">
        <div className="eyebrow">Vigencia {state.selectedYear}</div>
        <h1>Seguimiento presupuestal</h1>
        <p className="subtitle">Vista consolidada de proyectos, vigencias y ejecución presupuestal de la Jefatura de Innovación.</p>
      </div>
      {canManagePortfolio && <button className="button" onClick={() => setCreating(true)}><icons.plus /> Nuevo proyecto</button>}
    </div>

    <div className="filters">
      <select value={state.selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
        {availableYears(state.projects).map((year) => <option key={year} value={String(year)}>Vigencia {year}</option>)}
      </select>
      <select value={ecoFilter} onChange={(e) => setEcoFilter(e.target.value)}>
        <option value="">Todos los ecosistemas</option>
        {state.ecosystems.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button className="button secondary" onClick={() => setEcoFilter("")}>Limpiar filtros</button>
    </div>

    <div className="metrics m5">
      <Metric label="Presupuesto asignado" value={money(total)} icon="wallet2" foot={`${cycles.length} vigencia${cycles.length === 1 ? "" : "s"} en consulta`} />
      <Metric label="Comprometido" value={money(totals.committed)} icon="clock" tone="tone-exec" foot="Reservado, aún no ejecutado" />
      <Metric label="Ejecutado" value={money(totals.executed)} icon="coins" tone="tone-exec" foot={`${execPct}% del presupuesto`} />
      <Metric label="Saldo disponible" value={money(available)} icon="wallet" tone={available < 0 ? "tone-alert" : "tone-avail"} foot={available < 0 ? "Presupuesto excedido" : "Recursos por comprometer"} />
      <Metric label="Sobreejecutados" value={String(over.length)} icon="alert" tone={over.length ? "tone-alert" : ""} foot={over.length ? "Requieren atención" : "Sin alertas"} />
    </div>

    {pending.length > 0 && <section className="panel pending-panel">
      <div className="panel-head">
        <h2><icons.clock /> Pendientes por completar</h2>
        <span className="help">{pending.length} vigencia{pending.length === 1 ? "" : "s"} con pasos por atender</span>
      </div>
      <div className="pending-list">
        {pending.map(({ project, cycle, flow }) => (
          <button key={cycle.id} className="pending-item" onClick={() => navigate(`/projects/${project.id}/cycles/${cycle.id}`)}>
            <span className="pending-step">{flow.next && <Icon name={flow.next.icon} />}</span>
            <span className="pending-main">
              <span className="pending-name">{project.name} <span className="pending-year">· Vigencia {cycle.year}</span></span>
              <span className="pending-next">Siguiente: {flow.next?.title}</span>
            </span>
            <span className="pending-cta"><Badge value={cycle.approval === "Aprobado" ? cycle.status : cycle.approval} /> <icons.arrowRight /></span>
          </button>
        ))}
      </div>
    </section>}

    <section className="panel">
      <div className="panel-head">
        <h2>Proyectos por vigencia</h2>
        <BudgetLegend />
      </div>
      <div className="table-wrap">
        <table className="table-portfolio">
          <thead><tr><th>Proyecto</th><th>Líder</th><th>Presupuesto / Ejecución</th></tr></thead>
          <tbody>
            {visibleRows.length === 0
              ? <EmptyRow colSpan={3}>No hay proyectos para esta vigencia.</EmptyRow>
              : visibleRows.map(({ project, cycle }) => {
                const values = expenseTotals(cycle);
                const isOver = values.available < 0;
                return <tr key={cycle.id} className={isOver ? "danger-row" : ""}>
                  <td>
                    <div className="cell-project">
                      <button className="project-link" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}</button>
                      <div className="cell-meta"><span className="meta-eco">{project.ecosystem}</span><span className="dot-sep" />{isOver ? <OverFlag /> : <Badge value={cycle.status} />}</div>
                    </div>
                  </td>
                  <td data-label="Líder">{project.leader}</td>
                  <td className="exec-cell" data-label="Ejecución">{cycle.budget ? <ExecCell budget={cycle.budget} totals={values} /> : <span className="exec-empty">Sin presupuesto asignado</span>}</td>
                </tr>;
              })}
          </tbody>
        </table>
      </div>
    </section>

    {creating && <ProjectFormModal onClose={() => setCreating(false)} />}
  </>;
}
