/* =========================================================================
   Vista: Dashboard / Inicio — Ejecución presupuestal (indicadores + tablero)
   ========================================================================= */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { api, type ApiDashboard } from "@/lib/api";
import { icons, Icon, type IconName } from "@/components/icons";
import { ExecCell, Badge, OverFlag, EmptyRow } from "@/components/ui";
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

const pct2 = (n: number) => `${n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const pct0 = (n: number) => `${Math.round(n)}%`;

/* Medidor circular (dona) — SVG puro, sin librerías externas. */
function Gauge({ value, label, tone }: { value: number; label: string; tone: "teal" | "navy" }) {
  const R = 56;
  const C = 2 * Math.PI * R;
  const v = Math.max(0, Math.min(100, value));
  const dash = (v / 100) * C;
  return <div className="gauge">
    <svg viewBox="0 0 132 132" className="gauge-svg" aria-hidden="true">
      <circle cx="66" cy="66" r={R} className="gauge-track" />
      <circle cx="66" cy="66" r={R} className={`gauge-fill gauge-${tone}`} strokeDasharray={`${dash} ${C}`} transform="rotate(-90 66 66)" />
    </svg>
    <div className="gauge-center">
      <div className="gauge-pct">{pct2(v)}</div>
      <div className="gauge-label">{label}</div>
    </div>
  </div>;
}

export function DashboardPage() {
  const { selectedYear, setSelectedYear, ecosystems, canManagePortfolio } = useStore();
  const navigate = useNavigate();
  const [ecoFilter, setEcoFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [approvedFilter, setApprovedFilter] = useState<"" | "si" | "no">("");
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

  const allRows = data?.rows ?? [];
  const pending = data?.pendingCycles ?? [];
  const term = search.trim().toLowerCase();

  // Filtros del tablero (recalculan los indicadores en vivo)
  const rows = allRows.filter((r) =>
    (!ecoFilter || r.ecosystem === ecoFilter) &&
    (!projectFilter || String(r.projectId) === projectFilter) &&
    (approvedFilter === "" || (approvedFilter === "si") === (r.approvalStatus === "Aprobado")) &&
    (!term || `${r.projectName} ${r.leaderName} ${r.ecosystem}`.toLowerCase().includes(term)),
  );

  // Opciones únicas de proyecto para el filtro
  const projectOptions = [...new Map(allRows.map((r) => [r.projectId, r.projectName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));

  // Indicadores agregados sobre las filas filtradas
  const budget = rows.reduce((s, r) => s + r.budget, 0);
  const committed = rows.reduce((s, r) => s + r.committed, 0);
  const executed = rows.reduce((s, r) => s + r.executed, 0);
  const used = committed + executed;
  const remaining = budget - used;
  const rel = (n: number) => (budget ? (n / budget) * 100 : 0);
  const pctExecuted = rel(executed);
  const pctCommitted = rel(committed);
  const pctUsed = rel(used);
  const pctAvailable = rel(remaining);

  const resetFilters = () => { setEcoFilter(""); setProjectFilter(""); setApprovedFilter(""); setSearch(""); };

  return <>
    <div className="page-head">
      <div className="titles">
        <div className="eyebrow">Vigencia {selectedYear}</div>
        <h1>Ejecución presupuestal</h1>
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
      <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
        <option value="">Todos los proyectos</option>
        {projectOptions.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
      </select>
      <select value={approvedFilter} onChange={(e) => setApprovedFilter(e.target.value as "" | "si" | "no")}>
        <option value="">¿Aprobado por subcomisión? · Todas</option>
        <option value="si">Aprobado por subcomisión</option>
        <option value="no">Sin aprobación de subcomisión</option>
      </select>
      <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proyecto, líder o ecosistema" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <button className="button secondary" onClick={resetFilters}>Restablecer filtros</button>
    </div>

    <section className="panel">
      <div className="panel-head">
        <h2><icons.wallet2 /> Indicadores de ejecución</h2>
        <span className="help">{rows.length} proyecto{rows.length === 1 ? "" : "s"} en consulta</span>
      </div>

      {loadingDash
        ? <p className="help" style={{ padding: "8px 2px" }}>Cargando indicadores…</p>
        : <div className="exec-grid">
          <div className="exec-col-left">
            <div className="exec-hero-card">
              <span className="exec-hero-label">Presupuesto aprobado para ejecutar</span>
              <span className="exec-hero-value">{money(budget)}</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-label">Ejecutado + Comprometido</span>
              <span className="kpi-value">{money(used)}</span>
            </div>
          </div>

          <div className="exec-col-center">
            <Gauge value={pctUsed} label="Ppto. Ejecutado" tone="teal" />
            <Gauge value={pctAvailable} label="Ppto. Disponible" tone="navy" />
          </div>

          <div className="exec-col-right">
            <div className="kpi-pair">
              <div className="kpi-box navy"><span className="kpi-label">Ejecutado</span><span className="kpi-value">{money(executed)}</span></div>
              <span className="kpi-arrow"><icons.arrowRight /></span>
              <div className="kpi-box light"><span className="kpi-label">% ejecutado</span><span className="kpi-value">{pct0(pctExecuted)}</span></div>
            </div>
            <div className="kpi-pair">
              <div className="kpi-box navy"><span className="kpi-label">Comprometido</span><span className="kpi-value">{money(committed)}</span></div>
              <span className="kpi-arrow"><icons.arrowRight /></span>
              <div className="kpi-box light"><span className="kpi-label">% comprometido</span><span className="kpi-value">{pct0(pctCommitted)}</span></div>
            </div>
            <div className="kpi-box teal">
              <span className="kpi-label">Ppto. restante</span>
              <span className="kpi-value">{money(remaining)}</span>
            </div>
          </div>
        </div>}
    </section>

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
