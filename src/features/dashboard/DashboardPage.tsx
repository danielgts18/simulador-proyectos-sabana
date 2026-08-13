/* =========================================================================
   Vista: Dashboard (consolidado por vigencia — datos del servidor)
   ========================================================================= */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { api, type ApiDashboard } from "@/lib/api";
import { icons, Icon, type IconName } from "@/components/icons";
import { Metric, ExecCell, Badge, OverFlag, EmptyRow } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { money } from "@/lib/format";

// Mapeo de nextAction → { icon, title } para el panel de pendientes
const ACTION_META: Record<string, { icon: IconName; title: string }> = {
  "submit-review": { icon: "send", title: "Enviar a revisión" },
  "decision":      { icon: "gavel", title: "Registrar decisión" },
  "assign-budget": { icon: "wallet", title: "Iniciar y asignar presupuesto" },
};

// Rango fijo de años disponibles para el selector de vigencia
const YEAR_RANGE = [2024, 2025, 2026, 2027, 2028];

export function DashboardPage() {
  const { selectedYear, setSelectedYear, ecosystems, canManagePortfolio } = useStore();
  const navigate = useNavigate();
  const [ecoFilter, setEcoFilter] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);

  useEffect(() => {
    setLoadingDash(true);
    void api.dashboard(Number(selectedYear))
      .then((res) => { if (res.ok) setData(res.data); })
      .finally(() => setLoadingDash(false));
  }, [selectedYear]);

  const aggregate = data?.aggregate ?? { totalBudget: 0, committed: 0, executed: 0, available: 0, overCount: 0 };
  const pending = data?.pendingCycles ?? [];
  const term = search.trim().toLowerCase();
  const rows = (data?.rows ?? []).filter((r) =>
    (!ecoFilter || r.ecosystem === ecoFilter) &&
    (!term || `${r.projectName} ${r.leaderName} ${r.ecosystem}`.toLowerCase().includes(term)),
  );
  const execPct = aggregate.totalBudget ? Math.round((aggregate.executed / aggregate.totalBudget) * 100) : 0;

  return <>
    <div className="page-head">
      <div className="titles">
        <div className="eyebrow">Vigencia {selectedYear}</div>
        <h1>Seguimiento presupuestal</h1>
        <p className="subtitle">Vista consolidada de proyectos, vigencias y ejecución presupuestal de la Jefatura de Innovación.</p>
      </div>
      {canManagePortfolio && <button className="button" onClick={() => setCreating(true)}><icons.plus /> Nuevo proyecto</button>}
    </div>

    <div className="filters">
      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
        {YEAR_RANGE.map((y) => <option key={y} value={String(y)}>Vigencia {y}</option>)}
      </select>
      <select value={ecoFilter} onChange={(e) => setEcoFilter(e.target.value)}>
        <option value="">Todos los ecosistemas</option>
        {ecosystems.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proyecto, líder o ecosistema" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <button className="button secondary" onClick={() => { setEcoFilter(""); setSearch(""); }}>Limpiar filtros</button>
    </div>

    <div className="metrics m5">
      <Metric label="Presupuesto asignado" value={money(aggregate.totalBudget)} icon="wallet2" foot={`${rows.length} vigencia${rows.length === 1 ? "" : "s"} en consulta`} />
      <Metric label="Comprometido" value={money(aggregate.committed)} icon="clock" tone="tone-exec" foot="Reservado, aún no ejecutado" />
      <Metric label="Ejecutado" value={money(aggregate.executed)} icon="coins" tone="tone-exec" foot={`${execPct}% del presupuesto`} />
      <Metric label="Saldo disponible" value={money(aggregate.available)} icon="wallet" tone={aggregate.available < 0 ? "tone-alert" : "tone-avail"} foot={aggregate.available < 0 ? "Presupuesto excedido" : "Recursos por comprometer"} />
      <Metric label="Sobreejecutados" value={String(aggregate.overCount)} icon="alert" tone={aggregate.overCount ? "tone-alert" : ""} foot={aggregate.overCount ? "Requieren atención" : "Sin alertas"} />
    </div>

    {pending.length > 0 && <section className="panel pending-panel">
      <div className="panel-head">
        <h2><icons.clock /> Pendientes por completar</h2>
        <span className="help">{pending.length} vigencia{pending.length === 1 ? "" : "s"} con pasos por atender</span>
      </div>
      <div className="pending-list">
        {pending.map((item) => {
          const meta = ACTION_META[item.nextAction ?? ""] ?? { icon: "pencil" as IconName, title: "Atender" };
          return <button key={item.cycleId} className="pending-item" onClick={() => navigate(`/projects/${item.projectId}/cycles/${item.cycleId}`)}>
            <span className="pending-step"><Icon name={meta.icon} /></span>
            <span className="pending-main">
              <span className="pending-name">{item.projectName} <span className="pending-year">· Vigencia {item.year}</span></span>
              <span className="pending-next">Siguiente: {meta.title}</span>
            </span>
            <span className="pending-cta"><Badge value={item.approvalStatus ?? "Borrador"} /> <icons.arrowRight /></span>
          </button>;
        })}
      </div>
    </section>}

    <section className="panel">
      <div className="panel-head">
        <h2>Proyectos por vigencia</h2>
      </div>
      <div className="table-wrap">
        <table className="table-portfolio">
          <thead><tr><th>Proyecto</th><th>Líder</th><th>Presupuesto / Ejecución</th></tr></thead>
          <tbody>
            {loadingDash
              ? <EmptyRow colSpan={3}>Cargando datos…</EmptyRow>
              : rows.length === 0
                ? <EmptyRow colSpan={3}>No hay proyectos para esta vigencia.</EmptyRow>
                : rows.map((row) => {
                  const isOver = row.available < 0;
                  const totals = { committed: row.committed, executed: row.executed, used: row.committed + row.executed, available: row.available };
                  return <tr key={`${row.projectId}-${row.cycleId ?? "none"}`} className={isOver ? "danger-row" : ""}>
                    <td>
                      <div className="cell-project">
                        <button className="project-link" onClick={() => navigate(`/projects/${row.projectId}`)}>{row.projectName}</button>
                        <div className="cell-meta">
                          <span className="meta-eco">{row.ecosystem}</span>
                          <span className="dot-sep" />
                          {isOver ? <OverFlag /> : <Badge value={row.cycleStatus ?? row.approvalStatus ?? "Borrador"} />}
                        </div>
                      </div>
                    </td>
                    <td data-label="Líder">{row.leaderName}</td>
                    <td className="exec-cell" data-label="Ejecución">
                      {row.budget ? <ExecCell budget={row.budget} totals={totals} /> : <span className="exec-empty">Sin presupuesto asignado</span>}
                    </td>
                  </tr>;
                })}
          </tbody>
        </table>
      </div>
    </section>

    {creating && <ProjectFormModal onClose={() => setCreating(false)} />}
  </>;
}
