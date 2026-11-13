/* =========================================================================
   Vista: Dashboard — tablero ejecutivo de la ejecución presupuestal.
   Pensado para la alta dirección: primero la respuesta (cuánto se ha usado
   del presupuesto), luego dónde mirar (células, alertas, tendencia) y al
   final el detalle por proyecto.
   ========================================================================= */
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { api, type ApiDashboard } from "@/lib/api";
import { icons, Icon, type IconName } from "@/components/icons";
import { PageHeader, Kpi, Pill, BudgetBar, BarLegend, EmptyState, EmptyRow, LoadState, YearSelect, type Tone } from "@/components/ui";
import { QuickExpenseButton } from "@/features/expenses/QuickExpenseButton";
import { money, moneyShort, pct, expenseMonths } from "@/lib/format";

type Row = ApiDashboard["rows"][number];
type SortKey = "use" | "budget" | "name" | "progress";

/* ---- Semáforo del proyecto (siempre con texto, no solo color) ----------- */
type Health = { key: "over" | "limit" | "ok" | "none" | "closed"; label: string; tone: Tone };
function health(row: Row): Health {
  if (row.closed) return { key: "closed", label: "Cerrada", tone: "neutral" };
  if (!row.budget) return { key: "none", label: "Sin presupuesto", tone: "neutral" };
  const used = (row.executed + row.committed) / row.budget;
  if (used > 1) return { key: "over", label: "Sobreejecutado", tone: "danger" };
  if (used >= 0.9) return { key: "limit", label: "Al límite", tone: "warning" };
  return { key: "ok", label: "En curso", tone: "success" };
}

const PENDING_LABEL: Record<string, string> = {
  "submit-review": "Enviar a revisión",
  "decision": "Decisión de la Subcomisión",
  "assign-budget": "Asignar presupuesto",
};

export function DashboardPage() {
  const { selectedYear, setSelectedYear, ecosystems, getProject, canManageExpenses } = useStore();
  const navigate = useNavigate();
  const [cellFilter, setCellFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("use");
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // El tipo de gasto se filtra en el servidor: los montos solo cuentan gastos de ese tipo.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api.dashboard(Number(selectedYear), typeFilter)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setData(res.data);
        else { setData(null); setError(res.message); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedYear, typeFilter, reloadKey]);

  const allRows = useMemo(() => (data?.rows ?? []).filter((r) => r.cycleId !== null), [data]);
  const rows = cellFilter ? allRows.filter((r) => r.ecosystem === cellFilter) : allRows;
  const usedTypes = data?.expenseTypesUsed ?? [];
  const typeOptions = typeFilter && !usedTypes.includes(typeFilter) ? [...usedTypes, typeFilter] : usedTypes;
  const cellOptions = ecosystems.filter((c) => allRows.some((r) => r.ecosystem === c) || c === cellFilter);

  /* ---- Totales del portafolio filtrado ---- */
  const budget = rows.reduce((s, r) => s + r.budget, 0);
  const executed = rows.reduce((s, r) => s + r.executed, 0);
  const committed = rows.reduce((s, r) => s + r.committed, 0);
  const used = executed + committed;
  const available = budget - used;
  const rel = (n: number) => (budget ? (n / budget) * 100 : 0);
  const withBudget = rows.filter((r) => r.budget > 0);
  const progress = withBudget.length ? withBudget.reduce((s, r) => s + (r.progressPct ?? 0) * r.budget, 0) / withBudget.reduce((s, r) => s + r.budget, 0) : 0;

  /* ---- Alertas ---- */
  const over = rows.filter((r) => health(r).key === "over").sort((a, b) => a.available - b.available);
  const limit = rows.filter((r) => health(r).key === "limit");
  const visibleIds = new Set(rows.map((r) => r.projectId));
  const pending = (data?.pendingCycles ?? []).filter((p) => visibleIds.has(p.projectId));
  const noBudget = rows.filter((r) => !r.budget && !r.closed && !pending.some((p) => p.cycleId === r.cycleId));
  const alertCount = over.length + limit.length + pending.length + noBudget.length;

  /* ---- Por célula ---- */
  const cells = useMemo(() => {
    const map = new Map<string, { name: string; budget: number; executed: number; committed: number; projects: number }>();
    for (const r of allRows) {
      const c = map.get(r.ecosystem) ?? { name: r.ecosystem, budget: 0, executed: 0, committed: 0, projects: 0 };
      c.budget += r.budget; c.executed += r.executed; c.committed += r.committed; c.projects += 1;
      map.set(r.ecosystem, c);
    }
    return [...map.values()].sort((a, b) => b.budget - a.budget);
  }, [allRows]);

  /* ---- Mensual ---- */
  const months = useMemo(() => {
    const m = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, executed: 0, committed: 0 }));
    for (const x of data?.monthly ?? []) {
      if (!visibleIds.has(x.projectId) || x.month < 1 || x.month > 12) continue;
      m[x.month - 1].executed += x.executed;
      m[x.month - 1].committed += x.committed;
    }
    return m;
  }, [data, cellFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthMax = Math.max(1, ...months.map((m) => m.executed + m.committed));
  const lastMonth = months.reduce((last, m) => (m.executed + m.committed > 0 ? m.month : last), 0);

  /* ---- Tabla ---- */
  const term = search.trim().toLowerCase();
  const tableRows = rows
    .filter((r) => !term || `${r.projectName} ${r.leaderName} ${r.ecosystem}`.toLowerCase().includes(term))
    .sort((a, b) => {
      if (sort === "name") return a.projectName.localeCompare(b.projectName);
      if (sort === "budget") return b.budget - a.budget;
      if (sort === "progress") return (b.progressPct ?? 0) - (a.progressPct ?? 0);
      const ua = a.budget ? (a.executed + a.committed) / a.budget : -1;
      const ub = b.budget ? (b.executed + b.committed) / b.budget : -1;
      return ub - ua;
    });
  const canQuickExpense = (r: Row) => {
    if (r.cycleId === null || r.closed) return false;
    const p = getProject(r.projectId);
    return !!p && canManageExpenses(p);
  };
  const anyQuick = tableRows.some(canQuickExpense);
  const openRow = (r: Row) => navigate(r.cycleId ? `/projects/${r.projectId}/cycles/${r.cycleId}` : `/projects/${r.projectId}`);
  const onRowKey = (e: KeyboardEvent, r: Row) => { if (e.key === "Enter") openRow(r); };

  const filtered = !!(cellFilter || typeFilter);
  const scope = cellFilter ? `la célula ${cellFilter}` : "el portafolio";

  return <>
    <PageHeader
      eyebrow={`Vigencia ${selectedYear}${typeFilter ? ` · ${typeFilter}` : ""}`}
      title="Dashboard"
      subtitle="Estado de la ejecución presupuestal de los proyectos de innovación."
      actions={<div className="filters" role="group" aria-label="Filtros del dashboard">
        <YearSelect value={selectedYear} onChange={setSelectedYear} />
        <select value={cellFilter} onChange={(e) => setCellFilter(e.target.value)} aria-label="Filtrar por célula">
          <option value="">Todas las células</option>
          {cellOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrar por tipo de gasto">
          <option value="">Todos los tipos de gasto</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {filtered && <button className="button subtle sm" onClick={() => { setCellFilter(""); setTypeFilter(""); }}>Quitar filtros</button>}
      </div>}
    />

    {(loading && !data) || error
      ? <LoadState loading={loading} error={error ? `No fue posible cargar el dashboard. ${error}` : null} onRetry={() => setReloadKey((k) => k + 1)}>Cargando dashboard…</LoadState>
      : rows.length === 0
        ? <section className="panel"><EmptyState title="Sin información para mostrar">{allRows.length === 0 ? `Aún no hay vigencias registradas para ${selectedYear}.` : "Ningún proyecto coincide con los filtros."}</EmptyState></section>
        : <>
          {/* 1 · Respuesta principal: ¿cuánto del presupuesto se ha usado? */}
          <section className={`panel db-summary ${loading ? "is-loading" : ""}`} aria-labelledby="db-summary-title">
            <div className="db-summary-top">
              <div>
                <h2 id="db-summary-title" className="db-kicker label-caps">Presupuesto asignado{cellFilter ? ` · ${cellFilter}` : ""}</h2>
                <div className="db-total">{money(budget)}</div>
              </div>
              <div className={`db-used ${available < 0 ? "is-over" : ""}`}>
                <span className="db-used-pct">{pct(rel(used))}</span>
                <span className="db-used-label">del presupuesto<br />ya está en uso</span>
              </div>
            </div>
            <BudgetBar budget={budget} executed={executed} committed={committed} size="lg" />
            <div className="db-legend3">
              <div className="l-exec"><i /><span className="l-name">Ejecutado</span><span className="l-pct">{pct(rel(executed))}</span><b>{money(executed)}</b></div>
              <div className="l-comm"><i /><span className="l-name">Comprometido</span><span className="l-pct">{pct(rel(committed))}</span><b>{money(committed)}</b></div>
              <div className={`l-avail ${available < 0 ? "is-over" : ""}`}><i /><span className="l-name">{available < 0 ? "Sobreejecución" : "Disponible"}</span><span className="l-pct">{pct(rel(Math.abs(available)))}</span><b>{money(Math.abs(available))}</b></div>
            </div>
            <p className="db-sentence">
              {available >= 0
                ? <>En {scope} se ha ejecutado el <b>{pct(rel(executed))}</b> y comprometido el <b>{pct(rel(committed))}</b> del presupuesto; quedan <b>{moneyShort(available)}</b> disponibles.</>
                : <>En {scope} lo ejecutado y comprometido supera el presupuesto en <b className="neg">{moneyShort(-available)}</b>.</>}
              {" "}El avance de implementación ponderado es del <b>{pct(progress)}</b>.
            </p>
          </section>

          {/* 2 · Indicadores de un vistazo */}
          <div className="kpis">
            <Kpi label={`Proyectos con vigencia ${selectedYear}`} value={rows.length} icon="folder" />
            <Kpi label="Avance de implementación (ponderado)" value={pct(progress)} icon="play" />
            <Kpi label="Proyectos sobreejecutados" value={over.length} icon="alert" tone={over.length ? "danger" : "success"} />
            <Kpi label="Vigencias pendientes de aprobación" value={pending.length} icon="gavel" tone={pending.length ? "warning" : "success"} />
          </div>

          {/* 3 · Dónde mirar: células y alertas */}
          <div className="db-grid">
            <section className="panel" aria-labelledby="db-cells-title">
              <div className="panel-head"><h2 id="db-cells-title"><icons.layers /> Ejecución por célula</h2><span className="help">Toca una célula para filtrar</span></div>
              <ul className="db-cells">
                {cells.map((c) => {
                  const u = c.executed + c.committed;
                  const active = cellFilter === c.name;
                  return <li key={c.name}>
                    <button className={`db-cell ${active ? "is-active" : ""} ${u > c.budget ? "is-over" : ""}`} aria-pressed={active} onClick={() => setCellFilter(active ? "" : c.name)}>
                      <span className="c-top"><span className="c-name">{c.name}</span><span className="c-pct">{c.budget ? pct((u / c.budget) * 100) : "—"}</span></span>
                      <BudgetBar budget={c.budget} executed={c.executed} committed={c.committed} />
                      <span className="c-foot"><span>{c.projects} proyecto{c.projects === 1 ? "" : "s"}</span><span>{moneyShort(u)} de {moneyShort(c.budget)}</span></span>
                    </button>
                  </li>;
                })}
              </ul>
              <BarLegend />
            </section>

            <section className="panel" aria-labelledby="db-alerts-title">
              <div className="panel-head"><h2 id="db-alerts-title"><icons.alert /> Requieren atención</h2><span className="help">{alertCount === 0 ? "Sin alertas" : `${alertCount} alerta${alertCount === 1 ? "" : "s"}`}</span></div>
              {alertCount === 0
                ? <div className="db-allgood"><icons.circleCheck /><span>Todos los proyectos están dentro de su presupuesto y no hay aprobaciones pendientes.</span></div>
                : <ul className="db-alerts">
                  {over.map((r) => <AlertItem key={`o${r.cycleId}`} tone="danger" icon="alert" title={r.projectName} meta={r.ecosystem} detail={`Supera el presupuesto en ${moneyShort(-r.available)}`} onClick={() => openRow(r)} />)}
                  {limit.map((r) => <AlertItem key={`l${r.cycleId}`} tone="warning" icon="clock" title={r.projectName} meta={r.ecosystem} detail={`Usa el ${pct(((r.executed + r.committed) / r.budget) * 100)} del presupuesto · quedan ${moneyShort(r.available)}`} onClick={() => openRow(r)} />)}
                  {pending.map((p) => <AlertItem key={`p${p.cycleId}`} tone="info" icon="gavel" title={p.projectName} meta={`Vigencia ${p.year}`} detail={`Pendiente: ${PENDING_LABEL[p.nextAction] ?? "siguiente paso"}`} onClick={() => navigate(`/projects/${p.projectId}/cycles/${p.cycleId}`)} />)}
                  {noBudget.map((r) => <AlertItem key={`n${r.cycleId}`} tone="info" icon="wallet" title={r.projectName} meta={r.ecosystem} detail="Vigencia sin presupuesto asignado" onClick={() => openRow(r)} />)}
                </ul>}
            </section>
          </div>

          {/* 4 · Tendencia mensual */}
          <section className="panel" aria-labelledby="db-month-title">
            <div className="panel-head"><h2 id="db-month-title"><icons.calendar /> Ejecución mes a mes</h2><span className="help">Según el mes del gasto</span></div>
            <div className="db-months" role="list">
              {months.map((m) => {
                const total = m.executed + m.committed;
                const label = expenseMonths[m.month - 1];
                return <div key={m.month} role="listitem" className={`db-month ${m.month > lastMonth ? "is-future" : ""}`}
                  aria-label={`${label}: ejecutado ${money(m.executed)}, comprometido ${money(m.committed)}`}
                  title={`${label}\nEjecutado: ${money(m.executed)}\nComprometido: ${money(m.committed)}`}>
                  <span className="m-val">{total ? moneyShort(total) : ""}</span>
                  <span className="m-bar">
                    <span className="m-exec" style={{ height: `${(m.executed / monthMax) * 100}%` }} />
                    <span className="m-comm" style={{ height: `${(m.committed / monthMax) * 100}%` }} />
                  </span>
                  <span className="m-lbl"><span className="m-full">{label.slice(0, 3)}</span><span className="m-ini" aria-hidden="true">{label.slice(0, 1)}</span></span>
                </div>;
              })}
            </div>
            <BarLegend free={false} />
          </section>

          {/* 5 · Detalle por proyecto */}
          <section className="panel" aria-labelledby="db-projects-title">
            <div className="panel-head">
              <h2 id="db-projects-title"><icons.folder /> Proyectos{cellFilter ? ` de ${cellFilter}` : ""}</h2>
              <div className="filters">
                <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proyecto o líder" aria-label="Buscar proyecto o líder" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar proyectos">
                  <option value="use">Ordenar: mayor uso del presupuesto</option>
                  <option value="budget">Ordenar: mayor presupuesto</option>
                  <option value="progress">Ordenar: mayor avance</option>
                  <option value="name">Ordenar: nombre</option>
                </select>
              </div>
            </div>
            <div className="table-wrap table-cards">
              <table className="table-min">
                <thead><tr>
                  <th style={{ width: "30%" }}>Proyecto</th><th className="num">Presupuesto</th><th>Uso del presupuesto</th><th className="num">Disponible</th><th className="num">Avance</th><th>Estado</th>{anyQuick && <th><span className="sr-only">Acciones</span></th>}
                </tr></thead>
                <tbody>
                  {tableRows.length === 0
                    ? <EmptyRow colSpan={anyQuick ? 7 : 6} title="Ningún proyecto coincide con la búsqueda" />
                    : tableRows.map((r) => {
                      const h = health(r);
                      const u = r.budget ? ((r.executed + r.committed) / r.budget) * 100 : 0;
                      return <tr key={r.cycleId ?? r.projectId} className={`is-clickable is-${h.key}`} tabIndex={0} onClick={() => openRow(r)} onKeyDown={(e) => onRowKey(e, r)}>
                        <td>
                          <span className="project-link">{r.projectName}</span>
                          <div className="project-meta">{r.ecosystem} · {r.leaderName}</div>
                        </td>
                        <td className="num" data-label="Presupuesto">{moneyShort(r.budget)}</td>
                        <td className="db-usecell" data-label="Uso del presupuesto">{r.budget
                          ? <><div className="u-top"><span className="u-pct">{pct(u)}</span><span className="u-detail">Ejec. {moneyShort(r.executed)} · Comp. {moneyShort(r.committed)}</span></div><BudgetBar budget={r.budget} executed={r.executed} committed={r.committed} /></>
                          : <span className="muted-note">Sin presupuesto asignado</span>}</td>
                        <td className={`num ${r.available < 0 ? "neg" : ""}`} data-label="Disponible">{moneyShort(r.available)}</td>
                        <td className="num" data-label="Avance"><Pill tone="info" dot={false}>{pct(r.progressPct ?? 0)}</Pill></td>
                        <td data-label="Estado"><Pill tone={h.tone}>{h.label}</Pill></td>
                        {anyQuick && <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>{canQuickExpense(r) && r.cycleId !== null && <QuickExpenseButton projectId={r.projectId} cycleId={r.cycleId} projectName={r.projectName} onSaved={() => setReloadKey((k) => k + 1)} />}</td>}
                      </tr>;
                    })}
                </tbody>
                {tableRows.length > 1 && <tfoot><tr>
                  <td>Total ({tableRows.length})</td>
                  <td className="num">{moneyShort(tableRows.reduce((s, r) => s + r.budget, 0))}</td>
                  <td className="u-detail">Ejec. {moneyShort(tableRows.reduce((s, r) => s + r.executed, 0))} · Comp. {moneyShort(tableRows.reduce((s, r) => s + r.committed, 0))}</td>
                  <td className="num">{moneyShort(tableRows.reduce((s, r) => s + r.available, 0))}</td>
                  <td colSpan={anyQuick ? 3 : 2} />
                </tr></tfoot>}
              </table>
            </div>
            <p className="db-note">Estados: <b>Sobreejecutado</b> si lo ejecutado y comprometido supera el presupuesto · <b>Al límite</b> desde el 90 % · <b>En curso</b> por debajo. Cifras en pesos colombianos (M = millones).</p>
          </section>
        </>}
  </>;
}

function AlertItem({ tone, icon, title, meta, detail, onClick }: { tone: "danger" | "warning" | "info"; icon: IconName; title: string; meta: string; detail: string; onClick: () => void }) {
  return <li>
    <button className={`db-alert tone-${tone}`} onClick={onClick}>
      <span className="a-ico"><Icon name={icon} /></span>
      <span className="a-main"><span className="a-title">{title} <span className="a-meta">· {meta}</span></span><span className="a-detail">{detail}</span></span>
      <icons.arrowRight />
    </button>
  </li>;
}
